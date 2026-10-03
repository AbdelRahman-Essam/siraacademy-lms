import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyEnrollments } from "../Redux/enrollmentSlice";
import LaurelDivider from "../components/Elements/LaurelDivider";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const enrollments = useSelector((s) => s.enrollment.mine);

  useEffect(() => { dispatch(fetchMyEnrollments()); }, [dispatch]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl text-center">My Courses</h1>
      <div className="flex justify-center"><LaurelDivider /></div>
      <div className="mt-8 space-y-3">
        {enrollments.length === 0 && <p className="text-center text-ink/60">You're not enrolled in anything yet.</p>}
        {enrollments.map((e) => (
          <Link key={e._id} to={`/courses/${e.course._id}`} className="paper-card p-4 flex items-center gap-4 hover:bg-parchment-dark">
            {e.course.thumbnailUrl && <img src={e.course.thumbnailUrl} alt="" className="w-16 h-16 object-cover rounded" />}
            <div>
              <p className="font-medium">{e.course.title}</p>
              <p className="text-xs text-ink/50">Unlocked through lesson {e.unlockedLessonOrder}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
