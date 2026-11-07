import { Component, ElementRef, inject, input, OnDestroy, signal, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MAX_FILE, Media } from '../../shared/content';

@Component({
  selector: 'app-pdf',
  template: `
    <button type="button" class="secondary" aria-haspopup="dialog" (click)="open()">
      {{ media().alt || 'Abrir documento' }} (PDF)
    </button>
    <dialog
      #dialog
      class="pdf-dialog"
      [attr.aria-label]="media().alt || 'Documento PDF'"
      (close)="closed()"
      (click)="backdrop($event)"
    >
      <div class="pdf-heading">
        <h2>{{ media().alt || 'Documento PDF' }}</h2>
        <button type="button" autofocus (click)="dialog.close()">Fechar PDF</button>
      </div>
      @if (source()) {
        <iframe
          class="pdf-frame"
          [src]="source()"
          [title]="'Leitor de PDF: ' + (media().alt || 'Documento')"
          referrerpolicy="no-referrer"
        ></iframe>
      }
      <div class="pdf-actions">
        <p>Se o leitor não carregar, baixe o PDF para ler no seu aparelho.</p>
        <button type="button" class="secondary" [disabled]="downloading()" (click)="download()">
          {{ downloading() ? 'Baixando…' : 'Baixar PDF' }}
        </button>
      </div>
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
    </dialog>
  `,
})
export class PdfViewer implements OnDestroy {
  media = input.required<Media>();
  @ViewChild('dialog', { static: true }) dialog!: ElementRef<HTMLDialogElement>;
  source = signal<SafeResourceUrl | null>(null);
  downloading = signal(false);
  error = signal('');
  private sanitizer = inject(DomSanitizer);
  private opener: HTMLElement | null = null;
  private controller?: AbortController;

  private url(): string {
    const url = new URL(this.media().url, document.baseURI);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username ||
      url.password
    )
      throw Error('Endereço de PDF inválido.');
    return url.href;
  }
  open() {
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.error.set('');
    try {
      // Resource URLs are allowed only for uploaded PDFs, using HTTPS (or local QA).
      this.source.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.url()));
    } catch {
      this.source.set(null);
      this.error.set('Não foi possível abrir este PDF.');
    }
    this.dialog.nativeElement.showModal();
  }
  backdrop(event: MouseEvent) {
    const dialog = this.dialog.nativeElement;
    const rect = dialog.getBoundingClientRect();
    if (
      event.target === dialog &&
      (event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom)
    )
      dialog.close();
  }
  closed() {
    this.controller?.abort();
    this.source.set(null);
    this.opener?.focus();
  }
  async download() {
    this.downloading.set(true);
    this.error.set('');
    this.controller = new AbortController();
    try {
      const response = await fetch(this.url(), { signal: this.controller.signal });
      if (!response.ok || response.headers.get('Content-Type')?.split(';')[0] !== 'application/pdf')
        throw Error();
      const blob = await response.blob();
      if (!blob.size || blob.size > MAX_FILE) throw Error();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        (this.media().alt || 'documento').replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 120) + '.pdf';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (!this.controller.signal.aborted)
        this.error.set('Não foi possível baixar o PDF. Tente novamente.');
    } finally {
      this.downloading.set(false);
    }
  }
  ngOnDestroy() {
    this.controller?.abort();
  }
}
