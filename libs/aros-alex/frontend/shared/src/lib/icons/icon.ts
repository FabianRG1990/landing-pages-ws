import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
} from '@angular/core';

/**
 * Registro central de íconos SVG del sitio (los mismos del diseño original).
 * Reemplaza los SVG inline repetidos por un único componente reutilizable:
 *
 *   <app-icon name="repair" />
 *
 * El tamaño se controla por CSS (`font-size`) o con `[size]`. El color hereda
 * de `currentColor`.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    @let s = size();
    @switch (name()) {
      @case ('precision') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
          <circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" />
          <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
        </svg>
      }
      @case ('finish') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2.5l2.3 6.2 6.2.3-5 4 1.7 6L12 15.6 6.1 19l1.7-6-5-4 6.2-.3z" />
        </svg>
      }
      @case ('craft') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2l7 3v6c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9V5z" /><path d="M9 11.5l2 2 4-4.2" />
        </svg>
      }
      @case ('repair') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 8 5" /><path d="m15 6 5 2 .6-5" />
        </svg>
      }
      @case ('straighten') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 16 9 9l3 3 4-7" /><path d="M3 20h18" /><path d="m17 5 4 1-1 4" />
        </svg>
      }
      @case ('paint') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9Z" /><path d="M9.5 13a2.5 2.5 0 0 0 2.5 2.5" />
        </svg>
      }
      @case ('fabrication') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" />
        </svg>
      }
      @case ('link') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6a1.5 1.5 0 0 0 2 2l6-6a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2 2.3-2.3z" />
        </svg>
      }
      @case ('expand') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12h18M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
        </svg>
      }
      @case ('roller') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 3h11v5H5zM16 5h3v4h-7M11 9v3a2 2 0 0 1-2 2H8v6a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-6h-1" />
        </svg>
      }
      @case ('compare') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 7l-4 5 4 5M15 7l4 5-4 5" />
        </svg>
      }
      @case ('arrow') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 12h14M13 6l6 6-6 6" />
        </svg>
      }
      @case ('phone') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15.5a2 2 0 0 1-2 2 16 16 0 0 1-13-13 2 2 0 0 1 2-2h2.5l1 4-2 1.5a11 11 0 0 0 4.5 4.5l1.5-2 4 1Z" />
        </svg>
      }
      @case ('mail') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />
        </svg>
      }
      @case ('map') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" />
        </svg>
      }
      @case ('clock') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
        </svg>
      }
      @case ('instagram') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      }
      @case ('facebook') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 9h2.5l.4-3H14V4.3c0-.85.25-1.3 1.46-1.3H17V.3C16.6.25 15.6.1 14.5.1c-2.3 0-3.9 1.4-3.9 4V6H8v3h2.6v9H14V9Z" />
        </svg>
      }
      @case ('google') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 1 0 9.5 13H12v-4h9.8A10 10 0 0 0 12 2Z" />
        </svg>
      }
      @case ('whatsapp') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.18c-.24.68-1.42 1.31-1.96 1.36-.5.05-1.14.27-3.84-.8-3.23-1.27-5.3-4.57-5.46-4.78-.16-.21-1.31-1.74-1.31-3.32 0-1.58.83-2.36 1.12-2.68.29-.32.64-.4.85-.4.21 0 .43 0 .61.01.2.01.46-.07.72.55.27.64.91 2.22.99 2.38.08.16.13.35.03.56-.1.21-.16.34-.32.53-.16.19-.34.42-.48.56-.16.16-.33.34-.14.66.19.32.84 1.39 1.81 2.25 1.25 1.11 2.3 1.46 2.62 1.62.32.16.51.13.7-.08.19-.21.81-.94 1.03-1.27.21-.32.43-.27.72-.16.29.11 1.86.88 2.18 1.04.32.16.53.24.61.37.08.14.08.8-.16 1.48z" />
        </svg>
      }
      @case ('waze') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 11.5a8 8 0 0 1-8 8H7l-3 2.5.6-3.4A8 8 0 1 1 21 11.5Z" />
          <circle cx="9.5" cy="11" r="0.6" fill="currentColor" stroke="none" />
          <circle cx="14.5" cy="11" r="0.6" fill="currentColor" stroke="none" />
          <path d="M9.5 14a3 3 0 0 0 5 0" />
        </svg>
      }
      @case ('navigation') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 11 21 3l-8 18-2.5-7.5L3 11Z" />
        </svg>
      }
      @case ('globe') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M3 12h18" />
          <path d="M12 3c2.5 2.5 3.8 5.6 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.6-3.8-9S9.5 5.5 12 3Z" />
        </svg>
      }
    }
  `,
})
export class Icon {
  readonly name = input.required<string>();
  readonly size = input('1em');
}
