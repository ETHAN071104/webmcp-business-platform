import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div>
        <p className="platform-kicker">404</p>
        <h1>Business not found</h1>
        <p>This business does not exist or is not published.</p>
        <Link className="platform-primary" href="/">
          Return home
        </Link>
      </div>
    </main>
  );
}
