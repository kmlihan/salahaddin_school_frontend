import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

export default function ParentDashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const [children, setChildren] = useState([]);

  useEffect(() => {
    api.get('/parents/me/children')
      .then((r) => setChildren(r.data))
      .catch(() => {});
  }, []);

  // paidAmount comes back on each child (the myChildren query returns all
  // non-password fields). Sum across children for the headline total.
  const totalPaid = children.reduce(
    (sum, c) => sum + (Number(c.paidAmount) || 0),
    0
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t('welcomeBack')}, {user?.firstName}</h1>
        <p className="text-slate-500">{t('parent')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/parent/children" className="card hover:shadow-md transition block">
          <div className="text-sm text-slate-500">{t('myChildren')}</div>
          <div className="text-3xl font-semibold">{children.length}</div>
          <p className="text-xs text-slate-500 mt-1">
            {children.map((c) => `${c.firstName} ${c.lastName}`).join(' · ') || '—'}
          </p>
        </Link>

        <Link to="/parent/attendance" className="card hover:shadow-md transition block">
          <div className="text-sm text-slate-500">{t('attendance')}</div>
          <div className="text-3xl font-semibold">📅</div>
          <p className="text-xs text-slate-500 mt-1">
            {t('viewAttendanceHint') || 'Daily, monthly and yearly attendance'}
          </p>
        </Link>
      </div>

      {/* Amount paid panel */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="font-semibold">{t('amountPaid') || 'Amount paid'}</h2>
          <span
            className="text-lg font-bold px-3 py-1 rounded-full"
            style={{ backgroundColor: '#DCFCE7', color: '#166534' }}
          >
            € {totalPaid.toLocaleString()}
          </span>
        </div>

        {children.length === 0 ? (
          <p className="text-sm text-slate-500">{t('noChildren') || 'No children on file yet.'}</p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {children.map((c) => (
              <div key={c._id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">{c.firstName} {c.lastName}</p>
                  <p className="text-xs text-slate-500">
                    {t('level')} {c.level || '—'}
                  </p>
                </div>
                <span className="font-semibold">
                  € {(Number(c.paidAmount) || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-500 mt-3">
          {t('amountPaidNote') ||
            'This reflects payments recorded by the academy. Contact the office if anything looks off.'}
        </p>
      </div>
    </div>
  );
}
