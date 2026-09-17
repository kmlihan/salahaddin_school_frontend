import ExamResultsBrowser from '../../components/ExamResultsBrowser';
import { useLang } from '../../context/LanguageContext';

export default function AdminExamResults() {
  const { t } = useLang();
  return <ExamResultsBrowser title={t('exams') + ' — ' + t('myResults')} detailPathPrefix="/admin/exam-results" />;
}
