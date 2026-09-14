import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  where,
  setDoc,
  increment,
  writeBatch,
  getCountFromServer,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app, import.meta.env.VITE_FIRESTORE_DATABASE_ID || "(default)");
const storage = getStorage(app);

const COLLECTION = "wallpapers";
const USERS = "users";

export async function register(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  await saveProfile(cred.user.uid, { displayName, email, bio: "" });
  return cred.user;
}

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

export async function uploadFile(file, path) {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}

// --- Profile ---

export async function getProfile(uid) {
  const snap = await getDoc(doc(db, USERS, uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveProfile(uid, data) {
  await setDoc(doc(db, USERS, uid), {
    ...data,
    updated_at: serverTimestamp(),
  }, { merge: true });
}

export async function uploadAvatar(uid, file) {
  const ext = file.name.split(".").pop();
  const path = `users/${uid}/avatar.${ext}`;
  return await uploadFile(file, path);
}

export async function updateAuthProfile(displayName, photoURL) {
  const updates = {};
  if (displayName !== undefined) updates.displayName = displayName;
  if (photoURL !== undefined) updates.photoURL = photoURL;
  if (Object.keys(updates).length > 0) {
    await updateProfile(auth.currentUser, updates);
  }
}

export async function updateAuthEmail(newEmail, currentPassword) {
  const user = auth.currentUser;
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updateEmail(user, newEmail);
}

// --- Themes ---

export async function submitTheme(data, { thumbnailFile, wallpaperFile, uid }) {
  let thumbnailUrl = "";
  let wallpaperUrl = "";

  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const ts = Date.now();

  if (thumbnailFile) {
    const ext = thumbnailFile.name.split(".").pop();
    thumbnailUrl = await uploadFile(thumbnailFile, `themes/${uid}/${slug}-${ts}/thumbnail.${ext}`);
  }

  if (wallpaperFile) {
    wallpaperUrl = await uploadFile(wallpaperFile, `themes/${uid}/${slug}-${ts}/wallpaper.zip`);
  }

  const docRef = await addDoc(collection(db, COLLECTION), {
    name: data.name,
    description: data.description,
    author: data.author,
    uid: uid,
    thumbnail_url: thumbnailUrl,
    wallpaper_url: wallpaperUrl,
    type: "theme",
    tags: data.tags,
    donation_url: data.donationUrl || "",
    donation_label: data.donationLabel || "",
    downloads: 0,
    created_at: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTheme(id, data, { thumbnailFile, wallpaperFile, uid, existingThumbnail, existingWallpaper }) {
  const updates = {
    name: data.name,
    description: data.description,
    tags: data.tags,
    donation_url: data.donationUrl || "",
    donation_label: data.donationLabel || "",
    updated_at: serverTimestamp(),
  };

  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const ts = Date.now();

  if (thumbnailFile) {
    const ext = thumbnailFile.name.split(".").pop();
    updates.thumbnail_url = await uploadFile(thumbnailFile, `themes/${uid}/${slug}-${ts}/thumbnail.${ext}`);
  } else if (existingThumbnail !== undefined) {
    updates.thumbnail_url = existingThumbnail;
  }

  if (wallpaperFile) {
    updates.wallpaper_url = await uploadFile(wallpaperFile, `themes/${uid}/${slug}-${ts}/wallpaper.zip`);
  } else if (existingWallpaper !== undefined) {
    updates.wallpaper_url = existingWallpaper;
  }

  await updateDoc(doc(db, COLLECTION, id), updates);
  return id;
}

export async function fetchThemes() {
  const q = query(collection(db, COLLECTION), orderBy("created_at", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchThemeById(id) {
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function fetchThemesByUser(uid) {
  const q = query(
    collection(db, COLLECTION),
    where("uid", "==", uid),
    orderBy("created_at", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteTheme(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

// --- Likes ---

export async function likeTheme(themeId, uid) {
  const likeId = `${themeId}_${uid}`;
  const likeRef = doc(db, "likes", likeId);
  const likeSnap = await getDoc(likeRef);

  if (likeSnap.exists()) return false;

  const batch = writeBatch(db);
  batch.set(likeRef, { themeId, uid, created_at: serverTimestamp() });
  batch.update(doc(db, COLLECTION, themeId), { likes: increment(1) });
  await batch.commit();
  return true;
}

export async function unlikeTheme(themeId, uid) {
  const likeId = `${themeId}_${uid}`;
  const likeRef = doc(db, "likes", likeId);
  const likeSnap = await getDoc(likeRef);

  if (!likeSnap.exists()) return false;

  const batch = writeBatch(db);
  batch.delete(likeRef);
  batch.update(doc(db, COLLECTION, themeId), { likes: increment(-1) });
  await batch.commit();
  return true;
}

export async function getLikeCount(themeId) {
  const q = query(collection(db, "likes"), where("themeId", "==", themeId));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function hasUserLiked(themeId, uid) {
  const likeId = `${themeId}_${uid}`;
  const likeSnap = await getDoc(doc(db, "likes", likeId));
  return likeSnap.exists();
}

export async function fetchLikeStatus(themeId, uid) {
  const [count, liked] = await Promise.all([
    getLikeCount(themeId),
    uid ? hasUserLiked(themeId, uid) : false,
  ]);
  return { count, liked };
}

// --- Comments ---

export async function addComment(themeId, { uid, author, text, avatarURL }) {
  const commentsRef = collection(db, COLLECTION, themeId, "comments");
  const docRef = await addDoc(commentsRef, {
    uid,
    author,
    text,
    avatarURL: avatarURL || "",
    created_at: serverTimestamp(),
  });
  return docRef.id;
}

export async function fetchComments(themeId) {
  const commentsRef = collection(db, COLLECTION, themeId, "comments");
  const q = query(commentsRef, orderBy("created_at", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// --- Downloads ---

export async function incrementDownload(themeId) {
  await setDoc(
    doc(db, COLLECTION, themeId),
    { downloads: increment(1) },
    { merge: true }
  );
}

// --- Popular Authors ---

export async function fetchPopularAuthors(limit = 12) {
  const [usersSnap, themesSnap] = await Promise.all([
    getDocs(collection(db, USERS)),
    getDocs(collection(db, COLLECTION)),
  ]);

  const themeCounts = new Map();
  themesSnap.docs.forEach((d) => {
    const uid = d.data().uid;
    if (!uid) return;
    themeCounts.set(uid, (themeCounts.get(uid) || 0) + 1);
  });

  const authors = usersSnap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .filter((u) => u.displayName || u.email)
    .map((u) => ({
      uid: u.uid || u.id,
      displayName: u.displayName || u.email || "Unknown",
      photoURL: u.photoURL || "",
      bio: u.bio || "",
      themeCount: themeCounts.get(u.uid || u.id) || 0,
    }))
    .sort((a, b) => b.themeCount - a.themeCount)
    .slice(0, limit);

  return authors;
}
