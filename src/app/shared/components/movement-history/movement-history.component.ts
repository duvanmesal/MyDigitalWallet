import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FinancialRecord } from '../../../core/models/movement.model';

@Component({
  selector: 'app-record-list',
  templateUrl: './movement-history.component.html',
  styleUrls: ['./movement-history.component.scss'],
  standalone: false,
})
export class MovementHistoryComponent {
  @Input() recordsList: FinancialRecord[] = [];
  @Output() recordLongPressed = new EventEmitter<FinancialRecord>();

  trackById(_: number, record: FinancialRecord): string {
    return record.id ?? `${record.timestamp}-${record.vendor}`;
  }
}
