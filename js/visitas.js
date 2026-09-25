// El historial de visitas del técnico.
//
// Las fotos se quedan en el móvil, así que el técnico tiene que poder ver qué
// hay dentro, volver a una visita de ayer, sacar su informe otra vez y hacer
// sitio. Sin esta pantalla la aplicación acumula trabajo que nadie puede
// consultar ni borrar.

import { contarDatos } from './reanudar.js';

export function resumirVisita(sesion, catalogo = []) {
  const actividad = (catalogo ?? []).find(a => a.id === sesion?.guion) ?? null;
  const valores = Object.values(sesion?.respuestas ?? {});
  const fotos = valores.filter(r => r?.origen === 'foto' && r?.valor);

  return {
    id: sesion?.id ?? '',
    guion: sesion?.guion ?? '',
    titulo: actividad?.titulo ?? sesion?.guion ?? 'Visita',
    icono: actividad?.icono ?? '📋',
    cliente: sesion?.cliente ?? '',
    fecha: sesion?.creada ?? null,
    datos: contarDatos(sesion),
    fotos: fotos.length,
    bytes: fotos.reduce((total, r) => total + (r.bytes ?? 0), 0),
    sinResolver: valores.filter(r => r?.origen === 'no_pudo').length,
    terminada: Boolean(sesion?.terminada),
    subida: Boolean(sesion?.subida?.commit)
  };
}

// La de hoy arriba: en campo se busca la última, no la primera.
export function ordenarVisitas(sesiones) {
  return [...(sesiones ?? [])].sort(
    (a, b) => String(b?.creada ?? '').localeCompare(String(a?.creada ?? ''))
  );
}

export function pesoTotal(sesiones) {
  return (sesiones ?? []).reduce((total, s) => total + resumirVisita(s).bytes, 0);
}

export function formatearPeso(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

// «hoy 14:30» dice más en una obra que «25/09/2026 14:30».
export function fechaCorta(iso, ahora = new Date()) {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';

  const soloDia = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const dias = Math.round((soloDia(ahora) - soloDia(fecha)) / 86400000);
  const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  if (dias === 0) return `hoy ${hora}`;
  if (dias === 1) return `ayer ${hora}`;
  return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
