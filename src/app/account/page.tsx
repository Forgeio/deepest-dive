import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <nav className="nav">
        <span className="nav-brand">⚔️ Deepest Dive</span>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="btn btn-secondary"
            style={{ padding: "6px 16px", fontSize: "13px" }}
          >
            Logout
          </button>
        </form>
      </nav>

      <div className="account-container">
        <div className="account-card">
          <h1>My Account</h1>
          <dl className="account-info">
            <dt>Username</dt>
            <dd>{user.username}</dd>

            <dt>Email</dt>
            <dd>{user.email}</dd>

            <dt>Email Status</dt>
            <dd>
              {user.emailVerifiedAt ? (
                <span className="badge badge-verified">Verified</span>
              ) : (
                <span className="badge badge-unverified">Unverified</span>
              )}
            </dd>

            <dt>Member Since</dt>
            <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
          </dl>
        </div>
      </div>
    </>
  );
}
