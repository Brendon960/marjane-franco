import type { ReactNode } from 'react';
import { cn } from '../../lib/format';

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
  id?: string;
}

export function SectionHeading({ eyebrow, title, description, align = 'center', id }: SectionHeadingProps) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-4xl leading-tight font-medium sm:text-5xl">
        {title}
      </h2>
      {description && <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{description}</p>}
    </div>
  );
}
