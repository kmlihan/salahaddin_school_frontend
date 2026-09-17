import StudentNotesView from '../../components/StudentNotesView';
import { useLang } from '../../context/LanguageContext';

export default function TeacherStudentNotes() {
  const { t } = useLang();
  return <StudentNotesView backTo="/teacher/students" backLabel={t('students')} />;
}
