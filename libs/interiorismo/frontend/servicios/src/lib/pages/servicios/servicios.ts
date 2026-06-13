import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '@interiorismo-ui-shared';

/** Servicios — especialidades del estudio en filas editoriales. */
@Component({
  selector: 'app-servicios-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './servicios.html',
})
export class ServiciosPage {
  protected readonly services = [
    {
      num: '01',
      title: 'Diseño residencial',
      body: 'Arquitectura interior llave en mano para residencias privadas: desde el concepto espacial inicial hasta la instalación final. Coordinamos cada decisión — distribución, diseño de iluminación, paleta de materiales, carpintería a medida y disposición del mobiliario.',
    },
    {
      num: '02',
      title: 'Mobiliario a medida',
      body: 'Diseño de mueble propio y abastecimiento textil internacional. Trabajamos con artesanos en Oaxaca, Marrakech, Kioto y Vicenza para producir piezas únicas que responden a la proporción y el carácter específico de cada espacio.',
    },
    {
      num: '03',
      title: 'Consultoría espacial',
      body: 'Desarrollo conceptual, planificación espacial y dirección de materia para clientes que quieren ejecutar con su propio equipo. Pensado para arquitectos y promotoras que buscan una visión depurada sin contratar el servicio integral.',
    },
  ];
}
