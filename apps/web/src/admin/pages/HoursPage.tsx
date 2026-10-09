import { formatDateBR, toBusinessDate, type BlockedTimeDTO, type BusinessHoursDTO } from '@mf/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useAsync } from '../../hooks/useAsync';
import { ApiError } from '../../services/api';
import { adminApi } from '../api';
import { Card, Empty, ErrorState, Input, Loading, Notice, PageHeader, Toggle, useConfirm, useToast } from '../ui';

const DAYS = [
  { day: 1, name: 'Segunda-feira' },
  { day: 2, name: 'Terça-feira' },
  { day: 3, name: 'Quarta-feira' },
  { day: 4, name: 'Quinta-feira' },
  { day: 5, name: 'Sexta-feira' },
  { day: 6, name: 'Sábado' },
  { day: 0, name: 'Domingo' },
];

type Days = BusinessHoursDTO['days'];

function WeeklyHours() {
  const toast = useToast();
  const { data, loading, error, retry } = useAsync((signal) => adminApi.businessHours(signal), []);
  const [days, setDays] = useState<Days | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) setDays(data.days);
  }, [data]);

  const update = (dayOfWeek: number, fn: (intervals: Days[number]['intervals']) => Days[number]['intervals']) => {
    setDirty(true);
    setDays((ds) => ds?.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, intervals: fn(d.intervals) } : d)) ?? null);
  };

  const save = async () => {
    if (!days) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await adminApi.saveBusinessHours({ days });
      setDays(saved.days);
      setDirty(false);
      toast('Horário de atendimento salvo. O site já mostra os novos horários.');
    } catch (err) {
      setSaveError(err instanceof ApiError && err.fields ? Object.values(err.fields).join(' ') : (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !days) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={retry} />;
  if (!days) return null;

  return (
    <Card
      title="Horário de atendimento"
      actions={
        <Button icon="check" onClick={save} disabled={saving || !dirty}>
          {saving ? 'Salvando…' : 'Salvar horários'}
        </Button>
      }
    >
      <p className="-mt-2 mb-4 text-sm text-muted">
        Para o almoço, use dois períodos no mesmo dia (ex.: 08:00–12:00 e 13:30–18:00). Agendamentos já marcados não são alterados.
      </p>
      <ul className="divide-y divide-line/70">
        {DAYS.map(({ day, name }) => {
          const intervals = days.find((d) => d.dayOfWeek === day)?.intervals ?? [];
          const open = intervals.length > 0;
          return (
            <li key={day} className="grid gap-3 py-4 sm:grid-cols-[11rem_1fr] sm:items-start">
              <div className="pt-1.5">
                <Toggle
                  checked={open}
                  onChange={(v) => update(day, () => (v ? [{ start: '08:00', end: '18:00' }] : []))}
                  label={name}
                  description={open ? 'Atende' : 'Sem atendimento'}
                />
              </div>
              {open && (
                <div className="space-y-2">
                  {intervals.map((interval, i) => (
                    <div key={i} className="grid grid-cols-[minmax(0,8rem)_auto_minmax(0,8rem)_2.5rem] items-center gap-2">
                      <input
                        type="time"
                        step={300}
                        value={interval.start}
                        aria-label={`${name}: início do período ${i + 1}`}
                        onChange={(e) => update(day, (list) => list.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                        className="field py-2"
                      />
                      <span className="text-sm text-muted">até</span>
                      <input
                        type="time"
                        step={300}
                        value={interval.end}
                        aria-label={`${name}: fim do período ${i + 1}`}
                        onChange={(e) => update(day, (list) => list.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                        className="field py-2"
                      />
                      {intervals.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => update(day, (list) => list.filter((_, j) => j !== i))}
                          className="rounded-full p-2 text-muted hover:bg-red-50 hover:text-red-700"
                          aria-label={`Remover período ${i + 1} de ${name}`}
                        >
                          <Icon name="trash" size={18} />
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  ))}
                  {intervals.length < 4 && (
                    <button
                      type="button"
                      onClick={() =>
                        update(day, (list) => [...list, { start: list.at(-1)?.end && list.at(-1)!.end < '22:00' ? list.at(-1)!.end : '13:00', end: '18:00' }])
                      }
                      className="inline-flex items-center gap-1 text-sm font-semibold text-rose-deep hover:underline"
                    >
                      <Icon name="plus" size={15} /> Adicionar período (ex.: depois do almoço)
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {saveError && <Notice tone="danger">{saveError}</Notice>}
    </Card>
  );
}

function describe(b: BlockedTimeDTO) {
  if (!b.allDay) return `${formatDateBR(b.startDate)} · ${b.startTime} – ${b.endTime}`;
  return b.startDate === b.endDate ? `${formatDateBR(b.startDate)} · dia inteiro` : `${formatDateBR(b.startDate)} a ${formatDateBR(b.endDate)} · dias inteiros`;
}

function Blocks() {
  const toast = useToast();
  const { confirm, confirmElement } = useConfirm();
  const today = toBusinessDate(new Date());
  const { data, loading, error, retry } = useAsync((signal) => adminApi.blockedTimes(signal), []);
  const [form, setForm] = useState({ startDate: today, endDate: '', allDay: false, startTime: '14:00', endTime: '17:00', reason: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setWarning(null);
    try {
      const result = await adminApi.createBlock({
        startDate: form.startDate,
        endDate: form.allDay && form.endDate ? form.endDate : null,
        allDay: form.allDay,
        startTime: form.allDay ? null : form.startTime,
        endTime: form.allDay ? null : form.endTime,
        reason: form.reason || null,
      });
      toast('Horário bloqueado. Ele não aparece mais para as clientes.');
      if (result.conflicts > 0) {
        setWarning(
          `Atenção: já ${result.conflicts === 1 ? 'existe 1 agendamento' : `existem ${result.conflicts} agendamentos`} nesse período. Eles não foram cancelados — remarque ou cancele pela Agenda.`,
        );
      }
      setForm((f) => ({ ...f, reason: '' }));
      retry();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      else toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (b: BlockedTimeDTO) => {
    const ok = await confirm({
      title: 'Remover bloqueio',
      message: `Liberar ${describe(b)}${b.reason ? ` (${b.reason})` : ''}? Os horários voltam a aparecer para as clientes.`,
      confirmLabel: 'Remover bloqueio',
      danger: true,
    });
    if (!ok) return;
    try {
      await adminApi.deleteBlock(b.id);
      toast('Bloqueio removido.');
      retry();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  return (
    <Card title="Bloqueios de agenda">
      <p className="-mt-2 mb-4 text-sm text-muted">Compromissos, folgas, férias e feriados. Horários bloqueados não aparecem para as clientes.</p>
      <form onSubmit={submit} className="space-y-4 rounded-2xl bg-sand/50 p-4" noValidate>
        <div className="grid gap-4">
          <Input label={form.allDay ? 'De' : 'Data'} type="date" min={today} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} error={errors.startDate} required />
          {form.allDay ? (
            <Input
              label="Até (opcional)"
              type="date"
              min={form.startDate}
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              error={errors.endDate}
              hint="Para bloquear vários dias seguidos (ex.: férias)."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Das" type="time" step={300} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} error={errors.startTime} />
              <Input label="Até" type="time" step={300} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} error={errors.endTime} />
            </div>
          )}
        </div>
        <Toggle checked={form.allDay} onChange={(v) => setForm({ ...form, allDay: v })} label="Dia inteiro" />
        <Input label="Motivo (opcional)" maxLength={120} placeholder="Ex.: Compromisso pessoal" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <Button type="submit" icon="lock" disabled={busy}>
          {busy ? 'Bloqueando…' : 'Bloquear horário'}
        </Button>
      </form>

      {warning && (
        <div className="mt-4">
          <Notice tone="warning">{warning}</Notice>
        </div>
      )}

      <h3 className="mt-6 mb-2 font-sans text-sm font-semibold text-muted">Próximos bloqueios</h3>
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : data && data.length === 0 ? (
        <Empty icon="lock">Nenhum bloqueio futuro.</Empty>
      ) : (
        <ul className="divide-y divide-line/70">
          {data?.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{describe(b)}</span>
                {b.reason && <span className="block truncate text-sm text-muted">{b.reason}</span>}
              </span>
              <button
                type="button"
                onClick={() => remove(b)}
                className="shrink-0 rounded-full p-2 text-muted hover:bg-red-50 hover:text-red-700"
                aria-label={`Remover bloqueio de ${describe(b)}`}
              >
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {confirmElement}
    </Card>
  );
}

export default function HoursPage() {
  useEffect(() => {
    document.title = 'Horários | Painel';
  }, []);

  return (
    <>
      <PageHeader title="Horários de Atendimento" description="Expediente semanal e bloqueios da agenda." />
      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr] xl:items-start">
        <WeeklyHours />
        <Blocks />
      </div>
    </>
  );
}
