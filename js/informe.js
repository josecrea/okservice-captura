import { evaluar } from './compuerta.js';

const ETIQUETA_ORIGEN = {
  foto: '📷 leído de foto',
  tecleado: '✍️ tecleado en obra',
  gps: '📍 del móvil',
  no_pudo: '⚠️ no se pudo en la visita',
  sin_resolver: '❓ sin resolver'
};

function escapar(texto) {
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function textoDe(paso, respuesta) {
  if (respuesta?.origen === 'no_pudo') return 'No se pudo resolver';
  if (!respuesta || respuesta.valor === undefined || respuesta.valor === null) return '—';
  if (paso.tipo === 'foto') return 'Fotografiado';
  if (paso.unidad) return `${respuesta.valor} ${paso.unidad}`;
  return String(respuesta.valor);
}

export function construirInforme(guion, sesion) {
  const veredicto = evaluar(guion, sesion);
  const respuestas = sesion?.respuestas ?? {};

  const filas = [];
  for (const paso of guion.pasos) {
    filas.push(filaDe(paso, respuestas[paso.id]));
    // Los desplegables van justo debajo de su foto, sangrados: son lo que el
    // técnico vio y la imagen no prueba.
    for (const campo of paso.campos ?? []) {
      const r = respuestas[`${paso.id}.${campo.id}`];
      filas.push({
        id: `${paso.id}.${campo.id}`,
        titulo: campo.titulo,
        texto: r?.origen === 'no_pudo' ? 'No se pudo resolver' : (r?.valor ?? '—'),
        origen: r?.origen === 'no_pudo' ? 'no_pudo' : (r?.valor ? 'tecleado' : 'sin_resolver'),
        cierra: campo.cierra ?? [],
        anidado: true
      });
    }
  }

  function filaDe(paso, respuesta) {
    const resuelta = respuesta !== undefined && respuesta.valor !== undefined && respuesta.valor !== null && respuesta.valor !== '';
    // «No se pudo» y «se quedó sin responder» son cosas distintas, y el
    // informe las separa: una es una decisión del técnico, la otra un olvido.
    const origen = resuelta
      ? (respuesta.origen ?? 'tecleado')
      : (respuesta?.origen === 'no_pudo' ? 'no_pudo' : 'sin_resolver');
    return {
      id: paso.id,
      titulo: paso.titulo,
      texto: textoDe(paso, respuesta),
      origen,
      cierra: paso.cierra ?? []
    };
  }

  const informe = {
    titulo: guion.titulo,
    cliente: sesion?.cliente ?? '',
    fecha: sesion?.creada ?? new Date().toISOString(),
    filas,
    huecos: veredicto.ejesAbiertos,
    puedePresupuestar: veredicto.puedePresupuestar
  };

  informe.html = aHtml(informe);
  return informe;
}

function aHtml(inf) {
  const aviso = inf.huecos.length
    ? `<p class="huecos"><strong>Pendiente de medir o confirmar:</strong> ${inf.huecos.map(escapar).join(' · ')}.
       Por eso esta visita no cierra presupuesto.</p>`
    : `<p class="completo">Todos los datos de la partida quedaron resueltos en la visita.</p>`;

  const filas = inf.filas.map(f => `
    <tr${f.anidado ? ' class="anidada"' : ''}>
      <td>${f.anidado ? '<span class="sangria">↳</span> ' : ''}${escapar(f.titulo)}</td>
      <td>${escapar(f.texto)}</td>
      <td>${escapar(ETIQUETA_ORIGEN[f.origen] ?? f.origen)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapar(inf.titulo)}</title>
<style>
body{font:15px/1.6 system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#1a1a1a}
h1{font-size:1.5rem;margin:0 0 .25rem}
table{width:100%;border-collapse:collapse;margin-top:1.5rem}
th,td{text-align:left;padding:.6rem .5rem;border-bottom:1px solid #ddd;vertical-align:top}
th{font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;color:#666}
.anidada td{color:#555;font-size:.92em;border-bottom-style:dotted}
.sangria{color:#aaa;margin-right:.25rem}
.huecos{background:#fff4f2;border-left:4px solid #c0392b;padding:.85rem 1rem;border-radius:4px}
.completo{background:#f1f9f3;border-left:4px solid #27803f;padding:.85rem 1rem;border-radius:4px}
footer{margin-top:2.5rem;padding-top:1rem;border-top:1px solid #ddd;font-size:.8rem;color:#666}
@media print{body{margin:0}}
</style>
</head>
<body>
<h1>${escapar(inf.titulo)}</h1>
<p>${escapar(inf.cliente)} · ${escapar(new Date(inf.fecha).toLocaleString('es-ES'))}</p>
${aviso}
<table>
<thead><tr><th>Qué</th><th>Resultado</th><th>De dónde sale</th></tr></thead>
<tbody>${filas}</tbody>
</table>
<footer>#Okservice.es · VILLVERG SL · B19430115</footer>
</body>
</html>`;
}
