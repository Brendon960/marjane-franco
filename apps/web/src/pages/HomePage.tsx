import { About } from '../components/sections/About';
import { Contact } from '../components/sections/Contact';
import { Differentials } from '../components/sections/Differentials';
import { Faq } from '../components/sections/Faq';
import { Hero } from '../components/sections/Hero';
import { InstagramSection } from '../components/sections/InstagramSection';
import { MelasmaHighlight } from '../components/sections/MelasmaHighlight';
import { Procedures } from '../components/sections/Procedures';
import { Testimonials } from '../components/sections/Testimonials';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function HomePage() {
  useDocumentMeta(
    'Dra. Marjane Franco | Estética, Melasma, Botox, Limpeza de Pele e Depilação a Laser',
    'Especialista em melasma. Botox, limpeza de pele com peeling, depilação a laser, harmonização facial e tratamento de vasinhos (PEIM). Agende seu horário online.',
  );

  return (
    <>
      <Hero />
      <Procedures />
      <MelasmaHighlight />
      <About />
      <Differentials />
      <Testimonials />
      <InstagramSection />
      <Faq />
      <Contact />
    </>
  );
}
