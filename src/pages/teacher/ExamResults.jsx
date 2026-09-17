import ExamResultsBrowser from '../../components/ExamResultsBrowser';
import { useLang } from '../../context/LanguageContext';

export default function TeacherExamResults() {
  const { t } = useLang();
  return <ExamResultsBrowser title={t('myResults')} detailPathPrefix="/teacher/exam-results" />;
}
