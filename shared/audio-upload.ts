import { normalizedMime } from './content';

// A MIME candidate for upload, not proof of audio-only content. The Worker
// still validates the stored file and inspects MP4/ASF streams before accepting.
export function audioUploadMime(head: Uint8Array, fallback: string): string {
  const ascii = new TextDecoder('latin1').decode(head);
  if (ascii.slice(4, 8) === 'ftyp') return 'audio/mp4';
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE') return 'audio/wav';
  if (ascii.startsWith('fLaC')) return 'audio/flac';
  if (ascii.startsWith('OggS')) return 'audio/ogg';
  const asf = [
    0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce, 0x6c,
  ];
  if (asf.every((value, i) => head[i] === value)) return 'audio/x-ms-wma';
  if (ascii.startsWith('ID3')) return fallback === 'audio/aac' ? fallback : 'audio/mpeg';
  if (ascii.startsWith('ADIF') || (head.length >= 7 && head[0] === 255 && (head[1] & 246) === 240))
    return 'audio/aac';
  if (head.length >= 4 && head[0] === 255 && (head[1] & 224) === 224 && (head[1] & 6) !== 0)
    return 'audio/mpeg';
  return fallback;
}

export async function prepareUploadFile(file: File, kind: string): Promise<File> {
  let mime = normalizedMime(file.type, file.name);
  if (kind === 'audio' || kind === 'audiodescricao') {
    const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
    mime = audioUploadMime(head, mime);
  }
  return mime === file.type
    ? file
    : new File([file], file.name, { type: mime, lastModified: file.lastModified });
}
