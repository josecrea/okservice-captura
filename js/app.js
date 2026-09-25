import { validarGuion } from './guion.js';
import { evaluar } from './compuerta.js';
import { comprimirFoto, calcularDimensiones, CALIDAD } from './comprimir.js';
import { guardarSesion, listarSesiones, borrarSesion } from './almacen.js';
import { construirInforme } from './informe.js';
import { Camara } from './camara.js';
import { buscarPendiente, contarDatos, tieneTrabajo, pasoAlQueVolver } from './reanudar.js';

let guion = null;
let sesion = null;
let indice = 0;
const camara = new Camara();

const $ = id => document.getElementById(id);

// ── Arranque ────────────────────────────────────────────────────────────

async function arrancar() {
  const indiceActividades = await (await fetch('guiones/index.json')).json();
  pintarMenu(indiceActividades.actividades);

  $('siguiente').addEventListener('click', () => avanzar(1));
  $('atras').addEventListener('click', () => avanzar(-1));
  $('saltar').addEventListener('click', noPude);
  $('ver-informe').addEventListener('click', verInforme);
  $('ir-menu').addEventListener('click', volverAlMenu);
  $('otra').addEventListener('click', volverAlMenu);
}

function pintarMenu(actividades) {
  const menu = $('menu-actividades');
  menu.innerHTML = '';
  for (const act of actividades) {
    const item = document.createElement('li');
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'actividad';
    boton.innerHTML = `<span class="icono">${act.icono}</span>
      <span class="nombre">${act.titulo}</span>
      <span class="partida">${act.partida}</span>`;
    boton.addEventListener('click', () => empezar(act.id));
    item.appendChild(boton);
    menu.appendChild(item);
  }
}

async function empezar(idActividad) {
  guion = await (await fetch(`guiones/${idActividad}.json`)).json();

  const fallos = validarGuion(guion);
  if (fallos.length) {
    alert(`El guion de ${idActividad} tiene errores:\n\n${fallos.join('\n')}`);
    return;
  }

  const reanudada = await ofrecerContinuar(guion);
  if (reanudada) {
    sesion = reanudada;
    indice = pasoAlQueVolver(guion, reanudada);
    $('cliente').value = reanudada.cliente ?? '';
  } else {
    sesion = {
      id: `${guion.id}-${Date.now()}`,
      guion: guion.id,
      cliente: $('cliente').value.trim(),
      creada: new Date().toISOString(),
      respuestas: {}
    };
    indice = 0;
  }

  $('cabecera').textContent = guion.titulo;
  $('ir-menu').hidden = false;
  $('pantalla-inicio').hidden = true;
  $('pantalla-paso').hidden = false;
  pintarPaso();
  if (!sesion.gps) pedirUbicacion();
}

// Si quedó una visita a medias de esta misma actividad, se pregunta. Elegir
// por él sería peor de las dos maneras: reabrir siempre mezcla la visita de
// un cliente con la del siguiente, y empezar siempre tira fotos ya hechas.
async function ofrecerContinuar(guion) {
  let pendiente = null;
  try {
    pendiente = buscarPendiente(await listarSesiones(), guion.id);
  } catch {
    return null;   // sin almacén se empieza de cero, que es lo de antes
  }
  if (!pendiente) return null;

  const cliente = pendiente.cliente ? ` de «${pendiente.cliente}»` : '';
  const datos = contarDatos(pendiente);
  const seguir = confirm(
    `Tienes una visita a medias${cliente} con ${datos} ${datos === 1 ? 'dato guardado' : 'datos guardados'}.\n\n` +
    `Aceptar: sigues donde la dejaste.\n` +
    `Cancelar: empiezas una visita nueva (la otra se queda guardada).`
  );
  return seguir ? pendiente : null;
}

// La salida al menú. No pide confirmación porque no hay nada que confirmar:
// cada foto y cada desplegable ya está escrito en el móvil, y al volver a
// entrar en la actividad se ofrece continuar por este mismo paso.
async function volverAlMenu() {
  camara.cerrar($('video-camara'));

  // Una sesión sin un solo dato no es una visita: es un toque en el menú.
  // Guardarla dejaría basura en el móvil y ensuciaría el «continuar».
  if (sesion && !tieneTrabajo(sesion) && !sesion.terminada) {
    await borrarSesion(sesion.id).catch(() => {});
  }

  guion = null;
  sesion = null;
  indice = 0;

  $('pantalla-paso').hidden = true;
  $('pantalla-final').hidden = true;
  $('pantalla-inicio').hidden = false;
  $('ir-menu').hidden = true;
  $('cabecera').textContent = 'Captura guiada';
  $('progreso').textContent = '';
}

