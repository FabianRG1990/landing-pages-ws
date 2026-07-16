import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BolleriaStore, formatColones } from '@bolleria-ui-shared';

@Component({
  selector: 'bol-menu-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-page.component.html',
  styleUrl: './menu-page.component.scss',
})
export class MenuPageComponent {
  private readonly store = inject(BolleriaStore);

  readonly categories = this.store.categories;
  readonly activeCategory = this.store.activeCategory;
  readonly activeItems = this.store.activeItems;
  readonly cartLines = this.store.cartLines;
  readonly cartEmpty = this.store.cartEmpty;
  readonly cartHas = this.store.cartHas;
  readonly cartTotalFmt = this.store.cartTotalFmt;
  readonly waCheckout = this.store.waCheckout;
  readonly fmt = formatColones;

  setActiveCat(key: string): void {
    this.store.setActiveCat(key);
  }
  addToCart(id: string): void {
    this.store.addToCart(id);
  }
  inc(id: string): void {
    this.store.incCart(id);
  }
  dec(id: string): void {
    this.store.decCart(id);
  }
  clearCart(): void {
    this.store.clearCart();
  }
}
