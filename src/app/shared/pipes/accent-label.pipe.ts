import { Pipe, PipeTransform } from '@angular/core';
import { AccentOption } from '../../core/services/theme.service';

@Pipe({ name: 'accentLabel', pure: true, standalone: false })
export class AccentLabelPipe implements PipeTransform {
  transform(options: AccentOption[], current: string): string {
    return options.find(o => o.color === current)?.label ?? '';
  }
}