function pedirUbicacion() {
  if (!navigator.geolocation) return;

  // La sesión se captura aquí y no se lee de la global: el GPS puede tardar
  // diez segundos, y para entonces el técnico puede haberse ido al menú.
  const suya = sesion;
  navigator.geolocation.getCurrentPosition(
    pos => {
      suya.gps = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      // Si esa visita ya se abandonó vacía, la posición no la resucita.
      if (suya === sesion || tieneTrabajo(suya)) guardarSesion(suya).catch(() => {});
    },
    () => { /* sin GPS se sigue: el municipio se teclea */ },
    { timeout: 10000 }
  );
}

// ── El paso ─────────────────────────────────────────────────────────────

function pintarPaso() {
  camara.cerrar($('video-camara'));

  // Dónde está el técnico, para poder devolverlo aquí si sale al menú.
  // Solo cuando ya hay algo dentro: guardar una sesión sin un dato dejaría
  // visitas fantasma en el móvil.
  if (tieneTrabajo(sesion)) {
    sesion.indice = indice;
    guardarSesion(sesion).catch(() => {});
  }

  const paso = guion.pasos[indice];
  $('progreso').textContent = `Paso ${indice + 1} de ${guion.pasos.length}`;
  $('paso-titulo').innerHTML = paso.obligatorio
    ? `${paso.titulo} <span class="obligatorio">·&nbsp;obligatorio</span>`
    : paso.titulo;
  $('paso-ayuda').textContent = paso.ayuda ?? '';
  $('atras').disabled = indice === 0;

  // Un paso obligatorio bloquea el PRESUPUESTO, nunca la salida. Si el técnico
  // no puede resolverlo — el garaje cerrado, el cliente con prisa — tiene que
  // poder declararlo y seguir. Una aplicación que no deja salir sin el dato
  // empuja a inventárselo, que es justo lo que esto existe para impedir.
  $('saltar').hidden = false;
  $('saltar').textContent = paso.obligatorio ? 'No he podido' : 'Saltar';

  const control = $('paso-control');
  control.innerHTML = '';

  if (paso.tipo === 'foto') {
    pintarFoto(control, paso);        // ya pinta sus campos al final
  } else {
    if (paso.tipo === 'dato') pintarDato(control, paso);
    else pintarPregunta(control, paso);
    pintarCampos(control, paso);
  }

  refrescarSiguiente();
}

// ── Foto: cámara en vivo, con el selector de archivos como red de seguridad ──

