import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import { useDialog } from '../../components/Dialog';
import { useLang } from '../../context/LanguageContext';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function AdminPayments() {
  const { t } = useLang();
  const dialog = useDialog();
  const [teachers, setTeachers] = useState([]);
  const [list, setList] = useState([]);
  const [tab, setTab] = useState('attendance'); // 'attendance' | 'manual'
  const [err, setErr] = useState('');

  const load = async () => {
    const [a, b] = await Promise.all([api.get('/teachers'), api.get('/payments')]);
    setTeachers(a.data); setList(b.data);
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (id) => {
    const ok = await dialog.confirm({ title: t('confirmDelete'), danger: true });
    if (!ok) return;
    await api.delete(`/payments/${id}`);
    load();
  };

  const downloadPayslip = async (id) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/payments/${id}/payslip`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payslip_${id}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const teacherName = (id) => {
    const tch = teachers.find((x) => x._id === id || x._id === id?._id);
    return tch ? `${tch.firstName} ${tch.lastName}` : '—';
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('payments')}</h1>

      {/* Mode tabs — attendance flow is the recommended one and is shown
          first; manual entry is kept for one-off corrections. */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTab('attendance')}
          className={'btn text-sm ' + (tab === 'attendance' ? 'btn-primary' : 'btn-ghost')}
        >
          {t('generateFromAttendance')}
        </button>
        <button
          onClick={() => setTab('manual')}
          className={'btn text-sm ' + (tab === 'manual' ? 'btn-primary' : 'btn-ghost')}
        >
          {t('manualEntry')}
        </button>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {tab === 'attendance'
        ? <FromAttendanceForm teachers={teachers} onCreated={load} t={t} dialog={dialog} />
        : <ManualForm teachers={teachers} onCreated={load} t={t} setErr={setErr} />}

      {/* History table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="text-start px-3 py-2">{t('teacher')}</th>
              <th className="text-start px-3 py-2">{t('tableHours')}</th>
              <th className="text-start px-3 py-2">{t('tableRate')}</th>
              <th className="text-start px-3 py-2">{t('tableTotal')}</th>
              <th className="text-start px-3 py-2">{t('tablePeriod')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">—</td></tr>}
            {list.map((p) => (
              <tr key={p._id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="px-3 py-2">{p.teacher ? teacherName(p.teacher._id || p.teacher) : '—'}</td>
                <td className="px-3 py-2">{p.hoursWorked}</td>
                <td className="px-3 py-2">€ {p.hourlyRate}</td>
                <td className="px-3 py-2">€ {p.grossAmount}</td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {p.periodFrom ? new Date(p.periodFrom).toLocaleDateString() : '—'} → {p.periodTo ? new Date(p.periodTo).toLocaleDateString() : '—'}
                </td>
                <td className="px-3 py-2 text-end whitespace-nowrap">
                  <button className="btn btn-soft text-xs" onClick={() => downloadPayslip(p._id)}>PDF</button>
                  <button className="btn btn-ghost text-xs text-red-600" onClick={() => onDelete(p._id)}>{t('delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Generate from attendance ---------- */

/**
 * The new flow:
 *   pick teacher → pick range → preview shows recorded hours per day →
 *   admin sets rate → page shows totalHours × rate = amount →
 *   click Generate to POST /payments with the breakdown attached.
 */
function FromAttendanceForm({ teachers, onCreated, t, dialog }) {
  const [teacherId, setTeacherId] = useState('');
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(todayStr());
  const [preview, setPreview] = useState(null);
  const [rate, setRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // When the teacher changes, prefill the rate from the teacher's stored
  // hourlyRate. Admin can still override below.
  useEffect(() => {
    const tch = teachers.find((x) => x._id === teacherId);
    if (tch) setRate(tch.hourlyRate || 0);
  }, [teacherId, teachers]);

  // Re-run the preview whenever any of the inputs change. Cheap; if it
  // ever gets expensive, replace with a "Preview" button.
  useEffect(() => {
    if (!teacherId || !from || !to) { setPreview(null); return; }
    let alive = true;
    (async () => {
      setErr('');
      try {
        const { data } = await api.get('/payments/preview-from-attendance', {
          params: { teacher: teacherId, from, to },
        });
        if (alive) setPreview(data);
      } catch (e) {
        if (alive) {
          setPreview(null);
          setErr(e.response?.data?.message || t('error'));
        }
      }
    })();
    return () => { alive = false; };
  }, [teacherId, from, to, t]);

  const totalHours = preview?.totalHours || 0;
  const amount = totalHours * Number(rate || 0);

  const onGenerate = async () => {
    if (!teacherId) {
      await dialog.notify({ variant: 'error', title: t('pickTeacher') });
      return;
    }
    if (totalHours === 0) {
      await dialog.notify({ variant: 'error', title: t('noAttendanceInRange') });
      return;
    }
    setBusy(true); setErr('');
    try {
      await api.post('/payments', {
        teacher: teacherId,
        hoursWorked: totalHours,
        hourlyRate: Number(rate),
        periodFrom: from,
        periodTo: to,
        notes,
        breakdown: (preview?.days || []).map((d) => ({ date: d.date, hours: d.hours })),
      });
      onCreated();
      await dialog.notify({ variant: 'success', title: t('saved') });
      // Don't reset everything — the admin often runs the same teacher
      // for the next period. Just clear notes.
      setNotes('');
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally { setBusy(false); }
  };

  return (
    <div className="card space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="block md:col-span-2">
          <span className="block text-sm mb-1">{t('teacher')}</span>
          <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">— {t('pickTeacher')} —</option>
            {teachers.map((tch) => (
              <option key={tch._id} value={tch._id}>
                {tch.firstName} {tch.lastName}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm mb-1">{t('from')}</span>
          <input type="date" className="input" value={from} max={to}
                 onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">{t('to')}</span>
          <input type="date" className="input" value={to} min={from}
                 onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      {/* Breakdown preview */}
      {preview && totalHours > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2">{t('breakdown')}</h3>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="text-start px-3 py-2">{t('tableDate')}</th>
                  <th className="text-start px-3 py-2">{t('nthHour')}</th>
                  <th className="text-start px-3 py-2">{t('tableHours')}</th>
                </tr>
              </thead>
              <tbody>
                {preview.days.map((d, i) => (
                  <tr key={i} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-3 py-2">{new Date(d.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-xs">
                      {(d.hours || []).map((n) =>
                        <span
                          key={n}
                          className="inline-block me-1 px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100"
                        >
                          {t('hourN').replace('{n}', n)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{(d.hours || []).length}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 dark:border-slate-600 font-semibold">
                  <td className="px-3 py-2">{t('tableTotal')}</td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2">{totalHours}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {preview && totalHours === 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-300">{t('noAttendanceInRange')}</p>
      )}

      {/*
        Pre-submit warning when the preview returns a conflict: the chosen
        range overlaps an existing payslip for this teacher. We surface this
        here so the admin doesn't fill in the rate, click Generate, and only
        then see the 409. Reading the conflict's period helps them locate
        the original payslip.
      */}
      {preview?.conflict && (
        <div className="card border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            ⚠ {t('overlapWarningTitle')}
          </p>
          <p className="text-sm mt-1 text-amber-900 dark:text-amber-100">
            {t('overlapWarningBody')
              .replace('{from}', new Date(preview.conflict.periodFrom).toLocaleDateString())
              .replace('{to}',   new Date(preview.conflict.periodTo).toLocaleDateString())
              .replace('{amount}', `€ ${Number(preview.conflict.grossAmount || 0).toFixed(2)}`)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-sm mb-1">{t('pricePerHour')}</span>
          <input type="number" min="0" step="0.01" className="input"
                 value={rate}
                 onChange={(e) => setRate(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">{t('calculatedAmount')}</span>
          <div className="input flex items-center font-semibold">€ {amount.toFixed(2)}</div>
        </label>
        <label className="block">
          <span className="block text-sm mb-1">{t('notes')}</span>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div>
        <button
          className="btn btn-primary"
          disabled={busy || !teacherId || totalHours === 0 || !!preview?.conflict}
          onClick={onGenerate}
          title={preview?.conflict ? t('overlapWarningTitle') : ''}
        >
          {busy ? t('loading') : t('generatePayslip')}
        </button>
      </div>
    </div>
  );
}

/* ---------- Manual entry (legacy fallback) ---------- */

function ManualForm({ teachers, onCreated, t, setErr }) {
  const [form, setForm] = useState({
    teacher: '', hoursWorked: 0, hourlyRate: 0,
    periodFrom: '', periodTo: '', notes: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Prefill rate from teacher's stored hourlyRate when they pick one.
  useEffect(() => {
    const tch = teachers.find((x) => x._id === form.teacher);
    if (tch) setForm((f) => ({ ...f, hourlyRate: tch.hourlyRate || 0 }));
  }, [form.teacher, teachers]);

  const onCreate = async (e) => {
    e.preventDefault(); setErr('');
    try {
      await api.post('/payments', form);
      setForm({ teacher: '', hoursWorked: 0, hourlyRate: 0, periodFrom: '', periodTo: '', notes: '' });
      onCreated();
    } catch (e) { setErr(e.response?.data?.message || t('error')); }
  };

  return (
    <form onSubmit={onCreate} className="card grid grid-cols-1 md:grid-cols-3 gap-3">
      <label className="block">
        <span className="block text-sm mb-1">{t('teacher')}</span>
        <select className="input" value={form.teacher} onChange={(e) => set('teacher', e.target.value)} required>
          <option value="">—</option>
          {teachers.map((tch) => <option key={tch._id} value={tch._id}>{tch.firstName} {tch.lastName}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="block text-sm mb-1">{t('tableHours')}</span>
        <input type="number" min="0" step="0.5" className="input" value={form.hoursWorked} onChange={(e) => set('hoursWorked', Number(e.target.value))} required />
      </label>
      <label className="block">
        <span className="block text-sm mb-1">{t('hourlyRate')}</span>
        <input type="number" min="0" className="input" value={form.hourlyRate} onChange={(e) => set('hourlyRate', Number(e.target.value))} required />
      </label>
      <label className="block">
        <span className="block text-sm mb-1">{t('from')}</span>
        <input type="date" className="input" value={form.periodFrom} onChange={(e) => set('periodFrom', e.target.value)} />
      </label>
      <label className="block">
        <span className="block text-sm mb-1">{t('to')}</span>
        <input type="date" className="input" value={form.periodTo} onChange={(e) => set('periodTo', e.target.value)} />
      </label>
      <label className="block md:col-span-3">
        <span className="block text-sm mb-1">{t('notes')}</span>
        <input className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </label>
      <div className="md:col-span-3">
        <button className="btn btn-primary">{t('create')} {t('payments').toLowerCase()}</button>
      </div>
    </form>
  );
}
