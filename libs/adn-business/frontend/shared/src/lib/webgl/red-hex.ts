import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';

/**
 * Red hexagonal viva.
 *
 * El isotipo de ADN es un hexagono de trazo con nodos: un diagrama de
 * estructura. Aqui esa figura se convierte en una retícula tridimensional
 * de nodos y aristas por la que recorren pulsos de luz, como una
 * organizacion en la que la informacion circula.
 *
 * Todo el coste esta en la GPU: dos draw calls (aristas y nodos) y el
 * pulso se calcula en el vertex shader, asi que la CPU solo actualiza
 * tres uniforms por fotograma.
 */
@Component({
  selector: 'app-red-hex',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #lienzo class="red-hex"></canvas>`,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      display: block;
      pointer-events: none;
    }

    .red-hex {
      width: 100%;
      height: 100%;
      display: block;
    }
  `,
})
export class RedHexComponent {
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly destroyRef = inject(DestroyRef);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => {
      if (!this.esNavegador) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.dibujarQuieto();
        return;
      }
      this.montar();
    });
  }

  /** Retícula hexagonal: centros en coordenadas axiales, aristas unicas. */
  private construirGeometria(radio: number, anillos: number) {
    const nodos: THREE.Vector3[] = [];
    const indice = new Map<string, number>();
    const clave = (q: number, r: number) => `${q}|${r}`;

    for (let q = -anillos; q <= anillos; q++) {
      for (let r = -anillos; r <= anillos; r++) {
        if (Math.abs(q + r) > anillos) continue;
        const x = radio * 1.5 * q;
        const z = radio * Math.sqrt(3) * (r + q / 2);
        // relieve suave: la red no es un plano muerto
        const d = Math.hypot(x, z);
        const y = Math.cos(d * 0.09) * 2.4 - d * 0.045;
        indice.set(clave(q, r), nodos.length);
        nodos.push(new THREE.Vector3(x, y, z));
      }
    }

    const vecinos: [number, number][] = [
      [1, 0],
      [0, 1],
      [-1, 1],
    ];
    const aristas: number[] = [];
    for (const [k, i] of indice) {
      const [q, r] = k.split('|').map(Number);
      for (const [dq, dr] of vecinos) {
        const j = indice.get(clave(q + dq, r + dr));
        if (j === undefined) continue;
        aristas.push(i, j);
      }
    }
    return { nodos, aristas };
  }

  private montar(): void {
    const canvas = this.lienzo().nativeElement;
    const host = this.host.nativeElement;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);

    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
    camara.position.set(0, 27, 46);
    camara.lookAt(0, -2, 0);

    const { nodos, aristas } = this.construirGeometria(4.6, 11);

    const posiciones = new Float32Array(nodos.length * 3);
    const distancias = new Float32Array(nodos.length);
    nodos.forEach((v, i) => {
      posiciones[i * 3] = v.x;
      posiciones[i * 3 + 1] = v.y;
      posiciones[i * 3 + 2] = v.z;
      distancias[i] = Math.hypot(v.x, v.z);
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    geo.setAttribute('aDist', new THREE.BufferAttribute(distancias, 1));
    geo.setIndex(aristas);

    // El frente del pulso es ancho a proposito: se lee como un resplandor que
    // respira, no como un anillo que viaja. De ahi se deriva su recorrido.
    const anchoFrente = 58;
    const alcance = distancias.reduce((m, d) => Math.max(m, d), 0);
    // Va de -ancho hasta alcance+ancho: en ambos extremos el frente vale cero
    // para todos los nodos, asi que el reinicio del ciclo no se ve. Recortarlo
    // antes hace que la red se encienda de golpe al volver al centro.
    const recorrido = alcance + anchoFrente * 2;

    const uniforms = {
      uTiempo: { value: 0 },
      uPulso: { value: 0 },
      uAncho: { value: anchoFrente },
      uBrand: { value: new THREE.Color(0x5ca0b4) },
      uLuz: { value: new THREE.Color(0x7fd4ec) },
      uCalido: { value: new THREE.Color(0xe0ba59) }, // sigue a --warm
    };

    // El pulso viaja hacia fuera desde el centro; la intensidad de cada
    // vertice depende de su distancia, todo resuelto en GPU.
    const vertexComun = `
      uniform float uTiempo;
      uniform float uPulso;
      uniform float uAncho;
      attribute float aDist;
      varying float vBrillo;
      varying float vProf;
      void main() {
        float onda = sin(aDist * 0.13 - uTiempo * 1.15) * 0.5 + 0.5;
        onda = pow(onda, 3.0);
        // 1.0 - smoothstep, no smoothstep invertido: con edge0 > edge1 GLSL
        // deja el resultado indefinido y WebKit no tiene por que coincidir.
        float frente = 1.0 - smoothstep(0.0, uAncho, abs(aDist - uPulso));
        vBrillo = onda * 0.5 + frente * 1.0;
        vec3 p = position;
        p.y += sin(aDist * 0.11 - uTiempo * 0.85) * 0.75;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vProf = clamp(-mv.z / 105.0, 0.0, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (2.9 + vBrillo * 5.2) * (34.0 / -mv.z);
      }
    `;

    const matAristas = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: vertexComun,
      fragmentShader: `
        uniform vec3 uBrand;
        uniform vec3 uLuz;
        varying float vBrillo;
        varying float vProf;
        void main() {
          vec3 c = mix(uBrand, uLuz, vBrillo);
          float a = (0.17 + vBrillo * 0.78) * (1.0 - vProf * 0.55);
          gl_FragColor = vec4(c, a);
        }
      `,
    });

    const matNodos = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: vertexComun,
      fragmentShader: `
        uniform vec3 uLuz;
        uniform vec3 uCalido;
        varying float vBrillo;
        varying float vProf;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d);
          if (r > 0.5) discard;
          float halo = smoothstep(0.5, 0.0, r);
          // los nodos mas encendidos viran a calido: el contraste de color
          vec3 c = mix(uLuz, uCalido, smoothstep(0.58, 1.0, vBrillo));
          float a = halo * (0.26 + vBrillo * 0.9) * (1.0 - vProf * 0.45);
          gl_FragColor = vec4(c, a);
        }
      `,
    });

    const malla = new THREE.LineSegments(geo, matAristas);
    const puntos = new THREE.Points(geo, matNodos);
    const grupo = new THREE.Group();
    grupo.add(malla, puntos);
    escena.add(grupo);

    // --- tamano y densidad de pixel ---
    const redimensionar = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camara.aspect = w / h;
      camara.updateProjectionMatrix();
    };
    redimensionar();
    const ro = new ResizeObserver(redimensionar);
    ro.observe(host);

    // --- raton: parallax suave, nunca brusco ---
    let mx = 0, my = 0, tx = 0, ty = 0;
    const alMover = (e: PointerEvent) => {
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
    };
    addEventListener('pointermove', alMover, { passive: true });

    // --- solo se dibuja cuando esta en pantalla ---
    let visible = true;
    const io = new IntersectionObserver((e) => (visible = e[0].isIntersecting), {
      threshold: 0,
    });
    io.observe(host);

    let bucle = 0;
    const t0 = performance.now();
    const dibujar = (ahora: number) => {
      bucle = requestAnimationFrame(dibujar);
      if (!visible) return;
      const t = (ahora - t0) / 1000;

      mx += (tx - mx) * 0.045;
      my += (ty - my) * 0.045;

      uniforms.uTiempo.value = t;
      // El desfase de +ancho hace que en t=0 el pulso nazca en el centro: la
      // red se ve viva desde el primer fotograma, sin esperar a que llegue.
      uniforms.uPulso.value = -anchoFrente + ((t * 15 + anchoFrente) % recorrido);

      grupo.rotation.y = t * 0.045 + mx * 0.16;
      grupo.rotation.x = -0.06 + my * 0.07;
      camara.position.y = 27 - my * 3.2;
      camara.lookAt(0, -2, 0);

      renderer.render(escena, camara);
    };
    bucle = requestAnimationFrame(dibujar);

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(bucle);
      removeEventListener('pointermove', alMover);
      ro.disconnect();
      io.disconnect();
      geo.dispose();
      matAristas.dispose();
      matNodos.dispose();
      renderer.dispose();
    });
  }

  /** Con movimiento reducido: una sola imagen fija, sin bucle. */
  private dibujarQuieto(): void {
    const canvas = this.lienzo().nativeElement;
    const host = this.host.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = (canvas.width = host.clientWidth);
    const h = (canvas.height = host.clientHeight);
    ctx.strokeStyle = 'rgba(92,160,180,0.22)';
    ctx.lineWidth = 1;
    const R = 34;
    for (let y = -R; y < h + R; y += R * 1.5) {
      for (let x = -R; x < w + R; x += R * Math.sqrt(3)) {
        const off = (Math.round(y / (R * 1.5)) % 2) * ((R * Math.sqrt(3)) / 2);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          const px = x + off + R * Math.cos(a);
          const py = y + R * Math.sin(a);
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  }
}
