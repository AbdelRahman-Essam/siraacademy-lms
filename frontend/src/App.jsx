import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import Login from "./components/Auth/Login";
import UploadProgressBar from "./components/Admin/UploadProgressBar";

// Pages beyond Login (Courses catalog, CourseDetail, Dashboard, Admin tabs,
// TeacherPanel, PaymentResult) follow the same pattern as Login/CourseCard
// above — left to be filled in as this scaffold is built out further.

function Placeholder({ title }) {
  return <div className="p-10 text-center text-ink/60">{title} — page to be wired up</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="min-h-[70vh]">
        <Routes>
          <Route path="/" element={<Placeholder title="Home" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/courses" element={<Placeholder title="Courses catalog" />} />
          <Route path="/dashboard" element={<Placeholder title="My Courses" />} />
          <Route path="/admin" element={<UploadProgressBar />} />
          <Route path="/teacher" element={<Placeholder title="Teacher Panel" />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
