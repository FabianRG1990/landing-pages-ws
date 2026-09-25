import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Las tres páginas de programa se prerenderizan por nombre.
    path: 'programa/:programa',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => [
      { programa: 'board' },
      { programa: 'evolution' },
      { programa: 'investment' },
    ],
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
