import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AboutBookComponent } from './about-book.component';
import { AboutBook2026Component } from './about-book-2026.component';
import { DespedidaComponent } from './despedida.component';
import { FaseVelo, VeloGiroComponent } from './velo-giro.component';

/**
 * Que pantallas reciben el libro NUEVO.
 *
 * Son dos condiciones unidas, porque el encargo tenia dos frases: "escritorio,
 * todos los tamanos" y "cualquier pantalla horizontal". Un monitor con la
 * ventana mas alta que ancha cumple la primera y no la segunda, asi que se
 * aplican las dos y basta con una.
 *
 * Lo que queda fuera es lo importante: una pantalla ESTRECHA y EN VERTICAL -o
 * sea, el telefono de pie- sigue con el libro de siempre, sin que se le toque
 * ni un pixel. Esa es la condicion no negociable del encargo.
 */
const LIBRO_NUEVO = '(min-width: 901px), (orientation: landscape)';

/** Lo que tarda el papel en irse. Cubrir no tarda nada: ver el velo. */
const SALIDA = 180;
/**
 * Lo menos que el papel se queda puesto.
 *
 * Con todo en cache el relevo se resuelve en menos de 120 ms, y ahi el velo deja
 * de ser una transicion: es un parpadeo del que solo se percibe que "algo paso",
 * sin que el isotipo llegue siquiera a pintarse. Trescientos veinte milisegundos
 * es lo que cuesta que se lea como un gesto a proposito, y sigue siendo la mitad
 * de lo que dura un parpadeo humano comodo.
 */
const MINIMO = 320;
/**
 * Tope de espera. Si el libro que entra tarda mas que esto -red lenta, cuadros
 * sin cachear-, se destapa igual: un velo que no se va da mas miedo que un
 * libro a medio cargar, que al menos se ve trabajar.
 */
const TOPE = 900;

