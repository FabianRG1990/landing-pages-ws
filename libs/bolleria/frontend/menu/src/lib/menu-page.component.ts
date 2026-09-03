import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
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

  /**
   * Cuántas unidades de cada producto hay en el pedido, SUMANDO sus sabores.
   *
   * El carrito no está indexado por producto sino por `cartKey(id, sabor)`, así
   * que un mismo producto puede tener varias líneas —una por sabor elegido— y
   * el contador de la fila tiene que enseñar el total, no el de una de ellas.
   * Es la razón por la que esto no puede ser un `cart()[it.id]` directo.
   */
  private readonly qtyByItem = computed(() => {
    const m: Record<string, number> = {};
    for (const l of this.cartLines()) m[l.item.id] = (m[l.item.id] ?? 0) + l.qty;
    return m;
  });
  qtyOf(id: string): number {
    return this.qtyByItem()[id] ?? 0;
  }

  /**
   * Producto que acaba de recibir una unidad, para el impulso del contador.
   *
   * El contador aparece con sus propios `@keyframes` —eso lo dispara el
   * navegador solo, al crearse el elemento—, pero al agregar una SEGUNDA unidad
   * el elemento ya existe y una animación no se reinicia sola. De ahí esta
   * clase temporal: lo que la mueve es una `transition`, que sí vuelve a
   * dispararse con cada cambio de clase sin depender de saltarse un fotograma.
   */
  readonly popId = signal<string | null>(null);
  private popTimer?: ReturnType<typeof setTimeout>;
  private pulso(id: string): void {
    clearTimeout(this.popTimer);
    this.popId.set(id);
    this.popTimer = setTimeout(() => this.popId.set(null), 220);
  }

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
    this.pulso(id);
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
    this.pulso(it.id);
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
