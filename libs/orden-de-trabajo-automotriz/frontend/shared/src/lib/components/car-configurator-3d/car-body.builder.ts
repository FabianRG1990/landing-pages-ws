import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PiezaCarroceria } from '../../models';

interface EspecificacionPieza {
  pieza: PiezaCarroceria;
  posicion: [number, number, number];
  tamano: [number, number, number];
}

/**
 * Modelo visual de la carrocería: "Car" del pack Quaternius Cars Bundle
 * (CC0 — https://poly.pizza/bundle/Cars-Bundle-FE5IWe6OMk — sin atribución requerida).
 * Es un solo mesh de carrocería (no separado por pieza). El click/hover NO se
 * resuelve con cajas invisibles adivinando dónde está cada pieza: se lanza el
 * rayo contra el modelo visible real y se clasifica el punto exacto de impacto
 * (ver `clasificarPunto`) — así lo que se resalta siempre corresponde a lo que
 * se está señalando, sea cual sea la forma real del modelo.
 */
const RUTA_MODELO_VISUAL = 'models/carroceria-generica.glb';
const LARGO_OBJETIVO = 3.9;

const COLOR_RESALTADO = 0xc17f4a;

/** Puntos de referencia reales del modelo cargado, en coordenadas de mundo ya normalizadas. */
export interface AnclasCarroceria {
  ejeDelanteroX: number;
  ejeTraseroX: number;
  frenteX: number;
  traseraX: number;
  semiAncho: number;
  techoY: number;
}

export interface AutoConstruido {
  grupo: THREE.Group;
  /** Solo describen posición/tamaño de cada pieza (resaltado, marcador, proyección a pantalla) — no son el blanco del raycasting. */
  meshesPorPieza: Map<PiezaCarroceria, THREE.Mesh>;
  /** Indicador translúcido de daño por pieza — se muestra/colorea al marcar. */
  marcadoresPorPieza: Map<PiezaCarroceria, THREE.Mesh>;
  /** El/los mesh(es) visibles reales de la carrocería — esto es lo que se raycastea. */
  meshesInteractivos: THREE.Object3D[];
  anclas: AnclasCarroceria;
}

/** Textura procedural circular (radial, sin PNG externo) para una sombra de contacto suave bajo el auto. */
function crearTexturaSombra(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradiente = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradiente.addColorStop(0, 'rgba(0,0,0,0.55)');
    gradiente.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

/** Resaltador y sombra de contacto — no dependen del modelo, se agregan de entrada. */
export function construirEscenaBase(): { grupo: THREE.Group; resaltador: THREE.Mesh } {
  const grupo = new THREE.Group();

  const resaltador = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: COLOR_RESALTADO, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  resaltador.visible = false;
  grupo.add(resaltador);

  const sombra = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 48),
    new THREE.MeshBasicMaterial({ map: crearTexturaSombra(), transparent: true, depthWrite: false }),
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.set(-0.1, 0.01, 0);
  grupo.add(sombra);

  return { grupo, resaltador };
}

/** Auto genérico (bumper a bumper ≈ `LARGO_OBJETIVO`) — se usa si el modelo no trae los nodos de rueda esperados. */
function anclasPorDefecto(): AnclasCarroceria {
  return { ejeDelanteroX: 1.15, ejeTraseroX: -1.15, frenteX: 1.98, traseraX: -1.98, semiAncho: 0.86, techoY: 1.1 };
}

/**
 * Calcula los puntos de referencia reales del modelo ya normalizado (escalado,
 * orientado y apoyado en el piso): posición de los ejes delantero/trasero
 * (nodos "FrontWheels"/"BackWheels"), y los extremos/ancho/alto de la
 * carrocería (nodo "Car_Dook", sin contar las ruedas).
 */
