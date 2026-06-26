import { Injectable, signal } from '@angular/core';

/**
 * Estado del selector de app de mapas. Vive a nivel app (no dentro de `<main>`,
 * que crea un stacking context propio) para que la hoja se pinte por encima del
 * nav flotante. La página de contacto llama `present()`; el shell renderiza un
 * único `<app-map-chooser>` que lee este estado.
 */
@Injectable({ providedIn: 'root' })
export class MapSheet {
  readonly open = signal(false);
  readonly query = signal('');
  readonly webUrl = signal('');

  present(query: string, webUrl: string): void {
    this.query.set(query);
    this.webUrl.set(webUrl);
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
  }
}
