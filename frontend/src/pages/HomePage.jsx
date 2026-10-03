import { Link } from "react-router-dom";
import LaurelDivider from "../components/Elements/LaurelDivider";

export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <h1 className="text-4xl">Sira English</h1>
      <LaurelDivider />
      <p className="mt-4 text-ink/70">English & programming lessons, taught live and on your own time.</p>
      <Link to="/courses" className="inline-block mt-6 bg-brand text-white px-6 py-3 rounded">
        Browse courses
      </Link>
    </div>
  );
}
