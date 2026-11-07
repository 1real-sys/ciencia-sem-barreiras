import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { audioOnly, audioSignature } from '../../worker/src/audio';
import { allowedMediaType, normalizedMime, isAudioMedia } from '../../shared/content';
import { prepareUploadFile } from '../../shared/audio-upload';
import { contentSchema } from '../../shared/schema';

const formats = [
  ['mp3', 'audio/mpeg'],
  ['aac', 'audio/aac'],
  ['wav', 'audio/wav'],
  ['wma', 'audio/x-ms-wma'],
  ['m4a', 'audio/mp4'],
  ['ogg', 'audio/ogg'],
  ['flac', 'audio/flac'],
];
describe('Audio-only descriptions', () => {
  it.each(formats)('accepts a real %s audio file', async (ext, mime) => {
    const bytes = await readFile(`tests/fixtures/audio/silence.${ext}`);
    expect(allowedMediaType('audiodescricao', mime)).toBe(true);
    expect(await audioOnly(mime, bytes.length, async (at, n) => bytes.subarray(at, at + n))).toBe(
      true,
    );
  });
  it('reproduces a M4A file named MP3 and preserves its bytes while correcting MIME', async () => {
    const bytes = await readFile('tests/fixtures/audio/silence.m4a');
    expect(
      await audioOnly('audio/mpeg', bytes.length, async (at, n) => bytes.subarray(at, at + n)),
    ).toBe(false);
    const original = new File([bytes], 'WhatsApp Audio.mp3', { type: 'audio/mpeg' });
    const prepared = await prepareUploadFile(original, 'audiodescricao');
    expect(prepared.type).toBe('audio/mp4');
    expect(Buffer.from(await prepared.arrayBuffer())).toEqual(bytes);
    expect(
      await audioOnly(prepared.type, bytes.length, async (at, n) => bytes.subarray(at, at + n)),
    ).toBe(true);
  });
  it.each([
    ['silence.m4a', true],
    ['video.mp4', false],
  ])('inspects MP4 selected with video MIME: %s', async (name, accepted) => {
    const bytes = await readFile('tests/fixtures/audio/' + name);
    const prepared = await prepareUploadFile(
      new File([bytes], 'audio.mp4', { type: 'video/mp4' }),
      'audiodescricao',
    );
    expect(prepared.type).toBe('audio/mp4');
    expect(
      await audioOnly(prepared.type, bytes.length, async (at, n) => bytes.subarray(at, at + n)),
    ).toBe(accepted);
  });
  it.each([
    ['mp4', 'audio/mp4'],
    ['wmv', 'audio/x-ms-wma'],
  ])('rejects real %s video declared as audio', async (ext, mime) => {
    const bytes = await readFile(`tests/fixtures/audio/video.${ext}`);
    expect(await audioOnly(mime, bytes.length, async (at, n) => bytes.subarray(at, at + n))).toBe(
      false,
    );
  });
  it('rejects video MIME and new WebVTT uploads, normalizes browser audio MIME aliases', () => {
    for (const mime of ['video/mp4', 'video/webm', 'text/html'])
      expect(allowedMediaType('audiodescricao', mime)).toBe(false);
    expect(allowedMediaType('caption', 'text/vtt')).toBe(false);
    expect(normalizedMime('audio/x-wav', 'test.wav')).toBe('audio/wav');
    expect(normalizedMime('', 'test.AAC')).toBe('audio/aac');
    expect(normalizedMime('application/octet-stream', 'test.wma')).toBe('audio/x-ms-wma');
    expect(normalizedMime('video/mp4', 'fake.m4a')).toBe('video/mp4');
    const media = contentSchema.parse({
      blocks: [],
      textEnabled: true,
      media: [
        { id: crypto.randomUUID(), kind: 'audiodescricao', url: 'https://example.test/old.mp4' },
      ],
    }).media[0];
    expect(isAudioMedia(media)).toBe(false);
    expect(isAudioMedia({ ...media, url: 'https://example.test/new.mp3' })).toBe(true);
  });
  it.each(formats)('rejects forged %s and truncated container bytes', async (_ext, mime) => {
    const bytes = new TextEncoder().encode('<html>not audio</html>');
    expect(audioSignature(mime, bytes)).toBe(false);
    expect(await audioOnly(mime, bytes.length, async (at, n) => bytes.subarray(at, at + n))).toBe(
      false,
    );
  });
  it('rejects a video stream in an Ogg audio declaration', async () => {
    const bytes = await readFile('tests/fixtures/audio/silence.ogg');
    const at = bytes.indexOf('OpusHead');
    bytes.set(new TextEncoder().encode('\x80theora\x00'), at);
    expect(
      await audioOnly('audio/ogg', bytes.length, async (at, n) => bytes.subarray(at, at + n)),
    ).toBe(false);
  });
});
