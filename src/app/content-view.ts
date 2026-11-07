import { Component, input } from '@angular/core';
import { Content, isAudioMedia } from '../../shared/content';
import { PdfViewer } from './pdf-viewer';
@Component({
  selector: 'app-content',
  imports: [PdfViewer],
  template: `
    <section id="texto" tabindex="-1">
      <h2>Vamos conhecer este ambiente?</h2>
      @if (content().textEnabled && (content().blocks.length || has('text_pdf'))) {
        @for (b of content().blocks; track $index) {
          @switch (b.type) {
            @case ('heading') {
              <h3>{{ b.text }}</h3>
            }
            @case ('list') {
              <ul>
                <li [class.bold]="b.bold">{{ b.text }}</li>
              </ul>
            }
            @case ('link') {
              <p>
                <a [href]="b.url" rel="noopener noreferrer" [class.bold]="b.bold">{{ b.text }}</a>
              </p>
            }
            @default {
              <p [class.bold]="b.bold">{{ b.text }}</p>
            }
          }
        }
      } @else {
        <p class="pending">Conteúdo em preparação</p>
      }
      @if (content().textEnabled) {
        @for (m of content().media; track m.id) {
          @if (m.kind === 'text_pdf' && m.enabled) {
            <div class="pdf-document">
              <app-pdf [media]="m" /><br /><small>{{ m.credit }}</small>
            </div>
          }
        }
      }
    </section>
    <section id="fotos" tabindex="-1">
      <h2>Um olhar mais de perto</h2>
      <div class="gallery">
        @for (m of content().media; track m.id) {
          @if (m.kind === 'image' && m.enabled) {
            <figure>
              <img [src]="m.url" [alt]="m.alt" loading="lazy" />
              <figcaption>
                {{ m.illustration ? 'Ilustração' : 'Fotografia' }} · {{ m.credit }}
              </figcaption>
            </figure>
          }
        }
      </div>
      @if (!has('image')) {
        <p class="pending">Conteúdo em preparação</p>
      }
    </section>
    @for (kind of ['libras', 'audiodescricao']; track kind) {
      <section [id]="kind" tabindex="-1">
        <h2>
          {{ kind === 'libras' ? 'Veja em Libras' : 'Audiodescrição' }}
        </h2>
        @for (m of content().media; track m.id) {
          @if (m.kind === kind && m.enabled && (kind !== 'audiodescricao' || audioMedia(m))) {
            @if (kind === 'audiodescricao') {
              <audio controls preload="metadata" [src]="m.url" [attr.aria-label]="m.alt"></audio>
              <p>
                <a [href]="m.url" target="_blank" rel="noopener noreferrer"
                  >Abrir ou baixar áudio: {{ m.alt }}</a
                >
              </p>
              <p class="hint">
                Se o formato não tocar no seu navegador, abra ou baixe o arquivo para ouvir em outro
                aplicativo.
              </p>
            } @else {
              <video
                crossorigin="anonymous"
                [poster]="m.poster || ''"
                controls
                playsinline
                preload="metadata"
                [src]="m.url"
                [attr.aria-label]="m.alt"
              >
                @if (m.caption) {
                  <track
                    kind="captions"
                    srclang="pt-BR"
                    label="Português"
                    [src]="m.caption"
                    default
                  />
                }
              </video>
            }
            @if (m.transcript) {
              <details>
                <summary>Transcrição</summary>
                <p class="preserve">{{ m.transcript }}</p>
              </details>
            }
          }
        }
        @if (!has(kind)) {
          <p class="pending">Conteúdo em preparação</p>
        }
      </section>
    }
    <section id="atividades" tabindex="-1">
      <h2>Atividades</h2>
      @for (m of content().media; track m.id) {
        @if (m.kind === 'activity_pdf' && m.enabled) {
          <p>
            <a [href]="m.url" target="_blank" rel="noopener noreferrer"
              >{{ m.alt }} (PDF, abre em nova aba)</a
            ><br /><small>{{ m.credit }}</small>
          </p>
        }
      }
      @if (!has('activity_pdf')) {
        <p class="pending">Conteúdo em preparação</p>
      }
    </section>
  `,
})
export class ContentView {
  content = input.required<Content>();
  audioMedia = isAudioMedia;
  has(kind: string) {
    return this.content().media.some(
      (m) => m.kind === kind && m.enabled && (kind !== 'audiodescricao' || isAudioMedia(m)),
    );
  }
}
