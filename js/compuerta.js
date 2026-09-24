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

// Los campos de un paso (los desplegables que acompañan a una foto) se
// guardan con clave compuesta: «contador.ubicacion».
export function claveCampo(paso, campo) {
  return `${paso.id}.${campo.id}`;
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

    // Un desplegable captura lo que el técnico ve y la foto no prueba: dónde
    // está el contador, si queda hueco en el cuadro. Cierra eje por su cuenta,
    // y puede hacerlo aunque la foto no se haya podido tomar.
    for (const campo of paso.campos ?? []) {
      const clave = claveCampo(paso, campo);
      if (estaResuelta(respuestas[clave])) {
        for (const eje of campo.cierra ?? []) ejesResueltos.add(eje);
      } else if (campo.obligatorio) {
        pasosPendientes.push(clave);
      }
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
