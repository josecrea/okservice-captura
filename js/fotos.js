// Pasa las fotos guardadas a texto para que quepan dentro del informe.
//
// Solo navegador: lee Blobs. El informe se queda puro y testeable porque
// recibe el mapa ya resuelto.

export function aDataUri(blob) {
  return new Promise((resolve, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = () => rechazar(lector.error ?? new Error('no se pudo leer la foto'));
    lector.readAsDataURL(blob);
  });
}

// Devuelve el mapa clave → data URI y, aparte, las que no se pudieron leer.
//
// Una foto ilegible no puede tumbar el informe entero: el resto de la visita
// sigue siendo válida. Pero tampoco desaparece en silencio — sale por
// `fallidas` para que la app lo diga, que es la diferencia entre un informe
// incompleto y un informe incompleto que nadie sabe que lo está.
export async function leerFotos(sesion) {
  const fotos = {};
  const fallidas = [];

  for (const [clave, respuesta] of Object.entries(sesion?.respuestas ?? {})) {
    if (!(respuesta?.valor instanceof Blob)) continue;
    try {
      fotos[clave] = await aDataUri(respuesta.valor);
    } catch {
      fallidas.push(clave);
    }
  }

  return { fotos, fallidas };
}
