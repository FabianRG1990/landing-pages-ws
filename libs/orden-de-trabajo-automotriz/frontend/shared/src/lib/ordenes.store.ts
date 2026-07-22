import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
  Area,
  Cliente,
  EstadoMecanica,
  EstadoPintura,
  MarcaPiezaCarroceria,
  OrdenTrabajo,
  SubOrdenMecanica,
  SubOrdenPintura,
  Vehiculo,
  serviciosSugeridosDesdeCarroceria,
} from './models';

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
    motivoIngreso: 'Ruido en frenos delanteros al frenar.',
    areas: {
      mecanica: {
        estado: 'en-reparacion',
        tecnicoAsignado: 'Luis Araya',
        fechaEstimadaEntrega: '2026-07-17',
        diagnostico: 'Pastillas delanteras desgastadas, discos con rayado leve.',
        servicios: [
          { descripcion: 'Cambio de pastillas y rectificado de discos', horas: 2, tarifaHora: 15000 },
        ],
        repuestos: [
          { descripcion: 'Juego de pastillas delanteras', cantidad: 1, precioUnitario: 28000 },
        ],
      },
    },
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
    motivoIngreso: 'Colisión leve en puerta delantera derecha, requiere enderezado y pintura.',
    areas: {
      mecanica: {
        estado: 'diagnostico',
        tecnicoAsignado: 'Karla Vindas',
        servicios: [],
        repuestos: [],
      },
      pintura: {
        estado: 'recibido',
        servicios: [],
        repuestos: [],
      },
    },
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

function nuevaSubOrdenMecanica(): SubOrdenMecanica {
  return { estado: 'recibido', servicios: [], repuestos: [] };
}

function nuevaSubOrdenPintura(piezas?: MarcaPiezaCarroceria[]): SubOrdenPintura {
  return {
    estado: 'recibido',
    servicios: piezas ? serviciosSugeridosDesdeCarroceria(piezas) : [],
    repuestos: [],
    piezas,
  };
}

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

    /** Órdenes que tienen un sub-flujo activo (no entregado/cancelado) en el área dada. */
    ordenesPorArea(area: Area): OrdenTrabajo[] {
      return store.ordenes().filter((o) => !!o.areas[area]);
    },

    crearOrden(datos: {
      cliente: Cliente;
      vehiculo: Vehiculo;
      motivoIngreso: string;
      areas: Area[];
      piezasCarroceria?: MarcaPiezaCarroceria[];
    }): OrdenTrabajo {
      if (datos.areas.length === 0) {
        throw new Error('Debe seleccionarse al menos un área (Mecánica o Pintura).');
      }
      const contador = store.contador() + 1;
      const nueva: OrdenTrabajo = {
        numero: `OT-${String(contador).padStart(4, '0')}`,
        cliente: datos.cliente,
        vehiculo: datos.vehiculo,
        fechaIngreso: new Date().toISOString().slice(0, 10),
        motivoIngreso: datos.motivoIngreso,
        areas: {
          mecanica: datos.areas.includes('mecanica') ? nuevaSubOrdenMecanica() : undefined,
          pintura: datos.areas.includes('pintura')
            ? nuevaSubOrdenPintura(datos.piezasCarroceria)
            : undefined,
        },
      };
      patchState(store, { ordenes: [nueva, ...store.ordenes()], contador });
      return nueva;
    },

    /** Agrega un área a una orden existente que todavía no la tenía (ej. daño oculto encontrado). */
    agregarArea(numero: string, area: Area): void {
      patchState(store, {
        ordenes: store.ordenes().map((o) => {
          if (o.numero !== numero || o.areas[area]) return o;
          return {
            ...o,
            areas: {
              ...o.areas,
              [area]: area === 'mecanica' ? nuevaSubOrdenMecanica() : nuevaSubOrdenPintura(),
            },
          };
        }),
      });
    },

    cambiarEstadoMecanica(numero: string, estado: EstadoMecanica): void {
      patchState(store, {
        ordenes: store.ordenes().map((o) =>
          o.numero === numero && o.areas.mecanica
            ? { ...o, areas: { ...o.areas, mecanica: { ...o.areas.mecanica, estado } } }
            : o,
        ),
      });
    },

    cambiarEstadoPintura(numero: string, estado: EstadoPintura): void {
      patchState(store, {
        ordenes: store.ordenes().map((o) =>
          o.numero === numero && o.areas.pintura
            ? { ...o, areas: { ...o.areas, pintura: { ...o.areas.pintura, estado } } }
            : o,
        ),
      });
    },
  })),
);