function calcularAnclas(modelo: THREE.Object3D): AnclasCarroceria {
  const ruedaDelantera = modelo.getObjectByName('FrontWheels');
  const ruedaTrasera = modelo.getObjectByName('BackWheels');
  const carroceria = modelo.getObjectByName('Car_Dook');
  if (!ruedaDelantera || !ruedaTrasera || !carroceria) return anclasPorDefecto();

  const posDelantera = new THREE.Vector3();
  const posTrasera = new THREE.Vector3();
  ruedaDelantera.getWorldPosition(posDelantera);
  ruedaTrasera.getWorldPosition(posTrasera);

  const caja = new THREE.Box3().setFromObject(carroceria);
  const tamano = caja.getSize(new THREE.Vector3());

  return {
    ejeDelanteroX: posDelantera.x,
    ejeTraseroX: posTrasera.x,
    frenteX: caja.max.x,
    traseraX: caja.min.x,
    semiAncho: tamano.z / 2,
    techoY: caja.max.y,
  };
}

/** Puntos de corte y umbrales derivados de las anclas — compartidos por el clasificador y por las cajas visuales, para que ambos coincidan siempre. */
interface DisenoCarroceria {
  finCapoX: number;
  finGuardabarrosDelX: number;
  separacionPuertasX: number;
  inicioBaulX: number;
  finZonaFrontalBajaX: number;
  inicioZonaTraseraBajaX: number;
  umbralBajo: number;
  umbralMedioBajo: number;
  umbralMedio: number;
  umbralAlto: number;
  zLateral: number;
  zCentral: number;
  anchoLateral: number;
}

function calcularDiseno(anclas: AnclasCarroceria): DisenoCarroceria {
  const { ejeDelanteroX, ejeTraseroX, frenteX, traseraX, semiAncho, techoY } = anclas;
  const distanciaEjes = ejeDelanteroX - ejeTraseroX;
  const overhangDelantero = frenteX - ejeDelanteroX;
  const overhangTrasero = ejeTraseroX - traseraX;

  const finCapoX = ejeDelanteroX - distanciaEjes * 0.1;
  const inicioBaulX = ejeTraseroX + distanciaEjes * 0.1;
  const separacionPuertasX = ejeDelanteroX - distanciaEjes * 0.48;
  // El guardabarros delantero es la franja angosta pegada al capó; la puerta
  // delantera ocupa el resto (más ancho) hasta la separación con la trasera.
  const finGuardabarrosDelX = finCapoX - (finCapoX - separacionPuertasX) * 0.35;

  return {
    finCapoX,
    finGuardabarrosDelX,
    separacionPuertasX,
    inicioBaulX,
    finZonaFrontalBajaX: frenteX - overhangDelantero * 0.5,
    inicioZonaTraseraBajaX: traseraX + overhangTrasero * 0.5,
    umbralBajo: techoY * 0.4,
    umbralMedioBajo: techoY * 0.55,
    umbralMedio: techoY * 0.72,
    umbralAlto: techoY * 0.88,
    zLateral: semiAncho * 0.92,
    zCentral: semiAncho * 1.7,
    anchoLateral: semiAncho * 0.28,
  };
}

/**
 * Clasifica un punto real de impacto (world space, mismo sistema de
 * coordenadas que `anclas`) en una de las 22 piezas marcables. Se evalúa de
 * lo más específico (espejos, techo, vidrios, faros/parrilla) a lo más
 * general (capó/puertas/paneles/parachoques), para que las piezas chicas no
 * queden tapadas por las zonas grandes que las rodean.
 */
