import { formatDateBR, formatPhoneBR, maskPhoneInput, toBusinessDate, type AdminAppointmentDTO } from '@mf/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useAsync } from '../../hooks/useAsync';
import { ApiError } from '../../services/api';
import { clientWhatsappUrl } from '../AdminLayout';
import { adminApi } from '../api';
import { AppointmentDialog } from '../components/AppointmentDialogs';
import { Card, Dialog, Empty, ErrorState, Input, Loading, Notice, PageHeader, StatusBadge, useToast } from '../ui';

export default function ClientDetailPage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const { data, loading, error, retry } = useAsync((signal) => adminApi.client(id, signal), [id]);
  const [selected, setSelected] = useState<AdminAppointmentDTO | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) document.title = `${data.name} | Clientes`;
  }, [data]);

  const openEdit = () => {
    if (!data) return;
    setForm({ name: data.name, phone: formatPhoneBR(data.phone), email: data.email ?? '' });
    setErrors({});
    setFormError(null);
    setEditing(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      await adminApi.updateClient(id, form);
      toast('Cadastro atualizado.');
      setEditing(false);
      retry();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={retry} />;
  if (!data) return null;

  const done = data.history.filter((a) => a.status === 'COMPLETED').length;

  return (
    <>
      <Link to="/admin/clientes" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-rose-deep">
        <Icon name="arrowLeft" size={16} /> Clientes
      </Link>
      <PageHeader
        title={data.name}
        description={<>Cliente desde {formatDateBR(toBusinessDate(new Date(data.createdAt)))}</>}
        actions={
          <>
            <Button href={clientWhatsappUrl(data.phone)} variant="whatsapp" icon="whatsapp">
              WhatsApp
            </Button>
            <Button variant="outline" icon="edit" onClick={openEdit}>
              Editar
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <Card title="Dados">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted">WhatsApp</dt>
              <dd className="font-medium">{formatPhoneBR(data.phone)}</dd>
            </div>
            <div>
              <dt className="text-muted">E-mail</dt>
              <dd className="font-medium break-all">{data.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Próximo agendamento</dt>
              <dd className="font-medium">
                {data.nextAppointment ? `${formatDateBR(data.nextAppointment.date)} às ${data.nextAppointment.time} · ${data.nextAppointment.procedure}` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Último atendimento</dt>
              <dd className="font-medium">
                {data.lastAppointment ? `${formatDateBR(data.lastAppointment.date)} · ${data.lastAppointment.procedure}` : '—'}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-line pt-3">
              <div>
                <dt className="text-muted">Agendamentos</dt>
                <dd className="text-2xl font-semibold tabular-nums">{data.totalAppointments}</dd>
              </div>
              <div>
                <dt className="text-muted">Realizados</dt>
                <dd className="text-2xl font-semibold tabular-nums">{done}</dd>
              </div>
            </div>
          </dl>
        </Card>

        <Card title="Histórico">
          {data.history.length === 0 ? (
            <Empty icon="calendar">Sem agendamentos.</Empty>
          ) : (
            <ul className="divide-y divide-line/70">
              {data.history.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => setSelected(a)} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left hover:bg-sand/40">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold tabular-nums">
                        {formatDateBR(a.date)} · {a.time}
                      </span>
                      <span className="block truncate text-sm text-ink/75">{a.procedure.name}</span>
                    </span>
                    <StatusBadge status={a.status} short />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        title="Editar cadastro"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="client-form" disabled={saving} icon="check">
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </>
        }
      >
        <form id="client-form" onSubmit={save} className="space-y-4" noValidate>
          <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />
          <Input
            label="WhatsApp"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: maskPhoneInput(e.target.value) })}
            error={errors.phone}
            required
          />
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
          {formError && <Notice tone="danger">{formError}</Notice>}
        </form>
      </Dialog>

      <AppointmentDialog
        appointment={selected}
        onClose={() => setSelected(null)}
        onChanged={(updated) => {
          setSelected(updated);
          retry();
        }}
      />
    </>
  );
}
