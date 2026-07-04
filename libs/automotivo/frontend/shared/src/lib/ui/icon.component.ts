import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Ícono SVG de trazo a partir de un arreglo de `d` (paths 24x24).
 * Reemplaza los `React.createElement('svg', …)` del origen.
 */
@Component({
  selector: 'amv-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      [attr.stroke]="stroke()"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @for (d of paths(); track $index) {
        <path [attr.d]="d"></path>
      }
    </svg>
  `,
})
export class IconComponent {
  readonly paths = input.required<string[]>();
  readonly size = input(20);
  readonly stroke = input('#E11D2E');
  readonly strokeWidth = input(1.7);
}
