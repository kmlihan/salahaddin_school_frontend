import { useEffect, useState } from 'react';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';
import { useDialog } from './Dialog';

/**
 * Generic CRUD table.
 *
 * Per-row buttons: View / Edit / Delete (plus any extraRowActions).
 *   View — opens the same form wrapped in <fieldset disabled> so every
 *          input is read-only without touching individual form components.
 *
 * After every successful create / update / delete, a success toast is
 * shown via dialog.notify and the list is reloaded so the change is
 * visible immediately.
 *
 * Props:
 *   filters / FilterBar / rowClass / extraRowActions / canModify — same as before.
 *   detailsButton — set to false to hide the View button on a particular page.
 */
export default function CrudTable({
  title,
  endpoint,
  emptyForm,
  columns,
  Form,
  rowKey = '_id',
  onAfterCreate,
  filters: initialFilters,
  FilterBar,
  rowClass,
  extraRowActions,
  canModify,
  detailsButton = true,
}) {
  const { t } = useLang();
  const dialog = useDialog();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // null | item | { ...item, __view: true } | { ...empty, __new: true }
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [filters, setFilters] = useState(initialFilters || null);

  const load = async () => {
    setErr('');
    try {
      const params = {};
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          if (v !== '' && v != null) params[k] = v;
        }
      }
      const { data } = await api.get(endpoint, { params });
      setItems(data);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [endpoint, JSON.stringify(filters)]);

  const startNew  = () => setEditing({ ...emptyForm, __new: true });
  const startEdit = (it) => setEditing({ ...it });
  const startView = (it) => setEditing({ ...it, __view: true });
  const closePanel = () => setEditing(null);

  const onSubmit = async (value) => {
    setErr(''); setInfo('');
    try {
      if (value.__new) {
        const { __new, ...payload } = value;
        const { data } = await api.post(endpoint, payload);
        if (data.generatedPassword) setInfo(`Password: ${data.generatedPassword}`);
        if (onAfterCreate) onAfterCreate(data);
        await dialog.notify({
          variant: 'success',
          title: t('created') || 'Created',
        });
      } else {
        const { _id, __view, ...payload } = value;
        await api.put(`${endpoint}/${_id}`, payload);
        await dialog.notify({
          variant: 'success',
          title: t('saved') || 'Saved',
        });
      }
      setEditing(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };

  const onDelete = async (it) => {
    const ok = await dialog.confirm({
      title: t('confirmDelete'),
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`${endpoint}/${it._id}`);
      await dialog.notify({
        variant: 'success',
        title: t('deleted') || 'Deleted',
      });
      load();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };

  const isView = editing?.__view;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <button className="btn btn-primary" onClick={startNew}>+ {t('add')}</button>
      </div>

      {FilterBar && filters && (
        <FilterBar value={filters} onChange={setFilters} />
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}
      {info && <p className="text-sm text-green-600">{info}</p>}

      {/* Editing / viewing panel.
          - In edit & create mode: the Form is rendered normally and can save.
          - In view mode: the same Form is wrapped in <fieldset disabled>, which
            recursively disables every input/button inside per HTML spec. We
            don't pass onChange/onSubmit, so even programmatic changes are
            harmless. A "Close" button is rendered outside the disabled
            fieldset so it stays clickable. */}
      {editing && (
        <div className="card">
          {isView ? (
            <>
              <fieldset disabled style={{ border: 0, padding: 0, margin: 0 }}>
                <Form
                  value={editing}
                  onChange={() => {}}
                  onSubmit={() => {}}
                  onCancel={closePanel}
                />
              </fieldset>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button type="button" className="btn btn-primary" onClick={closePanel}>
                  {t('close') || 'Close'}
                </button>
              </div>
            </>
          ) : (
            <Form
              value={editing}
              onChange={setEditing}
              onSubmit={(override) => onSubmit(override || editing)}
              onCancel={closePanel}
            />
          )}
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              {columns.map((c) => (
                <th key={c.label} className="text-start px-3 py-2 font-medium">{c.label}</th>
              ))}
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="px-3 py-6 text-center text-slate-500">—</td></tr>
            )}
            {items.map((it) => (
              <tr
                key={it[rowKey]}
                className={'border-t border-slate-200 dark:border-slate-800 ' + (rowClass ? rowClass(it) : '')}
              >
                {columns.map((c) => (
                  <td key={c.label} className="px-3 py-2">{c.render(it)}</td>
                ))}
                <td className="px-3 py-2 text-end whitespace-nowrap">
                  {extraRowActions && extraRowActions(it, { reload: load })}
                  {detailsButton && (
                    <button
                      className="btn btn-ghost text-xs"
                      onClick={() => startView(it)}
                      title={t('view') || 'View'}
                    >
                      👁 {t('view') || 'View'}
                    </button>
                  )}
                  {(!canModify || canModify(it)) && (
                    <>
                      <button className="btn btn-ghost text-xs" onClick={() => startEdit(it)}>{t('edit')}</button>
                      <button className="btn btn-ghost text-xs text-red-600" onClick={() => onDelete(it)}>{t('delete')}</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
