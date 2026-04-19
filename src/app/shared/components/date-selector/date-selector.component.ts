import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-date-selector',
  templateUrl: './date-selector.component.html',
  styleUrls: ['./date-selector.component.scss'],
  standalone: false,
})
export class DateSelectorComponent {
  @Input() selectedDate = '';
  @Input() label = 'Seleccionar Fecha';
  @Input() placeholder = 'Todas las fechas';
  @Output() dateChanged = new EventEmitter<string>();

  handleChange(event: Event): void {
    const detail = (event as CustomEvent).detail;
    const value = detail?.value ?? '';
    this.selectedDate = value;
    this.dateChanged.emit(value);
  }

  clearSelection(): void {
    this.selectedDate = '';
    this.dateChanged.emit('');
  }
}
