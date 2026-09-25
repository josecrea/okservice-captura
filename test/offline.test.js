// Añadir un módulo y olvidarlo en la lista del service worker no rompe nada
// en el taller —el navegador lo pide a la red y ahí está— y rompe la app
// entera en el garaje sin cobertura, que es justo donde se usa.
//
// Este test mira los ficheros que existen DE VERDAD en el disco, no los que
// el service worker dice cachear. Comparar la lista consigo misma no
// verificaría nada.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const sw = readFileSync(join(raiz, 'sw.js'), 'utf8');

const cacheados = (() => {
  const bloque = sw.match(/const FICHEROS = \[([\s\S]*?)\];/);
  assert.ok(bloque, 'el service worker tiene que declarar su lista FICHEROS');
  return [...bloque[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
})();

const enDisco = carpeta =>
  readdirSync(join(raiz, carpeta)).map(f => `./${carpeta}/${f}`);

test('el service worker cachea TODOS los módulos de js/', () => {
  for (const modulo of enDisco('js')) {
    assert.ok(cacheados.includes(modulo), `${modulo} existe pero el service worker no lo cachea: sin cobertura la app no arranca`);
  }
});

test('el service worker cachea TODOS los guiones', () => {
  for (const guion of enDisco('guiones')) {
    assert.ok(cacheados.includes(guion), `${guion} existe pero el service worker no lo cachea`);
  }
});

test('el service worker cachea el armazón de la app', () => {
  for (const fichero of ['./', './index.html', './css/app.css', './manifest.webmanifest']) {
    assert.ok(cacheados.includes(fichero), `falta ${fichero} en la caché`);
  }
});

test('CONTROL NEGATIVO · un fichero que no existe no aparece cacheado', () => {
  assert.ok(!cacheados.includes('./js/inventado.js'), 'si esto pasa, la comprobación no está mirando la lista real');
});

test('CONTROL NEGATIVO · el número de caché sube cuando cambia la lista', () => {
  const version = sw.match(/okservice-captura-v(\d+)/);
  assert.ok(version, 'la caché tiene que llevar número de versión');
  assert.ok(Number(version[1]) >= 4, 'al añadir un fichero hay que subir el número, o el móvil sigue sirviendo la versión vieja');
});
