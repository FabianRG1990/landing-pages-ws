import {
  Directive,
  HostBinding,
  HostListener,
  inject,
  input,
} from '@angular/core';
import { PageTransition } from './page-transition.service';

/**
 * appLink — navega a un segmento con la transición cinematográfica.
 *
 *   <a appLink="/performance">Performance</a>
 *
 * Pone el `href` (accesibilidad / abrir en pestaña con ctrl/cmd-click) pero
 * intercepta el click izquierdo para correr el obturador sincronizado.
 */
@Directive({
  selector: '[appLink]',
  standalone: true,
})
export class LinkDirective {
  readonly path = input.required<string>({ alias: 'appLink' });
  private readonly transition = inject(PageTransition);

  @HostBinding('attr.href') get href(): string {
    return this.path();
  }

  @HostListener('click', ['$event'])
  protected onClick(e: MouseEvent): void {
    // Respeta abrir-en-pestaña / botón medio: no interceptar.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    void this.transition.go(this.path());
  }
}
