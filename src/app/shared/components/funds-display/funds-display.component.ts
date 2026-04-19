import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-funds-display',
  templateUrl: './funds-display.component.html',
  styleUrls: ['./funds-display.component.scss'],
  standalone: false,
})
export class FundsDisplayComponent {
  @Input() greeting = 'Hola,';
  @Input() clientName: string | null = '';
  @Input() totalFunds: number | null = 0;
  @Input() isVisible = true;
  @Output() onToggle = new EventEmitter<void>();
}
