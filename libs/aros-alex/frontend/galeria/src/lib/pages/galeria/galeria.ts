import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  BeforeAfter,
  COPY,
  GALLERY,
  GALLERY_FILTERS,
  Icon,
  LanguageStore,
  RevealDirective,
} from '@aros-alex-ui-shared';

/** 03 · Galería — comparadores antes / después filtrables por disciplina. */
@Component({
  selector: 'app-galeria-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective, BeforeAfter, Icon],
  templateUrl: './galeria.html',
})
export class GaleriaPage {
  protected readonly L = inject(LanguageStore);
  protected readonly copy = COPY;
  protected readonly filters = GALLERY_FILTERS;

  protected readonly active = signal('todos');
  protected readonly items = computed(() => {
    const f = this.active();
    return f === 'todos' ? GALLERY : GALLERY.filter((g) => g.category === f);
  });
}
