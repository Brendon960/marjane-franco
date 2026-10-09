import { Button } from '../components/ui/Button';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function NotFoundPage() {
  useDocumentMeta('Página não encontrada | Dra. Marjane Franco');

  return (
    <section className="grid min-h-[70dvh] place-items-center pt-28 pb-20 text-center">
      <div className="container-page">
        <p className="font-serif text-8xl text-rose/60 italic">404</p>
        <h1 className="mt-4 text-4xl">Página não encontrada</h1>
        <p className="mt-3 text-muted">O endereço pode ter mudado. Que tal voltar para o início?</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button to="/">Ir para o início</Button>
          <Button to="/agendar" variant="outline">
            Agendar horário
          </Button>
        </div>
      </div>
    </section>
  );
}
