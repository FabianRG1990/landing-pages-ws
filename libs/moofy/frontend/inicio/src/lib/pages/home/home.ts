import { ChangeDetectionStrategy, Component, PLATFORM_ID, afterNextRender, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavComponent } from '@moofy-ui-shared/layout/nav/nav';
import { SmoothScroll } from '@moofy-ui-shared/motion/smooth-scroll.service';
import { refrescarConFuentes } from '@moofy-ui-shared/motion/escena';
import { HeroComponent } from '../../sections/hero/hero';
import { FabricaComponent } from '../../sections/fabrica/fabrica';
import { LineasComponent } from '../../sections/lineas/lineas';
import { CanalesComponent } from '../../sections/canales/canales';
import { ProcesoComponent } from '../../sections/proceso/proceso';
import { ContactoComponent } from '../../sections/contacto/contacto';
import { CierreComponent } from '../../sections/cierre/cierre';
import { PieComponent } from '@moofy-ui-shared/layout/pie/pie';

@Component({
  selector: 'app-home',
  imports: [NavComponent, HeroComponent, FabricaComponent, LineasComponent, CanalesComponent, ProcesoComponent, CierreComponent, ContactoComponent, PieComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  constructor() {
    const smooth = inject(SmoothScroll);
    smooth.init();
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    afterNextRender(() => {
      if (!esNavegador) return;
      // Con un ancla en la URL el navegador salta antes de que existan los
      // pins, que después añaden su recorrido por encima: la sección
      // acababa 2000 px más abajo. Se vuelve al ancla ya recalculado.
      refrescarConFuentes(() => {
        if (location.hash) smooth.scrollTo(location.hash, true);
      });
    });
  }
}
