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
 * (1.6 sobre 24, puntas redondas). Heredan el color del texto. Las
 * marcas ajenas (WhatsApp, Facebook) van con su glifo oficial relleno.
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
          <!-- El glifo oficial, relleno: una marca ajena no se redibuja a
               trazo (a 16 px el de línea no se reconocía). Mismo trazado
               que el botón de bollería. -->
          <path
            fill="currentColor"
            stroke="none"
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
          />
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
          <path
            fill="currentColor"
            stroke="none"
            d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"
          />
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
