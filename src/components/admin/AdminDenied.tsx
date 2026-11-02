import Link from "next/link";

export function AdminDenied({ title, signedIn }: { title: string; signedIn: boolean }) {
  return (
    <article className="wrap">
      <h1>{title}</h1>
      <p>{signedIn ? "This page is limited to admin accounts." : "Sign in with an admin account."}</p>
      {signedIn ? null : (
        <p>
          <Link className="btn btn-cta" href="/sign-in">
            Sign in
          </Link>
        </p>
      )}
    </article>
  );
}
