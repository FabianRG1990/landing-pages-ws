import { Injectable } from '@angular/core';
import { jsPDF, GState } from 'jspdf';
import { DeliveryType, DELIVERY_LABELS, GeneratedOrder, OrderLine } from './models';
import { formatColones } from '../data/menu-data';
import { CONTACT } from '../data/contact-data';

const pad2 = (n: number) => String(n).padStart(2, '0');

// Las fuentes propias de jsPDF (Helvetica/Times/Courier) usan una
// codificación WinAnsi que NO incluye el símbolo ₡ — se ve como un glifo roto
// ("¡"). El texto de WhatsApp sí puede usar ₡ (lo procesa el propio
// WhatsApp/navegador), pero dentro del PDF dibujado por jsPDF hay que usar
// el código de moneda en letras.
const pdfPrice = (n: number) => `CRC ${n.toLocaleString('de-DE')}`;

// Para envío exprés: hay que aceptar tanto una ubicación compartida por
// WhatsApp como una dirección escrita (no todo el mundo escribe la dirección
// a mano), y el costo del envío también se coordina ahí — sin esto, el
// cliente asume que el envío ya está incluido en el total del pedido.
const EXPRESS_NOTE =
  'Nuestro equipo te escribe por WhatsApp para coordinar la entrega. Compartinos tu ubicación o la dirección, y ahí vemos el costo del envío.';

const INK: [number, number, number] = [46, 42, 28];
const ACC: [number, number, number] = [200, 145, 42];
const ACCD: [number, number, number] = [165, 118, 28];
const OLIVE: [number, number, number] = [94, 106, 52];
const OLIVED: [number, number, number] = [69, 78, 36];
const CREAM: [number, number, number] = [250, 246, 236];
const SUB: [number, number, number] = [138, 129, 105];

export interface OrderInput {
  customerName: string;
  deliveryType: DeliveryType;
  lines: OrderLine[];
  total: number;
}

// Corto a propósito (4 dígitos, sin prefijo ni fecha embebida) — tiene que
// ser fácil de dictar de palabra en el local. La fecha se muestra aparte,
// nunca fusionada en el mismo código (ver `orderDate` en GeneratedOrder).
function generateOrderNumber(): string {
  return String(Math.floor(Math.random() * 9000) + 1000);
}

/**
 * Genera el "Pedido" en PDF con la identidad de Bollería.
 * Mismo patrón que `PdfService` de Automotivo (jsPDF puro, sin backend):
 * dibuja todo por código con las fuentes nativas de jsPDF (no las fuentes web
 * reales del sitio, que requerirían convertirlas aparte) y compensa el "look"
 * con el fondo artístico del sitio + la paleta dorado/oliva/crema del sitio.
 * El formato de página (470×835px) respeta el aspect ratio real de
 * `hero-bg-mobile.webp` (941×1672 — más alto que ancho, como una cinta de
 * factura de caja registradora, que es justo la forma que pidió el usuario).
 */
@Injectable({ providedIn: 'root' })
export class OrderPdfService {
  /** última orden generada, para descargar de nuevo sin regenerar */
  lastOrder: GeneratedOrder | null = null;

  private bgData: string | null = null;
  private bgImg: HTMLImageElement | null = null;
  private markData: { url: string; w: number; h: number } | null = null;
  private markImg: HTMLImageElement | null = null;

  constructor() {
    if (typeof Image === 'undefined') return;
    const bg = new Image();
    bg.onload = () => (this.bgImg = bg);
    bg.src = 'assets/hero-bg-mobile.webp';

    const mark = new Image();
    mark.onload = () => (this.markImg = mark);
    mark.src = 'assets/mark.png';
  }

  private bgForPdf(w: number, h: number): string | null {
    if (this.bgData) return this.bgData;
    const im = this.bgImg;
    if (!im || !im.complete || !im.naturalWidth) return null;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d')!.drawImage(im, 0, 0, w, h);
    this.bgData = c.toDataURL('image/jpeg', 0.88);
    return this.bgData;
  }

