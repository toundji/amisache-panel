import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { ChatService } from '../../../services/chat.service';
import { Conversation, CONVERSATION_STATUS_LABELS } from '../../../models/chat.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

@Component({
  selector: 'app-conversation-list',
  // Instance locale — pagination propre à CETTE liste.
  providers: [PaginationService],
  imports: [CommonModule, RouterLink, PaginationComponent],
  templateUrl: './conversation-list.component.html',
  styleUrl: './conversation-list.component.scss',
})
export class ConversationListComponent {
  // Non privé : le template appelle `chatService.select(conversation)` avant de naviguer vers le détail.
  readonly chatService = inject(ChatService);
  readonly pagination = inject(PaginationService);

  statusLabels = CONVERSATION_STATUS_LABELS;

  conversations = this.chatService.conversations;
  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  isLoading = computed(() => this.conversations() === undefined);
  error = signal<string | null>(null);
  // Rechargement (page/refresh manuel) après le premier chargement — pas de skeleton, juste l'icône qui tourne
  refreshing = signal(false);

  // Incrémenté pour forcer un rechargement de la page courante (ex: clic sur "Actualiser").
  private reloadTrigger = signal(0);

  // true uniquement pour le prochain fetch déclenché par un clic explicite sur
  // "Actualiser" — distingue l'overlay Swal.showLoading() des rechargements silencieux.
  private isManualRefresh = false;

  // GET /chat/conversations est paginé côté serveur : on relance un fetch à
  // chaque changement de page/taille de page ou de reloadTrigger.
  private reload = effect(() => {
    const page = this.pagination.currentPage();
    const limit = this.pagination.itemsPerPage();
    this.reloadTrigger();

    const showLoader = this.isManualRefresh;
    this.isManualRefresh = false;

    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.chatService.myConversations({ page, limit }).subscribe({
      next: (result) => {
        this.pagination.setTotalOnly(result.total);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des conversations.');
        if (showLoader) Swal.close();
      },
    });
  });

  refresh(): void {
    this.isManualRefresh = true;
    this.reloadTrigger.update((v) => v + 1);
  }

  subjectLabel(conversation: Conversation): string {
    return conversation.subjectType && conversation.subjectId
      ? `${conversation.subjectType} #${conversation.subjectId.slice(0, 8)}`
      : 'Libre';
  }
}
