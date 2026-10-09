import { whatsappUrl } from '../../lib/whatsapp';
import { Icon } from '../ui/Icon';

/** Botão flutuante sempre visível — atalho direto para a conversa. */
export function WhatsAppFloat() {
  return (
    <a
      href={whatsappUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Conversar no WhatsApp"
      className="group fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex items-center gap-2 rounded-full bg-whatsapp p-3.5 text-white shadow-lift transition hover:scale-105 sm:right-6 sm:bottom-6"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-whatsapp/40 [animation-duration:2.5s]" />
      <Icon name="whatsapp" size={28} />
      <span className="hidden max-w-0 overflow-hidden pr-0 text-sm font-semibold whitespace-nowrap transition-all duration-500 group-hover:max-w-40 group-hover:pr-2 sm:block">
        Fale conosco
      </span>
    </a>
  );
}
