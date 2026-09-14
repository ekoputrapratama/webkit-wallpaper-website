import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getProfile, fetchThemesByUser } from "../firebase";

export default function AuthorProfile() {
  const { uid } = useParams();
  const [profile, setProfile] = useState(null);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [p, t] = await Promise.all([
        getProfile(uid),
        fetchThemesByUser(uid),
      ]);
      setProfile(p);
      setThemes(t);
      setLoading(false);
    }
    load();
  }, [uid]);

  if (loading) {
    return <p className="muted">Loading profile...</p>;
  }

  return (
    <div className="author-profile-page">
      <Link to="/" className="back-link">&larr; Back to themes</Link>

      <div className="author-profile-card">
        <div className="author-avatar-large">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt={profile.displayName} />
          ) : (
            <span>{(profile?.displayName || "?")[0].toUpperCase()}</span>
          )}
        </div>

        <h2>{profile?.displayName || "Unknown Author"}</h2>

        {profile?.bio && <p className="author-bio">{profile.bio}</p>}

        <p className="author-theme-count">
          {themes.length} theme{themes.length !== 1 ? "s" : ""} submitted
        </p>
      </div>

      {themes.length > 0 && (
        <div className="author-themes">
          <h3>Themes by {profile?.displayName || "this author"}</h3>
          <div className="author-theme-grid">
            {themes.map((t) => (
              <Link key={t.id} to={`/theme/${t.id}`} className="author-theme-card">
                {t.thumbnail_url ? (
                  <img
                    src={t.thumbnail_url}
                    alt={t.name}
                    className="author-theme-thumb"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : (
                  <div className="author-theme-thumb placeholder">No preview</div>
                )}
                <div className="author-theme-info">
                  <span className="author-theme-name">{t.name}</span>
                  {t.downloads > 0 && (
                    <span className="author-theme-dl">{t.downloads} downloads</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
