# Prueba de campo · fase 1a

Lo que ya está verificado con navegador automatizado contra
`https://josecrea.github.io/okservice-captura/`:

- ✅ El service worker se instala y la aplicación arranca en modo avión
- ✅ El guion carga sin red
- ✅ Sin los metros: sale informe y dice que falta `METROS`
- ✅ Con los metros: cierra presupuesto
- ✅ 33 tests en verde, y el control negativo confirma que muerden

**Lo que ningún test automático puede comprobar es esto.** Se hace con un
móvil de verdad, en un sitio de verdad. Marca cada punto.

## Instalación

- [ ] Abre `https://josecrea.github.io/okservice-captura/` en el móvil.
- [ ] El navegador ofrece añadirla a la pantalla de inicio.
- [ ] Añadida, arranca a pantalla completa, sin barra del navegador.

## Sin cobertura, de verdad

- [ ] Baja a un garaje o un cuarto de contadores donde no haya línea.
- [ ] La aplicación abre igual.
- [ ] Empieza una captura y haz dos fotos: entran sin problema.
- [ ] Cierra la aplicación del todo y vuelve a abrirla: la sesión sigue ahí.

## El guion

- [ ] En los pasos obligatorios, **Siguiente** está apagado hasta que respondes.
- [ ] En los obligatorios aparece **No he podido**; en los opcionales, **Saltar**.
- [ ] Las fotos salen con la cámara trasera.
- [ ] La ayuda de cada paso se entiende sin que nadie te la explique.

## La regla antihueco

- [ ] Recorre la captura entera pulsando **No he podido** en los metros.
- [ ] Al terminar dice que falta `METROS` y que **no hay presupuesto**.
- [ ] El informe se abre igual, con el hueco escrito arriba del todo.
- [ ] En la tabla, los metros salen como **⚠️ no se pudo en la visita**.
- [ ] Vuelve atrás, escribe los metros, termina: ahora dice que cierra presupuesto.

## 🔴 La cámara: lo único que NO se ha podido verificar aquí

Los tests cubren la lógica (tope de tiempo, permiso denegado, cerrar las
pistas), y el navegador automatizado confirma que **si la cámara falla, la
visita continúa por el selector de archivos**. Pero la captura en vivo con una
cámara real no se puede probar sin un móvil. Esto hay que mirarlo a mano:

- [ ] El botón dice «Abriendo cámara…» un instante y luego **📷 Hacer foto**.
      Si se queda en «Abriendo…» más de seis segundos, debe caer solo al
      selector de archivos.
- [ ] Se ve el encuadre en vivo **dentro de la app**, con el texto del paso visible.
- [ ] Al disparar aparece la vista previa y el botón **Repetir**.
- [ ] **Repetir** vuelve a abrir la cámara.
- [ ] Sale la cámara **trasera**, no la frontal.
- [ ] Con WhatsApp abierto usando la cámara, la app no se queda colgada.
- [ ] Al salir del paso, **el piloto de la cámara se apaga** (si no, se come la batería).

## Los desplegables

- [ ] Debajo de cada foto aparecen sus desplegables.
- [ ] Los obligatorios no dejan avanzar hasta elegir.
- [ ] Lo elegido sale en el informe, sangrado bajo su foto.

## Las fotos

- [ ] Fotografía un **IGA real** de un cuadro.
- [ ] En el informe, **el amperaje se lee sin esfuerzo**.
- [ ] Comprueba el peso de la foto guardada: alrededor de 350 KB, no 4 MB.

Esta última es la que decide si la fase 1b puede leer el amperaje
automáticamente. Si a 1600 px el número no se lee, hay que subir la
resolución **de esa foto concreta**, no de todas.

## Lo que hay que mirar aunque no esté en la lista

- [ ] ¿Se ve la pantalla con **sol de frente**? Un garaje es oscuro, pero la
      fachada no.
- [ ] ¿Se puede usar **con una mano** y guantes puestos?
- [ ] ¿Cuánto tarda la visita entera? Si pasa de diez minutos, el guion es
      demasiado largo y hay que recortarlo.

## Si algo de esto falla

No se sale a obra. Se anota aquí qué falló y se arregla antes de seguir.
