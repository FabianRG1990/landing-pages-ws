/**
 * El relevo entre el catálogo y la cobertura, en pantallas de scroll.
 *
 * Al terminar su recorrido, el catálogo se queda quieto este tramo de
 * más mientras se desvanece; la cobertura, que va montada encima, se abre
 * sobre él durante el mismo tramo. Las dos secciones tienen que usar el
 * mismo número: el catálogo alarga su pin con él y la cobertura sube ese
 * mismo alto para empezar justo cuando el carril termina.
 */
export const RELEVO = 0.4;
