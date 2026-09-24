import { validarGuion } from './guion.js';
import { evaluar } from './compuerta.js';
import { comprimirFoto } from './comprimir.js';
import { guardarSesion } from './almacen.js';
import { construirInforme } from './informe.js';

let guion = null;
let sesion = null;
let indice = 0;

const $ = id => document.getElementById(id);

async function arrancar() {
  const respuesta = await fetch('guiones/irve.json');
  guion = await respuesta.json();

  const fallos = validarGuion(guion);
  if (fallos.length) {
    document.body.innerHTML = `<h1>El guion tiene errores</h1><pre>${fallos.join('\n')}</pre>`;
    return;
  }

  $('empezar').addEventListener('click', empezar);
  $('siguiente').addEventListener('click', () => avanzar(1));
  $('atras').addEventListener('click', () => avanzar(-1));
  $('saltar').addEventListener('click', noPude);
  $('ver-informe').addEventListener('click', verInforme);
}

function empezar() {
  sesion = {
    id: `irve-${Date.now()}`,
    guion: guion.id,
    cliente: $('cliente').value.trim(),
    creada: new Date().toISOString(),
    respuestas: {}
  };
  indice = 0;
  $('pantalla-inicio').hidden = true;
  $('pantalla-paso').hidden = false;
  pintarPaso();
  pedirUbicacion();
}

function pedirUbicacion() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    pos => {
      sesion.gps = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      guardarSesion(sesion);
    },
    () => { /* sin GPS se sigue: la zona se teclea */ },
    { timeout: 10000 }
  );
}

function pintarPaso() {
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

  if (paso.tipo === 'foto') pintarFoto(control, paso);
  else if (paso.tipo === 'dato') pintarDato(control, paso);
  else pintarPregunta(control, paso);

  refrescarSiguiente();
}

function pintarFoto(control, paso) {
  const entrada = document.createElement('input');
  entrada.type = 'file';
  entrada.accept = 'image/*';
  entrada.capture = 'environment';
  entrada.addEventListener('change', async () => {
    const fichero = entrada.files?.[0];
    if (!fichero) return;
    const blob = await comprimirFoto(fichero);
    sesion.respuestas[paso.id] = { valor: blob, origen: 'foto', bytes: blob.size };
    await guardarSesion(sesion);

    const previa = control.querySelector('.vistaprevia') ?? document.createElement('img');
    previa.className = 'vistaprevia';
    previa.src = URL.createObjectURL(blob);
    control.appendChild(previa);
    refrescarSiguiente();
  });
  control.appendChild(entrada);

  const guardada = sesion.respuestas[paso.id];
  if (guardada?.valor instanceof Blob) {
    const previa = document.createElement('img');
    previa.className = 'vistaprevia';
    previa.src = URL.createObjectURL(guardada.valor);
    control.appendChild(previa);
  }
}

function pintarDato(control, paso) {
  const entrada = document.createElement('input');
  entrada.type = 'number';
  entrada.inputMode = 'decimal';
  entrada.min = '0';
  entrada.value = sesion.respuestas[paso.id]?.valor ?? '';
  entrada.addEventListener('input', async () => {
    const valor = entrada.value === '' ? '' : Number(entrada.value);
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

function refrescarSiguiente() {
  const paso = guion.pasos[indice];
  const respuesta = sesion.respuestas[paso.id];
  const resuelta = respuesta !== undefined && respuesta.valor !== undefined && respuesta.valor !== '';
  $('siguiente').disabled = Boolean(paso.obligatorio) && !resuelta;
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
    await guardarSesion(sesion);
  }
  avanzar(1);
}

function avanzar(paso) {
  const destino = indice + paso;
  if (destino < 0) return;
  if (destino >= guion.pasos.length) return terminar();
  indice = destino;
  pintarPaso();
}

async function terminar() {
  const veredicto = evaluar(guion, sesion);
  sesion.terminada = new Date().toISOString();
  await guardarSesion(sesion);
  $('pantalla-paso').hidden = true;
  $('pantalla-final').hidden = false;
  $('veredicto').innerHTML = veredicto.puedePresupuestar
    ? '<span class="completo">Todos los datos quedaron resueltos. Esta visita cierra presupuesto.</span>'
    : `<span class="hueco">Falta por resolver: ${veredicto.ejesAbiertos.join(' · ')}. Sale informe, no presupuesto.</span>`;
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
