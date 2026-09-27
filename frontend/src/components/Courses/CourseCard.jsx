import { useDispatch } from "react-redux";
import { enrollInCourse } from "../../Redux/enrollmentSlice";
import { startCheckout } from "../../Redux/paymentSlice";

export default function CourseCard({ course }) {
  const dispatch = useDispatch();
  const isPaid = course.finalPrice > 0;

  return (
    <div className="paper-card overflow-hidden">
      {course.thumbnailUrl && <img src={course.thumbnailUrl} alt="" className="w-full h-40 object-cover" />}
      <div className="p-4">
        <h3 className="text-lg">{course.title}</h3>
        <p className="text-sm text-ink/70 mt-1 line-clamp-2">{course.description}</p>
        <p className="text-xs text-ink/50 mt-2">{course.lessonCount} lessons</p>
        <button
          onClick={() => (isPaid ? dispatch(startCheckout(course.id)) : dispatch(enrollInCourse(course.id)))}
          className="mt-3 w-full bg-brass hover:bg-brass-dark text-white py-2 rounded"
        >
          {isPaid ? `Purchase for ${course.finalPrice} EGP` : "Enroll for free"}
        </button>
      </div>
    </div>
  );
}
