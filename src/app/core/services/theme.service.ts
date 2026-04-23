import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AccentOption {
  key: string;
  label: string;
  color: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { key: 'pink',   label: 'Rosa',    color: '#FF3366' },
  { key: 'blue',   label: 'Azul',    color: '#2C4BFF' },
  { key: 'green',  label: 'Verde',   color: '#00B37A' },
  { key: 'orange', label: 'Naranja', color: '#FF6B00' },
  { key: 'purple', label: 'Morado',  color: '#7C3AED' },
  { key: 'yellow', label: 'Amarillo',color: '#FFB800' },
];

const STORAGE_ACCENT   = 'dw_accent';
const STORAGE_DARKMODE = 'dw_dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly accentOptions = ACCENT_OPTIONS;

  private _accent$ = new BehaviorSubject<string>(ACCENT_OPTIONS[0].color);
  private _dark$   = new BehaviorSubject<boolean>(false);

  readonly accent$ = this._accent$.asObservable();
  readonly dark$   = this._dark$.asObservable();

  get currentAccent(): string { return this._accent$.value; }
  get isDark(): boolean        { return this._dark$.value; }

  init(): void {
    const savedAccent = localStorage.getItem(STORAGE_ACCENT);
    const savedDark   = localStorage.getItem(STORAGE_DARKMODE) === 'true';
    if (savedAccent) this.applyAccent(savedAccent, false);
    if (savedDark)   this.applyDark(true, false);
  }

  setAccent(color: string): void {
    this.applyAccent(color, true);
  }

  toggleDark(): void {
    this.applyDark(!this._dark$.value, true);
  }

  private applyAccent(color: string, save: boolean): void {
    this._accent$.next(color);
    const r = document.documentElement;
    r.style.setProperty('--dw-accent',                    color);
    r.style.setProperty('--ion-color-primary',             color);
    r.style.setProperty('--ion-color-primary-rgb',         this.hexToRgb(color));
    r.style.setProperty('--ion-color-primary-shade',       this.shade(color));
    r.style.setProperty('--ion-color-primary-tint',        this.tint(color));
    if (save) localStorage.setItem(STORAGE_ACCENT, color);
  }

  private applyDark(on: boolean, save: boolean): void {
    this._dark$.next(on);
    const r = document.documentElement;
    if (on) {
      // Fondo oscuro cálido (no frío gris)
      r.style.setProperty('--dw-paper',             '#18150F');
      r.style.setProperty('--dw-paper-2',            '#211D16');
      r.style.setProperty('--dw-ink',               '#EAE5D8');
      // Superficie de tarjetas/inputs
      r.style.setProperty('--dw-surface',            '#26211A');
      r.style.setProperty('--dw-surface-2',          '#302A21');
      // Sombras: más claras que fondo (efecto elevado)
      r.style.setProperty('--dw-shadow-sm',          '4px 4px 0 rgba(234,229,216,0.18)');
      r.style.setProperty('--dw-shadow-md',          '6px 6px 0 rgba(234,229,216,0.18)');
      r.style.setProperty('--dw-shadow-lg',          '8px 8px 0 rgba(234,229,216,0.18)');
      r.style.setProperty('--ion-background-color',  '#18150F');
      r.style.setProperty('--ion-text-color',        '#EAE5D8');
      document.body.classList.add('dw-dark');
    } else {
      r.style.setProperty('--dw-paper',             '#F4F1EA');
      r.style.setProperty('--dw-paper-2',            '#EAE5DA');
      r.style.setProperty('--dw-ink',               '#0A0A0A');
      r.style.setProperty('--dw-surface',            '#ffffff');
      r.style.setProperty('--dw-surface-2',          'rgba(0,0,0,0.03)');
      r.style.setProperty('--dw-shadow-sm',          '4px 4px 0 #0A0A0A');
      r.style.setProperty('--dw-shadow-md',          '6px 6px 0 #0A0A0A');
      r.style.setProperty('--dw-shadow-lg',          '8px 8px 0 #0A0A0A');
      r.style.setProperty('--ion-background-color',  '#F4F1EA');
      r.style.setProperty('--ion-text-color',        '#0A0A0A');
      document.body.classList.remove('dw-dark');
    }
    if (save) localStorage.setItem(STORAGE_DARKMODE, String(on));
  }

  private hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  }

  private shade(hex: string): string {
    return this.adjustBrightness(hex, -20);
  }

  private tint(hex: string): string {
    return this.adjustBrightness(hex, 20);
  }

  private adjustBrightness(hex: string, amount: number): string {
    const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amount));
    const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amount));
    const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
