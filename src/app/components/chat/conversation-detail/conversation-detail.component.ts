import { Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

import { ChatService } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';
import {
  ActorType,
  CONVERSATION_STATUS_LABELS,
  Conversation,
  Message,
  Participant,
  ParticipantRole,
  PARTICIPANT_ROLE_LABELS,
} from '../../../models/chat.model';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

const MAX_TEXTAREA_HEIGHT = 160; // px — au-delà, la zone de texte scrolle au lieu de grandir

export interface SelectedFile {
  file: File;
  /** Object URL — uniquement pour les images, révoqué au retrait/à l'envoi (évite les fuites mémoire). */
  previewUrl?: string;
}

@Component({
  selector: 'app-conversation-detail',
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './conversation-detail.component.html',
  styleUrl: './conversation-detail.component.scss',
})
export class ConversationDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly chatService = inject(ChatService);
  readonly authService = inject(AuthService);

  @ViewChild('bodyTextarea') private bodyTextareaRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('videoPreview') private videoPreviewRef?: ElementRef<HTMLVideoElement>;

  statusLabels = CONVERSATION_STATUS_LABELS;
  roleLabels = PARTICIPANT_ROLE_LABELS;
  roleList = Object.values(ParticipantRole);

  private readonly conversationId = this.route.snapshot.paramMap.get('id')!;
  // Stub venant de la liste (cf. ChatService.select / CLAUDE.md § Pages de
  // détail) — utilisable seulement s'il correspond bien à l'id demandé.
  private readonly stub =
    this.chatService.selected()?.id === this.conversationId ? this.chatService.selected() : null;

  conversation = signal<Conversation | null>(this.stub);
  // Squelette uniquement si on n'a aucun stub à afficher en attendant le fetch complet.
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);

  messages = this.chatService.messages;
  isLoadingMessages = computed(() => this.messages() === undefined);
  canLoadOlder = computed(() => {
    const meta = this.chatService.messagesPaginationMeta();
    return meta.page < meta.totalPages;
  });
  loadingOlder = signal(false);
  sending = signal(false);

  readonly composer: FormGroup = this.fb.group({
    body: [''],
  });

  // ── Pièces jointes ──────────────────────────────────────────
  // Sélectionnées mais pas encore envoyées — parties avec le prochain
  // message via sendMessageWithFiles (une seule requête multipart).
  selectedFiles = signal<SelectedFile[]>([]);

  // ── Vocal / vidéo ────────────────────────────────────────────
  // Modèle Telegram : pendant l'enregistrement, deux issues seulement —
  // envoyer ou annuler. Pas d'étape "arrêter puis envoyer" séparée.
  isRecording = signal(false);
  recordingKind = signal<'audio' | 'video' | null>(null);
  recordingSeconds = signal(0);
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingTimer: ReturnType<typeof setInterval> | null = null;
  private recordingAction: 'send' | 'cancel' = 'send';

  // Pas un computed() : `composer.value` n'est pas un signal, il ne
  // recalculerait pas à la frappe. Appelée directement dans le template.
  canSend(): boolean {
    return !!(this.composer.value.body as string)?.trim() || this.selectedFiles().length > 0;
  }

  // ── Handoff BOT -> AGENT ────────────────────────────────────
  showHandoffPanel = signal(false);
  participants = signal<Participant[] | undefined>(undefined);
  handingOff = signal(false);

  readonly handoffForm: FormGroup = this.fb.group({
    fromActorId: ['', [Validators.required]],
    toRole: [ParticipantRole.ASSIGNED_AGENT, [Validators.required]],
  });

  ngOnInit(): void {
    this.load();
    this.loadMessages();
  }

  ngOnDestroy(): void {
    // Évite qu'un fil déjà chargé "fuite" visuellement à l'ouverture d'une autre conversation.
    this.chatService.resetMessages();
    this.clearSelectedFiles();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.chatService.getById(this.conversationId).subscribe({
      next: (conversation) => {
        this.conversation.set(conversation);
        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement de la conversation.');
        if (showLoader) Swal.close();
      },
    });
  }

  private loadMessages(): void {
    this.chatService.listMessages(this.conversationId, { page: 1, limit: 30 }).subscribe({
      next: () => this.markRead(),
      error: () => this.error.set('Erreur lors du chargement des messages.'),
    });
  }

  private markRead(): void {
    this.chatService.markRead(this.conversationId).subscribe();
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  loadOlder(): void {
    const meta = this.chatService.messagesPaginationMeta();
    if (this.loadingOlder() || meta.page >= meta.totalPages) return;

    this.loadingOlder.set(true);
    this.chatService
      .listMessages(this.conversationId, { page: meta.page + 1, limit: meta.limit }, true)
      .subscribe({
        next: () => this.loadingOlder.set(false),
        error: () => {
          this.loadingOlder.set(false);
          Swal.fire('Erreur', 'Impossible de charger les messages précédents.', 'error');
        },
      });
  }

  isMine(message: Message): boolean {
    return !!message.senderId && message.senderId === this.authService.user()?.id;
  }

  senderLabel(message: Message): string {
    if (this.isMine(message)) return 'Vous';
    if (message.senderType === ActorType.AI) return 'Bot';
    if (message.senderType === ActorType.SYSTEM) return 'Système';
    return message.senderId ? message.senderId.slice(0, 8) : 'Inconnu';
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    this.sendMessage();
  }

  /** Auto-grandit avec le contenu jusqu'à MAX_TEXTAREA_HEIGHT, puis scrolle (comme Claude web). */
  autoResizeTextarea(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }

  private resetTextareaHeight(): void {
    const el = this.bodyTextareaRef?.nativeElement;
    if (el) el.style.height = 'auto';
  }

  deleteMessage(message: Message): void {
    Swal.fire({
      title: 'Supprimer ce message ?',
      text: 'Cette action est irréversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.chatService.deleteMessage(this.conversationId, message.id).subscribe({
        error: (err) => {
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error');
        },
      });
    });
  }

  // ── Pièces jointes ──────────────────────────────────────────

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length) {
      const withPreviews: SelectedFile[] = files.map((file) => ({
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }));
      this.selectedFiles.update((current) => [...current, ...withPreviews]);
    }
    input.value = ''; // permet de resélectionner le même fichier après retrait
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.update((current) => {
      const removed = current[index];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((_, i) => i !== index);
    });
  }

  /** Icône représentative par type — pour les fichiers sans miniature (PDF, doc...). */
  fileIcon(file: File): string {
    if (file.type === 'application/pdf') return 'fa-file-pdf';
    if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) return 'fa-file-word';
    if (file.type.startsWith('video/')) return 'fa-file-video';
    if (file.type.startsWith('audio/')) return 'fa-file-audio';
    return 'fa-file';
  }

  private clearSelectedFiles(): void {
    this.selectedFiles().forEach((sf) => {
      if (sf.previewUrl) URL.revokeObjectURL(sf.previewUrl);
    });
    this.selectedFiles.set([]);
  }

  // ── Vocal / vidéo ────────────────────────────────────────────

  async startRecording(kind: 'audio' | 'video'): Promise<void> {
    if (this.isRecording()) return;

    try {
      const constraints: MediaStreamConstraints =
        kind === 'video' ? { audio: true, video: { facingMode: 'user' } } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.recordedChunks = [];
      this.recordingAction = 'send';
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (this.recordingTimer) {
          clearInterval(this.recordingTimer);
          this.recordingTimer = null;
        }
        this.isRecording.set(false);
        this.recordingKind.set(null);

        if (this.recordingAction === 'send' && this.recordedChunks.length) {
          const mimeType = kind === 'video' ? 'video/webm' : 'audio/webm';
          const blob = new Blob(this.recordedChunks, { type: mimeType });
          const file = new File([blob], `${kind === 'video' ? 'video' : 'vocal'}-${Date.now()}.webm`, {
            type: mimeType,
          });
          // isVoice=true uniquement pour l'audio — évite qu'un vocal .webm
          // soit détecté comme VIDEO côté API (sniffing par octets magiques).
          this.sendRecordedFile(file, kind === 'audio');
        }
        this.recordedChunks = [];
      };

      this.mediaRecorder.start();
      this.isRecording.set(true);
      this.recordingKind.set(kind);
      this.recordingSeconds.set(0);
      this.recordingTimer = setInterval(() => this.recordingSeconds.update((s) => s + 1), 1000);

      if (kind === 'video') {
        // Le <video> de preview n'existe dans le DOM qu'une fois recordingKind()
        // === 'video' rendu par le @if — un microtask s'exécute avant que la
        // détection de changement d'Angular ait mis à jour le DOM, le
        // ViewChild reste donc undefined à ce moment-là. setTimeout(0) est un
        // macrotask : il s'exécute après que le CD (lui aussi planifié en
        // microtask) ait tourné, l'élément est alors bien dans le DOM.
        setTimeout(() => {
          const el = this.videoPreviewRef?.nativeElement;
          if (el) {
            el.srcObject = stream;
            el.play().catch(() => {});
          }
        });
      }
    } catch {
      Swal.fire(
        'Erreur',
        kind === 'video' ? "Impossible d'accéder à la caméra." : "Impossible d'accéder au microphone.",
        'error',
      );
    }
  }

  /** Bouton "envoyer" pendant l'enregistrement — stoppe puis envoie directement, sans étape intermédiaire. */
  stopAndSendRecording(): void {
    this.recordingAction = 'send';
    this.mediaRecorder?.stop();
  }

  /** Bouton "annuler" (poubelle) pendant l'enregistrement — stoppe et jette l'audio/vidéo, rien n'est envoyé. */
  cancelRecording(): void {
    this.recordingAction = 'cancel';
    this.mediaRecorder?.stop();
  }

  private sendRecordedFile(file: File, isVoice: boolean): void {
    this.sending.set(true);
    this.chatService.sendMessageWithFiles(this.conversationId, undefined, [file], isVoice).subscribe({
      next: () => this.sending.set(false),
      error: (err) => {
        this.sending.set(false);
        Swal.fire('Erreur', err?.error?.msg ?? 'Envoi impossible.', 'error');
      },
    });
  }

  sendMessage(): void {
    if (!this.canSend()) {
      this.composer.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    const body = ((this.composer.value.body as string) ?? '').trim() || undefined;
    const files = this.selectedFiles().map((sf) => sf.file);

    const send$ =
      files.length > 0
        ? this.chatService.sendMessageWithFiles(this.conversationId, body, files)
        : this.chatService.sendMessage(this.conversationId, { body });

    send$.subscribe({
      next: () => {
        this.sending.set(false);
        this.composer.reset({ body: '' });
        this.clearSelectedFiles();
        this.resetTextareaHeight();
      },
      error: (err) => {
        this.sending.set(false);
        Swal.fire('Erreur', err?.error?.msg ?? 'Envoi impossible.', 'error');
      },
    });
  }

  // ── Handoff ──────────────────────────────────────────────

  toggleHandoffPanel(): void {
    this.showHandoffPanel.update((v) => !v);
    if (this.showHandoffPanel() && this.participants() === undefined) {
      this.chatService.listParticipants(this.conversationId).subscribe({
        next: (list) => this.participants.set(list),
        error: () => Swal.fire('Erreur', 'Impossible de charger les participants.', 'error'),
      });
    }
  }

  submitHandoff(): void {
    if (this.handoffForm.invalid) {
      this.handoffForm.markAllAsTouched();
      return;
    }
    const me = this.authService.user();
    if (!me) return;

    this.handingOff.set(true);
    this.chatService
      .handoff(this.conversationId, {
        fromActorId: this.handoffForm.value.fromActorId,
        toActorId: me.id,
        toActorType: ActorType.HUMAN,
        toRole: this.handoffForm.value.toRole,
      })
      .subscribe({
        next: () => {
          this.handingOff.set(false);
          this.showHandoffPanel.set(false);
          Swal.fire({ icon: 'success', title: 'Conversation prise en charge', timer: 1200, showConfirmButton: false });
          this.load();
        },
        error: (err) => {
          this.handingOff.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Handoff impossible.', 'error');
        },
      });
  }
}
