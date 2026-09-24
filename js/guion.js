import { EJES, TIPOS_DE_PASO } from './ejes.js';

// Devuelve una lista de fallos. Lista vacía significa guion válido.
export function validarGuion(guion) {
  const fallos = [];

  if (!guion || typeof guion !== 'object') return ['el guion no es un objeto'];
  if (!guion.id) fallos.push('falta el identificador del guion');
  if (!guion.titulo) fallos.push('falta el título del guion');
  if (!Array.isArray(guion.pasos) || guion.pasos.length === 0) {
    fallos.push('el guion no tiene pasos');
    return fallos;
  }
  if (!Array.isArray(guion.ejesObligatorios)) {
    fallos.push('falta la lista de ejes obligatorios');
    return fallos;
  }

  for (const eje of guion.ejesObligatorios) {
    if (!EJES.includes(eje)) fallos.push(`eje obligatorio desconocido: ${eje}`);
  }

  const vistos = new Set();
  const cerrados = new Set();

  for (const paso of guion.pasos) {
    if (!paso.id) {
      fallos.push('hay un paso sin identificador');
      continue;
    }
    if (vistos.has(paso.id)) fallos.push(`identificador de paso repetido: ${paso.id}`);
    vistos.add(paso.id);

    if (!TIPOS_DE_PASO.includes(paso.tipo)) {
      fallos.push(`tipo de paso desconocido en ${paso.id}: ${paso.tipo}`);
    }
    if (!paso.titulo) fallos.push(`el paso ${paso.id} no tiene título`);

    const cierra = paso.cierra ?? [];
    if (!Array.isArray(cierra)) {
      fallos.push(`el campo cierra del paso ${paso.id} no es una lista`);
      continue;
    }
    for (const eje of cierra) {
      if (!EJES.includes(eje)) fallos.push(`eje desconocido en el paso ${paso.id}: ${eje}`);
      cerrados.add(eje);
    }

    // Campos: los desplegables que acompañan a un paso.
    const campos = paso.campos ?? [];
    if (!Array.isArray(campos)) {
      fallos.push(`el campo campos del paso ${paso.id} no es una lista`);
      continue;
    }
    const idsCampo = new Set();
    for (const campo of campos) {
      if (!campo.id) {
        fallos.push(`hay un campo sin identificador en el paso ${paso.id}`);
        continue;
      }
      if (idsCampo.has(campo.id)) {
        fallos.push(`campo repetido en el paso ${paso.id}: ${campo.id}`);
      }
      idsCampo.add(campo.id);

      if (!campo.titulo) fallos.push(`el campo ${paso.id}.${campo.id} no tiene título`);
      if (!Array.isArray(campo.opciones) || campo.opciones.length < 2) {
        fallos.push(`el campo ${paso.id}.${campo.id} necesita al menos dos opciones`);
      }
      for (const eje of campo.cierra ?? []) {
        if (!EJES.includes(eje)) {
          fallos.push(`eje desconocido en el campo ${paso.id}.${campo.id}: ${eje}`);
        }
        cerrados.add(eje);
      }
    }
  }

  for (const eje of guion.ejesObligatorios) {
    if (!cerrados.has(eje)) {
      fallos.push(`el eje obligatorio ${eje} no lo cierra ningún paso`);
    }
  }

  return fallos;
}
