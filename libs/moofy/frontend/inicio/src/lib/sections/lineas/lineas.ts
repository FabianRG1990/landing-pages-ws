import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import type { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LINEAS, enlaceWhatsapp, mensajeMuestras, foto800 } from '@moofy-ui-shared/data/site';
import { CapituloComponent } from '@moofy-ui-shared/tipografia/capitulo';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';
import { IconoComponent } from '@moofy-ui-shared/marca/icono';
import { montarEscena } from '@moofy-ui-shared/motion/escena';
import { RELEVO } from '@moofy-ui-shared/motion/relevo';
import { InclinarDirective } from '@moofy-ui-shared/motion/inclinar.directive';

type Ref = ElementRef<HTMLElement>;

/**
 * Capítulo 01: el catálogo. Las seis líneas, en tarjetas al estilo de
 * claudioandrade.solutions. Cada tarjeta tiene una acción real: pedir
 * muestras de esa línea por WhatsApp, con el mensaje ya redactado.
 *
 * Escritorio: la sección se fija con la cabecera arriba y las tarjetas,
 * que llenan el alto de la pantalla, pasan en horizontal 1:1 con el
 * scroll, con la cuenta «01 / 06» y una barra de rojo a azul abajo. Con
 * Tab, la página va a la tarjeta que recibe el foco: el navegador no
 * puede desplazar un carril movido con transform.
 *
 * Al llegar a la última tarjeta la sección sigue fija un tramo más
 * (RELEVO) y se desvanece: encima se abre la cobertura (cobertura.ts).
 *
 * Móvil: la fila con scroll-snap de siempre. Sin movimiento: la rejilla.
 */
@Component({
  selector: 'app-lineas',
  imports: [CapituloComponent, RenglonesComponent, RevelarDirective, IconoComponent, InclinarDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lineas.html',
  styleUrl: './lineas.scss',
})
export class LineasComponent {
  protected readonly l = LINEAS;
  protected readonly foto800 = foto800;
  protected readonly total = String(LINEAS.items.length).padStart(2, '0');

  private readonly seccion = viewChild.required<Ref>('seccion');
  private readonly carril = viewChild.required<Ref>('carril');
  private readonly actual = viewChild.required<Ref>('actual');
  private readonly barra = viewChild.required<Ref>('barra');

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador) return;
      montarEscena(destroyRef, ({ escritorio }) => (escritorio ? this.horizontal() : undefined));
    });
  }

  protected muestras(linea: string): string {
    return enlaceWhatsapp(mensajeMuestras(linea));
  }

  private horizontal(): () => void {
    const seccion = this.seccion().nativeElement;
    const carril = this.carril().nativeElement;
    const actual = this.actual().nativeElement;
    const tarjetas = gsap.utils.toArray<HTMLElement>('.linea', carril);

    seccion.classList.add('lineas--horizontal');
    const recorrido = () => Math.max(0, carril.scrollWidth - window.innerWidth);
    // El pin dura el recorrido del carril más la cola del relevo. `carril`
    // es la fracción del pin en que el carril se mueve; el resto es cola.
    const cola = () => window.innerHeight * RELEVO;
    const parte = () => Math.max(0.001, recorrido() / (recorrido() + cola()));
    const enCarril = (p: number) => Math.min(1, p / parte());
    const enCola = (p: number) => Math.max(0, (p - parte()) / (1 - parte()));

    // La cuenta sigue a la última tarjeta cuyo borde izquierdo ya cruzó
    // una marca que avanza con el recorrido (del 20 % al 85 % del
    // ancho): con una marca fija en la mitad, la última tarjeta termina
    // a su derecha y la cuenta no llegaba a 06; y empezando más allá del
    // 20 %, en pantallas estrechas la segunda tarjeta ya la había cruzado
    // y la cuenta arrancaba en 02. Solo se escribe si cambia.
    let mostrado = '';
    const contar = (st?: ScrollTrigger) => {
      const marca = window.innerWidth * (0.2 + 0.65 * enCarril(st?.progress ?? 0));
      let i = 0;
      tarjetas.forEach((t, k) => {
        if (t.getBoundingClientRect().left < marca) i = k;
      });
      const texto = String(i + 1).padStart(2, '0');
      if (texto !== mostrado) actual.textContent = mostrado = texto;
    };

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: seccion,
        start: 'top top',
        end: () => '+=' + (recorrido() + cola()),
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: contar,
        onRefresh: contar,
      },
    });
    // Una sola unidad de timeline para todo el pin: las curvas reparten
    // el tramo del carril y el de la cola, y lo hacen con las medidas del
    // momento, así que siguen valiendo tras un cambio de tamaño.
    tl.to(carril, { x: () => -recorrido(), ease: enCarril }, 0)
      .fromTo(this.barra().nativeElement, { scaleX: 0 }, { scaleX: 1, ease: enCarril }, 0)
      // La cola: el catálogo se apaga y se aleja un poco mientras la
      // cobertura se abre encima.
      .to(seccion.children, { opacity: 0, ease: enCola }, 0)
      .to(seccion, { scale: 0.96, ease: enCola }, 0);

    // Tab dentro del carril: se lleva el scroll al punto en que la
    // tarjeta enfocada queda centrada.
    const alEnfocar = (e: FocusEvent) => {
      const st = tl.scrollTrigger;
      const tarjeta = (e.target as HTMLElement).closest<HTMLElement>('.linea');
      if (!st || !tarjeta) return;
      const x = tarjeta.offsetLeft + tarjeta.offsetWidth / 2 - window.innerWidth / 2;
      const y = st.start + gsap.utils.clamp(0, recorrido(), x);
      window.scrollTo({ top: y, behavior: 'instant' });
    };
    carril.addEventListener('focusin', alEnfocar);

    return () => {
      carril.removeEventListener('focusin', alEnfocar);
      seccion.classList.remove('lineas--horizontal');
    };
  }
}
