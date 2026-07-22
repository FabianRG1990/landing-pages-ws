import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PiezaCarroceria } from '../../models';

interface EspecificacionPanel {
  pieza: PiezaCarroceria;
  posicion: [number, number, number];
  tamano: [number, number, number];
  radio: number;
}

/** Colores neutros de la "maqueta de arcilla" — el color de daño se aplica encima al marcar una pieza. */
const COLOR_PANEL = 0x5a4d40;
const COLOR_BASE = 0x362d25;
const COLOR_VIDRIO = 0x181310;
const COLOR_LLANTA = 0x100d0b;

const PANELES: EspecificacionPanel[] = [
  { pieza: 'parachoques-delantero', posicion: [1.98, 0.34, 0], tamano: [0.22, 0.4, 1.66], radio: 0.08 },
  { pieza: 'capo', posicion: [1.5, 0.56, 0], tamano: [0.66, 0.2, 1.56], radio: 0.07 },
  { pieza: 'guardabarros-delantero-izquierdo', posicion: [1.02, 0.52, 0.82], tamano: [0.56, 0.46, 0.18], radio: 0.06 },
  { pieza: 'guardabarros-delantero-derecho', posicion: [1.02, 0.52, -0.82], tamano: [0.56, 0.46, 0.18], radio: 0.06 },
  { pieza: 'puerta-delantera-izquierda', posicion: [0.32, 0.52, 0.86], tamano: [0.82, 0.5, 0.14], radio: 0.05 },
  { pieza: 'puerta-delantera-derecha', posicion: [0.32, 0.52, -0.86], tamano: [0.82, 0.5, 0.14], radio: 0.05 },
  { pieza: 'puerta-trasera-izquierda', posicion: [-0.52, 0.52, 0.86], tamano: [0.8, 0.5, 0.14], radio: 0.05 },
  { pieza: 'puerta-trasera-derecha', posicion: [-0.52, 0.52, -0.86], tamano: [0.8, 0.5, 0.14], radio: 0.05 },
  { pieza: 'panel-trasero-izquierdo', posicion: [-1.3, 0.52, 0.82], tamano: [0.5, 0.46, 0.18], radio: 0.06 },
  { pieza: 'panel-trasero-derecho', posicion: [-1.3, 0.52, -0.82], tamano: [0.5, 0.46, 0.18], radio: 0.06 },
  { pieza: 'cofre-trasero', posicion: [-1.58, 0.56, 0], tamano: [0.6, 0.2, 1.56], radio: 0.07 },
  { pieza: 'parachoques-trasero', posicion: [-1.98, 0.34, 0], tamano: [0.22, 0.4, 1.66], radio: 0.08 },
  { pieza: 'techo', posicion: [-0.12, 1.1, 0], tamano: [1.6, 0.26, 1.42], radio: 0.1 },
];

const ESPEJOS: [PiezaCarroceria, number][] = [
  ['espejo-izquierdo', 0.98],
  ['espejo-derecho', -0.98],
];

const VIDRIOS: { pieza: PiezaCarroceria; posicion: [number, number, number]; tamano: [number, number, number]; rotacionX: number }[] = [
  { pieza: 'parabrisas', posicion: [0.78, 0.87, 0], tamano: [0.5, 0.5, 1.36], rotacionX: 0.62 },
  { pieza: 'vidrio-trasero', posicion: [-0.9, 0.87, 0], tamano: [0.46, 0.5, 1.36], rotacionX: -0.58 },
];

export interface AutoConstruido {
  grupo: THREE.Group;
  meshesPorPieza: Map<PiezaCarroceria, THREE.Mesh>;
}

function crearMaterialPanel(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: COLOR_PANEL, roughness: 0.45, metalness: 0.55 });
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

export function construirAuto(): AutoConstruido {
  const grupo = new THREE.Group();
  const meshesPorPieza = new Map<PiezaCarroceria, THREE.Mesh>();

  // Chasis base — no interactivo, solo silueta de apoyo detrás de los paneles.
  const base = new THREE.Mesh(
    new RoundedBoxGeometry(3.7, 0.5, 1.56, 4, 0.14),
    new THREE.MeshStandardMaterial({ color: COLOR_BASE, roughness: 0.6, metalness: 0.4 }),
  );
  base.position.set(-0.14, 0.32, 0);
  grupo.add(base);

  for (const spec of PANELES) {
    const mesh = new THREE.Mesh(
      new RoundedBoxGeometry(...spec.tamano, 4, spec.radio),
      crearMaterialPanel(),
    );
    mesh.position.set(...spec.posicion);
    mesh.userData['pieza'] = spec.pieza;
    grupo.add(mesh);
    meshesPorPieza.set(spec.pieza, mesh);
  }

  for (const [pieza, z] of ESPEJOS) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.1, 0.22, 2, 0.03), crearMaterialPanel());
    mesh.position.set(0.66, 0.92, z);
    mesh.userData['pieza'] = pieza;
    grupo.add(mesh);
    meshesPorPieza.set(pieza, mesh);
  }

  for (const spec of VIDRIOS) {
    const mesh = new THREE.Mesh(
      new RoundedBoxGeometry(...spec.tamano, 2, 0.03),
      new THREE.MeshStandardMaterial({
        color: COLOR_VIDRIO,
        roughness: 0.15,
        metalness: 0.2,
        transparent: true,
        opacity: 0.85,
      }),
    );
    mesh.position.set(...spec.posicion);
    mesh.rotation.z = spec.rotacionX;
    mesh.userData['pieza'] = spec.pieza;
    grupo.add(mesh);
    meshesPorPieza.set(spec.pieza, mesh);
  }

  // Llantas — decorativas, no clickeables (el desglose mecánico va en su propio configurador).
  const llantaGeom = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 20);
  const llantaMat = new THREE.MeshStandardMaterial({ color: COLOR_LLANTA, roughness: 0.7, metalness: 0.2 });
  const posicionesLlantas: [number, number][] = [
    [1.28, 0.92],
    [1.28, -0.92],
    [-1.1, 0.92],
    [-1.1, -0.92],
  ];
  for (const [x, z] of posicionesLlantas) {
    const llanta = new THREE.Mesh(llantaGeom, llantaMat);
    llanta.rotation.x = Math.PI / 2;
    llanta.position.set(x, 0.36, z);
    grupo.add(llanta);
  }

  // Sombra de contacto — plano circular con textura radial procedural.
  const sombra = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 48),
    new THREE.MeshBasicMaterial({ map: crearTexturaSombra(), transparent: true, depthWrite: false }),
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.set(-0.1, 0.01, 0);
  grupo.add(sombra);

  return { grupo, meshesPorPieza };
}
