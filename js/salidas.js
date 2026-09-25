// Las tres salidas del informe: mandarlo, guardarlo e imprimirlo en PDF.
//
// Ninguna usa window.open. Abrir una pestaña nueva desde un manejador que ya
// ha hecho `await` cuenta como ventana emergente y Safari la bloquea sin
// avisar: el técnico pulsa, no pasa nada, y no hay error que enseñarle.

export function ficheroDe(nombre, html) {
  return new File([html], nombre, { type: 'text/html' });
}

// Guarda el informe como fichero en el aparato.
export function descargar(nombre, html) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Con prisa se revoca antes de que el navegador haya empezado a escribir.
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'descargado';
}

// La vía de campo: la hoja de compartir del móvil, con WhatsApp y el correo
// dentro. Si el aparato no sabe compartir ficheros, cae a la descarga en vez
// de dejar al técnico sin nada.
export async function compartir({ nombre, html, titulo, texto }) {
  const fichero = ficheroDe(nombre, html);

  if (navigator.canShare?.({ files: [fichero] })) {
    try {
      await navigator.share({ files: [fichero], title: titulo, text: texto });
      return 'compartido';
    } catch (e) {
      // Cerrar la hoja de compartir es una decisión del técnico, no un fallo:
      // no se le descarga nada a la espalda por haber dicho que no.
      if (e?.name === 'AbortError') return 'cancelado';
      return descargar(nombre, html);
    }
  }

  return descargar(nombre, html);
}

// PDF por la vía del propio sistema: imprimir da «Guardar como PDF» tanto en
// iOS como en Android y en el ordenador, sin meter una librería de 300 KB.
//
// Se imprime desde un marco oculto para no perder la aplicación de vista: si
// se navegara al informe, volver significaría recargar y el técnico no sabe
// que su visita está guardada.
export function imprimir(html, documento = document) {
  return new Promise(resolve => {
    const marco = documento.createElement('iframe');
    marco.setAttribute('aria-hidden', 'true');
    marco.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0';
    marco.srcdoc = html;

    const limpiar = () => {
      marco.remove();
      resolve('impreso');
    };

    marco.addEventListener('load', () => {
      const ventana = marco.contentWindow;
      // Las fotos van dentro del documento, pero el navegador todavía tiene
      // que decodificarlas: imprimir antes saca el informe con los huecos en
      // blanco donde deberían ir las fotos.
      const lanzar = () => {
        try {
          ventana.focus();
          ventana.print();
        } catch {
          /* si el navegador no deja imprimir, el informe ya se puede descargar */
        }
        setTimeout(limpiar, 1000);
      };

      const imagenes = [...ventana.document.images];
      if (imagenes.length === 0) return lanzar();

      Promise.all(imagenes.map(img => img.complete
        ? Promise.resolve()
        : new Promise(listo => {
            img.addEventListener('load', listo, { once: true });
            img.addEventListener('error', listo, { once: true });
          })
      )).then(lanzar);
    }, { once: true });

    documento.body.appendChild(marco);
  });
}
