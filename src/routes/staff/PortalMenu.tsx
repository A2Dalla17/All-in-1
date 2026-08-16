/**
 * Menu management.
 *
 * ── Sold out is the feature that gets used ─────────────────────────────────
 * Adding a dish happens once. Marking one unavailable happens several times a
 * day, from a kitchen, in a hurry — so it is a single tap on the row itself,
 * not something behind an edit dialog.
 *
 * It also matters more than it looks: `galeyr_place_order` refuses any order
 * containing an unavailable item, so this toggle is what stops a customer
 * paying for food that does not exist.
 */

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { Input, Textarea } from '@shared/components/ui/Input';
import { Modal } from '@shared/components/ui/Modal';
import { Spinner } from '@shared/components/ui/Spinner';
import {
  createCategory,
  deleteMenuItem,
  formatUsd,
  getMenu,
  setItemAvailability,
  uploadMenuImage,
  upsertMenuItem,
  type MenuItem,
  type Restaurant,
} from '@shared/api/galeyr';
import { cn } from '@shared/lib/utils';

export function PortalMenu({ restaurant }: { restaurant: Restaurant }) {
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<Partial<MenuItem> | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<MenuItem | null>(null);

  const query = useQuery({
    queryKey: ['galeyr', 'menu', restaurant.id],
    queryFn: () => getMenu(restaurant.id),
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['galeyr', 'menu', restaurant.id] });
  }

  const availability = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      setItemAvailability(id, available),
    onSuccess: invalidate,
  });

  const save = useMutation({
    mutationFn: upsertMenuItem,
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => {
      invalidate();
      setConfirmDelete(null);
    },
  });

  const addCategory = useMutation({
    mutationFn: (name: string) =>
      createCategory(restaurant.id, name, (query.data?.categories.length ?? 0) + 1),
    onSuccess: () => {
      invalidate();
      setAddingCategory(false);
    },
  });

  const sections = useMemo(() => {
    const { categories = [], items = [] } = query.data ?? {};

    const grouped = categories.map((category) => ({
      id: category.id,
      name: category.name,
      items: items.filter((i) => i.category_id === category.id),
    }));

    const loose = items.filter((i) => !i.category_id);
    if (loose.length > 0) grouped.push({ id: 'none', name: 'Uncategorised', items: loose });

    return grouped;
  }, [query.data]);

  if (query.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading menu" />
      </div>
    );
  }

  const categories = query.data?.categories ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-ink-muted">
          {query.data?.items.length ?? 0} items in {categories.length} categories
        </p>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setAddingCategory(true)}>
            Add category
          </Button>
          <Button
            leadingIcon={<Plus size={16} />}
            disabled={categories.length === 0}
            onClick={() =>
              setEditing({
                restaurant_id: restaurant.id,
                category_id: categories[0]?.id ?? null,
                is_available: true,
              })
            }
          >
            Add item
          </Button>
        </div>
      </div>

      {categories.length === 0 && (
        <EmptyState
          className="py-16"
          title="Start with a category"
          description="Group your food — Food, Drinks, Desserts — then add items to each."
          action={<Button onClick={() => setAddingCategory(true)}>Add a category</Button>}
        />
      )}

      <div className="mt-6 space-y-8">
        {sections.map((section) => (
          <section key={section.id}>
            <h2 className="text-h5 font-bold text-ink">{section.name}</h2>

            {section.items.length === 0 ? (
              <p className="mt-3 rounded-card border border-dashed border-line px-4 py-6 text-center text-body-sm text-ink-subtle">
                Nothing in this category yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-card">
                {section.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'font-semibold text-ink',
                          !item.is_available && 'text-ink-subtle line-through',
                        )}
                      >
                        {item.name}
                      </p>
                      {item.description && (
                        <p className="truncate text-body-sm text-ink-muted">
                          {item.description}
                        </p>
                      )}
                      <p className="mt-0.5 text-body-sm font-bold text-ink">
                        {formatUsd(item.price_cents)}
                      </p>
                    </div>

                    {/* One tap, no dialog — see the note at the top. */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.is_available}
                      aria-label={`${item.name} is ${item.is_available ? 'available' : 'sold out'}`}
                      disabled={availability.isPending}
                      onClick={() =>
                        availability.mutate({ id: item.id, available: !item.is_available })
                      }
                      className={cn(
                        'shrink-0 rounded-pill px-3 py-2 text-caption font-bold transition-colors',
                        item.is_available
                          ? 'bg-success-soft text-success-ink'
                          : 'bg-surface text-ink-subtle',
                      )}
                    >
                      {item.is_available ? 'Available' : 'Sold out'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      aria-label={`Edit ${item.name}`}
                      className="shrink-0 rounded-tile p-2 text-ink-muted hover:bg-surface hover:text-ink"
                    >
                      <Pencil size={16} aria-hidden />
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmDelete(item)}
                      aria-label={`Delete ${item.name}`}
                      className="shrink-0 rounded-tile p-2 text-ink-muted hover:bg-surface hover:text-danger"
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit item' : 'Add item'}
      >
        {editing && (
          <ItemForm
            initial={editing}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            busy={save.isPending}
            error={save.isError ? save.error.message : ''}
            onCancel={() => setEditing(null)}
            onSave={(values) => save.mutate(values)}
          />
        )}
      </Modal>

      <Modal
        open={addingCategory}
        onClose={() => setAddingCategory(false)}
        title="Add a category"
      >
        <CategoryForm
          busy={addCategory.isPending}
          onCancel={() => setAddingCategory(false)}
          onSave={(name) => addCategory.mutate(name)}
        />
      </Modal>

      {/* ── Deleting is confirmed, and says what it costs ──
          Menu items are referenced by past orders. Those receipts survive
          because `galeyr_order_items` copies the name and price at the time —
          which is exactly why a receipt cannot be rewritten by a later price
          change, and why deleting is safe. Worth saying, because "will this
          break my old orders" is the reason people hesitate. */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.name ?? 'item'}?`}
      >
        <p className="text-body text-ink-muted">
          It will be removed from your menu. Past orders keep the name and price they were
          placed at, so your receipts and history are unaffected.
        </p>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" fullWidth onClick={() => setConfirmDelete(null)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            fullWidth
            loading={remove.isPending}
            onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ItemForm({
  initial,
  categories,
  busy,
  error,
  onCancel,
  onSave,
}: {
  initial: Partial<MenuItem>;
  categories: { id: string; name: string }[];
  busy: boolean;
  error: string;
  onCancel: () => void;
  onSave: (values: Partial<MenuItem> & { restaurant_id: string; name: string; price_cents: number }) => void;
}) {
  const [name, setName] = useState(initial.name ?? '');
  const [nameSo, setNameSo] = useState(initial.name_so ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [categoryId, setCategoryId] = useState(initial.category_id ?? categories[0]?.id ?? '');

  /**
   * Price is typed in dollars but stored in cents.
   *
   * Kept as a string in state rather than a number, so a half-typed "6." does
   * not become `6` and jump the cursor while someone is still typing.
   */
  const [price, setPrice] = useState(
    initial.price_cents !== undefined ? (initial.price_cents / 100).toFixed(2) : '',
  );

  const priceCents = Math.round(Number(price) * 100);
  const valid = name.trim().length >= 2 && Number.isFinite(priceCents) && priceCents > 0;

  /**
   * ── The photograph ──────────────────────────────────────────────────────
   * Uploaded immediately on selection rather than held until Save. Two
   * reasons: the person sees whether they picked the right picture while they
   * can still remember which one they meant, and a 2 MB upload that only
   * starts when they press Save makes Save feel broken on a slow connection.
   *
   * The cost is an orphaned file if they then cancel. That is a few kilobytes
   * in a public bucket, which is the cheaper of the two mistakes.
   */
  const [imageUrl, setImageUrl] = useState(initial.image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setImageError('');
    setUploading(true);
    try {
      const url = await uploadMenuImage(initial.restaurant_id as string, file);
      setImageUrl(url);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'The photo could not be uploaded.');
    } finally {
      setUploading(false);
      /* Reset the input, or choosing the same file twice after an error
         fires no change event and looks like the button has died. */
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} inputSize="lg" />

      {/* ── Photo ──
          A hidden input driven by a real button. `<Button as="span">` is not
          supported by this Button, and a bare styled <label> loses keyboard
          focus behaviour, so the button calls click() on the input. */}
      <div>
        <span className="mb-1.5 block text-body-sm font-semibold text-ink">
          Photo <span className="font-normal text-ink-subtle">— optional</span>
        </span>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />

        {imageUrl ? (
          <div className="flex items-center gap-3">
            <img
              src={imageUrl}
              alt=""
              className="h-20 w-20 shrink-0 rounded-tile border border-line object-cover"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                loading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                Replace
              </Button>
              <Button
                size="sm"
                variant="ghost"
                leadingIcon={<X size={14} />}
                onClick={() => setImageUrl(null)}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex h-24 w-full items-center justify-center gap-2 rounded-tile border border-dashed border-line bg-surface text-body-sm font-semibold text-ink-muted transition-colors hover:border-brand hover:text-brand-ink disabled:opacity-60"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <ImagePlus size={18} />
                Add a photo
              </>
            )}
          </button>
        )}

        <p className="mt-1.5 text-caption text-ink-subtle">
          JPG, PNG or WebP, up to 5&nbsp;MB. A clear photo of the dish sells it better
          than any description.
        </p>

        {imageError && (
          <p role="alert" className="mt-1.5 text-body-sm text-danger">
            {imageError}
          </p>
        )}
      </div>

      <Input
        label="Somali name (optional)"
        value={nameSo}
        onChange={(e) => setNameSo(e.target.value)}
      />

      <Textarea
        label="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />

      <Input
        label="Price (USD)"
        type="number"
        step="0.25"
        min="0"
        inputMode="decimal"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        inputSize="lg"
      />

      <div>
        <label htmlFor="item-category" className="mb-1.5 block text-body-sm font-semibold text-ink">
          Category
        </label>
        <select
          id="item-category"
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-12 w-full rounded-input border border-line bg-card px-4 text-body text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button
          fullWidth
          loading={busy}
          disabled={!valid}
          onClick={() =>
            onSave({
              ...(initial.id ? { id: initial.id } : {}),
              restaurant_id: initial.restaurant_id as string,
              name: name.trim(),
              name_so: nameSo.trim() || null,
              description: description.trim() || null,
              price_cents: priceCents,
              category_id: categoryId || null,
              image_url: imageUrl,
              is_available: initial.is_available ?? true,
            })
          }
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function CategoryForm({
  busy,
  onCancel,
  onSave,
}: {
  busy: boolean;
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState('');

  return (
    <div className="space-y-4">
      <Input
        label="Category name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Drinks"
        inputSize="lg"
      />

      <div className="flex gap-3">
        <Button variant="outline" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button
          fullWidth
          loading={busy}
          disabled={name.trim().length < 2}
          onClick={() => onSave(name.trim())}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
