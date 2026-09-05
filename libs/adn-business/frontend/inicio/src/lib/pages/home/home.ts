import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  viewChild,
  viewChildren,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { NavComponent } from '@adn-business-ui-shared/layout/nav/nav';
import { CountUpDirective } from '@adn-business-ui-shared/motion/count-up.directive';
import { RedHexComponent } from '@adn-business-ui-shared/webgl/red-hex';
import { DIAGNOSTICO, HERO, SITE } from '@adn-business-ui-shared/data/site';
import { SmoothScroll } from '@adn-business-ui-shared/smooth-scroll/smooth-scroll.service';
import { EjesComponent } from '../ejes/ejes';
import { MarcaComponent } from '../marca/marca';
import { ProgramasComponent } from '../programas/programas';
import { ContactoComponent } from '../contacto/contacto';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NavComponent, CountUpDirective, RedHexComponent, EjesComponent, MarcaComponent, ProgramasComponent, ContactoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  private readonly smooth = inject(SmoothScroll);
  private readonly destroyRef = inject(DestroyRef);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly site = SITE;
  protected readonly hero = HERO;
  protected readonly diag = DIAGNOSTICO;

  private readonly seccion = viewChild.required<ElementRef<HTMLElement>>('diagSeccion');
  private readonly eyebrow = viewChild.required<ElementRef<HTMLElement>>('diagEyebrow');
  private readonly titulo = viewChild.required<ElementRef<HTMLElement>>('diagTitulo');
  private readonly entrada = viewChild.required<ElementRef<HTMLElement>>('diagEntrada');
  private readonly fuente = viewChild.required<ElementRef<HTMLElement>>('diagFuente');
  private readonly tarjetas = viewChildren<ElementRef<HTMLElement>>('cifra');
  private readonly trazos = viewChildren<ElementRef<SVGSVGElement>>('cifraTrazo');
  private readonly conteos = viewChildren(CountUpDirective);

  constructor() {
    this.smooth.init();

    afterNextRender(() => {
      if (!this.esNavegador) return;
      // Con movimiento reducido no se apaga nada: las cifras conservan su
      // valor del template (la directiva se retira antes de ponerlas a
      // cero) y la seccion se lee tal cual.
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      this.medirTrazos();
      // Partir un titular en renglones antes de que la tipografia este
      // lista da renglones que no son los definitivos.
      void document.fonts.ready.then(() => this.montarEntrada());
    });
  }

  /**
   * Geometria del contorno dibujable.
   *
   * El <rect> no lleva viewBox, asi que su unidad de usuario es el pixel
   * y se le pueden dar medidas reales. Va medio pixel adentro porque un
   * trazo de 1px se pinta centrado en la linea: sin ese desplazamiento la
   * mitad del trazo cae fuera de la caja y se ve mas fino de un lado.
   */
  private medirTrazos(): void {
    const aplicar = () => {
      const tarjetas = this.tarjetas();
      this.trazos().forEach((ref, i) => {
        const svg = ref.nativeElement;
        const rect = svg.querySelector('rect');
        const tarjeta = tarjetas[i]?.nativeElement;
        if (!rect || !tarjeta) return;

        const caja = svg.getBoundingClientRect();
        const radio = this.radioDe(tarjeta);
        rect.setAttribute('x', '0.5');
        rect.setAttribute('y', '0.5');
        rect.setAttribute('width', String(Math.max(0, caja.width - 1)));
        rect.setAttribute('height', String(Math.max(0, caja.height - 1)));
        rect.setAttribute('rx', String(Math.max(0, radio - 0.5)));
      });
    };

    aplicar();
    const ro = new ResizeObserver(aplicar);
    for (const ref of this.tarjetas()) ro.observe(ref.nativeElement);
    this.destroyRef.onDestroy(() => ro.disconnect());
  }

  /** La secuencia de entrada del diagnostico. */
  private montarEntrada(): void {
    const seccion = this.seccion().nativeElement;

    try {
      gsap.registerPlugin(ScrollTrigger, SplitText);
      seccion.classList.add('diag--anima');

      const partido = SplitText.create(this.titulo().nativeElement, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'diag__linea',
      });

      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          seccion.classList.remove('diag--anima');
          partido.revert();
          // El contorno queda solido. Sin esto, un cambio de tamano
          // recalcularia el perimetro y dejaria un hueco justo donde
          // antes acababa el guion.
          for (const ref of this.trazos()) {
            const r = ref.nativeElement.querySelector('rect');
            if (!r) continue;
            r.style.strokeDasharray = '';
            r.style.strokeDashoffset = '';
          }
          // Sin soltar --trazo, el valor en linea le ganaria a la regla
          // de :hover y la tarjeta dejaria de responder al raton.
          for (const ref of this.tarjetas()) {
            ref.nativeElement.style.removeProperty('--trazo');
            ref.nativeElement.style.removeProperty('--filo');
          }
        },
      });

      // 1. el filete se extiende y trae la etiqueta: marca donde empieza
      //    la lectura antes de que haya nada que leer
      tl.to(this.eyebrow().nativeElement, { '--regla': 1, opacity: 1, duration: 0.55 }, 0);

      // 2. el titular, renglon a renglon desde debajo de su mascara
      tl.set(this.titulo().nativeElement, { opacity: 1 }, 0.18);
      tl.from(partido.lines, { yPercent: 115, duration: 0.9, stagger: 0.09 }, 0.18);

      // 3. la entrada, ya con el titular en pie
      tl.to(this.entrada().nativeElement, { opacity: 1, duration: 0.7 }, 0.52);
      tl.from(this.entrada().nativeElement, { y: 16, duration: 0.7 }, 0.52);

      // 4. las tarjetas, en tres tiempos que no se pisan: la linea nace
      //    en el centro del canto y da la vuelta, el numero corre
      //    mientras tanto, y solo cuando el contorno ha cerrado se
      //    enciende el filo de luz y el trazo se apaga a su reposo.
      this.tarjetas().forEach((ref, i) => {
        const t = 0.46 + i * 0.24;
        const tarjeta = ref.nativeElement;
        tl.to(tarjeta, { opacity: 1, duration: 0.6 }, t);
        tl.from(tarjeta, { y: 22, duration: 0.8 }, t);
        this.dibujarTrazo(tl, i, t + 0.12);
        tl.call(() => this.conteos()[i]?.arrancar(), undefined, t + 0.5);
        tl.to(tarjeta, { '--filo': 1, duration: 0.5, ease: 'power2.out' }, t + 1.05);
        tl.to(tarjeta, { '--trazo': 0.24, duration: 0.7, ease: 'power2.out' }, t + 1.15);
      });

      // 5. la fuente cierra, cuando ya no compite con nada
      tl.to(this.fuente().nativeElement, { opacity: 1, duration: 0.6 }, 1.5);

      const st = ScrollTrigger.create({
        trigger: seccion,
        start: 'top 72%',
        once: true,
        onEnter: () => tl.play(),
      });

      this.destroyRef.onDestroy(() => {
        st.kill();
        tl.kill();
      });
    } catch {
      // Antes rota la coreografia que la seccion: si algo falla, todo
      // vuelve a verse y los numeros cuentan igual.
      this.revelarTodo();
    }
  }

  /**
   * El contorno se dibuja desde el centro del canto superior hacia los
   * dos lados a la vez.
   *
   * El trazo de un <rect> arranca justo despues de la esquina superior
   * izquierda y gira en sentido horario, asi que del arranque al centro
   * de arriba hay media anchura menos el radio. Ahi esta el filo de luz:
   * el guion crece centrado en ese punto y las dos puntas bajan a la vez.
   */
  private dibujarTrazo(tl: gsap.core.Timeline, i: number, t: number): void {
    const svg = this.trazos()[i]?.nativeElement;
    const tarjeta = this.tarjetas()[i]?.nativeElement;
    const rect = svg?.querySelector('rect');
    if (!svg || !tarjeta || !rect) return;

    const caja = svg.getBoundingClientRect();
    const radio = this.radioDe(tarjeta);
    const largo = this.perimetro(rect, caja.width - 1, caja.height - 1, Math.max(0, radio - 0.5));
    const centro = caja.width / 2 - radio;

    const estado = { visto: 0 };
    rect.style.strokeDasharray = `0 ${largo}`;

    tl.to(
      estado,
      {
        visto: largo,
        duration: 1.15,
        ease: 'power2.inOut',
        onUpdate: () => {
          rect.style.strokeDasharray = `${estado.visto} ${largo}`;
          rect.style.strokeDashoffset = String(estado.visto / 2 - centro);
        },
      },
      t,
    );
  }

  private radioDe(el: HTMLElement): number {
    return Math.max(0, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0);
  }

  /** getTotalLength es lo exacto; la formula queda de red por si algun
      navegador no la implementa sobre <rect>. */
  private perimetro(rect: SVGRectElement, w: number, h: number, r: number): number {
    const medido = typeof rect.getTotalLength === 'function' ? rect.getTotalLength() : 0;
    if (medido > 0) return medido;
    return 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;
  }

  private revelarTodo(): void {
    this.seccion().nativeElement.classList.remove('diag--anima');
    for (const c of this.conteos()) c.arrancar();
  }
}
