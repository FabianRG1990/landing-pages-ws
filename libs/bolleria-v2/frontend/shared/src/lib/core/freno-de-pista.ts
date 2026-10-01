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
 * Y se enciende SOLO mientras el libro se ve. Dejarlo puesto en todo el
 * documento es lo que hace que estas cosas se sientan rotas: con topes activos y
 * la ventana lejos de ellos, el navegador puede tirar de vuelta hacia el libro
 * desde otra seccion. Fuera del libro no hay freno y el sitio se desliza como
 * siempre.
 */

/** La clase que enciende el freno. La regla vive en `styles.scss`. */
export const CLASE_FRENO = 'bol-frena';

/**
 * Enciende el freno mientras `pista` toque la pantalla. Devuelve la funcion que
 * lo suelta todo; quien la llama la mete en su lista de limpieza.
 */
export function frenaMientrasSeVe(pista: HTMLElement): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => undefined;
  const raiz = document.documentElement;
  const ojo = new IntersectionObserver(
    (entradas) => {
      const dentro = entradas.some((e) => e.isIntersecting);
      raiz.classList.toggle(CLASE_FRENO, dentro);
    },
    // Sin margen. Llego a llevar un 10 % de holgura por los dos lados para que
    // el freno estuviera puesto "por si acaso", y era justo lo contrario de lo
    // que hace falta: medido en un 393x873, con la ventana arriba del todo la
    // pista empieza en y=909 -o sea fuera de la pantalla- y el margen la daba
    // por visible igual, asi que el freno quedaba puesto mientras se recorria el
    // hero, que tiene su propio controlador de paradas y no debe compartir el
    // scroll con nada.
    //
    // No hace falta holgura: el primer tope esta en el borde de la pista, y para
    // cuando la ventana llega ahi la pista lleva una pantalla entera tocandola.
    { threshold: 0 },
  );
  ojo.observe(pista);
  return () => {
    ojo.disconnect();
    raiz.classList.remove(CLASE_FRENO);
  };
}