export function clasificarPunto(punto: THREE.Vector3, anclas: AnclasCarroceria): PiezaCarroceria {
  const { semiAncho } = anclas;
  const d = calcularDiseno(anclas);
  const esIzquierda = punto.z > 0;
  const zAbs = Math.abs(punto.z);

  if (punto.y > d.umbralAlto) {
    if (zAbs > semiAncho * 0.95 && punto.x > d.separacionPuertasX) {
      return esIzquierda ? 'espejo-izquierdo' : 'espejo-derecho';
    }
    if (punto.x < d.finCapoX && punto.x > d.inicioBaulX) return 'techo';
  }

  if (punto.y > d.umbralMedio) {
    return punto.x >= (d.finCapoX + d.inicioBaulX) / 2 ? 'parabrisas' : 'vidrio-trasero';
  }

  if (punto.y > d.umbralBajo && punto.y <= d.umbralMedioBajo) {
    if (punto.x > d.finZonaFrontalBajaX) {
      return zAbs < semiAncho * 0.35 ? 'parrilla' : esIzquierda ? 'faro-delantero-izquierdo' : 'faro-delantero-derecho';
    }
    if (punto.x < d.inicioZonaTraseraBajaX) {
      return esIzquierda ? 'luz-trasera-izquierda' : 'luz-trasera-derecha';
    }
  }

  if (punto.y <= d.umbralBajo) {
    if (punto.x > d.finZonaFrontalBajaX) return 'parachoques-delantero';
    if (punto.x < d.inicioZonaTraseraBajaX) return 'parachoques-trasero';
  }

  if (zAbs < semiAncho * 0.55) {
    if (punto.x > d.finCapoX) return 'capo';
    if (punto.x < d.inicioBaulX) return 'cofre-trasero';
    return punto.x >= (d.finCapoX + d.inicioBaulX) / 2 ? 'capo' : 'cofre-trasero';
  }

  if (punto.x > d.finGuardabarrosDelX) return esIzquierda ? 'guardabarros-delantero-izquierdo' : 'guardabarros-delantero-derecho';
  if (punto.x > d.inicioBaulX) return esIzquierda ? 'puerta-izquierda' : 'puerta-derecha';
  return esIzquierda ? 'panel-trasero-izquierdo' : 'panel-trasero-derecho';
}

/**
 * Traduce las anclas reales a las 22 cajas de resaltado/marcador, con los
 * mismos puntos de corte que usa `clasificarPunto` — para que la caja que se
 * enciende sea siempre la misma zona que el clasificador acaba de detectar.
 */
