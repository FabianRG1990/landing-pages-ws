import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Escenario } from '../escenario/escenario';
import { CodigoIdioma, TEXTOS, Textos } from './textos';

const CLAVE = 'aurum-idioma';
const FUNDIDO_MS = 170;

/**
 * Idioma de la página. El HTML se prerenderiza en español; en el navegador
 * se usa lo que la persona eligió antes o, si es su primera visita, el
 * idioma del navegador. El cambio es un fundido corto: el texto sale, se
 * reemplaza y vuelve a entrar sin que nada se mueva de sitio.
 */
@Injectable({ providedIn: 'root' })
export class Idioma {
  private readonly doc = inject(DOCUMENT);
  private readonly titulo = inject(Title);
  private readonly meta = inject(Meta);
  private readonly escenario = inject(Escenario);

  readonly codigo = signal<CodigoIdioma>('es');
  readonly t = computed<Textos>(() => TEXTOS[this.codigo()]);
  readonly formato = computed(() =>
    this.codigo() === 'es' ? 'es-ES' : 'en-US',
  );

  private enCurso = false;

  /** Solo en el navegador, después de hidratar. */
  iniciar(): void {
    const inicial = this.leerPreferencia();
    if (inicial !== this.codigo()) this.aplicar(inicial);
    // El script de <head> ocultó el contenido si tocaba inglés.
    this.alSiguienteFotograma(() =>
      this.doc.documentElement.classList.remove('cambiando-idioma'),
    );
  }

  cambiar(codigo: CodigoIdioma): void {
    if (codigo === this.codigo() || this.enCurso) return;
    this.guardar(codigo);
    const html = this.doc.documentElement;
    const reducido =
      this.doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)')
        .matches ?? true;
    if (reducido) {
      this.aplicar(codigo);
      return;
    }
    this.enCurso = true;
    html.classList.add('cambiando-idioma');
    setTimeout(() => {
      this.aplicar(codigo);
      this.alSiguienteFotograma(() => {
        html.classList.remove('cambiando-idioma');
        this.enCurso = false;
      });
    }, FUNDIDO_MS);
  }

  private aplicar(codigo: CodigoIdioma): void {
    this.codigo.set(codigo);
    const t = TEXTOS[codigo];
    this.doc.documentElement.lang = codigo;
    this.titulo.setTitle(t.meta.titulo);
    this.meta.updateTag({ name: 'description', content: t.meta.descripcion });
    // Si cambia el número de renglones, hay nodos nuevos que medir.
    this.alSiguienteFotograma(() => this.escenario.recolectar());
  }

  private leerPreferencia(): CodigoIdioma {
    try {
      const guardado = this.doc.defaultView?.localStorage.getItem(CLAVE);
      if (guardado === 'es' || guardado === 'en') return guardado;
    } catch {
      // Navegación privada o almacenamiento bloqueado: se decide por el navegador.
    }
    const nav = this.doc.defaultView?.navigator.language?.toLowerCase() ?? 'es';
    return nav.startsWith('es') ? 'es' : 'en';
  }

  private guardar(codigo: CodigoIdioma): void {
    try {
      this.doc.defaultView?.localStorage.setItem(CLAVE, codigo);
    } catch {
      // Sin almacenamiento la elección dura lo que dure la visita.
    }
  }

  private alSiguienteFotograma(fn: () => void): void {
    const win = this.doc.defaultView;
    if (!win) return fn();
    win.requestAnimationFrame(() => win.requestAnimationFrame(fn));
  }
}
