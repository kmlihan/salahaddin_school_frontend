import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';
import { useDialog } from '../../components/Dialog';

const TABS = ['pending', 'approved', 'rejected'];

/**
 * Admin queue of registration requests. All confirmations / prompts /
 * notifications go through the in-app dialog system — no window.* calls.
 */
export default function AdminRegistrations() {
  const { t } = useLang();
  const dialog = useDialog();

  const [tab, setTab] = useState('pending');
  const [items, setItems] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    try {
      const { data } = await api.get('/registrations', { params: { status: tab } });
      setItems(data);
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const approve = async (it) => {
    const ok = await dialog.confirm({
      title: t('confirmApprove'),
      message: `${it.parent.firstName} ${it.parent.lastName}`,
    });
    if (!ok) return;
    setBusyId(it._id); setErr('');
    try {
      await api.post(`/registrations/${it._id}/approve`);
      await dialog.notify({
        variant: 'success',
        title: t('approved'),
        message: 'Parent and student accounts created. Credentials have been emailed.',
      });
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (it) => {
    const reason = await dialog.prompt({
      title: t('reject'),
      message: `${it.parent.firstName} ${it.parent.lastName}`,
      placeholder: t('rejectionReason'),
      multiline: true,
      confirmLabel: t('reject'),
    });
    if (reason === null) return; // user cancelled
    setBusyId(it._id); setErr('');
    try {
      await api.post(`/registrations/${it._id}/reject`, { reason });
      await dialog.notify({
        variant: 'info',
        title: t('rejected'),
        message: 'The applicant has been notified by email.',
      });
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (it) => {
    const ok = await dialog.confirm({
      title: t('confirmRejectHistory'),
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/registrations/${it._id}`);
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('registrations')}</h1>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={'btn text-sm ' + (tab === s ? 'btn-primary' : 'btn-ghost')}
          >
            {t(s)}
          </button>
        ))}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="space-y-3">
        {items.length === 0 && <div className="card text-slate-500">—</div>}

        {items.map((it) => (
          <div key={it._id} className="card">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="space-y-1 text-sm">
                <p className="font-semibold">
                  {t('parent')}:{' '}
                  <span className="font-normal">
                    {it.parent.firstName} {it.parent.lastName} — {it.parent.email}
                    {it.parent.phone && ` · ${it.parent.phone}`}
                  </span>
                </p>
                <p className="font-semibold">
                  {t('student')}:{' '}
                  <span className="font-normal">
                    {it.student.firstName} {it.student.lastName} — {it.student.email}
                    {' · '}{t('level')} {it.student.level}
                    {' · '}{it.student.gender}
                  </span>
                </p>
                {it.message && (
                  <p className="text-slate-600 dark:text-slate-300 italic mt-1">
                    “{it.message}”
                  </p>
                )}
                {it.status === 'rejected' && it.rejectionReason && (
                  <p className="text-red-600 mt-1">
                    {t('rejectionReason')}: {it.rejectionReason}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(it.createdAt).toLocaleString()}
                  {it.decidedAt && ` · decided ${new Date(it.decidedAt).toLocaleString()}`}
                </p>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {it.status === 'pending' ? (
                  <>
                    <button
                      disabled={busyId === it._id}
                      className="btn btn-primary text-sm"
                      onClick={() => approve(it)}
                    >
                      {busyId === it._id ? t('loading') : t('approve')}
                    </button>
                    <button
                      disabled={busyId === it._id}
                      className="btn text-sm"
                      style={{ backgroundColor: '#dc2626', color: 'white' }}
                      onClick={() => reject(it)}
                    >
                      {t('reject')}
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-ghost text-xs text-red-600"
                    onClick={() => remove(it)}
                  >
                    {t('delete')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
