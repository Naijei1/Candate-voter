import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap">
      <h1>Page not found</h1>
      <p className="actions">
        <Link className="btn btn-primary" href="/">Home</Link>
        <Link className="btn btn-ghost" href="/states/ky">Kentucky races</Link>
      </p>
    </div>
  );
}
