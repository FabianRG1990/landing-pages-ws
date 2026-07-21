import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AREAS,
  Area,
  NIVELES_COMBUSTIBLE,
  OrdenTrabajo,
  OrdenesStore,
  areasDeOrden,
} from '@orden-de-trabajo-automotriz-ui-shared';

function alMenosUnArea(control: AbstractControl): ValidationErrors | null {
  const value = control.value as { mecanica: boolean; pintura: boolean };
  return value.mecanica || value.pintura ? null : { ningunArea: true };
}

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
  private readonly route = inject(ActivatedRoute);

  private readonly areaInicial = this.route.snapshot.queryParamMap.get('area') as Area | null;

  protected readonly areas = AREAS;
  protected readonly nivelesCombustible = NIVELES_COMBUSTIBLE;
  protected readonly ordenCreada = signal<OrdenTrabajo | null>(null);
  protected readonly intentoEnviar = signal(false);
  protected readonly areasDeOrden = areasDeOrden;

  protected readonly form = this.fb.nonNullable.group({
    areas: this.fb.nonNullable.group(
      {
        mecanica: [this.areaInicial === 'mecanica' || this.areaInicial === null],
        pintura: [this.areaInicial === 'pintura'],
      },
      { validators: alMenosUnArea },
    ),
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
    this.intentoEnviar.set(false);
    this.form.reset({
      areas: {
        mecanica: this.areaInicial === 'mecanica' || this.areaInicial === null,
        pintura: this.areaInicial === 'pintura',
      },
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
    this.intentoEnviar.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { areas, cliente, vehiculo, motivoIngreso } = this.form.getRawValue();
    const areasSeleccionadas: Area[] = this.areas
      .map((a) => a.value)
      .filter((value) => areas[value]);

    const orden = this.store.crearOrden({
      cliente,
      vehiculo: {
        ...vehiculo,
        kilometrajeIngreso: vehiculo.kilometrajeIngreso ?? undefined,
      },
      motivoIngreso,
      areas: areasSeleccionadas,
    });
    this.ordenCreada.set(orden);
  }
}
