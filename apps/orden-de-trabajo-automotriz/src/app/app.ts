import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  phosphorFolderUser,
  phosphorPaintRoller,
  phosphorPlusCircle,
  phosphorSquaresFour,
  phosphorWrench,
} from '@ng-icons/phosphor-icons/regular';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NgIcon],
  providers: [
    provideIcons({
      phosphorWrench,
      phosphorPaintRoller,
      phosphorSquaresFour,
      phosphorPlusCircle,
      phosphorFolderUser,
    }),
  ],
  selector: 'ota-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'Orden de trabajo';
  protected subtitulo = 'Taller automotriz';
}
