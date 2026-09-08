// ─────────────────────────────────────────────────────────────────────────────
// UserAvatarComponent — affiche l'avatar d'un utilisateur (photo ou initiales).
// Usage : <app-user-avatar [user]="user" size="sm"></app-user-avatar>
// ─────────────────────────────────────────────────────────────────────────────
import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarHelper, HasAvatar } from './avatar.helper';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-user-avatar',
  imports: [CommonModule],
  template: `
    <div class="avatar-wrapper" [class]="'avatar-' + size">
      <img *ngIf="imgUrl && !imgError" [src]="imgUrl" [alt]="altText" class="avatar-img" (error)="imgError = true">
      <div *ngIf="!imgUrl || imgError" class="avatar-initials-inner">{{ initialsText }}</div>
    </div>
  `,
  styles: [`
    .avatar-wrapper {
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--gradient-primary);
      color: #fff;
      font-weight: 700;
    }
    .avatar-xs { width: 24px; height: 24px; font-size: .6rem; }
    .avatar-sm { width: 36px; height: 36px; font-size: .72rem; }
    .avatar-md { width: 48px; height: 48px; font-size: .9rem; }
    .avatar-lg { width: 80px; height: 80px; font-size: 1.5rem; }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .avatar-initials-inner { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
  `],
})
export class UserAvatarComponent implements OnChanges {
  @Input() user?: HasAvatar & { firstName?: string; lastName?: string; email?: string };
  @Input() size: AvatarSize = 'sm';

  imgUrl = '';
  imgError = false;
  initialsText = '?';
  altText = 'Avatar';

  ngOnChanges(): void {
    this.imgError = false;
    this.imgUrl = this.user ? AvatarHelper.profileUrl(this.user) || '' : '';
    this.initialsText = this.user ? AvatarHelper.initials(this.user.firstName, this.user.lastName, this.user.email) : '?';
    this.altText = this.user ? [this.user.firstName, this.user.lastName].filter(Boolean).join(' ') || '?' : 'Avatar';
  }
}
