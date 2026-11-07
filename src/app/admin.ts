import { Component, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import QRCode from 'qrcode';
import { Data } from './data';
import { ContentView } from './content-view';
import { PdfViewer } from './pdf-viewer';
import { prepareUploadFile } from '../../shared/audio-upload';
import { spaceCover } from './covers';
import {
  Content,
  Media,
  Snapshot,
  SPACES,
  emptyContent,
  allowedMediaType,
  AUDIO_ACCEPT,
  isAudioMedia,
  MAX_FILE,
} from '../../shared/content';
interface EditorData {
  draft: Snapshot;
  published: Snapshot | null;
  history: Snapshot[];
}
@Component({
  selector: 'app-admin',
  imports: [FormsModule, RouterLink, ContentView, NgTemplateOutlet, PdfViewer],
  template: `
    @if (!data.token()) {
      <div class="login">
        <span class="eyebrow">CUIDAR DAS DESCOBERTAS</span>
        <h1>Área de edição</h1>
        <p>Entre para preparar e publicar os conteúdos dos nove ambientes.</p>
        <form (ngSubmit)="login()">
          <label for="password">Senha de acesso</label
          ><input
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            [(ngModel)]="password"
            required
          /><button [disabled]="busy()" style="margin-top:20px">
            {{ busy() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>
      </div>
    } @else {
      <div class="actions">
        <button class="secondary" (click)="dashboard()">Todos os ambientes</button
        ><button class="secondary" (click)="logout()">Sair</button>
      </div>
      @if (!slug()) {
        <h1>Gerenciar ambientes</h1>
        <p>Prepare no seu ritmo. O rascunho só aparece para visitantes depois de publicar.</p>
        <div class="cards">
          @for (s of spaces; track s[0]) {
            <article class="space-card">
              <div class="card-art">
                <img [src]="coverImage(s[0]).src" alt="" loading="lazy" />
                <span class="art-label">{{ coverImage(s[0]).label }}</span>
              </div>
              <div class="card-body">
                <h2>{{ s[1] }}</h2>
                <p>{{ summary(s[0]) }}</p>
                <button (click)="edit(s[0])" [disabled]="busy()">Editar</button>
                <a [routerLink]="['/ambientes', s[0]]">Ver no site</a>
              </div>
            </article>
          }
        </div>
      } @else {
        <h1>{{ title() }}</h1>
        <p>Rascunho privado · versão {{ revision }}. Salve antes de sair. Arquivos até 50 MB.</p>
        <div class="actions">
          <button (click)="save()" [disabled]="busy()">Salvar rascunho</button
          ><button (click)="publish()" [disabled]="busy()">Publicar</button
          ><a [routerLink]="['/ambientes', slug()]" target="_blank" rel="noopener"
            >Visualizar versão publicada</a
          ><button class="secondary" (click)="copyLink()">Copiar link</button>
        </div>
        <fieldset class="editor-fieldset" [disabled]="busy()">
          <legend class="sr-only">Editar conteúdo do ambiente</legend>
          <div class="editor-grid">
            <div>
              <section class="panel">
                <h2>Texto</h2>
                <label
                  ><input type="checkbox" [(ngModel)]="content.textEnabled" />Exibir texto ao
                  publicar</label
                >
                <p>
                  Escreva por partes. Use os botões para escolher parágrafo, título, lista ou link.
                </p>
                @for (b of content.blocks; track $index; let i = $index) {
                  <div class="block">
                    <label [for]="'block-' + i">Parte {{ i + 1 }}</label
                    ><select [id]="'block-' + i" [(ngModel)]="b.type">
                      <option value="paragraph">Parágrafo</option>
                      <option value="heading">Título</option>
                      <option value="list">Item de lista</option>
                      <option value="link">Link</option></select
                    ><label [for]="'text-' + i">Texto da parte {{ i + 1 }}</label
                    ><textarea [id]="'text-' + i" [(ngModel)]="b.text" maxlength="10000"></textarea
                    ><label><input type="checkbox" [(ngModel)]="b.bold" />Negrito</label>
                    @if (b.type === 'link') {
                      <label [for]="'url-' + i">Endereço HTTPS</label
                      ><input [id]="'url-' + i" [(ngModel)]="b.url" type="url" />
                    }
                    <div class="actions">
                      <button class="secondary" (click)="moveBlock(i, -1)" [disabled]="i === 0">
                        Subir parte {{ i + 1 }}</button
                      ><button
                        class="secondary"
                        (click)="moveBlock(i, 1)"
                        [disabled]="i === content.blocks.length - 1"
                      >
                        Descer parte {{ i + 1 }}</button
                      ><button class="secondary" (click)="removeBlock(i)">
                        Remover parte {{ i + 1 }}
                      </button>
                    </div>
                  </div>
                }
                <button
                  class="secondary"
                  (click)="
                    content.blocks.push({ type: 'paragraph', text: '', bold: false, url: '' })
                  "
                >
                  Adicionar parte
                </button>
                <ng-container
                  [ngTemplateOutlet]="mediaFields"
                  [ngTemplateOutletContext]="{ $implicit: kinds[0] }"
                />
              </section>
              @for (kind of kinds.slice(1); track kind[0]) {
                <section class="panel">
                  <ng-container
                    [ngTemplateOutlet]="mediaFields"
                    [ngTemplateOutletContext]="{ $implicit: kind }"
                  />
                </section>
              }

              <section class="panel">
                <h2>Recuperar uma publicação</h2>
                <p>A recuperação cria um rascunho. Revise e publique para alterar o site.</p>
                @for (h of history; track h.revision) {
                  <button class="secondary" (click)="restore(h.revision)" [disabled]="busy()">
                    Recuperar versão {{ h.revision }}
                  </button>
                }
                @if (!history.length) {
                  <p>Ainda não há versões anteriores.</p>
                }
              </section>
              <section class="panel qr">
                <h2>QR Codes</h2>
                <h3>{{ title() }}</h3>
                @if (!data.config.publicBaseUrl) {
                  <p>
                    Os downloads estarão disponíveis quando o responsável configurar o endereço
                    definitivo do site.
                  </p>
                } @else {
                  <label for="qr-kind">Destino</label
                  ><select id="qr-kind" [(ngModel)]="qrKind" (change)="generateQr()">
                    <option value="">Ambiente completo</option>
                    <option value="texto">Texto</option>
                    <option value="libras">Libras</option>
                    <option value="audiodescricao">Audiodescrição</option>
                  </select>
                  <p class="wrap">{{ link() }}</p>
                  <button (click)="generateQr()">Gerar QR Code</button>
                  @if (qrPng()) {
                    <img [src]="qrPng()" alt="QR Code para o destino exibido" />
                    <button class="secondary" (click)="downloadQr('png')">Baixar PNG</button>
                    <button class="secondary" (click)="downloadQr('svg')">Baixar SVG</button>
                    <button class="secondary" (click)="print()">Imprimir com legenda</button>
                  }
                }
                <p>A quantidade e a instalação física dependem de confirmação.</p>
              </section>
            </div>
            <aside>
              <h2>Prévia do rascunho</h2>
              <p>Somente você vê esta prévia.</p>
              <div class="preview">
                <h2>{{ title() }}</h2>
                <app-content [content]="previewContent()" />
              </div>
            </aside>
          </div>
        </fieldset>
      }
    }
    <ng-template #mediaFields let-kind>
      @if (kind[0] !== 'text_pdf') {
        <h2>{{ kind[1] }}</h2>
      }
      <label [for]="'upload-' + kind[0]">Anexar {{ kind[1] }} (máximo 50 MB)</label
      ><input
        [id]="'upload-' + kind[0]"
        type="file"
        [accept]="kind[2]"
        [multiple]="kind[0] === 'image'"
        (change)="upload($event, kind[0])"
        [disabled]="busy()"
      />
      @if (kind[0] === 'audiodescricao') {
        <p>
          Somente áudio: MP3, AAC, WMA, WAV, M4A/MP4 (sem vídeo), OGG/Opus ou FLAC. Até 50 MB.
          Prefira MP3 para facilitar a reprodução nos celulares.
        </p>
      }
      @if (kind[0] === 'image') {
        <p>Você pode selecionar várias fotos de uma vez ou adicionar outras depois.</p>
      }
      @if (kind[0] === 'text_pdf' || kind[0] === 'activity_pdf') {
        <p>
          Envie um PDF, informe o título e o crédito. O arquivo aparece no site após publicar.
          Prefira PDFs com texto selecionável e leitura acessível.
        </p>
      }
      @if (kind[0] === 'libras') {
        <button class="secondary" (click)="external(kind[0])">
          Adicionar vídeo por endereço HTTPS
        </button>
      }
      @for (m of content.media; track m.id; let i = $index) {
        @if (m.kind === kind[0]) {
          <div class="media-editor">
            @if (m.kind === 'audiodescricao' && !audioMedia(m)) {
              <p>
                Este recurso antigo não é um áudio compatível. Substitua por um arquivo de áudio ou
                desative antes de publicar.
              </p>
            }
            <label
              ><input type="checkbox" [(ngModel)]="m.enabled" />Exibir este recurso ao
              publicar</label
            ><label [for]="'alt-' + m.id">{{
              m.kind === 'image'
                ? 'Descrição da imagem'
                : m.kind === 'text_pdf' || m.kind === 'activity_pdf'
                  ? 'Título do PDF'
                  : 'Descrição do recurso'
            }}</label
            ><textarea [id]="'alt-' + m.id" [(ngModel)]="m.alt"></textarea
            ><label [for]="'credit-' + m.id">Crédito e licença</label
            ><input [id]="'credit-' + m.id" [(ngModel)]="m.credit" />
            @if (m.kind === 'image') {
              <label><input type="checkbox" [(ngModel)]="m.illustration" />É uma ilustração</label
              ><label
                ><input type="checkbox" [(ngModel)]="m.rights" />Confirmo o direito de uso desta
                imagem</label
              ><button class="secondary" (click)="cover(i)">Definir como capa</button>
            }
            @if (!m.path && m.kind === 'libras') {
              <label [for]="'external-' + m.id"
                >URL direta do vídeo HTTPS (domínio autorizado)</label
              ><input [id]="'external-' + m.id" [(ngModel)]="m.url" type="url" />
            }
            @if (m.kind === 'audio' || m.kind === 'libras' || m.kind === 'audiodescricao') {
              <label [for]="'transcript-' + m.id">Transcrição</label
              ><textarea [id]="'transcript-' + m.id" [(ngModel)]="m.transcript"></textarea>
              @if (m.kind === 'libras') {
                <label [for]="'poster-' + m.id">Pôster do vídeo</label
                ><select [id]="'poster-' + m.id" [(ngModel)]="m.poster">
                  <option value="">Sem pôster</option>
                  @for (p of content.media; track p.id) {
                    @if (p.kind === 'image') {
                      <option [value]="p.url">{{ p.alt || 'Imagem enviada' }}</option>
                    }
                  }
                </select>
              }
            }
            @if (m.kind === 'text_pdf') {
              <app-pdf [media]="m" />
            } @else if (m.kind === 'activity_pdf') {
              <p>
                <a [href]="m.url" target="_blank" rel="noopener noreferrer"
                  >Abrir PDF em nova aba</a
                >
              </p>
            }
            <label [for]="'replace-' + m.id">Substituir arquivo</label
            ><input
              [id]="'replace-' + m.id"
              type="file"
              [accept]="kind[2]"
              (change)="upload($event, kind[0], i)"
              [disabled]="busy()"
            /><button class="secondary" (click)="removeMedia(i)">Remover recurso</button>
          </div>
        }
      }
    </ng-template>
    @if (busy() && progress() >= 0) {
      <label for="progress">Enviando arquivo: {{ progress() }}%</label
      ><progress id="progress" max="100" [value]="progress()"></progress>
    }
    <p class="status" role="status" aria-live="polite" [hidden]="!message()">{{ message() }}</p>
  `,
})
export class Admin {
  data = inject(Data);
  spaces = SPACES;
  coverImage = spaceCover;
  audioMedia = isAudioMedia;
  password = '';
  busy = signal(false);
  message = signal('');
  progress = signal(-1);
  slug = signal('');
  content: Content = emptyContent();
  revision = 0;
  history: Snapshot[] = [];
  summaries: Record<string, { status: string; updated_at: string }> = {};
  qrKind = '';
  qrPng = signal('');
  qrSvg = signal('');
  kinds = [
    ['text_pdf', 'PDF do texto', 'application/pdf'],
    ['image', 'Fotos', 'image/jpeg,image/png,image/webp'],
    ['libras', 'Vídeo em Libras', 'video/mp4,video/webm'],
    ['audiodescricao', 'Audiodescrição', AUDIO_ACCEPT],
    ['activity_pdf', 'Atividades', 'application/pdf'],
    ['audio', 'Áudio (opcional)', AUDIO_ACCEPT],
  ];
  previewContent() {
    return structuredClone(this.content);
  }
  title() {
    return SPACES.find((s) => s[0] === this.slug())?.[1] || '';
  }
  summary(slug: string) {
    const s = this.summaries[slug];
    return s
      ? s.status + (s.updated_at ? ' · ' + new Date(s.updated_at).toLocaleString('pt-BR') : '')
      : 'Pendente';
  }
  async run(fn: () => Promise<void>) {
    this.busy.set(true);
    this.message.set('');
    try {
      await fn();
    } catch (e) {
      this.message.set(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      this.busy.set(false);
      this.progress.set(-1);
    }
  }
  async login() {
    await this.run(async () => {
      const result = await this.data.api<{ token: string }>(
        '/admin/session',
        { password: this.password },
        'POST',
      );
      this.password = '';
      this.data.token.set(result.token);
      await this.data.api('/admin/session');
      await this.dashboard();
    });
  }
  async logout() {
    try {
      await this.run(async () => {
        await this.data.api('/admin/session', undefined, 'DELETE');
        this.message.set('Você saiu da área de edição.');
      });
    } finally {
      this.data.token.set('');
      this.slug.set('');
      this.content = emptyContent();
    }
  }
  async dashboard() {
    if (this.slug() && !confirm('Sair do editor? Salve antes para manter as alterações.')) return;
    await this.run(async () => {
      this.summaries = await this.data.api('/admin/spaces');
      this.slug.set('');
    });
  }
  async edit(slug: string) {
    await this.run(async () => {
      const r = await this.data.api<EditorData>('/admin/spaces/' + slug);
      this.slug.set(slug);
      this.content = r.draft.content;
      this.revision = r.draft.revision;
      this.history = r.history;
      this.qrPng.set('');
      this.qrSvg.set('');
    });
  }
  async saveDraft() {
    const r = await this.data.api<Snapshot>(
      '/admin/spaces/' + this.slug() + '/draft',
      { content: this.content, revision: this.revision },
      'PUT',
    );
    const fresh = await this.data.api<EditorData>('/admin/spaces/' + this.slug());
    this.content = fresh.draft.content;
    this.revision = r.revision;
    this.history = fresh.history;
  }
  async save() {
    await this.run(async () => {
      await this.saveDraft();
      this.message.set('Rascunho salvo. O site público continua com a versão publicada.');
    });
  }
  async publish() {
    if (!confirm('Publicar as seções habilitadas deste ambiente para todos os visitantes?')) return;
    await this.run(async () => {
      await this.saveDraft();
      await this.data.api(
        '/admin/spaces/' + this.slug() + '/publish',
        { revision: this.revision },
        'POST',
      );
      const fresh = await this.data.api<EditorData>('/admin/spaces/' + this.slug());
      this.content = fresh.draft.content;
      this.revision = fresh.draft.revision;
      this.history = fresh.history;
      await this.data.published(this.slug());
      this.message.set('Atualização publicada. Abra a versão publicada para conferir.');
    });
  }
  removeBlock(i: number) {
    if (confirm('Remover esta parte do rascunho?')) this.content.blocks.splice(i, 1);
  }
  moveBlock(i: number, d: number) {
    const b = this.content.blocks.splice(i, 1)[0];
    this.content.blocks.splice(i + d, 0, b);
  }
  removeMedia(i: number) {
    if (confirm('Remover este recurso do rascunho? A versão pública só muda ao publicar.')) {
      const old = this.content.media.splice(i, 1)[0];
      this.updateReferences(old, '');
    }
  }
  updateReferences(old: Media, url: string) {
    for (const m of this.content.media) {
      if (m.caption && (m.caption === old.id || m.caption === old.url)) m.caption = url;
      if (m.poster && (m.poster === old.id || m.poster === old.url)) m.poster = url;
    }
  }
  cover(i: number) {
    const m = this.content.media.splice(i, 1)[0];
    this.content.media.unshift(m);
  }
  external(kind: string) {
    this.content.media.push({
      id: crypto.randomUUID(),
      kind: kind as Media['kind'],
      url: '',
      path: '',
      alt: '',
      credit: '',
      illustration: true,
      rights: false,
      transcript: '',
      caption: '',
      poster: '',
      enabled: true,
    });
  }
  async upload(event: Event, kind: string, index?: number) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    if (index !== undefined && !confirm('Substituir este arquivo no rascunho?')) return;
    if (files.some((f) => f.size <= 0 || f.size > MAX_FILE)) {
      this.message.set('Escolha um formato permitido com até 50 MB por arquivo.');
      input.value = '';
      return;
    }
    if (this.content.media.length + (index === undefined ? files.length : 0) > 40) {
      this.message.set(
        'Cada ambiente aceita até 40 arquivos. Remova um recurso antes de adicionar outros.',
      );
      input.value = '';
      return;
    }
    await this.run(async () => {
      let received = 0;
      try {
        for (const file of files) {
          const f = await prepareUploadFile(file, kind);
          if (!allowedMediaType(kind, f.type))
            throw Error('Escolha um formato permitido com até 50 MB por arquivo.');
          this.progress.set(0);
          const m = await this.data.upload(f, this.slug(), kind, (n) => this.progress.set(n));
          const old = index !== undefined ? this.content.media[index] : undefined;
          const media: Media = {
            id: m.id,
            kind: kind as Media['kind'],
            mime: f.type,
            path: m.path,
            url: m.url,
            alt: old?.alt || (f.type === 'application/pdf' ? f.name.replace(/\.pdf$/i, '') : ''),
            credit: old?.credit || '',
            illustration: old?.illustration ?? true,
            rights: old?.rights ?? false,
            transcript: old?.transcript || '',
            caption: kind === 'audiodescricao' ? '' : old?.caption || '',
            poster: kind === 'audiodescricao' ? '' : old?.poster || '',
            enabled: true,
          };
          if (index !== undefined) this.content.media[index] = media;
          else this.content.media.push(media);
          if (old) this.updateReferences(old, media.url);
          received++;
        }
      } catch (error) {
        throw new Error(
          `${received} de ${files.length} arquivos recebidos. ${error instanceof Error ? error.message : 'Envio falhou.'} ${received ? 'Os arquivos recebidos estão no editor; salve o rascunho e selecione os restantes para tentar novamente.' : 'Nenhum arquivo foi adicionado. Confira o formato e tente novamente.'}`,
        );
      }
      this.message.set(
        files.length === 1
          ? 'Arquivo recebido. Preencha os detalhes e salve o rascunho.'
          : `${received} arquivos recebidos. Preencha os detalhes e salve o rascunho.`,
      );
    });
    input.value = '';
  }

  async restore(revision: number) {
    if (!confirm('Recuperar esta versão como rascunho? As alterações atuais serão substituídas.'))
      return;
    await this.run(async () => {
      await this.data.api(
        '/admin/spaces/' + this.slug() + '/restore',
        { revision, expectedRevision: this.revision },
        'POST',
      );
      const r = await this.data.api<EditorData>('/admin/spaces/' + this.slug());
      this.content = r.draft.content;
      this.revision = r.draft.revision;
      this.message.set('Versão recuperada como rascunho. Revise antes de publicar.');
    });
  }
  link() {
    return (
      (this.data.config.publicBaseUrl || location.href.split('#')[0]).replace(/\/?$/, '/') +
      '#/ambientes/' +
      this.slug() +
      (this.qrKind ? '?recurso=' + this.qrKind : '')
    );
  }
  async copyLink() {
    await this.run(async () => {
      await navigator.clipboard.writeText(this.link());
      this.message.set('Link copiado.');
    });
  }
  async generateQr() {
    if (!this.data.config.publicBaseUrl) return;
    await this.run(async () => {
      this.qrPng.set(await QRCode.toDataURL(this.link(), { width: 600, margin: 4 }));
      this.qrSvg.set(await QRCode.toString(this.link(), { type: 'svg', margin: 4 }));
    });
  }
  async downloadQr(format: 'png' | 'svg') {
    await this.run(async () => {
      const blob =
        format === 'svg'
          ? new Blob([this.qrSvg()], { type: 'image/svg+xml' })
          : await (await fetch(this.qrPng())).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.slug() + '-' + (this.qrKind || 'geral') + '.' + format;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  print() {
    document.body.classList.add('printing-qr');
    try {
      window.print();
    } finally {
      document.body.classList.remove('printing-qr');
    }
  }
}
