// La pantalla donde el técnico conecta su móvil con la oficina.
//
// Se comprueba ANTES de guardar. Guardar un testigo que no vale deja al
// técnico creyendo que sus visitas están subiendo, y no hay nada peor que un
// respaldo que no existe y nadie sabe que no existe.

import { leerAjustes, guardarAjustes, olvidarAjustes, validarRepo, validarTestigo } from './credencial.js';
import { destinoActivo } from './destino.js';

export function cablearAjustes({ campos, boton, olvidar, estado, alCambiar = () => {} }) {
  function pintarEstado(texto, clase) {
    estado.textContent = texto;
    estado.className = `estado-ajustes ${clase}`;
    estado.hidden = false;
  }

  function cargar() {
    const ajustes = leerAjustes();
    campos.tecnico.value = ajustes.tecnico ?? '';
    campos.repo.value = ajustes.repo ?? '';
    campos.testigo.value = ajustes.testigo ?? '';

    if (ajustes.testigo && ajustes.repo) {
      pintarEstado(`Conectado con ${ajustes.repo}`, 'bien');
      olvidar.hidden = false;
    } else {
      estado.hidden = true;
      olvidar.hidden = true;
    }
  }

  boton.addEventListener('click', async () => {
    const propuesta = {
      tecnico: campos.tecnico.value.trim(),
      repo: campos.repo.value.trim(),
      testigo: campos.testigo.value.trim()
    };

    const fallo = validarRepo(propuesta.repo) ?? validarTestigo(propuesta.testigo);
    if (fallo) return pintarEstado(fallo, 'mal');

    boton.disabled = true;
    pintarEstado('Comprobando con GitHub…', 'neutro');

    // Se prueba con los datos que acaba de escribir, sin guardarlos: si no
    // valen, no se queda un testigo malo pisando al que funcionaba.
    const resultado = await destinoActivo({ ...leerAjustes(), ...propuesta }).comprobar();
    boton.disabled = false;

    if (!resultado.ok) return pintarEstado(resultado.error, 'mal');

    guardarAjustes(propuesta);
    pintarEstado(`Conectado con ${resultado.quien}`, 'bien');
    olvidar.hidden = false;
    alCambiar();
  });

  olvidar.addEventListener('click', () => {
    if (!confirm('Se borra el testigo de ESTE móvil.\n\nLas visitas ya subidas siguen en la oficina; las que no hayan subido se quedan aquí.')) return;
    olvidarAjustes();
    cargar();
    alCambiar();
  });

  return { cargar };
}
