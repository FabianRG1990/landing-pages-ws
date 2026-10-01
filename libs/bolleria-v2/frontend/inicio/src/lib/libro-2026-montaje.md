# El montaje durante la apertura y el cierre

Cómo se obtuvo `assets/libro-2026-montaje.json`, y por qué es una **medida** y no
un cálculo.

## Qué resuelve

El contenido de las páginas solo entraba cuando el libro ya estaba asentado: se
abría con las hojas **en blanco** y el texto aparecía de golpe encima. Al
corregirlo con un fundido seguía notándose, y con razón: **un fundido no puede
parecer parte del libro, porque el papel no se desvanece**. Lo que se veía era la
foto y el texto apareciendo y desapareciendo, no una página.

Ahora hay dos cosas medidas cuadro a cuadro:

1. **Dónde cae el área de lectura** de cada página. Cada página es un plano, así
   que su movimiento en pantalla es una homografía; con las cuatro esquinas el
   componente la reconstruye entera.
2. **Qué la tapa**: la media hoja de enfrente al abrir, el semiplano de la
   contratapa al cerrar. El contenido se dibuja siempre y se recorta con ello,
   así que el libro lo **destapa** al abrirse y lo **cubre** al cerrarse. No hay
   ningún fundido en todo el recorrido.

Y hay una tercera cosa que no es una medida sino una **restricción**, y que fue
lo último y lo que más se notaba: la forma del cuadrilátero no puede ir y venir,
porque el libro es rígido y se abre de corrido. Sin eso, el contenido se movía
sobre el papel hasta 31,7 px, que es lo que se veía como letras deformándose. Va
en «Suavizado», más abajo.

El criterio de fondo, que es el del libro anterior: **describir cada página con
el movimiento más simple que de verdad hace, y que lo que entre y salga sea un
corte recto**. En la vuelta de hoja el libro está quieto, así que el contenido no
se toca y la hoja lo va cortando; aquí el libro sí se mueve, así que el contenido
lo sigue, pero sin inventarse ni un grado de más.

## De dónde salen las esquinas

### 1. Rastreo por puntos (lo principal)

SIFT sobre la imagen realzada (`imagen − su propio desenfoque`, que es lo que
saca el filete del marco y el veteado del papel), encadenando cuadro a cuadro
desde el reposo, con MAGSAC para quedarse con el plano dominante.

Dos ajustes que no son de manual y sin los cuales no funciona:

- **Razón de Lowe 0,85**, no 0,75. El papel tiene veteado repetido, así que el
  segundo vecino siempre está cerca y el filtro clásico tira casi todo: el paso
  f041→f040 daba 11 puntos con 0,75 y 30 con 0,85.
- **Máscara por página.** Las dos páginas son casi idénticas; sin acotar la
  búsqueda a la página que se rastrea, los emparejamientos saltan de una a otra.

### 2. El hueco de la página izquierda (f016-f041)

> De f035 a f102 esto ya **no** es lo que se dibuja: el área de lectura de la
> página izquierda se rehízo anclándola a su propio marco impreso (ver «La página
> izquierda se ancla aparte»). Lo de abajo sigue valiendo para saber **qué tapa**
> la hoja, que es lo único que se sigue usando de aquí.

Ahí no hay nada que rastrear: la hoja se **comba** -no es un plano- y el papel es
liso. Medido: SIFT se queda en 10 puntos y el flujo óptico KLT en 6 de 1.600
(`calcOpticalFlowPyrLK` descarta 1.620 de 1.652 puntos, porque en el interior de
la hoja no hay gradiente ninguno).

Pero la hoja izquierda no es libre: **gira sobre el lomo**. Escribiendo las dos
páginas en coordenadas con el origen en el lomo,

```
A = [q1, q2, q4]                          página derecha
B = [cos φ · q1 − sin φ · q3, q2, q4]     página izquierda
```

las columnas segunda y tercera son **las mismas**. Comprobado sobre los cuadros
con las dos rastreadas: la escala común sale 1,00 y las columnas coinciden con un
1-3 % de error. O sea que toda la página izquierda cabe en dos números:

```
c1 = α · q1 + β · q2       α = +1 abierta del todo, −1 cerrada
```

La **forma** de α se saca de una búsqueda en una dimensión contra el canto
exterior de la hoja -el borde más fuerte que hay ahí-, el **nivel** se fija por
continuidad con el rastreo en f042, y por debajo de f028 se prolonga hasta el
libro cerrado, donde α vale −1 por definición.

Ahí abajo la hoja no se ve: eso solo se usa para saber **qué tapa**.

### 3. Corrección de deriva (f042-f048)

