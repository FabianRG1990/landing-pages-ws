// Metal líquido contenido en una pieza: el bisel de un dispositivo.
//
// El lienzo cubre el dispositivo entero. Al principio el metal lo llena
// todo; con uRevelar de 0 a 1 se retira hacia el borde con un frente
// ondulado y un menisco de luz, y deja ver la pantalla. Con uRevelar = 1
// solo queda el bisel, de uMarco píxeles.
//
// El color es un estudio neutro (cielo gris, dos cajas de luz anchas) con
// una banda cálida champán. Frecuencia baja y relieve suave: mercurio, no
// papel de aluminio.

export const VERTICE = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const FRAGMENTO = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uLuz;
uniform float uRevelar;
uniform float uMarco;
uniform float uRadio;

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
  m = m * m; m = m * m;
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
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 3; i++) {
    s += a * snoise(p);
    p = p * 1.9 + vec2(1.7, 9.2);
    a *= 0.38;
  }
  return s;
}

float altura(vec2 p) {
  vec2 q = vec2(fbm(p + vec2(0.0, uTime * 0.035)), fbm(p + vec2(5.2, 1.3) - uTime * 0.028));
  return fbm(p + 0.9 * q);
}

float caja(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 c = uRes * 0.5;
  float lado = max(uRes.x, uRes.y);

  // Distancia al borde de la pantalla: negativa dentro.
  float d = caja(px - c, c - vec2(uMarco), uRadio);
  float hondo = min(c.x, c.y) - uMarco;

  vec2 p = (px - c) / lado * 0.75;
  float resta = 1.0 - uRevelar;
  float onda = fbm(p * 3.2 + vec2(uTime * 0.06, -uTime * 0.04));
  // El frente es una elipse que crece desde el centro con el aspecto del
  // dispositivo: el metal se escurre hacia las esquinas, que se vacían las
  // últimas. (Las curvas de nivel de la caja serían rectángulos: una barra.)
  vec2 q = (px - c) / c;
  float radial = length(q) * 0.7071;
  float alcance = uRevelar * 1.35 - 0.12;
  float frente = (radial - alcance + onda * 0.16 * resta) * hondo;
  float alfa = max(clamp(d + 0.5, 0.0, 1.0), clamp(frente + 0.5, 0.0, 1.0));
  if (alfa <= 0.0) { gl_FragColor = vec4(0.0); return; }

  float e = 1.5 / lado;
  float h = altura(p), hx = altura(p + vec2(e, 0.0)), hy = altura(p + vec2(0.0, e));
  vec3 n = normalize(vec3((h - hx) / e * 0.16, (h - hy) / e * 0.16, 1.0));
  vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
  float y = r.y + uLuz.y, x = r.x + uLuz.x;

  vec3 col = mix(vec3(0.63, 0.635, 0.64), vec3(0.9, 0.9, 0.89), smoothstep(-1.0, 0.7, y));
  col += 0.09 * exp(-pow((y - 0.42) / 0.2, 2.0));
  col += 0.07 * exp(-pow((x + 0.6) / 0.25, 2.0));
  col = mix(col, vec3(0.86, 0.77, 0.6), 0.4 * exp(-pow((y + 0.4) / 0.2, 2.0)));
  float f = pow(1.0 - n.z, 2.0);
  col = mix(col, vec3(0.95, 0.95, 0.94), f * 0.25);

  // Menisco: el borde del metal que se retira atrapa la luz.
  float dentro = step(0.0, -d);
  col += vec3(0.1) * exp(-abs(frente) / 3.5) * dentro * resta;
  // Arista mecanizada donde el bisel se encuentra con la pantalla.
  col *= 1.0 - 0.22 * exp(-abs(d) / 1.4) * uRevelar;

  col += (fract(sin(dot(px, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(col * alfa, alfa);
}
`;
