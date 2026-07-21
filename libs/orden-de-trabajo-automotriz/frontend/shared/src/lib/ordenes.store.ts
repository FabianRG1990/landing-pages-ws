import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Cliente, EstadoOrden, OrdenTrabajo, Vehiculo } from './models';

/** Datos de ejemplo para probar las pantallas mientras no hay backend. */
const ORDENES_MOCK: OrdenTrabajo[] = [
  {
    numero: 'OT-0001',
    cliente: { nombre: 'Andrés Mora', telefono: '8888-1234' },
    vehiculo: {
      placa: 'BCK123',
      marca: 'Toyota',
      modelo: 'Corolla',
      anio: '2018',
      kilometrajeIngreso: 62000,
      nivelCombustible: 'medio',
    },
    fechaIngreso: '2026-07-15',
    fechaEstimadaEntrega: '2026-07-17',
    estado: 'en-reparacion',
    tecnicoAsignado: 'Luis Araya',
    motivoIngreso: 'Ruido en frenos delanteros al frenar.',
    diagnostico: 'Pastillas delanteras desgastadas, discos con rayado leve.',
    servicios: [{ descripcion: 'Cambio de pastillas y rectificado de discos', horas: 2, tarifaHora: 15000 }],
    repuestos: [{ descripcion: 'Juego de pastillas delanteras', cantidad: 1, precioUnitario: 28000 }],
  },
  {
    numero: 'OT-0002',
    cliente: { nombre: 'María Fernández', telefono: '8777-5566' },
    vehiculo: {
      placa: 'CRT456',
      marca: 'Hyundai',
      modelo: 'Tucson',
      anio: '2021',
      kilometrajeIngreso: 21500,
      nivelCombustible: 'tres-cuartos',
    },
    fechaIngreso: '2026-07-18',
    estado: 'recibido',
    motivoIngreso: 'Servicio de mantenimiento preventivo (cambio de aceite y filtros).',
    servicios: [],
    repuestos: [],
  },
];

interface OrdenesState {
  ordenes: OrdenTrabajo[];
  contador: number;
}

const initialState: OrdenesState = {
  ordenes: ORDENES_MOCK,
  contador: ORDENES_MOCK.length,
};

export const OrdenesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withMethods((store) => ({
    obtenerPorNumero(numero: string): OrdenTrabajo | undefined {
      return store.ordenes().find((o) => o.numero === numero);
    },

    /** Busca por placa (coincidencia exacta) o por nombre de cliente (parcial, sin distinguir mayúsculas). */
    buscarPorPlacaOCliente(query: string): OrdenTrabajo[] {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return store.ordenes().filter(
        (o) =>
          o.vehiculo.placa.toLowerCase() === q ||
          o.cliente.nombre.toLowerCase().includes(q),
      );
    },

    crearOrden(datos: {
      cliente: Cliente;
      vehiculo: Vehiculo;
      motivoIngreso: string;
    }): OrdenTrabajo {
      const contador = store.contador() + 1;
      const nueva: OrdenTrabajo = {
        numero: `OT-${String(contador).padStart(4, '0')}`,
        cliente: datos.cliente,
        vehiculo: datos.vehiculo,
        fechaIngreso: new Date().toISOString().slice(0, 10),
        estado: 'recibido',
        motivoIngreso: datos.motivoIngreso,
        servicios: [],
        repuestos: [],
      };
      patchState(store, { ordenes: [nueva, ...store.ordenes()], contador });
      return nueva;
    },

    cambiarEstado(numero: string, estado: EstadoOrden): void {
      patchState(store, {
        ordenes: store
          .ordenes()
          .map((o) => (o.numero === numero ? { ...o, estado } : o)),
      });
    },
  })),
);
