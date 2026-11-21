import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import axios from "axios";

export default function HealthWorkspace() {
  const workspace = useQuery({
    queryKey: ["health-workspace"],
    queryFn: async () =>
      (await api.get<{ capture_available: boolean }>("health/workspace/")).data,
    retry: false,
  });
  if (workspace.isPending)
    return <p role="status">Checking health access...</p>;
  if (workspace.isError) {
    const denied =
      axios.isAxiosError(workspace.error) &&
      workspace.error.response?.status === 403;
    return (
      <section>
        <h1>Health profiling</h1>
        <p role="alert">
          {denied
            ? "This account has not been assigned health access. Contact your administrator."
            : "The health service is unavailable. Please retry."}
        </p>
        {!denied && (
          <button type="button" onClick={() => void workspace.refetch()}>
            Retry
          </button>
        )}
      </section>
    );
  }
  return (
    <section>
      <h2>Health profiling</h2>
      <p>Your health-section access is confirmed.</p>
      {!workspace.data.capture_available && (
        <p>
          Health capture forms are being prepared. No health information can be
          entered yet.
        </p>
      )}
    </section>
  );
}
