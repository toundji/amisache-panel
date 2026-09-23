import { computed, effect, inject, Injectable, signal } from '@angular/core';

import { AuthService } from './auth.service';
import { ClergyMemberService } from './clergy-member.service';
import { UserRole } from '../models/user.model';
import { ClergyMember } from '../models/clergy-member.model';

const ACTIVE_CHURCH_STORAGE_KEY = 'clergyActiveChurchId';

/**
 * Portée d'accès du membre du clergé connecté — sépare deux mondes dans le
 * panel : admin/engineer voient toute la plateforme (routes `/xxx/admin`),
 * un compte `clergy` sans ces rôles ne voit que les églises où il a une
 * affectation ACTIVE (routes `/xxx/church/:churchId`). Un `clergy` peut aussi
 * être `admin` (compte staff qui porte en plus une casquette pastorale) —
 * dans ce cas `isFullAccess` prime, jamais l'inverse.
 *
 * `manager` n'entre PAS dans `isFullAccess` : ce rôle sert uniquement au
 * bypass technique du client API `manager` côté backend (AMISACHE.md §5),
 * pas à une autorisation panel.
 */
@Injectable({ providedIn: 'root' })
export class ClergyContextService {
  private readonly authService = inject(AuthService);
  private readonly clergyMemberService = inject(ClergyMemberService);

  readonly isFullAccess = computed(() => {
    const roles = this.authService.user()?.roles ?? [];
    return roles.includes(UserRole.admin) || roles.includes(UserRole.engineer);
  });

  private readonly myChurchesSignal = signal<ClergyMember[] | undefined>(undefined);
  readonly myChurches = this.myChurchesSignal.asReadonly();

  private readonly activeChurchIdSignal = signal<string | null>(
    localStorage.getItem(ACTIVE_CHURCH_STORAGE_KEY),
  );
  readonly activeChurchId = this.activeChurchIdSignal.asReadonly();

  readonly activeChurch = computed(() => {
    const id = this.activeChurchIdSignal();
    return this.myChurchesSignal()?.find((m) => m.churchId === id)?.church ?? null;
  });

  private loadedForUserId: string | null = null;

  constructor() {
    // Recharge les affectations dès qu'un compte non admin/engineer se connecte
    // (login, refresh de page avec session restaurée) — jamais pour un compte
    // admin/engineer, qui n'a pas besoin de ce contexte.
    effect(() => {
      const user = this.authService.user();
      if (!user || this.isFullAccess()) {
        this.loadedForUserId = null;
        this.myChurchesSignal.set(user ? [] : undefined);
        return;
      }
      if (this.loadedForUserId === user.id) return;
      this.loadedForUserId = user.id;

      this.clergyMemberService.list({ userId: user.id, activeOnly: true }).subscribe({
        next: (members) => {
          this.myChurchesSignal.set(members);
          this.ensureActiveChurchIsValid(members);
        },
        error: () => this.myChurchesSignal.set([]),
      });
    });
  }

  setActiveChurch(churchId: string): void {
    this.activeChurchIdSignal.set(churchId);
    localStorage.setItem(ACTIVE_CHURCH_STORAGE_KEY, churchId);
  }

  private ensureActiveChurchIsValid(members: ClergyMember[]): void {
    const current = this.activeChurchIdSignal();
    if (current && members.some((m) => m.churchId === current)) return;
    const first = members[0]?.churchId ?? null;
    this.activeChurchIdSignal.set(first);
    if (first) localStorage.setItem(ACTIVE_CHURCH_STORAGE_KEY, first);
  }
}
