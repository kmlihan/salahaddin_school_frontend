import HomeworkSubmissionsView from '../../components/HomeworkSubmissionsView';
import { useLang } from '../../context/LanguageContext';

export default function AdminHomeworkSubmissions() {
  const { t } = useLang();
  return <HomeworkSubmissionsView backTo="/admin/homeworks" backLabel={t('homeworks')} />;
}
