import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../Redux/userSlice";

export default function Navbar() {
  const user = useSelector((s) => s.user.user);
  const dispatch = useDispatch();

  return (
    <nav className="bg-brand text-parchment px-6 py-4 flex items-center justify-between">
      <Link to="/" className="font-display text-xl tracking-wide">Sira English</Link>
      <div className="flex items-center gap-6 font-body text-sm">
        <Link to="/courses">Courses</Link>
        {user && <Link to="/dashboard">My Courses</Link>}
        {user?.role === "teacher" && <Link to="/teacher">Teacher Panel</Link>}
        {user?.role === "admin" && <Link to="/admin">Admin</Link>}
        {user ? (
          <button onClick={() => dispatch(logout())} className="text-brass-light hover:text-brass">
            Log out
          </button>
        ) : (
          <Link to="/login" className="text-brass-light hover:text-brass">Log in</Link>
        )}
      </div>
    </nav>
  );
}
