import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  NgZone,
  AfterViewInit,
  OnDestroy,
  inject,
  HostBinding,
} from '@angular/core';
import { PaymentMethod } from '../../../core/models/payment.model';

@Component({
  selector: 'app-payment-card',
  templateUrl: './payment-card.component.html',
  styleUrls: ['./payment-card.component.scss'],
  standalone: false,
})
export class PaymentCardComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) paymentData!: PaymentMethod;
  @Input() hideBalance = false;
  @Input() enableTilt = true;
  @Input() animateEntry = false;

  @Output() editRequested = new EventEmitter<PaymentMethod>();

  @HostBinding('class.card-entry') get entryClass() { return this.animateEntry; }

  isFlipped = false;

  /** Random barcode bars for visual flair on the back */
  barcodeBars: number[] = Array.from({ length: 30 }, () => Math.random() > 0.5 ? 2 : 1);

  private el = inject(ElementRef);
  private zone = inject(NgZone);
  private cardFront!: HTMLElement;
  private shine!: HTMLElement;
  private touching = false;

  get expirationDisplay(): string {
    const mm = String(this.paymentData.expirationMonth).padStart(2, '0');
    const yy = String(this.paymentData.expirationYear).padStart(2, '0').slice(-2);
    return `${mm}/${yy}`;
  }

  get networkDisplay(): string {
    return this.paymentData.paymentNetwork === 'visa'
      ? 'VISA'
      : this.paymentData.paymentNetwork === 'mastercard'
      ? 'Mastercard'
      : '';
  }

  toggleFlip(event: Event): void {
    event.stopPropagation();
    this.isFlipped = !this.isFlipped;
  }

  ngAfterViewInit(): void {
    this.cardFront = this.el.nativeElement.querySelector('.card-front') as HTMLElement;
    this.shine = this.el.nativeElement.querySelector('.card-shine') as HTMLElement;
    if (!this.cardFront || !this.enableTilt) return;

    this.zone.runOutsideAngular(() => {
      this.cardFront.addEventListener('touchstart', this.onTouch, { passive: true });
      this.cardFront.addEventListener('touchmove', this.onTouchMove, { passive: true });
      this.cardFront.addEventListener('touchend', this.onRelease);
      this.cardFront.addEventListener('touchcancel', this.onRelease);
      this.cardFront.addEventListener('mousedown', this.onMouseDown);
      this.cardFront.addEventListener('mousemove', this.onMouseMove);
      this.cardFront.addEventListener('mouseup', this.onRelease);
      this.cardFront.addEventListener('mouseleave', this.onRelease);
    });
  }

  ngOnDestroy(): void {
    if (!this.cardFront) return;
    this.cardFront.removeEventListener('touchstart', this.onTouch);
    this.cardFront.removeEventListener('touchmove', this.onTouchMove);
    this.cardFront.removeEventListener('touchend', this.onRelease);
    this.cardFront.removeEventListener('touchcancel', this.onRelease);
    this.cardFront.removeEventListener('mousedown', this.onMouseDown);
    this.cardFront.removeEventListener('mousemove', this.onMouseMove);
    this.cardFront.removeEventListener('mouseup', this.onRelease);
    this.cardFront.removeEventListener('mouseleave', this.onRelease);
  }

  private onTouch = (e: TouchEvent): void => {
    this.touching = true;
    this.applyTilt(e.touches[0].clientX, e.touches[0].clientY);
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.touching) return;
    this.applyTilt(e.touches[0].clientX, e.touches[0].clientY);
  };

  private onMouseDown = (e: MouseEvent): void => {
    this.touching = true;
    this.applyTilt(e.clientX, e.clientY);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.touching) return;
    this.applyTilt(e.clientX, e.clientY);
  };

  private onRelease = (): void => {
    this.touching = false;
    const container = this.el.nativeElement.querySelector('.card-container') as HTMLElement;
    if (container) {
      container.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.6s ease';
      container.style.transform = '';
      container.style.boxShadow = '';
    }
    if (this.shine) {
      this.shine.style.transition = 'opacity 0.6s ease';
      this.shine.style.opacity = '0';
    }
  };

  private applyTilt(clientX: number, clientY: number): void {
    if (this.isFlipped) return;
    const container = this.el.nativeElement.querySelector('.card-container') as HTMLElement;
    if (!container) return;
    const rect = this.cardFront.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateY = ((x - centerX) / centerX) * 12;
    const rotateX = ((centerY - y) / centerY) * 10;

    container.style.transition = 'transform 0.1s ease-out';
    container.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;

    if (this.shine) {
      const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
      const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const intensity = Math.min(dist / Math.max(centerX, centerY), 1);
      this.shine.style.transition = 'none';
      this.shine.style.opacity = String(intensity * 0.45);
      this.shine.style.background = `linear-gradient(${angle}deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%)`;
    }
  }
}
