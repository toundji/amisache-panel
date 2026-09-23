import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Socket, io } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Connexion Socket.io du panel — namespace /chat du backend. Toujours
 * authentifiée (JWT) : contrairement à la bulle publique, le panel n'a pas
 * de flux invité. Un admin/engineer rejoint automatiquement la room
 * `admin:chat` côté serveur (voir ChatGateway.handleConnection) — c'est ce
 * qui alimente les mises à jour de liste sans devoir rejoindre chaque
 * conversation une à une pour ce rôle ; un compte clergé simple s'appuie
 * sur `joinConversation`/`leaveConversation` (voir ConversationListComponent).
 */
@Injectable({ providedIn: 'root' })
export class ChatSocketService {
  private readonly authService = inject(AuthService);
  private socket: Socket | null = null;

  connect(): void {
    if (this.socket) return;

    this.socket = io(`${environment.apiUrl}/chat`, {
      auth: {
        token: this.authService.getToken() ?? undefined,
        apiKey: environment.apiKey
      },
      transports: ['websocket', 'polling']
    });

    // Le gateway rejette une connexion invalide APRÈS l'avoir acceptée au
    // niveau transport (émission d'un événement `error` applicatif puis
    // `disconnect`, jamais un `connect_error`) — sans ces logs, un rejet
    // silencieux ne laisse aucune trace, ni console ni UI.
    this.socket.on('connect', () => console.info('[chat socket] connected', this.socket?.id));
    this.socket.on('connect_error', (err) => console.error('[chat socket] connect_error', err));
    this.socket.on('error', (payload) => console.error('[chat socket] error', payload));
    this.socket.on('disconnect', (reason) => console.warn('[chat socket] disconnect', reason));
    // Diagnostic temporaire — voir ChatSocketService (amisache-client) pour le détail.
    this.socket.onAny((event, ...args) => console.debug('[chat socket] event', event, args));
  }

  joinConversation(conversationId: string): void {
    console.debug('[chat socket] join_conversation ->', conversationId);
    this.socket?.emit('join_conversation', { conversationId });
  }

  leaveConversation(conversationId: string): void {
    this.socket?.emit('leave_conversation', { conversationId });
  }

  setTyping(conversationId: string, isTyping: boolean): void {
    this.socket?.emit('typing', { conversationId, isTyping });
  }

  on<T>(event: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const socket = this.socket;
      if (!socket) {
        subscriber.complete();
        return;
      }
      const handler = (payload: T) => subscriber.next(payload);
      socket.on(event, handler);
      return () => socket.off(event, handler);
    });
  }
}
