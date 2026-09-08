import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  Conversation,
  CreateConversationDto,
  HandoffDto,
  ListConversationsQuery,
  ListMessagesQuery,
  Message,
  Participant,
  PaginatedConversations,
  PaginatedMessages,
  SendMessageDto,
} from '../models/chat.model';

/**
 * Miroir de ChatController (nest-auth-base src/chat/controllers/chat.controller.ts).
 * L'appelant HTTP est toujours l'utilisateur connecté (acteur HUMAN, déduit du
 * JWT côté API) — le panel n'a jamais à transmettre actorId/actorType pour
 * ses propres actions, seulement pour les acteurs tiers (handoff).
 * GET /chat/conversations et GET .../messages sont paginés côté serveur.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);

  private conversationsSignal = signal<Conversation[] | undefined>(undefined);
  private conversationsPaginationMetaSignal = signal({ total: 0, page: 1, limit: 20, totalPages: 1 });
  private selectedSignal = signal<Conversation | null>(null);

  private messagesSignal = signal<Message[] | undefined>(undefined);
  private messagesPaginationMetaSignal = signal({ total: 0, page: 1, limit: 30, totalPages: 1 });

  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  readonly conversations = this.conversationsSignal.asReadonly();
  readonly conversationsPaginationMeta = this.conversationsPaginationMetaSignal.asReadonly();
  // Élément cliqué depuis la liste — stub affiché sur la page de détail le
  // temps que `getById` réponde (cf. CLAUDE.md § Pages de détail).
  readonly selected = this.selectedSignal.asReadonly();

  // Messages du fil actuellement ouvert, du plus ancien au plus récent.
  readonly messages = this.messagesSignal.asReadonly();
  readonly messagesPaginationMeta = this.messagesPaginationMetaSignal.asReadonly();

  select(conversation: Conversation): void {
    this.selectedSignal.set(conversation);
  }

  // ── Conversations ──────────────────────────────────────────

  myConversations(query: ListConversationsQuery = {}): Observable<PaginatedConversations> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PaginatedConversations>('chat/conversations', { params }).pipe(
      tap((result) => {
        this.conversationsSignal.set(result.data);
        this.conversationsPaginationMetaSignal.set({
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        });
      }),
    );
  }

  getById(id: string): Observable<Conversation> {
    return this.http.get<Conversation>(`chat/conversations/${id}`);
  }

  getUnreadCount(conversationId: string): Observable<number> {
    return this.http.get<number>(`chat/conversations/${conversationId}/unread-count`);
  }

  /** Participants actifs — utilisé pour choisir la cible d'un handoff BOT -> AGENT */
  listParticipants(conversationId: string): Observable<Participant[]> {
    return this.http.get<Participant[]>(`chat/conversations/${conversationId}/participants`);
  }

  /** Ouvre un nouveau fil, ou réutilise le fil existant si subjectType + subjectId correspondent déjà à une conversation */
  createOrOpen(body: CreateConversationDto): Observable<Conversation> {
    return this.http.post<Conversation>('chat/conversations', body);
  }

  // ── Messages du fil ouvert ─────────────────────────────────

  /**
   * L'API renvoie la page demandée triée du plus récent au plus ancien.
   * `append: false` (défaut, ouverture du fil) remplace `messages` en remettant
   * dans l'ordre chronologique. `append: true` (bouton "Messages précédents")
   * insère la page suivante (plus ancienne) AVANT les messages déjà affichés.
   */
  listMessages(
    conversationId: string,
    query: ListMessagesQuery = {},
    append = false,
  ): Observable<PaginatedMessages> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PaginatedMessages>(`chat/conversations/${conversationId}/messages`, { params }).pipe(
      tap((result) => {
        const chronological = [...result.data].reverse();
        this.messagesSignal.update((current) =>
          append ? [...chronological, ...(current ?? [])] : chronological,
        );
        this.messagesPaginationMetaSignal.set({
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        });
      }),
    );
  }

  /** Réinitialise le fil affiché — à appeler en quittant une conversation avant d'en ouvrir une autre. */
  resetMessages(): void {
    this.messagesSignal.set(undefined);
    this.messagesPaginationMetaSignal.set({ total: 0, page: 1, limit: 30, totalPages: 1 });
  }

  sendMessage(conversationId: string, body: SendMessageDto): Observable<Message> {
    return this.http.post<Message>(`chat/conversations/${conversationId}/messages`, body).pipe(
      tap((message) => {
        this.messagesSignal.update((current) => [...(current ?? []), message]);
      }),
    );
  }

  /**
   * Variante multipart — texte + pièces jointes (image/vidéo/vocal/document)
   * uploadées et attachées en une seule requête. Miroir de
   * POST /chat/conversations/:id/messages/with-files.
   */
  /**
   * `isVoice` force AttachmentKind.AUDIO côté API : le sniffing par octets
   * magiques d'un .webm enregistré via MediaRecorder le détecte comme
   * `video/webm` (conteneur partagé audio/vidéo), pas `audio/webm`.
   */
  sendMessageWithFiles(
    conversationId: string,
    body: string | undefined,
    files: File[],
    isVoice = false,
  ): Observable<Message> {
    const form = new FormData();
    if (body) form.append('body', body);
    if (isVoice) form.append('isVoice', 'true');
    files.forEach((file) => form.append('files', file, file.name));

    return this.http
      .post<Message>(`chat/conversations/${conversationId}/messages/with-files`, form)
      .pipe(
        tap((message) => {
          this.messagesSignal.update((current) => [...(current ?? []), message]);
        }),
      );
  }

  markRead(conversationId: string): Observable<void> {
    return this.http.patch<void>(`chat/conversations/${conversationId}/read`, {});
  }

  /** Réservé à l'expéditeur — le message reste dans le fil comme placeholder « Message supprimé ». */
  deleteMessage(conversationId: string, messageId: string): Observable<Message> {
    return this.http
      .delete<Message>(`chat/conversations/${conversationId}/messages/${messageId}`)
      .pipe(
        tap((updated) => {
          this.messagesSignal.update((current) =>
            (current ?? []).map((m) => (m.id === updated.id ? updated : m)),
          );
        }),
      );
  }

  /** Transfert BOT -> AGENT — l'agent cible peut être différent de l'appelant */
  handoff(conversationId: string, body: HandoffDto): Observable<Participant> {
    return this.http.post<Participant>(`chat/conversations/${conversationId}/handoff`, body);
  }
}
