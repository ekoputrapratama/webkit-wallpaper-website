import { useState, useEffect, useMemo } from "react";
import { fetchThemes } from "../firebase";
import { useAuth } from "../context/AuthContext";
import ThemeCard from "./ThemeCard";
import PopularAuthors from "./PopularAuthors";

export default function HomePage() {
  const { user } = useAuth();
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    fetchThemes().then((data) => {
      setThemes(data);
      setLoading(false);
    });
  }, []);

  const filteredThemes = useMemo(() => {
    let result = themes;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name?.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q)) ||
          t.author?.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "downloads":
          return (b.downloads || 0) - (a.downloads || 0);
        case "likes":
          return (b.likes || 0) - (a.likes || 0);
        case "newest":
        default: {
          const da = a.created_at?.seconds || 0;
          const db = b.created_at?.seconds || 0;
          return db - da;
        }
      }
    });

    return result;
  }, [themes, search, sortBy]);

  const allTags = useMemo(() => {
    const tagSet = new Set();
    themes.forEach((t) => t.tags?.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [themes]);

  const handleTagClick = (tag) => {
    setSearch(tag);
  };

  if (loading) {
    return <p className="muted">Loading themes...</p>;
  }

  return (
    <div className="home-page">
      <div className="home-hero">
        <h2>WebKit Wallpaper Themes</h2>
        <p className="subtitle">Browse and download community-created themes</p>
      </div>

      <div className="search-bar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search by name, tag, or author..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="search-clear" onClick={() => setSearch("")}>
            &times;
          </button>
        )}
      </div>

      <div className="sort-bar">
        <span className="sort-label">Sort by</span>
        <div className="sort-options">
          {[
            { value: "newest", label: "Newest" },
            { value: "downloads", label: "Most Downloaded" },
            { value: "likes", label: "Most Liked" },
          ].map((opt) => (
            <button
              key={opt.value}
              className={`sort-btn ${sortBy === opt.value ? "active" : ""}`}
              onClick={() => setSortBy(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="tag-filter">
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`filter-tag ${search.toLowerCase() === tag.toLowerCase() ? "active" : ""}`}
              onClick={() => handleTagClick(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {filteredThemes.length === 0 ? (
        <p className="muted">
          {search ? `No themes found for "${search}".` : "No themes submitted yet."}
        </p>
      ) : (
        <div className="grid">
          {filteredThemes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              user={user}
              showOwnerActions={false}
            />
          ))}
        </div>
      )}

      <PopularAuthors />
    </div>
  );
}
