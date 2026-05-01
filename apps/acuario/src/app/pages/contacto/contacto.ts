import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  phosphorArrowUpRightBold,
  phosphorPaperPlaneTiltBold,
} from '@ng-icons/phosphor-icons/bold';
import {
  phosphorClockDuotone,
  phosphorEnvelopeSimpleDuotone,
  phosphorMapPinDuotone,
  phosphorPhoneDuotone,
} from '@ng-icons/phosphor-icons/duotone';

import { DepthTransition } from '../../sections/depth-transition/depth-transition';
import { PageHeader } from '../../ui/page-header/page-header';
import { RevealDirective } from '../../ui/reveal/reveal.directive';

interface Channel {
  iconName: string;
  label: string;
  value: string;
  helper: string;
  href: string;
  accent: 'lagoon' | 'bioluminescent' | 'kelp';
}

interface Department {
  code: string;
  title: string;
  body: string;
  contact: string;
}

interface Hour {
  day: string;
  hours: string;
}

const CHANNELS: ReadonlyArray<Channel> = [
  {
    iconName: 'phosphorEnvelopeSimpleDuotone',
    label: 'Escríbenos',
    value: 'hola@aquarium.cr',
    helper: 'Respuesta promedio · 14 minutos',
    href: 'mailto:hola@aquarium.cr',
    accent: 'lagoon',
  },
  {
    iconName: 'phosphorPhoneDuotone',
    label: 'Llámanos',
    value: '+506 2287 1992',
    helper: 'Lunes a domingo · 08:00 — 21:00',
    href: 'tel:+50622871992',
    accent: 'bioluminescent',
  },
  {
    iconName: 'phosphorMapPinDuotone',
    label: 'Visítanos',
    value: 'Paseo Marítimo 1492',
    helper: "San José · 09°56'N · 84°08'W",
    href: '#mapa',
    accent: 'kelp',
  },
];

const DEPARTMENTS: ReadonlyArray<Department> = [
  {
    code: 'DEP-01',
    title: 'Reservas y entradas',
    body: 'Olas, grupos, escuelas y eventos privados.',
    contact: 'reservas@aquarium.cr',
  },
  {
    code: 'DEP-02',
    title: 'Prensa y comunicación',
    body: 'Solicitudes editoriales, fotografía profesional, entrevistas.',
    contact: 'prensa@aquarium.cr',
  },
  {
    code: 'DEP-03',
    title: 'Investigación y datos',
    body: 'Acceso a publicaciones, datasets abiertos y colaboraciones científicas.',
    contact: 'ciencia@aquarium.cr',
  },
  {
    code: 'DEP-04',
    title: 'Patronato y donaciones',
    body: 'Membresías fundadoras, financiamiento de programas y reservas marinas.',
    contact: 'patronato@aquarium.cr',
  },
];

const HOURS: ReadonlyArray<Hour> = [
  { day: 'Lunes — Jueves', hours: '10:00 — 19:30' },
  { day: 'Viernes', hours: '10:00 — 22:00 · Noche bioluminiscente' },
  { day: 'Sábado — Domingo', hours: '09:00 — 21:00' },
];

/**
 * ContactoPage — header + 3 canales (mail/tel/lugar) + form editorial con
 * sidebar de horarios + 4 departamentos especializados + bloque mapa.
 */
@Component({
  selector: 'app-contacto-page',
  imports: [DepthTransition, NgIcon, PageHeader, RevealDirective],
  providers: [
    provideIcons({
      phosphorArrowUpRightBold,
      phosphorClockDuotone,
      phosphorEnvelopeSimpleDuotone,
      phosphorMapPinDuotone,
      phosphorPaperPlaneTiltBold,
      phosphorPhoneDuotone,
    }),
  ],
  templateUrl: './contacto.html',
  styleUrl: './contacto.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactoPage {
  protected readonly channels = CHANNELS;
  protected readonly departments = DEPARTMENTS;
  protected readonly hours = HOURS;
}
