import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginationService } from './pagination.service';

@Component({
  selector: 'app-pagination',
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent {
  @Input() showItemsPerPage = true;

  readonly perPageOptions = [10, 20, 50, 100];

  constructor(public pagination: PaginationService) {}

  onPerPageChange(event: Event): void {
    const value = +(event.target as HTMLSelectElement).value;
    this.pagination.setItemsPerPage(value);
  }
}
