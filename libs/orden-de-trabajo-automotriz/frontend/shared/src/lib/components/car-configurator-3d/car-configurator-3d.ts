import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import {
  ACCIONES_PIEZA,
  AccionPieza,
  ESTADOS_PIEZA,
  EstadoPieza,
  MarcaPiezaCarroceria,
  PIEZAS_CARROCERIA,
  PiezaCarroceria,
  estadoPiezaLabel,
  piezaCarroceriaLabel,
  severidadDePieza,
} from '../../models';
import { AnclasCarroceria, cargarCarroceriaYZonas, clasificarPunto, construirEscenaBase } from './car-body.builder';
import { SceneEngine } from './scene-engine';

const COLOR_POR_SEVERIDAD: Record<string, number> = {
  leve: 0xd9a441,
  media: 0xc1652f,
  alta: 0xa8402e,
};

interface PopoverEstado {
  pieza: PiezaCarroceria;
  x: number;
  y: number;
}

interface HoverEstado {
  pieza: PiezaCarroceria;
  x: number;
  y: number;
}

@Component({
  selector: 'ota-car-configurator-3d',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './car-configurator-3d.html',
  styleUrl: './car-configurator-3d.scss',
})
export class CarConfigurator3d {
  readonly valorInicial = input<MarcaPiezaCarroceria[]>([]);
  readonly cambio = output<MarcaPiezaCarroceria[]>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly containerRef = viewChild.required<ElementRef<HTMLDivElement>>('contenedor');
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');

  protected readonly piezas = PIEZAS_CARROCERIA;
  protected readonly estados = ESTADOS_PIEZA;
  protected readonly acciones = ACCIONES_PIEZA;
  protected readonly piezaCarroceriaLabel = piezaCarroceriaLabel;
  protected readonly estadoPiezaLabel = estadoPiezaLabel;

  protected readonly soportaWebgl = signal(true);
  protected readonly marcas = signal(new Map<PiezaCarroceria, MarcaPiezaCarroceria>());
  protected readonly popover = signal<PopoverEstado | null>(null);
  protected readonly hover = signal<HoverEstado | null>(null);

  protected readonly marcasLista = computed(() => Array.from(this.marcas().values()));

  protected readonly formEstado = signal<EstadoPieza>('rayon');
  protected readonly formAccion = signal<AccionPieza>('pintura');
  protected readonly formNota = signal('');

  private engine?: SceneEngine;
  private meshesPorPieza = new Map<PiezaCarroceria, THREE.Mesh>();
  private marcadoresPorPieza = new Map<PiezaCarroceria, THREE.Mesh>();
  private resaltador?: THREE.Mesh;
  private anclas?: AnclasCarroceria;

  constructor() {
    const iniciales = this.valorInicial();
    if (iniciales.length > 0) {
      const mapa = new Map<PiezaCarroceria, MarcaPiezaCarroceria>();
      for (const m of iniciales) mapa.set(m.pieza, m);
      this.marcas.set(mapa);
    }

    afterNextRender(() => {
      if (!this.hayWebgl()) {
        this.soportaWebgl.set(false);
        return;
      }
      this.iniciarEscena();
    });

    // La pieza resaltada es la que está bajo el mouse, o si no hay hover, la que
    // se está editando en el popover — así no se pierde el resaltado al mover el
    // mouse hacia el formulario.
    effect(() => {
      const piezaActiva = this.hover()?.pieza ?? this.popover()?.pieza ?? null;
      this.aplicarResaltado(piezaActiva);
    });

    this.destroyRef.onDestroy(() => this.engine?.dispose());
  }

