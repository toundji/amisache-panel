import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { ChatService } from '../../../services/chat.service';
import { ChatSocketService } from '../../../services/chat-socket.service';
import { Conversation, ConversationMode, ConversationStatus, CONVERSATION_STATUS_LABELS } from '../../../models/chat.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { ClergyContextService } from '../../../services/clergy-context.service';

interface ConversationUpdatedEvent {
  conversation: {
    id: string;
    status: ConversationStatus;
    mode: ConversationMode;
    lastMessageAt?: string;
    lastMessagePreview?: string;
    lastMessageSenderId?: string | null;
  };
}

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
  readonly chatSocket = inject(ChatSocketService);
  readonly pagination = inject(PaginationService);
  private readonly clergyContext = inject(ClergyContextService);
  private readonly destroyRef = inject(DestroyRef);

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

    // Les conversations de la bulle publique (visiteur anonyme) n'ont jamais
    // d'admin/clergé comme participant tant qu'un handoff n'a pas eu lieu —
    // `myConversations` (participant uniquement) n'en montrerait aucune. Un
    // compte admin/engineer voit donc tout ; un clergé pur reste sur ses
    // propres conversations (aucune vue "toutes les paroisses" pour lui).
    const source = this.clergyContext.isFullAccess()
      ? this.chatService.listAdmin({ page, limit })
      : this.chatService.myConversations({ page, limit });

    source.subscribe({
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

  // Rooms `conversation:{id}` rejointes pour les lignes actuellement affichées —
  // seule façon pour un compte clergé pur (pas admin/engineer, donc jamais dans
  // `admin:chat`) de recevoir des mises à jour de liste en direct : il ne peut
  // rejoindre que les conversations dont il est déjà participant (voir
  // ChatGateway.onJoinConversation), ce qui est justement le contenu de
  // `myConversations`. Sans effet pour un admin/engineer (déjà tout reçu via
  // `admin:chat`), mais rejoindre reste inoffensif dans ce cas.
  private joinedRooms = new Set<string>();
  private silentReloadTimer?: ReturnType<typeof setTimeout>;

  private syncRooms = effect(() => {
    const ids = new Set((this.conversations() ?? []).map((c) => c.id));
    for (const id of this.joinedRooms) {
      if (!ids.has(id)) this.chatSocket.leaveConversation(id);
    }
    for (const id of ids) {
      if (!this.joinedRooms.has(id)) this.chatSocket.joinConversation(id);
    }
    this.joinedRooms = ids;
  });

  constructor() {
    this.chatSocket.connect();

    this.chatSocket
      .on<ConversationUpdatedEvent>('conversation:updated')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ conversation }) => {
        const patched = this.chatService.patchConversationSummary(conversation);
        if (!patched) this.scheduleSilentReload();
      });
  }

  /** Une conversation non affichée a changé (nouvelle, ou sortie de la page courante) — recharge sans overlay bloquant. */
  private scheduleSilentReload(): void {
    clearTimeout(this.silentReloadTimer);
    this.silentReloadTimer = setTimeout(() => this.reloadTrigger.update((v) => v + 1), 800);
  }

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
