# Comprobación manual del almacén

IndexedDB no existe en Node, así que este módulo se comprueba en el navegador.
La comprobación automática está en `/tmp/prueba-offline.mjs` (arranque sin red);
ésta es la parte que necesita un móvil real.

1. Abre la aplicación y empieza una captura de IRVE.
2. Haz dos fotos y escribe los metros.
3. **Pon el móvil en modo avión.**
4. Cierra la aplicación del todo y vuelve a abrirla.
5. La sesión tiene que seguir ahí, con sus dos fotos y los metros.

Si se ha perdido algo, el almacén no está haciendo su trabajo y no se puede
salir a obra con esto.
