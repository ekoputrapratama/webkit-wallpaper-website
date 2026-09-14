import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchThemeById, getProfile, fetchLikeStatus, likeTheme, unlikeTheme, incrementDownload } from "../firebase";
import CommentsSection from "./CommentsSection";

export default function ThemeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [theme, setTheme] = useState(null);
  const [authorProfile, setAuthorProfile] = useState(null);
  const [likeState, setLikeState] = useState({ count: 0, liked: false });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchThemeById(id);
        if (!data) {
          setError("Theme not found.");
          setLoading(false);
          return;
        }
        setTheme(data);

        if (data.uid) {
          const profile = await getProfile(data.uid);
          setAuthorProfile(profile);
        }

        const status = await fetchLikeStatus(id, user?.uid || null);
        setLikeState(status);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user]);

  const handleLike = async () => {
    if (!user) return;
    if (likeState.liked) {
      const changed = await unlikeTheme(id, user.uid);
      if (changed) setLikeState((s) => ({ ...s, count: s.count - 1, liked: false }));
    } else {
      const changed = await likeTheme(id, user.uid);
      if (changed) setLikeState((s) => ({ ...s, count: s.count + 1, liked: true }));
    }
  };

  const handleDownload = async () => {
    if (!theme?.wallpaper_url) return;
    setDownloading(true);
    await incrementDownload(id);
    const a = document.createElement("a");
    a.href = theme.wallpaper_url;
    a.download = `${theme.name}.zip`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTheme((t) => ({ ...t, downloads: (t.downloads || 0) + 1 }));
    setDownloading(false);
  };

  if (loading) return <p className="muted">Loading theme...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!theme) return null;

  return (
    <div className="theme-detail">
      <Link to="/" className="back-link">&larr; Back to themes</Link>

      <div className="theme-detail-grid">
        <div className="theme-detail-preview">
          {theme.thumbnail_url ? (
            <img src={theme.thumbnail_url} alt={theme.name} className="detail-thumb" />
          ) : (
            <div className="detail-thumb placeholder">No preview</div>
          )}
        </div>

        <div className="theme-detail-info">
          <h2>{theme.name}</h2>

          {theme.author && (
            <p className="detail-author">
              by{" "}
              <Link to={`/author/${theme.uid}`} className="author-link">
                {authorProfile?.displayName || theme.author}
              </Link>
            </p>
          )}

          {theme.description && (
            <p className="detail-description">{theme.description}</p>
          )}

          {theme.tags?.length > 0 && (
            <div className="tags">
              {theme.tags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          )}

          <div className="detail-stats">
            <span>{theme.downloads || 0} downloads</span>
            <span>{likeState.count} likes</span>
          </div>

          <div className="detail-actions">
            <button
              className={`btn-primary ${likeState.liked ? "liked" : ""}`}
              onClick={handleLike}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={likeState.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {likeState.liked ? "Liked" : "Like"}
            </button>

            <button
              className="btn-primary btn-download"
              onClick={handleDownload}
              disabled={!theme.wallpaper_url || downloading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Theme
            </button>

            {user && theme.uid === user.uid && (
              <button
                className="btn-primary btn-edit"
                onClick={() => navigate(`/edit/${id}`)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Theme
              </button>
            )}
          </div>

          {theme.donation_url && (
            <a
              href={theme.donation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="donate-link"
            >
              {theme.donation_label || "Support Author"}
            </a>
          )}
        </div>
      </div>

      <CommentsSection themeId={id} user={user} />
    </div>
  );
}
