import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validarGuion } from '../js/guion.js';

const leer = async n => JSON.parse(await readFile(new URL(`../guiones/${n}.json`, import.meta.url), 'utf8'));

// Los ejes obligatorios de cada partida salen de
// ~/okservice-tarifa/MATRIZ-SERVICIO-VARIABLES.md · no se inventan aquí.
const SEGUN_LA_MATRIZ = {
  irve:       { partida: '13.1', ejes: ['CANALIZ', 'EQUIPO', 'METROS', 'OBRA', 'PAPELEO', 'POTENC', 'ZONA'] },
  cie:        { partida: '9.1',  ejes: ['PAPELEO'] },
  aire:       { partida: '8.1',  ejes: ['ALTURA', 'EQUIPO', 'METROS', 'OBRA', 'POTENC', 'ZONA'] },
  averia:     { partida: '1.1',  ejes: ['URGENC', 'ZONA'] },
  suministro: { partida: '2.1',  ejes: ['EQUIPO', 'OBRA', 'PAPELEO', 'POTENC', 'ZONA'] }
};

test('el índice lista exactamente las actividades que tienen guion', async () => {
  const indice = await leer('index');
  const ids = indice.actividades.map(a => a.id).sort();
  assert.deepEqual(ids, Object.keys(SEGUN_LA_MATRIZ).sort());
});

for (const [id, esperado] of Object.entries(SEGUN_LA_MATRIZ)) {
  test(`${id} · el guion es válido`, async () => {
    assert.deepEqual(validarGuion(await leer(id)), []);
  });

  test(`${id} · sus ejes obligatorios son los de la partida ${esperado.partida}`, async () => {
    const g = await leer(id);
    assert.equal(g.partida, esperado.partida);
    assert.deepEqual([...g.ejesObligatorios].sort(), esperado.ejes);
  });

  test(`${id} · no contiene ningún precio`, async () => {
    const crudo = await readFile(new URL(`../guiones/${id}.json`, import.meta.url), 'utf8');
    const pasos = JSON.parse(crudo).pasos;
    // Los importes solo pueden aparecer en textos de ayuda, nunca como dato
    // del que la aplicación calcule. Ningún paso puede llevar campo de precio.
    for (const p of pasos) {
      assert.ok(!('precio' in p), `${p.id} lleva un precio y los guiones no tienen precios`);
      assert.ok(!('importe' in p), `${p.id} lleva un importe`);
      assert.ok(!('recargo' in p), `${p.id} lleva un recargo`);
    }
  });
}

test('ZONA nunca la cierra una foto: el municipio no se lee en una imagen', async () => {
  for (const id of Object.keys(SEGUN_LA_MATRIZ)) {
    const g = await leer(id);
    for (const paso of g.pasos) {
      if ((paso.cierra ?? []).includes('ZONA')) {
        assert.notEqual(paso.tipo, 'foto',
          `${id}/${paso.id} pretende cerrar ZONA con una foto, y el municipio no sale de una imagen`);
      }
    }
  }
});

test('la avería sale como parte de trabajo, no como presupuesto cerrado', async () => {
  const g = await leer('averia');
  assert.equal(g.salida, 'parte', 'la avería se cobra por hora, no por alcance');
});

test('el boletín CIE no pregunta el municipio: lleva el desplazamiento dentro', async () => {
  const g = await leer('cie');
  assert.ok(!g.ejesObligatorios.includes('ZONA'));
  assert.ok(!g.pasos.some(p => p.id === 'municipio'));
});
