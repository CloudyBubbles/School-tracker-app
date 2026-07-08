"use client";

import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/app/lib/auth";

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontFamily: "var(--font-serif)",
  fontSize: "14px",
  background: "var(--parchment)",
  border: "1px solid rgba(140,100,60,0.3)",
  borderRadius: "4px",
  color: "var(--ink-dark)",
  outline: "none",
  boxSizing: "border-box",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const err = await signIn(email, password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    router.push("/");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--parchment)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "320px",
          padding: "36px 32px",
          background: "var(--parchment-dark)",
          border: "1px solid rgba(140,100,60,0.25)",
          borderRadius: "6px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "24px",
            color: "var(--ink-medium)",
            margin: "0 0 24px",
            textAlign: "center",
          }}
        >
          Schoolwork Tracker
        </h1>

        <label style={{ display: "block", fontFamily: "var(--font-serif)", fontSize: "12px", color: "var(--ink-light)", marginBottom: "4px" }}>
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          style={inputStyle}
        />

        <label style={{ display: "block", fontFamily: "var(--font-serif)", fontSize: "12px", color: "var(--ink-light)", margin: "16px 0 4px" }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        {error && (
          <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "12px", color: "#a03030", marginTop: "14px" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            marginTop: "24px",
            padding: "10px",
            fontFamily: "var(--font-serif)",
            fontSize: "14px",
            color: "var(--parchment)",
            background: "var(--ink-dark)",
            border: "none",
            borderRadius: "4px",
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
