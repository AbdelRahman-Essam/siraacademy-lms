import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import TeacherRoute from './components/TeacherRoute'
import TeacherLayout from './components/TeacherLayout'
import AdminRoute from './components/AdminRoute'
import AdminLayout from './components/AdminLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Courses from './pages/Courses'
import PaymentResult from './pages/PaymentResult'
import CourseDetail from './pages/CourseDetail'
import TeacherLiveSessions from './pages/teacher/TeacherLiveSessions'
import TeacherRecords from './pages/teacher/TeacherRecords'
import TeacherGrading from './pages/teacher/TeacherGrading'
import AdminDashboard from './pages/admin/AdminDashboard'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <Courses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments/result"
            element={
              <ProtectedRoute>
                <PaymentResult />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:courseId"
            element={
              <ProtectedRoute>
                <CourseDetail />
              </ProtectedRoute>
            }
          />

          {/* Teacher — meeting links, student records, grading. NO content access. */}
          <Route
            path="/teacher"
            element={
              <TeacherRoute>
                <TeacherLayout />
              </TeacherRoute>
            }
          >
            <Route index element={<Navigate to="live-sessions" replace />} />
            <Route path="live-sessions" element={<TeacherLiveSessions />} />
            <Route path="records" element={<TeacherRecords />} />
            <Route path="grading" element={<TeacherGrading />} />
          </Route>

          {/* Admin — full course/lesson management + media uploads, single dashboard. */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
