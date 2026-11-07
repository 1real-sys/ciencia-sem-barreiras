import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Data } from './data';
import { ContentView } from './content-view';
import { SPACES, Snapshot, emptyContent } from '../../shared/content';
import { PURPOSE } from './institutional';
import { spaceCover } from './covers';
@Component({
  selector: 'app-public',
  imports: [RouterLink, ContentView],
  host: {
    '[class.environment-list]': "mode === 'list'",
    '[class.environment-page]': "mode === 'space'",
  },
  template: `
    @if (mode === 'home') {
      <div class="hero">
        <div class="hero-copy">
          <span class="eyebrow">CIÊNCIA PARA TODAS AS PESSOAS</span>
          <h1>Explore os espaços de Biologia da Escola da Ciência – Biologia e História</h1>
          <p>
            Conheça os animais, explore diferentes ambientes e descubra como a natureza funciona.
          </p>
          <a class="button" routerLink="/ambientes"
            >Explorar os ambientes <span aria-hidden="true">↗</span></a
          >
        </div>
        <figure class="hero-art">
          <img
            src="imagens/logoprojeto.jpeg"
            alt="Logo com o nome Escola de Biologia e História"
            width="1254"
            height="1254"
          />
        </figure>
      </div>
      <div class="intro-strip">
        <span>01 · Observe com curiosidade</span><span>02 · Escolha como aprender</span
        ><span>03 · Faça novas descobertas</span>
      </div>
    }
    @if (mode === 'home' || mode === 'list') {
      <section>
        <span class="eyebrow">UM CAMINHO, MUITAS DESCOBERTAS</span>
        @if (mode === 'home') {
          <h2>Por onde vamos começar?</h2>
        } @else {
          <h1>Explore os nove ambientes</h1>
        }
        <p>
          Escolha um espaço. Você pode ler, ouvir e acessar os recursos disponíveis no seu ritmo.
        </p>
        <div class="cards">
          @for (s of spaces; track s[0]; let i = $index) {
            <a class="space-card" [routerLink]="['/ambientes', s[0]]"
              ><div class="card-art" [class.forest]="i > 4 && cover(s[0]).illustration">
                <img [src]="cover(s[0]).src" alt="" loading="lazy" /><span class="art-label">{{
                  cover(s[0]).label
                }}</span
                ><span class="number">{{ ('0' + (i + 1)).slice(-2) }}</span>
              </div>
              <div class="card-body">
                <span class="eyebrow">{{ s[2] }}</span>
                @if (mode === 'home') {
                  <h3>{{ s[1] }}</h3>
                } @else {
                  <h2>{{ s[1] }}</h2>
                }
                <span class="card-link">Conhecer o ambiente <span aria-hidden="true">→</span></span>
              </div></a
            >
          }
        </div>
      </section>
    }
    @if (mode === 'home' || mode === 'about') {
      <section class="purpose">
        <span class="eyebrow">APRENDER DE DIFERENTES JEITOS</span>
        @if (mode === 'home') {
          <h2>Por que criamos este projeto?</h2>
        } @else {
          <h1>Sobre o projeto</h1>
        }
        @if (mode === 'about') {
          <p>
            Ciência Sem Barreiras é um projeto acadêmico independente de estudantes de Pedagogia,
            dedicado à alfabetização científica e a diferentes formas de acesso à informação.
          </p>
          <h2>Por que criamos este projeto?</h2>
        }
        @for (p of purpose; track $index) {
          <p>{{ p }}</p>
        }
      </section>
    }
    @if (mode === 'space') {
      <a routerLink="/ambientes" class="back">← Todos os ambientes</a>
      @if (space) {
        <div class="space-intro">
          <div class="space-heading">
            <span class="eyebrow">{{ space[2] }}</span>
            <h1>{{ space[1] }}</h1>
            <p>Observe, descubra e escolha como explorar.</p>
          </div>
          <figure class="space-cover">
            <img [src]="cover(space[0]).src" alt="" width="640" height="400" />
            <figcaption>{{ cover(space[0]).label }}</figcaption>
          </figure>
        </div>
        <nav class="resource-nav" aria-label="Recursos do ambiente">
          @for (r of resources; track r[0]) {
            <a
              [routerLink]="[]"
              [queryParams]="{ recurso: r[0] }"
              [attr.aria-current]="
                route.snapshot.queryParamMap.get('recurso') === r[0] ? 'location' : null
              "
              >{{ r[1] }}</a
            >
          }
        </nav>
        @if (loading()) {
          <p role="status">Buscando as descobertas deste ambiente…</p>
        } @else if (error()) {
          <div role="alert">
            <p>{{ error() }}</p>
            <button (click)="load()">Tentar novamente</button>
          </div>
        } @else {
          <app-content [content]="snapshot()?.content || empty()" />
        }
        <nav class="space-pagination" aria-label="Outros ambientes">
          @if (previousSpace; as previous) {
            <a [routerLink]="['/ambientes', previous[0]]"
              ><span>← Ambiente anterior</span><strong>{{ previous[1] }}</strong></a
            >
          }
          @if (nextSpace; as next) {
            <a [routerLink]="['/ambientes', next[0]]"
              ><span>Próximo ambiente →</span><strong>{{ next[1] }}</strong></a
            >
          }
        </nav>
      } @else {
        <h1>Ambiente não encontrado</h1>
        <p>Escolha um dos nove ambientes para continuar.</p>
      }
    }
  `,
})
export class PublicPage {
  data = inject(Data);
  route = inject(ActivatedRoute);
  mode = this.route.snapshot.data['mode'];
  spaces = SPACES;
  cover = spaceCover;
  space: (typeof SPACES)[number] | undefined;
  purpose = PURPOSE;
  resources = [
    ['texto', 'Texto'],
    ['fotos', 'Fotos'],
    ['libras', 'Libras'],
    ['audiodescricao', 'Audiodescrição'],
    ['atividades', 'Atividades'],
  ];
  snapshot = signal<Snapshot | null>(null);
  loading = signal(false);
  error = signal('');
  empty = emptyContent;
  get previousSpace() {
    return SPACES[SPACES.findIndex((s) => s === this.space) - 1];
  }
  get nextSpace() {
    return SPACES[SPACES.findIndex((s) => s === this.space) + 1];
  }
  constructor() {
    this.route.paramMap.subscribe((p) => {
      this.space = SPACES.find((s) => s[0] === p.get('slug'));
      if (this.space) void this.load();
    });
    this.route.queryParamMap.subscribe(() => this.focusResource());
  }
  async load() {
    if (!this.space) return;
    this.loading.set(true);
    this.error.set('');
    try {
      this.snapshot.set(await this.data.published(this.space[0]));
    } catch {
      this.error.set(
        'Não foi possível buscar o conteúdo. Verifique sua conexão e tente novamente.',
      );
    } finally {
      this.loading.set(false);
      this.focusResource();
    }
  }
  focusResource() {
    const id = this.route.snapshot.queryParamMap.get('recurso');
    if (id && this.resources.some((r) => r[0] === id))
      setTimeout(() => {
        document.getElementById(id)?.focus();
        document.getElementById(id)?.scrollIntoView({ block: 'start' });
      }, 100);
  }
}
