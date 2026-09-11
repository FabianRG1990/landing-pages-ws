import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BolleriaStore } from '../core/bolleria.store';

export type CurtainStage = 'idle' | 'in' | 'open' | 'out';

/**
 * Cortina entre pantallas: un hornito se abre, el logo sale "recién
 * horneado" y la escena se desvanece — ahí aparece el siguiente segmento.
 * Puramente CSS (transiciones por clase de `stage`), sin canvas ni
 * simulación: la elección winning después de que el enfoque de partículas
 * ("harina cayendo") se descartó por no llegar a verse premium.
 */
@Component({
  selector: 'bol-curtain',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './curtain.component.html',
  styleUrl: './curtain.component.scss',
})
export class CurtainComponent {
  private readonly store = inject(BolleriaStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly reduced = this.isBrowser && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  /**
   * La escena del horno, pre-renderizada, para la familia WebKit.
   *
   * La escena son ~30 elementos con degradados, bordes y sombras dentro de un
   * contexto 3D (`perspective` + `preserve-3d`), y WebKit los rasteriza ENTEROS
   * en cada fotograma. Medido contra lo publicado, en WebKit con un iPhone 13:
   * la cortina completa se dibujaba en 12-13 fotogramas para sus 2400 ms, y
   * ocultando solo la escena subía a 28. Chromium daba 140 en las dos.
   *
   * No hay una pieza culpable a la que se le pueda echar la culpa: quitando por
   * separado las sombras, la puerta, el panel, el vapor o el resplandor se
   * ganaban 0-2 fotogramas cada vez. El coste está repartido, así que limar la
   * hoja de estilos no lleva a ninguna parte —quitar TODOS los desenfoques solo
   * pasaba de 13 a 14—.
   *
   * Lo que sí lo quita del todo es que deje de haber nada que rasterizar: la
   * animación interna (puerta que gira, logo que sube, vapor) va grabada en una
   * tira de 19 cuadros que rindió el propio Chromium con estos mismos estilos,
   * y aquí se reproduce con `steps()`. Es la misma animación, no una imitación.
   * El movimiento de entrada y de salida —escala y opacidad de la escena
   * entera— se queda en CSS: eso sí lo compone la GPU y no cuesta nada.
   *
   * `navigator.vendor` con 'Apple' cubre exactamente a los afectados: Safari de
   * macOS y de iOS, y también Chrome y Firefox de iOS, que por obligación de
   * Apple usan el mismo motor. Fuera de ahí no cambia absolutamente nada.
   *
   * Se espera a `loaded()` para que la tira (369 KB) no le compita el ancho de
   * banda a los cuadros del hero durante la carga inicial. La cortina no puede
   * dispararse antes de eso, así que no se pierde nada.
   */
  private readonly familiaWebkit = this.isBrowser && /apple/i.test(navigator.vendor || '');
  readonly sprite = computed(() => this.familiaWebkit && this.store.loaded());

  readonly stage = signal<CurtainStage>('idle');
  readonly reducedFade = signal(false);
  private playing = false;
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    if (!this.isBrowser) return;
    effect(() => {
      if (this.store.curtain() && !this.playing) {
        this.playing = true;
        this.play();
      }
    });
  }

  private schedule(fn: () => void, ms: number): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private play(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];

    if (this.reduced) {
      // Nada de horno/puerta en movimiento: solo un cruce de opacidad breve,
      // mismo criterio que el preloader para `prefers-reduced-motion`.
      this.reducedFade.set(true);
      this.schedule(() => {
        this.reducedFade.set(false);
        this.playing = false;
      }, 260);
      return;
    }

    /**
     * El ciclo entero dura 900 ms. Era de 2400; se probó en 500 y quedó
     * demasiado seco.
     *
     *     0 - 260 ms   el iris se cierra y cubre la pantalla
     *     0 - 180      el horno se ve CERRADO
     *     180 - 560    la puerta gira
     *       280 ms     cambia la pantalla, ya tapada (lo hace `go()` en la
     *                  tienda, con `swapDelay`; los dos números van atados)
     *     380 - 660    el logo sube y sale el vapor
     *     660 - 900    se desvanece y aparece la pantalla nueva
     *
     * La puerta NO arranca en el cero, y esos 180 ms de horno cerrado no son
     * relleno: son lo único que hace que después se lea una puerta ABRIÉNDOSE y
     * no una puerta que ya estaba entreabierta. Arrancándola en el cero, lo
     * primero que se veía era la puerta girada unos grados, y en perspectiva eso
     * despega su canto izquierdo del marco y abre un hueco —reportado—. Antes
     * no pasaba porque había 900 ms de horno quieto por delante.
     *
     * Tampoco cabe sólo en el tramo cubierto (280-660): de ahí salió la versión
     * sin animación que hubo un rato. Cabe a caballo de los dos.
     *
     * `open` marca el acercamiento de cámara, no la apertura.
     */
    this.stage.set('in');
    this.schedule(() => this.stage.set('open'), 280);
    this.schedule(() => this.stage.set('out'), 660);
    this.schedule(() => {
      this.stage.set('idle');
      this.playing = false;
    }, 900);
  }
}
