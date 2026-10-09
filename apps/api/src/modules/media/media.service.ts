import { IMAGE_UPLOAD_RULES as RULES } from '@mf/shared';
import sharp, { type Metadata } from 'sharp';
import { AppError } from '../../lib/errors';
import { prisma, type Db } from '../../lib/prisma';

const invalid = (message: string) => new AppError(400, 'INVALID_IMAGE', message);

/** B5: no máximo 2 imagens sendo processadas ao mesmo tempo (memória/CPU previsíveis). */
const MAX_CONCURRENT = 2;
let running = 0;
const waiting: (() => void)[] = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

/** URL pública de uma foto enviada pelo painel. */
export const mediaUrl = (id: string) => `/api/media/${id}`;
const MEDIA_URL_RE = /^\/api\/media\/([0-9a-f-]{36})$/;
export const mediaIdFromUrl = (url: string | null) => url?.match(MEDIA_URL_RE)?.[1] ?? null;

export const mediaService = {
  /**
   * Valida e normaliza uma foto enviada.
   * O tipo é conferido abrindo a imagem de verdade (não pela extensão/cabeçalho enviados).
   * Saída: WEBP 1200x900 (4:3), sem metadados — remove inclusive a localização GPS de fotos de celular.
   */
  process(buffer: Buffer) {
    return withSlot(() => this.processNow(buffer));
  },

  async processNow(buffer: Buffer) {
    let meta: Metadata;
    try {
      meta = await sharp(buffer, { limitInputPixels: 50_000_000 }).metadata();
    } catch {
      throw invalid('Arquivo não reconhecido como imagem. Envie JPG, PNG ou WEBP.');
    }
    if (!meta.format || !['jpeg', 'png', 'webp'].includes(meta.format)) {
      throw invalid('Formato não aceito. Envie JPG, PNG ou WEBP.');
    }
    // Considera a rotação do celular (EXIF) ao medir largura e altura
    const rotated = (meta.orientation ?? 1) >= 5;
    const width = (rotated ? meta.height : meta.width) ?? 0;
    const height = (rotated ? meta.width : meta.height) ?? 0;
    if (width < RULES.minWidth || height < RULES.minHeight) {
      throw invalid(`A foto precisa ter pelo menos ${RULES.minWidth}×${RULES.minHeight} pixels (esta tem ${width}×${height}).`);
    }

    const data = await sharp(buffer, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(RULES.outputWidth, RULES.outputHeight, { fit: 'cover', position: 'attention' })
      .webp({ quality: 80 })
      // B5: imagem malformada/maliciosa não prende o servidor
      .timeout({ seconds: 20 })
      .toBuffer()
      .catch(() => {
        throw invalid('Não foi possível processar esta imagem. Tente outro arquivo.');
      });
    return { data, mime: 'image/webp', width: RULES.outputWidth, height: RULES.outputHeight };
  },

  create(image: { data: Buffer; mime: string; width: number; height: number }, createdById: string, db: Db = prisma) {
    return db.media.create({
      data: { ...image, data: new Uint8Array(image.data), bytes: image.data.length, createdById },
      select: { id: true },
    });
  },

  get(id: string) {
    return prisma.media.findUnique({ where: { id }, select: { data: true, mime: true } });
  },

  /** Remove a foto anterior (se tiver sido enviada pelo painel). */
  async deleteByUrl(url: string | null, db: Db = prisma) {
    const id = mediaIdFromUrl(url);
    if (id) await db.media.deleteMany({ where: { id } });
  },
};