  private markForPdf(): { url: string; w: number; h: number } | null {
    if (this.markData) return this.markData;
    const im = this.markImg;
    if (!im || !im.complete || !im.naturalWidth) return null;
    const h = 90;
    const w = Math.round((im.naturalWidth / im.naturalHeight) * h);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d')!.drawImage(im, 0, 0, w, h);
    this.markData = { url: c.toDataURL('image/png'), w, h };
    return this.markData;
  }

  /** Texto plano del pedido — lo usan tanto el link `wa.me` (respaldo) como el Web Share API (compartir con el PDF adjunto). */
  orderMessage(input: OrderInput & { orderNumber: string; orderDate: string }): string {
    const L = [
      '*Pedido Bollería*',
      `Fecha: ${input.orderDate}`,
      `N.º de pedido: ${input.orderNumber}`,
      `Nombre: ${input.customerName}`,
      `Entrega: ${DELIVERY_LABELS[input.deliveryType]}`,
      '',
    ];
    for (const l of input.lines) {
      const label = l.option ? `${l.item.name} — ${l.option}` : l.item.name;
      L.push(`• ${l.qty}× ${label} — ${formatColones(l.item.price * l.qty)}`);
    }
    L.push('', `Total: ${formatColones(input.total)}`);
    if (input.deliveryType === 'envio-expres') {
      L.push('', 'Por favor compartime tu ubicación o la dirección de entrega, y coordinamos el costo del envío 🙏');
    }
    L.push('', '(Adjunto el pedido en PDF)');
    return L.join('\n');
  }

