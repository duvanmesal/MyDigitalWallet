import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-custom-input',
  templateUrl: './custom-input.component.html',
  styleUrls: ['./custom-input.component.scss'],
  standalone: false,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomInputComponent),
      multi: true,
    },
  ],
})
export class CustomInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() inputType: 'text' | 'email' | 'password' | 'tel' | 'number' = 'text';
  @Input() placeholder = '';
  @Input() autocomplete = 'off';
  @Input() maxLength?: number;
  @Input() inputMode?: string;
  @Input() errorMessage = '';
  @Input() showError = false;

  currentValue = '';
  isTouched = false;
  isDisabled = false;

  private onChangeFn: (val: string) => void = () => {};
  private onTouchedFn: () => void = () => {};

  writeValue(value: string): void {
    this.currentValue = value ?? '';
  }

  registerOnChange(fn: (val: string) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.isDisabled = disabled;
  }

  handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.currentValue = target?.value ?? '';
    this.onChangeFn(this.currentValue);
  }

  handleBlur(): void {
    this.isTouched = true;
    this.onTouchedFn();
  }
}
