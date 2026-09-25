// Pinta el historial. El qué se muestra lo decide visitas.js, que es puro;
// aquí solo está el DOM y los manejadores que le pasa la aplicación.

import { resumirVisita, ordenarVisitas, pesoTotal, formatearPeso, fechaCorta } from './visitas.js';

function fila(etiqueta, valor) {
  const dato = document.createElement('span');
  dato.className = 'dato';
  dato.textContent = `${valor} ${etiqueta}`;
  return dato;
}

function tarjeta(sesion, catalogo, manejadores) {
  const r = resumirVisita(sesion, catalogo);

  const item = document.createElement('li');
  item.className = 'visita';
  if (!r.terminada) item.classList.add('a-medias');

  const cabecera = document.createElement('div');
  cabecera.className = 'visita-cabecera';
  cabecera.innerHTML = `
    <span class="icono">${r.icono}</span>
    <span class="visita-titulo">
      <strong>${r.cliente || 'Sin cliente'}</strong>
      <span class="visita-actividad">${r.titulo}</span>
    </span>
    <span class="visita-fecha">${fechaCorta(r.fecha)}</span>`;
  item.appendChild(cabecera);

  const datos = document.createElement('p');
  datos.className = 'visita-datos';
  datos.appendChild(fila(r.fotos === 1 ? 'foto' : 'fotos', r.fotos));
  datos.appendChild(fila(r.datos === 1 ? 'dato' : 'datos', r.datos));
  if (r.bytes) datos.appendChild(fila('', formatearPeso(r.bytes)));
  if (r.sinResolver) {
    const aviso = document.createElement('span');
    aviso.className = 'dato pendiente';
    aviso.textContent = `${r.sinResolver} sin resolver`;
    datos.appendChild(aviso);
  }
  if (!r.terminada) {
    const aviso = document.createElement('span');
    aviso.className = 'dato a-medias';
    aviso.textContent = 'a medias';
    datos.appendChild(aviso);
  }
  item.appendChild(datos);

  const acciones = document.createElement('div');
  acciones.className = 'visita-acciones';

  if (!r.terminada) {
    const seguir = document.createElement('button');
    seguir.type = 'button';
    seguir.textContent = 'Seguir';
    seguir.addEventListener('click', () => manejadores.alSeguir(sesion));
    acciones.appendChild(seguir);
  }

  const informe = document.createElement('button');
  informe.type = 'button';
  informe.className = 'secundario';
  informe.textContent = 'Informe';
  informe.addEventListener('click', () => manejadores.alVerInforme(sesion));
  acciones.appendChild(informe);

  const borrar = document.createElement('button');
  borrar.type = 'button';
  borrar.className = 'secundario borrar';
  borrar.textContent = 'Borrar';
  borrar.setAttribute('aria-label', `Borrar la visita de ${r.cliente || 'sin cliente'}`);
  borrar.addEventListener('click', () => manejadores.alBorrar(sesion, r));
  acciones.appendChild(borrar);

  item.appendChild(acciones);
  return item;
}

export function pintarVisitas({ lista, resumen, vacio, sesiones, catalogo, ...manejadores }) {
  const ordenadas = ordenarVisitas(sesiones);

  lista.innerHTML = '';
  for (const sesion of ordenadas) {
    lista.appendChild(tarjeta(sesion, catalogo, manejadores));
  }

  vacio.hidden = ordenadas.length > 0;
  // Lo que ocupan las fotos se dice siempre: son el 99 % de lo que la
  // aplicación guarda en el móvil, y el técnico tiene que poder hacer sitio
  // antes de que sea el propio teléfono el que se queje.
  resumen.textContent = ordenadas.length
    ? `${ordenadas.length} ${ordenadas.length === 1 ? 'visita' : 'visitas'} · ${formatearPeso(pesoTotal(ordenadas))} en fotos`
    : '';

  return ordenadas.length;
}
