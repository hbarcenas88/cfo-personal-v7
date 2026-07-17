# CFO Personal V7 - guia rapida PWA

## Como correrla localmente

Una PWA no debe usarse desde `file://` para instalarse bien. En desarrollo, sirvela con un servidor local:

```powershell
python -m http.server 8787
```

Luego abre:

```text
http://127.0.0.1:8787/
```

Si Python no esta disponible, se puede usar cualquier servidor estatico local.

## Publicarla en GitHub Pages

La app esta preparada para vivir en la raíz del repositorio de GitHub Pages:

```text
https://USUARIO.github.io/cfo-personal-v7/
```

Las rutas de HTML, manifest, iconos y service worker son relativas a la app, por lo que también funcionan localmente con:

```text
http://127.0.0.1:8787/
```

No cambies `start_url`, `scope` ni el registro del service worker a rutas que empiecen con `/`, porque eso apuntaria a la raiz del dominio y no a la subcarpeta del proyecto.

## Como instalarla

Android Chrome:

1. Abre la URL local o HTTPS.
2. Menu de Chrome.
3. Instalar app o Agregar a pantalla principal.

iPhone Safari:

1. Abre la URL HTTPS.
2. Boton Compartir.
3. Agregar a pantalla de inicio.

Desktop Chrome/Edge:

1. Abre la URL.
2. Icono de instalacion en la barra de direccion.
3. Instalar.

## Datos y persistencia

- V7 usa IndexedDB local del navegador.
- La data vive solo en ese navegador/dispositivo.
- Limpiar datos del sitio o cache del navegador puede borrar la data.
- Exporta respaldo JSON cuando quieras preservar todo el estado.
- Exporta multi-CSV cuando quieras revisar o manipular datos en Excel.

## JSON vs CSV

- JSON: respaldo completo para restaurar la app.
- CSV: formato practico para Excel y auditoria.

Para Excel, usa los CSV exportados. El JSON se puede transformar despues, pero no es el formato mas comodo para trabajo manual.

## Actualizaciones

El service worker cachea la app para uso offline. Si editas archivos y no ves cambios:

1. Recarga con Ctrl+F5.
2. En DevTools, Application > Service Workers > Update.
3. Si hace falta, Clear storage solo despues de respaldar JSON.

## Estado actual V7

- Arranca sin datos.
- Incluye onboarding.
- Incluye PWA shell, manifest y service worker.
- Incluye import/export CSV, backup JSON, salud de datos, catálogos, registros, calendario y keypad.
- Funciones marcadas como "Proximamente" no simulan nube ni seguridad real.
