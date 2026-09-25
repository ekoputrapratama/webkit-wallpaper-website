import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProfile, fetchLikeStatus, likeTheme, unlikeTheme, incrementDownload } from "../firebase";

function AuthorAvatar({ uid }) {
  const [photoURL, setPhotoURL] = useState(null);

  useEffect(() => {
    if (!uid) return;
    getProfile(uid).then((p) => {
      if (p?.photoURL) setPhotoURL(p.photoURL);
    });
  }, [uid]);

  if (photoURL) {
    return <img src={photoURL} alt="" className="card-avatar" />;
  }
  return null;
}

export default function ThemeCard({ theme, user, showOwnerActions, onDelete }) {
  const navigate = useNavigate();
  const [likeState, setLikeState] = useState({ count: theme.likes || 0, liked: false });
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchLikeStatus(theme.id, user.uid).then(setLikeState);
  }, [theme.id, user]);

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    if (likeState.liked) {
      const changed = await unlikeTheme(theme.id, user.uid);
      if (changed) setLikeState((s) => ({ ...s, count: s.count - 1, liked: false }));
    } else {
      const changed = await likeTheme(theme.id, user.uid);
      if (changed) setLikeState((s) => ({ ...s, count: s.count + 1, liked: true }));
    }
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!theme.wallpaper_url) return;
    setDownloading(true);
    await incrementDownload(theme.id);
    const a = document.createElement("a");
    a.href = theme.wallpaper_url;
    a.download = `${theme.name}.zip`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloading(false);
  };

  const handleDonate = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!theme.donation_url) return;
    window.open(theme.donation_url, "_blank", "noopener,noreferrer");
  };

  const isOwner = showOwnerActions && user && theme.uid === user.uid;

  return (
    <Link to={`/theme/${theme.id}`} className="card">
      {theme.thumbnail_url ? (
        <img
          src={theme.thumbnail_url}
          alt={theme.name}
          className="thumb"
          onError={(e) => (e.target.style.display = "none")}
        />
      ) : (
        <div className="thumb placeholder">No preview</div>
      )}
      <div className="card-body">
        <h3>{theme.name}</h3>
        {theme.author && (
          <p className="author">
            <AuthorAvatar uid={theme.uid} />
            <span className="author-name-text">{theme.author}</span>
          </p>
        )}
        {theme.description && (
          <p className="desc">{theme.description}</p>
        )}
        {theme.tags?.length > 0 && (
          <div className="tags">
            {theme.tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
        <div className="card-actions">
          <button
            className={`like-btn ${likeState.liked ? "liked" : ""}`}
            onClick={handleLike}
            title={user ? (likeState.liked ? "Unlike" : "Like") : "Sign in to like"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={likeState.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>{likeState.count}</span>
          </button>

          <button
            className="download-btn"
            onClick={handleDownload}
            disabled={!theme.wallpaper_url || downloading}
            title="Download theme"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{theme.downloads || 0}</span>
          </button>

          {theme.donation_url && (
            <button
              className="donate-btn"
              onClick={handleDonate}
              title="Donate to author"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 2v2" />
                <path d="M14 2v2" />
                <path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" />
                <path d="M6 2v2" />
              </svg>
              <span>Donate</span>
            </button>
          )}

          {isOwner && (
            <>
              <button
                className="edit-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/edit/${theme.id}`);
                }}
              >
                Edit
              </button>
              {onDelete && (
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(theme.id, theme.name);
                  }}
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
