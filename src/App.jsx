import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import StudentThemeBackground from './components/StudentThemeBackground';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import NewsList from './pages/NewsList';
import NewsDetail from './pages/NewsDetail';

import StudentDashboard from './pages/student/Dashboard';
import StudentLessons from './pages/student/Lessons';
import LessonView from './pages/student/LessonView';
import StudentExams from './pages/student/Exams';
import ExamTaker from './pages/student/ExamTaker';
import StudentResults from './pages/student/Results';
import StudentHomeworks from './pages/student/Homeworks';
import StudentHomeworkDo from './pages/student/HomeworkDo';
import StudentCultureQuiz from './pages/student/CultureQuiz';
import StudentCalendar from './pages/student/Calendar';

import AdminDashboard from './pages/admin/Dashboard';
import AdminTeachers from './pages/admin/Teachers';
import AdminParents from './pages/admin/Parents';
import AdminStudents from './pages/admin/Students';
import AdminStudentNotes from './pages/admin/StudentNotes';
import AdminLessons from './pages/admin/Lessons';
import AdminExams from './pages/admin/Exams';
import AdminExamResults from './pages/admin/ExamResults';
import AdminExamResultDetail from './pages/admin/ExamResultDetail';
import AdminNews from './pages/admin/News';
import AdminPayments from './pages/admin/Payments';
import AdminCalendar from './pages/admin/Calendar';
import AdminAttendance from './pages/admin/Attendance';
import AdminTeacherAttendance from './pages/admin/TeacherAttendance';
import AdminHomeworks from './pages/admin/Homeworks';
import AdminHomeworkSubmissions from './pages/admin/HomeworkSubmissions';
import AdminCultureSections from './pages/admin/CultureSections';
import AdminCultureQuestions from './pages/admin/CultureQuestions';
import AdminRegistrations from './pages/admin/Registrations';

import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherLessons from './pages/teacher/Lessons';
import TeacherExams from './pages/teacher/Exams';
import TeacherExamResults from './pages/teacher/ExamResults';
import TeacherExamResultDetail from './pages/teacher/ExamResultDetail';
import TeacherStudents from './pages/teacher/Students';
import TeacherStudentNotes from './pages/teacher/StudentNotes';
import TeacherCalendar from './pages/teacher/Calendar';
import TeacherAttendance from './pages/teacher/Attendance';
import TeacherHomeworks from './pages/teacher/Homeworks';
import TeacherHomeworkSubmissions from './pages/teacher/HomeworkSubmissions';

import ParentDashboard from './pages/parent/Dashboard';
import ParentChildren from './pages/parent/Children';
import ParentChildDetail from './pages/parent/ChildDetail';
import ParentExams from './pages/parent/Exams';
import ParentExamResults from './pages/parent/ExamResults';
import ParentExamResultDetail from './pages/parent/ExamResultDetail';
import ParentHomeworks from './pages/parent/Homeworks';
import ParentCultureQuiz from './pages/parent/CultureQuiz';
import ParentCalendar from './pages/parent/Calendar';
import ParentAttendance from './pages/parent/Attendance';