function pintarFoto(control, paso) {
  const visor = document.createElement('div');
  visor.className = 'visor';

  const video = document.createElement('video');
  video.id = 'video-camara';
  video.playsInline = true;
  video.muted = true;
  visor.appendChild(video);

  const previa = document.createElement('img');
  previa.className = 'vistaprevia';
  previa.hidden = true;
  visor.appendChild(previa);

  control.appendChild(visor);

  const acciones = document.createElement('div');
  acciones.className = 'acciones-foto';
  control.appendChild(acciones);

  // Nace apagado: la cámara tarda un momento en dar imagen, y un botón que
  // parece listo antes de tiempo devuelve un error que nadie sabe interpretar.
  const disparar = document.createElement('button');
  disparar.type = 'button';
  disparar.className = 'disparador';
  disparar.textContent = 'Abriendo cámara…';
  disparar.disabled = true;
  acciones.appendChild(disparar);

  const repetir = document.createElement('button');
  repetir.type = 'button';
  repetir.className = 'secundario';
  repetir.textContent = 'Repetir';
  repetir.hidden = true;
  acciones.appendChild(repetir);

  // La alternativa siempre está: sin permiso de cámara, o desde el ordenador.
  //
  // El texto vive en su propio <span>. Escribir en el textContent del <label>
  // borraría sus hijos —incluido el <input>— y dejaría al técnico con un
  // botón que no hace nada justo cuando la cámara ya le ha fallado.
  const etiquetaArchivo = document.createElement('label');
  etiquetaArchivo.className = 'desde-archivo';
  const textoArchivo = document.createElement('span');
  textoArchivo.textContent = 'Elegir una foto ya hecha';
  etiquetaArchivo.appendChild(textoArchivo);
  const entrada = document.createElement('input');
  entrada.type = 'file';
  entrada.accept = 'image/*';
  entrada.capture = 'environment';
  entrada.hidden = true;
  etiquetaArchivo.appendChild(entrada);
  control.appendChild(etiquetaArchivo);

  const mostrarFoto = async blob => {
    sesion.respuestas[paso.id] = { valor: blob, origen: 'foto', bytes: blob.size };
    await guardarSesion(sesion);
    previa.src = URL.createObjectURL(blob);
    previa.hidden = false;
    video.hidden = true;
    disparar.hidden = true;
    repetir.hidden = false;
    camara.cerrar(video);
    refrescarSiguiente();
  };

  const abrirCamara = async () => {
    disparar.disabled = true;
    disparar.textContent = 'Abriendo cámara…';
    try {
      await camara.abrir(video);
      video.hidden = false;
      disparar.hidden = false;
      disparar.disabled = false;
      disparar.textContent = '📷 Hacer foto';
    } catch {
      // Sin cámara la visita continúa: se sube desde archivo.
      visor.hidden = true;
      disparar.hidden = true;
      etiquetaArchivo.classList.add('unica-via');
      textoArchivo.textContent = '📷 Hacer o elegir foto';
    }
  };

  disparar.addEventListener('click', async () => {
    try {
      const blob = await camara.disparar(video, calcularDimensiones, CALIDAD);
      await mostrarFoto(blob);
    } catch (e) {
      alert(`No se pudo hacer la foto: ${e.message}`);
    }
  });

  repetir.addEventListener('click', async () => {
    delete sesion.respuestas[paso.id];
    await guardarSesion(sesion);
    previa.hidden = true;
    repetir.hidden = true;
    visor.hidden = false;
    refrescarSiguiente();
    abrirCamara();
  });

  entrada.addEventListener('change', async () => {
    const fichero = entrada.files?.[0];
    if (!fichero) return;
    await mostrarFoto(await comprimirFoto(fichero));
  });

  const guardada = sesion.respuestas[paso.id];
  if (guardada?.valor instanceof Blob) {
    previa.src = URL.createObjectURL(guardada.valor);
    previa.hidden = false;
    video.hidden = true;
    disparar.hidden = true;
    repetir.hidden = false;
  } else {
    abrirCamara();
  }

  pintarCampos(control, paso);
}

// Los desplegables que acompañan a un paso. Capturan lo que el técnico ve y
// la foto no prueba: dónde está el contador, si queda hueco en el cuadro.
// Cierran eje por su cuenta, así que no dependen de que la imagen se lea bien.
function pintarCampos(control, paso) {
  for (const campo of paso.campos ?? []) {
    const clave = `${paso.id}.${campo.id}`;

    const grupo = document.createElement('div');
    grupo.className = 'campo';

    const etiqueta = document.createElement('label');
    etiqueta.htmlFor = `sel-${clave}`;
    etiqueta.innerHTML = campo.obligatorio
      ? `${campo.titulo} <span class="obligatorio">·&nbsp;obligatorio</span>`
      : campo.titulo;
    grupo.appendChild(etiqueta);

    const select = document.createElement('select');
    select.id = `sel-${clave}`;

    const vacia = document.createElement('option');
    vacia.value = '';
    vacia.textContent = 'Elegir…';
    select.appendChild(vacia);

    for (const opcion of campo.opciones) {
      const o = document.createElement('option');
      o.value = opcion;
      o.textContent = opcion;
      select.appendChild(o);
    }
    select.value = sesion.respuestas[clave]?.valor ?? '';

    select.addEventListener('change', async () => {
      if (select.value === '') delete sesion.respuestas[clave];
      else sesion.respuestas[clave] = { valor: select.value, origen: 'tecleado' };
      await guardarSesion(sesion);
      refrescarSiguiente();
    });

    grupo.appendChild(select);
    control.appendChild(grupo);
  }
}

function pintarDato(control, paso) {
  const entrada = document.createElement('input');
  if (paso.texto) {
    entrada.type = 'text';
    entrada.autocomplete = 'off';
  } else {
    entrada.type = 'number';
    entrada.inputMode = 'decimal';
    entrada.min = '0';
  }
  entrada.value = sesion.respuestas[paso.id]?.valor ?? '';

  // El municipio lo propone el GPS, pero lo confirma el técnico: una
  // coordenada no es una dirección, y la zona decide el desplazamiento.
  if (paso.id === 'municipio' && !entrada.value && sesion.gps) {
    entrada.placeholder = 'Escribe el municipio y compruébalo';
  }

  entrada.addEventListener('input', async () => {
    const bruto = entrada.value;
    const valor = bruto === '' ? '' : (paso.texto ? bruto : Number(bruto));
    sesion.respuestas[paso.id] = { valor, origen: 'tecleado' };
    await guardarSesion(sesion);
    refrescarSiguiente();
  });
  control.appendChild(entrada);
}

