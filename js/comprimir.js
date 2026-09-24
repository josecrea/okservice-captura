// Reduce las fotos antes de guardarlas.
//
// Una foto de móvil ronda los 4 MB. A 1600 px de lado mayor y calidad 0,8
// baja a unos 350 KB, y el amperaje de un IGA se sigue leyendo sin esfuerzo,
// que es lo único que importa. Son unas once veces menos peso.

export const LADO_MAXIMO = 1600;
export const CALIDAD = 0.8;

export function calcularDimensiones(ancho, alto, ladoMaximo = LADO_MAXIMO) {
  const mayor = Math.max(ancho, alto);
  if (mayor <= ladoMaximo) return { ancho, alto };
  const factor = ladoMaximo / mayor;
  return {
    ancho: Math.round(ancho * factor),
    alto: Math.round(alto * factor)
  };
}

// Solo navegador: recibe un File y devuelve un Blob JPEG reducido.
export async function comprimirFoto(file, ladoMaximo = LADO_MAXIMO, calidad = CALIDAD) {
  const bitmap = await createImageBitmap(file);
  const { ancho, alto } = calcularDimensiones(bitmap.width, bitmap.height, ladoMaximo);

  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  lienzo.getContext('2d').drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  return new Promise((resolve, reject) => {
    lienzo.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('el navegador no pudo comprimir la foto'))),
      'image/jpeg',
      calidad
    );
  });
}
