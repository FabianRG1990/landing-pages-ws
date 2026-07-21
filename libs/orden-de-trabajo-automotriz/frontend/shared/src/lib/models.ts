// Modelo de dominio de la app orden-de-trabajo-automotriz.
//
// Una orden de trabajo representa UN vehículo recibido. Puede necesitar
// Mecánica, Pintura, o ambas a la vez (ej. colisión con daño estructural y de
// carrocería): cada área tiene su propio sub-flujo, con estados, técnico,
// servicios y repuestos independientes entre sí.

export interface Cliente {
  nombre: string;
  telefono: string;
  correo?: string;
  identificacion?: string;
}

export interface Vehiculo {
  placa: string;
  marca: string;
  modelo: string;
  anio: string;
  color?: string;
  vin?: string;
  kilometrajeIngreso?: number;
  nivelCombustible?: NivelCombustible;
  llavesEntregadas?: number;
  pertenencias?: string;
  danosPrevios?: string;
}

export type NivelCombustible =
  | 'vacio'
  | 'un-cuarto'
  | 'medio'
  | 'tres-cuartos'
  | 'lleno';

export const NIVELES_COMBUSTIBLE: { value: NivelCombustible; label: string }[] = [
  { value: 'vacio', label: 'Vacío' },
  { value: 'un-cuarto', label: '1/4' },
  { value: 'medio', label: '1/2' },
  { value: 'tres-cuartos', label: '3/4' },
  { value: 'lleno', label: 'Lleno' },
];

export type Area = 'mecanica' | 'pintura';

export const AREAS: { value: Area; label: string }[] = [
  { value: 'mecanica', label: 'Mecánica' },
  { value: 'pintura', label: 'Pintura' },
];

export type EstadoMecanica =
  | 'recibido'
  | 'diagnostico'
  | 'esperando-aprobacion'
  | 'en-reparacion'
  | 'esperando-repuestos'
  | 'listo-entrega'
  | 'entregado'
  | 'cancelado';

export const ESTADOS_MECANICA: { value: EstadoMecanica; label: string }[] = [
  { value: 'recibido', label: 'Recibido' },
  { value: 'diagnostico', label: 'En diagnóstico' },
  { value: 'esperando-aprobacion', label: 'Esperando aprobación' },
  { value: 'en-reparacion', label: 'En reparación' },
  { value: 'esperando-repuestos', label: 'Esperando repuestos' },
  { value: 'listo-entrega', label: 'Listo para entrega' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
];

export type EstadoPintura =
  | 'recibido'
  | 'desarme'
  | 'preparacion'
  | 'cabina-pintura'
  | 'curado'
  | 'reensamble'
  | 'detallado'
  | 'listo-entrega'
  | 'entregado'
  | 'cancelado';

export const ESTADOS_PINTURA: { value: EstadoPintura; label: string }[] = [
  { value: 'recibido', label: 'Recibido' },
  { value: 'desarme', label: 'Desarme' },
  { value: 'preparacion', label: 'Preparación' },
  { value: 'cabina-pintura', label: 'Cabina de pintura' },
  { value: 'curado', label: 'Curado' },
  { value: 'reensamble', label: 'Reensamble' },
  { value: 'detallado', label: 'Detallado' },
  { value: 'listo-entrega', label: 'Listo para entrega' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
];

export function estadoMecanicaLabel(estado: EstadoMecanica): string {
  return ESTADOS_MECANICA.find((e) => e.value === estado)?.label ?? estado;
}

export function estadoPinturaLabel(estado: EstadoPintura): string {
  return ESTADOS_PINTURA.find((e) => e.value === estado)?.label ?? estado;
}

export interface LineaServicio {
  descripcion: string;
  horas: number;
  tarifaHora: number;
}

export interface LineaRepuesto {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

/** Sub-flujo de una orden dentro de un área (Mecánica o Pintura). */
export interface SubOrdenArea<TEstado> {
  estado: TEstado;
  tecnicoAsignado?: string;
  fechaEstimadaEntrega?: string;
  fechaRealEntrega?: string;
  diagnostico?: string;
  servicios: LineaServicio[];
  repuestos: LineaRepuesto[];
  notasInternas?: string;
}

export type SubOrdenMecanica = SubOrdenArea<EstadoMecanica>;
export type SubOrdenPintura = SubOrdenArea<EstadoPintura>;

export interface OrdenTrabajo {
  numero: string;
  cliente: Cliente;
  vehiculo: Vehiculo;
  fechaIngreso: string;
  asesor?: string;
  motivoIngreso: string;
  autorizacionCliente?: {
    nombre: string;
    fecha: string;
  };
  areas: {
    mecanica?: SubOrdenMecanica;
    pintura?: SubOrdenPintura;
  };
}

export function areasDeOrden(orden: OrdenTrabajo): Area[] {
  return AREAS.map((a) => a.value).filter((area) => !!orden.areas[area]);
}

export const IVA = 0.13;

export function subtotalSubOrden(sub: SubOrdenArea<unknown> | undefined): number {
  if (!sub) return 0;
  const servicios = sub.servicios.reduce((sum, s) => sum + s.horas * s.tarifaHora, 0);
  const repuestos = sub.repuestos.reduce(
    (sum, r) => sum + r.cantidad * r.precioUnitario,
    0,
  );
  return servicios + repuestos;
}

export function subtotalOrden(orden: OrdenTrabajo): number {
  return subtotalSubOrden(orden.areas.mecanica) + subtotalSubOrden(orden.areas.pintura);
}

export function totalOrden(orden: OrdenTrabajo): number {
  return subtotalOrden(orden) * (1 + IVA);
}
