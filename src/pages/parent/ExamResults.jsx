import ExamResultsBrowser from '../../components/ExamResultsBrowser';
import { useLang } from '../../context/LanguageContext';

export default function ParentExamResults() {
  const { t } = useLang();
  return <ExamResultsBrowser title={t('myResults')} detailPathPrefix="/parent/exam-results" />;
}
