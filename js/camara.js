// Cámara dentro de la aplicación.
//
// Con el <input capture> del navegador, el técnico sale a la cámara del
// sistema y pierde de vista lo que se le estaba pidiendo. Aquí el encuadre
// convive con el texto del paso: ve qué tiene que fotografiar mientras apunta.
//
// Si el permiso se deniega o el aparato no tiene cámara utilizable, el flujo
// no se rompe: la interfaz cae al selector de archivos, que siempre funciona.

export class Camara {
  constructor() {
    this.stream = null;
  }

  get activa() {
    return this.stream !== null;
  }

  // Devuelve el stream, o lanza si no se puede abrir.
  //
  // El tope de tiempo no es una precaución teórica: si otra aplicación tiene
  // la cámara tomada, o el permiso se queda esperando, `getUserMedia` no
  // resuelve NI rechaza. Sin tope, el técnico se queda mirando «Abriendo
  // cámara…» para siempre y no puede ni hacer la foto ni seguir.
  async abrir(video, msTope = 6000) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('este navegador no da acceso a la cámara');
    }

    const peticion = navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },   // la trasera, que es la que enfoca
        width: { ideal: 2048 },
        height: { ideal: 1536 }
      },
      audio: false
    });

    this.stream = await Promise.race([
      peticion,
      new Promise((_, rechazar) =>
        setTimeout(() => rechazar(new Error('la cámara no respondió')), msTope))
    ]).catch(e => {
      // Si la petición llega tarde, suelta el stream para no dejar la cámara
      // encendida en segundo plano gastando batería.
      peticion.then(s => s.getTracks().forEach(t => t.stop())).catch(() => {});
      throw e;
    });
    video.srcObject = this.stream;
    await video.play();

    // `play()` resuelve antes de que el vídeo tenga dimensiones reales. Si se
    // dispara en ese hueco, el fotograma sale vacío y la captura falla con un
    // «la cámara todavía no da imagen» que el técnico no sabe interpretar.
    await this.esperarImagen(video);
    return this.stream;
  }

  esperarImagen(video, msTope = 5000) {
    if (video.videoWidth && video.videoHeight) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const tope = setTimeout(() => {
        video.removeEventListener('loadedmetadata', listo);
        reject(new Error('la cámara no arrancó a tiempo'));
      }, msTope);
      const listo = () => {
        clearTimeout(tope);
        video.removeEventListener('loadedmetadata', listo);
        resolve();
      };
      video.addEventListener('loadedmetadata', listo, { once: true });
    });
  }

  cerrar(video) {
    if (video) video.srcObject = null;
    if (!this.stream) return;
    for (const pista of this.stream.getTracks()) pista.stop();
    this.stream = null;
  }

  // Congela el fotograma actual y lo devuelve ya reducido y comprimido.
  // Reutiliza el mismo cálculo de dimensiones que el resto de la aplicación.
  async disparar(video, calcularDimensiones, calidad = 0.8) {
    const origenAncho = video.videoWidth;
    const origenAlto = video.videoHeight;
    if (!origenAncho || !origenAlto) {
      throw new Error('la cámara todavía no da imagen');
    }

    const { ancho, alto } = calcularDimensiones(origenAncho, origenAlto);
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    lienzo.getContext('2d').drawImage(video, 0, 0, ancho, alto);

    return new Promise((resolve, reject) => {
      lienzo.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('no se pudo guardar la foto'))),
        'image/jpeg',
        calidad
      );
    });
  }
}
