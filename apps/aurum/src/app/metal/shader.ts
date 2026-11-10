// Metal líquido en una sola pasada.
//
// 1. Un campo de alturas suave (ruido simplex con domain warping) es la
//    superficie del líquido.
// 2. De sus pendientes salen las normales, y de las normales el reflejo
//    de un estudio falso: dos cajas de luz neutras, una cálida (el oro) y
//    un suelo oscuro. Eso es lo que hace que se lea como metal y no como
//    humo: el brillo vive en franjas nítidas que se doblan con la forma.
// 3. Una máscara amplia decide dónde hay metal y dónde grafito/acero mate.
//    Detrás de cada bloque de texto (uCalmA/B/C) el metal se aplana:
//    el fondo nunca compite con lo que hay que leer.
// 4. uEdges marca, en coordenadas de pantalla, dónde empieza cada sección.
//    El tema (oscuro/claro) se resuelve por píxel con un fundido amplio,
//    así que el cambio de mundo es un degradado y nunca una línea.

export const VERTICE = /* glsl */ `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const FRAGMENTO = /* glsl */ `
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform vec4 uEdges;
uniform float uFeather;
uniform vec4 uCalmA;
uniform vec4 uCalmB;
uniform vec4 uCalmC;
uniform vec3 uCalmW;
uniform float uAngle;
uniform float uAccent;
uniform float uEnergy;
uniform float uCover;
uniform float uFlow;
uniform vec2 uTilt;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * snoise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return s;
}

float altura(vec2 q, vec2 w, float t) {
  return fbm(q + 1.1 * w + vec2(0.0, t * 0.045));
}

// 1 dentro del rectángulo (x0,y0,x1,y1), con caída suave de ancho f.
float rectSuave(vec2 p, vec4 r, float f) {
  vec2 c = (r.xy + r.zw) * 0.5;
  vec2 h = abs(r.zw - r.xy) * 0.5;
  vec2 d = abs(p - c) - h;
  float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  return 1.0 - smoothstep(0.0, f, dist);
}

float banda(float a, float desde, float hasta, float borde) {
  return smoothstep(desde - borde, desde + borde, a) * (1.0 - smoothstep(hasta - borde, hasta + borde, a));
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 s = gl_FragCoord.xy / uRes;
  float aspecto = uRes.x / uRes.y;
  // y hacia abajo, como el DOM: así uEdges y los rectángulos llegan tal cual.
  vec2 st = vec2(s.x, 1.0 - s.y);
  vec2 p = vec2((s.x - 0.5) * aspecto, s.y - 0.5);

  // ---- Tema por píxel: 0 oscuro, 1 claro ----
  float y = st.y;
  float f = uFeather;
  float claro = smoothstep(uEdges.x - f, uEdges.x + f, y) - smoothstep(uEdges.y - f, uEdges.y + f, y)
              + smoothstep(uEdges.z - f, uEdges.z + f, y) - smoothstep(uEdges.w - f, uEdges.w + f, y);
  claro = clamp(claro, 0.0, 1.0);

  // ---- Calma detrás del texto ----
  vec2 pc = vec2(st.x * aspecto, st.y);
  vec4 ca = vec4(uCalmA.x * aspecto, uCalmA.y, uCalmA.z * aspecto, uCalmA.w);
  vec4 cb = vec4(uCalmB.x * aspecto, uCalmB.y, uCalmB.z * aspecto, uCalmB.w);
  vec4 cc = vec4(uCalmC.x * aspecto, uCalmC.y, uCalmC.z * aspecto, uCalmC.w);
  // El borde de la calma se mide en alturas de pantalla: en un teléfono en
  // vertical 0,24 serían 200 px y se comería el único hueco para el metal.
  float fc = mix(0.08, 0.24, smoothstep(0.6, 1.3, aspecto));
  float calma = max(rectSuave(pc, ca, fc) * uCalmW.x, rectSuave(pc, cb, fc) * uCalmW.y);
  calma = max(calma, rectSuave(pc, cc, fc) * uCalmW.z);
  // Franja de la cabecera: los enlaces nunca quedan sobre un brillo.
  calma = max(calma, 1.0 - smoothstep(0.05, 0.13, st.y));

  // ---- Superficie ----
  float t = uTime;
  vec2 q = p * 0.62;
  q.y += uFlow;
  vec2 w = vec2(fbm(q * 0.7 + vec2(0.0, t * 0.03)), fbm(q * 0.7 + vec2(5.2, 1.3) - vec2(t * 0.025, 0.0)));
  float e = 0.006;
  float h0 = altura(q, w, t);
  float hx = altura(q + vec2(e, 0.0), w, t);
  float hy = altura(q + vec2(0.0, e), w, t);
  vec3 n = normalize(vec3((h0 - hx) / e * 0.3, (h0 - hy) / e * 0.3, 1.0));

  // ---- Reflejo del estudio ----
  vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
  vec2 dir = normalize(vec2(cos(uAngle), sin(uAngle)) + uTilt * 0.12);
  float a = dot(r.xy, dir);
  float b = dot(r.xy, vec2(-dir.y, dir.x));

  float caja1 = banda(a, 0.12, 0.46, 0.07);
  float caja2 = banda(a, -0.52, -0.30, 0.05);
  float cielo = smoothstep(0.55, 0.95, a);
  float suelo = smoothstep(-0.2, -0.85, b);
  float entorno = 0.06 + 0.78 * caja1 + 0.34 * caja2 + 0.3 * cielo;
  entorno *= 1.0 - 0.55 * suelo;

  float calida = banda(b, 0.34, 0.64, 0.09);
  float fresnel = pow(1.0 - n.z, 2.0);
  float especular = pow(max(dot(r, normalize(vec3(dir * 0.5, 1.0))), 0.0), 56.0);
  float L = clamp(entorno + fresnel * 0.35 + especular * 0.8, 0.0, 1.25);

  // ---- Dónde hay metal ----
  float m = fbm(p * 0.55 + vec2(t * 0.012, uFlow * 0.6 + 3.1));
  float mascara = smoothstep(-0.32, 0.42, m + uCover);
  float k = mascara * uEnergy * (1.0 - 0.92 * calma);

  // ---- Color ----
  vec3 oro = vec3(0.851, 0.745, 0.549);
  vec3 grafito = vec3(0.043, 0.047, 0.055);
  vec3 acero = vec3(0.925, 0.925, 0.914);

  vec3 metalOscuro = vec3(0.03, 0.033, 0.04) + vec3(0.74, 0.75, 0.76) * L;
  metalOscuro += oro * calida * uAccent * 0.62 * (0.4 + L);
  metalOscuro += mix(vec3(1.0), oro, 0.55) * especular * 0.3 * uAccent;

  // En el mundo claro el metal es acero pulido de poco contraste: reflejos
  // amplios y pálidos, nunca vetas oscuras bajo el texto.
  vec3 metalClaro = vec3(0.6, 0.605, 0.615) + vec3(0.4, 0.395, 0.385) * L;
  metalClaro = mix(metalClaro, metalClaro * vec3(1.04, 0.9, 0.7), calida * uAccent * 0.85);

  vec3 colOscuro = mix(grafito, metalOscuro, k);
  vec3 colClaro = mix(acero, metalClaro, k * 0.7);

  // Viñeteado suave solo en el mundo oscuro: centra la mirada.
  float vin = 1.0 - 0.32 * smoothstep(0.35, 1.05, length(p * vec2(0.78, 1.0)));
  colOscuro *= vin;

  vec3 col = mix(colOscuro, colClaro, claro);
  // Tramado de ±½ nivel: evita bandas en los degradados largos.
  col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;
