// Inspect container metadata, not just the extension: M4A and WMA can share
// their container with video. Reads are bounded and skip media payloads.
type ReadRange = (offset: number, length: number) => Promise<Uint8Array>;
const MAX_HEADER = 2 * 1024 * 1024;
const text = (b: Uint8Array) => new TextDecoder('latin1').decode(b);
const view = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength);
const guid = (hex: string) => Uint8Array.from(hex.match(/../g)!.map((s) => parseInt(s, 16)));
const matches = (b: Uint8Array, at: number, expected: Uint8Array) =>
  expected.every((v, i) => b[at + i] === v);

export function audioSignature(mime: string, b: Uint8Array): boolean {
  const ascii = text(b);
  if (mime === 'audio/wav') return ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE';
  if (mime === 'audio/flac') return ascii.startsWith('fLaC');
  if (mime === 'audio/x-ms-wma') return matches(b, 0, guid('3026b2758e66cf11a6d900aa0062ce6c'));
  if (mime === 'audio/mp4') return ascii.slice(4, 8) === 'ftyp';
  if (mime === 'audio/ogg') return ascii.startsWith('OggS');
  if (mime === 'audio/aac') {
    // Raw AAC ADTS or ADIF. ID3-tagged ADTS is checked past the tag below.
    return (
      ascii.startsWith('ADIF') ||
      (b.length >= 7 && b[0] === 255 && (b[1] & 246) === 240 && ((b[2] >> 2) & 15) < 13)
    );
  }
  if (mime === 'audio/mpeg')
    return (
      ascii.startsWith('ID3') ||
      (b.length >= 4 &&
        b[0] === 255 &&
        (b[1] & 224) === 224 &&
        (b[1] & 6) !== 0 &&
        (b[1] & 24) !== 8 &&
        b[2] >> 4 > 0 &&
        b[2] >> 4 < 15)
    );
  return false;
}

function atom(b: Uint8Array, offset: number, remaining: number) {
  if (b.length < offset + 8) return null;
  const v = view(b);
  let size = v.getUint32(offset);
  let header = 8;
  if (size === 1) {
    if (b.length < offset + 16) return null;
    const big = v.getBigUint64(offset + 8);
    if (big > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    size = Number(big);
    header = 16;
  }
  if (size === 0) size = remaining;
  return size >= header && size <= remaining
    ? { type: text(b.subarray(offset + 4, offset + 8)), size, header }
    : null;
}

function children(b: Uint8Array, start: number, end: number) {
  const result: { type: string; start: number; end: number }[] = [];
  for (let at = start; at < end;) {
    const a = atom(b, at, end - at);
    if (!a || result.length >= 256) return null;
    result.push({ type: a.type, start: at + a.header, end: at + a.size });
    at += a.size;
  }
  return result;
}

function audioMovie(b: Uint8Array, header: number): boolean {
  const tracks = children(b, header, b.length)?.filter((c) => c.type === 'trak');
  if (!tracks?.length) return false;
  return tracks.every((track) => {
    const media = children(b, track.start, track.end)?.filter((c) => c.type === 'mdia');
    if (media?.length !== 1) return false;
    const handlers = children(b, media[0].start, media[0].end)?.filter((c) => c.type === 'hdlr');
    return (
      handlers?.length === 1 &&
      handlers[0].end - handlers[0].start >= 12 &&
      text(b.subarray(handlers[0].start + 8, handlers[0].start + 12)) === 'soun'
    );
  });
}

export async function audioOnly(mime: string, size: number, read: ReadRange): Promise<boolean> {
  let head = await read(0, Math.min(size, 65536));
  if (text(head.subarray(0, 3)) === 'ID3' && (mime === 'audio/aac' || mime === 'audio/mpeg')) {
    if (head.length < 10 || head.subarray(6, 10).some((v) => v > 127)) return false;
    const tagSize =
      ((head[6] << 21) | (head[7] << 14) | (head[8] << 7) | head[9]) + 10 + (head[5] & 16 ? 10 : 0);
    if (tagSize + 7 > size) return false;
    head = await read(tagSize, Math.min(4096, size - tagSize));
  }
  if (!audioSignature(mime, head)) return false;
  if (mime === 'audio/mp4') {
    let movie = false;
    let offset = 0;
    for (let count = 0; offset < size && count < 64; count++) {
      const bytes = await read(offset, Math.min(16, size - offset));
      const a = atom(bytes, 0, size - offset);
      if (!a || (offset === 0 && a.type !== 'ftyp')) return false;
      if (a.type === 'moov') {
        if (movie || a.size > MAX_HEADER) return false;
        const metadata = await read(offset, a.size);
        if (metadata.length !== a.size || !audioMovie(metadata, a.header)) return false;
        movie = true;
      }
      offset += a.size;
    }
    return movie && offset === size;
  }
  if (mime === 'audio/x-ms-wma') {
    if (head.length < 30) return false;
    const length = view(head).getBigUint64(16, true);
    if (length < 30n || length > BigInt(MAX_HEADER) || length > BigInt(size)) return false;
    const bytes = await read(0, Number(length));
    if (bytes.length !== Number(length)) return false;
    const count = view(bytes).getUint32(24, true);
    if (count > 256) return false;
    let offset = 30;
    let audio = false;
    for (let i = 0; i < count; i++) {
      if (offset + 24 > bytes.length) return false;
      const n = view(bytes).getBigUint64(offset + 16, true);
      if (n < 24n || n > BigInt(bytes.length - offset)) return false;
      if (matches(bytes, offset, guid('9107dcb7b7a9cf118ee600c00c205365'))) {
        if (n < 40n || !matches(bytes, offset + 24, guid('409e69f84d5bcf11a8fd00805f5c442b')))
          return false;
        audio = true;
      }
      offset += Number(n);
    }
    return audio && offset === bytes.length;
  }
  if (mime === 'audio/ogg') {
    let audio = false;
    for (let at = 0; at + 27 <= head.length;) {
      if (text(head.subarray(at, at + 4)) !== 'OggS') return false;
      const segments = head[at + 26];
      const payload = at + 27 + segments;
      if (payload > head.length) return false;
      if (head[at + 5] & 2) {
        const codec = text(head.subarray(payload, payload + 8));
        if (
          !codec.startsWith('OpusHead') &&
          !codec.startsWith('\x01vorbis') &&
          !codec.startsWith('\x7fFLAC')
        )
          return false;
        audio = true;
      }
      const length = head.subarray(at + 27, payload).reduce((sum, n) => sum + n, 0);
      at = payload + length;
    }
    return audio;
  }
  return true;
}
