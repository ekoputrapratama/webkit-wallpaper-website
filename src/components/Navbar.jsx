import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logout } from "../firebase";

export default function Navbar() {
  const { user } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          WebKit Wallpaper
        </Link>

        <div className="navbar-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Home
          </NavLink>

          {user ? (
            <>
              <NavLink to="/submit" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                Submit
              </NavLink>
              <NavLink to="/manage" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                Manage
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                Profile
              </NavLink>
              <div className="navbar-user">
                <span className="navbar-user-name">
                  {user.displayName || user.email}
                </span>
                <button className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                Sign In
              </NavLink>
              <NavLink to="/register" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                Register
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
