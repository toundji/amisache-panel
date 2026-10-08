import { Component, computed, ElementRef, EventEmitter, forwardRef, HostListener, inject, Input, Output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SearchSelectOption {
  value: string;
  label: string;
}

/** Minuscules sans accents — « cote » trouve « Côte », « porto » trouve « Porto-Novo ». */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Select avec saisie : on tape quelques lettres, seules les options proches
 * restent affichées. S'utilise comme un <select> (formControlName / ngModel).
 * `picked` n'est émis que sur un choix de l'utilisateur, jamais sur un
 * patchValue — l'équivalent de l'événement (change) d'un <select>.
 */
@Component({
  selector: 'app-search-select',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SearchSelectComponent), multi: true }],
  template: `
    <div class="position-relative">
      <input type="text" class="form-control" autocomplete="off"
        [class.is-invalid]="invalid"
        [disabled]="disabled()"
        [placeholder]="selectedLabel() || placeholder"
        [value]="open() ? query() : selectedLabel()"
        (focus)="openList()"
        (click)="openList()"
        (input)="onInput($any($event.target).value)"
        (keydown)="onKeydown($event)">
      <i class="fas fa-chevron-down search-select-caret"></i>
      @if (open()) {
        <ul class="dropdown-menu show w-100 search-select-menu">
          @if (emptyLabel) {
            <li><button type="button" class="dropdown-item text-muted" (mousedown)="pick('')">{{ emptyLabel }}</button></li>
          }
          @for (o of filtered(); track o.value; let i = $index) {
            <li>
              <button type="button" class="dropdown-item" [class.active]="i === highlighted()" [class.fw-semibold]="o.value === value()"
                (mousedown)="pick(o.value)">{{ o.label }}</button>
            </li>
          } @empty {
            <li><span class="dropdown-item-text text-muted">Aucun résultat</span></li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .search-select-caret { position: absolute; right: .75rem; top: 50%; transform: translateY(-50%); font-size: .7rem; opacity: .5; pointer-events: none; }
    .search-select-menu { max-height: 260px; overflow-y: auto; top: 100%; left: 0; }
  `],
})
export class SearchSelectComponent implements ControlValueAccessor {
  private readonly host = inject(ElementRef<HTMLElement>);

  private optionsSignal = signal<SearchSelectOption[]>([]);
  @Input({ required: true }) set options(options: SearchSelectOption[] | null | undefined) {
    this.optionsSignal.set(options ?? []);
  }
  @Input() placeholder = 'Rechercher...';
  /** Libellé de l'option « vide » (ex. « Toutes », « Aucun ») — absente si non fourni. */
  @Input() emptyLabel = '';
  @Input() invalid = false;
  @Input() set isDisabled(disabled: boolean) {
    this.disabled.set(disabled);
  }
  @Output() picked = new EventEmitter<string>();

  value = signal('');
  query = signal('');
  open = signal(false);
  disabled = signal(false);
  highlighted = signal(0);

  selectedLabel = computed(() => this.optionsSignal().find((o) => o.value === this.value())?.label ?? '');

  filtered = computed(() => {
    const q = normalize(this.query().trim());
    const options = this.optionsSignal();
    if (!q) return options;
    // Les libellés qui commencent par la saisie d'abord, puis ceux qui la contiennent.
    const starts = options.filter((o) => normalize(o.label).startsWith(q));
    const contains = options.filter((o) => !normalize(o.label).startsWith(q) && normalize(o.label).includes(q));
    return [...starts, ...contains];
  });

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  openList(): void {
    if (this.disabled() || this.open()) return;
    this.query.set('');
    this.highlighted.set(0);
    this.open.set(true);
  }

  onInput(text: string): void {
    this.query.set(text);
    this.highlighted.set(0);
    this.open.set(true);
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.filtered().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open()) this.openList();
        else if (count) this.highlighted.set((this.highlighted() + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count) this.highlighted.set((this.highlighted() - 1 + count) % count);
        break;
      case 'Enter': {
        const option = this.filtered()[this.highlighted()];
        if (this.open() && option) {
          event.preventDefault();
          this.pick(option.value);
        }
        break;
      }
      case 'Escape':
      case 'Tab':
        this.close();
        break;
    }
  }

  pick(value: string): void {
    this.value.set(value);
    this.onChange(value);
    this.picked.emit(value);
    this.close();
  }

  private close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.query.set('');
    this.onTouched();
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMousedown(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.close();
  }
}
