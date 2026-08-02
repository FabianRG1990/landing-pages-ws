import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { BolleriaStore, MenuItem, formatColones } from '@bolleria-ui-shared';

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
  readonly fmt = formatColones;

  /** Producto cuyo diálogo de sabor está abierto (null = cerrado). */
  readonly dialogItem = signal<MenuItem | null>(null);
  readonly selectedOption = signal<string | null>(null);

  setActiveCat(key: string): void {
    this.store.setActiveCat(key);
  }
  /** Filas por columna en la carta de dos páginas — ver `.bol-menu__list` en el SCSS. */
  rowsPerColumn(total: number): number {
    return Math.ceil(total / 2);
  }
  /** Última fila de cada columna: ahí no va línea divisoria inferior. */
  isLastInColumn(index: number, total: number): boolean {
    const rows = this.rowsPerColumn(total);
    return index === rows - 1 || index === total - 1;
  }
  addToCart(id: string): void {
    this.store.addToCart(id);
  }
  /** Productos con `options`: "Agregar" abre el diálogo de sabor en vez de agregar directo. */
  openOptions(it: MenuItem): void {
    this.dialogItem.set(it);
    this.selectedOption.set(null);
  }
  closeOptions(): void {
    this.dialogItem.set(null);
    this.selectedOption.set(null);
  }
  chooseOption(opt: string): void {
    this.selectedOption.set(opt);
  }
  confirmOption(): void {
    const it = this.dialogItem();
    const opt = this.selectedOption();
    if (!it || !opt) return;
    this.store.addToCart(it.id, opt);
    this.closeOptions();
  }
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.dialogItem()) this.closeOptions();
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
  startCheckout(): void {
    this.store.openCheckout();
  }
}
