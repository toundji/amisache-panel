import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { DonationService } from '../../../services/donation.service';
import { ChurchService } from '../../../services/church.service';
import { UserService } from '../../../services/user.service';
import { Donation } from '../../../models/donation.model';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-donation-detail',
  imports: [CommonModule, RouterLink, BackButtonComponent],
  templateUrl: './donation-detail.component.html',
  styleUrl: './donation-detail.component.scss',
})
export class DonationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly donationService = inject(DonationService);
  private readonly churchService = inject(ChurchService);
  private readonly userService = inject(UserService);

  private readonly donationId = this.route.snapshot.paramMap.get('id')!;
  private readonly stub =
    this.donationService.selected()?.id === this.donationId ? this.donationService.selected() : null;

  donation = signal<Donation | null>(this.stub);
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);

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

    this.donationService.getById(this.donationId).subscribe({
      next: (donation) => {
        this.donation.set(donation);
        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement du don.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  donorName(): string {
    const d = this.donation();
    if (!d) return '';
    if (d.user) {
      const n = `${d.user.firstName ?? ''} ${d.user.lastName ?? ''}`.trim();
      return n || d.user.email || d.userId;
    }
    const u = (this.userService.allForSelect() ?? []).find((x) => x.id === d.userId);
    if (!u) return d.userId;
    const n = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    return n || u.email || d.userId;
  }

  churchName(): string {
    const d = this.donation();
    if (!d) return '';
    return d.church?.name ?? (this.churchService.allForSelect() ?? []).find((c) => c.id === d.churchId)?.name ?? d.churchId;
  }

  typeName(): string {
    return this.donation()?.type?.name ?? this.donation()?.typeId ?? '';
  }
}
