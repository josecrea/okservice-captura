import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GitHubDestino, rutaDeVisita, nombreDeFoto, base64De, sinFotos, ficherosDe
} from '../js/destino-github.js';

const sesion = {
  id: 'irve-1790357907845', guion: 'irve', cliente: 'Comunidad Los Cristianos',
  creada: '2026-09-25T09:00:00.000Z', terminada: '2026-09-25T10:00:00.000Z',
  gps: { lat: 28.08, lon: -16.64 },
  respuestas: {
    fachada: { valor: { tipo: 'blob' }, origen: 'foto', bytes: 350000 },
    'fachada.inmueble': { valor: 'Unifamiliar', origen: 'tecleado' },
    metros: { valor: 14, origen: 'tecleado' }
  }
};

const FOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

// ── La forma de lo que se sube ─────────────────────────────────────────

test('cada visita va a su carpeta por año y mes', () => {
  assert.equal(rutaDeVisita(sesion), 'visitas/2026/09/irve-1790357907845');
});

test('la ruta no deja escapar de su carpeta', () => {
  const escapando = rutaDeVisita({ ...sesion, id: '../../etc/passwd' });
  assert.ok(!escapando.includes('/../'), 'una visita no puede escribir fuera de visitas/');
  assert.equal(escapando, 'visitas/2026/09/-..-etc-passwd');
});

test('CONTROL NEGATIVO · un id que es solo puntos no sube la visita de nivel', () => {
  assert.equal(rutaDeVisita({ ...sesion, id: '..' }), 'visitas/2026/09/visita');
  assert.equal(rutaDeVisita({ ...sesion, id: '' }), 'visitas/2026/09/visita');
});

test('el nombre de la foto sale de la clave del paso', () => {
  assert.equal(nombreDeFoto('fachada'), 'fachada.jpg');
  assert.equal(nombreDeFoto('cuadro.hueco'), 'cuadro.hueco.jpg');
});

test('del data URI solo sube el base64, no la cabecera', () => {
  assert.equal(base64De(FOTO), '/9j/4AAQSkZJRg==');
});

test('la foto se cambia por el nombre de su fichero', () => {
  const plano = sinFotos(sesion, 'Juan');
  assert.deepEqual(plano.respuestas.fachada, { origen: 'foto', fichero: 'fotos/fachada.jpg', bytes: 350000 });
  assert.equal(plano.respuestas.metros.valor, 14, 'los datos que no son foto van tal cual');
});

test('la visita que se sube lleva quién la hizo y cuándo se subió', () => {
  const plano = sinFotos(sesion, 'Juan');
  assert.equal(plano.tecnico, 'Juan');
  assert.ok(plano.subidaEl);
});

test('CONTROL NEGATIVO · el JSON no lleva Blobs disfrazados de objeto vacío', () => {
  const texto = JSON.stringify(sinFotos(sesion));
  assert.ok(!texto.includes('"valor":{}'), 'un Blob serializado es «{}»: la foto se perdería sin avisar');
  assert.ok(texto.includes('fotos/fachada.jpg'));
});

test('se sube el JSON de la visita y una foto por cada imagen', () => {
  const ficheros = ficherosDe(sesion, { fachada: FOTO });
  assert.deepEqual(ficheros.map(f => f.ruta), [
    'visitas/2026/09/irve-1790357907845/visita.json',
    'visitas/2026/09/irve-1790357907845/fotos/fachada.jpg'
  ]);
  assert.equal(ficheros[1].codificacion, 'base64');
});

// ── La secuencia contra GitHub, sin tocar la red ───────────────────────

function redFalsa(guion) {
  const llamadas = [];
  const buscar = async (url, opciones = {}) => {
    const ruta = url.replace('https://api.github.com/repos/villverg/datos', '');
    llamadas.push(`${opciones.method ?? 'GET'} ${ruta}`);
    const respuesta = guion(ruta, opciones);
    return {
      ok: respuesta.estado < 400,
      status: respuesta.estado,
      json: async () => respuesta.cuerpo
    };
  };
  return { buscar, llamadas };
}

const AJUSTES = { repo: 'villverg/datos', rama: 'main', testigo: 'x'.repeat(40), tecnico: 'Juan' };

