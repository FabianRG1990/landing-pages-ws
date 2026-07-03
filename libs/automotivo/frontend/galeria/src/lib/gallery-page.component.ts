import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  AutomotivoStore,
  BRAND,
  GALLERY_CATEGORIES,
  GALLERY_ITEMS,
  IconComponent,
} from '@automotivo-ui-shared';

const CAT_ICONS: Record<string, string[]> = {
  todos: ['M4 5h7v7H4z', 'M13 5h7v4h-7z', 'M13 11h7v4h-7z', 'M4 14h7v5H4z', 'M13 17h7v2h-7z'],
  mecanica: ['M14.7 6.3a3.5 3.5 0 00-4.7 4.5l-6.3 6.3a1.8 1.8 0 002.5 2.5l6.3-6.3a3.5 3.5 0 004.5-4.7l-2 2-2-.5-.5-2 2-2z', 'M15.5 15.5l3.5 3.5'],
  scanner: ['M2.5 4.5h19v12h-19z', 'M6 20h12M12 16.5V20', 'M6 10.5l2.5-2 2 3 2-4 2 3H18'],
  frenos: ['M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17z', 'M12 9a3 3 0 100 6 3 3 0 000-6z'],
  aire: ['M12 3v18', 'M4.5 7.5l15 9', 'M19.5 7.5l-15 9', 'M9 4l3 2 3-2', 'M9 20l3-2 3 2'],
  equipo: ['M9 11a3 3 0 100-6 3 3 0 000 6z', 'M15.5 11a2.5 2.5 0 100-5 2.5 2.5 0 000 5z', 'M3 19a6 6 0 0112 0', 'M15 13.5a5 5 0 016 5.5'],
};
// proporciones reales de foto (nada de franjas raras)
const COLLAGE = ['s-2x2', 's-2x2', 's-2x3', 's-3x2', 's-2x2', 's-2x3'];

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
  readonly ig = BRAND.instagram;
  readonly fb = BRAND.facebook;

  readonly filter = this.store.galFilter;

  readonly filters = [{ key: 'todos', label: 'Todos' }, ...GALLERY_CATEGORIES].map((c) => ({
    ...c,
    icon: CAT_ICONS[c.key] ?? CAT_ICONS['todos'],
    count: c.key === 'todos' ? GALLERY_ITEMS.length : GALLERY_ITEMS.filter((g) => g.category === c.key).length,
  }));

  readonly catLabel = (key: string) => GALLERY_CATEGORIES.find((c) => c.key === key)?.label ?? '';

  readonly tiles = computed(() => {
    let p = 0;
    return this.store.visibleGallery().map((g, vi) => ({
      ...g,
      label: this.catLabel(g.category),
      span: g.featured ? 's-feat' : COLLAGE[p++ % COLLAGE.length],
      delay: (vi * 0.045).toFixed(2) + 's',
    }));
  });

  setFilter = this.store.setFilter;
}
