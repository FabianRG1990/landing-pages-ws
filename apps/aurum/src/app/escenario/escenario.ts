import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { MotorMetal, Uniformes } from '../metal/motor';
import {
  acercar,
  avanceDeEntrada,
  clamp,
  estadoEn,
  focoDeBloque,
  posicionDeLectura,
} from '../metal/escena';

type Rect4 = readonly [number, number, number, number];
const SIN_CALMA: Rect4 = [0, 0, 0, 0];

/**
 * El director de la página. Un único bucle de requestAnimationFrame:
 *
 * - mide las secciones y deriva de ahí la luz del metal (continua, sin
 *   escalones) y el tema de la cabecera;
 * - escribe --foco en cada [data-foco] y --avance en cada [data-avance];
 * - marca .entra en cada sección al cruzar el 78 % de la pantalla, y en
 *   ese momento frena y apaga el metal mientras el texto entra;
 * - dibuja el metal.
 *
 * Con movimiento reducido o en pausa el metal no avanza en el tiempo, pero
 * se vuelve a dibujar al hacer scroll porque los bordes de sección se mueven.
 */
@Injectable({ providedIn: 'root' })
export class Escenario {
  private readonly doc = inject(DOCUMENT);

  /** Índice de la sección que se está leyendo (0..4). */
  readonly activa = signal(0);
  /** Tema bajo la cabecera. */
  readonly temaCabecera = signal<'oscuro' | 'claro'>('oscuro');
  readonly pausado = signal(false);
  /** La página ya no está en el tope: la cabecera gana su fondo. */
  readonly desplazado = signal(false);
  readonly conMetal = signal(false);

  private motor: MotorMetal | null = null;
  private lienzo: HTMLCanvasElement | null = null;
  private secciones: HTMLElement[] = [];
  private focos: HTMLElement[] = [];
  private calmas: HTMLElement[] = [];
  private avances: HTMLElement[] = [];
  private maxAvance = new WeakMap<HTMLElement, number>();
  private observador: IntersectionObserver | null = null;

  private reducido = false;
  private visible = true;
  private marco = 0;
  private ultimo = 0;
  private tiempo = 0;
  private freno = 0.35;
  private frenoObjetivo = 0.35;
  private frenoHasta = 0;
  private calmaPeso: [number, number, number] = [0, 0, 0];
  private inclinacion: [number, number] = [0, 0];
  private inclinacionObjetivo: [number, number] = [0, 0];
  private ultimoCalma: [Rect4, Rect4, Rect4] = [
    SIN_CALMA,
    SIN_CALMA,
    SIN_CALMA,
  ];
  private limpiezas: (() => void)[] = [];

  iniciar(lienzo: HTMLCanvasElement): void {
    const win = this.doc.defaultView;
    if (!win) return;
    this.lienzo = lienzo;
    const html = this.doc.documentElement;
    html.classList.add('movimiento-listo');

    const consulta = win.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducido = consulta.matches;
    const alCambiarMovimiento = () => {
      this.reducido = consulta.matches;
      this.programar();
    };
    consulta.addEventListener('change', alCambiarMovimiento);
    this.limpiezas.push(() =>
      consulta.removeEventListener('change', alCambiarMovimiento),
    );

    this.recolectar();
    this.observarEntradas();

    const tactil = win.matchMedia('(pointer: coarse)').matches;
    const motor = new MotorMetal(lienzo, tactil);
    if (motor.iniciar()) {
      this.motor = motor;
      this.conMetal.set(true);
      // Un fotograma dibujado antes de mostrarlo: nunca se ve un lienzo negro.
      this.paso(win.performance.now());
      win.requestAnimationFrame(() => html.classList.add('metal-listo'));
    }

    const alScroll = () => this.programar();
    const alRedimensionar = () => {
      this.motor?.ajustar();
      this.programar();
    };
    const alVisibilidad = () => {
      this.visible = this.doc.visibilityState === 'visible';
      this.ultimo = 0;
      this.programar();
    };
    const alPuntero = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      this.inclinacionObjetivo = [
        (e.clientX / win.innerWidth) * 2 - 1,
        (e.clientY / win.innerHeight) * 2 - 1,
      ];
    };
    win.addEventListener('scroll', alScroll, { passive: true });
    win.addEventListener('resize', alRedimensionar, { passive: true });
    win.visualViewport?.addEventListener('resize', alRedimensionar, {
      passive: true,
    });
    win.addEventListener('pointermove', alPuntero, { passive: true });
    this.doc.addEventListener('visibilitychange', alVisibilidad);
    this.limpiezas.push(() => {
      win.removeEventListener('scroll', alScroll);
      win.removeEventListener('resize', alRedimensionar);
      win.visualViewport?.removeEventListener('resize', alRedimensionar);
      win.removeEventListener('pointermove', alPuntero);
      this.doc.removeEventListener('visibilitychange', alVisibilidad);
    });

