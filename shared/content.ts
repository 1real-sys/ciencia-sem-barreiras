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
export const MEDIA_KINDS = [
  'image',
  'audio',
  'libras',
  'audiodescricao',
  'caption',
  'text_pdf',
  'activity_pdf',
] as const;
export interface Media {
  id: string;
  kind: (typeof MEDIA_KINDS)[number];
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
  'application/pdf': 'pdf',
};

export function allowedMediaType(kind: string, mime: string): boolean {
  const types: Record<Media['kind'], readonly string[]> = {
    image: ['image/jpeg', 'image/png', 'image/webp'],
    audio: ['audio/mpeg', 'audio/mp4', 'audio/ogg'],
    libras: ['video/mp4', 'video/webm'],
    audiodescricao: ['video/mp4', 'video/webm'],
    caption: ['text/vtt'],
    text_pdf: ['application/pdf'],
    activity_pdf: ['application/pdf'],
  };
  return MEDIA_KINDS.includes(kind as Media['kind']) && types[kind as Media['kind']].includes(mime);
}
