import { useState, useEffect } from "react";
import { fetchThemes, deleteTheme } from "../firebase";
import ThemeCard from "./ThemeCard";

export default function ThemeList({ user }) {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchThemes();
      setThemes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteTheme(id);
      setThemes((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  if (loading) return <p className="muted">Loading themes...</p>;
  if (error) return <p className="error">Error: {error}</p>;
  if (!themes.length) return <p className="muted">No themes submitted yet.</p>;

  return (
    <div className="theme-list">
      <h2>Submitted Themes ({themes.length})</h2>
      <div className="grid">
        {themes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            user={user}
            showOwnerActions={true}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
