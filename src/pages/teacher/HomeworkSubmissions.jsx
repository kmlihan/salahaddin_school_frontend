import HomeworkSubmissionsView from '../../components/HomeworkSubmissionsView';
import { useLang } from '../../context/LanguageContext';

export default function TeacherHomeworkSubmissions() {
  const { t } = useLang();
  return <HomeworkSubmissionsView backTo="/teacher/homeworks" backLabel={t('homeworks')} />;
}
