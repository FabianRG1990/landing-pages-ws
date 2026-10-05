/**
 * El freno de la pista del libro.
 *
 * El problema que resuelve, con los numeros medidos en un 393x873:
 *
 * La pista del libro mide 4.129 px. Un deslizamiento con inercia recorre miles
 * de pixeles de un solo gesto, asi que se comia el libro entero -"si a una
 * persona se le va el dedo, tiro todo el libro y no leyo nada"-. La respuesta
 * obvia era encarecer la hoja, y se hizo: de 218 px a 436. Pero eso rompe el
 * otro extremo, porque para pasar una hoja hay que recorrer el 65 % de su coste
 * desde donde el libro reposa, o sea 284 px: un deslizamiento suave no movia
 * nada y habia que repetirlo cinco o seis veces.
 *
 * UN SOLO NUMERO NO PUEDE SERVIR PARA LAS DOS COSAS. Lo que rompe el empate es
 * un freno: que el navegador no deje que un gesto atraviese mas de un tope, por
 * fuerte que venga el dedo. Con freno, la hoja puede volver a costar poco.
 *
 * Se hace con `scroll-snap` NATIVO y no interceptando el scroll a mano, y eso es
 * deliberado: la inercia de iOS no se puede cancelar desde JS -en Safari el
 * scroll llega tarde y cualquier salvaguarda se dispara sola-, mientras que el
 * freno nativo forma parte del propio gesto.
 *
 * Aqui solo vive el INTERRUPTOR. Los topes los ponen los dos libros en su SCSS
 * con `scroll-snap-align`, y solo en el telefono; el `scroll-snap-type` tiene
 * que ir en el elemento que hace scroll, que es la raiz del documento, y por eso
 * no puede vivir dentro de un componente encapsulado.
 *
 * Esta puesto MIENTRAS EL LIBRO EXISTE, no solo mientras se ve. Antes se
 * encendia al asomar la pista, y eso dejaba un agujero que se reporto el
 * 2026-10-05 y se reprodujo: un deslizamiento fuerte que EMPIEZA mas arriba -en
 * el hero, en la pasarela- ya tiene decidido donde va a parar cuando la pista
 * asoma, y el freno llegaba tarde. Cruzaba los tres tramos de la pasarela sin
 * pararse y el libro pasaba cuatro hojas de un tiron. Un tope solo frena los
 * gestos que nacen con el ya puesto.
 *
 * Que este siempre no molesta fuera: `proximity` solo tira de la ventana cuando
 * se suelta cerca de un tope, y los unicos topes son los tramos de la pasarela y
 * las hojas del libro. En el hero y en la despedida no hay ninguno.
 */

/** La clase que enciende el freno. La regla vive en `styles.scss`. */
export const CLASE_FRENO = 'bol-frena';

/** Cuantos libros lo tienen puesto ahora mismo. */
let puestos = 0;

/**
 * Enciende el freno. Devuelve la funcion que lo suelta; quien la llama -el
 * libro que este montado- la mete en su lista de limpieza, asi que el freno
 * dura lo que dura Inicio y no llega a Menu ni a Contacto.
 */
export function frenaLaPagina(): () => void {
  const raiz = document.documentElement;
  puestos++;
  raiz.classList.add(CLASE_FRENO);
  let suelto = false;
  return () => {
    if (suelto) return;
    suelto = true;
    // Al girar el telefono el libro que entra se monta ANTES de que el que sale
    // se desmonte: sin la cuenta, el que sale se llevaria el freno del otro.
    if (--puestos === 0) raiz.classList.remove(CLASE_FRENO);
  };
}
