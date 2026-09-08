import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { ChatService } from '../../../services/chat.service';
import { ActorType, ConversationMode, ParticipantRole, PARTICIPANT_ROLE_LABELS } from '../../../models/chat.model';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-conversation-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
  templateUrl: './conversation-create.component.html',
  styleUrl: './conversation-create.component.scss',
})
export class ConversationCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly chatService = inject(ChatService);

  readonly modeList = Object.values(ConversationMode);
  readonly actorTypeList = Object.values(ActorType);
  readonly roleList = Object.values(ParticipantRole);
  readonly roleLabels = PARTICIPANT_ROLE_LABELS;

  readonly form: FormGroup = this.fb.group({
    subjectType: [''],
    subjectId: [''],
    mode: [ConversationMode.AGENT],
    participants: this.fb.array<FormGroup>([]),
  });

  submitting = signal(false);
  error?: ServerError;

  get participants(): FormArray<FormGroup> {
    return this.form.get('participants') as FormArray<FormGroup>;
  }

  addParticipant(): void {
    this.participants.push(
      this.fb.group({
        actorId: ['', [Validators.required]],
        actorType: [ActorType.HUMAN, [Validators.required]],
        role: [ParticipantRole.MEMBER, [Validators.required]],
      }),
    );
  }

  removeParticipant(index: number): void {
    this.participants.removeAt(index);
  }

  invalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control?.touched && control?.invalid);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error = undefined;
    this.submitting.set(true);

    const value = this.form.value;
    const body = {
      subjectType: value.subjectType || undefined,
      subjectId: value.subjectId || undefined,
      mode: value.mode,
      participants: value.participants?.length ? value.participants : undefined,
    };

    this.chatService.createOrOpen(body).subscribe({
      next: (conversation) => {
        this.submitting.set(false);
        Swal.fire({ icon: 'success', title: 'Conversation ouverte', timer: 1200, showConfirmButton: false }).then(() => {
          this.router.navigate(['/chat', conversation.id]);
        });
      },
      error: (err: { error: ServerError }) => {
        this.submitting.set(false);
        this.error = err.error;
      },
    });
  }
}