La cadena de SIFT de la página izquierda deriva por debajo de f048: ahí quedan
15-30 puntos y el error se acumula. Comprobado al 300 % sobre el filete del marco
en f044, el α rastreado cae 77 px por dentro del filete de verdad y hay que
subirlo 0,10; en f052 y f056 el rastreo cae clavado. La corrección se aplica
entera hasta f044 y se apaga en f048.

## Los ocultadores

| Tramo | Qué tapa | De dónde sale |
|---|---|---|
| Apertura | la media hoja izquierda | su propio modelo de giro, con α < 0 |
| Cierre | la contratapa que baja | una **recta por cuadro**, buscada en el metraje |

**Al abrirse tapa la HOJA, no la tapa**, aunque la tapa sea lo que se ve: la tapa
abre **antes** que la primera hoja, así que la que se queda cruzada sobre la
página derecha -y por tanto la que manda- es la hoja. Se comprobó con números:
la relación entre la tapa y la hoja deriva de 63 a 443 px en nueve cuadros, o sea
que no van rígidas, y al usar la tapa de ocultador el texto salía cortado un
cuarto de más hasta f036.

### El cierre NO se rastrea: se busca el canto

La primera versión rastreaba la contratapa con SIFT -180 a 2.900 puntos por
cuadro, señal magnífica- y transportaba su rectángulo con la homografía. **Estaba
mal, y mucho.** Buena señal no garantiza que el rectángulo caiga donde debe, y no
se contrastó contra el metraje. Medido después, contra el canto real de la tapa:

| Cuadro | Desfase del ocultador rastreado |
|---|---|
| f198-f204 | **300 a 360 px hacia dentro** |
| f205-f207 | 90 a 270 px |
| f208-f213 | ±35 px (ahí sí servía) |

Y arrancaba en **f175**, cuando la tapa ni siquiera ha entrado en el área de
lectura: se comía el 43 % de la foto -258.544 px² de un fotograma al siguiente-
por un corte recto sobre una página desnuda y a plena luz.

Lo que hay ahora es lo mismo que hace el `CORTE_FOTO` del libro anterior: **una
recta por cuadro**. La tapa es un plano rígido, así que su canto sobre la página
es una recta y no hace falta describir nada más. Se busca cuadro a cuadro
maximizando el contraste cálido a un lado y otro (la tapa es más cálida que el
papel: R/B 1,33 contra 1,11), con sumas acumuladas por fila para que sea barato.

Dos cosas que hubo que descartar antes de dar con ella:

- **Clasificar por color no vale.** La tapa al bajar echa una sombra sobre la
  página, y la sombra la calienta: en f204 el papel en sombra ya está en R/B
  1,17, a medio camino de la tapa. Da un borde blando y dentado donde el canto
  es duro y recto.
- **La luminancia tampoco**: la página solo pierde un 7 % (L 238 → 222) en todo
  el cierre, así que no separa nada.

La búsqueda dice además **cuándo** entra la tapa: de f190 a f204 la recta se
queda clavada en el borde de la propia página -no hay nada que separar dentro
del área- y solo empieza a barrer en f205, a unos 60 px por cuadro. Por eso el
ocultador no existe antes de f204, y la fila de f204 lleva la recta justo en el
borde, que no borra nada: así la entrada es un barrido y no un salto.

El corte va **10 px hacia dentro** del canto medido. Los dos errores no cuestan
igual: tapar 10 px de más es invisible, y pintar foto sobre la tapa se ve.

## Dónde empieza y acaba cada cosa

Ninguno de estos límites es de gusto; todos son geométricos, y por eso no se
notan:

- **Texto, apertura:** desde f016. Antes no hay geometría, y hasta f030 la hoja
  lo tapa casi entero: se va destapando solo. Medida el área visible, va de 0 a
  100 % entre f019 y f031 sin ningún escalón.
- **Foto, apertura:** desde **f035**, que es el cuadro en que la hoja pasa **de
  canto**. No es una elección: el área medida del cuadrilátero baja hasta 2.068
  px² justo ahí -el 0,3 % de la página- y el ángulo de su esquina cruza por cero.
  Antes de f035 el ángulo es NEGATIVO, o sea que lo que mira a la cámara es el
  dorso de la hoja; dibujar ahí la foto es dibujarla **del revés sobre una cara
  que no se ve**, que es exactamente lo que se hacía hasta f034. Desde f035 crece
  desde nada, sin escalón.
- **Texto, cierre:** hasta f203. El ancho no lo pone el rastreo sino el metraje
  (ver abajo), y ahí ya vale 5 px.
- **Foto, cierre:** hasta f216. La contratapa la va cubriendo desde f204 y en
  f216 la recta llega al canto izquierdo del área, así que no queda ni una cuña.
  Medida la cola: 93, 83, 72, 61, 52, 44, 36, 28, 20, 14, 10, 3,5, 0 % -monótona
  y sin saltos-.

