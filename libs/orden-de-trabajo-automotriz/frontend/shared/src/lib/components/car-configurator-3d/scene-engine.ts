import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Andamiaje Three.js reutilizable para configuradores 3D interactivos:
 * cámara + controles orbitales + raycasting de click/hover + resize + limpieza.
 * No conoce nada del dominio (piezas, colores) — eso lo arma quien construye
 * la escena (ver `car-body.builder.ts`).
 */
export class SceneEngine {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;

  onSelect?: (interseccion: THREE.Intersection | null) => void;
  onHover?: (interseccion: THREE.Intersection | null) => void;
  onFrame?: () => void;

  private interactivos: THREE.Object3D[] = [];
  private readonly raycaster = new THREE.Raycaster();
  private readonly puntero = new THREE.Vector2();
  private hover: THREE.Object3D | null = null;
  private rafId = 0;
  private readonly resizeObserver: ResizeObserver;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly contenedor: HTMLElement,
  ) {
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.camera.position.set(3.3, 1.85, 3.7);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3.2;
    this.controls.maxDistance = 9;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.target.set(0, 0.55, 0);

    this.resizeObserver = new ResizeObserver(() => this.actualizarTamano());
    this.resizeObserver.observe(this.contenedor);
    this.actualizarTamano();

    this.renderer.domElement.addEventListener('pointermove', this.manejarMovimiento);
    this.renderer.domElement.addEventListener('click', this.manejarClick);
    this.renderer.domElement.addEventListener('pointerleave', this.manejarSalida);

    this.animar();
  }

  setInteractivos(objetos: THREE.Object3D[]): void {
    this.interactivos = objetos;
  }

  /** Posición en pantalla (coordenadas de viewport) del centro de un objeto — para anclar overlays HTML. */
  proyectarAPantalla(objeto: THREE.Object3D): { x: number; y: number } {
    const pos = new THREE.Vector3();
    objeto.getWorldPosition(pos);
    pos.project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: rect.left + (pos.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (-pos.y * 0.5 + 0.5) * rect.height,
    };
  }

  private actualizarTamano = (): void => {
    const { clientWidth: w, clientHeight: h } = this.contenedor;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private actualizarPuntero(evento: PointerEvent | MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.puntero.x = ((evento.clientX - rect.left) / rect.width) * 2 - 1;
    this.puntero.y = -((evento.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private seleccionar(): THREE.Intersection | null {
    this.raycaster.setFromCamera(this.puntero, this.camera);
    const impactos = this.raycaster.intersectObjects(this.interactivos, false);
    return impactos.length > 0 ? impactos[0] : null;
  }

  private manejarMovimiento = (evento: PointerEvent): void => {
    this.actualizarPuntero(evento);
    const interseccion = this.seleccionar();
    const objeto = interseccion?.object ?? null;
    if (objeto !== this.hover) {
      this.renderer.domElement.style.cursor = objeto ? 'pointer' : 'grab';
    }
    this.hover = objeto;
    // Se notifica en cada movimiento (no solo al cambiar de objeto): el rayo
    // puede seguir pegando en el mismo mesh visible mientras el punto de
    // impacto se mueve de una pieza clasificada a otra.
    this.onHover?.(interseccion);
  };

  private manejarSalida = (): void => {
    if (this.hover) {
      this.hover = null;
      this.onHover?.(null);
    }
  };

  private manejarClick = (evento: MouseEvent): void => {
    this.actualizarPuntero(evento);
    this.onSelect?.(this.seleccionar());
  };

  private animar = (): void => {
    this.rafId = requestAnimationFrame(this.animar);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.onFrame?.();
  };

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointermove', this.manejarMovimiento);
    this.renderer.domElement.removeEventListener('click', this.manejarClick);
    this.renderer.domElement.removeEventListener('pointerleave', this.manejarSalida);
    this.controls.dispose();
    this.scene.traverse((objeto) => {
      if (objeto instanceof THREE.Mesh) {
        objeto.geometry.dispose();
        const materiales = Array.isArray(objeto.material) ? objeto.material : [objeto.material];
        materiales.forEach((m) => m.dispose());
      }
    });
    this.renderer.dispose();
  }
}