  /** Link `wa.me` de respaldo — solo para navegadores/dispositivos sin Web Share de archivos (ej. computadora): abre WhatsApp con el texto ya listo, el PDF se adjunta a mano. */
  whatsappText(input: OrderInput & { orderNumber: string; orderDate: string }): string {
    return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(this.orderMessage(input))}`;
  }

  buildOrder(input: OrderInput): GeneratedOrder {
    const W = 470,
      M = 30,
      RW = W - 2 * M;
    const orderNumber = generateOrderNumber();
    const now = new Date();
    const orderDate = `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`;

    // La altura de página es DINÁMICA — como una cinta real de factura de
    // caja registradora, larga según haga falta, en vez de un A4 fijo donde
    // un pedido con muchas líneas distintas podría empujar el total/pie
    // fuera de la hoja. Medimos el texto con una instancia descartable
    // (splitTextToSize no depende del tamaño de página) antes de crear la
    // definitiva ya con la altura correcta.
    // Mismas opciones EXACTAS que la instancia real de abajo — si `measure`
    // no llevara el mismo `hotfixes`, mediría en una escala distinta a la que
    // realmente se dibuja, y el ancho disponible calculado aquí no
    // correspondería con lo que después se ve en el PDF (causa real de un
    // nombre largo montándose sobre el precio en pruebas anteriores).
    const measure = new jsPDF({ unit: 'px', format: [W, 835], hotfixes: ['px_scaling'] });
    const lineLayout = input.lines.map((l) => {
      // El nombre y el precio comparten la misma fila — el ancho disponible
      // para el nombre depende de cuánto mide REALMENTE el precio de esta
      // línea (no un margen fijo adivinado, que con "10× CRC 10.000" o un
      // nombre muy largo se quedaba corto y el precio se montaba encima).
      measure.setFont('helvetica', 'bold');
      measure.setFontSize(10.5);
      const priceW = measure.getTextWidth(`${l.qty}× ${pdfPrice(l.item.price)}`);
      measure.setFont('times', 'normal');
      measure.setFontSize(11.5);
      const wrapped = measure.splitTextToSize(l.item.name, RW - 28 - priceW - 14) as string[];
      const h = wrapped.length * 13 + (l.option ? 12 : 0) + 18;
      return { wrapped, h };
    });
    const itemsH = lineLayout.reduce((s, l) => s + l.h, 0) + 10;
    const footH = 78;
    const CONTENT_BEFORE_ITEMS = 220; // encabezado + panel nombre/entrega + label "TU PEDIDO"

    // La nota de envío exprés se mide igual que los nombres de producto arriba
    // — un texto fijo adivinado ("26px alcanza") es justo el bug que ya
    // encontramos con los precios: si el texto crece (como al agregarle el
    // costo del envío), se monta sobre el pie de página en vez de crecer con él.
    measure.setFont('helvetica', 'italic');
    measure.setFontSize(8.5);
    const expressNoteLines =
      input.deliveryType === 'envio-expres' ? (measure.splitTextToSize(EXPRESS_NOTE, RW) as string[]) : [];
    const noteH = expressNoteLines.length ? expressNoteLines.length * 11.5 + 14.5 : 6;
    const CONTENT_AFTER_ITEMS = 18 + 46 + 16 + noteH;
    // Altura al contenido real — sin piso artificial: un pedido corto da una
    // cinta corta, uno largo crece, ambos sin espacio muerto ni desborde.
    const H = CONTENT_BEFORE_ITEMS + itemsH + CONTENT_AFTER_ITEMS + footH;

    // jsPDF fuerza "portrait" por defecto: si el alto calculado da MENOR que
    // el ancho (pedidos de pocos productos, ahora que no hay piso mínimo de
    // altura), intercambia ancho/alto en silencio para mantener el portrait —
    // y todo el dibujo de abajo, que asume coordenadas absolutas en (W, H),
    // queda mal ubicado y cortado. Se fija la orientación explícita según las
    // dimensiones reales para que nunca haga ese intercambio.
    const doc = new jsPDF({ unit: 'px', format: [W, H], orientation: H >= W ? 'p' : 'l', hotfixes: ['px_scaling'] });
    const setOpacity = (o: number) => doc.setGState(new GState({ opacity: o }));

    // ---- fondo artístico de página completa ----
    const bg = this.bgForPdf(W, H);
    if (bg) {
      try {
        doc.addImage(bg, 'JPEG', 0, 0, W, H);
      } catch {
        /* noop */
      }
    } else {
      doc.setFillColor(...CREAM);
      doc.rect(0, 0, W, H, 'F');
    }
    // velo oscuro parejo para que el texto lea bien sobre la imagen sin perder
    // el fondo por completo (mismo principio que ya usamos en el menú web).
    setOpacity(0.14);
    doc.setFillColor(...INK);
    doc.rect(0, 0, W, H, 'F');
    setOpacity(1);

    // ---- encabezado ----
    doc.setFillColor(...INK);
    doc.rect(0, 0, W, 110, 'F');
    doc.setFillColor(...ACC);
    doc.rect(0, 110, W, 2.4, 'F');
    const mk = this.markForPdf();
    if (mk) {
      try {
        doc.addImage(mk.url, 'PNG', M, 22, mk.w, mk.h);
      } catch {
        /* noop */
      }
    }
    doc.setTextColor(...CREAM);
    doc.setFont('times', 'bold');
    doc.setFontSize(24);
    doc.text('Pedido', W - M, 42, { align: 'right' });
    const numT = 'N.º ' + orderNumber;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    const nw = doc.getTextWidth(numT) + 16;
    doc.setFillColor(...ACC);
    doc.roundedRect(W - M - nw, 52, nw, 19, 9.5, 9.5, 'F');
    doc.setTextColor(...INK);
    doc.text(numT, W - M - nw / 2, 64.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(205, 199, 180);
    doc.text(`${orderDate} · ${pad2(now.getHours())}:${pad2(now.getMinutes())}`, W - M, 88, { align: 'right' });

    // ---- panel: nombre + tipo de entrega ----
    const panel = (x: number, y: number, w: number, h: number, opacity = 0.93) => {
      setOpacity(opacity);
      doc.setFillColor(...CREAM);
      doc.roundedRect(x, y, w, h, 8, 8, 'F');
      setOpacity(1);
      doc.setDrawColor(...ACC);
      doc.setLineWidth(0.6);
      doc.roundedRect(x, y, w, h, 8, 8, 'D');
    };
    let cur = 130;
    panel(M, cur, RW, 58);
    const halfW = RW / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...OLIVE);
    doc.text('PEDIDO A NOMBRE DE', M + 14, cur + 18);
    doc.text('TIPO DE ENTREGA', M + halfW + 14, cur + 18);
    doc.setDrawColor(...ACC);
    doc.setLineWidth(0.5);
    doc.line(M + halfW, cur + 10, M + halfW, cur + 48);
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...INK);
    doc.text(input.customerName, M + 14, cur + 38);
    doc.setFontSize(12.5);
    doc.text(DELIVERY_LABELS[input.deliveryType], M + halfW + 14, cur + 38, { maxWidth: halfW - 24 });
    cur += 58 + 20;

    // ---- líneas del pedido ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...OLIVE);
    doc.setFillColor(...ACC);
    doc.rect(M, cur - 8.5, 3, 9, 'F');
    doc.text('TU PEDIDO', M + 9, cur);
    cur += 12;

    panel(M, cur, RW, itemsH);

    let ly = cur + 20;
    input.lines.forEach((l, i) => {
      const { wrapped, h } = lineLayout[i];
      doc.setFont('times', 'normal');
      doc.setFontSize(11.5);
      doc.setTextColor(...INK);
      doc.text(wrapped, M + 14, ly);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...ACC);
      doc.text(`${l.qty}× ${pdfPrice(l.item.price)}`, W - M - 14, ly, { align: 'right' });
      if (l.option) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...ACCD);
        doc.text(l.option, M + 14, ly + wrapped.length * 13 + 2);
      }
      const rowEnd = ly + h - 18;
      if (i < input.lines.length - 1) {
        setOpacity(0.12);
        doc.setDrawColor(...INK);
        doc.setLineWidth(0.5);
        doc.line(M + 14, rowEnd, W - M - 14, rowEnd);
        setOpacity(1);
      }
      ly += h;
    });
    cur += itemsH + 18;

    // ---- total ----
    panel(M, cur, RW, 46);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...SUB);
    doc.text('TOTAL', M + 16, cur + 27);
    doc.setFont('times', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...ACC);
    doc.text(pdfPrice(input.total), W - M - 16, cur + 30, { align: 'right' });
    cur += 46 + 16;

    if (expressNoteLines.length) {
      // INK (no CREAM) — este bloque cae directo sobre el fondo artístico
      // claro, no sobre una franja oscura como el encabezado/pie; un texto
      // casi blanco ahí se pierde por completo.
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(...INK);
      doc.text(expressNoteLines, M, cur);
    }

    // ---- pie ----
    doc.setFillColor(...OLIVED);
    doc.rect(0, H - footH, W, footH, 'F');
    doc.setFillColor(...ACC);
    doc.rect(0, H - footH, W, 2, 'F');
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(11.5);
    doc.setTextColor(...ACC);
    doc.text('Pan hecho con tiempo, horneado con oficio.', M, H - footH + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(210, 214, 195);
    doc.text(CONTACT.direccion, M, H - footH + 40);
    doc.text(CONTACT.horario, M, H - footH + 53);
    doc.text(`WhatsApp ${CONTACT.waDisplay}`, M, H - footH + 66);

    const filename = `Pedido-Bolleria-${orderNumber}.pdf`;
    const blob = doc.output('blob') as Blob;
    const order: GeneratedOrder = {
      orderNumber,
      orderDate,
      filename,
      url: URL.createObjectURL(blob),
      blob,
      save: () => doc.save(filename),
    };
    this.lastOrder = order;
    return order;
  }
}
