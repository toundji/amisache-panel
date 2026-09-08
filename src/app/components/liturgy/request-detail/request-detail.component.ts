import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { RequestService } from '../../../services/request.service';
import { ChurchService } from '../../../services/church.service';
import { UserService } from '../../../services/user.service';
import { Request, REQUEST_STATUS_LABELS, RequestStatus } from '../../../models/request.model';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

const STATUS_BADGE: Record<RequestStatus, string> = {
  [RequestStatus.SUBMITTED]: 'status-warning',
  [RequestStatus.IN_PROGRESS]: 'status-info',
  [RequestStatus.CONFIRMED]: 'status-success',
  [RequestStatus.COMPLETED]: 'status-disabled',
  [RequestStatus.REJECTED]: 'status-danger',
};

@Component({
  selector: 'app-request-detail',
  imports: [CommonModule, RouterLink, BackButtonComponent],
  templateUrl: './request-detail.component.html',
  styleUrl: './request-detail.component.scss',
})
export class RequestDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly requestService = inject(RequestService);
  private readonly churchService = inject(ChurchService);
  private readonly userService = inject(UserService);

  private readonly requestId = this.route.snapshot.paramMap.get('id')!;
  private readonly stub =
    this.requestService.selected()?.id === this.requestId ? this.requestService.selected() : null;

  request = signal<Request | null>(this.stub);
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);
  statusSaving = signal(false);

  statusList = Object.values(RequestStatus);
  statusLabels = REQUEST_STATUS_LABELS;

  ngOnInit(): void {
    if (this.churchService.allForSelect() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    if (this.userService.allForSelect() === undefined) {
      this.userService.listAllForSelect().subscribe({ error: () => undefined });
    }
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.requestService.getById(this.requestId).subscribe({
      next: (request) => {
        this.request.set(request);
        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement de la demande.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  setStatus(status: RequestStatus): void {
    const request = this.request();
    if (!request || this.statusSaving() || request.status === status) return;

    this.statusSaving.set(true);
    this.requestService.updateStatus(request.id, status).subscribe({
      next: () => {
        this.request.update((r) => (r ? { ...r, status } : r));
        this.statusSaving.set(false);
      },
      error: (err) => {
        this.statusSaving.set(false);
        Swal.fire('Erreur', err?.error?.msg ?? 'Changement de statut impossible.', 'error');
      },
    });
  }

  statusBadge(status: RequestStatus): string {
    return STATUS_BADGE[status];
  }

  requesterName(): string {
    const r = this.request();
    if (!r) return '';
    if (r.user) {
      const n = `${r.user.firstName ?? ''} ${r.user.lastName ?? ''}`.trim();
      return n || r.user.email || r.userId;
    }
    const u = (this.userService.allForSelect() ?? []).find((x) => x.id === r.userId);
    if (!u) return r.userId;
    const n = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    return n || u.email || r.userId;
  }

  churchName(): string {
    const r = this.request();
    if (!r) return '';
    return r.church?.name ?? (this.churchService.allForSelect() ?? []).find((c) => c.id === r.churchId)?.name ?? r.churchId;
  }

  typeName(): string {
    return this.request()?.type?.name ?? this.request()?.typeId ?? '';
  }
}
