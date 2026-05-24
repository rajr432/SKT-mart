"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthProvider";

interface Answer {
  id: string;
  answer: string;
  upvotes: number;
  createdAt: string;
  user?: { name?: string };
}
interface Question {
  id: string;
  question: string;
  createdAt: string;
  user?: { name?: string };
  answers: Answer[];
}

// PDP Q&A with upvote-per-user. Votes persist in localStorage as optimistic
// UI signal; backend dedupes via `AnswerVote @@unique([answerId, userId])`.
export default function ProductQA({ productId }: { productId: string }) {
  const { token, user } = useAuth();
  const [items, setItems] = useState<Question[]>([]);
  const [ask, setAsk] = useState("");
  const [reply, setReply] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("qa_votes") : null;
    if (saved) setVoted(JSON.parse(saved));
  }, []);

  const saveVoted = (v: Record<string, boolean>) => {
    setVoted(v);
    localStorage.setItem("qa_votes", JSON.stringify(v));
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await api<{ items: Question[] }>(`/api/qa/product/${productId}`);
      setItems(r.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [productId]);

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return alert("Login to ask a question");
    if (ask.trim().length < 3) return;
    await api("/api/qa", { token, method: "POST", json: { productId, question: ask.trim() } });
    setAsk("");
    load();
  };

  const submitAnswer = async (questionId: string) => {
    const a = (reply[questionId] ?? "").trim();
    if (!token) return alert("Login to answer");
    if (a.length < 2) return;
    await api("/api/qa/answer", { token, method: "POST", json: { questionId, answer: a } });
    setReply({ ...reply, [questionId]: "" });
    load();
  };

  const toggleVote = async (answerId: string) => {
    if (!token) return alert("Login to vote");
    const prev = !!voted[answerId];
    // Optimistic update
    saveVoted({ ...voted, [answerId]: !prev });
    setItems((curr) =>
      curr.map((q) => ({
        ...q,
        answers: q.answers.map((a) =>
          a.id === answerId ? { ...a, upvotes: a.upvotes + (prev ? -1 : 1) } : a,
        ),
      })),
    );
    try {
      const r = await api<{ upvoted: boolean; upvotes: number }>(
        `/api/qa/answer/${answerId}/vote`,
        { token, method: "POST" },
      );
      saveVoted({ ...voted, [answerId]: r.upvoted });
      setItems((curr) =>
        curr.map((q) => ({
          ...q,
          answers: q.answers.map((a) =>
            a.id === answerId ? { ...a, upvotes: r.upvotes } : a,
          ),
        })),
      );
    } catch {
      // revert optimistic on failure
      saveVoted({ ...voted, [answerId]: prev });
    }
  };

  return (
    <div className="card p-4 space-y-3" id="qa">
      <h2 className="text-lg font-semibold">Questions &amp; Answers</h2>

      <form onSubmit={submitQuestion} className="flex gap-2">
        <input
          className="input flex-1"
          placeholder={user ? "Ask a question about this product" : "Login to ask a question"}
          value={ask}
          onChange={(e) => setAsk(e.target.value)}
          disabled={!user}
        />
        <button type="submit" className="btn-primary" disabled={!user || ask.trim().length < 3}>
          Ask
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">No questions yet — be the first to ask.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((q) => (
            <li key={q.id} className="border-b pb-3">
              <p className="text-sm">
                <span className="font-semibold">Q.</span> {q.question}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {q.user?.name ?? "Anonymous"} · {new Date(q.createdAt).toLocaleDateString()}
              </p>

              {q.answers.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {q.answers.map((a) => (
                    <li key={a.id} className="pl-3 border-l-2 border-gray-200">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm">
                            <span className="font-semibold">A.</span> {a.answer}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {a.user?.name ?? "Anonymous"} ·{" "}
                            {new Date(a.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleVote(a.id)}
                          className={`text-xs px-2 py-1 rounded-md border whitespace-nowrap ${
                            voted[a.id]
                              ? "bg-brand-blue text-white border-brand-blue"
                              : "bg-white text-gray-600"
                          }`}
                          aria-label={voted[a.id] ? "Remove upvote" : "Upvote answer"}
                        >
                          ▲ {a.upvotes}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2 mt-2">
                <input
                  className="input flex-1 text-sm"
                  placeholder={user ? "Add an answer" : "Login to answer"}
                  value={reply[q.id] ?? ""}
                  onChange={(e) => setReply({ ...reply, [q.id]: e.target.value })}
                  disabled={!user}
                />
                <button
                  onClick={() => submitAnswer(q.id)}
                  className="btn-outline text-sm"
                  disabled={!user || (reply[q.id] ?? "").trim().length < 2}
                >
                  Reply
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
