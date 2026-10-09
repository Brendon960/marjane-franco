import {
  formatDateBR,
  formatDuration,
  formatPhoneBR,
  maskPhoneInput,
  toBusinessDate,
  type AdminAppointmentDTO,
  type AdminProcedureDTO,
  type SlotCheckDTO,
} from '@mf/shared';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useAsync } from '../../hooks/useAsync';
import { formatLongDate } from '../../lib/format';
import { ApiError } from '../../services/api';
import { clientWhatsappUrl } from '../AdminLayout';
import { adminApi } from '../api';
import { Dialog, Input, Notice, Select, StatusBadge, Textarea, useToast } from '../ui';
import { CancellationEmailPanel, ConfirmationEmailPanel, notifyEmail, useConfirmAppointment } from './AppointmentConfirmation';
import { SlotPicker } from './SlotPicker';

const firstName = (name: string) => name.split(' ')[0];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/70 py-2.5 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detalhes + ações
// ---------------------------------------------------------------------------

interface AppointmentDialogProps {
  appointment: AdminAppointmentDTO | null;
  onClose: () => void;
  /** Chamado após qualquer alteração, para recarregar a lista/agenda */
  onChanged: (updated: AdminAppointmentDTO) => void;
}

export function AppointmentDialog({ appointment, onClose, onChanged }: AppointmentDialogProps) {
  const toast = useToast();
  const { confirmAppointment, busyId } = useConfirmAppointment();
  const [mode, setMode] = useState<'view' | 'reschedule' | 'cancel'>('view');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [check, setCheck] = useState<SlotCheckDTO | null>(null);

  const a = appointment;
  const close = () => {
    setMode('view');
    setError(null);
    setReason('');
    onClose();
  };

  const run = async (action: () => Promise<AdminAppointmentDTO>, success: string) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await action();
      toast(success);
      onChanged(updated);
      setMode('view');
      setReason('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!a) return null;

  const active = a.status === 'PENDING' || a.status === 'CONFIRMED';
  const started = new Date(`${a.date}T${a.time}:00-03:00`).getTime() <= Date.now();
  const future = new Date(`${a.date}T${a.endTime}:00-03:00`).getTime() > Date.now();

  if (mode === 'cancel') {
    return (
      <Dialog
        open
        onClose={close}
        title="Cancelar agendamento"
        footer={
          <>
            <Button variant="outline" onClick={() => setMode('view')} disabled={busy}>
              Cancelar
            </Button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const updated = await adminApi.cancel(a.id, reason.trim() || undefined);
                  const email = updated.cancellationEmail;
                  if (email?.status === 'SENT') toast(`Agendamento cancelado. Aviso enviado para ${email.to}.`);
                  else if (email?.status === 'SKIPPED') toast('Agendamento cancelado. Cliente sem e-mail — notificação não enviada.', 'warning');
                  else toast('Agendamento cancelado, mas não foi possível enviar o aviso por e-mail.', 'warning');
                  onChanged(updated);
                  setMode('view');
                  setReason('');
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              className="inline-flex h-11 items-center justify-center rounded-full bg-red-700 px-5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            >
              {busy ? 'Cancelando…' : 'Confirmar cancelamento'}
            </button>
          </>
        }
      >
        <p className="text-ink/85">Tem certeza que deseja cancelar este agendamento?</p>
        <p className="mt-2 text-sm text-muted">
          {a.client.name} · {a.procedure.name} · {formatDateBR(a.date)} às {a.time}
        </p>
        <p className="mt-1 text-xs text-muted">O registro continua no histórico com status “Cancelado” e o horário volta a ficar livre.</p>
        <p className="mt-3 text-sm">
          {notifyEmail(a) ? (
            <>
              A cliente será avisada por e-mail em <strong>{notifyEmail(a)}</strong>.
            </>
          ) : (
            <span className="text-amber-800">Cliente sem e-mail cadastrado — o cancelamento acontece, mas sem aviso por e-mail.</span>
          )}
        </p>
        <Textarea label="Motivo (opcional — aparece no e-mail)" className="mt-4" rows={2} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && <div className="mt-3"><Notice tone="danger">{error}</Notice></div>}
      </Dialog>
    );
  }

  if (mode === 'reschedule') {
    return (
      <Dialog
        open
        onClose={close}
        size="lg"
        title="Alterar horário"
        footer={
          <>
            <Button variant="outline" onClick={() => setMode('view')} disabled={busy}>
              Voltar
            </Button>
            <Button
              disabled={busy || !check?.ok}
              onClick={() => run(() => adminApi.reschedule(a.id, date, time), 'Horário alterado.')}
              icon="check"
            >
              {busy ? 'Salvando…' : 'Salvar novo horário'}
            </Button>
          </>
        }
      >
        <dl className="mb-5 rounded-2xl border border-line bg-white px-4">
          <Row label="Cliente">{a.client.name}</Row>
          <Row label="Procedimento">{a.procedure.name} · {formatDuration(a.durationMinutes)}</Row>
          <Row label="Data atual">{formatDateBR(a.date)}</Row>
          <Row label="Horário atual">{a.time}</Row>
        </dl>
        <SlotPicker
          procedureId={a.procedure.id}
          date={date}
          time={time}
          excludeId={a.id}
          onDateChange={(d) => {
            setDate(d);
            setTime('');
          }}
          onTimeChange={setTime}
          onCheck={setCheck}
        />
        {error && <div className="mt-4"><Notice tone="danger">{error}</Notice></div>}
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={close} title={a.client.name} size="lg">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={a.status} />
        <span className="font-mono text-xs tracking-wider text-muted">Código {a.code}</span>
        {a.source === 'admin' && <span className="text-xs text-muted">· lançado pelo painel</span>}
      </div>

      <dl className="mt-4 rounded-2xl border border-line bg-white px-4">
        <Row label="Procedimento">{a.procedure.name}</Row>
        <Row label="Data">{formatLongDate(a.date)}</Row>
        <Row label="Horário">{a.time} – {a.endTime} ({formatDuration(a.durationMinutes)})</Row>
        <Row label="WhatsApp">{formatPhoneBR(a.client.phone)}</Row>
        {notifyEmail(a) && <Row label="E-mail do agendamento">{notifyEmail(a)}</Row>}
        {a.status === 'PENDING' && a.expiresAt && (
          <Row label="Pré-reserva até">{new Date(a.expiresAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</Row>
        )}
        {a.confirmedAt && (
          <Row label="Confirmado">
            {new Date(a.confirmedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            {a.confirmedBy ? ` · ${a.confirmedBy}` : ''}
          </Row>
        )}
        {a.status === 'CANCELLED' && (
          <Row label="Cancelado">
            {a.cancelledBy === 'client' ? 'pela cliente (link)' : 'pela clínica'}
            {a.cancelReason ? ` — ${a.cancelReason}` : ''}
          </Row>
        )}
      </dl>

      {((a.contactName && a.contactName !== a.client.name) || (a.contactEmail && a.client.email && a.contactEmail !== a.client.email)) && (
        <div className="mt-4">
          <Notice tone="warning">
            <p className="font-semibold">Dados deste agendamento diferentes do cadastro da cliente</p>
            <p className="mt-1 text-xs">
              Informado no agendamento: {a.contactName ?? a.client.name}
              {a.contactEmail ? ` · ${a.contactEmail}` : ''} — cadastro: {a.client.name}
              {a.client.email ? ` · ${a.client.email}` : ''}. Confira com a cliente pelo WhatsApp.
            </p>
          </Notice>
        </div>
      )}

      {a.notes && (
        <div className="mt-4 rounded-2xl bg-sand/60 px-4 py-3 text-sm">
          <p className="text-xs font-semibold text-muted uppercase">Observações da cliente</p>
          <p className="mt-1 whitespace-pre-line">{a.notes}</p>
        </div>
      )}

      <ConfirmationEmailPanel a={a} onChanged={onChanged} />
      <CancellationEmailPanel a={a} onChanged={onChanged} />

      {error && <div className="mt-4"><Notice tone="danger">{error}</Notice></div>}

      <div className="mt-6 flex flex-wrap gap-2">
        {(a.status === 'PENDING' || (a.status === 'EXPIRED' && future)) && (
          <Button
            icon="check"
            disabled={busy || busyId === a.id}
            onClick={async () => {
              const updated = await confirmAppointment(a);
              if (updated) onChanged(updated);
            }}
          >
            {busyId === a.id ? 'Confirmando…' : 'Confirmar agendamento'}
          </Button>
        )}
        {active && (
          <Button
            variant="outline"
            icon="calendar"
            disabled={busy}
            onClick={() => {
              setDate(a.date);
              setTime('');
              setMode('reschedule');
            }}
          >
            Alterar horário
          </Button>
        )}
        {active && started && (
          <>
            <Button variant="outline" disabled={busy} onClick={() => run(() => adminApi.setStatus(a.id, 'COMPLETED'), 'Marcado como realizado.')}>
              Realizado
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => run(() => adminApi.setStatus(a.id, 'NO_SHOW'), 'Falta registrada.')}>
              Não compareceu
            </Button>
          </>
        )}
        <Button
          href={clientWhatsappUrl(a.client.phone, `Olá, ${firstName(a.client.name)}! Aqui é da clínica da Dra. Marjane Franco.`)}
          variant="whatsapp"
          icon="whatsapp"
        >
          Conversar no WhatsApp
        </Button>
        {active && (
          <Button variant="ghost" className="text-red-700 hover:bg-red-50" disabled={busy} onClick={() => setMode('cancel')}>
            Cancelar agendamento
          </Button>
        )}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <Link to={`/admin/clientes/${a.client.id}`} onClick={close} className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-deep hover:underline">
          <Icon name="user" size={16} /> Ver ficha da cliente
        </Link>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Novo agendamento (lançado pela profissional)
// ---------------------------------------------------------------------------

interface NewAppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (created: AdminAppointmentDTO) => void;
  initialDate?: string;
  initialTime?: string;
}

export function NewAppointmentDialog({ open, onClose, onCreated, initialDate, initialTime }: NewAppointmentDialogProps) {
  const toast = useToast();
  const procedures = useAsync<AdminProcedureDTO[]>((signal) => (open ? adminApi.procedures(signal) : Promise.resolve([])), [open]);
  const [form, setForm] = useState({ name: '', phone: '', email: '', procedureId: '', notes: '', status: 'CONFIRMED' as 'CONFIRMED' | 'PENDING' });
  const [date, setDate] = useState(initialDate ?? toBusinessDate(new Date()));
  const [time, setTime] = useState(initialTime ?? '');
  const [check, setCheck] = useState<SlotCheckDTO | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reabre com a data/horário clicados na agenda
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setDate(initialDate ?? toBusinessDate(new Date()));
      setTime(initialTime ?? '');
      setErrors({});
      setError(null);
    }
  }

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      const created = await adminApi.createAppointment({ ...form, email: form.email || undefined, notes: form.notes || undefined, date, time });
      toast('Agendamento criado.');
      setForm({ name: '', phone: '', email: '', procedureId: '', notes: '', status: 'CONFIRMED' });
      onCreated(created);
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const activeProcedures = (procedures.data ?? []).filter((p) => p.active);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Novo agendamento"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form="new-appointment" icon="check" disabled={busy || !check?.ok || !form.procedureId}>
            {busy ? 'Salvando…' : 'Salvar agendamento'}
          </Button>
        </>
      }
    >
      <form id="new-appointment" onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nome da cliente" value={form.name} onChange={(e) => set('name')(e.target.value)} error={errors.name} required autoComplete="off" />
          <Input
            label="WhatsApp"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => set('phone')(maskPhoneInput(e.target.value))}
            error={errors.phone}
            placeholder="(31) 99999-9999"
            hint="Se já for cliente, o cadastro é atualizado."
            required
          />
          <Input label="E-mail (opcional)" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} error={errors.email} />
          <Select label="Procedimento" value={form.procedureId} onChange={(e) => set('procedureId')(e.target.value)} error={errors.procedureId} required>
            <option value="">Selecione…</option>
            {activeProcedures.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({formatDuration(p.durationMinutes)})
              </option>
            ))}
          </Select>
        </div>

        {form.procedureId ? (
          <SlotPicker
            procedureId={form.procedureId}
            date={date}
            time={time}
            onDateChange={(d) => {
              setDate(d);
              setTime('');
            }}
            onTimeChange={setTime}
            onCheck={setCheck}
          />
        ) : (
          <Notice>Escolha o procedimento para ver os horários livres.</Notice>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Situação" value={form.status} onChange={(e) => set('status')(e.target.value)}>
            <option value="CONFIRMED">Confirmado</option>
            <option value="PENDING">Aguardando confirmação</option>
          </Select>
          <Textarea label="Observações (opcional)" rows={1} maxLength={500} value={form.notes} onChange={(e) => set('notes')(e.target.value)} error={errors.notes} />
        </div>
        {error && <Notice tone="danger">{error}</Notice>}
      </form>
    </Dialog>
  );
}
