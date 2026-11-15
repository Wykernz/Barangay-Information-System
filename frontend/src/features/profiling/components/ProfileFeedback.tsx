import { CircleCheck, TriangleAlert } from "lucide-react";

export function ProfileFeedback({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  const Icon = error ? TriangleAlert : CircleCheck;
  return (
    <div
      className={`profile-feedback ${error ? "is-error" : "is-success"}`}
      role={error ? "alert" : "status"}
    >
      <Icon size={19} aria-hidden="true" />
      <div>
        <strong>
          {error ? "Please review this information" : "Changes updated"}
        </strong>
        <p>{message}</p>
      </div>
    </div>
  );
}
