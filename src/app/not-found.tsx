import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap">
      <h1>Page not found</h1>
      <p>
        <Link href="/">Home</Link>
        {" · "}
        <Link href="/states/ky">Kentucky races</Link>
      </p>
    </div>
  );
}
