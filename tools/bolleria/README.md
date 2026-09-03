# Calibradores de Bollería

Herramientas de trabajo, **no** parte del sitio. Vivían en `apps/bolleria/public`
—la carpeta que se publica— y se excluían del bundle de producción con una regla
`ignore`; desde aquí ya no hace falta esa regla ni existe el riesgo de publicarlas
por descuido.

Son páginas HTML sueltas, sin compilar. Se abren sirviendo esta carpeta en un
puerto **distinto** al del servidor de desarrollo:

```sh
npx http-server tools/bolleria -p 4311
```

| archivo | para qué sirve |
|---|---|
| `calibrador-hoja.html` | La malla del libro: dónde cae el papel en cada cuadro del vídeo. Guarda en `localStorage` bajo `calib-hoja-v4`. Es el que produce `assets/about-book-curl.json`. |
| `calibrador-texto.html` + `.js` | La caja de texto de cada una de las 7 páginas: `u`, `v` y giro. De cada pasada se toman **solo** esos tres valores; el cuerpo de letra que propone se descarta a propósito (ver `TEXTO_POR_PAGINA` en `about-book.component.ts`). |
| `calibrador-foto.html` | El encuadre de la foto dentro de la página izquierda. |
| `calibrador-corte.html` | El corte del metraje: qué cuadro abre y cuál cierra cada tramo. |
| `calibrador-aterrizaje.html` + `.js` | Dónde aterriza el contenido al terminar el volteo. |
| `calibrador-aterrizaje-foto.html` + `.js` | Lo mismo, para la foto. |
| `calibrador-guia.png` | Plantilla de referencia que cargan varios de ellos. |
| `importar.json` | Una calibración guardada, para reimportarla sin empezar de cero. |

**Pendiente conocido:** los cuadros 92, 93, 94 y 103 no tienen malla del dorso en
`about-book-curl.json`. Eso se arregla con `calibrador-hoja.html`, no tocando
código.
