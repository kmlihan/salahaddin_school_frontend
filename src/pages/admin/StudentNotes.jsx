import StudentNotesView from '../../components/StudentNotesView';
import { useLang } from '../../context/LanguageContext';

export default function AdminStudentNotes() {
  const { t } = useLang();
  return <StudentNotesView backTo="/admin/students" backLabel={t('students')} />;
}
