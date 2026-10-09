import type { SystemSettingsDTO } from '@mf/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { useAsync } from '../../../hooks/useAsync';
import { ApiError } from '../../../services/api';
import { adminApi } from '../../api';
import { Card, ErrorState, Input, Loading, Notice, PageHeader, Toggle, useConfirm, useToast } from '../../ui';

export default function SystemSettingsPage() {
  const toast = useToast();
  const { confirm, confirmElement } = useConfirm();
  const { data, loading, error, retry } = useAsync((signal) => adminApi.system(signal), []);
  const [form, setForm] = useState<SystemSettingsDTO | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = 'Configurações do Sistema | Super Admin';
  }, []);
  useEffect(() => {
    if (data) setForm(data.settings);
  }, [data]);

  if (loading && !form) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={retry} />;
  if (!form || !data) return null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (data.settings.onlineBookingEnabled && !form.onlineBookingEnabled) {
      const ok = await confirm({
        title: 'Pausar agenda online',
        message: 'As clientes não conseguirão agendar pelo site até você reativar. O site passa a direcionar para o WhatsApp.',
        confirmLabel: 'Pausar agenda',
        danger: true,
      });
      if (!ok) return;
    }
    setSaving(true);
    setErrors({});
    try {
      await adminApi.saveSystemSettings(form);
      toast('Configurações do sistema salvas.');
      retry();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Configurações do Sistema" description="Opções técnicas — acesso exclusivo do Super Administrador." />
      <form onSubmit={save} className="max-w-2xl space-y-6" noValidate>
        <Card title="Agenda online">
          <Toggle
            checked={form.onlineBookingEnabled}
            onChange={(v) => setForm({ ...form, onlineBookingEnabled: v })}
            label="Aceitar agendamentos pelo site"
            description="Desligue em manutenções ou imprevistos. O painel continua funcionando normalmente."
          />
        </Card>
        <Card title="Sessões do painel">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Expira após inatividade (minutos)"
              type="number"
              min={15}
              max={1440}
              value={form.sessionIdleMinutes}
              onChange={(e) => setForm({ ...form, sessionIdleMinutes: Number(e.target.value || 0) })}
              error={errors.sessionIdleMinutes}
            />
            <Input
              label="Duração máxima (dias)"
              type="number"
              min={1}
              max={30}
              value={form.sessionMaxDays}
              onChange={(e) => setForm({ ...form, sessionMaxDays: Number(e.target.value || 0) })}
              error={errors.sessionMaxDays}
              hint="Depois disso, é preciso entrar de novo."
            />
          </div>
        </Card>
        <Notice>
          Senhas, chaves e a conexão do banco de dados <strong>não</strong> ficam no sistema nem aparecem aqui — são configuradas nas variáveis de
          ambiente do servidor.
        </Notice>
        <Button type="submit" icon="check" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </form>
      {confirmElement}
    </>
  );
}
