# Integra Suite — archivos separados

- `index.html`: estructura y referencias de carga.
- `styles.css`: los tres bloques CSS extraídos, en su orden original.
- `js/`: los once bloques JavaScript extraídos y referenciados en el mismo orden en que se ejecutaban. No cambies su orden sin probar la aplicación.

Las librerías externas (jsPDF, html2canvas, Supabase y Chart.js) siguen cargándose desde sus CDN originales.

## Configuración de Supabase

La clave no está guardada en estos archivos. Para usar el modo nube, el servidor debe definir `window.INTEGRA_CONFIG.supabasePublishableKey` antes de cargar `js/01-app-base.js`. Si no se define, el modo nube no podrá autenticarse/sincronizar; no pegues la clave en un archivo que vayas a compartir.

## CSS inline restante

Se movieron los tres bloques `<style>` a `styles.css`. Se conservaron los estilos `style="..."` del marcado y los estilos que JavaScript aplica en tiempo de ejecución para no alterar el diseño ni los estados dinámicos.
