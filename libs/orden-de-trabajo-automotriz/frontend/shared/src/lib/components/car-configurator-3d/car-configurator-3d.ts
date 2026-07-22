import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
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
import { construirAuto } from './car-body.builder';
import { SceneEngine } from './scene-engine';

const COLOR_NEUTRO = 0x5a4d40;
const COLOR_POR_SEVERIDAD: Record<string, number> = {
  ninguna: COLOR_NEUTRO,
  leve: 0xd9a441,
  media: 0xc1652f,
  alta: 0xa8402e,
};

interface PopoverEstado {
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

  protected readonly marcasLista = computed(() => Array.from(this.marcas().values()));

  protected readonly formEstado = signal<EstadoPieza>('rayon');
  protected readonly formAccion = signal<AccionPieza>('pintura');
  protected readonly formNota = signal('');

  private engine?: SceneEngine;
  private meshesPorPieza = new Map<PiezaCarroceria, THREE.Mesh>();

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

    const { grupo, meshesPorPieza } = construirAuto();
    this.meshesPorPieza = meshesPorPieza;
    this.engine.scene.add(grupo);
    this.engine.setInteractivos(Array.from(meshesPorPieza.values()));

    this.aplicarColoresIniciales();

    this.engine.onHover = (objeto) => this.resaltar(objeto);
    this.engine.onSelect = (objeto) => this.seleccionar(objeto);
    this.engine.onFrame = () => this.actualizarPosicionPopover();
  }

  private aplicarColoresIniciales(): void {
    for (const [pieza, marca] of this.marcas()) {
      this.pintarPieza(pieza, marca.estado);
    }
  }

  private pintarPieza(pieza: PiezaCarroceria, estado: EstadoPieza): void {
    const mesh = this.meshesPorPieza.get(pieza);
    if (!mesh) return;
    const material = mesh.material as THREE.MeshStandardMaterial;
    material.color.setHex(COLOR_POR_SEVERIDAD[severidadDePieza(estado)]);
  }

  private resaltar(objeto: THREE.Object3D | null): void {
    for (const mesh of this.meshesPorPieza.values()) {
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
    }
    if (objeto instanceof THREE.Mesh) {
      const material = objeto.material as THREE.MeshStandardMaterial;
      material.emissive.setHex(0xc17f4a);
      material.emissiveIntensity = 0.35;
    }
  }

  private seleccionar(objeto: THREE.Object3D | null): void {
    if (!objeto) {
      this.popover.set(null);
      return;
    }
    const pieza = objeto.userData['pieza'] as PiezaCarroceria;
    const marcaActual = this.marcas().get(pieza);
    this.formEstado.set(marcaActual?.estado ?? 'rayon');
    this.formAccion.set(marcaActual?.accion ?? 'pintura');
    this.formNota.set(marcaActual?.nota ?? '');

    const pos = this.engine?.proyectarAPantalla(objeto) ?? { x: 0, y: 0 };
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
