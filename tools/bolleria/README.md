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
| `calibrador-portada.html` + `servidor-calibrador.mjs` | **Libro 2026.** La foto de la primera hoja mientras el libro se abre (cuadros **33-102**): las cuatro esquinas del área de lectura de la página izquierda, cuadro a cuadro. Guarda en `localStorage` bajo `calib-portada-v1` y **escribe directamente** `assets/libro-2026-montaje.json`, solo la clave `izq` de ese tramo. |
| `calibrador-guia.png` | Plantilla de referencia que cargan varios de ellos. |
| `importar.json` | Una calibración guardada, para reimportarla sin empezar de cero. |

## El de la portada (libro 2026)

Ese no lee los assets de `apps/bolleria/public` sino los de **`apps/bolleria-v2/public`**
(los 292 cuadros del vídeo nuevo y el montaje), y además **escribe** el resultado en el
repositorio. Las dos cosas las resuelve su propio servidor:

```sh
node tools/bolleria/servidor-calibrador.mjs        # 4318 por defecto
# http://127.0.0.1:4318/tools/bolleria/calibrador-portada.html
```

Sirve la raíz del repositorio como estático y atiende `POST /calibrador/guardar`. Antes de
escribir **compara contra el archivo que hay en disco y rechaza la petición entera** si
trae cualquier diferencia que no sea `izq` de un cuadro del tramo: esa garantía no puede
depender de que el cliente esté bien. La primera vez deja una copia del estado anterior en
`tools/bolleria/libro-2026-montaje.bak.json` —fuera de `public/`, que se publica entera— y
guarda la calibración en `tools/bolleria/portada-calibracion.json` para poder reimportarla. Escucha solo en `127.0.0.1`.

También se abre con un estático cualquiera (o desde el servidor de desarrollo de
bolleria-v2, que copia esta carpeta a la raíz); ahí el botón de guardar se apaga solo y
quedan la descarga y el portapapeles. Si los assets están en otro sitio, se le dice:
`?base=/lo/que/sea/assets/`.

**Cómo se trabaja.** El reposo (f094 en adelante) ya está clavado y no se toca. Del 64 hacia
abajo es donde la foto se desacomoda: se va cuadro a cuadro hacia atrás, en cada uno se
copia la posición del siguiente (tecla <kbd>S</kbd>) y se corrige solo lo que haya cambiado.
Al copiar, el cuadro de origen se clava donde está, así que no se mueve por debajo de los
pies. Con <kbd>Espacio</kbd> se reproduce el tramo, por defecto en el sentido en que se ve
en el sitio: de abierto a cerrado.

**Pendiente conocido:** los cuadros 92, 93, 94 y 103 no tienen malla del dorso en
`about-book-curl.json`. Eso se arregla con `calibrador-hoja.html`, no tocando
código.