test('una visita entra en UN solo commit', async () => {
  const { buscar, llamadas } = redFalsa(ruta => {
    if (ruta === '/git/ref/heads/main') return { estado: 200, cuerpo: { object: { sha: 'base' } } };
    if (ruta === '/git/commits/base') return { estado: 200, cuerpo: { tree: { sha: 'arbolbase' } } };
    if (ruta === '/git/blobs') return { estado: 201, cuerpo: { sha: 'blob1' } };
    if (ruta === '/git/trees') return { estado: 201, cuerpo: { sha: 'arbol1' } };
    if (ruta === '/git/commits') return { estado: 201, cuerpo: { sha: 'commit1' } };
    if (ruta === '/git/refs/heads/main') return { estado: 200, cuerpo: {} };
    return { estado: 404, cuerpo: {} };
  });

  const destino = new GitHubDestino(AJUSTES, buscar);
  const r = await destino.subir(sesion, { fachada: FOTO });

  assert.equal(llamadas.filter(l => l.startsWith('POST /git/commits')).length, 1,
    'trece fotos no pueden ser trece commits: media visita subida parece una visita entera');
  assert.equal(r.commit, 'commit1');
  assert.equal(r.ruta, 'visitas/2026/09/irve-1790357907845');
});

test('sube un blob por fichero antes de cerrar el árbol', async () => {
  const { buscar, llamadas } = redFalsa(ruta => {
    if (ruta === '/git/ref/heads/main') return { estado: 200, cuerpo: { object: { sha: 'base' } } };
    if (ruta === '/git/commits/base') return { estado: 200, cuerpo: { tree: { sha: 'ab' } } };
    if (ruta === '/git/blobs') return { estado: 201, cuerpo: { sha: 'b' } };
    if (ruta === '/git/trees') return { estado: 201, cuerpo: { sha: 'a' } };
    if (ruta === '/git/commits') return { estado: 201, cuerpo: { sha: 'c' } };
    return { estado: 200, cuerpo: {} };
  });

  await new GitHubDestino(AJUSTES, buscar).subir(sesion, { fachada: FOTO, cuadro: FOTO });
  assert.equal(llamadas.filter(l => l === 'POST /git/blobs').length, 3, 'la visita y sus dos fotos');
  assert.ok(llamadas.indexOf('POST /git/trees') > llamadas.lastIndexOf('POST /git/blobs'));
});

test('un repositorio recién creado, sin rama todavía, también admite la primera visita', async () => {
  const { buscar, llamadas } = redFalsa(ruta => {
    if (ruta === '/git/ref/heads/main') return { estado: 404, cuerpo: {} };
    if (ruta === '/git/blobs') return { estado: 201, cuerpo: { sha: 'b' } };
    if (ruta === '/git/trees') return { estado: 201, cuerpo: { sha: 'a' } };
    if (ruta === '/git/commits') return { estado: 201, cuerpo: { sha: 'c' } };
    if (ruta === '/git/refs') return { estado: 201, cuerpo: {} };
    return { estado: 500, cuerpo: {} };
  });

  const r = await new GitHubDestino(AJUSTES, buscar).subir(sesion, {});
  assert.equal(r.commit, 'c');
  assert.ok(llamadas.includes('POST /git/refs'), 'la rama se crea, no se actualiza');
  assert.ok(!llamadas.some(l => l.startsWith('PATCH')), 'no hay rama que actualizar todavía');
});

test('un testigo caducado se explica en castellano y con qué hacer', async () => {
  const { buscar } = redFalsa(() => ({ estado: 401, cuerpo: {} }));
  await assert.rejects(
    () => new GitHubDestino(AJUSTES, buscar).subir(sesion, {}),
    /testigo no vale o ha caducado.*Ajustes/s
  );
});

test('CONTROL NEGATIVO · un repositorio PÚBLICO se rechaza', async () => {
  const { buscar } = redFalsa(() => ({ estado: 200, cuerpo: { full_name: 'villverg/datos', private: false, permissions: { push: true } } }));
  const r = await new GitHubDestino(AJUSTES, buscar).comprobar();
  assert.equal(r.ok, false);
  assert.match(r.error, /PÚBLICO/, 'las fotos de clientes no pueden acabar en un repositorio público');
});

test('CONTROL NEGATIVO · un testigo de solo lectura se detecta ANTES de la primera visita', async () => {
  const { buscar } = redFalsa(() => ({ estado: 200, cuerpo: { full_name: 'villverg/datos', private: true, permissions: { push: false } } }));
  const r = await new GitHubDestino(AJUSTES, buscar).comprobar();
  assert.equal(r.ok, false);
  assert.match(r.error, /leer pero no escribir/);
});

test('un repositorio privado con permiso de escritura da el visto bueno', async () => {
  const { buscar } = redFalsa(() => ({ estado: 200, cuerpo: { full_name: 'villverg/datos', private: true, permissions: { push: true } } }));
  assert.deepEqual(await new GitHubDestino(AJUSTES, buscar).comprobar(), { ok: true, quien: 'villverg/datos' });
});

test('CONTROL NEGATIVO · sin testigo no se intenta subir nada', async () => {
  const destino = new GitHubDestino({ repo: 'villverg/datos' }, async () => {
    throw new Error('no se puede llamar a la red sin credencial');
  });
  await assert.rejects(() => destino.subir(sesion, {}), /Sin repositorio ni testigo/);
});