### El ancho de la página derecha al cerrar es una medida, no el rastreo

El rastreo se despega a partir de f193: se queda atascado en 328 px mientras la
página sigue girando. Contrastado con el metraje -distancia del lomo al primer
canto oscuro, a media altura-, la razón entre lo rastreado y lo visto es estable
en **0,908** hasta f192 y se dispara a 2,11 en f199. O sea que el rastreo llegó a
sobrar más del doble.

El ancho visto cae limpio: 570, 531, 491, 449, 401, 358, 312, 265, 209, 156, 102,
50, 23 px de f190 a f202, unos 50 px por cuadro. De f193 en adelante manda esa
medida, escalada por 0,908, y con ella el texto se encoge hasta nada en f203, que
es donde el metraje enseña que la cara de la página desaparece.

## El anclaje al marco impreso

Suavizar quitó el temblor, pero quedaba algo peor y de otra naturaleza: **un
error sistemático de giro**. Al abrir, con el libro a media asta, el texto salía
torcido, encogido por la izquierda y corrido a la derecha. Medido sobre f033: los
renglones caían a **−10,5°** y el filete impreso de la página a **−5,3°**. Cuatro
grados de más y un 12 % de anchura de menos.

No era ruido y por eso el suavizado no lo tocaba: la cadena de SIFT arranca en el
reposo y va hacia atrás, y el error se acumula según se cierra el libro. Contra
el marco impreso, la correlación media del rastreo en toda la apertura era de
**+0,25**: prácticamente nada.

### Qué se usa de referencia, y por qué no otra cosa

El papel no tiene textura, así que hay que agarrarse a lo único impreso: el
**filete doble del marco y los cuatro adornos de las esquinas**. Se probaron
antes, y ninguna funciona:

- **SIFT directo contra el reposo** (sin encadenar): 7 a 30 puntos por cuadro y
  homografías con 600-1.000 px de error. El papel no da de sí.
- **ECC**, tanto desdoblando el cuadro como llevando el reposo al cuadro: no
  converge por debajo de f070.
- **Plantillas de los adornos** sueltas: se pierden en cuanto la página está
  escorzada, y las cuatro se parecen entre sí.

Lo que sí funciona: tomar los puntos del marco en el cuadro de reposo y puntuar
una geometría candidata **proyectándolos**, con correlación normalizada. Sin
normalizar no vale -la primera versión premiaba geometrías peores, porque un
solo borde fuerte se comía la suma-.

### Cómo se ancla

Se marcha **desde el reposo hacia atrás**, que es donde la geometría es exacta
por construcción. Cada cuadro parte de la corregida del siguiente más el
incremento que dio el rastreo -que localmente sí es bueno- y se afina con una
búsqueda corta contra el marco. Así cada cuadro queda anclado al marco de verdad
y no se acumula nada.

Resultado: la correlación con el marco pasa de **+0,25 a +0,61** de media, y la
pendiente del renglón en f033 de −10,5° a −6,4°, que es la de la página.

### La página izquierda se ancla aparte, con memoria

El primer intento fue **propagarle a la izquierda la misma corrección que a la
derecha**, tratándola como un error de pose del libro entero. Sirve con el libro
casi abierto, pero es falso en mitad de la apertura: ahí la hoja izquierda es
**otro plano**, girando, y llevarle la homografía de la derecha no significa
nada. Medido contra su propio marco impreso, la correlación de la izquierda en
toda la apertura era de **+0,25 de media, y por debajo de cero en 45 de 71
cuadros**: puntería de azar. En imagen se veía como la foto pegada a la hoja
equivocada, plana mientras la hoja todavía estaba de pie.

Anclarla por su cuenta cuadro a cuadro tampoco vale tal cual: son **ocho grados
de libertad contra una señal débil**, y el buscador se pega al ruido. Acierta de
media -la correlación sube a +0,70- pero tiembla: el contenido se aparta 7,2 px
de su propia tendencia, y filtrarlo después se lleva por delante la puntería
(con Savitzky-Golay la correlación vuelve a caer a +0,45).

Lo que sí funciona es resolver las dos cosas **a la vez**, sobre toda la tira:

```
maximizar   suma de correlaciones con el marco
            − λ · suma de |Q(n+1) − 2·Q(n) + Q(n−1)|²
```

o sea, cobrarle a la hoja cualquier aceleración que el metraje no pague. Barrido
λ de 1e-4 a 3e-3, el punto está en **1e-3**: más abajo tiembla, más arriba
empieza a perder marco sin ganar suavidad.

