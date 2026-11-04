import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `<a href="#main" class="skip" (click)="skip($event)">Pular para o conteúdo</a>
    <header>
      <a class="brand" routerLink="/" aria-label="Ciência Sem Barreiras, início"
        ><span class="brand-icon" aria-hidden="true">✳</span
        ><span>Ciência<br /><strong>Sem Barreiras</strong></span></a
      >
      <nav aria-label="Navegação principal">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
          >Início</a
        ><a routerLink="/ambientes" routerLinkActive="active">Ambientes</a
        ><a routerLink="/sobre" routerLinkActive="active">Sobre</a>
      </nav>
    </header>
    <main id="main" tabindex="-1"><router-outlet /></main>
    <footer>
      <a class="brand" routerLink="/">Ciência Sem Barreiras</a>
      <p>
        Projeto acadêmico independente, desenvolvido para fins educativos. Esta plataforma não
        representa oficialmente a Escola da Ciência – Biologia e História nem a Prefeitura Municipal
        de Vitória.
      </p>
      <a routerLink="/admin">Área de edição</a>
    </footer>
    @if (!admin()) {
      <div vw class="enabled">
        <div vw-access-button class="active"></div>
        <div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>
      </div>
    }`,
})
export class App {
  admin = signal(false);
  navigated = false;
  widgetLoaded = false;
  constructor(router: Router) {
    router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        this.admin.set(e.urlAfterRedirects.startsWith('/admin'));
        document.title = 'Ciência Sem Barreiras';
        if (!this.admin() && !this.widgetLoaded) setTimeout(() => this.loadWidget());
        if (this.navigated) document.getElementById('main')?.focus();
        this.navigated = true;
      }
    });
  }
  loadWidget() {
    if (this.widgetLoaded) return;
    this.widgetLoaded = true;
    const script = document.createElement('script');
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.async = true;
    document.body.append(script);
  }
  skip(e: Event) {
    e.preventDefault();
    document.getElementById('main')?.focus();
  }
}
