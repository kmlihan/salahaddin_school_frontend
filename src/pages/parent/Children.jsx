import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';

export default function ParentChildren() {
  const { t } = useLang();
  const [children, setChildren] = useState([]);

  useEffect(() => { api.get('/parents/me/children').then((r) => setChildren(r.data)); }, []);

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{t('myChildren')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {children.length === 0 && <div className="card text-slate-500">—</div>}
        {children.map((c) => (
          <Link key={c._id} to={`/parent/children/${c._id}`} className="card flex items-center gap-4 hover:shadow-md transition">
            <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-xl">
              {c.photo ? <img src={c.photo} alt="" className="w-full h-full object-cover" /> : '👤'}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{c.firstName} {c.lastName}</p>
              <p className="text-xs text-slate-500">{t('level')} {c.level}</p>
            </div>
            <span className="text-slate-400">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
