import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '@interiorismo-ui-shared';

/** Proyectos — obra seleccionada en una grilla bento. */
@Component({
  selector: 'app-proyectos-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './proyectos.html',
})
export class ProyectosPage {
  protected readonly projects = [
    {
      seed: 'almagro-residencia',
      w: 1200,
      h: 700,
      ratio: 'ratio-wide',
      span: true,
      alt: 'Sala principal de Residencia Almagro',
      loc: 'Madrid · 320 m²',
      title: 'Residencia Almagro',
    },
    {
      seed: 'casa-tepoztlan',
      w: 700,
      h: 900,
      ratio: 'ratio-tall',
      span: false,
      alt: 'Patio de Casa Tepoztlán',
      loc: 'Morelos, MX · 480 m²',
      title: 'Casa Tepoztlán',
    },
    {
      seed: 'recoleta-apto',
      w: 700,
      h: 900,
      ratio: 'ratio-tall',
      span: false,
      alt: 'Comedor de Apartamento Recoleta',
      loc: 'Buenos Aires · 270 m²',
      title: 'Apartamento Recoleta',
    },
    {
      seed: 'eixample-atico',
      w: 1200,
      h: 700,
      ratio: 'ratio-wide',
      span: true,
      alt: 'Terraza de Ático del Eixample con vista a Barcelona',
      loc: 'Barcelona · 240 m²',
      title: 'Ático del Eixample',
    },
  ];
}
