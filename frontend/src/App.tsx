import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Workspace from "./Workspace";
import HealthWorkspace from "./HealthWorkspace";
import { api, getSession, signIn } from "./api";

function Login() {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    setPending(true);
    try {
      await signIn(String(data.get("username")), String(data.get("password")));
      await queryClient.invalidateQueries({ queryKey: ["session"] });
    } catch {
      setError(
        "Unable to sign in. Check your credentials and connection, then try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="login-layout">
      <section className="intro">
        <span className="seal" aria-hidden="true">
          B
        </span>
        <p className="eyebrow">BARANGAY INFORMATION MANAGEMENT</p>
        <h1>
          A connected office.
          <br />A better served community.
        </h1>
        <p>A dedicated workspace for authorized barangay personnel.</p>
        <span className="tag">Staff access</span>
      </section>
      <section className="login-card" aria-labelledby="login-title">
        <p className="eyebrow">WELCOME BACK</p>
        <h2 id="login-title">Sign in to your workspace</h2>
        <p>Use the account provided by your system administrator.</p>
        <form onSubmit={submit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            required
            maxLength={150}
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={1024}
          />
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="help">Need access? Contact your system administrator.</p>
      </section>
    </main>
  );
}

export default function App() {
  const client = useQueryClient();
  // Retry unavailable services explicitly instead of on every window focus.
  const session = useQuery({
    queryKey: ["session"],
    queryFn: getSession,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const [logoutError, setLogoutError] = useState("");
  if (session.isPending)
    return (
      <main className="status" role="status">
        Connecting to your barangay workspace…
      </main>
    );
  if (session.isError)
    return (
      <main className="status">
        <h1>Cannot reach the staff service</h1>
        <p>
          The interface is running, but the API could not complete the request.
        </p>
        {import.meta.env.DEV && (
          <section>
            <h2>Start the backend</h2>
            <p>In another terminal at the repository root, run:</p>
            <pre>
              <code>
                {
                  ".\\scripts\\python.cmd scripts/dev.py runserver 127.0.0.1:8000"
                }
              </code>
            </pre>
            <p>
              If setup reports a PostgreSQL or missing environment error, follow
              docs/RUNNING.md. The database must be available before signing in.
            </p>
          </section>
        )}
        <button disabled={session.isFetching} onClick={() => session.refetch()}>
          {session.isFetching ? "Connecting…" : "Try again"}
        </button>
      </main>
    );
  if (!session.data) return <Login />;
  async function logout() {
    setLogoutError("");
    try {
      await api.get("auth/csrf/");
      await api.post("auth/logout/");
      client.clear();
    } catch {
      setLogoutError("Sign out failed. Please try again.");
    }
  }
  return session.data.health_only ? (
    <main className="status">
      <h1>Barangay Payahan · Healthcare administration</h1>
      <p>Signed in as {session.data.display_name || session.data.username}</p>
      <HealthWorkspace />
      <p>Your account has access to Health only.</p>
      {logoutError && <p role="alert">{logoutError}</p>}
      <button onClick={logout}>Sign out</button>
    </main>
  ) : (
    <Workspace
      username={session.data.display_name || session.data.username}
      logout={logout}
      logoutError={logoutError}
    />
  );
}
