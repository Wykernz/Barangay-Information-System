import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Native modal dialog provides focus containment, Escape, and focus restoration. */
export function ProfileDialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="profile-dialog"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="profile-dialog-header">
        <h2>{title}</h2>
        <button
          type="button"
          className="secondary"
          onClick={close}
          aria-label="Close form"
        >
          <X size={19} aria-hidden="true" />
        </button>
      </div>
      <div className="profile-dialog-body">{children}</div>
    </dialog>
  );
}
