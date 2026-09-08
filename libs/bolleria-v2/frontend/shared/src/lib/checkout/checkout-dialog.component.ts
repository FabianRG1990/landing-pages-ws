import { ChangeDetectionStrategy, Component, HostListener, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BolleriaStore } from '../core/bolleria.store';
import { DeliveryType, DELIVERY_LABELS } from '../core/models';

@Component({
  selector: 'bol-checkout-dialog',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkout-dialog.component.html',
  styleUrl: './checkout-dialog.component.scss',
})
export class CheckoutDialogComponent {
  private readonly store = inject(BolleriaStore);
  private readonly sanitizer = inject(DomSanitizer);

  readonly open = this.store.checkoutOpen;
  readonly step = this.store.checkoutStep;
  readonly customerName = this.store.customerName;
  readonly deliveryType = this.store.deliveryType;
  readonly checkoutError = this.store.checkoutError;
  readonly orderNumber = this.store.orderNumber;
  readonly orderDate = this.store.orderDate;
  readonly cartTotalFmt = this.store.cartTotalFmt;

  readonly pdfSrc = computed<SafeResourceUrl | null>(() => {
    const u = this.store.pdfUrl();
    return u ? this.sanitizer.bypassSecurityTrustResourceUrl(u) : null;
  });

  readonly deliveryOptions: { key: DeliveryType; label: string }[] = (
    Object.keys(DELIVERY_LABELS) as DeliveryType[]
  ).map((key) => ({ key, label: DELIVERY_LABELS[key] }));

  close(): void {
    this.store.closeCheckout();
  }
  setName(value: string): void {
    this.store.setCustomerName(value);
  }
  chooseType(type: DeliveryType): void {
    this.store.setDeliveryType(type);
  }
  confirm(): void {
    this.store.confirmOrder();
  }
  downloadAgain(): void {
    this.store.downloadPdf();
  }
  sendWhatsapp(): void {
    this.store.sendWhatsappOrder();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.close();
  }
}
