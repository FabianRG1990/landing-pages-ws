import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type NombreIcono =
  | 'espiga'
  | 'gorro'
  | 'camion'
  | 'whatsapp'
  | 'flecha'
  | 'diagonal'
  | 'telefono'
  | 'correo'
  | 'ubicacion'
  | 'facebook'
  | 'instagram';

/**
 * Iconos de línea de la casa, con el mismo trazo que la trama del fondo
 * (1.6 sobre 24, puntas redondas). Heredan el color del texto.
 * Siempre decorativos: el texto de al lado es el que informa.
 */
@Component({
  selector: 'app-icono',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @switch (nombre()) {
        @case ('espiga') {
          <path d="M12 22V5" />
          <path d="M12 8c-2.4-.6-3.6-2.6-3.6-4.6 2.4.4 3.6 2.4 3.6 4.6zM12 8c2.4-.6 3.6-2.6 3.6-4.6-2.4.4-3.6 2.4-3.6 4.6z" />
          <path d="M12 13c-2.4-.6-3.6-2.6-3.6-4.6 2.4.4 3.6 2.4 3.6 4.6zM12 13c2.4-.6 3.6-2.6 3.6-4.6-2.4.4-3.6 2.4-3.6 4.6z" />
          <path d="M12 18c-2.4-.6-3.6-2.6-3.6-4.6 2.4.4 3.6 2.4 3.6 4.6zM12 18c2.4-.6 3.6-2.6 3.6-4.6-2.4.4-3.6 2.4-3.6 4.6z" />
        }
        @case ('gorro') {
          <path d="M7 16v-3.2A4 4 0 0 1 6.4 5a4.6 4.6 0 0 1 11.2 0A4 4 0 0 1 17 12.8V16z" />
          <path d="M7 19h10v-3H7z" />
        }
        @case ('camion') {
          <path d="M2.5 6.5h11v9h-11z" />
          <path d="M13.5 9.5h4l3 3.2v2.8h-7" />
          <circle cx="6.5" cy="17.5" r="1.8" />
          <circle cx="17" cy="17.5" r="1.8" />
        }
        @case ('whatsapp') {
          <path d="M4 20l1.2-3.6A8 8 0 1 1 8 19.2z" />
          <path d="M9.2 8.6c.2-.5.6-.6.9-.6h.4c.2 0 .4.1.5.4l.6 1.4c.1.2 0 .5-.1.6l-.5.6c.6 1.2 1.6 2.1 2.8 2.7l.6-.5c.2-.2.4-.2.6-.1l1.4.6c.3.1.4.3.4.5v.4c0 .3-.2.7-.6.9-.6.3-1.4.4-2.2.1-2.2-.8-4-2.6-4.8-4.8-.3-.8-.2-1.6.1-2.2z" />
        }
        @case ('flecha') {
          <path d="M5 12h14M13 6l6 6-6 6" />
        }
        @case ('diagonal') {
          <path d="M7 17L17 7M9 7h8v8" />
        }
        @case ('telefono') {
          <path d="M5.5 4h3l1.5 4-2 1.3a11 11 0 0 0 6.7 6.7l1.3-2 4 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 3.5 6a2 2 0 0 1 2-2z" />
        }
        @case ('correo') {
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="M3.8 6.8L12 13l8.2-6.2" />
        }
        @case ('ubicacion') {
          <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        }
        @case ('facebook') {
          <path d="M14 21v-7h2.6l.4-3.2h-3V8.9c0-.9.3-1.5 1.6-1.5H17V4.5a21 21 0 0 0-2.4-.1c-2.4 0-4 1.4-4 4.1v2.3H8V14h2.6v7" />
        }
        @case ('instagram') {
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="0.6" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      width: 1.25em;
      height: 1.25em;
      flex-shrink: 0;
      line-height: 0;
    }

    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class IconoComponent {
  readonly nombre = input.required<NombreIcono>();
}
