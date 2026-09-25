// Dónde acaban las visitas cuando salen del móvil.
//
// Este fichero es el contrato, no la implementación. Hoy detrás hay un
// repositorio de GitHub; mañana habrá un servidor propio. La aplicación no
// debe enterarse del cambio: habla con `destinoActivo()` y nada más.
//
// Un destino cumple:
//   configurado()            → ¿hay credencial guardada?
//   comprobar()              → { ok, quien, error }
//   subir(sesion, fotos)     → { ruta, commit, url }
//   listar()                 → [{ id, ruta, ... }]
//   descargar(id)            → { sesion, fotos }
//
// Todas menos `configurado` son asíncronas y lanzan con un mensaje que se le
// pueda enseñar al técnico tal cual.

import { GitHubDestino } from './destino-github.js';
import { leerAjustes } from './credencial.js';

const DESTINOS = {
  github: ajustes => new GitHubDestino(ajustes)
};

export function destinoActivo(ajustes = leerAjustes()) {
  const construir = DESTINOS[ajustes?.destino ?? 'github'];
  if (!construir) throw new Error(`destino desconocido: ${ajustes.destino}`);
  return construir(ajustes);
}

export function destinosDisponibles() {
  return Object.keys(DESTINOS);
}
