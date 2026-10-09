import type { BusinessSettingsDTO } from '@mf/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { useAsync } from '../../hooks/useAsync';
import { ApiError } from '../../services/api';
import { adminApi } from '../api';
import { useAuth } from '../auth';
import { Card, ErrorState, Input, Loading, Notice, PageHeader, Select, Textarea, useToast } from '../ui';

type SettingsForm = Omit<BusinessSettingsDTO, 'paymentMethods' | 'address'> & { paymentMethods: string; address: string };

function ClinicSettings() {
  const toast = useToast();
  const { data, loading, error, retry } = useAsync((signal) => adminApi.settings(signal), []);
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm({ ...data, paymentMethods: data.paymentMethods.join('\n'), address: data.address ?? '' });
  }, [data]);

  if (loading && !form) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={retry} />;
  if (!form) return null;

  const num = (key: keyof SettingsForm) => (e: { target: { value: string } }) => setForm({ ...form, [key]: Number(e.target.value || 0) });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await adminApi.saveSettings({
        ...form,
        paymentMethods: form.paymentMethods.split('\n').map((m) => m.trim()).filter(Boolean),
        address: form.address.trim() || null,
      });
      toast('Configurações salvas.');
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Agenda e informações da clínica">
      <form onSubmit={save} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Horários oferecidos a cada" value={form.slotIntervalMinutes} onChange={num('slotIntervalMinutes')} error={errors.slotIntervalMinutes}>
            {[10, 15, 20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m} minutos
              </option>
            ))}
          </Select>
          <Input
            label="Folga entre atendimentos (min)"
            type="number"
            min={0}
            max={120}
            value={form.bufferMinutes}
            onChange={num('bufferMinutes')}
            error={errors.bufferMinutes}
            hint="Tempo livre reservado entre um atendimento e outro."
          />
          <Input
            label="Antecedência mínima (horas)"
            type="number"
            min={0}
            max={168}
            value={Math.round(form.minNoticeMinutes / 60)}
            onChange={(e) => setForm({ ...form, minNoticeMinutes: Number(e.target.value || 0) * 60 })}
            error={errors.minNoticeMinutes}
            hint="Clientes não agendam pelo site com menos tempo que isso."
          />
          <Input
            label="Agenda aberta para os próximos (dias)"
            type="number"
            min={1}
            max={365}
            value={form.maxDaysAhead}
            onChange={num('maxDaysAhead')}
            error={errors.maxDaysAhead}
          />
          <Input
            label="Pré-reserva segura o horário por (horas)"
            type="number"
            min={1}
            max={72}
            value={form.pendingHoldHours}
            onChange={num('pendingHoldHours')}
            error={errors.pendingHoldHours}
            hint="Tempo para a cliente confirmar pelo WhatsApp."
          />
          <Input
            label="Cliente pode cancelar pelo link até (horas antes)"
            type="number"
            min={0}
            max={168}
            value={form.clientCancelNoticeHours}
            onChange={num('clientCancelNoticeHours')}
            error={errors.clientCancelNoticeHours}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Textarea
            label="Formas de pagamento (uma por linha)"
            rows={4}
            value={form.paymentMethods}
            onChange={(e) => setForm({ ...form, paymentMethods: e.target.value })}
            error={errors.paymentMethods}
            hint="Aparecem nas perguntas frequentes do site."
          />
          <Textarea label="Endereço" rows={4} maxLength={200} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} error={errors.address} />
        </div>
        <Button type="submit" icon="check" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar configurações'}
        </Button>
      </form>
    </Card>
  );
}

function AccountSettings() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setError(null);
    if (form.newPassword !== form.confirm) {
      setErrors({ confirm: 'As senhas não conferem.' });
      return;
    }
    setSaving(true);
    try {
      await adminApi.changePassword(form.currentPassword, form.newPassword);
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast('Senha alterada. Outras sessões abertas foram encerradas.');
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Minha conta">
      <p className="text-sm">
        <span className="font-semibold">{user?.name}</span> · <span className="text-muted">{user?.email}</span>
      </p>
      <form onSubmit={save} className="mt-4 space-y-4" noValidate>
        <Input
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          error={errors.currentPassword}
        />
        <Input
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          error={errors.newPassword}
          hint="Mínimo de 10 caracteres, com letras e números."
        />
        <Input
          label="Repita a nova senha"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          error={errors.confirm}
        />
        {error && !Object.keys(errors).length && <Notice tone="danger">{error}</Notice>}
        <Button type="submit" variant="outline" icon="lock" disabled={saving || !form.currentPassword || !form.newPassword}>
          {saving ? 'Salvando…' : 'Alterar senha'}
        </Button>
      </form>
    </Card>
  );
}

export default function SettingsPage() {
  useEffect(() => {
    document.title = 'Configurações | Painel';
  }, []);

  return (
    <>
      <PageHeader title="Configurações" description="Regras da agenda online, informações da clínica e sua conta." />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <ClinicSettings />
        <AccountSettings />
      </div>
    </>
  );
}
