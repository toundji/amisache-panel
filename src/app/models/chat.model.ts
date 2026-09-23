// Doit rester synchronisé avec amisache-backend :
// src/shared/common.enum.ts (ConversationStatus, ConversationMode, ActorType, MessageKind, AttachmentKind)
// src/chat/chat.enum.ts (ParticipantRole — propre au métier Amisache, pas shared/)
// src/chat/entities/*.entity.ts, src/chat/dto/*.dto.ts, src/chat/controllers/chat-guest.controller.ts

export enum ConversationStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum ConversationMode {
  BOT = 'BOT',
  AGENT = 'AGENT',
}

/** Décide comment résoudre actorId/senderId — HUMAN = ligne User, GUEST = visiteur
 *  anonyme de la bulle publique (aucune ligne User), AI = bot, SYSTEM = peut être null */
export enum ActorType {
  HUMAN = 'HUMAN',
  GUEST = 'GUEST',
  AI = 'AI',
  SYSTEM = 'SYSTEM',
}

/** Rôles propres au métier Amisache (fidèle/clergé) — remplace le DRIVER/CLIENT/
 *  ASSIGNED_AGENT générique du template, cf. amisache-backend EVOLUTION.md 2026-09-20. */
export enum ParticipantRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
  /** Le fidèle (ou visiteur) qui pose une question. */
  FAITHFUL = 'FAITHFUL',
  /** Un membre du clergé/personnel qui répond au nom d'une paroisse. */
  CLERGY = 'CLERGY',
}

export enum MessageKind {
  TEXT = 'TEXT',
  MEDIA = 'MEDIA',
  CALL = 'CALL',
  SYSTEM = 'SYSTEM',
}

export enum AttachmentKind {
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  FILE = 'FILE',
}

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  [ConversationStatus.OPEN]: 'Ouverte',
  [ConversationStatus.PENDING]: 'En attente',
  [ConversationStatus.RESOLVED]: 'Résolue',
  [ConversationStatus.CLOSED]: 'Fermée',
};

export const PARTICIPANT_ROLE_LABELS: Record<ParticipantRole, string> = {
  [ParticipantRole.OWNER]: 'Propriétaire',
  [ParticipantRole.MEMBER]: 'Membre',
  [ParticipantRole.FAITHFUL]: 'Fidèle',
  [ParticipantRole.CLERGY]: 'Clergé',
};

export interface Conversation {
  id: string;
  subjectType?: string | null;
  subjectId?: string | null;
  status: ConversationStatus;
  mode: ConversationMode;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  lastMessageSenderId?: string | null;
  closedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Attachment {
  id: string;
  messageId: string;
  kind: AttachmentKind;
  url: string;
  meta?: Record<string, unknown> | null;
  createdAt?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId?: string | null;
  senderType: ActorType;
  kind: MessageKind;
  body?: string | null;
  replyTo?: string | null;
  createdAt?: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  failedAt?: string | null;
  contentDeletedAt?: string | null;
  attachments?: Attachment[];
}

export interface Participant {
  id: string;
  conversationId: string;
  actorId: string;
  actorType: ActorType;
  role: ParticipantRole;
  joinedAt: string;
  leftAt?: string | null;
  lastReadAt?: string | null;
}

// ── DTOs ─────────────────────────────────────────────────────

export interface AddParticipantDto {
  actorId: string;
  actorType: ActorType;
  role: ParticipantRole;
}

export interface CreateConversationDto {
  subjectType?: string;
  subjectId?: string;
  mode?: ConversationMode;
  participants?: AddParticipantDto[];
}

export interface CreateAttachmentDto {
  kind: AttachmentKind;
  url: string;
  meta?: Record<string, unknown>;
}

export interface SendMessageDto {
  body?: string;
  replyTo?: string;
  attachments?: CreateAttachmentDto[];
}

export interface HandoffDto {
  fromActorId: string;
  toActorId: string;
  toActorType: ActorType;
  toRole: ParticipantRole;
}

// ── Listes paginées ──────────────────────────────────────────

export interface ListConversationsQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedConversations {
  data: Conversation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListMessagesQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedMessages {
  data: Message[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
