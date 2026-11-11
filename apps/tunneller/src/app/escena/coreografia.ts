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

const SVG = 'http://www.w3.org/2000/svg';

/**
 * El contorno de una pieza, dibujado en un SVG encima de ella. Se mide en
 * píxeles (y se vuelve a medir si la pieza cambia de tamaño) para que el
 * trazo tenga siempre 1 px y la esquina el mismo radio que la pieza.
 */
function trazo(pieza: HTMLElement, radio: number, color: string) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'trazo');
  svg.setAttribute('aria-hidden', 'true');
  const rect = document.createElementNS(SVG, 'rect');
  rect.setAttribute('pathLength', '1');
  rect.setAttribute('rx', String(radio));
  rect.setAttribute('fill', 'none');
  rect.setAttribute('stroke', color);
  rect.setAttribute('stroke-width', '1');
  rect.setAttribute('stroke-dasharray', '1');
  rect.setAttribute('stroke-dashoffset', '1');
  svg.appendChild(rect);
  pieza.appendChild(svg);
  const medir = () => {
    const w = pieza.offsetWidth, h = pieza.offsetHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    rect.setAttribute('x', '0.5');
    rect.setAttribute('y', '0.5');
    rect.setAttribute('width', String(Math.max(0, w - 1)));
    rect.setAttribute('height', String(Math.max(0, h - 1)));
  };
  medir();
  const ro = new ResizeObserver(medir);
  ro.observe(pieza);
  return {
    rect,
    quitar: () => {
      ro.disconnect();
      svg.remove();
    },
  };
}

/**
 * La página se arma con el scroll. Cada segmento se construye en tres
 * tiempos, siempre ligados a la posición (si se sube, se desarma):
 * primero la estructura (contornos que se dibujan), luego las piezas (los
 * paneles encajan y se rellenan) y por último el contenido (el texto
 * llega y lo interactivo se enciende).
 *
 * Todo vive aquí para leer la historia de corrido. No se toca ningún nodo
 * de texto de Angular (el cambio de idioma los reescribe): los títulos
 * suben tras una máscara de recorte y los contornos son SVG añadidos.
 * Con movimiento reducido no se monta nada y la página está armada.
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

    // ---- Cabeceras de sección: etiqueta, título tras su máscara, texto ----
    for (const cab of $('.seccion .cabeza-seccion, .pie__llamada')) {
      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        scrollTrigger: { trigger: cab, start: 'top 90%', end: 'top 42%', scrub: 0.6 },
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

    // ---- Cómo trabaja: el trazo, la ventana pieza a pieza, cada etapa ----
    const fijo = d.querySelector<HTMLElement>('.recorrido__fijo');
    const marco = fijo?.querySelector<HTMLElement>('.marco-metal');
    if (escritorio && fijo && marco) {
      // El contorno va en el contenedor: el marco empieza transparente.
      const t = trazo(fijo, 22, 'rgb(23 24 27 / 0.4)');
      quitar.push(t.quitar);
      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        scrollTrigger: { trigger: '.recorrido', start: 'top 92%', end: 'top 22%', scrub: 0.6 },
      });
      tl.fromTo(t.rect, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 0.35 }, 0)
        .from(marco, { opacity: 0, scale: 0.94, duration: 0.3 }, 0.25)
        .from($('.app-barra', marco), { y: -14, opacity: 0, duration: 0.2 }, 0.5)
        .from($('.app-proceso', marco), { x: 26, opacity: 0, duration: 0.2 }, 0.6)
        .from($('.app-escenas', marco), { opacity: 0, scale: 0.98, duration: 0.25 }, 0.7)
        .to(t.rect, { opacity: 0, duration: 0.15 }, 0.85);
    }
    for (const etapa of $('.etapa')) {
      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        scrollTrigger: { trigger: etapa, start: 'top 85%', end: 'top 50%', scrub: 0.6 },
      });
      tl.from($('.etapa__num, .etapa__titulo, .etapa__texto', etapa), {
        x: -34,
        opacity: 0,
        duration: 0.5,
        stagger: 0.12,
      });
      // En el teléfono cada etapa trae su escena: se arma igual que la ventana.
      const escena = !escritorio ? etapa.querySelector<HTMLElement>('.etapa__escena') : null;
      if (escena) {
        const t = trazo(escena, 18, 'rgb(23 24 27 / 0.4)');
        quitar.push(t.quitar);
        tl.fromTo(t.rect, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 0.4 }, 0.2)
          .from(escena, { '--relleno': 0, duration: 0.3 }, 0.45)
          .from(escena.querySelector('.app'), { opacity: 0, y: 16, duration: 0.3 }, 0.6)
          .to(t.rect, { opacity: 0, duration: 0.15 }, 0.9);
      }
    }

    // ---- Control y Proyectos: contorno, relleno, contenido, encendido ----
    const armarTarjetas = (sel: string, radio: number, desdeLados: boolean) => {
      $(sel).forEach((tarjeta, i) => {
        const t = trazo(tarjeta, radio, 'rgb(242 241 237 / 0.55)');
        quitar.push(t.quitar);
        const lado = desdeLados ? (i % 2 ? 1 : -1) : 0;
        const tl = gsap.timeline({
          defaults: { ease: 'power2.out' },
          scrollTrigger: {
            trigger: tarjeta,
            start: 'top 96%',
            end: 'top 48%',
            scrub: 0.6,
            // Al terminar de encajar, la pieza se enciende.
            onUpdate: (st) => tarjeta.classList.toggle('activo', st.progress > 0.88),
          },
        });
        tl.fromTo(t.rect, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 0.35 }, 0)
          .from(
            tarjeta,
            desdeLados
              ? { x: 70 * lado, y: 30, rotation: 1.2 * lado, duration: 0.55 }
              : { y: 60, rotationX: 10, transformPerspective: 900, duration: 0.55 },
            0,
          )
          .from(tarjeta, { '--relleno': 0, duration: 0.3 }, 0.3)
          .from($('.muestra, .vista', tarjeta), { opacity: 0, scale: 0.97, duration: 0.25 }, 0.45);
        // Las miniaturas de Proyectos se dibujan pieza a pieza.
        const formas = $<SVGElement>('.vista svg :is(rect, path, circle)', tarjeta);
        if (formas.length)
          tl.from(
            formas,
            { opacity: 0, scale: 0.4, transformOrigin: '50% 50%', duration: 0.3, stagger: { amount: 0.25 } },
            0.55,
          );
        tl.from(
          $('.tarjeta__titulo, .tarjeta__texto, .proyecto__nombre, .proyecto__repo, .proyecto__texto, .proyecto__datos', tarjeta),
          { y: 14, opacity: 0, duration: 0.25, stagger: 0.06 },
          0.62,
        ).to(t.rect, { opacity: 0.35, duration: 0.15 }, 0.9);
        quitar.push(() => tarjeta.classList.remove('activo'));
      });
    };
    // En el teléfono las tarjetas suben desde abajo: entrando de lado
    // desbordaban la pantalla y el navegador ensanchaba la página.
    armarTarjetas('#control .tarjeta', 20, escritorio);
    armarTarjetas('#proyectos .proyecto', 20, false);

    // ---- Pie: las letras de la marca se juntan y el cromo las recorre ----
    const marca = d.querySelector<HTMLElement>('.pie__gigante');
    if (marca) {
      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: marca, start: 'top 98%', end: 'top 50%', scrub: 0.8 },
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
