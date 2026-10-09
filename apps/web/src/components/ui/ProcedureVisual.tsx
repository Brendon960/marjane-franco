import type { ProcedureCategory } from '@mf/shared';
import { useState } from 'react';
import { cn } from '../../lib/format';
import { assetUrl } from '../../services/api';
import { Icon, type IconName } from './Icon';

const looks: Record<ProcedureCategory, { icon: IconName; gradient: string }> = {
  PELE: { icon: 'drop', gradient: 'from-nude via-sand to-cream' },
  HARMONIZACAO: { icon: 'sparkles', gradient: 'from-rose/45 via-nude to-sand' },
  CORPORAL: { icon: 'leaf', gradient: 'from-gold/35 via-sand to-cream' },
  AVALIACAO: { icon: 'user', gradient: 'from-sand via-cream to-nude' },
};

interface ProcedureVisualProps {
  slug: string;
  category: ProcedureCategory;
  imageUrl: string | null;
  alt: string;
  className?: string;
}

/**
 * Foto do procedimento: a enviada pelo painel (`image_url`) ou, se não houver, o arquivo
 * `public/images/procedimentos/<slug>.jpg`. Sem foto, mostra uma composição
 * na paleta da marca. Fotos são carregadas sob demanda (lazy).
 */
export function ProcedureVisual({ slug, category, imageUrl, alt, className }: ProcedureVisualProps) {
  const look = looks[category];
  const src = imageUrl ? assetUrl(imageUrl) : `/images/procedimentos/${slug}.jpg`;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc !== src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrc(src)}
        className={cn('object-cover', className)}
      />
    );
  }
  return (
    <div className={cn('relative overflow-hidden bg-linear-to-br', look.gradient, className)} role="img" aria-label={alt}>
      <div className="absolute -top-10 -right-10 size-40 rounded-full border border-white/60" />
      <div className="absolute -bottom-14 -left-8 size-44 rounded-full bg-white/30" />
      <div className="absolute inset-0 grid place-items-center">
        <span className="grid size-16 place-items-center rounded-full bg-white/70 text-rose-deep shadow-soft backdrop-blur">
          <Icon name={look.icon} size={28} />
        </span>
      </div>
    </div>
  );
}
