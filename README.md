# Captura guiada · #Okservice.es

Aplicación de campo para técnicos: guía las fotos de una instalación,
funciona sin cobertura y produce el informe de la visita.

Diseño y catálogo de actividades: repositorio privado `okservice-captura-foto`.

## Qué hace

- **Cinco actividades** (punto de recarga, boletín CIE, aire acondicionado,
  avería, nuevo suministro). Cada una es un fichero de guion, no código.
- **Cámara dentro de la app**, con el texto del paso a la vista mientras se
  apunta. Las fotos se reducen a 1600 px en el propio móvil.
- **Sin cobertura**: arranca en modo avión y guarda cada foto y cada dato en
  el aparato según se captura.
- **Informe siempre; presupuesto solo sin huecos.** Si un eje de la tarifa
  queda sin resolver, el informe lo declara y no se cierra precio.
- **Salir y volver**: la visita a medias se reabre por el paso donde se dejó.
- **Historial de visitas** con lo que ocupa cada una, para poder hacer sitio.

## El informe

Un único fichero HTML autocontenido: las fotos van **dentro**, no enlazadas.
Se abre sin la app, sin cobertura y sin cuenta de nada. Tres salidas:

| | |
|---|---|
| **Enviar** | La hoja de compartir del móvil — WhatsApp, correo. Dice el peso antes de mandarlo |
| **Guardar** | Descarga el fichero al aparato |
| **PDF** | Imprime, y el sistema ofrece «Guardar como PDF» |

## Desarrollo

```bash
npm test                 # 105 tests, sin dependencias
python3 -m http.server   # servir en local
```

Al añadir un módulo hay que meterlo en la lista del *service worker* y subir
el número de caché. Hay un test que lo comprueba contra los ficheros que
existen en disco: sin él, un módulo olvidado no rompe nada en el taller y
rompe la aplicación entera en el garaje.

## Lo que aquí NO hay

Ni claves, ni precios, ni fotos de clientes. Este repositorio es público:
lleva solo el código y los guiones de captura.