function construirEspecificaciones(anclas: AnclasCarroceria): EspecificacionPieza[] {
  const { ejeDelanteroX, ejeTraseroX, frenteX, traseraX, semiAncho, techoY } = anclas;
  const d = calcularDiseno(anclas);
  const { finCapoX, finGuardabarrosDelX, inicioBaulX, zLateral, zCentral, anchoLateral } = d;

  const altoBajo = techoY * 0.3;
  const altoMedio = techoY * 0.58;
  const altoParabrisas = techoY * 0.82;
  const altoTecho = techoY * 0.94;
  const distanciaEjes = ejeDelanteroX - ejeTraseroX;

  return [
    {
      pieza: 'parachoques-delantero',
      posicion: [frenteX - (frenteX - ejeDelanteroX) * 0.35, altoBajo, 0],
      tamano: [(frenteX - ejeDelanteroX) * 0.7, techoY * 0.32, zCentral],
    },
    {
      pieza: 'capo',
      posicion: [(frenteX + finCapoX) / 2, altoMedio, 0],
      tamano: [frenteX - finCapoX, techoY * 0.3, zCentral * 0.94],
    },
    {
      pieza: 'guardabarros-delantero-izquierdo',
      posicion: [(finCapoX + finGuardabarrosDelX) / 2, altoMedio, zLateral],
      tamano: [finCapoX - finGuardabarrosDelX, techoY * 0.35, anchoLateral],
    },
    {
      pieza: 'guardabarros-delantero-derecho',
      posicion: [(finCapoX + finGuardabarrosDelX) / 2, altoMedio, -zLateral],
      tamano: [finCapoX - finGuardabarrosDelX, techoY * 0.35, anchoLateral],
    },
    {
      pieza: 'puerta-izquierda',
      posicion: [(finGuardabarrosDelX + inicioBaulX) / 2, altoMedio, zLateral],
      tamano: [finGuardabarrosDelX - inicioBaulX, techoY * 0.4, anchoLateral],
    },
    {
      pieza: 'puerta-derecha',
      posicion: [(finGuardabarrosDelX + inicioBaulX) / 2, altoMedio, -zLateral],
      tamano: [finGuardabarrosDelX - inicioBaulX, techoY * 0.4, anchoLateral],
    },
    {
      pieza: 'panel-trasero-izquierdo',
      posicion: [(inicioBaulX + traseraX) / 2, altoMedio, zLateral],
      tamano: [inicioBaulX - traseraX, techoY * 0.35, anchoLateral],
    },
    {
      pieza: 'panel-trasero-derecho',
      posicion: [(inicioBaulX + traseraX) / 2, altoMedio, -zLateral],
      tamano: [inicioBaulX - traseraX, techoY * 0.35, anchoLateral],
    },
    {
      pieza: 'cofre-trasero',
      posicion: [(inicioBaulX + traseraX) / 2, altoMedio, 0],
      tamano: [inicioBaulX - traseraX, techoY * 0.3, zCentral * 0.94],
    },
    {
      pieza: 'parachoques-trasero',
      posicion: [traseraX + (ejeTraseroX - traseraX) * 0.35, altoBajo, 0],
      tamano: [(ejeTraseroX - traseraX) * 0.7, techoY * 0.32, zCentral],
    },
    {
      pieza: 'techo',
      posicion: [(finCapoX + inicioBaulX) / 2, altoTecho, 0],
      tamano: [(finCapoX - inicioBaulX) * 0.92, techoY * 0.16, zCentral * 0.8],
    },
    {
      pieza: 'parabrisas',
      posicion: [finCapoX - distanciaEjes * 0.06, altoParabrisas, 0],
      tamano: [distanciaEjes * 0.16, techoY * 0.3, zCentral * 0.72],
    },
    {
      pieza: 'vidrio-trasero',
      posicion: [inicioBaulX + distanciaEjes * 0.06, altoParabrisas, 0],
      tamano: [distanciaEjes * 0.16, techoY * 0.3, zCentral * 0.72],
    },
    {
      pieza: 'espejo-izquierdo',
      posicion: [finCapoX, altoParabrisas * 0.92, semiAncho * 1.08],
      tamano: [0.14, 0.12, 0.24],
    },
    {
      pieza: 'espejo-derecho',
      posicion: [finCapoX, altoParabrisas * 0.92, -semiAncho * 1.08],
      tamano: [0.14, 0.12, 0.24],
    },
    {
      pieza: 'parrilla',
      posicion: [frenteX - (frenteX - ejeDelanteroX) * 0.1, altoMedio * 0.85, 0],
      tamano: [(frenteX - ejeDelanteroX) * 0.25, techoY * 0.22, zCentral * 0.5],
    },
    {
      pieza: 'faro-delantero-izquierdo',
      posicion: [frenteX - (frenteX - ejeDelanteroX) * 0.15, altoMedio * 0.9, semiAncho * 0.65],
      tamano: [(frenteX - ejeDelanteroX) * 0.35, techoY * 0.16, semiAncho * 0.5],
    },
    {
      pieza: 'faro-delantero-derecho',
      posicion: [frenteX - (frenteX - ejeDelanteroX) * 0.15, altoMedio * 0.9, -semiAncho * 0.65],
      tamano: [(frenteX - ejeDelanteroX) * 0.35, techoY * 0.16, semiAncho * 0.5],
    },
    {
      pieza: 'luz-trasera-izquierda',
      posicion: [traseraX + (ejeTraseroX - traseraX) * 0.15, altoMedio * 0.9, semiAncho * 0.65],
      tamano: [(ejeTraseroX - traseraX) * 0.35, techoY * 0.16, semiAncho * 0.5],
    },
    {
      pieza: 'luz-trasera-derecha',
      posicion: [traseraX + (ejeTraseroX - traseraX) * 0.15, altoMedio * 0.9, -semiAncho * 0.65],
      tamano: [(ejeTraseroX - traseraX) * 0.35, techoY * 0.16, semiAncho * 0.5],
    },
  ];
}

