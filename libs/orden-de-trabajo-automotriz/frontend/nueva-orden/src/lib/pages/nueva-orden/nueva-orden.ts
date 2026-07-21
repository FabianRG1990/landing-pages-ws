import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  NIVELES_COMBUSTIBLE,
  OrdenTrabajo,
  OrdenesStore,
} from '@orden-de-trabajo-automotriz-ui-shared';

@Component({
  selector: 'ota-nueva-orden-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './nueva-orden.html',
  styleUrl: './nueva-orden.scss',
})
export class NuevaOrdenPage {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(OrdenesStore);

  protected readonly nivelesCombustible = NIVELES_COMBUSTIBLE;
  protected readonly ordenCreada = signal<OrdenTrabajo | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    cliente: this.fb.nonNullable.group({
      nombre: ['', Validators.required],
      telefono: ['', Validators.required],
      correo: [''],
      identificacion: [''],
    }),
    vehiculo: this.fb.nonNullable.group({
      placa: ['', Validators.required],
      marca: ['', Validators.required],
      modelo: ['', Validators.required],
      anio: ['', Validators.required],
      color: [''],
      kilometrajeIngreso: [null as number | null],
      nivelCombustible: ['medio' as const],
      llavesEntregadas: [1],
      pertenencias: [''],
      danosPrevios: [''],
    }),
    motivoIngreso: ['', Validators.required],
  });

  protected recibirOtroVehiculo(): void {
    this.ordenCreada.set(null);
    this.form.reset({
      cliente: { nombre: '', telefono: '', correo: '', identificacion: '' },
      vehiculo: {
        placa: '',
        marca: '',
        modelo: '',
        anio: '',
        color: '',
        kilometrajeIngreso: null,
        nivelCombustible: 'medio',
        llavesEntregadas: 1,
        pertenencias: '',
        danosPrevios: '',
      },
      motivoIngreso: '',
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { cliente, vehiculo, motivoIngreso } = this.form.getRawValue();
    const orden = this.store.crearOrden({
      cliente,
      vehiculo: {
        ...vehiculo,
        kilometrajeIngreso: vehiculo.kilometrajeIngreso ?? undefined,
      },
      motivoIngreso,
    });
    this.ordenCreada.set(orden);
  }
}
