import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FOOTER_COLS, FOOTER_LEGAL } from '../../data/site';

/** Pie de página de VELOX — marca, columnas de enlaces, redes y legal. */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.html',
})
export class Footer {
  protected readonly cols = FOOTER_COLS;
  protected readonly legal = FOOTER_LEGAL;
}
