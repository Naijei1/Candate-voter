"use client";

import { useState, type FormEvent } from "react";

type Mode = "sign-in" | "create" | "confirm";

export function SignInForm({ configured }: { configured: boolean }) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!configured) {
    return <p className="notice">Sign-in is not set up on this server.</p>;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "confirm") {
        const response = await fetch("/api/auth/sign-up", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, code }),
        });
        const body = await readJson(response);
        if (!response.ok) {
          setMessage(body.message ?? "That code does not match.");
          return;
        }
        setMode("sign-in");
        setMessage("Email confirmed. Sign in.");
        return;
      }
      if (mode === "create") {
        const response = await fetch("/api/auth/sign-up", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const body = await readJson(response);
        if (!response.ok) {
          setMessage(body.message ?? "Could not create the account.");
          return;
        }
        setMode("confirm");
        setMessage("Enter the code sent to your email.");
        return;
      }
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await readJson(response);
      if (!response.ok) {
        setMessage(body.message ?? "Email or password is incorrect.");
        return;
      }
      window.location.assign("/account");
    } catch {
      setMessage("Sign-in is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "create" ? "Create account" : mode === "confirm" ? "Confirm email" : "Sign in";

  return (
    <form className="finder" onSubmit={onSubmit}>
      <p>Use your email and a password.</p>
      <label htmlFor="email">
        Email
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      {mode === "confirm" ? (
        <label htmlFor="code">
          Code
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </label>
      ) : (
        <label htmlFor="password">
          Password
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "create" ? "new-password" : "current-password"}
            required
            minLength={12}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
      )}
      <button className="btn btn-cta" type="submit" disabled={busy}>
        {title}
      </button>
      {message ? (
        <p role="status" className="notice">
          {message}
        </p>
      ) : null}
      {mode === "sign-in" ? (
        <button className="btn btn-ghost" type="button" onClick={() => setMode("create")}>
          Create an account
        </button>
      ) : (
        <button className="btn btn-ghost" type="button" onClick={() => setMode("sign-in")}>
          Back to sign in
        </button>
      )}
    </form>
  );
}

async function readJson(response: Response): Promise<{ message?: string }> {
  try {
    const body = await response.json();
    return body && typeof body === "object" ? (body as { message?: string }) : {};
  } catch {
    return {};
  }
}
