"use client";

import { useState, type FormEvent } from "react";
import { StatusMark } from "@/components/site/StatusMark";

export function SignInPreview() {
  const [done, setDone] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDone(true);
  }

  return (
    <form onSubmit={onSubmit} className="finder">
      <p>
        <StatusMark kind="preview" /> Nothing is sent.
      </p>
      <label htmlFor="email">
        Email
        <input id="email" name="email" type="email" autoComplete="off" />
      </label>
      <button className="btn btn-cta" type="submit">
        Continue
      </button>
      {done ? (
        <p role="status">
          No account was created.
        </p>
      ) : null}
    </form>
  );
}
