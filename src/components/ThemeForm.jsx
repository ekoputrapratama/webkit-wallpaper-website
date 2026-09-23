import { useState, useRef, useEffect } from "react";
import { submitTheme, updateTheme, getProfile, fetchThemeById } from "../firebase";
import { CrafyImageCompressJS } from "../vendor/CrafyImageCompressJS";

const GIF_WORKER_URL = `${import.meta.env.BASE_URL}gif.worker.js`;
const PREVIEW_MAX_WIDTH = 240;
const PREVIEW_QUALITY = 0.7;

export default function ThemeForm({ user, onSubmitted, themeId }) {
  const isEdit = Boolean(themeId);
  const [form, setForm] = useState({
    name: "",
    description: "",
    tags: "",
    donationUrl: "",
  });
  const [authorName, setAuthorName] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [existingThumbnail, setExistingThumbnail] = useState("");
  const [wallpaperFile, setWallpaperFile] = useState(null);
  const [existingWallpaper, setExistingWallpaper] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [uploadProgress, setUploadProgress] = useState("");
  const thumbInputRef = useRef(null);
  const wallInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    getProfile(user.uid).then((p) => {
      setAuthorName(p?.displayName || user.displayName || user.email || "");
    });
  }, [user]);

  useEffect(() => {
    if (!themeId) return;
    setInitialLoading(true);
    fetchThemeById(themeId)
      .then((theme) => {
        if (!theme) {
          setStatus({ ok: false, msg: "Theme not found." });
          return;
        }
        if (theme.uid !== user?.uid) {
          setStatus({ ok: false, msg: "You can only edit your own themes." });
          return;
        }
        setForm({
          name: theme.name || "",
          description: theme.description || "",
          tags: (theme.tags || []).join(", "),
          donationUrl: theme.donation_url || "",
        });
        if (theme.thumbnail_url) {
          setThumbnailPreview(theme.thumbnail_url);
          setExistingThumbnail(theme.thumbnail_url);
        }
        if (theme.wallpaper_url) {
          setExistingWallpaper(theme.wallpaper_url);
        }
      })
      .catch((err) => {
        setStatus({ ok: false, msg: `Error loading theme: ${err.message}` });
      })
      .finally(() => {
        setInitialLoading(false);
      });
  }, [themeId, user]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleThumbnail = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ ok: false, msg: "Thumbnail must be an image file." });
      return;
    }
    setStatus(null);

    const setOriginal = () => {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setThumbnailPreview(ev.target.result);
      reader.readAsDataURL(file);
    };

    setUploadProgress("Compressing preview image...");
    try {
      const compressor = new CrafyImageCompressJS(file, file.type, GIF_WORKER_URL);
      const compressed = await compressor.compressImage(PREVIEW_QUALITY, PREVIEW_MAX_WIDTH);
      const thumbFile = new File(
        [compressed],
        file.type === "image/gif" ? `preview.gif` : `preview.webp`,
        { type: compressed.type }
      );

      if (thumbFile.size >= file.size) {
        setOriginal();
      } else {
        setThumbnailFile(thumbFile);
        setThumbnailPreview(URL.createObjectURL(thumbFile));
      }
    } catch {
      setOriginal();
    } finally {
      setUploadProgress("");
    }
  };

  const handleWallpaper = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      setStatus({ ok: false, msg: "Wallpaper must be a .zip file." });
      return;
    }
    setWallpaperFile(file);
    setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) {
      setStatus({ ok: false, msg: "Name is required." });
      return;
    }
    if (!isEdit && !wallpaperFile) {
      setStatus({ ok: false, msg: "Please select a wallpaper .zip file." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      setUploadProgress("Uploading files...");

      if (isEdit) {
        await updateTheme(themeId, { ...form, tags, author: authorName }, {
          thumbnailFile,
          wallpaperFile,
          uid: user?.uid || "",
          existingThumbnail,
          existingWallpaper,
        });
        setStatus({ ok: true, msg: "Theme updated successfully!" });
      } else {
        await submitTheme(
          { ...form, tags, author: authorName },
          { thumbnailFile, wallpaperFile, uid: user?.uid || "" }
        );
        setStatus({ ok: true, msg: "Theme submitted successfully!" });
        setForm({
          name: "",
          description: "",
          tags: "",
          donationUrl: "",
        });
        setThumbnailFile(null);
        setThumbnailPreview(null);
        setWallpaperFile(null);
        setExistingThumbnail("");
        setExistingWallpaper("");
        if (thumbInputRef.current) thumbInputRef.current.value = "";
        if (wallInputRef.current) wallInputRef.current.value = "";
      }

      onSubmitted?.();
    } catch (err) {
      setStatus({ ok: false, msg: `Error: ${err.message}` });
    } finally {
      setLoading(false);
      setUploadProgress("");
    }
  };

  if (initialLoading) return <p className="muted">Loading theme data...</p>;

  return (
    <form className="theme-form" onSubmit={handleSubmit} noValidate>
      <h2>{isEdit ? "Edit Theme" : "Submit New Theme"}</h2>

      <div className="field">
        <label htmlFor="author">Author</label>
        <input id="author" type="text" value={authorName} disabled />
        <span className="hint">From your profile. Edit it in the Profile tab.</span>
      </div>

      <div className="field">
        <label htmlFor="name">Name *</label>
        <input
          id="name"
          type="text"
          value={form.name}
          onChange={set("name")}
          placeholder="My Awesome Theme"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={form.description}
          onChange={set("description")}
          placeholder="A short description of the theme..."
          rows={3}
        />
      </div>

      <div className="field">
        <label htmlFor="thumbnail">Thumbnail Image</label>
        <div className="file-row">
          <input
            ref={thumbInputRef}
            id="thumbnail"
            type="file"
            accept="image/*"
            onChange={handleThumbnail}
          />
          {thumbnailPreview && (
            <img src={thumbnailPreview} alt="Preview" className="thumb-preview" />
          )}
        </div>
        <span className="hint">
          PNG, JPG, or SVG — preview image for the store.
          <br />
          Auto-resized to a 240px WEBP preview before upload.
        </span>
      </div>

      <div className="field">
        <label htmlFor="wallpaper">Wallpaper .zip {!isEdit && "*"}</label>
        <input
          ref={wallInputRef}
          id="wallpaper"
          type="file"
          accept=".zip"
          onChange={handleWallpaper}
          required={!isEdit}
        />
        <span className="hint">
          Zip file containing index.html and all theme assets.
          <br />
          The zip will be uploaded to Firebase Storage.
          {isEdit && <><br />Leave empty to keep the current file.</>}
        </span>
        {wallpaperFile && (
          <span className="hint ok-hint">
            Selected: {wallpaperFile.name} ({(wallpaperFile.size / 1024).toFixed(0)} KB)
          </span>
        )}
        {isEdit && !wallpaperFile && existingWallpaper && (
          <span className="hint">Current file will be kept.</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="tags">Tags</label>
        <input
          id="tags"
          type="text"
          value={form.tags}
          onChange={set("tags")}
          placeholder="shader, animated, dark (comma separated)"
        />
      </div>

      <fieldset className="donation-fieldset">
        <legend>Donation (optional)</legend>
        <div className="field">
          <label htmlFor="donationUrl">Donation URL</label>
          <input
            id="donationUrl"
            type="url"
            value={form.donationUrl}
            onChange={set("donationUrl")}
            placeholder="https://ko-fi.com/yourname"
          />
          <span className="hint">
            Ko-fi, Buy Me a Coffee, PayPal, GitHub Sponsors, etc.
          </span>
        </div>
      </fieldset>

      {status && (
        <div className={`status ${status.ok ? "ok" : "err"}`}>{status.msg}</div>
      )}

      {uploadProgress && (
        <div className="preloader-overlay" role="status" aria-live="polite">
          <div className="preloader">
            <div className="spinner" />
            <p>{uploadProgress}</p>
          </div>
        </div>
      )}

      <button type="submit" disabled={loading}>
        {loading ? (isEdit ? "Updating..." : "Submitting...") : (isEdit ? "Update Theme" : "Submit Theme")}
      </button>
    </form>
  );
}
