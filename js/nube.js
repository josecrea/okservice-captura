// Llevar las visitas del móvil a la oficina.
//
// Nada se sube solo a espaldas del técnico salvo la cola de pendientes cuando
// vuelve la cobertura, y eso solo reintenta visitas que él ya dio por
// terminadas. Una visita a medias no sale del móvil: subirla haría creer en
// la oficina que la instalación está vista entera.

import { leerFotos } from './fotos.js';
import { guardarSesion } from './almacen.js';

export function estaSubida(sesion) {
  return Boolean(sesion?.subida?.commit);
}

// Lo que se puede subir: terminadas y todavía sin subir. El orden es el de
// captura, para que en la oficina las visitas aparezcan como pasaron.
export function pendientesDe(sesiones) {
  return (sesiones ?? [])
    .filter(s => s?.terminada && !estaSubida(s))
    .sort((a, b) => String(a.creada ?? '').localeCompare(String(b.creada ?? '')));
}

export async function subirVisita(sesion, destino) {
  if (!sesion?.terminada) {
    throw new Error('Esa visita está a medias. Termínala antes de mandarla a la oficina.');
  }

  const { fotos, fallidas } = await leerFotos(sesion);
  const recibo = await destino.subir(sesion, fotos, fallidas);

  sesion.subida = recibo;
  await guardarSesion(sesion);

  return { recibo, fallidas };
}

// Devuelve el parte de la tanda: qué subió y qué no, sin abandonar a la
// primera. Una visita que falla no puede impedir que suban las otras seis.
export async function subirPendientes(sesiones, destino, alAvanzar = () => {}) {
  const cola = pendientesDe(sesiones);
  const subidas = [];
  const fallos = [];

  for (const [i, sesion] of cola.entries()) {
    alAvanzar({ hecho: i, total: cola.length, sesion });
    try {
      const { recibo } = await subirVisita(sesion, destino);
      subidas.push({ sesion, recibo });
    } catch (e) {
      fallos.push({ sesion, error: e.message });
    }
  }

  alAvanzar({ hecho: cola.length, total: cola.length });
  return { total: cola.length, subidas, fallos };
}
