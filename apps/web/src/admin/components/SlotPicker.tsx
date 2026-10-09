import { toBusinessDate, type SlotCheckDTO } from '@mf/shared';
import { useEffect, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { cn, formatLongDate } from '../../lib/format';
import { adminApi } from '../api';
import { Input, Notice } from '../ui';

interface SlotPickerProps {
  procedureId: string;
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  /** Remarcação: ignora o próprio agendamento */
  excludeId?: string;
  onCheck: (check: SlotCheckDTO | null) => void;
}

/**
 * Escolha de data e horário no painel: sugere os horários livres do expediente e
 * permite digitar outro horário (encaixe). Antes de salvar, o horário é conferido
 * na API — conflito com outro agendamento bloqueia; fora do expediente só avisa.
 */
export function SlotPicker({ procedureId, date, time, onDateChange, onTimeChange, excludeId, onCheck }: SlotPickerProps) {
  const today = toBusinessDate(new Date());
  const suggestions = useAsync(
    (signal) => (procedureId && date ? adminApi.suggestSlots({ procedureId, date, excludeId }, signal) : Promise.resolve(null)),
    [procedureId, date, excludeId],
  );
  const [check, setCheck] = useState<SlotCheckDTO | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setCheck(null);
    onCheck(null);
    if (!procedureId || !date || !/^\d{2}:\d{2}$/.test(time)) return;
    const controller = new AbortController();
    setChecking(true);
    adminApi
      .checkSlot({ procedureId, date, time, excludeId }, controller.signal)
      .then((result) => {
        setCheck(result);
        onCheck(result);
      })
      .catch(() => undefined)
      .finally(() => !controller.signal.aborted && setChecking(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedureId, date, time, excludeId]);

  const slots = suggestions.data?.slots ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Data" type="date" min={today} value={date} onChange={(e) => onDateChange(e.target.value)} required />
        <Input
          label="Horário"
          type="time"
          step={300}
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          hint="Escolha abaixo ou digite um horário (encaixe)."
          required
        />
      </div>

      {date && (
        <div>
          <p className="mb-2 text-sm font-medium">
            Horários livres em <span className="text-rose-deep">{formatLongDate(date)}</span>
          </p>
          {suggestions.loading ? (
            <p className="text-sm text-muted">Buscando horários…</p>
          ) : slots.length ? (
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onTimeChange(slot)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
                    slot === time ? 'border-rose-deep bg-rose-deep text-white' : 'border-line bg-white hover:border-rose',
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nenhum horário livre no expediente deste dia. Você ainda pode digitar um horário de encaixe.</p>
          )}
        </div>
      )}

      {checking && <p className="text-sm text-muted">Conferindo disponibilidade…</p>}
      {check && !checking && (
        <div className="space-y-2">
          {check.conflict && <Notice tone="danger">Este horário se sobrepõe a outro agendamento. Escolha outro horário.</Notice>}
          {check.past && <Notice tone="danger">Este horário já passou.</Notice>}
          {check.ok && check.outsideHours && <Notice tone="warning">Fora do horário de atendimento — será registrado como encaixe.</Notice>}
          {check.ok && check.blocked && <Notice tone="warning">Este horário está dentro de um bloqueio da agenda.</Notice>}
          {check.ok && !check.outsideHours && !check.blocked && <Notice tone="success">Horário disponível.</Notice>}
        </div>
      )}
    </div>
  );
}