@Component({
  selector: 'bol-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AboutBookComponent, AboutBook2026Component, DespedidaComponent, VeloGiroComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * En servidor se sirve el libro ANTERIOR. Es la eleccion conservadora: no hay
   * forma de saber la orientacion antes de pintar, y equivocarse hacia el libro
   * nuevo dejaria al telefono de pie descargando 292 cuadros que no va a usar.
   */
  readonly libroNuevo = signal(false);

  /** Que pinta el velo. Ver `velo-giro.component.ts`. */
  readonly fase = signal<FaseVelo>('fuera');

  /** Hay un relevo en marcha y se esta esperando al libro que entra. */
  private readonly esperando = signal(false);

  private readonly viejo = viewChild(AboutBookComponent);
  private readonly nuevo = viewChild(AboutBook2026Component);

  /**
   * Si el libro que toca ya se puede ensenar. Cada uno lo llama a su manera
   * -`listo` el de 2026, `ready` el de siempre- y los dos significan lo mismo:
   * medido, con sus cuadros minimos cargados y con el primero ya pintado.
   */
  private readonly libroListo = computed(() =>
    this.libroNuevo() ? (this.nuevo()?.listo() ?? false) : (this.viejo()?.ready() ?? false),
  );

  private relojes: ReturnType<typeof setTimeout>[] = [];
  /** Cuando se puso el papel, para no quitarlo antes de que se vea. */
  private cubierto = 0;

  constructor() {
    if (!this.isBrowser) return;

    const mq = window.matchMedia(LIBRO_NUEVO);
    this.libroNuevo.set(mq.matches);
    mq.addEventListener('change', (ev) => {
      if (ev.matches === this.libroNuevo()) return;
      this.relevo(ev.matches);
    });

    // El velo se quita cuando el libro dice que esta listo, no cuando se cumple
    // un plazo: el plazo era lo que dejaba ver el montaje.
    effect(() => {
      if (this.esperando() && this.libroListo()) this.destapa();
    });

    inject(DestroyRef).onDestroy(() => this.paraRelojes());
  }

  /**
   * El relevo de un libro al otro, en orden.
   *
   * El orden ES el arreglo. Antes se cambiaba de libro a la vista y se
   * recolocaba el scroll 60 ms despues, y esos 60 ms no alcanzan ni para que el
   * componente nuevo se monte: se veia el libro crecer, encoger, abrirse y
   * cerrarse. Ahora:
   *
   *   1. el papel cubre la pantalla, de golpe y en el mismo fotograma;
   *   2. ya tapado, el scroll se suelta ANTES del libro -de golpe- y se cambia
   *      de libro, asi que el que entra nace en su tapa y no tiene nada que
   *      recorrer;
   *   3. se espera a que diga que esta listo;
   *   4. se destapa.
   *
   * Si el telefono gira dos veces seguidas, `paraRelojes` deshace el relevo a
   * medias y empieza el nuevo: no se acumulan velos ni esperas.
   */
  private relevo(nuevo: boolean): void {
    this.paraRelojes();
    this.cubierto = Date.now();
    this.fase.set('puesto');
    // Dos fotogramas, no un plazo: el primero pinta el velo y el segundo ya
    // ocurre con la pantalla tapada. Esperar por milisegundos seria adivinar, y
    // adivinar de menos deja ver justo lo que se quiere esconder.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this.antesDelLibro();
        this.libroNuevo.set(nuevo);
        this.esperando.set(true);
        this.espera(() => this.destapa(), TOPE);
      }),
    );
  }

  private destapa(): void {
    if (!this.esperando()) return;
    // El libro puede estar listo antes de que el velo se haya visto. En ese caso
    // no se destapa todavia: se completa el minimo y se destapa despues.
    const puesto = Date.now() - this.cubierto;
    if (puesto < MINIMO) {
      this.paraRelojes();
      this.espera(() => this.destapa(), MINIMO - puesto);
      return;
    }
    this.esperando.set(false);
    this.paraRelojes();
    // Otra vez, ya con la geometria del libro que entra: su pista no mide lo
    // mismo que la del otro, asi que el primer ajuste era solo aproximado.
    this.alPrincipio();
    this.fase.set('saliendo');
    this.espera(() => this.fase.set('fuera'), SALIDA + 40);
  }

  /**
   * Justo ANTES de que empiece el libro, y esto es lo que evita que el que entra
   * se ponga a animar solo.
   *
   * El detalle que costo encontrar: las dos pistas no empiezan en el mismo sitio
   * -medido, 120 px de diferencia en un 873x393-, asi que dejar el scroll en el
   * arranque de la pista VIEJA deja al libro nuevo 120 px DENTRO de la suya. Eso
   * son 0,63 de pagina, que redondea a 1: el libro nacia pidiendo la pagina uno,
   * la abria, y al corregir el scroll un instante despues tenia que volver a
   * cerrarla. Ese era el "se abre y se cierra y no sabe que hacer" que se veia
   * DESPUES de quitarse el velo.
   *
   * La cura no es tocar el libro: es soltarlo en un sitio donde cualquiera de
   * los dos lea cero, y eso hay que hacerlo con la geometria VIEJA, que es la
   * unica que existe todavia. Ocho pixeles por encima de la seccion no bastaban:
   * medido, la seccion del libro nuevo empieza 112 px MAS ARRIBA que la del
   * viejo, asi que ese margen se lo comia entero y el libro volvia a nacer
   * pidiendo la pagina uno. La holgura es ahora una pantalla completa, que le
   * saca tres veces de ventaja a la mayor diferencia medida.
   *
   * No importa que sea mucho: debajo del velo no lo ve nadie, y `alPrincipio`
   * deja el scroll en su sitio exacto un instante despues. Lo unico que importa
   * es que el libro que entra abra los ojos en la tapa.
   */
  private antesDelLibro(): void {
    const seccion = document.querySelector('.bol-libro, .bol-book');
    if (!seccion) return;
    const arriba = window.scrollY + seccion.getBoundingClientRect().top - window.innerHeight;
    this.saltaA(Math.max(0, arriba));
  }

  private alPrincipio(): void {
    const pista = document.querySelector('.bol-libro__pista, .bol-book__track');
    if (!pista) return;
    this.saltaA(window.scrollY + pista.getBoundingClientRect().top);
  }

  private saltaA(top: number): void {
    // `instant` y NO `auto`. `auto` significa "obedece al CSS", y el sitio
    // declara `html { scroll-behavior: smooth }`: con `auto`, este salto se
    // convertia en un scroll ANIMADO de cientos de pixeles, y como el scroll es
    // el reloj del libro, el libro recorria en directo toda la animacion que
    // hubiera por el camino. Ese era el destrozo del giro.
    window.scrollTo({ top, behavior: 'instant' });
  }

  private espera(fn: () => void, ms: number): void {
    this.relojes.push(setTimeout(fn, ms));
  }

  private paraRelojes(): void {
    this.relojes.forEach(clearTimeout);
    this.relojes = [];
  }
}
