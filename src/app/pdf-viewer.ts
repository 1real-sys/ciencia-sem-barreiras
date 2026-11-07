import {
  afterNextRender,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  Injector,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { Media } from '../../shared/content';
import type { PDFDocumentLoadingTask } from 'pdfjs-dist';
import type { PDFViewer as DocumentViewer } from 'pdfjs-dist/web/pdf_viewer.mjs';

let viewerStyles: Promise<void> | undefined;
function loadViewerStyles(url: string): Promise<void> {
  if (!viewerStyles)
    viewerStyles = new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = () => resolve();
      link.onerror = () => {
        link.remove();
        viewerStyles = undefined;
        reject(new Error('PDF styles unavailable'));
      };
      document.head.append(link);
    });
  return viewerStyles;
}

@Component({
  selector: 'app-pdf',
  template: `
    <button
      type="button"
      class="secondary"
      aria-haspopup="dialog"
      [disabled]="historyPending()"
      (click)="open()"
    >
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
        <button
          type="button"
          class="pdf-control secondary"
          aria-label="Baixar PDF"
          [disabled]="loading() || !ready() || downloading()"
          (click)="download()"
        >
          {{ downloading() ? 'Baixando…' : 'Baixar PDF' }}
        </button>
        <button
          type="button"
          class="pdf-control"
          autofocus
          aria-label="Fechar PDF"
          (click)="dialog.close()"
        >
          Fechar <span aria-hidden="true">×</span>
        </button>
      </div>
      @if (downloadError()) {
        <p class="pdf-download-status" role="alert">{{ downloadError() }}</p>
      }
      <div class="pdf-stage">
        <div
          #reader
          class="pdf-reader"
          tabindex="0"
          role="region"
          [attr.aria-label]="'Leitura do PDF: ' + (media().alt || 'Documento')"
        >
          <div class="pdfViewer"></div>
        </div>
        @if (loading()) {
          <p class="pdf-status" role="status">Carregando texto…</p>
        }
        @if (error()) {
          <div class="pdf-status" role="alert">
            <p>{{ error() }}</p>
            <button type="button" class="secondary" (click)="load()">Tentar novamente</button>
          </div>
        }
      </div>
    </dialog>
  `,
})
export class PdfViewer implements OnDestroy {
  media = input.required<Media>();
  @ViewChild('dialog', { static: true }) dialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('reader', { static: true }) reader!: ElementRef<HTMLDivElement>;
  loading = signal(false);
  ready = signal(false);
  downloading = signal(false);
  downloadError = signal('');
  error = signal('');
  historyPending = signal(false);
  private readonly historyId = crypto.randomUUID();
  private injector = inject(Injector);
  private opener: HTMLElement | null = null;
  private viewer?: DocumentViewer;
  private task?: PDFDocumentLoadingTask;
  private resize?: ResizeObserver;
  private generation = 0;
  private lifecycle = new AbortController();

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
  open(recordHistory = true) {
    if (this.dialog.nativeElement.open || this.historyPending()) return;
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (recordHistory) {
      // Same URL: Back dismisses the PDF before leaving the current environment.
      history.pushState({ ...history.state, csbPdf: this.historyId }, '', location.href);
    }
    this.dialog.nativeElement.showModal();
    void this.load();
  }
  @HostListener('window:popstate')
  historyChanged() {
    const cleaningUp = this.historyPending();
    this.historyPending.set(false);
    if (history.state?.csbPdf === this.historyId) this.open(false);
    else if (this.dialog.nativeElement.open) this.dialog.nativeElement.close();
    else if (cleaningUp) this.restoreFocus();
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
    this.release();
    if (history.state?.csbPdf === this.historyId) {
      // Button, backdrop and Esc remove the temporary entry as well.
      this.historyPending.set(true);
      history.back();
    } else this.restoreFocus();
  }
  private restoreFocus() {
    afterNextRender(() => this.opener?.focus(), { injector: this.injector });
  }
  async load() {
    this.release();
    const generation = this.generation;
    this.loading.set(true);
    this.error.set('');
    try {
      const url = this.url();
      // The viewer module reads the PDF.js API exported by the core module.
      const assets = new URL('pdfjs/', document.baseURI).href;
      const [pdfjs] = await Promise.all([
        import('pdfjs-dist'),
        loadViewerStyles(assets + 'pdf_viewer.css'),
      ]);
      const { PDFViewer, EventBus } = await import('pdfjs-dist/web/pdf_viewer.mjs');
      if (generation !== this.generation || !this.dialog.nativeElement.open) return;
      pdfjs.GlobalWorkerOptions.workerSrc = assets + 'pdf.worker.min.mjs';
      pdfjs.GlobalWorkerOptions.rendererSrc = assets + 'pdf.renderer.min.mjs';
      if (!this.viewer) {
        const eventBus = new EventBus();
        const options = {
          container: this.reader.nativeElement,
          eventBus,
          removePageBorders: true,
          annotationMode: pdfjs.AnnotationMode.DISABLE,
          enableAutoLinking: false,
          maxCanvasPixels: 8 * 1024 * 1024,
          abortSignal: this.lifecycle.signal,
        };
        this.viewer = new PDFViewer(options);
        eventBus.on('pagesinit', () => {
          this.viewer!.currentScaleValue = 'page-width';
          this.viewer!.update();
        });
        eventBus.on('pagerendered', () => this.loading.set(false));
        this.resize = new ResizeObserver(() => {
          if (this.viewer?.pdfDocument && this.dialog.nativeElement.open) {
            this.viewer.currentScaleValue = 'page-width';
            this.viewer.update();
          }
        });
      }
      this.task = pdfjs.getDocument({
        url,
        enableXfa: false,
        standardFontDataUrl: assets + 'standard_fonts/',
        cMapUrl: assets + 'cmaps/',
        cMapPacked: true,
        wasmUrl: assets + 'wasm/',
      });
      const pdfDocument = await this.task.promise;
      if (generation !== this.generation || !this.dialog.nativeElement.open) return;
      this.viewer.setDocument(pdfDocument);
      this.ready.set(true);
      this.resize?.observe(this.reader.nativeElement);
    } catch {
      if (generation === this.generation) {
        this.loading.set(false);
        this.error.set('Não foi possível carregar o texto. Tente novamente.');
      }
    }
  }
  async download() {
    const pdfDocument = this.viewer?.pdfDocument;
    if (!pdfDocument || this.downloading()) return;
    this.downloading.set(true);
    this.downloadError.set('');
    try {
      const bytes = await pdfDocument.getData();
      if (!this.dialog.nativeElement.open || pdfDocument !== this.viewer?.pdfDocument) return;
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes).buffer], { type: 'application/pdf' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download =
        (this.media().alt || 'documento')
          .replace(/[^\p{L}\p{N} ._-]/gu, '')
          .replace(/\.pdf$/i, '')
          .slice(0, 120) + '.pdf';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (this.dialog.nativeElement.open && pdfDocument === this.viewer?.pdfDocument)
        this.downloadError.set('Não foi possível baixar o PDF. Tente novamente.');
    } finally {
      this.downloading.set(false);
    }
  }
  private release() {
    this.generation++;
    this.resize?.disconnect();
    this.viewer?.setDocument(null);
    void this.task?.destroy().catch(() => undefined);
    this.task = undefined;
    this.loading.set(false);
    this.ready.set(false);
    this.downloadError.set('');
  }
  ngOnDestroy() {
    this.release();
    this.lifecycle.abort();
  }
}
