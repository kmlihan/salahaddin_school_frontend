import { useNavigate } from 'react-router-dom';
import CrudTable from '../../components/CrudTable';
import HomeworkForm from '../../components/HomeworkForm';
import { useLang } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

const empty = {
  kind: 'writing',
  title: { en: '', ar: '', nl: '' },
  instructions: { en: '', ar: '', nl: '' },
  level: 'A',
  dueDate: '',
  prompts: [],
};

export default function TeacherHomeworks() {
  const { t, ml } = useLang();
  const { user } = useAuth();
  const nav = useNavigate();

  const kindLabel = (k) =>
    k === 'writing' ? t('writing')
    : k === 'recordedReading' ? t('recordedReading')
    : k === 'bookReading' ? t('bookReading')
    : k;

  // Teachers can edit / delete only homeworks they created themselves.
  // The server enforces this regardless; hiding the buttons keeps the UI
  // honest so other teachers' rows just look read-only.
  const canModify = (it) => {
    const teacherId = it.teacher?._id || it.teacher;
    return String(teacherId) === String(user?._id);
  };

  return (
    <CrudTable
      title={t('homeworks')}
      endpoint="/homeworks"
      emptyForm={empty}
      canModify={canModify}
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
          onClick={() => nav(`/teacher/homeworks/${it._id}/submissions`)}
          title={t('submissions')}
        >
          {t('submissions')}
        </button>
      )}
    />
  );
}
