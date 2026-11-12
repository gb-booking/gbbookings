import { useState } from 'react';
import { ArrowLeft, ArrowRight, LoaderCircle, Star, X } from 'lucide-react';
import { api, type PhotoInput } from '../../shared/api/api';

/** A photo in the editor: existing ones are identified by url, fresh uploads also carry their mediaId. */
export type EditablePhoto = { url: string; mediaId?: string; caption?: string };

export const toPhotoInput = (photos: EditablePhoto[]): PhotoInput[] => photos.map((photo) => ({
  ...(photo.mediaId ? { mediaId: photo.mediaId } : { url: photo.url }),
  ...(photo.caption?.trim() ? { caption: photo.caption.trim() } : {}),
}));

/**
 * Booking.com-style quality check before upload: big enough to look sharp, and not a blank or single-colour image.
 * Returns why a photo is refused, or '' when it is fine. Files the browser cannot read pass; the server checks them.
 */
export async function photoProblem(file: File) {
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { return ''; }
  const { width, height } = bitmap;
  if (Math.max(width, height) < 1000 || Math.min(width, height) < 600) return `${file.name} is too small (${width}×${height}). Use photos at least 1000 pixels wide.`;
  // A 64×48 thumbnail is enough to tell a real scene from a flat colour.
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 48;
  const context = canvas.getContext('2d');
  if (!context) return '';
  context.drawImage(bitmap, 0, 0, 64, 48);
  const pixels = context.getImageData(0, 0, 64, 48).data;
  let sum = 0, squares = 0;
  for (let at = 0; at < pixels.length; at += 4) {
    const light = 0.299 * pixels[at] + 0.587 * pixels[at + 1] + 0.114 * pixels[at + 2];
    sum += light; squares += light * light;
  }
  const count = pixels.length / 4;
  const spread = Math.sqrt(squares / count - (sum / count) ** 2);
  return spread < 12 ? `${file.name} looks blank or out of focus. Use a clear photo of the property.` : '';
}

const iconButton = 'flex size-11 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 disabled:opacity-30';

export default function PhotoManager({ photos, onChange, max, label, onUploadingChange, min, qualityCheck = false }: {
  photos: EditablePhoto[]; onChange: (photos: EditablePhoto[]) => void; max: number; label: string;
  onUploadingChange?: (uploading: boolean) => void;
  /** Shown as "at least N" until reached. */
  min?: number;
  /** Refuse small, blank or blurry photos before uploading them (listing photos). */
  qualityCheck?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const move = (from: number, to: number) => {
    const next = [...photos];
    const [photo] = next.splice(from, 1);
    next.splice(to, 0, photo);
    onChange(next);
  };
  const add = async (files: File[]) => {
    if (photos.length + files.length > max) { setError(`Choose at most ${max} photos.`); return; }
    setUploading(true); onUploadingChange?.(true); setError('');
    const added: EditablePhoto[] = [];
    const refused: string[] = [];
    try {
      for (const file of files) {
        const problem = qualityCheck ? await photoProblem(file) : '';
        if (problem) { refused.push(problem); continue; }
        const { data } = await api.uploadMedia('images', file);
        added.push({ url: data.url ?? URL.createObjectURL(file), mediaId: data.id });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'A photo could not be uploaded.');
    } finally {
      // Unlike Booking.com, which drops weak photos silently, say which ones were refused and why.
      if (refused.length) setError(refused.join(' '));
      if (added.length) onChange([...photos, ...added]);
      setUploading(false); onUploadingChange?.(false);
    }
  };

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-slate-600">{label} · first photo is the cover</legend>
      {min !== undefined && photos.length < min && <p className="text-sm text-slate-600">Upload at least {min} photos. {min - photos.length} more to go. The more you add, the more likely guests are to book.</p>}
      {qualityCheck && <p className="text-xs text-slate-500">JPG, PNG or WebP, at least 1000 pixels wide. A phone camera is fine; only use photos you took or have permission to use.</p>}
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      {photos.length > 0 && <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo, index) => (
          <li key={`${photo.url}-${index}`} className="space-y-2 rounded-md border border-slate-200 bg-white p-2">
            <div className="relative">
              <img src={photo.url} alt={photo.caption || `Photo ${index + 1}`} className="aspect-[4/3] w-full rounded object-cover" />
              {index === 0 && <span className="absolute left-2 top-2 rounded bg-[#006F3C] px-2 py-0.5 text-[11px] font-bold text-white">Cover</span>}
            </div>
            <input aria-label={`Caption for photo ${index + 1}`} placeholder="Caption (optional)" maxLength={200} value={photo.caption ?? ''}
              onChange={(event) => onChange(photos.map((item, at) => at === index ? { ...item, caption: event.target.value } : item))}
              className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm" />
            <div className="flex gap-2">
              <button type="button" className={iconButton} disabled={index === 0} onClick={() => move(index, index - 1)} aria-label={`Move photo ${index + 1} earlier`}><ArrowLeft className="size-4" /></button>
              <button type="button" className={iconButton} disabled={index === photos.length - 1} onClick={() => move(index, index + 1)} aria-label={`Move photo ${index + 1} later`}><ArrowRight className="size-4" /></button>
              <button type="button" className={`${iconButton} w-auto gap-1 px-3 text-xs font-semibold`} disabled={index === 0} onClick={() => move(index, 0)}><Star className="size-4" />Make cover</button>
              <button type="button" className={`${iconButton} ml-auto`} onClick={() => onChange(photos.filter((_, at) => at !== index))} aria-label={`Remove photo ${index + 1}`}><X className="size-4" /></button>
            </div>
          </li>
        ))}
      </ol>}
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-[#006F3C]">
        {uploading ? <><LoaderCircle className="size-4 animate-spin" />Uploading…</> : `Add photos (${photos.length}/${max})`}
        <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={uploading || photos.length >= max}
          onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ''; if (files.length) void add(files); }} />
      </label>
    </fieldset>
  );
}