function construirZonasYMarcadores(anclas: AnclasCarroceria): {
  meshesPorPieza: Map<PiezaCarroceria, THREE.Mesh>;
  marcadoresPorPieza: Map<PiezaCarroceria, THREE.Mesh>;
  objetos: THREE.Object3D[];
} {
  const meshesPorPieza = new Map<PiezaCarroceria, THREE.Mesh>();
  const marcadoresPorPieza = new Map<PiezaCarroceria, THREE.Mesh>();
  const objetos: THREE.Object3D[] = [];

  for (const spec of construirEspecificaciones(anclas)) {
    // Referencia de posición/tamaño únicamente — ya no se raycastea contra esto.
    const zona = new THREE.Mesh(new THREE.BoxGeometry(...spec.tamano), new THREE.MeshBasicMaterial());
    zona.position.set(...spec.posicion);
    zona.visible = false;
    objetos.push(zona);
    meshesPorPieza.set(spec.pieza, zona);

    const marcador = new THREE.Mesh(
      new THREE.BoxGeometry(spec.tamano[0] * 1.02, spec.tamano[1] * 1.02, spec.tamano[2] * 1.02),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false }),
    );
    marcador.position.set(...spec.posicion);
    marcador.visible = false;
    objetos.push(marcador);
    marcadoresPorPieza.set(spec.pieza, marcador);
  }

  return { meshesPorPieza, marcadoresPorPieza, objetos };
}

/**
 * Carga el modelo 3D visual, lo normaliza (orienta según sus propios ejes
 * delantero/trasero, lo escala a `LARGO_OBJETIVO` y lo apoya en el piso), y
 * recién con esos datos reales arma las cajas de resaltado/marcador. El
 * raycasting de click/hover se hace contra el mesh visible real
 * (`meshesInteractivos`), no contra estas cajas — el consumidor debe clasificar
 * el punto de impacto con `clasificarPunto(interseccion.point, anclas)`.
 */
export async function cargarCarroceriaYZonas(grupo: THREE.Group): Promise<AutoConstruido> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(RUTA_MODELO_VISUAL);
  const modelo = gltf.scene;

  const ruedaDelantera = modelo.getObjectByName('FrontWheels');
  const ruedaTrasera = modelo.getObjectByName('BackWheels');
  if (ruedaDelantera && ruedaTrasera) {
    const posDelantera = new THREE.Vector3();
    const posTrasera = new THREE.Vector3();
    ruedaDelantera.getWorldPosition(posDelantera);
    ruedaTrasera.getWorldPosition(posTrasera);
    const direccion = posDelantera.sub(posTrasera);
    modelo.rotation.y += Math.atan2(direccion.z, direccion.x);
  }

  modelo.updateMatrixWorld(true);
  const cajaInicial = new THREE.Box3().setFromObject(modelo);
  const tamanoInicial = cajaInicial.getSize(new THREE.Vector3());
  const escala = LARGO_OBJETIVO / Math.max(tamanoInicial.x, tamanoInicial.z);
  modelo.scale.setScalar(escala);

  modelo.updateMatrixWorld(true);
  const cajaFinal = new THREE.Box3().setFromObject(modelo);
  const centro = cajaFinal.getCenter(new THREE.Vector3());
  modelo.position.x -= centro.x;
  modelo.position.z -= centro.z;
  modelo.position.y -= cajaFinal.min.y;
  modelo.updateMatrixWorld(true);

  grupo.add(modelo);

  const anclas = calcularAnclas(modelo);
  const { meshesPorPieza, marcadoresPorPieza, objetos } = construirZonasYMarcadores(anclas);
  for (const objeto of objetos) grupo.add(objeto);

  const carroceria = modelo.getObjectByName('Car_Dook') ?? modelo;
  const meshesInteractivos: THREE.Object3D[] = [];
  carroceria.traverse((hijo) => {
    if (hijo instanceof THREE.Mesh) meshesInteractivos.push(hijo);
  });
  if (meshesInteractivos.length === 0) meshesInteractivos.push(modelo);

  return { grupo, meshesPorPieza, marcadoresPorPieza, meshesInteractivos, anclas };
}
