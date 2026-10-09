import { CATEGORY_LABELS, formatDuration, type AdminProcedureDTO, type ProcedureCategory } from '@mf/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { ProcedureVisual } from '../../components/ui/ProcedureVisual';
import { useAsync } from '../../hooks/useAsync';
import { cn, formatPrice } from '../../lib/format';
import { ApiError } from '../../services/api';
import { adminApi } from '../api';
import { PhotoUploader } from '../components/PhotoUploader';
import { Badge, Dialog, Empty, ErrorState, Input, Loading, Notice, PageHeader, Select, Textarea, Toggle, useConfirm, useToast } from '../ui';

interface FormState {
  name: string;
  category: ProcedureCategory | '';
  shortDescription: string;
  description: string;
  highlights: string;
  durationMinutes: string;
  price: string;
  requiresEvaluation: boolean;
  featured: boolean;
  active: boolean;
  sortOrder: string;
}

const EMPTY: FormState = {
  name: '',
  category: '',
  shortDescription: '',
  description: '',
  highlights: '',
  durationMinutes: '60',
  price: '',
  requiresEvaluation: false,
  featured: false,
  active: true,
  sortOrder: '100',
};

function toForm(p: AdminProcedureDTO): FormState {
  return {
    name: p.name,
    category: p.category,
    shortDescription: p.shortDescription,
    description: p.description,
    highlights: p.highlights.join('\n'),
    durationMinutes: String(p.durationMinutes),
    price: p.price === null ? '' : String(p.price).replace('.', ','),
    requiresEvaluation: p.requiresEvaluation,
    featured: p.featured,
    active: p.active,
    sortOrder: String(p.sortOrder),
  };
}

function toPayload(f: FormState) {
  return {
    name: f.name,
    category: f.category,
    shortDescription: f.shortDescription,
    description: f.description,
    highlights: f.highlights.split('\n').map((h) => h.trim()).filter(Boolean),
    durationMinutes: f.durationMinutes,
    // vazio = "valor sob avaliação"; aceita "1.500,00", "350,50" e "350.50"
    price: f.price.trim() ? Number(f.price.includes(',') ? f.price.replace(/\./g, '').replace(',', '.') : f.price) : null,
    requiresEvaluation: f.requiresEvaluation,
    featured: f.featured,
    active: f.active,
    sortOrder: f.sortOrder,
  };
}

