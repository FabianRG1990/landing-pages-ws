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

/** Piezas de carrocería marcables desde el configurador 3D de Pintura. */
export type PiezaCarroceria =
  | 'capo'
  | 'techo'
  | 'cofre-trasero'
  | 'parachoques-delantero'
  | 'parachoques-trasero'
  | 'guardabarros-delantero-izquierdo'
  | 'guardabarros-delantero-derecho'
  | 'panel-trasero-izquierdo'
  | 'panel-trasero-derecho'
  | 'puerta-delantera-izquierda'
  | 'puerta-delantera-derecha'
  | 'puerta-trasera-izquierda'
  | 'puerta-trasera-derecha'
  | 'parabrisas'
  | 'vidrio-trasero'
  | 'espejo-izquierdo'
  | 'espejo-derecho';

export const PIEZAS_CARROCERIA: { value: PiezaCarroceria; label: string }[] = [
  { value: 'capo', label: 'Capó' },
  { value: 'techo', label: 'Techo' },
  { value: 'cofre-trasero', label: 'Cofre/tapa trasera' },
  { value: 'parachoques-delantero', label: 'Parachoques delantero' },
  { value: 'parachoques-trasero', label: 'Parachoques trasero' },
  { value: 'guardabarros-delantero-izquierdo', label: 'Guardabarros delantero izquierdo' },
  { value: 'guardabarros-delantero-derecho', label: 'Guardabarros delantero derecho' },
  { value: 'panel-trasero-izquierdo', label: 'Panel trasero izquierdo' },
  { value: 'panel-trasero-derecho', label: 'Panel trasero derecho' },
  { value: 'puerta-delantera-izquierda', label: 'Puerta delantera izquierda' },
  { value: 'puerta-delantera-derecha', label: 'Puerta delantera derecha' },
  { value: 'puerta-trasera-izquierda', label: 'Puerta trasera izquierda' },
  { value: 'puerta-trasera-derecha', label: 'Puerta trasera derecha' },
  { value: 'parabrisas', label: 'Parabrisas' },
  { value: 'vidrio-trasero', label: 'Vidrio trasero' },
  { value: 'espejo-izquierdo', label: 'Espejo izquierdo' },
  { value: 'espejo-derecho', label: 'Espejo derecho' },
];

export function piezaCarroceriaLabel(pieza: PiezaCarroceria): string {
  return PIEZAS_CARROCERIA.find((p) => p.value === pieza)?.label ?? pieza;
}

export type EstadoPieza = 'sin-dano' | 'rayon' | 'abolladura' | 'oxido' | 'dano-estructural';

export const ESTADOS_PIEZA: { value: EstadoPieza; label: string }[] = [
  { value: 'sin-dano', label: 'Sin daño' },
  { value: 'rayon', label: 'Rayón' },
  { value: 'abolladura', label: 'Abolladura' },
  { value: 'oxido', label: 'Óxido' },
  { value: 'dano-estructural', label: 'Daño estructural' },
];

export function estadoPiezaLabel(estado: EstadoPieza): string {
  return ESTADOS_PIEZA.find((e) => e.value === estado)?.label ?? estado;
}

/** Severidad visual de un estado de pieza — alimenta la rampa de color cálida del configurador 3D. */
export type SeveridadPieza = 'ninguna' | 'leve' | 'media' | 'alta';

const SEVERIDAD_POR_ESTADO: Record<EstadoPieza, SeveridadPieza> = {
  'sin-dano': 'ninguna',
  rayon: 'leve',
  oxido: 'media',
  abolladura: 'media',
  'dano-estructural': 'alta',
};

export function severidadDePieza(estado: EstadoPieza): SeveridadPieza {
  return SEVERIDAD_POR_ESTADO[estado];
}

export type AccionPieza = 'pintura' | 'reparar-pintar' | 'reemplazar' | 'pulido';

export const ACCIONES_PIEZA: { value: AccionPieza; label: string }[] = [
  { value: 'pintura', label: 'Solo pintura' },
  { value: 'reparar-pintar', label: 'Reparar y pintar' },
  { value: 'reemplazar', label: 'Reemplazar pieza' },
  { value: 'pulido', label: 'Pulido' },
];

export function accionPiezaLabel(accion: AccionPieza): string {
  return ACCIONES_PIEZA.find((a) => a.value === accion)?.label ?? accion;
}

export interface MarcaPiezaCarroceria {
  pieza: PiezaCarroceria;
  estado: EstadoPieza;
  accion: AccionPieza;
  nota?: string;
}

/** Convierte las piezas marcadas (con daño real) en líneas de servicio sugeridas, sin precio asignado. */
export function serviciosSugeridosDesdeCarroceria(piezas: MarcaPiezaCarroceria[]): LineaServicio[] {
  return piezas
    .filter((p) => p.estado !== 'sin-dano')
    .map((p) => ({
      descripcion: `${accionPiezaLabel(p.accion)} — ${piezaCarroceriaLabel(p.pieza)}`,
      horas: 0,
      tarifaHora: 0,
    }));
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

export interface SubOrdenPintura extends SubOrdenArea<EstadoPintura> {
  /** Piezas de carrocería marcadas en el configurador 3D al recibir el vehículo. */
  piezas?: MarcaPiezaCarroceria[];
}

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
