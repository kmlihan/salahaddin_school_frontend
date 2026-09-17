import { useNavigate } from 'react-router-dom';
import CrudTable from '../../components/CrudTable';
import HomeworkForm from '../../components/HomeworkForm';
import { useLang } from '../../context/LanguageContext';

const empty = {
  kind: 'writing',
  title: { en: '', ar: '', nl: '' },
  instructions: { en: '', ar: '', nl: '' },
  level: 'A',
  dueDate: '',
  prompts: [],
};

export default function AdminHomeworks() {
  const { t, ml } = useLang();
  const nav = useNavigate();
  const kindLabel = (k) =>
    k === 'writing' ? t('writing')
    : k === 'recordedReading' ? t('recordedReading')
    : k === 'bookReading' ? t('bookReading')
    : k;

  return (
    <CrudTable
      title={t('homeworks')}
      endpoint="/homeworks"
      emptyForm={empty}
      columns={[
        { label: t('tableTitle'), render: (it) => ml(it.title) },
        { label: t('kind'),       render: (it) => kindLabel(it.kind) },
        { label: t('level'),      render: (it) => it.level },
        { label: t('teacher'),    render: (it) =>
            it.teacher
              ? `${it.teacher.firstName || ''} ${it.teacher.lastName || ''}`.trim() || '—'
              : '—' },
        { label: t('dueDate'),    render: (it) => it.dueDate ? new Date(it.dueDate).toLocaleDateString() : '—' },
      ]}
      Form={HomeworkForm}
      extraRowActions={(it) => (
        <button
          className="btn btn-primary text-xs"
          onClick={() => nav(`/admin/homeworks/${it._id}/submissions`)}
          title={t('submissions')}
        >
          {t('submissions')}
        </button>
      )}
    />
  );
}
