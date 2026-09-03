const SCROLL_KEYS = new Set([
  ' ',
  'Spacebar',
  'PageUp',
  'PageDown',
  'End',
  'Home',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

/**
 * Bloquea el scroll (rueda, touch, teclado) sin tocar `overflow`. Se probó
 * con `overflow: hidden` primero, pero esa propiedad hace desaparecer el
 * gutter de la scrollbar nativa — y ese cambio de ancho del viewport es
 * justo el "brinco" que se quiso evitar al mostrar/ocultar el preloader y la
 * cortina. Interceptando los eventos de entrada en cambio, la scrollbar
 * sigue ocupando su espacio real todo el tiempo, visible y quieta.
 *
 * No cubre arrastrar el thumb nativo de la scrollbar con el mouse (ese gesto
 * no pasa por wheel/touch/teclado) — caso límite aceptado a propósito: exige
 * agarrar con precisión una franja de ~15px durante una transición de menos
 * de un segundo, y atenderlo implicaría pelear con el propio reset de scroll
 * a 0 que hace `go()` al cambiar de pantalla.
 */
export function installScrollLock(isLocked: () => boolean): void {
  const preventIfLocked = (e: Event): void => {
    if (isLocked()) e.preventDefault();
  };

  window.addEventListener('wheel', preventIfLocked, { passive: false });
  window.addEventListener('touchmove', preventIfLocked, { passive: false });

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (isLocked() && SCROLL_KEYS.has(e.key) && !isEditableTarget(e.target)) {
      e.preventDefault();
    }
  });
}
