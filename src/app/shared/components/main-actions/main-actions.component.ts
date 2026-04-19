import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface MainAction {
  key: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-main-actions',
  templateUrl: './main-actions.component.html',
  styleUrls: ['./main-actions.component.scss'],
  standalone: false,
})
export class MainActionsComponent {
  @Input() actionList: MainAction[] = [];
  @Output() actionTriggered = new EventEmitter<string>();

  trackByKey(_: number, a: MainAction): string {
    return a.key;
  }
}
