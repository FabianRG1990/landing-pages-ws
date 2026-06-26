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
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.218 0C9.915 0 6.835 1.49 4.723 4.148c-1.515 1.913-2.31 4.272-2.31 6.706v1.739c0 .894-.62 1.738-1.862 1.813-.298.025-.547.224-.547.522-.05.82.82 2.31 2.012 3.502.82.844 1.788 1.515 2.832 2.036a3 3 0 0 0 2.955 3.528 2.966 2.966 0 0 0 2.931-2.385h2.509c.323 1.689 2.086 2.856 3.974 2.21 1.64-.546 2.36-2.409 1.763-3.924a12.84 12.84 0 0 0 1.838-1.465 10.73 10.73 0 0 0 3.18-7.65c0-2.882-1.118-5.589-3.155-7.625A10.899 10.899 0 0 0 13.218 0zm0 1.217c2.558 0 4.967.994 6.78 2.807a9.525 9.525 0 0 1 2.807 6.78A9.526 9.526 0 0 1 20 17.585a9.647 9.647 0 0 1-6.78 2.807h-2.46a3.008 3.008 0 0 0-2.93-2.41 3.03 3.03 0 0 0-2.534 1.367v.024a8.945 8.945 0 0 1-2.41-1.788c-.844-.844-1.316-1.614-1.515-2.11a2.858 2.858 0 0 0 1.441-.846 2.959 2.959 0 0 0 .795-2.036v-1.789c0-2.11.696-4.197 2.012-5.861 1.863-2.385 4.62-3.726 7.6-3.726zm-2.41 5.986a1.192 1.192 0 0 0-1.191 1.192 1.192 1.192 0 0 0 1.192 1.193A1.192 1.192 0 0 0 12 8.395a1.192 1.192 0 0 0-1.192-1.192zm7.204 0a1.192 1.192 0 0 0-1.192 1.192 1.192 1.192 0 0 0 1.192 1.193 1.192 1.192 0 0 0 1.192-1.193 1.192 1.192 0 0 0-1.192-1.192zm-7.377 4.769a.596.596 0 0 0-.546.845 4.813 4.813 0 0 0 4.346 2.757 4.77 4.77 0 0 0 4.347-2.757.596.596 0 0 0-.547-.845h-.025a.561.561 0 0 0-.521.348 3.59 3.59 0 0 1-3.254 2.061 3.591 3.591 0 0 1-3.254-2.061.64.64 0 0 0-.546-.348z" />
        </svg>
      }
      @case ('googlemaps') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.527 4.799c1.212 2.608.937 5.678-.405 8.173-1.101 2.047-2.744 3.74-4.098 5.614-.619.858-1.244 1.75-1.669 2.727-.141.325-.263.658-.383.992-.121.333-.224.673-.34 1.008-.109.314-.236.684-.627.687h-.007c-.466-.001-.579-.53-.695-.887-.284-.874-.581-1.713-1.019-2.525-.51-.944-1.145-1.817-1.79-2.671L19.527 4.799zM8.545 7.705l-3.959 4.707c.724 1.54 1.821 2.863 2.871 4.18.247.31.494.622.737.936l4.984-5.925-.029.01c-1.741.601-3.691-.291-4.392-1.987a3.377 3.377 0 0 1-.209-.716c-.063-.437-.077-.761-.004-1.198l.001-.007zM5.492 3.149l-.003.004c-1.947 2.466-2.281 5.88-1.117 8.77l4.785-5.689-.058-.05-3.607-3.035zM14.661.436l-3.838 4.563a.295.295 0 0 1 .027-.01c1.6-.551 3.403.15 4.22 1.626.176.319.323.683.377 1.045.068.446.085.773.012 1.22l-.003.016 3.836-4.561A8.382 8.382 0 0 0 14.67.439l-.009-.003zM9.466 5.868L14.162.285l-.047-.012A8.31 8.31 0 0 0 11.986 0a8.439 8.439 0 0 0-6.169 2.766l-.016.018 3.665 3.084z" />
        </svg>
      }
      @case ('apple') {
        <svg [attr.width]="s" [attr.height]="s" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
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
