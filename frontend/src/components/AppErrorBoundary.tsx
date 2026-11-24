import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { failed: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Do not expose record data in the fallback. Browser diagnostics retain the
    // component stack for local troubleshooting until centralized logging exists.
    console.error("BIMS interface rendering failed", error, info.componentStack);
  }

  render() {
    if (this.state.failed)
      return (
        <main className="status" role="alert">
          <h1>The interface could not display this page</h1>
          <p>
            Refresh the page. If the problem continues, restart the frontend and
            backend from this project checkout and contact the system administrator.
          </p>
          <button onClick={() => window.location.reload()}>Refresh page</button>
        </main>
      );
    return this.props.children;
  }
}
