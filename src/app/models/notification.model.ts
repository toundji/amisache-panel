// Doit rester synchronisé avec nest-auth-base :
// src/notifications/dto/notification.dto.ts (NotificationView, PaginatedNotifications)
// src/notifications/entities/notification.entity.ts (Notification)

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt?: string;
  expiresAt?: string | null;
}

export interface ListNotificationsQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedNotifications {
  data: AppNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
