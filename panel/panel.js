// El panel de la oficina: lee el repositorio PRIVADO de visitas y reconstruye
// el informe de cada una.
//
// Vive en la misma página pública que la aplicación, y no lleva ninguna clave:
// el testigo lo pega quien abra el panel y se queda en ESE navegador. Sin
// testigo esta página no enseña absolutamente nada.
//
// Reutiliza el mismo constructor de informes que el móvil. Si fuese otro,
// el informe que ve la oficina y el que recibe el cliente acabarían siendo
// documentos distintos sin que nadie se diera cuenta.

import { construirInforme } from '../js/informe.js';

const CLAVE = 'okservice-panel-ajustes';
const $ = id => document.getElementById(id);

let ajustes = leer();
let guiones = new Map();

function leer() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) ?? { repo: '', testigo: '', rama: 'main' };
  } catch {
    return { repo: '', testigo: '', rama: 'main' };
  }
}

async function api(ruta) {
  const respuesta = await fetch(`https://api.github.com/repos/${ajustes.repo}${ruta}`, {
    headers: {
      Authorization: `Bearer ${ajustes.testigo}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (respuesta.status === 401) throw new Error('El testigo no vale o ha caducado.');
  if (respuesta.status === 404) throw new Error(`No se encuentra «${ajustes.repo}» o el testigo no llega a él.`);
  if (!respuesta.ok) throw new Error(`GitHub respondió ${respuesta.status}.`);
  return respuesta.json();
}

// El contenido llega en base64 partido en líneas, y atob no entiende UTF-8:
// sin decodificar bien, «Comunidad Los Cristianos» sale con la eñe rota.
function textoDe(base64) {
  const bytes = Uint8Array.from(atob(String(base64).replace(/\s/g, '')), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function ficheroCrudo(ruta) {
  return (await api(`/contents/${encodeURI(ruta)}?ref=${ajustes.rama}`)).content;
}

async function cargarGuion(id) {
  if (guiones.has(id)) return guiones.get(id);
  const guion = await (await fetch(`../guiones/${id}.json`)).json();
  guiones.set(id, guion);
  return guion;
}

// ── Listado ─────────────────────────────────────────────────────────────

async function listar() {
  aviso('Leyendo las visitas…', 'neutro');
  const arbol = await api(`/git/trees/${ajustes.rama}?recursive=1`);

  const rutas = arbol.tree
    .filter(n => n.type === 'blob' && n.path.endsWith('/visita.json'))
    .map(n => n.path);

  if (rutas.length === 0) {
    aviso('El repositorio está conectado pero todavía no ha subido ninguna visita.', 'neutro');
    $('lista').innerHTML = '';
    return;
  }

  const visitas = [];
  for (const ruta of rutas) {
    try {
      visitas.push({ ruta, ...JSON.parse(textoDe(await ficheroCrudo(ruta))) });
    } catch {
      visitas.push({ ruta, rota: true });
    }
  }

  visitas.sort((a, b) => String(b.creada ?? '').localeCompare(String(a.creada ?? '')));
  pintarLista(visitas);
  aviso(`${visitas.length} ${visitas.length === 1 ? 'visita' : 'visitas'} en ${ajustes.repo}`, 'bien');
}

function pintarLista(visitas) {
  const lista = $('lista');
  lista.innerHTML = '';

  for (const v of visitas) {
    const fila = document.createElement('li');
    fila.className = 'visita';

    if (v.rota) {
      fila.innerHTML = `<span class="rota">No se pudo leer ${v.ruta}</span>`;
      lista.appendChild(fila);
      continue;
    }

    const fotos = Object.values(v.respuestas ?? {}).filter(r => r?.origen === 'foto');
    const sinSubir = fotos.filter(r => !r.fichero).length;

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'fila';
    boton.innerHTML = `
      <span class="fila-titulo">
        <strong>${escapar(v.cliente || 'Sin cliente')}</strong>
        <span class="fila-meta">${escapar(v.guion)} · ${fecha(v.creada)}${v.tecnico ? ` · ${escapar(v.tecnico)}` : ''}</span>
      </span>
      <span class="fila-datos">
        ${fotos.length} fotos
        ${sinSubir ? `<span class="falta">${sinSubir} sin foto</span>` : ''}
      </span>`;
    boton.addEventListener('click', () => abrir(v));
    fila.appendChild(boton);
    lista.appendChild(fila);
  }
}

// ── Una visita ──────────────────────────────────────────────────────────

async function abrir(visita) {
  $('marco').srcdoc = '<p style="font:15px system-ui;padding:2rem;color:#666">Descargando las fotos…</p>';
  $('panel-informe').hidden = false;
  $('titulo-informe').textContent = visita.cliente || 'Visita';

  try {
    const guion = await cargarGuion(visita.guion);
    const carpeta = visita.ruta.replace(/\/visita\.json$/, '');

    const fotos = {};
    const respuestas = {};
    for (const [clave, r] of Object.entries(visita.respuestas ?? {})) {
      if (r?.origen === 'foto' && r.fichero) {
        const base64 = await ficheroCrudo(`${carpeta}/${r.fichero}`);
        fotos[clave] = `data:image/jpeg;base64,${String(base64).replace(/\s/g, '')}`;
        respuestas[clave] = { valor: r.fichero, origen: 'foto' };
      } else {
        respuestas[clave] = r;
      }
    }

    const informe = construirInforme(guion, { ...visita, respuestas }, fotos);
    $('marco').srcdoc = informe.html;
    $('descargar-informe').onclick = () => descargar(informe);
    $('descargar-informe').hidden = false;
  } catch (e) {
    $('marco').srcdoc = `<p style="font:15px system-ui;padding:2rem;color:#c0392b">${escapar(e.message)}</p>`;
  }
}

function descargar(informe) {
  const url = URL.createObjectURL(new Blob([informe.html], { type: 'text/html' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = informe.nombreFichero;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ── Conexión ────────────────────────────────────────────────────────────

function aviso(texto, clase) {
  $('aviso').textContent = texto;
  $('aviso').className = `aviso ${clase}`;
  $('aviso').hidden = false;
}

function escapar(t) {
  return String(t ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function fecha(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

function pintarConexion() {
  const conectado = Boolean(ajustes.repo && ajustes.testigo);
  $('conexion').hidden = conectado;
  $('barra').hidden = !conectado;
  $('repo').value = ajustes.repo ?? '';
  if (conectado) listar().catch(e => aviso(e.message, 'mal'));
}

$('conectar').addEventListener('click', async () => {
  ajustes = {
    repo: $('repo').value.trim(),
    testigo: $('testigo').value.trim(),
    rama: 'main'
  };
  if (!/^[\w.-]+\/[\w.-]+$/.test(ajustes.repo)) return aviso('Escribe el repositorio como «usuario/repositorio».', 'mal');
  if (!ajustes.testigo) return aviso('Hace falta el testigo de acceso.', 'mal');

  try {
    await api('');
    localStorage.setItem(CLAVE, JSON.stringify(ajustes));
    pintarConexion();
  } catch (e) {
    aviso(e.message, 'mal');
  }
});

$('salir').addEventListener('click', () => {
  localStorage.removeItem(CLAVE);
  ajustes = leer();
  $('lista').innerHTML = '';
  $('aviso').hidden = true;
  pintarConexion();
});

$('cerrar-informe').addEventListener('click', () => {
  $('panel-informe').hidden = true;
  $('marco').srcdoc = '';
});

$('refrescar').addEventListener('click', () => listar().catch(e => aviso(e.message, 'mal')));

pintarConexion();