  private hayWebgl(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
      return false;
    }
  }

  private iniciarEscena(): void {
    const contenedor = this.containerRef().nativeElement;
    const canvas = this.canvasRef().nativeElement;

    this.engine = new SceneEngine(canvas, contenedor);
    this.engine.scene.background = null;

    const hemi = new THREE.HemisphereLight(0xfff0dd, 0x1b1310, 1.15);
    this.engine.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffe4c4, 3.1);
    key.position.set(4.5, 6, 3.2);
    this.engine.scene.add(key);
    const fill = new THREE.DirectionalLight(0xcfd9ff, 0.55);
    fill.position.set(-5, 3, -4.5);
    this.engine.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffb87a, 1.3);
    rim.position.set(-2.5, 2.2, -5.5);
    this.engine.scene.add(rim);

    const { grupo, resaltador } = construirEscenaBase();
    this.resaltador = resaltador;
    this.engine.scene.add(grupo);

    this.engine.onHover = (interseccion) => this.manejarHover(interseccion);
    this.engine.onSelect = (interseccion) => this.seleccionar(interseccion);
    this.engine.onFrame = () => {
      this.actualizarPosicionPopover();
      this.actualizarPosicionHover();
    };

    // Las zonas de click/marcadores dependen de puntos de referencia reales del
    // modelo (ejes, ancho, alto) — recién existen cuando termina de cargar.
    cargarCarroceriaYZonas(grupo)
      .then(({ meshesPorPieza, marcadoresPorPieza, meshesInteractivos, anclas }) => {
        this.meshesPorPieza = meshesPorPieza;
        this.marcadoresPorPieza = marcadoresPorPieza;
        this.anclas = anclas;
        this.engine?.setInteractivos(meshesInteractivos);
        this.aplicarColoresIniciales();
      })
      .catch((error: unknown) => {
        console.warn('No se pudo cargar el modelo 3D de la carrocería', error);
      });
  }

  private aplicarColoresIniciales(): void {
    for (const [pieza, marca] of this.marcas()) {
      this.pintarPieza(pieza, marca.estado);
    }
  }

  /** Muestra/oculta el indicador translúcido de daño de una pieza (el modelo visual es un solo mesh, no se puede repintar por pieza). */
  private pintarPieza(pieza: PiezaCarroceria, estado: EstadoPieza): void {
    const marcador = this.marcadoresPorPieza.get(pieza);
    if (!marcador) return;
    const severidad = severidadDePieza(estado);
    if (severidad === 'ninguna') {
      marcador.visible = false;
      return;
    }
    (marcador.material as THREE.MeshBasicMaterial).color.setHex(COLOR_POR_SEVERIDAD[severidad]);
    marcador.visible = true;
  }

  /** Ubica el único mesh de resaltado sobre la pieza activa (hover o en edición), o lo oculta si no hay ninguna. */
  private aplicarResaltado(pieza: PiezaCarroceria | null): void {
    if (!this.resaltador) return;
    const mesh = pieza ? this.meshesPorPieza.get(pieza) : undefined;
    if (!mesh) {
      this.resaltador.visible = false;
      return;
    }
    const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters;
    this.resaltador.position.copy(mesh.position);
    this.resaltador.scale.set(width * 1.1, height * 1.1, depth * 1.1);
    this.resaltador.visible = true;
  }

  /** El impacto es sobre el modelo visual real, no sobre una caja por pieza: se clasifica el punto exacto (ver `clasificarPunto`). */
  private clasificar(interseccion: THREE.Intersection | null): PiezaCarroceria | null {
    if (!interseccion || !this.anclas) return null;
    return clasificarPunto(interseccion.point, this.anclas);
  }

  private manejarHover(interseccion: THREE.Intersection | null): void {
    const pieza = this.clasificar(interseccion);
    if (!pieza) {
      this.hover.set(null);
      return;
    }
    const mesh = this.meshesPorPieza.get(pieza);
    const pos = mesh ? (this.engine?.proyectarAPantalla(mesh) ?? { x: 0, y: 0 }) : { x: 0, y: 0 };
    this.hover.set({ pieza, x: pos.x, y: pos.y });
  }

  private seleccionar(interseccion: THREE.Intersection | null): void {
    const pieza = this.clasificar(interseccion);
    if (!pieza) {
      this.popover.set(null);
      return;
    }
    this.editarMarca(pieza);
  }

  /** Abre el popover de edición para una pieza — desde un click en el 3D o desde la lista resumen. */
  protected editarMarca(pieza: PiezaCarroceria): void {
    const mesh = this.meshesPorPieza.get(pieza);
    if (!mesh || !this.engine) return;

    const marcaActual = this.marcas().get(pieza);
    this.formEstado.set(marcaActual?.estado ?? 'rayon');
    this.formAccion.set(marcaActual?.accion ?? 'pintura');
    this.formNota.set(marcaActual?.nota ?? '');

    const pos = this.engine.proyectarAPantalla(mesh);
    this.popover.set({ pieza, x: pos.x, y: pos.y });
  }

  private actualizarPosicionPopover(): void {
    const actual = this.popover();
    if (!actual || !this.engine) return;
    const mesh = this.meshesPorPieza.get(actual.pieza);
    if (!mesh) return;
    const pos = this.engine.proyectarAPantalla(mesh);
    if (Math.abs(pos.x - actual.x) > 0.5 || Math.abs(pos.y - actual.y) > 0.5) {
      this.popover.set({ ...actual, x: pos.x, y: pos.y });
    }
  }

  private actualizarPosicionHover(): void {
    const actual = this.hover();
    if (!actual || !this.engine) return;
    const mesh = this.meshesPorPieza.get(actual.pieza);
    if (!mesh) return;
    const pos = this.engine.proyectarAPantalla(mesh);
    if (Math.abs(pos.x - actual.x) > 0.5 || Math.abs(pos.y - actual.y) > 0.5) {
      this.hover.set({ ...actual, x: pos.x, y: pos.y });
    }
  }

  protected guardarMarca(): void {
    const actual = this.popover();
    if (!actual) return;
    const mapa = new Map(this.marcas());
    mapa.set(actual.pieza, {
      pieza: actual.pieza,
      estado: this.formEstado(),
      accion: this.formAccion(),
      nota: this.formNota().trim() || undefined,
    });
    this.marcas.set(mapa);
    this.pintarPieza(actual.pieza, this.formEstado());
    this.popover.set(null);
    this.emitirCambio();
  }

  protected quitarMarca(pieza?: PiezaCarroceria): void {
    const objetivo = pieza ?? this.popover()?.pieza;
    if (!objetivo) return;
    const mapa = new Map(this.marcas());
    mapa.delete(objetivo);
    this.marcas.set(mapa);
    this.pintarPieza(objetivo, 'sin-dano');
    if (this.popover()?.pieza === objetivo) this.popover.set(null);
    this.emitirCambio();
  }

  protected cerrarPopover(): void {
    this.popover.set(null);
  }

  private emitirCambio(): void {
    this.cambio.emit(this.marcasLista());
  }
}