    // El texto del hero entra al cargar: el metal arranca frenado y crece.
    this.frenar(1400);
    this.programar();
  }

  /** Vuelve a buscar los elementos marcados (tras cambiar de idioma). */
  recolectar(): void {
    const q = <T extends HTMLElement>(s: string) =>
      Array.from(this.doc.querySelectorAll<T>(s));
    this.secciones = q('[data-seccion]');
    this.focos = q('[data-foco]');
    this.calmas = q('[data-calma]');
    this.avances = q('[data-avance]');
    this.programar();
  }

  alternarPausa(): void {
    this.pausado.update((p) => !p);
    this.ultimo = 0;
    this.programar();
  }

  detener(): void {
    const win = this.doc.defaultView;
    if (win && this.marco) win.cancelAnimationFrame(this.marco);
    this.marco = 0;
    this.observador?.disconnect();
    this.limpiezas.forEach((f) => f());
    this.limpiezas = [];
    this.motor?.destruir();
    this.motor = null;
  }

  private get animando(): boolean {
    return !!this.motor && !this.reducido && !this.pausado() && this.visible;
  }

  private programar(): void {
    const win = this.doc.defaultView;
    if (!win || this.marco) return;
    this.marco = win.requestAnimationFrame((t) => {
      this.marco = 0;
      this.paso(t);
      if (this.animando || this.necesitaOtro) this.programar();
    });
  }

  private necesitaOtro = false;

  private frenar(ms: number): void {
    const ahora = this.doc.defaultView?.performance.now() ?? 0;
    this.frenoObjetivo = 0.3;
    this.frenoHasta = Math.max(this.frenoHasta, ahora + ms);
    this.programar();
  }

  private observarEntradas(): void {
    const win = this.doc.defaultView;
    if (!win || !('IntersectionObserver' in win)) {
      this.secciones.forEach((s) => s.classList.add('entra'));
      return;
    }
    this.observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('entra');
          this.observador?.unobserve(e.target);
          if (e.target.getAttribute('data-seccion') !== 'hero')
            this.frenar(1100);
        }
      },
      { rootMargin: '0px 0px -22% 0px', threshold: 0 },
    );
    this.secciones.forEach((s) => this.observador?.observe(s));
  }

  private paso(ahora: number): void {
    const win = this.doc.defaultView;
    if (!win) return;
    const dt = this.ultimo ? Math.min(ahora - this.ultimo, 100) : 16.7;
    this.ultimo = ahora;
    this.necesitaOtro = false;

    const alto = win.innerHeight;

    // ---- Lecturas (todas antes de cualquier escritura) ----
    const rectSecciones = this.secciones.map((s) => s.getBoundingClientRect());
    const rectFocos = this.focos.map((f) => f.getBoundingClientRect());
    const rectAvances = this.avances.map((a) => a.getBoundingClientRect());
    const rectCalmas = this.calmas.map((c) => c.getBoundingClientRect());

    // ---- Foco y avance ----
    rectFocos.forEach((r, i) => {
      const f = focoDeBloque(r.top, r.bottom, alto);
      this.focos[i].style.setProperty('--foco', f.toFixed(3));
    });
    rectAvances.forEach((r, i) => {
      const el = this.avances[i];
      // El avance solo crece: lo que ya se encendió no se apaga al volver.
      const v = Math.max(
        this.maxAvance.get(el) ?? 0,
        avanceDeEntrada(r.top, alto),
      );
      this.maxAvance.set(el, v);
      el.style.setProperty('--avance', v.toFixed(3));
    });

    const desplazado = win.scrollY > 8;
    if (desplazado !== this.desplazado()) this.desplazado.set(desplazado);

    // ---- Sección activa y tema de la cabecera ----
    const posicion = posicionDeLectura(rectSecciones, alto);
    const activa = Math.round(posicion);
    if (activa !== this.activa()) this.activa.set(activa);
    const bajoCabecera = rectSecciones.findIndex(
      (r) => r.top <= 36 && r.bottom > 36,
    );
    if (bajoCabecera >= 0) {
      const tema =
        this.secciones[bajoCabecera].getAttribute('data-tema') === 'claro'
          ? 'claro'
          : 'oscuro';
      if (tema !== this.temaCabecera()) this.temaCabecera.set(tema);
    }

    if (!this.motor || !this.lienzo) return;
    if (this.motor.perdido) {
      this.doc.documentElement.classList.remove('metal-listo');
      this.motor = null;
      this.conMetal.set(false);
      return;
    }

    // ---- Freno mientras entra el texto ----
    if (ahora > this.frenoHasta) this.frenoObjetivo = 1;
    this.freno = acercar(
      this.freno,
      this.frenoObjetivo,
      dt,
      this.frenoObjetivo < 1 ? 180 : 520,
    );
    if (Math.abs(this.freno - this.frenoObjetivo) > 0.002)
      this.necesitaOtro = true;

    const estado = estadoEn(posicion);
    if (this.animando) {
      this.tiempo +=
        (dt / 1000) * estado.velocidad * (0.25 + 0.75 * this.freno);
      this.motor.registrarFotograma(dt);
    }

    // ---- Inclinación por el cursor (muy leve) ----
    for (const i of [0, 1] as const) {
      this.inclinacion[i] = acercar(
        this.inclinacion[i],
        this.reducido ? 0 : this.inclinacionObjetivo[i],
        dt,
        420,
      );
    }

    // ---- Bordes y calma, en fracción del lienzo ----
    const altoLienzo = this.lienzo.clientHeight || alto;
    const anchoLienzo = this.lienzo.clientWidth || win.innerWidth;
    const borde = (i: number) =>
      rectSecciones[i] ? rectSecciones[i].top / altoLienzo : 9;
    const bordes = [borde(1), borde(2), borde(3), borde(4)] as const;

    const visibles = rectCalmas
      .map((r) => ({
        r,
        v: clamp(
          (Math.min(r.bottom, alto) - Math.max(r.top, 0)) /
            Math.min(r.height || 1, alto),
        ),
      }))
      .filter((c) => c.v > 0)
      .sort((a, b) => b.v - a.v)
      .slice(0, 3);
    const aRect = (r: DOMRect): Rect4 => [
      r.left / anchoLienzo,
      r.top / altoLienzo,
      r.right / anchoLienzo,
      r.bottom / altoLienzo,
    ];
    for (const i of [0, 1, 2] as const) {
      const c = visibles[i];
      if (c) this.ultimoCalma[i] = aRect(c.r);
      const objetivo = c ? c.v : 0;
      this.calmaPeso[i] = acercar(this.calmaPeso[i], objetivo, dt, 90);
      if (Math.abs(this.calmaPeso[i] - objetivo) > 0.002)
        this.necesitaOtro = true;
    }

    // Mientras el texto entra el metal se apaga un poco detrás de todo.
    const energia = estado.energia * (0.62 + 0.38 * this.freno);

    const u: Uniformes = {
      tiempo: this.tiempo + 11.3,
      bordes,
      fundido: 0.13,
      calmaA: this.ultimoCalma[0],
      calmaB: this.ultimoCalma[1],
      calmaC: this.ultimoCalma[2],
      pesoCalma: this.calmaPeso,
      angulo: estado.angulo,
      acento: estado.acento,
      energia,
      cobertura: estado.cobertura,
      flujo: (win.scrollY / alto) * 0.22,
      inclinacion: this.inclinacion,
    };
    this.motor.dibujar(u);
  }
}
