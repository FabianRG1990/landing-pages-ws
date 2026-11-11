import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { montarEscena, refrescarConFuentes } from './escena';
import {
  $$,
  contar,
  dibujarMiniatura,
  encender,
  escribir,
  esquinas,
  juntar,
  llenar,
  retirar,
} from './armado';

/** Una pieza que se arma: su línea de tiempo y cuándo queda «funcionando». */
interface Pieza {
  readonly tl: gsap.core.Timeline;
  readonly fin: number;
  readonly pieza: HTMLElement;
}

const CLARO = 'rgb(242 241 237 / 0.7)';

/**
 * Una tarjeta de Control, en cinco tiempos que se pisan: las esquinas se
 * juntan, la placa se llena, su pantalla se enciende, el control se monta
 * pieza a pieza (cada una desde su lado) y entra el texto. Al terminar, la
 * tarjeta queda «funcionando» (clase activo: el interruptor se enciende,
 * Aprobar late, las comprobaciones se marcan).
 */
function armarControl(t: HTMLElement, i: number, quitar: (() => void)[]): Pieza {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  const e = esquinas(t, 20, CLARO);
  quitar.push(e.quitar, () => t.classList.remove('activo'));
  juntar(tl, e, 0);
  llenar(tl, t, 0.3);
  const muestra = t.querySelector('.muestra');
  if (muestra) encender(tl, muestra, 0.5);
  const p = 0.82;
  if (i === 0) {
    tl.from($$('.interruptor__riel', t), { scaleX: 0, transformOrigin: '0% 50%', duration: 0.3 }, p)
      .from($$('.interruptor', t), { x: -22, opacity: 0, duration: 0.3 }, p)
      .from($$('.contador', t), { x: 22, opacity: 0, duration: 0.3 }, p + 0.12);
  } else if (i === 1) {
    const [si, cambio, no] = $$('.b', t);
    tl.from(si, { x: -28, opacity: 0, duration: 0.3, ease: 'back.out(1.8)' }, p)
      .from(cambio, { y: 18, opacity: 0, duration: 0.3, ease: 'back.out(1.8)' }, p + 0.08)
      .from(no, { x: 28, opacity: 0, duration: 0.3, ease: 'back.out(1.8)' }, p + 0.16);
  } else if (i === 2) {
    tl.from($$('.muestra--texto p:first-child', t), { y: 12, opacity: 0, duration: 0.3 }, p);
  } else {
    tl.from($$('.muestra--lista p', t), { x: -22, opacity: 0, duration: 0.26, stagger: 0.09 }, p);
  }
  retirar(tl, e, 0.8);
  escribir(tl, $$('.tarjeta__titulo, .tarjeta__texto', t), 1.0);
  return { tl, fin: tl.duration(), pieza: t };
}

/**
 * Una tarjeta de Proyectos: las esquinas se juntan, la placa se llena, la
 * pantalla se enciende y la app se dibuja pieza a pieza; luego el nombre,
 * el repositorio que se teclea, el texto y las cifras reales que cuentan.
 */
