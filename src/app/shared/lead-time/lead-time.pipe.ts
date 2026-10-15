import { Pipe, PipeTransform } from '@angular/core';
import { formatLeadTime } from './lead-time.util';

/** `{{ hours | leadTime }}` → « 2 jours », « 12 heures »… */
@Pipe({ name: 'leadTime' })
export class LeadTimePipe implements PipeTransform {
  transform(hours: number | null | undefined): string {
    return formatLeadTime(hours);
  }
}
