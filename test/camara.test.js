import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Camara } from '../js/camara.js';

// Dobles mínimos: la clase solo necesita navigator.mediaDevices y un <video>.
// Node 22 define `navigator` como getter de solo lectura, así que hay que
// reemplazarlo con defineProperty en vez de asignarlo.
function ponerNavigator(valor) {
  Object.defineProperty(globalThis, 'navigator', {
    value: valor, configurable: true, writable: true
  });
}

function prepararEntorno({ getUserMedia }) {
  ponerNavigator({ mediaDevices: { getUserMedia } });
}

function videoFalso({ ancho = 1920, alto = 1080, tardaEnDarImagen = 0 } = {}) {
  const oyentes = {};
  const v = {
    srcObject: null,
    videoWidth: tardaEnDarImagen ? 0 : ancho,
    videoHeight: tardaEnDarImagen ? 0 : alto,
    play: async () => {},
    addEventListener: (ev, fn) => { oyentes[ev] = fn; },
    removeEventListener: ev => { delete oyentes[ev]; }
  };
  if (tardaEnDarImagen) {
    setTimeout(() => {
      v.videoWidth = ancho; v.videoHeight = alto;
      oyentes.loadedmetadata?.();
    }, tardaEnDarImagen);
  }
  return v;
}

const streamFalso = () => {
  const pista = { detenida: false, stop() { this.detenida = true; } };
  return { getTracks: () => [pista], _pista: pista };
};

test('abre y deja el stream disponible', async () => {
  prepararEntorno({ getUserMedia: async () => streamFalso() });
  const c = new Camara();
  await c.abrir(videoFalso());
  assert.equal(c.activa, true);
});

test('espera a que el vídeo dé imagen antes de darse por abierta', async () => {
  prepararEntorno({ getUserMedia: async () => streamFalso() });
  const c = new Camara();
  const v = videoFalso({ tardaEnDarImagen: 120 });
  await c.abrir(v);
  assert.ok(v.videoWidth > 0, 'no puede considerarse abierta con el vídeo a 0x0');
});

test('🔴 si getUserMedia nunca responde, corta por tope de tiempo', async () => {
  // Es el caso real: otra aplicación tiene la cámara tomada y la promesa
  // no resuelve NI rechaza. Sin tope, el técnico se queda bloqueado.
  prepararEntorno({ getUserMedia: () => new Promise(() => {}) });
  const c = new Camara();
  await assert.rejects(
    () => c.abrir(videoFalso(), 150),
    /no respondió/,
    'tiene que rendirse, no colgarse para siempre'
  );
  assert.equal(c.activa, false);
});

test('si el permiso se deniega, lo propaga para que la interfaz ofrezca el archivo', async () => {
  prepararEntorno({ getUserMedia: async () => { throw new Error('NotAllowedError'); } });
  const c = new Camara();
  await assert.rejects(() => c.abrir(videoFalso()), /NotAllowedError/);
  assert.equal(c.activa, false);
});

test('sin soporte de cámara lo dice claro', async () => {
  ponerNavigator({});
  await assert.rejects(() => new Camara().abrir(videoFalso()), /no da acceso a la cámara/);
});

test('cerrar detiene todas las pistas: la cámara no se queda encendida', async () => {
  const s = streamFalso();
  prepararEntorno({ getUserMedia: async () => s });
  const c = new Camara();
  const v = videoFalso();
  await c.abrir(v);
  c.cerrar(v);
  assert.equal(s._pista.detenida, true, 'una cámara encendida de fondo se come la batería');
  assert.equal(c.activa, false);
  assert.equal(v.srcObject, null);
});

test('disparar con el vídeo a 0x0 falla en vez de guardar una foto vacía', async () => {
  prepararEntorno({ getUserMedia: async () => streamFalso() });
  const c = new Camara();
  const v = { videoWidth: 0, videoHeight: 0 };
  await assert.rejects(() => c.disparar(v, () => ({ ancho: 0, alto: 0 })), /no da imagen/);
});
