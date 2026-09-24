// Decide qué se puede emitir a partir de una sesión de captura.
//
// La regla antihueco: si un eje obligatorio de la partida no está resuelto,
// NO se emite presupuesto. Sale informe con el hueco declarado. Nunca se
// rellena un eje por aproximación.

function estaResuelta(respuesta) {
  if (respuesta === undefined || respuesta === null) return false;
  const v = respuesta.valor;
  if (v === undefined || v === null) return false;
  if (typeof v === 'string' && v.trim() === '') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

export function evaluar(guion, sesion) {
  const respuestas = sesion?.respuestas ?? {};

  const ejesResueltos = new Set();
  const pasosPendientes = [];

  for (const paso of guion.pasos) {
    if (estaResuelta(respuestas[paso.id])) {
      for (const eje of paso.cierra ?? []) ejesResueltos.add(eje);
    } else if (paso.obligatorio) {
      pasosPendientes.push(paso.id);
    }
  }

  const ejesAbiertos = guion.ejesObligatorios.filter(eje => !ejesResueltos.has(eje));

  return {
    puedeInformar: true,               // el informe sale siempre
    puedePresupuestar: ejesAbiertos.length === 0,
    ejesAbiertos,
    ejesResueltos: [...ejesResueltos],
    pasosPendientes
  };
}
