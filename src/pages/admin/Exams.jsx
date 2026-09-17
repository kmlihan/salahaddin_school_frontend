import CrudTable from '../../components/CrudTable';
import ExamForm from '../../components/ExamForm';
import { useLang } from '../../context/LanguageContext';

const empty = {
  title: { en: '', ar: '', nl: '' },
  section: 'Arabic',
  level: 'A',
  type: 'lessons',
  passingGrade: 50,
  questions: [],
};

export default function AdminExams() {
  const { t, ml } = useLang();
  return (
    <CrudTable
      title={t('exams')}
      endpoint="/exams"
      emptyForm={empty}
      columns={[
        { label: t('tableTitle'), render: (it) => ml(it.title) },
        { label: t('section'), render: (it) => it.section },
        { label: t('level'), render: (it) => it.level },
        { label: t('tableType'), render: (it) => it.type },
        { label: t('tableQuestions'), render: (it) => (it.questions || []).length },
        { label: t('tablePassPct'), render: (it) => `${it.passingGrade}%` },
      ]}
      Form={ExamForm}
    />
  );
}
