export const SPACES = [
  ['aquario-nascente-rio', 'Aquário Nascente do Rio – Paludário', 'Água doce'],
  ['aquario-fundo-rio', 'Aquário Fundo do Rio – Jumbo', 'Água doce'],
  ['aquario-lagoa', 'Aquário Lagoa', 'Água doce'],
  ['aquario-marinho', 'Aquário Marinho', 'Marinho'],
  ['aquario-praia', 'Aquário Praia', 'Praia'],
  ['diorama-manguezal', 'Diorama do Manguezal', 'Manguezal'],
  ['diorama-restinga', 'Diorama da Restinga', 'Restinga'],
  ['diorama-mata-atlantica', 'Diorama da Mata Atlântica 1', 'Mata Atlântica'],
  ['diorama-mata-atlantica-2', 'Diorama da Mata Atlântica 2', 'Mata Atlântica'],
] as const;
export interface Block {
  type: 'paragraph' | 'heading' | 'list' | 'link';
  text: string;
  bold: boolean;
  url: string;
}
export interface Media {
  id: string;
  kind: 'image' | 'audio' | 'libras' | 'audiodescricao' | 'caption';
  url: string;
  path: string;
  alt: string;
  credit: string;
  illustration: boolean;
  rights: boolean;
  transcript: string;
  caption: string;
  poster: string;
  enabled: boolean;
}
export interface Content {
  blocks: Block[];
  textEnabled: boolean;
  media: Media[];
}
export const emptyContent = (): Content => ({ blocks: [], textEnabled: true, media: [] });
export interface Snapshot {
  content: Content;
  revision: number;
  updated_at?: string;
  published_at?: string;
}
export const MAX_FILE = 50 * 1024 * 1024;
export const MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'text/vtt': 'vtt',
};
