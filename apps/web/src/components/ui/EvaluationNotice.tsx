import { cn } from '../../lib/format';
import { Icon } from './Icon';

/** Aviso padrão para procedimentos que dependem de avaliação de profissional habilitado. */
export function EvaluationNotice({ className }: { className?: string }) {
  return (
    <p className={cn('flex gap-2.5 rounded-2xl bg-sand/70 p-4 text-sm leading-relaxed text-muted', className)}>
      <Icon name="info" size={18} className="mt-0.5 shrink-0 text-gold" />
      <span>
        Procedimento realizado mediante avaliação prévia. A indicação, o número de sessões e a resposta ao
        tratamento variam de pessoa para pessoa — não há garantia de resultados.
      </span>
    </p>
  );
}
