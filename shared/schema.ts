import { z } from 'zod';
import { SPACES, MEDIA_KINDS } from './content';
export const slugSchema = z.enum(SPACES.map((s) => s[0]) as [string, ...string[]]);
const safeUrl = z
  .string()
  .max(2048)
  .refine((s) => !s || /^https:\/\//.test(s), 'Use endereço HTTPS');
export const blockSchema = z.object({
  type: z.enum(['paragraph', 'heading', 'list', 'link']),
  text: z.string().max(10000),
  bold: z.boolean().default(false),
  url: safeUrl.default(''),
});
export const mediaSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(MEDIA_KINDS),
  mime: z.string().max(100).default(''),
  url: safeUrl.default(''),
  path: z.string().max(256).default(''),
  alt: z.string().max(1000).default(''),
  credit: z.string().max(1000).default(''),
  illustration: z.boolean().default(true),
  rights: z.boolean().default(false),
  transcript: z.string().max(30000).default(''),
  caption: safeUrl.or(z.string().uuid()).default(''),
  poster: safeUrl.or(z.string().uuid()).default(''),
  enabled: z.boolean().default(true),
});
export const contentSchema = z.object({
  blocks: z.array(blockSchema).max(100),
  textEnabled: z.boolean(),
  media: z.array(mediaSchema).max(40),
});
