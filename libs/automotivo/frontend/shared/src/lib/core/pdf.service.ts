import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { AppointmentForm, GeneratedOrder } from './models';
import { BRAND } from './brand';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESAB = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const RED: [number, number, number] = [225, 29, 46];
const INK: [number, number, number] = [28, 28, 32];
const SUB: [number, number, number] = [120, 122, 130];
const PANEL: [number, number, number] = [247, 248, 250];
const PLINE: [number, number, number] = [228, 229, 234];

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Genera la "Orden de Cita" en PDF con la identidad de Automotivo.
 * Portado de la versión web (jsPDF). La firma de datos es {@link AppointmentForm}.
 */
@Injectable({ providedIn: 'root' })
export class PdfService {
  /** última orden generada, para descargar / enviar por WhatsApp */
  lastOrder: GeneratedOrder | null = null;

  private logoData: { url: string; w: number; h: number } | null = null;
  private logoImg: HTMLImageElement | null = null;

  constructor() {
    // precargamos + reescalamos el logo para no incrustar un PNG gigante en el PDF
    if (typeof Image !== 'undefined') {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => (this.logoImg = im);
      im.src = 'assets/automotivo-logo.png';
    }
  }

  private logoForPdf(): { url: string; w: number; h: number } | null {
    if (this.logoData) return this.logoData;
    const im = this.logoImg;
    if (!im || !im.complete || !im.naturalWidth) return null;
    const h = 170;
    const w = Math.round((im.naturalWidth / im.naturalHeight) * h);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d')!.drawImage(im, 0, 0, w, h);
    this.logoData = { url: c.toDataURL('image/png'), w, h };
    return this.logoData;
  }

  /** Texto pre-armado para enviar por WhatsApp junto al PDF. */
  whatsappText(f: AppointmentForm): string {
    const L = ['*Solicitud de cita — Automotivo*'];
    if (this.lastOrder) L.push('Folio: ' + this.lastOrder.folio);
    if (f.nombre) L.push('Nombre: ' + f.nombre);
    if (f.tel) L.push('Teléfono: ' + f.tel);
    const veh = [f.marca, f.anio].filter(Boolean).join(' ');
    if (veh) L.push('Vehículo: ' + veh + (f.placa ? ' · Placa ' + f.placa : ''));
    if (f.fecha) {
      const t = [f.periodo, f.hora].filter(Boolean).join(' ');
      L.push('Fecha preferida: ' + f.fecha.split('-').reverse().join('/') + (t ? ` (${t})` : ''));
    }
    if (f.servicios.length) L.push('Servicios: ' + f.servicios.join(', '));
    if (f.detalle) L.push('Detalle: ' + f.detalle);
    L.push('', '(Adjunto la orden de cita en PDF)');
    return `https://wa.me/${BRAND.whatsappRaw}?text=${encodeURIComponent(L.join('\n'))}`;
  }

