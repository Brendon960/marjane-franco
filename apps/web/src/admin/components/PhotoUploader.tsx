import { IMAGE_UPLOAD_RULES as RULES, type AdminProcedureDTO } from '@mf/shared';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ProcedureVisual } from '../../components/ui/ProcedureVisual';
import { adminApi } from '../api';
import { Notice, useConfirm, useToast } from '../ui';

/** Confere tipo, tamanho e dimensões no navegador (a API confere de novo). */
async function validateFile(file: File): Promise<string | null> {
  if (!(RULES.mimeTypes as readonly string[]).includes(file.type)) return 'Formato não aceito. Use JPG, PNG ou WEBP.';
  if (file.size > RULES.maxBytes) return `Arquivo com ${(file.size / 1024 / 1024).toFixed(1)} MB. O limite é de 5 MB.`;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close();
    if (width < RULES.minWidth || height < RULES.minHeight) {
      return `A foto precisa ter pelo menos ${RULES.minWidth}×${RULES.minHeight} pixels (esta tem ${width}×${height}).`;
    }
  } catch {
    return 'Não foi possível abrir a imagem. Tente outro arquivo.';
  }
  return null;
}

interface PhotoUploaderProps {
  procedure: AdminProcedureDTO;
  onUpdated: (procedure: AdminProcedureDTO) => void;
  compact?: boolean;
}

/** Foto atual → "Alterar foto" → escolher arquivo → pré-visualização → confirmar. */
export function PhotoUploader({ procedure, onUpdated, compact }: PhotoUploaderProps) {
  const toast = useToast();
  const { confirm, confirmElement } = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const choose = async (selected: File | undefined) => {
    if (input.current) input.current.value = '';
    if (!selected) return;
    setError(null);
    const problem = await validateFile(selected);
    if (problem) {
      setError(problem);
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const cancel = () => {
    setFile(null);
    setPreview(null);
    setError(null);
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await adminApi.uploadProcedureImage(procedure.id, file);
      toast(`Foto de ${procedure.name} atualizada.`);
      cancel();
      onUpdated(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    const ok = await confirm({
      title: 'Voltar à foto padrão',
      message: `A foto enviada para ${procedure.name} será removida e o site volta a exibir a foto padrão.`,
      confirmLabel: 'Remover foto',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      onUpdated(await adminApi.removeProcedureImage(procedure.id));
      toast('Foto padrão restaurada.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl">
        {preview ? (
          <img src={preview} alt={`Pré-visualização da nova foto de ${procedure.name}`} className="aspect-[4/3] w-full object-cover" />
        ) : (
          <ProcedureVisual
            slug={procedure.slug}
            category={procedure.category}
            imageUrl={procedure.imageUrl}
            alt={procedure.name}
            className="aspect-[4/3] w-full"
          />
        )}
        <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink shadow">
          {preview ? 'Pré-visualização' : procedure.hasUploadedImage ? 'Foto enviada' : 'Foto temporária'}
        </span>
      </div>

      <input
        ref={input}
        type="file"
        accept={RULES.extensions}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => choose(e.target.files?.[0])}
        aria-label={`Escolher nova foto para ${procedure.name}`}
      />

      {error && (
        <div className="mt-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {preview ? (
          <>
            <Button icon="check" onClick={upload} disabled={busy}>
              {busy ? 'Enviando…' : 'Confirmar'}
            </Button>
            <Button variant="outline" onClick={cancel} disabled={busy}>
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" icon="upload" onClick={() => input.current?.click()} disabled={busy}>
              Alterar foto
            </Button>
            {procedure.hasUploadedImage && (
              <Button variant="ghost" onClick={restore} disabled={busy}>
                Voltar à padrão
              </Button>
            )}
          </>
        )}
      </div>
      {!compact && !preview && (
        <p className="mt-2 text-xs text-muted">JPG, PNG ou WEBP · até 5 MB · mínimo 800×600. A foto é recortada em 4:3.</p>
      )}
      {confirmElement}
    </div>
  );
}
