// Modelo de dominio de la app orden-de-trabajo-automotriz.

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

export type EstadoOrden =
  | 'recibido'
  | 'diagnostico'
  | 'esperando-aprobacion'
  | 'en-reparacion'
  | 'esperando-repuestos'
  | 'listo-entrega'
  | 'entregado'
  | 'cancelado';

export const ESTADOS_ORDEN: { value: EstadoOrden; label: string }[] = [
  { value: 'recibido', label: 'Recibido' },
  { value: 'diagnostico', label: 'En diagnóstico' },
  { value: 'esperando-aprobacion', label: 'Esperando aprobación del cliente' },
  { value: 'en-reparacion', label: 'En reparación' },
  { value: 'esperando-repuestos', label: 'Esperando repuestos' },
  { value: 'listo-entrega', label: 'Listo para entrega' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
];

export function estadoLabel(estado: EstadoOrden): string {
  return ESTADOS_ORDEN.find((e) => e.value === estado)?.label ?? estado;
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

export interface OrdenTrabajo {
  numero: string;
  cliente: Cliente;
  vehiculo: Vehiculo;
  fechaIngreso: string;
  fechaEstimadaEntrega?: string;
  fechaRealEntrega?: string;
  estado: EstadoOrden;
  asesor?: string;
  tecnicoAsignado?: string;
  motivoIngreso: string;
  diagnostico?: string;
  servicios: LineaServicio[];
  repuestos: LineaRepuesto[];
  autorizacionCliente?: {
    nombre: string;
    fecha: string;
  };
  notasInternas?: string;
}

export const IVA = 0.13;

export function subtotalServicios(orden: OrdenTrabajo): number {
  return orden.servicios.reduce((sum, s) => sum + s.horas * s.tarifaHora, 0);
}

export function subtotalRepuestos(orden: OrdenTrabajo): number {
  return orden.repuestos.reduce(
    (sum, r) => sum + r.cantidad * r.precioUnitario,
    0,
  );
}

export function totalOrden(orden: OrdenTrabajo): number {
  const subtotal = subtotalServicios(orden) + subtotalRepuestos(orden);
  return subtotal * (1 + IVA);
}
