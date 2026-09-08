import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { ChurchService } from '../../../services/church.service';
import {
  Church,
  ENTITY_TYPE_LABELS,
  VALIDATION_STATUS_LABELS,
  ValidationStatus,
} from '../../../models/church.model';

interface TreeNode {
  church: Church;
  children: TreeNode[];
}

/**
 * Vue arborescente de la hiérarchie ecclésiale (page dédiée, distincte de la
 * liste plate). L'API n'expose pas d'endpoint « arbre » : on réutilise la
 * liste allégée (`churches/admin?limit=500`, signal `allForSelect` partagé
 * avec le sélecteur de parent) et on reconstruit l'arbre par `parentId`.
 */
@Component({
  selector: 'app-church-tree',
  imports: [CommonModule, RouterLink],
  templateUrl: './church-tree.component.html',
  styleUrl: './church-tree.component.scss',
})
export class ChurchTreeComponent {
  readonly churchService = inject(ChurchService);

  private entities = this.churchService.allForSelect;
  isLoading = computed(() => this.entities() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  private collapsed = signal<Set<string>>(new Set());

  totalCount = computed(() => this.entities()?.length ?? 0);

  roots = computed<TreeNode[]>(() => {
    const list = this.entities();
    if (!list) return [];

    const ids = new Set(list.map((c) => c.id));
    const byParent = new Map<string, Church[]>();
    for (const c of list) {
      // parent inconnu (hors des 500 chargés) → traité comme racine
      const key = c.parentId && ids.has(c.parentId) ? c.parentId : '__root__';
      const bucket = byParent.get(key) ?? [];
      bucket.push(c);
      byParent.set(key, bucket);
    }

    const build = (c: Church): TreeNode => ({
      church: c,
      children: (byParent.get(c.id) ?? [])
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(build),
    });

    return (byParent.get('__root__') ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(build);
  });

  constructor() {
    if (this.entities() === undefined) this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.refreshing.set(true);
    this.error.set(null);

    this.churchService.listAllForSelect().subscribe({
      next: () => {
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement de la hiérarchie.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.load(true);
  }

  isCollapsed(id: string): boolean {
    return this.collapsed().has(id);
  }

  toggle(id: string): void {
    this.collapsed.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  expandAll(): void {
    this.collapsed.set(new Set());
  }

  collapseAll(): void {
    this.collapsed.set(new Set((this.entities() ?? []).map((c) => c.id)));
  }

  // Le contexte du template récursif n'est pas typé par Angular (`node: any`) —
  // ces helpers reçoivent le TreeNode et réalisent l'indexation en TS typé.
  typeLabel(node: TreeNode): string {
    return ENTITY_TYPE_LABELS[node.church.type];
  }

  statusLabel(node: TreeNode): string {
    return VALIDATION_STATUS_LABELS[node.church.status];
  }

  statusBadgeClass(node: TreeNode): string {
    return {
      [ValidationStatus.APPROVED]: 'status-success',
      [ValidationStatus.PENDING]: 'status-warning',
      [ValidationStatus.SUSPENDED]: 'status-disabled',
    }[node.church.status];
  }
}