  buildOrder(f: AppointmentForm): GeneratedOrder {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, M = 16, RW = W - 2 * M;
    const now = new Date();
    const folio =
      'AUT-' + now.getFullYear() + pad2(now.getMonth() + 1) + pad2(now.getDate()) +
      '-' + (Math.floor(Math.random() * 9000) + 1000);
    const horaTxt = [f.periodo, f.hora].filter(Boolean).join(' · ');

    // ---- encabezado ----
    doc.setFillColor(20, 20, 24);
    doc.rect(0, 0, W, 37, 'F');
    doc.setFillColor(...RED);
    doc.rect(0, 37, W, 1.6, 'F');
    const lg = this.logoForPdf();
    if (lg) {
      const h = 20, w = (lg.w / lg.h) * h;
      try { doc.addImage(lg.url, 'PNG', M, 9, w, h); } catch { /* noop */ }
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text('ORDEN DE CITA', W - M, 16, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const folioT = 'Folio ' + folio;
    const fw = doc.getTextWidth(folioT) + 8;
    doc.setDrawColor(90, 92, 98);
    doc.setLineWidth(0.3);
    doc.roundedRect(W - M - fw, 20.5, fw, 7, 3.5, 3.5, 'D');
    doc.setTextColor(210, 211, 216);
    doc.text(folioT, W - M - fw / 2, 25.3, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setTextColor(150, 151, 158);
    doc.text(
      `Emitida ${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()} · ${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
      W - M, 33, { align: 'right' },
    );

    // ---- helpers ----
    const secHead = (y: number, t: string) => {
      doc.setFillColor(...RED);
      doc.rect(M, y - 3.2, 2.6, 3.6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(t.toUpperCase(), M + 5.5, y);
    };
    const panel = (x: number, y: number, w: number, h: number) => {
      doc.setFillColor(...PANEL);
      doc.roundedRect(x, y, w, h, 3, 3, 'F');
      doc.setDrawColor(...PLINE);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, w, h, 3, 3, 'D');
    };
    const infoCard = (x: number, y: number, w: number, title: string, rows: [string, string][]) => {
      const h = 15 + rows.length * 12.5;
      panel(x, y, w, h);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...RED);
      doc.text(title.toUpperCase(), x + 7, y + 8.5);
      let fy = y + 17.5;
      for (const [lab, val] of rows) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.6);
        doc.setTextColor(...SUB);
        doc.text(lab.toUpperCase(), x + 7, fy);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...INK);
        doc.text(val && String(val).trim() ? String(val) : '—', x + 7, fy + 5);
        doc.setDrawColor(233, 234, 238);
        doc.setLineWidth(0.15);
        doc.line(x + 7, fy + 7.6, x + w - 7, fy + 7.6);
        fy += 12.5;
      }
      return h;
    };
    const colW = (RW - 8) / 2, x2 = M + colW + 8;

    // ---- destacado de la cita ----
    doc.setFillColor(252, 242, 242);
    doc.roundedRect(M, 46, RW, 30, 3.5, 3.5, 'F');
    doc.setDrawColor(242, 208, 208);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, 46, RW, 30, 3.5, 3.5, 'D');
    doc.setFillColor(...RED);
    doc.rect(M, 46, 2.6, 30, 'F');
    let fechaBig = 'Por definir';
    if (f.fecha) {
      const pp = f.fecha.split('-');
      const dt = new Date(+pp[0], +pp[1] - 1, +pp[2]);
      fechaBig = `${DIAS[dt.getDay()]} ${+pp[2]} ${MESAB[+pp[1] - 1]} ${pp[0]}`;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...RED);
    doc.text('FECHA DE LA CITA', M + 9, 55);
    doc.setFontSize(15);
    doc.setTextColor(...INK);
    doc.text(fechaBig, M + 9, 65.5);
    doc.setDrawColor(236, 206, 206);
    doc.setLineWidth(0.4);
    doc.line(M + RW * 0.56, 51, M + RW * 0.56, 71);
    doc.setFontSize(7);
    doc.setTextColor(...RED);
    doc.text('HORARIO PREFERIDO', M + RW * 0.56 + 7, 55);
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text(horaTxt || 'Por definir', M + RW * 0.56 + 7, 65.5);
    const stT = 'PENDIENTE';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    const sw = doc.getTextWidth(stT) + 10;
    doc.setFillColor(...RED);
    doc.roundedRect(W - M - sw - 4, 50, sw, 7.5, 3.75, 3.75, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(stT, W - M - 4 - sw / 2, 54.9, { align: 'center' });

    // ---- cliente + vehículo ----
    const hC = infoCard(M, 82, colW, 'Cliente', [
      ['Nombre completo', f.nombre],
      ['Teléfono / WhatsApp', f.tel],
      ['Correo electrónico', f.correo],
    ]);
    const hV = infoCard(x2, 82, colW, 'Vehículo', [
      ['Marca y modelo', f.marca],
      ['Año', f.anio],
      ['Placa', f.placa],
    ]);
    let cur = 82 + Math.max(hC, hV) + 12;

    // ---- servicios (pills) ----
    secHead(cur, 'Servicios solicitados');
    cur += 5;
    const sel = f.servicios;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    let px = M + 7, rowN = 0;
    const maxx = W - M - 7;
    const layout: { n: string; x: number; row: number; pw: number }[] = [];
    if (sel.length) {
      for (const n of sel) {
        const pw = doc.getTextWidth(n) + 12;
        if (px + pw > maxx && px > M + 7) { px = M + 7; rowN++; }
        layout.push({ n, x: px, row: rowN, pw });
        px += pw + 5;
      }
    }
    const rows = sel.length ? rowN + 1 : 1;
    const svcH = sel.length ? rows * 11 + 8 : 16;
    panel(M, cur, RW, svcH);
    if (sel.length) {
      for (const p of layout) {
        const py = cur + 9 + p.row * 11;
        doc.setFillColor(...RED);
        doc.roundedRect(p.x, py - 5.2, p.pw, 8, 4, 4, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(p.n, p.x + 6, py);
      }
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(...SUB);
      doc.text('Por confirmar con el cliente.', M + 7, cur + 10);
    }
    cur += svcH + 11;

    // ---- notas ----
    secHead(cur, 'Descripción / notas');
    cur += 5;
    panel(M, cur, RW, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(64, 64, 70);
    const notes = f.detalle && f.detalle.trim() ? f.detalle.trim() : 'Sin observaciones.';
    doc.text(doc.splitTextToSize(notes, RW - 14).slice(0, 3), M + 7, cur + 8);
    cur += 26 + 14;

    // ---- firmas ----
    doc.setDrawColor(180, 182, 188);
    doc.setLineWidth(0.3);
    doc.line(M, cur, M + colW - 8, cur);
    doc.line(x2, cur, x2 + colW - 8, cur);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...SUB);
    doc.text('RECIBIDO POR (AUTOMOTIVO)', M, cur + 4);
    doc.text('FECHA DE INGRESO', x2, cur + 4);

    // ---- ¿qué sigue? ----
    const ny = cur + 16;
    doc.setFillColor(250, 244, 244);
    doc.roundedRect(M, ny, RW, 25, 3, 3, 'F');
    doc.setDrawColor(242, 214, 214);
    doc.setLineWidth(0.2);
    doc.roundedRect(M, ny, RW, 25, 3, 3, 'D');
    doc.setFillColor(...RED);
    doc.rect(M, ny, 2.6, 25, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...RED);
    doc.text('¿QUÉ SIGUE?', M + 8, ny + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(70, 72, 80);
    doc.text('Te confirmamos disponibilidad por WhatsApp. Presentá esta orden al llegar al taller.', M + 8, ny + 14.5);
    doc.setFontSize(7.8);
    doc.setTextColor(...SUB);
    doc.text('Atención Lun–Vie 8:00 a. m. – 6:00 p. m.  ·  Sábados y domingos cerrado.', M + 8, ny + 20);

    // ---- pie ----
    doc.setFillColor(15, 15, 18);
    doc.rect(0, 282, W, 15, 'F');
    doc.setFillColor(...RED);
    doc.rect(0, 282, W, 1, 'F');
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(10.5);
    doc.setTextColor(...RED);
    doc.text('Nuestro motivo sos vos.', M, 289.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    doc.setTextColor(180, 180, 186);
    doc.text('Santo Domingo · San Miguel, Heredia, CR', M, 293.8);
    doc.text('WhatsApp 8455-9609   ·   Tel 4419-5703', W - M, 289.5, { align: 'right' });
    doc.text('servicioautomotivo@gmail.com   ·   @automotivocr', W - M, 293.8, { align: 'right' });

    const filename = 'Cita-Automotivo-' + folio + '.pdf';
    const order: GeneratedOrder = {
      folio,
      filename,
      url: doc.output('bloburl') as unknown as string,
      save: () => doc.save(filename),
    };
    this.lastOrder = order;
    return order;
  }
}
