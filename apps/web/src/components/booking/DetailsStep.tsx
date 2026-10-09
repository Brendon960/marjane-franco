import { clientDetailsSchema, fieldErrors, maskPhoneInput } from '@mf/shared';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '../../lib/format';
import { Button } from '../ui/Button';

export interface DetailsForm {
  name: string;
  phone: string;
  email: string;
  notes: string;
  consent: boolean;
  website: string;
}

export const EMPTY_DETAILS: DetailsForm = { name: '', phone: '', email: '', notes: '', consent: false, website: '' };

interface DetailsStepProps {
  initial: DetailsForm;
  /** Erros devolvidos pela API (validação do servidor). */
  serverErrors: Record<string, string>;
  onSubmit: (details: DetailsForm) => void;
}

function Field({ id, label, optional, error, children }: { id: string; label: string; optional?: boolean; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label} {optional && <span className="font-normal text-muted">(opcional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-rose-darker">
          {error}
        </p>
      )}
    </div>
  );
}

export function DetailsStep({ initial, serverErrors, onSubmit }: DetailsStepProps) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>(serverErrors);

  const set = <K extends keyof DetailsForm>(key: K, value: DetailsForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _removed, ...rest }) => rest);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // Mesmo schema usado pela API: o que passa aqui passa lá.
    const result = clientDetailsSchema.safeParse(form);
    if (!result.success) {
      const fields = fieldErrors(result.error);
      setErrors(fields);
      document.getElementById(`f-${Object.keys(fields)[0]}`)?.focus();
      return;
    }
    onSubmit(form);
  };

  const aria = (key: string) => ({
    id: `f-${key}`,
    'aria-invalid': Boolean(errors[key]) || undefined,
    'aria-describedby': errors[key] ? `f-${key}-error` : undefined,
  });

  return (
    <form onSubmit={submit} noValidate>
      <h2 className="font-serif text-3xl">Seus dados</h2>
      <p className="mt-2 text-muted">Usamos essas informações apenas para confirmar e organizar seu atendimento.</p>

      <div className="mt-6 grid gap-5">
        <Field id="f-name" label="Nome completo" error={errors.name}>
          <input {...aria('name')} className={cn('field', errors.name && 'border-rose-deep')} autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={100} />
        </Field>

        <Field id="f-phone" label="WhatsApp" error={errors.phone}>
          <input
            {...aria('phone')}
            className={cn('field', errors.phone && 'border-rose-deep')}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="(31) 90000-0000"
            value={form.phone}
            onChange={(e) => set('phone', maskPhoneInput(e.target.value))}
          />
        </Field>

        <Field id="f-email" label="E-mail" error={errors.email}>
          <input {...aria('email')} className={cn('field', errors.email && 'border-rose-deep')} type="email" inputMode="email" autoComplete="email" required value={form.email} onChange={(e) => set('email', e.target.value)} maxLength={120} />
          {!errors.email && <p className="mt-1.5 text-xs text-muted">A confirmação do agendamento será enviada para este e-mail.</p>}
        </Field>

        <Field id="f-notes" label="Observações" optional error={errors.notes}>
          <textarea
            {...aria('notes')}
            className="field min-h-24 resize-y"
            placeholder="Ex.: é minha primeira vez, tenho alguma dúvida…"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            maxLength={500}
            aria-describedby="f-notes-lgpd"
          />
          <p id="f-notes-lgpd" className="mt-1.5 text-xs text-muted">
            Não informe dados médicos ou informações sensíveis neste campo.
          </p>
          <p className="mt-1 text-right text-xs text-muted">{form.notes.length}/500</p>
        </Field>

        {/* Honeypot: invisível para pessoas, preenchido por robôs. */}
        <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
          <label>
            Site
            <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} />
          </label>
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink/80">
            <input
              {...aria('consent')}
              type="checkbox"
              checked={form.consent}
              onChange={(e) => set('consent', e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-rose-deep"
            />
            <span>
              Concordo com o uso dos meus dados para agendamento e contato, conforme a{' '}
              <Link to="/privacidade" target="_blank" className="text-rose-deep underline">
                Política de Privacidade
              </Link>
              .
            </span>
          </label>
          {errors.consent && (
            <p id="f-consent-error" className="mt-1.5 text-sm text-rose-darker">
              {errors.consent}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" size="lg" iconRight="arrowRight" className="mt-8 w-full sm:w-auto">
        Revisar agendamento
      </Button>
    </form>
  );
}
