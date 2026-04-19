import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-placeholder',
  templateUrl: './loading-placeholder.component.html',
  styleUrls: ['./loading-placeholder.component.scss'],
  standalone: false,
})
export class LoadingPlaceholderComponent {
  @Input() variant: 'card' | 'line' | 'list' = 'card';
  @Input() itemCount = 3;

  get items(): number[] {
    return Array.from({ length: this.itemCount }, (_, i) => i);
  }
}