function ProcedureFormDialog({
  procedure,
  open,
  onClose,
  onSaved,
}: {
  procedure: AdminProcedureDTO | null;
  open: boolean;
  onClose: () => void;
  /** keepOpen: troca de foto (o formulário continua aberto) */
  onSaved: (p: AdminProcedureDTO, keepOpen: boolean) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState<AdminProcedureDTO | null>(null);

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setForm(procedure ? toForm(procedure) : EMPTY);
      setCurrent(procedure);
      setErrors({});
      setError(null);
    }
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setError(null);
    try {
      const saved = current ? await adminApi.updateProcedure(current.id, toPayload(form)) : await adminApi.createProcedure(toPayload(form));
      toast(current ? 'Procedimento atualizado.' : 'Procedimento criado.');
      onSaved(saved, false);
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={current ? `Editar ${current.name}` : 'Novo procedimento'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="procedure-form" icon="check" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <form id="procedure-form" onSubmit={save} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nome" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required />
          <Select label="Categoria" value={form.category} onChange={(e) => set('category', e.target.value as ProcedureCategory)} error={errors.category} required>
            <option value="">Selecione…</option>
            {(Object.keys(CATEGORY_LABELS) as ProcedureCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="Resumo (aparece no card)"
          value={form.shortDescription}
          maxLength={300}
          onChange={(e) => set('shortDescription', e.target.value)}
          error={errors.shortDescription}
          required
        />
        <Textarea
          label="Descrição completa"
          rows={5}
          maxLength={4000}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          error={errors.description}
          hint="Evite prometer resultados (ex.: “resultado garantido”, “sem riscos”). Cada caso depende de avaliação."
          required
        />
        <Textarea
          label="Destaques (um por linha, até 6)"
          rows={3}
          value={form.highlights}
          onChange={(e) => set('highlights', e.target.value)}
          error={errors.highlights}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Duração (minutos)"
            type="number"
            min={5}
            max={600}
            step={5}
            value={form.durationMinutes}
            onChange={(e) => set('durationMinutes', e.target.value)}
            error={errors.durationMinutes}
            hint="Usada para calcular os horários livres."
            required
          />
          <Input
            label="Preço (R$)"
            inputMode="decimal"
            placeholder="Vazio = sob avaliação"
            value={form.price}
            onChange={(e) => set('price', e.target.value.replace(/[^\d,.]/g, ''))}
            error={errors.price}
          />
          <Input
            label="Ordem no site"
            type="number"
            min={0}
            max={999}
            value={form.sortOrder}
            onChange={(e) => set('sortOrder', e.target.value)}
            error={errors.sortOrder}
            hint="Menor aparece primeiro."
          />
        </div>
        <div className="space-y-4 rounded-2xl border border-line bg-white p-4">
          <Toggle
            checked={form.requiresEvaluation}
            onChange={(v) => set('requiresEvaluation', v)}
            label="Mediante avaliação"
            description="Mostra o aviso de avaliação prévia (injetáveis, medicamentos)."
          />
          <Toggle checked={form.featured} onChange={(v) => set('featured', v)} label="Destaque" description="Aparece em evidência no site." />
          <Toggle checked={form.active} onChange={(v) => set('active', v)} label="Ativo" description="Desativado não aparece no site nem na agenda online." />
        </div>

        {current && (
          <div>
            <p className="mb-2 text-sm font-medium">Imagem</p>
            <div className="max-w-sm">
              <PhotoUploader
                procedure={current}
                onUpdated={(p) => {
                  setCurrent(p);
                  onSaved(p, true);
                }}
                compact
              />
            </div>
          </div>
        )}
        {error && <Notice tone="danger">{error}</Notice>}
      </form>
    </Dialog>
  );
}

export default function ProceduresPage() {
  const toast = useToast();
  const { confirm, confirmElement } = useConfirm();
  const { data, loading, error, retry } = useAsync((signal) => adminApi.procedures(signal), []);
  const [editing, setEditing] = useState<{ procedure: AdminProcedureDTO | null } | null>(null);
  const [list, setList] = useState<AdminProcedureDTO[] | null>(null);

  useEffect(() => {
    document.title = 'Procedimentos | Painel';
  }, []);
  useEffect(() => setList(data ?? null), [data]);

  const upsert = (p: AdminProcedureDTO) =>
    setList((l) => (l?.some((x) => x.id === p.id) ? l.map((x) => (x.id === p.id ? p : x)) : [...(l ?? []), p]));

  const toggleActive = async (p: AdminProcedureDTO) => {
    if (p.active) {
      const ok = await confirm({
        title: 'Desativar procedimento',
        message: `${p.name} deixará de aparecer no site e na agenda online. Agendamentos já marcados continuam valendo.`,
        confirmLabel: 'Desativar',
        danger: true,
      });
      if (!ok) return;
    }
    try {
      upsert(await adminApi.updateProcedure(p.id, { active: !p.active }));
      toast(p.active ? 'Procedimento desativado.' : 'Procedimento ativado.');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Procedimentos"
        description="O que aparece no site e na agenda online."
        actions={
          <Button icon="plus" onClick={() => setEditing({ procedure: null })}>
            Novo procedimento
          </Button>
        }
      />

      {loading && !list ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : list && list.length === 0 ? (
        <Empty icon="sparkles">Nenhum procedimento cadastrado.</Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list?.map((p) => (
            <li key={p.id} className={cn('flex flex-col overflow-hidden rounded-2xl border border-line bg-white', !p.active && 'opacity-70')}>
              <ProcedureVisual slug={p.slug} category={p.category} imageUrl={p.imageUrl} alt={p.name} className="aspect-[16/9] w-full" />
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-serif text-xl leading-tight">{p.name}</h2>
                  {p.active ? <Badge tone="success">Ativo</Badge> : <Badge tone="danger">Inativo</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted">{CATEGORY_LABELS[p.category]}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Duração</dt>
                    <dd className="font-medium">{formatDuration(p.durationMinutes)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Preço</dt>
                    <dd className="font-medium">{formatPrice(p.price)}</dd>
                  </div>
                </dl>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Button variant="outline" icon="edit" onClick={() => setEditing({ procedure: p })}>
                    Editar
                  </Button>
                  <Button variant="ghost" onClick={() => toggleActive(p)}>
                    {p.active ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ProcedureFormDialog
        open={!!editing}
        procedure={editing?.procedure ?? null}
        onClose={() => setEditing(null)}
        onSaved={(p, keepOpen) => {
          upsert(p);
          if (!keepOpen) setEditing(null);
        }}
      />
      {confirmElement}
    </>
  );
}
