import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { inject } from '@angular/core';
import { CONTACTO, SITE } from '@adn-business-ui-shared/data/site';
import { IsotipoComponent } from '@adn-business-ui-shared/marca/isotipo';

type Estado = 'listo' | 'enviando' | 'enviado';

/**
 * Contacto.
 *
 * Demo: valida de verdad y muestra los tres estados (listo, enviando,
 * enviado), pero no envia a ningun servidor. Incluye consentimiento
 * expreso, que la Ley 29733 de Proteccion de Datos Personales exige y
 * que el formulario actual del cliente no tiene.
 */
@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [IsotipoComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacto.html',
  styleUrl: './contacto.scss',
})
export class ContactoComponent {
  protected readonly c = CONTACTO;
  protected readonly site = SITE;
  protected readonly estado = signal<Estado>('listo');

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    correo: ['', [Validators.required, Validators.email]],
    telefono: [
      '',
      [Validators.required, Validators.pattern(/^[+\d][\d\s()-]{6,19}$/)],
    ],
    empresa: ['', [Validators.required, Validators.minLength(2)]],
    interes: ['', Validators.required],
    consentimiento: [false, Validators.requiredTrue],
  });

  protected campoMal(nombre: string): boolean {
    const c = this.form.get(nombre);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  protected enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.estado.set('enviando');
    // Demo: sin backend. El retardo simula la ida y vuelta real.
    setTimeout(() => this.estado.set('enviado'), 900);
  }

  protected otraConsulta(): void {
    this.form.reset();
    this.estado.set('listo');
  }
}
