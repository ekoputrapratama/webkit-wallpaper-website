import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  likeTheme,
  unlikeTheme,
  incrementDownload,
  hasUserLiked,
  getLikeCount,
  fetchLikeStatus,
} from "../src/firebase";
import {
  getDoc,
  setDoc,
  writeBatch,
  increment,
  collection,
  query,
  where,
  getCountFromServer,
} from "firebase/firestore";

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({ name: "test-app" })),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({ name: "test-auth" })),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  updateEmail: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: { credential: vi.fn() },
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => ({ name: "test-db" })),
  collection: vi.fn((db, ...segments) => ({ db, segments })),
  doc: vi.fn((db, ...segments) => ({ db, segments })),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ __serverTimestamp: true })),
  query: vi.fn((...args) => ({ args })),
  orderBy: vi.fn(),
  where: vi.fn(),
  setDoc: vi.fn(),
  increment: vi.fn((n) => ({ __increment: n })),
  writeBatch: vi.fn(() => batch),
  getCountFromServer: vi.fn(),
}));

const batch = {
  set: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  commit: vi.fn().mockResolvedValue(),
};

vi.mock("firebase/storage", () => ({
  getStorage: vi.fn(() => ({ name: "test-storage" })),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

describe("incrementDownload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("increments the downloads counter by 1 on the themed document", async () => {
    await incrementDownload("theme-123");

    expect(setDoc).toHaveBeenCalledTimes(1);
    const [, payload, options] = setDoc.mock.calls[0];
    expect(payload).toEqual({ downloads: { __increment: 1 } });
    expect(options).toEqual({ merge: true });
    expect(increment).toHaveBeenCalledWith(1);
  });

  it("targets the wallpapers collection for the given theme id", async () => {
    await incrementDownload("theme-abc");

    const [ref] = setDoc.mock.calls[0];
    expect(ref.segments).toEqual(["wallpapers", "theme-abc"]);
  });
});

describe("likeTheme", () => {
  let batch;

  beforeEach(() => {
    vi.clearAllMocks();
    batch = writeBatch();
  });

  it("creates a like document and increments the theme likes counter by 1", async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    const result = await likeTheme("theme-123", "user-1");

    expect(result).toBe(true);
    expect(getDoc).toHaveBeenCalledTimes(1);
    expect(batch.set).toHaveBeenCalledWith(
      { db: { name: "test-db" }, segments: ["likes", "theme-123_user-1"] },
      expect.objectContaining({
        themeId: "theme-123",
        uid: "user-1",
        created_at: { __serverTimestamp: true },
      })
    );
    expect(batch.update).toHaveBeenCalledWith(
      { db: { name: "test-db" }, segments: ["wallpapers", "theme-123"] },
      { likes: { __increment: 1 } }
    );
    expect(batch.commit).toHaveBeenCalledTimes(1);
    expect(increment).toHaveBeenCalledWith(1);
  });

  it("does not create a duplicate like if the user already liked it", async () => {
    getDoc.mockResolvedValue({ exists: () => true });
    const result = await likeTheme("theme-123", "user-1");

    expect(result).toBe(false);
    expect(batch.set).not.toHaveBeenCalled();
    expect(batch.update).not.toHaveBeenCalled();
    expect(batch.commit).not.toHaveBeenCalled();
  });
});

describe("unlikeTheme", () => {
  let batch;

  beforeEach(() => {
    vi.clearAllMocks();
    batch = writeBatch();
  });

  it("removes the like document and decrements the theme likes counter by 1", async () => {
    getDoc.mockResolvedValue({ exists: () => true });
    const result = await unlikeTheme("theme-123", "user-1");

    expect(result).toBe(true);
    expect(batch.delete).toHaveBeenCalledWith({
      db: { name: "test-db" },
      segments: ["likes", "theme-123_user-1"],
    });
    expect(batch.update).toHaveBeenCalledWith(
      { db: { name: "test-db" }, segments: ["wallpapers", "theme-123"] },
      { likes: { __increment: -1 } }
    );
    expect(batch.commit).toHaveBeenCalledTimes(1);
    expect(increment).toHaveBeenCalledWith(-1);
  });

  it("does nothing if the user has not liked the theme", async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    const result = await unlikeTheme("theme-123", "user-1");

    expect(result).toBe(false);
    expect(batch.delete).not.toHaveBeenCalled();
    expect(batch.update).not.toHaveBeenCalled();
    expect(batch.commit).not.toHaveBeenCalled();
  });
});

describe("hasUserLiked", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when a like document exists", async () => {
    getDoc.mockResolvedValue({ exists: () => true });
    await expect(hasUserLiked("theme-123", "user-1")).resolves.toBe(true);
  });

  it("returns false when no like document exists", async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    await expect(hasUserLiked("theme-123", "user-1")).resolves.toBe(false);
  });
});

describe("getLikeCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries the likes collection filtered by themeId and returns the count", async () => {
    getCountFromServer.mockResolvedValue({ data: () => ({ count: 7 }) });
    const count = await getLikeCount("theme-123");

    expect(count).toBe(7);
    expect(where).toHaveBeenCalledWith("themeId", "==", "theme-123");
    expect(collection).toHaveBeenCalledWith(
      { name: "test-db" },
      "likes"
    );
    expect(query).toHaveBeenCalledTimes(1);
  });
});

describe("fetchLikeStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCountFromServer.mockResolvedValue({ data: () => ({ count: 3 }) });
  });

  it("returns count and liked status for an authenticated user", async () => {
    getDoc.mockResolvedValue({ exists: () => true });
    const status = await fetchLikeStatus("theme-123", "user-1");

    expect(status).toEqual({ count: 3, liked: true });
    expect(getDoc).toHaveBeenCalledWith(expect.objectContaining({
      segments: ["likes", "theme-123_user-1"],
    }));
  });

  it("returns count and liked=false when no user is provided", async () => {
    const status = await fetchLikeStatus("theme-123", null);

    expect(status).toEqual({ count: 3, liked: false });
    expect(getDoc).not.toHaveBeenCalled();
  });
});