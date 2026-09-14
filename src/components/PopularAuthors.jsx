import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchPopularAuthors } from "../firebase";

export default function PopularAuthors() {
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPopularAuthors(8).then((data) => {
      setAuthors(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="muted">Loading authors...</p>;
  if (!authors.length) return null;

  return (
    <div className="popular-authors">
      <h2>Popular Authors</h2>
      <div className="authors-grid">
        {authors.map((author) => (
          <Link to={`/author/${author.uid}`} key={author.uid} className="author-card">
            <div className="author-avatar">
              {author.photoURL ? (
                <img src={author.photoURL} alt={author.displayName} />
              ) : (
                <span>{(author.displayName || "?")[0].toUpperCase()}</span>
              )}
            </div>
            <div className="author-info">
              <span className="author-name">{author.displayName}</span>
              <span className="author-count">
                {author.themeCount} theme{author.themeCount !== 1 ? "s" : ""}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
