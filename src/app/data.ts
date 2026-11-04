import { Injectable, signal } from '@angular/core';
import { Snapshot } from '../../shared/content';
export interface Config {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  publicBaseUrl: string;
}
@Injectable({ providedIn: 'root' })
export class Data {
  config: Config = {
    apiBaseUrl: '',
    supabaseUrl: '',
    supabasePublishableKey: '',
    publicBaseUrl: '',
  };
  token = signal('');
  ready = fetch('config.json', { cache: 'no-store' })
    .then((r) => r.json())
    .then((c) => (this.config = c));
  async api<T>(path: string, body?: unknown, method = 'GET'): Promise<T> {
    await this.ready;
    const r = await fetch(this.config.apiBaseUrl + path, {
      method,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token() ? { Authorization: 'Bearer ' + this.token() } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (r.status === 401) this.token.set('');
    const data = await r.json();
    if (!r.ok) throw Error(data.error || 'Não foi possível concluir. Tente novamente.');
    return data as T;
  }
  async published(slug: string): Promise<Snapshot | null> {
    await this.ready;
    return this.api<Snapshot | null>('/public/spaces/' + slug);
  }
  async upload(
    file: File,
    slug: string,
    kind: string,
    onProgress: (n: number) => void,
  ): Promise<{ id: string; path: string; url: string }> {
    const auth = await this.api<{
      id: string;
      path: string;
      url: string;
      token: string;
      uploadUrl: string;
    }>('/admin/uploads/authorize', { slug, kind, mime: file.type, size: file.size }, 'POST');
    await new Promise<void>((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open('PUT', auth.uploadUrl);
      x.setRequestHeader('Content-Type', file.type);
      x.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      x.onload = () =>
        x.status < 300
          ? resolve()
          : reject(Error('Envio falhou. Selecione o arquivo para tentar novamente.'));
      x.onerror = () => reject(Error('Conexão interrompida no envio.'));
      x.send(file);
    });
    return this.api('/admin/uploads/complete', { id: auth.id }, 'POST');
  }
}