function HomeRedirect() {
  // Logged-in users land on their role dashboard; others see the public landing.
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Landing />;
  return <Navigate to={`/${role}`} replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <StudentThemeBackground />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/news" element={<NewsList />} />
          <Route path="/news/:id" element={<NewsDetail />} />

          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Student */}
          <Route path="/student" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/lessons" element={<ProtectedRoute roles={['student']}><StudentLessons /></ProtectedRoute>} />
          <Route path="/student/lessons/:id" element={<ProtectedRoute roles={['student']}><LessonView /></ProtectedRoute>} />
          <Route path="/student/exams" element={<ProtectedRoute roles={['student']}><StudentExams /></ProtectedRoute>} />
          <Route path="/student/exams/:id" element={<ProtectedRoute roles={['student']}><ExamTaker /></ProtectedRoute>} />
          <Route path="/student/results" element={<ProtectedRoute roles={['student']}><StudentResults /></ProtectedRoute>} />
          <Route path="/student/homeworks" element={<ProtectedRoute roles={['student']}><StudentHomeworks /></ProtectedRoute>} />
          <Route path="/student/homeworks/:id" element={<ProtectedRoute roles={['student']}><StudentHomeworkDo /></ProtectedRoute>} />
          <Route path="/student/culture-quiz" element={<ProtectedRoute roles={['student']}><StudentCultureQuiz /></ProtectedRoute>} />
          <Route path="/student/calendar" element={<ProtectedRoute roles={['student']}><StudentCalendar /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/teachers" element={<ProtectedRoute roles={['admin']}><AdminTeachers /></ProtectedRoute>} />
          <Route path="/admin/parents" element={<ProtectedRoute roles={['admin']}><AdminParents /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute roles={['admin']}><AdminStudents /></ProtectedRoute>} />
          <Route path="/admin/students/:id/notes" element={<ProtectedRoute roles={['admin']}><AdminStudentNotes /></ProtectedRoute>} />
          <Route path="/admin/lessons" element={<ProtectedRoute roles={['admin']}><AdminLessons /></ProtectedRoute>} />
          <Route path="/admin/exams" element={<ProtectedRoute roles={['admin']}><AdminExams /></ProtectedRoute>} />
          <Route path="/admin/exam-results" element={<ProtectedRoute roles={['admin']}><AdminExamResults /></ProtectedRoute>} />
          <Route path="/admin/exam-results/:id" element={<ProtectedRoute roles={['admin']}><AdminExamResultDetail /></ProtectedRoute>} />
          <Route path="/admin/news" element={<ProtectedRoute roles={['admin']}><AdminNews /></ProtectedRoute>} />
          
          <Route path="/admin/calendar" element={<ProtectedRoute roles={['admin']}><AdminCalendar /></ProtectedRoute>} />
          <Route path="/admin/attendance" element={<ProtectedRoute roles={['admin']}><AdminAttendance /></ProtectedRoute>} />
          <Route path="/admin/teacher-attendance" element={<ProtectedRoute roles={['admin']}><AdminTeacherAttendance /></ProtectedRoute>} />
          <Route path="/admin/homeworks" element={<ProtectedRoute roles={['admin']}><AdminHomeworks /></ProtectedRoute>} />
          <Route path="/admin/homeworks/:id/submissions" element={<ProtectedRoute roles={['admin']}><AdminHomeworkSubmissions /></ProtectedRoute>} />
          <Route path="/admin/culture" element={<ProtectedRoute roles={['admin']}><AdminCultureSections /></ProtectedRoute>} />
          <Route path="/admin/culture/sections/:id/questions" element={<ProtectedRoute roles={['admin']}><AdminCultureQuestions /></ProtectedRoute>} />
          <Route path="/admin/registrations" element={<ProtectedRoute roles={['admin']}><AdminRegistrations /></ProtectedRoute>} />

          {/* Teacher */}
          <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/lessons" element={<ProtectedRoute roles={['teacher']}><TeacherLessons /></ProtectedRoute>} />
          <Route path="/teacher/exams" element={<ProtectedRoute roles={['teacher']}><TeacherExams /></ProtectedRoute>} />
          <Route path="/teacher/exam-results" element={<ProtectedRoute roles={['teacher']}><TeacherExamResults /></ProtectedRoute>} />
          <Route path="/teacher/exam-results/:id" element={<ProtectedRoute roles={['teacher']}><TeacherExamResultDetail /></ProtectedRoute>} />
          <Route path="/teacher/students" element={<ProtectedRoute roles={['teacher']}><TeacherStudents /></ProtectedRoute>} />
          <Route path="/teacher/students/:id/notes" element={<ProtectedRoute roles={['teacher']}><TeacherStudentNotes /></ProtectedRoute>} />
          <Route path="/teacher/homeworks" element={<ProtectedRoute roles={['teacher']}><TeacherHomeworks /></ProtectedRoute>} />
          <Route path="/teacher/homeworks/:id/submissions" element={<ProtectedRoute roles={['teacher']}><TeacherHomeworkSubmissions /></ProtectedRoute>} />
          <Route path="/teacher/calendar" element={<ProtectedRoute roles={['teacher']}><TeacherCalendar /></ProtectedRoute>} />
          <Route path="/teacher/attendance" element={<ProtectedRoute roles={['teacher']}><TeacherAttendance /></ProtectedRoute>} />

          {/* Parent */}
          <Route path="/parent" element={<ProtectedRoute roles={['parent']}><ParentDashboard /></ProtectedRoute>} />
          <Route path="/parent/children" element={<ProtectedRoute roles={['parent']}><ParentChildren /></ProtectedRoute>} />
          <Route path="/parent/children/:id" element={<ProtectedRoute roles={['parent']}><ParentChildDetail /></ProtectedRoute>} />
          <Route path="/parent/exams" element={<ProtectedRoute roles={['parent']}><ParentExams /></ProtectedRoute>} />
          <Route path="/parent/exam-results" element={<ProtectedRoute roles={['parent']}><ParentExamResults /></ProtectedRoute>} />
          <Route path="/parent/exam-results/:id" element={<ProtectedRoute roles={['parent']}><ParentExamResultDetail /></ProtectedRoute>} />
          <Route path="/parent/homeworks" element={<ProtectedRoute roles={['parent']}><ParentHomeworks /></ProtectedRoute>} />
          <Route path="/parent/culture-quiz" element={<ProtectedRoute roles={['parent']}><ParentCultureQuiz /></ProtectedRoute>} />
          <Route path="/parent/calendar" element={<ProtectedRoute roles={['parent']}><ParentCalendar /></ProtectedRoute>} />
          <Route path="/parent/attendance" element={<ProtectedRoute roles={['parent']}><ParentAttendance /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
