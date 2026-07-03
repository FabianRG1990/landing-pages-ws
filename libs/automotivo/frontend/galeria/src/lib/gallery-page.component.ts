import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AutomotivoStore, BRAND, IconComponent } from '@automotivo-ui-shared';

/** Pantalla "Galería" — transcripción fiel del artefacto original. */
const GAL_CATS = [
  { k: 'mecanica', label: 'Mecánica' },
  { k: 'scanner', label: 'Escáner' },
  { k: 'frenos', label: 'Frenos' },
  { k: 'aire', label: 'Aire acondicionado' },
  { k: 'equipo', label: 'Nuestro equipo' },
];
const GAL_ITEMS = [
  { cat: 'mecanica', src: 'assets/mecanica-general.jpg', big: true },
  { cat: 'mecanica', src: '' },
  { cat: 'mecanica', src: '' },
  { cat: 'scanner', src: 'assets/scanner.jpg', big: true },
  { cat: 'scanner', src: '' },
  { cat: 'frenos', src: 'assets/frenos.jpg', big: true },
  { cat: 'frenos', src: '' },
  { cat: 'aire', src: 'assets/aire.jpg', big: true },
  { cat: 'aire', src: '' },
  { cat: 'equipo', src: 'assets/equipo.jpg', big: true },
  { cat: 'equipo', src: '' },
];
const CAT_ICONS: Record<string, string[]> = {
  todos: ['M4 5h7v7H4z', 'M13 5h7v4h-7z', 'M13 11h7v4h-7z', 'M4 14h7v5H4z', 'M13 17h7v2h-7z'],
  mecanica: ['M14.7 6.3a3.5 3.5 0 00-4.7 4.5l-6.3 6.3a1.8 1.8 0 002.5 2.5l6.3-6.3a3.5 3.5 0 004.5-4.7l-2 2-2-.5-.5-2 2-2z', 'M15.5 15.5l3.5 3.5'],
  scanner: ['M2.5 4.5h19v12h-19z', 'M6 20h12M12 16.5V20', 'M6 10.5l2.5-2 2 3 2-4 2 3H18'],
  frenos: ['M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17z', 'M12 9a3 3 0 100 6 3 3 0 000-6z'],
  aire: ['M12 3v18', 'M4.5 7.5l15 9', 'M19.5 7.5l-15 9', 'M9 4l3 2 3-2', 'M9 20l3-2 3 2'],
  equipo: ['M9 11a3 3 0 100-6 3 3 0 000 6z', 'M15.5 11a2.5 2.5 0 100-5 2.5 2.5 0 000 5z', 'M3 19a6 6 0 0112 0', 'M15 13.5a5 5 0 016 5.5'],
};
const FEAT_WRAP = 'grid-column:span 3;grid-row:span 2';
const COLLAGE = ['grid-column:span 2;grid-row:span 2', 'grid-column:span 2;grid-row:span 2', 'grid-column:span 2;grid-row:span 3', 'grid-column:span 3;grid-row:span 2', 'grid-column:span 2;grid-row:span 2', 'grid-column:span 2;grid-row:span 3'];
const TAG_STYLE = "position:absolute;left:12px;bottom:12px;z-index:2;display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:100px;background:rgba(10,10,12,.72);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.14);font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:700;text-transform:uppercase;font-size:12px;letter-spacing:.02em;color:#fff";

@Component({
  selector: 'amv-gallery-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './gallery-page.component.html',
  styleUrl: './gallery-page.component.scss',
})
export class GalleryPageComponent {
  private readonly store = inject(AutomotivoStore);
  readonly filter = this.store.galFilter;
  readonly igLink = BRAND.instagram;
  readonly fbLink = BRAND.facebook;

  readonly kicker = "display:inline-flex;align-items:center;gap:12px;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#e6e8ec";
  readonly h2Style = "margin:14px 0 0;font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:700;text-transform:uppercase;font-size:clamp(30px,4.6vw,60px);line-height:.98;letter-spacing:.005em";
  readonly lead = "max-width:600px;margin:22px 0 0;font-family:'Manrope',sans-serif;font-size:17px;line-height:1.7;color:#a9adb3";
  readonly tagStyle = TAG_STYLE;

  private readonly catLabelOf = (k: string) => GAL_CATS.find((c) => c.k === k)?.label ?? '';

  readonly galFilters = computed(() => {
    const gf = this.filter() || 'todos';
    return [{ k: 'todos', label: 'Todos' }, ...GAL_CATS].map((c) => {
      const active = gf === c.k;
      const count = c.k === 'todos' ? GAL_ITEMS.length : GAL_ITEMS.filter((x) => x.cat === c.k).length;
      return {
        k: c.k, label: c.label, count, active, icon: CAT_ICONS[c.k] ?? CAT_ICONS['todos'],
        style: 'display:inline-flex;align-items:center;gap:8px;padding:9px 15px;border-radius:100px;cursor:pointer;font-family:\'Manrope\',sans-serif;font-weight:700;font-size:13.5px;transition:all .18s;border:1px solid ' + (active ? 'transparent' : 'rgba(255,255,255,.13)') + ';background:' + (active ? 'linear-gradient(135deg,#FF3B41,#E11D2E 60%,#B00D1B)' : 'rgba(255,255,255,.03)') + ';color:' + (active ? '#fff' : '#c3c6cc') + (active ? ';box-shadow:0 10px 24px rgba(225,29,46,.34)' : ''),
        countStyle: 'display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:100px;font-size:11.5px;font-weight:700;background:' + (active ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.07)') + ';color:' + (active ? '#fff' : '#9a9da3'),
      };
    });
  });

  readonly galleryVisible = computed(() => {
    const gf = this.filter() || 'todos';
    let patI = 0;
    return GAL_ITEMS.map((it, i) => ({ ...it, i }))
      .filter((it) => gf === 'todos' || it.cat === gf)
      .map((it, vi) => ({
        id: 'gal-' + it.i, src: it.src || '', catLabel: this.catLabelOf(it.cat),
        wrap: (it.big ? FEAT_WRAP : COLLAGE[(patI++) % COLLAGE.length]) + ';animation-delay:' + (vi * 0.045).toFixed(2) + 's',
      }));
  });

  setFilter(k: string): void { this.store.setFilter(k); }
}
