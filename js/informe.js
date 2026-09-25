// El informe de la visita: un único fichero HTML que se abre solo.
//
// Autocontenido a propósito — las fotos van dentro, no enlazadas. Un informe
// con <img src="https://…"> se ve en el móvil del técnico y sale en blanco en
// el correo del cliente seis meses después. Este se guarda, se manda por
// WhatsApp y se abre sin cobertura y sin la app.

import { evaluar } from './compuerta.js';

const ETIQUETA_ORIGEN = {
  foto: '📷 leído de foto',
  tecleado: '✍️ tecleado en obra',
  gps: '📍 del móvil',
  no_pudo: '⚠️ no se pudo en la visita',
  sin_resolver: '❓ sin resolver'
};

const EMPRESA = {
  marca: '#Okservice.es',
  razon: 'VILLVERG SL',
  cif: 'B19430115',
  telefono: '+34 679 32 52 22',
  autorizacion: 'Instalador autorizado · nº 25094'
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

// Un nombre de fichero que se entiende en la bandeja de descargas seis meses
// después. Sin acentos ni espacios: hay clientes de correo que los rompen.
export function nombreFichero(informe, extension = 'html') {
  const limpio = texto => String(texto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  const fecha = new Date(informe.fecha ?? Date.now()).toISOString().slice(0, 10);
  const partes = ['informe', limpio(informe.titulo), limpio(informe.cliente), fecha]
    .filter(p => p !== '');
  return `${partes.join('-').slice(0, 120)}.${extension}`;
}

// `fotos` es un mapa clave → data URI. Se recibe ya resuelto para que esta
// función siga siendo pura y testeable sin navegador: leer un Blob es
// asíncrono y vive en fotos.js.
export function construirInforme(guion, sesion, fotos = {}) {
  const veredicto = evaluar(guion, sesion);
  const respuestas = sesion?.respuestas ?? {};

  function filaDe(paso, respuesta) {
    const resuelta = respuesta !== undefined && respuesta.valor !== undefined
      && respuesta.valor !== null && respuesta.valor !== '';
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
      cierra: paso.cierra ?? [],
      foto: fotos[paso.id] ?? null
    };
  }

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
        anidado: true,
        foto: null
      });
    }
  }

  const informe = {
    titulo: guion.titulo,
    cliente: sesion?.cliente ?? '',
    fecha: sesion?.creada ?? new Date().toISOString(),
    referencia: sesion?.id ?? '',
    gps: sesion?.gps ?? null,
    filas,
    fotos: filas.filter(f => f.foto),
    huecos: veredicto.ejesAbiertos,
    puedePresupuestar: veredicto.puedePresupuestar
  };

  informe.html = aHtml(informe);
  informe.nombreFichero = nombreFichero(informe);
  return informe;
}

function cabeceraHtml(inf) {
  const sitio = inf.gps
    ? `<a href="https://maps.google.com/?q=${inf.gps.lat},${inf.gps.lon}">📍 Ver la ubicación en el mapa</a>`
    : '';
  const referencia = inf.referencia ? `<span class="ref">Ref. ${escapar(inf.referencia)}</span>` : '';

  return `<header>
  <p class="marca">${escapar(EMPRESA.marca)} · Informe de visita técnica</p>
  <h1>${escapar(inf.titulo)}</h1>
  <p class="meta">
    <strong>${escapar(inf.cliente || 'Sin cliente indicado')}</strong><br>
    ${escapar(new Date(inf.fecha).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' }))}
    ${referencia}
  </p>
  ${sitio ? `<p class="sitio">${sitio}</p>` : ''}
</header>`;
}

function galeriaHtml(inf) {
  if (inf.fotos.length === 0) return '';
  const piezas = inf.fotos.map((f, i) => `
    <figure>
      <img src="${f.foto}" alt="${escapar(f.titulo)}" loading="lazy">
      <figcaption>${i + 1}. ${escapar(f.titulo)}</figcaption>
    </figure>`).join('');

  return `<section class="galeria">
  <h2>Fotos de la visita <span class="cuenta">${inf.fotos.length}</span></h2>
  <div class="rejilla">${piezas}</div>
</section>`;
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
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(inf.titulo)} · ${escapar(inf.cliente || EMPRESA.marca)}</title>
<style>
:root{--tinta:#1a1a1a;--tenue:#666;--linea:#ddd;--marca:#0b63ce}
*{box-sizing:border-box}
body{font:15px/1.6 system-ui,-apple-system,sans-serif;max-width:46rem;margin:0 auto;padding:2rem 1rem;color:var(--tinta)}
header{border-bottom:3px solid var(--tinta);padding-bottom:1rem;margin-bottom:1.5rem}
.marca{font-size:.75rem;text-transform:uppercase;letter-spacing:.09em;color:var(--marca);font-weight:700;margin:0 0 .4rem}
h1{font-size:1.6rem;margin:0 0 .6rem;line-height:1.2}
.meta{margin:0;color:var(--tenue);font-size:.9rem}
.meta strong{color:var(--tinta);font-size:1.05rem}
.ref{display:block;font-variant-numeric:tabular-nums;font-size:.78rem;color:#999;margin-top:.2rem}
.sitio{margin:.6rem 0 0;font-size:.875rem}
.sitio a{color:var(--marca)}
h2{font-size:1.05rem;text-transform:uppercase;letter-spacing:.05em;color:var(--tenue);margin:2.5rem 0 .75rem}
.cuenta{background:#eee;color:var(--tenue);border-radius:99px;padding:.1rem .5rem;font-size:.8rem;letter-spacing:0}
table{width:100%;border-collapse:collapse;margin-top:.5rem}
th,td{text-align:left;padding:.6rem .5rem;border-bottom:1px solid var(--linea);vertical-align:top}
th{font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;color:var(--tenue)}
.anidada td{color:#555;font-size:.92em;border-bottom-style:dotted}
.sangria{color:#aaa;margin-right:.25rem}
.huecos{background:#fff4f2;border-left:4px solid #c0392b;padding:.85rem 1rem;border-radius:4px}
.completo{background:#f1f9f3;border-left:4px solid #27803f;padding:.85rem 1rem;border-radius:4px}
.rejilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:1rem}
figure{margin:0;break-inside:avoid;page-break-inside:avoid}
figure img{width:100%;border-radius:6px;border:1px solid var(--linea);display:block;background:#f4f4f4}
figcaption{font-size:.8rem;color:var(--tenue);margin-top:.35rem;line-height:1.35}
footer{margin-top:3rem;padding-top:1rem;border-top:1px solid var(--linea);font-size:.78rem;color:var(--tenue)}
@media print{
  body{max-width:none;padding:0;font-size:11pt}
  h2{margin-top:1.5rem}
  .rejilla{grid-template-columns:repeat(2,1fr)}
  a{color:inherit;text-decoration:none}
}
</style>
</head>
<body>
${cabeceraHtml(inf)}
${aviso}
<h2>Lo que se comprobó</h2>
<table>
<thead><tr><th>Qué</th><th>Resultado</th><th>De dónde sale</th></tr></thead>
<tbody>${filas}</tbody>
</table>
${galeriaHtml(inf)}
<footer>
  <strong>${escapar(EMPRESA.marca)}</strong> · ${escapar(EMPRESA.razon)} · CIF ${escapar(EMPRESA.cif)}<br>
  ${escapar(EMPRESA.autorizacion)} · ${escapar(EMPRESA.telefono)}<br>
  Documento generado en la visita. Los datos marcados como pendientes no están medidos y no cierran precio.
</footer>
</body>
</html>`;
}
