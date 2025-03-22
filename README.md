# Logseq Empty Journals Cleaner

/ KUMORI CUBA

Este plugin para Logseq elimina automáticamente los journals (entradas diarias) que no contengan información sustancial, manteniendo tu base de conocimiento limpia y organizada.

## Características

- **Detección inteligente**: Reconoce journals verdaderamente vacíos, distinguiendo bullets vacíos del contenido real
- **Protección del journal actual**: Evita eliminar el journal del día en curso
- **Múltiples opciones**: Diferentes comandos para filtrar por antigüedad
- **Verificación previa**: Opción para verificar journals vacíos antes de eliminarlos

## Instalación

1. Clona o descarga este repositorio
2. Navega hasta la carpeta del proyecto
3. Instala las dependencias: `npm install`
4. Compila el proyecto: `npm run build`
5. En Logseq, ve a Configuración > Plugins
6. Haz clic en "Load unpacked plugin"
7. Selecciona la carpeta raíz del proyecto

## Uso

Utiliza los siguientes comandos al escribir "/" en un bloque:

- **Eliminar todos los journals vacíos**: Limpia cualquier journal vacío sin importar su fecha
- **Eliminar journals vacíos (antiguos)**: Elimina journals vacíos que no sean del futuro
- **Eliminar journals vacíos (solo del pasado)**: Elimina journals vacíos de al menos un día de antigüedad
- **Verificar journals vacíos**: Muestra qué journals están vacíos sin eliminarlos
- **Listar journals**: Muestra información detallada de todos los journals en la consola

## Cómo funciona

El plugin considera que un journal está vacío cuando:

- No contiene ningún bloque, o
- Solo contiene bloques vacíos o bullets sin texto

La característica de protección del journal actual evita eliminar accidentalmente el journal del día en curso, lo que podría causar problemas en Logseq.

## Desarrollo

Si deseas contribuir o personalizar la extensión:

1. Clona este repositorio
2. Instala las dependencias: `npm install`
3. Realiza los cambios en el código
   - El código principal está en `src/index.js`
   - La interfaz HTML está en `public/index.html`
4. Compila: `npm run build`
5. Para desarrollo continuo: `npm run dev`

## Licencia

MIT
