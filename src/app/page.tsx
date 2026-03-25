import Link from "next/link";

export default function Home() {
  return (
    <div className="auth-container">
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "48px", marginBottom: "8px", color: "#fff" }}>
          ⚔️ Deepest Dive
        </h1>
        <p style={{ color: "#888", marginBottom: "32px" }}>
          A 2D Zelda-like online RPG
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
          <Link href="/login" className="btn btn-primary" style={{ width: "auto", padding: "10px 32px" }}>
            Login
          </Link>
          <Link href="/register" className="btn btn-secondary" style={{ padding: "10px 32px" }}>
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
