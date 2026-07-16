import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BolleriaStore } from '../core/bolleria.store';
import { formatColones } from '../data/menu-data';

@Component({
  selector: 'bol-cart-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.scss',
})
export class CartDrawerComponent {
  private readonly store = inject(BolleriaStore);

  readonly cartOpen = this.store.cartOpen;
  readonly cartEmpty = this.store.cartEmpty;
  readonly cartHas = this.store.cartHas;
  readonly cartLines = this.store.cartLines;
  readonly cartTotalFmt = this.store.cartTotalFmt;
  readonly waCheckout = this.store.waCheckout;
  readonly fmt = formatColones;

  closeCart(): void {
    this.store.closeCart();
  }
  goMenuFromCart(): void {
    this.store.closeCart();
    this.store.go('menu');
  }
  inc(id: string): void {
    this.store.incCart(id);
  }
  dec(id: string): void {
    this.store.decCart(id);
  }
  clear(): void {
    this.store.clearCart();
  }
}