function pintarPregunta(control, paso) {
  for (const opcion of paso.opciones) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'opcion';
    boton.textContent = opcion;
    boton.setAttribute('aria-pressed', String(sesion.respuestas[paso.id]?.valor === opcion));
    boton.addEventListener('click', async () => {
      sesion.respuestas[paso.id] = { valor: opcion, origen: 'tecleado' };
      await guardarSesion(sesion);
      for (const otro of control.querySelectorAll('.opcion')) otro.setAttribute('aria-pressed', 'false');
      boton.setAttribute('aria-pressed', 'true');
      refrescarSiguiente();
    });
    control.appendChild(boton);
  }
}

// ── Navegación ──────────────────────────────────────────────────────────

function hayRespuesta(clave) {
  const r = sesion.respuestas[clave];
  return r !== undefined && r.valor !== undefined && r.valor !== null && r.valor !== '';
}

function refrescarSiguiente() {
  const paso = guion.pasos[indice];

  const faltaElPaso = Boolean(paso.obligatorio) && !hayRespuesta(paso.id);
  const faltaAlgunCampo = (paso.campos ?? [])
    .some(c => c.obligatorio && !hayRespuesta(`${paso.id}.${c.id}`));

  $('siguiente').disabled = faltaElPaso || faltaAlgunCampo;
  $('siguiente').textContent = indice === guion.pasos.length - 1 ? 'Terminar' : 'Siguiente';
}

// Deja constancia de que el paso no se pudo resolver en la visita.
// El valor es null a propósito: la compuerta NO lo cuenta como resuelto,
// así que el eje sigue abierto y no habrá presupuesto. Pero queda escrito
// en el informe, que es distinto de haberlo olvidado.
async function noPude() {
  const paso = guion.pasos[indice];
  if (paso.obligatorio && !sesion.respuestas[paso.id]) {
    sesion.respuestas[paso.id] = { valor: null, origen: 'no_pudo' };
  }
  for (const campo of paso.campos ?? []) {
    const clave = `${paso.id}.${campo.id}`;
    if (campo.obligatorio && !sesion.respuestas[clave]) {
      sesion.respuestas[clave] = { valor: null, origen: 'no_pudo' };
    }
  }
  await guardarSesion(sesion);
  avanzar(1);
}

function avanzar(paso) {
  const destino = indice + paso;
  if (destino < 0) return;
  if (destino >= guion.pasos.length) return terminar();
  indice = destino;
  pintarPaso();
}

const CIERRE = {
  presupuesto: {
    bien: 'Todos los datos quedaron resueltos. Esta visita cierra presupuesto.',
    mal: ejes => `Falta por resolver: ${ejes.join(' · ')}. Sale informe, no presupuesto.`
  },
  parte: {
    bien: 'Parte de trabajo completo. Se factura por horas, no por alcance.',
    mal: ejes => `Falta por resolver: ${ejes.join(' · ')}. El parte sale incompleto.`
  },
  expediente: {
    bien: 'Expediente completo. Listo para emitir el certificado.',
    mal: ejes => `Falta por resolver: ${ejes.join(' · ')}. El expediente no se puede cerrar.`
  }
};

async function terminar() {
  camara.cerrar($('video-camara'));
  const veredicto = evaluar(guion, sesion);
  sesion.terminada = new Date().toISOString();
  await guardarSesion(sesion);

  const textos = CIERRE[guion.salida] ?? CIERRE.presupuesto;
  $('pantalla-paso').hidden = true;
  $('pantalla-final').hidden = false;
  $('veredicto').innerHTML = veredicto.puedePresupuestar
    ? `<span class="completo">${textos.bien}</span>`
    : `<span class="hueco">${textos.mal(veredicto.ejesAbiertos)}</span>`;
}

function verInforme() {
  const informe = construirInforme(guion, sesion);
  const ventana = window.open('', '_blank');
  ventana.document.write(informe.html);
  ventana.document.close();
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {
    // sin service worker la aplicación sigue funcionando, solo que no offline
  });
}

arrancar();
