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

## La oficina

Las visitas suben a un repositorio **privado** de GitHub, una por commit, con
su `visita.json` y sus fotos. Desde la oficina se leen en `/panel/`.

```
visitas/2026/09/irve-1790357907845/
├── visita.json        ← datos, quién la hizo, GPS, qué quedó sin resolver
└── fotos/
    ├── fachada.jpg
    └── cuadro.jpg
```

### Puesta en marcha

1. **Crear el repositorio de datos como PRIVADO.** La aplicación comprueba que
   lo es y se niega a subir a uno público: ahí van fotos de casas de clientes.
2. **Un testigo por técnico**, en GitHub → *Settings* → *Developer settings* →
   *Personal access tokens* → *Fine-grained tokens*:
   - acceso **solo** al repositorio de datos (`Only select repositories`)
   - permiso **Contents: Read and write** y nada más
   - **con fecha de caducidad**
3. En el móvil: **⚙️ Ajustes** → nombre, repositorio y testigo → *Comprobar y
   guardar*. Se comprueba contra GitHub antes de guardarlo.
4. En la oficina: `/panel/` con el mismo repositorio y un testigo, que ahí
   **puede ser de solo lectura**.

Si se pierde un móvil, se revoca ese testigo desde GitHub y deja de valer.

> **El límite de esto.** Un repositorio de GitHub no es una base de datos: a
> unos 4 MB por visita, el historial de git crece y pasado el gigabyte hay que
> mudarse. Por eso el destino está detrás de una interfaz (`js/destino.js`):
> pasar a servidor propio es escribir `destino-servidor.js`, no reescribir la
> aplicación.

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
