import { Component, Input, Output, EventEmitter, ElementRef, NgZone, OnDestroy, AfterViewInit, inject } from '@angular/core';
import { FinancialRecord } from '../../../core/models/movement.model';

@Component({
  selector: 'app-transaction-item',
  templateUrl: './transaction-item.component.html',
  styleUrls: ['./transaction-item.component.scss'],
  standalone: false,
})
export class TransactionItemComponent implements AfterViewInit, OnDestroy {
  @Input() record!: FinancialRecord;
  @Output() longPressed = new EventEmitter<void>();

  private el = inject(ElementRef);
  private zone = inject(NgZone);
  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private pressing = false;

  ngAfterViewInit(): void {
    const host = this.el.nativeElement as HTMLElement;
    this.zone.runOutsideAngular(() => {
      host.addEventListener('touchstart', this.onTouchStart, { passive: false });
      host.addEventListener('touchend', this.onTouchEnd);
      host.addEventListener('touchcancel', this.onTouchEnd);
      host.addEventListener('touchmove', this.onTouchMove, { passive: false });
      host.addEventListener('mousedown', this.onMouseDown);
      host.addEventListener('mouseup', this.onMouseUp);
      host.addEventListener('mouseleave', this.onMouseUp);
    });
  }

  ngOnDestroy(): void {
    const host = this.el.nativeElement as HTMLElement;
    host.removeEventListener('touchstart', this.onTouchStart);
    host.removeEventListener('touchend', this.onTouchEnd);
    host.removeEventListener('touchcancel', this.onTouchEnd);
    host.removeEventListener('touchmove', this.onTouchMove);
    host.removeEventListener('mousedown', this.onMouseDown);
    host.removeEventListener('mouseup', this.onMouseUp);
    host.removeEventListener('mouseleave', this.onMouseUp);
    this.clearTimer();
  }

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    this.startPress();
  };

  private onTouchEnd = (): void => {
    this.endPress();
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (this.pressing) {
      e.preventDefault();
      this.endPress();
    }
  };

  private onMouseDown = (): void => {
    this.startPress();
  };

  private onMouseUp = (): void => {
    this.endPress();
  };

  private startPress(): void {
    this.pressing = true;
    this.pressTimer = setTimeout(() => {
      this.zone.run(() => this.longPressed.emit());
      this.pressing = false;
    }, 600);
  }

  private endPress(): void {
    this.pressing = false;
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  }
}
