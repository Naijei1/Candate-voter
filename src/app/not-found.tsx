import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap">
      <h1 className="t-h1 pt">Page not found</h1>
      <div className="empty">
        <p className="empty-t">We can’t find that page.</p>
        <p>
          It may have moved. <Link href="/">Go home</Link> or <Link href="/search">use search</Link>.
        </p>
      </div>
    </div>
  );
}
