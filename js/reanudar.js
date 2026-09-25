// Una visita a medias no se tira.
//
// El botón de menú abre una salida que antes no existía, y una salida sin
// retorno es una forma elegante de perder trabajo: el técnico que sale a
// mirar otra actividad y vuelve tiene que encontrar sus fotos donde las
// dejó. Aquí vive la decisión de qué sesión se le ofrece continuar.

// Cuenta lo que el técnico ya resolvió en esta visita.
//
// El null cuenta a propósito: es el «no he podido», una decisión tomada en
// la visita. La cadena vacía no, porque es un campo que se escribió y se
// borró — el técnico no dejó nada dentro.
export function contarDatos(sesion) {
  const respuestas = sesion?.respuestas ?? {};
  return Object.values(respuestas)
    .filter(r => r && r.valor !== undefined && r.valor !== '')
    .length;
}

export function tieneTrabajo(sesion) {
  return contarDatos(sesion) > 0;
}

// La visita a medias más reciente de esa actividad, o null si no hay ninguna.
//
// Una sesión terminada NO se ofrece: su informe ya salió, y reabrirla
// convertiría dos visitas distintas en una sola.
export function buscarPendiente(sesiones, idGuion) {
  const vivas = (sesiones ?? []).filter(
    s => s?.guion === idGuion && !s.terminada && tieneTrabajo(s)
  );
  if (vivas.length === 0) return null;

  return [...vivas].sort(
    (a, b) => String(b.creada ?? '').localeCompare(String(a.creada ?? ''))
  )[0];
}

// El paso por el que se reabre la visita.
//
// Se acota al guion actual: si el guion creció o encogió desde que se guardó
// la sesión, un índice fuera de rango dejaría la pantalla en blanco.
export function pasoAlQueVolver(guion, sesion) {
  const total = guion?.pasos?.length ?? 0;
  if (total === 0) return 0;

  const guardado = Number(sesion?.indice);
  if (!Number.isInteger(guardado) || guardado < 0) return 0;
  return Math.min(guardado, total - 1);
}
