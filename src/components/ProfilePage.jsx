import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getProfile,
  saveProfile,
  uploadAvatar,
  updateAuthProfile,
  updateAuthEmail,
} from "../firebase";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ displayName: "", bio: "", photoURL: "" });
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    getProfile(user.uid).then((p) => {
      if (p) {
        setProfile(p);
        setDisplayName(p.displayName || user.displayName || "");
        setBio(p.bio || "");
        setAvatarPreview(p.photoURL || user.photoURL || "");
      } else {
        setDisplayName(user.displayName || "");
        setEmail(user.email || "");
      }
    });
    setEmail(user.email || "");
    setNewEmail(user.email || "");
  }, [user]);

  const handleAvatar = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      let photoURL = profile.photoURL || "";
      if (avatarFile) {
        photoURL = await uploadAvatar(user.uid, avatarFile);
      }

      await saveProfile(user.uid, { displayName, bio, photoURL });
      await updateAuthProfile(displayName, photoURL);

      setProfile({ ...profile, displayName, bio, photoURL });
      setStatus({ ok: true, msg: "Profile updated." });
    } catch (err) {
      setStatus({ ok: false, msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setStatus({ ok: false, msg: "Enter your current password to change email." });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await updateAuthEmail(newEmail, currentPassword);
      await saveProfile(user.uid, { email: newEmail });
      setEmail(newEmail);
      setCurrentPassword("");
      setStatus({ ok: true, msg: "Email updated." });
    } catch (err) {
      setStatus({ ok: false, msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const photoURL = avatarPreview || profile.photoURL || "";

  return (
    <div className="profile-page">
      <h2>Edit Profile</h2>

      <form className="profile-form" onSubmit={handleSaveProfile}>
        <div className="profile-avatar-section">
          <div
            className="profile-avatar"
            onClick={() => fileRef.current?.click()}
            title="Click to change"
          >
            {photoURL ? (
              <img src={photoURL} alt="Avatar" />
            ) : (
              <span>{(displayName || "?")[0].toUpperCase()}</span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleAvatar}
            style={{ display: "none" }}
          />
          <span className="hint">Click image to change</span>
        </div>

        <div className="field">
          <label>Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="field">
          <label>Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            rows={3}
          />
        </div>

        {status && (
          <div className={`status ${status.ok ? "ok" : "err"}`}>{status.msg}</div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </form>

      <h3 className="section-title">Change Email</h3>
      <form className="profile-form" onSubmit={handleUpdateEmail}>
        <div className="field">
          <label>New Email</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new@email.com"
          />
        </div>

        <div className="field">
          <label>Current Password (required to change email)</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update Email"}
        </button>
      </form>
    </div>
  );
}