function armarProyecto(t: HTMLElement, i: number, quitar: (() => void)[]): Pieza {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  const e = esquinas(t, 20, CLARO);
  quitar.push(e.quitar);
  juntar(tl, e, 0);
  llenar(tl, t, 0.3);
  const vista = t.querySelector('.vista');
  if (vista) encender(tl, vista, 0.5);
  const svg = vista?.querySelector('svg');
  if (svg) dibujarMiniatura(tl, svg, i, 0.72);
  retirar(tl, e, 0.8);
  escribir(tl, $$('.proyecto__nombre', t), 1.05);
  const repo = t.querySelector<HTMLElement>('.proyecto__repo');
  if (repo)
    tl.fromTo(
      repo,
      { clipPath: 'inset(0% 100% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.45, ease: `steps(${repo.textContent?.length || 20})` },
      1.15,
    );
  escribir(tl, $$('.proyecto__texto', t), 1.3);
  const datos = $$('.proyecto__datos li', t);
  tl.from(datos, { scale: 0.7, opacity: 0, duration: 0.28, stagger: 0.09, ease: 'back.out(2)' }, 1.45);
  quitar.push(contar(tl, datos, 1.47));
  return { tl, fin: tl.duration(), pieza: t };
}

/**
 * Escritorio: la rejilla se queda quieta en pantalla (unos 135 vh de
 * scroll) mientras sus tarjetas se arman una tras otra, solapadas. El
 * armado empieza con la rejilla aún subiendo, para que la pausa sea corta.
 * Si la rejilla no cabe en la pantalla, no se detiene: se arma al pasar.
 */
function armarFijo(rejilla: HTMLElement | null, piezas: Pieza[], paso: number): void {
  if (!rejilla || !piezas.length) return;
  // Cada tarjeta queda «funcionando» al terminar su propio armado. Se mira
  // en la propia línea de tiempo y no en el scroll: con scrub la animación
  // llega después que el scroll y el último aviso del scroll se adelanta.
  const total = gsap.timeline({
    onUpdate: () => {
      const t = total.time();
      piezas.forEach((p, k) => p.pieza.classList.toggle('activo', t >= k * paso + p.fin - 0.05));
    },
  });
  piezas.forEach((p, k) => total.add(p.tl, k * paso));
  const cabe = rejilla.offsetHeight < innerHeight - 140;
  const fija = cabe
    ? ScrollTrigger.create({
        trigger: rejilla,
        start: 'center 55%',
        end: () => `+=${Math.round(innerHeight * 1.35)}`,
        pin: true,
      })
    : null;
  ScrollTrigger.create({
    trigger: rejilla,
    start: 'top 80%',
    end: fija ? () => fija.end : 'bottom 55%',
    animation: total,
    scrub: 0.5,
  });
}

/**
 * Teléfono: sin pausa (se sentiría como que la página se trabó). Cada pieza
 * hace su armado entero, cronometrado, al entrar a la vista; al salir del
 * todo se desarma, para poder verlo otra vez al volver.
 */
function alEntrar(p: Pieza): void {
  p.tl.pause(0);
  p.tl.eventCallback('onComplete', () => p.pieza.classList.add('activo'));
  const reiniciar = () => {
    p.tl.pause(0);
    p.pieza.classList.remove('activo');
  };
  ScrollTrigger.create({
    trigger: p.pieza,
    start: 'top 85%',
    onEnter: () => {
      if (p.tl.progress() === 0) p.tl.play(0);
    },
  });
  ScrollTrigger.create({
    trigger: p.pieza,
    start: 'top bottom',
    end: 'bottom top',
    onLeave: reiniciar,
    onLeaveBack: reiniciar,
    onEnterBack: () => p.tl.play(0),
  });
}

/**
 * La página se arma con el scroll, como Tunneller arma una app: cada
 * componente se construye por partes hasta quedar funcionando. Las
 * esquinas se juntan, la placa se llena, la pantalla se enciende, sus
 * piezas llegan cada una desde su lado y al final algo «funciona» (un
 * interruptor, un check, una cifra que llega a su valor). Ver armado.ts.
 *
 * Todo vive aquí para leer la historia de corrido. Solo se escribe en un
 * nodo de texto para contar cifras, y sin pelear con el cambio de idioma
 * (ver contar). Con movimiento reducido no se monta nada y la página está
 * armada.
 */
@Component({
  selector: 'app-coreografia',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class Coreografia {
  private readonly doc = inject(DOCUMENT);

  constructor() {
    const destruir = inject(DestroyRef);
    afterNextRender(() => {
      montarEscena(destruir, ({ escritorio }) => this.montar(escritorio));
      refrescarConFuentes();
    });
  }

  private montar(escritorio: boolean): () => void {
    const d = this.doc;
    const $ = <T extends Element = HTMLElement>(s: string, en: ParentNode = d) =>
      Array.from(en.querySelectorAll<T>(s)) as T[];
    const quitar: (() => void)[] = [];
    d.documentElement.classList.add('escena-viva');

    // ---- Hero: ya está armado; al bajar, el titular se aleja ----
    const heroTexto = d.querySelector('.hero__texto');
    if (heroTexto) {
      gsap.to(heroTexto, {
        yPercent: -18,
        scale: 0.96,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: '#inicio', start: 'top top', end: 'bottom 15%', scrub: true },
      });
      gsap.to('.hero__bajar', {
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: '#inicio', start: 'top top', end: '+=160', scrub: true },
      });
    }

    // Las cabeceras se arman en la zona donde se mira: empiezan cuando su
    // borde superior pasa el 85 % de la pantalla y terminan centradas.
    const ARMA = { start: 'top 85%', end: 'center 50%' };

    // ---- Cabeceras de sección: etiqueta, título tras su máscara, texto ----
    for (const cab of $('.seccion .cabeza-seccion, .pie__llamada')) {
      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        scrollTrigger: { trigger: cab, ...ARMA, scrub: 0.6 },
      });
      const [etq] = $('.etiqueta', cab);
      const [tit] = $('.titulo, .pie__titulo', cab);
      const resto = $('.lead, .pie__acciones', cab);
      if (etq) tl.from(etq, { x: -24, opacity: 0, duration: 0.3 }, 0);
      if (tit)
        tl.fromTo(
          tit,
          { clipPath: 'inset(0% 0% 100% 0%)', y: 48 },
          { clipPath: 'inset(0% 0% -12% 0%)', y: 0, duration: 0.6 },
          0.1,
        );
      if (resto.length) tl.from(resto, { y: 26, opacity: 0, duration: 0.45, stagger: 0.12 }, 0.4);
    }

    // ---- Cómo trabaja: la ventana se arma y cada etapa entra ----
    const fijo = d.querySelector<HTMLElement>('.recorrido__fijo');
    const marco = fijo?.querySelector<HTMLElement>('.marco-metal');
    if (escritorio && fijo && marco) {
      // Las esquinas se juntan, la pantalla se enciende, baja la barra y el
      // panel «Proceso» se llena paso a paso.
      const e = esquinas(fijo, 22, 'rgb(23 24 27 / 0.45)');
      quitar.push(e.quitar);
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: { trigger: '.recorrido', start: 'top 85%', end: 'top 15%', scrub: 0.5 },
      });
      juntar(tl, e, 0);
      encender(tl, marco, 0.4);
      tl.from($('.app-barra', marco), { y: -16, opacity: 0, duration: 0.25 }, 0.78)
        .from($('.app-proceso__t, .app-proceso li', marco), { x: 18, opacity: 0, duration: 0.22, stagger: 0.07 }, 0.86)
        .from($('.app-escenas', marco), { opacity: 0, y: 10, duration: 0.3 }, 0.95);
      retirar(tl, e, 1.25);
    }
    for (const etapa of $('.etapa')) {
      // La etapa es más alta que la pantalla en el teléfono: manda su texto,
      // que va arriba, y termina de entrar al llegar al tercio superior.
      gsap.from($('.etapa__num, .etapa__titulo, .etapa__texto', etapa), {
        x: -34,
        opacity: 0,
        duration: 0.5,
        stagger: 0.12,
        ease: 'power2.out',
        scrollTrigger: { trigger: etapa, start: 'top 85%', end: 'top 35%', scrub: 0.6 },
      });
      // En el teléfono cada etapa trae su escena, que se arma igual que la
      // ventana, en cuanto entra a la vista.
      const escena = !escritorio ? etapa.querySelector<HTMLElement>('.etapa__escena') : null;
      const app = escena?.querySelector('.app');
      if (escena && app) {
        const e = esquinas(escena, 18, 'rgb(23 24 27 / 0.45)');
        quitar.push(e.quitar);
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        juntar(tl, e, 0);
        tl.from(escena, { '--relleno': 0, duration: 0.3 }, 0.3);
        encender(tl, app, 0.42);
        retirar(tl, e, 0.95);
        alEntrar({ tl, fin: tl.duration(), pieza: escena });
      }
    }

    // ---- Control y Proyectos: cada tarjeta se arma por partes ----
    const control = $('#control .tarjeta').map((t, i) => armarControl(t, i, quitar));
    const proyectos = $('#proyectos .proyecto').map((t, i) => armarProyecto(t, i, quitar));
    if (escritorio) {
      armarFijo(d.querySelector<HTMLElement>('#control .rejilla'), control, 0.55);
      armarFijo(d.querySelector<HTMLElement>('#proyectos .proyectos'), proyectos, 0.45);
    } else {
      for (const a of [...control, ...proyectos]) alEntrar(a);
    }

    // ---- Pie: las letras de la marca se juntan y el cromo las recorre ----
    const marca = d.querySelector<HTMLElement>('.pie__gigante');
    if (marca) {
      gsap
        .timeline({
          defaults: { ease: 'none' },
          // Termina al 62 %: más arriba no llega en el teléfono, donde es lo último.
          scrollTrigger: { trigger: marca, start: 'top 95%', end: 'top 62%', scrub: 0.8 },
        })
        .fromTo(
          marca,
          { clipPath: 'inset(100% 0% 0% 0%)', letterSpacing: '0.14em', y: 40 },
          { clipPath: 'inset(-10% 0% -10% 0%)', letterSpacing: '-0.045em', y: 0, duration: 0.7 },
          0,
        )
        .fromTo(marca, { backgroundPosition: '120% 0, 0 0' }, { backgroundPosition: '-20% 0, 0 0', duration: 0.6 }, 0.4);
    }

    ScrollTrigger.refresh();
    return () => {
      d.documentElement.classList.remove('escena-viva');
      for (const q of quitar) q();
    };
  }
}
