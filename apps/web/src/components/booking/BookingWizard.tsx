import { formatDateBR, formatDuration, type BookingDTO, type ProcedureDTO } from '@mf/shared';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useBusinessInfo, useProcedures } from '../../hooks/useSiteData';
import { whatsappUrl } from '../../lib/whatsapp';
import { ApiError, api } from '../../services/api';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { CalendarStep } from './CalendarStep';
import { DetailsStep, EMPTY_DETAILS, type DetailsForm } from './DetailsStep';
import { ProcedureStep } from './ProcedureStep';
import { Stepper } from './Stepper';
import { SuccessStep } from './SuccessStep';
import { SummaryStep } from './SummaryStep';
import { TimeStep } from './TimeStep';

type Step = 1 | 2 | 3 | 4 | 5;

/** Agenda online pausada pelo responsável técnico: o site direciona para o WhatsApp. */
const BOOKING_DISABLED = 'BOOKING_DISABLED';

/**
 * Fluxo de agendamento: procedimento → data → horário → dados → confirmação → WhatsApp.
 * O procedimento escolhido fica na URL (?procedimento=slug), então os botões
 * "Agendar" dos cards já abrem o fluxo na etapa de data.
 */
export function BookingWizard() {
  const { procedures, loading, offline } = useProcedures();
  const info = useBusinessInfo();
  const [params, setParams] = useSearchParams();
  const slugFromUrl = params.get('procedimento');

  const [step, setStep] = useState<Step>(1);
  const [procedure, setProcedure] = useState<ProcedureDTO | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [details, setDetails] = useState<DetailsForm>(EMPTY_DETAILS);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [timeNotice, setTimeNotice] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<BookingDTO | null>(null);

  const topRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Pré-seleciona o procedimento vindo da URL.
  useEffect(() => {
    if (!slugFromUrl || procedure?.slug === slugFromUrl || procedures.length === 0) return;
    const found = procedures.find((p) => p.slug === slugFromUrl);
    if (found) {
      setProcedure(found);
      setStep(2);
    }
  }, [slugFromUrl, procedures, procedure?.slug]);

  // Leva a pessoa ao topo do fluxo a cada troca de etapa (importante no celular).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step, booking]);

  const chooseProcedure = (p: ProcedureDTO) => {
    setProcedure(p);
    setDate(null);
    setTime(null);
    setParams({ procedimento: p.slug }, { replace: true });
    setStep(2);
  };

  const chooseDate = (d: string) => {
    setDate(d);
    setTime(null);
    setTimeNotice(null);
    setStep(3);
  };

  const chooseTime = (t: string) => {
    setTime(t);
    setTimeNotice(null);
    setStep(4);
  };

  const submitDetails = (d: DetailsForm) => {
    setDetails(d);
    setServerErrors({});
    setSubmitError(null);
    setStep(5);
  };

  const confirm = async () => {
    if (!procedure || !date || !time) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // details já passou pela validação da etapa 4 (consentimento obrigatório)
      setBooking(await api.book({ procedureSlug: procedure.slug, date, time, ...details, consent: true }));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'SLOT_UNAVAILABLE') {
        setTime(null);
        setTimeNotice(`${error.message} Os horários abaixo já estão atualizados.`);
        setStep(3);
      } else if (error instanceof ApiError && error.code === 'VALIDATION_ERROR' && error.fields) {
        setServerErrors(error.fields);
        setStep(error.fields.date || error.fields.time ? 2 : 4);
      } else if (error instanceof ApiError && error.code === BOOKING_DISABLED) {
        setSubmitError(BOOKING_DISABLED);
      } else {
        setSubmitError((error as Error).message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (booking) {
    return (
      <div ref={topRef} className="scroll-mt-28">
        <SuccessStep booking={booking} holdHours={info?.pendingHoldHours ?? 12} />
      </div>
    );
  }

  if (offline || info?.onlineBookingEnabled === false || submitError === BOOKING_DISABLED) {
    return (
      <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-soft">
        <p className="font-serif text-2xl">A agenda online está temporariamente indisponível.</p>
        <p className="mt-2 text-muted">Agende agora mesmo pelo WhatsApp — respondemos o quanto antes.</p>
        <Button href={whatsappUrl()} variant="whatsapp" size="lg" icon="whatsapp" className="mt-6">
          Agendar pelo WhatsApp
        </Button>
      </div>
    );
  }

  return (
    <div ref={topRef} className="grid scroll-mt-28 gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="min-w-0">
        <Stepper current={step} onSelect={(s) => setStep(s as Step)} />

        <div key={step} className="mt-8 animate-fade-up">
          {step === 1 &&
            (loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-sand" />
                ))}
              </div>
            ) : (
              <ProcedureStep procedures={procedures} selected={procedure} onSelect={chooseProcedure} />
            ))}

          {step === 2 && procedure && (
            <CalendarStep procedureSlug={procedure.slug} selected={date} maxDaysAhead={info?.maxDaysAhead ?? 60} onSelect={chooseDate} />
          )}

          {step === 3 && procedure && date && (
            <TimeStep procedureSlug={procedure.slug} date={date} selected={time} notice={timeNotice} onSelect={chooseTime} onChangeDate={() => setStep(2)} />
          )}

          {step === 4 && <DetailsStep initial={details} serverErrors={serverErrors} onSubmit={submitDetails} />}

          {step === 5 && procedure && date && time && (
            <SummaryStep
              procedure={procedure}
              date={date}
              time={time}
              details={details}
              submitting={submitting}
              error={submitError}
              onConfirm={confirm}
              onEdit={(s) => setStep(s as Step)}
            />
          )}
        </div>

        {step > 1 && step < 5 && (
          <button type="button" onClick={() => setStep((s) => (s - 1) as Step)} className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-rose-deep">
            <Icon name="arrowLeft" size={16} /> Voltar
          </button>
        )}
      </div>

      <aside aria-label="Resumo da escolha" className="hidden rounded-3xl border border-line bg-white p-6 shadow-soft lg:sticky lg:top-28 lg:block">
        <p className="eyebrow">Seu agendamento</p>
        <dl className="mt-5 space-y-4 text-sm">
          <SummaryItem icon="sparkles" label="Procedimento" value={procedure?.name} extra={procedure && `~${formatDuration(procedure.durationMinutes)}`} />
          <SummaryItem icon="calendar" label="Data" value={date && formatDateBR(date)} />
          <SummaryItem icon="clock" label="Horário" value={time} />
        </dl>
        <div className="mt-6 border-t border-line pt-5 text-sm text-muted">
          Prefere conversar antes?{' '}
          <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="font-semibold text-rose-deep underline">
            Fale no WhatsApp
          </a>
        </div>
      </aside>
    </div>
  );
}

function SummaryItem({ icon, label, value, extra }: { icon: 'sparkles' | 'calendar' | 'clock'; label: string; value?: string | null; extra?: string | null }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sand text-rose-deep">
        <Icon name={icon} size={16} />
      </span>
      <div>
        <dt className="text-xs text-muted">{label}</dt>
        <dd className={value ? 'font-semibold text-ink' : 'text-muted/60'}>
          {value ?? 'A escolher'}
          {value && extra && <span className="ml-1 font-normal text-muted">· {extra}</span>}
        </dd>
      </div>
    </div>
  );
}
