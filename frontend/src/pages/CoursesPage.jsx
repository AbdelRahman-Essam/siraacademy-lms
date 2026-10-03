import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCatalog } from "../Redux/courseSlice";
import CourseCard from "../components/Courses/CourseCard";
import LaurelDivider from "../components/Elements/LaurelDivider";

export default function CoursesPage() {
  const dispatch = useDispatch();
  const catalog = useSelector((s) => s.course.catalog);

  useEffect(() => { dispatch(fetchCatalog()); }, [dispatch]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl text-center">Our Courses</h1>
      <div className="flex justify-center"><LaurelDivider /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {catalog.map((c) => <CourseCard key={c.id} course={c} />)}
      </div>
    </div>
  );
}
