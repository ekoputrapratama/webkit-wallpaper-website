import { useState, useEffect } from "react";
import { fetchComments, addComment, getProfile } from "../firebase";

export default function CommentsSection({ themeId, user }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments(themeId).then((data) => {
      setComments(data);
      setLoading(false);
    });
  }, [themeId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || !user) return;

    setSubmitting(true);
    try {
      const profile = await getProfile(user.uid);
      const id = await addComment(themeId, {
        uid: user.uid,
        author: profile?.displayName || user.displayName || user.email,
        text: text.trim(),
        avatarURL: profile?.photoURL || "",
      });
      setComments((prev) => [
        ...prev,
        {
          id,
          uid: user.uid,
          author: profile?.displayName || user.displayName || user.email,
          text: text.trim(),
          avatarURL: profile?.photoURL || "",
          created_at: new Date(),
        },
      ]);
      setText("");
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="muted">Loading comments...</p>;

  return (
    <div className="comments-section">
      <h3>Comments ({comments.length})</h3>

      {comments.length === 0 && (
        <p className="muted">No comments yet. Be the first!</p>
      )}

      <div className="comments-list">
        {comments.map((comment) => (
          <div key={comment.id} className="comment">
            <div className="comment-avatar">
              {comment.avatarURL ? (
                <img src={comment.avatarURL} alt={comment.author} />
              ) : (
                <span>{(comment.author || "?")[0].toUpperCase()}</span>
              )}
            </div>
            <div className="comment-body">
              <div className="comment-header">
                <span className="comment-author">{comment.author}</span>
                <span className="comment-date">
                  {comment.created_at?.toDate
                    ? comment.created_at.toDate().toLocaleDateString()
                    : new Date().toLocaleDateString()}
                </span>
              </div>
              <p className="comment-text">{comment.text}</p>
            </div>
          </div>
        ))}
      </div>

      {user ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Leave a comment..."
            rows={3}
            required
          />
          <button type="submit" disabled={submitting || !text.trim()}>
            {submitting ? "Posting..." : "Post Comment"}
          </button>
        </form>
      ) : (
        <p className="muted">Sign in to leave a comment.</p>
      )}
    </div>
  );
}