| | Antes | Ahora |
|---|---|---|
| Correlación media con el marco (f035-f102) | +0,27 | **+0,59** |
| Cuadros por debajo de +0,25 | 42 de 68 | **12 de 68** |
| Temblor del contenido, p90 | 0,23 px | 1,36 px |
| Esquinas invertidas | 3 cuadros (f032-f034) | **ninguna** |

El temblor sube de 0,23 a 1,36 px, y es un cambio a mejor: los 0,23 px de antes
eran los de una tira muy suave que apuntaba a otro sitio. Para comparar, la
página derecha -que ya estaba aprobada- se quedó en 2,55 px.

De f052 en adelante la mejora es aplastante (+0,46 a +1,00 frente a 0,00-0,85).
De f035 a f051 **el marco no decide**: ahí la hoja está casi de canto y el anillo
de referencia se sale de lo visible, así que las dos versiones puntúan flojo. Ese
tramo se resolvió mirándolo: la nueva cae sobre la hoja que está de pie y la
vieja caía sobre la hoja de abajo, ya tumbada.

El cierre **no se toca**: allí las correcciones medidas son de 1 a 21 px con
correlaciones de 0,86 a 0,99, o sea que no había error. Comprobado: el cierre, la
reapertura y la vuelta de hoja salen idénticos píxel a píxel a los de antes.

## Suavizado: la forma y la posición no se suavizan igual

Este es el arreglo que quitó lo que de verdad se notaba. **Las letras se
deformaban sobre el papel**, y no porque la página se deformase: porque el
cuadrilátero rastreado respiraba.

La prueba está en la cizalla de la página derecha al abrir: va de −12,6° a −3,3°
(f025), vuelve a −6,5° (f030), sube a +6,3° (f040) y baja a 0°. **Cambia de signo
tres veces.** Un libro que se abre de corrido no puede hacer eso, y tres grados
de cizalla sobre un panel de 845 px inclinan el renglón unos 44 px.

Medido como lo que se ve -el movimiento del contenido SOBRE el papel, quitándole
el movimiento real de la página-:

| Tramo | Antes (p90 / máx) | Ahora (p90 / máx) |
|---|---|---|
| Apertura, texto | 10,3 / 19,9 px | 4,5 / 7,5 px |
| Apertura, foto | 18,4 / **31,7 px** | 1,4 / 15,3 px (ver el anclaje) |
| Cierre, foto | 6,2 / 14,3 px | 3,5 / 5,4 px |

Los cuadros peores coinciden exactamente con los que el rastreo ya daba por
flojos: f037-f044 en la página izquierda (15-30 puntos, más la corrección de
deriva) y f195-f199 en la derecha.

La cura es separar **dos errores que no son el mismo**:

- la **forma** del cuadrilátero -si se equivoca, el contenido se DEFORMA-;
- la **posición** -si se equivoca, el contenido RESBALA entero-.

Así que se suaviza el centroide por un lado y la forma -las esquinas respecto al
centroide- por otro, con Savitzky-Golay y ventanas distintas: **posición (15, 3),
forma (21, 3)**. Las ventanas no son de gusto: barriendo de 9 a 25 sobre la
posición, el tirón (segunda diferencia) baja de 9,5 a 5,4 px al llegar a 15 y ya
no mejora, mientras que la desviación contra el rastreo crudo sigue subiendo
-hasta 22 px en 25-, o sea que a partir de ahí se estaría quitando movimiento de
verdad y no ruido.

Contrastado contra el **marco impreso** de la página, que es el testigo: el
cuadrilátero suavizado cae paralelo al marco con margen constante, y el crudo
sale torcido. Se comprobó a 300 % en f030, f037, f042, f188, f196 y f209.

El metraje es un **render**: el libro se mueve suave por construcción, así que
cualquier frecuencia alta en el rastreo es ruido de estimación.

## Cómo se dibuja

`drawImage` solo sabe transformadas afines y esto es una homografía, así que se
aproxima a trozos con una malla de 10×10. Con GPU va de una pasada (`WarpGL`, la
misma utilidad que usa el libro anterior) y sin GPU celda a celda.

El recorte con la tapa se hace con el **complementario**: `clip` solo sabe
quedarse con lo de dentro de un trazado, así que para quedarse con lo de fuera se
mete también el lienzo entero y se deja que la regla par-impar haga el agujero.

En el camino sin GPU hay que ensanchar el recorte de cada celda **y** dibujar
también ese margen: con lo primero solo, la costura sigue igual, porque ahí no se
pinta nada. Medido contra el camino de GPU, la diferencia media es de 0,15 sobre
255 y el percentil 99 de 3.

Medido con GPU real a 1600×900: apertura y cierre a **16,6 ms de mediana**
(60 fps), percentil 90 de 18,4 ms.

## Herramientas

Los guiones que sacaron todo esto están en
`C:\Users\Fabian\Downloads\new book\montaje\`.
