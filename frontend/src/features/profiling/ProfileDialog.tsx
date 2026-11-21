import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, ChevronRight, House, X } from "lucide-react";
import { createPortal } from "react-dom";

/** Native modal dialog provides focus containment, Escape, and focus restoration. */
export function ProfileDialog({
  title,
  close,
  children,
  personProfile = false,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  personProfile?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (personProfile) return;
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, [personProfile]);
  const content = (
    <>
      {personProfile && (
        <div className="person-form-masthead">
          <div className="person-form-brand">
            <House size={32} aria-hidden="true" />
            <strong>BIMS</strong>
            <span>
              Barangay Payahan
              <br />
              Information Management System
            </span>
          </div>
          <div className="person-form-breadcrumb">
            Profiling Module
            <ChevronRight size={17} aria-hidden="true" />
            <span>Person Profile</span>
          </div>
        </div>
      )}
      <div className="profile-dialog-header">
        {personProfile ? (
          <>
            <button
              type="button"
              className="secondary person-back-button"
              onClick={close}
              aria-label="Close form"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              Back
            </button>
            <div>
              <h2>Person Profile</h2>
              <p>Add or edit a resident/non-resident profile.</p>
            </div>
          </>
        ) : (
          <>
            <h2>{title}</h2>
            <button
              type="button"
              className="secondary"
              onClick={close}
              aria-label="Close form"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <div className="profile-dialog-body">{children}</div>
    </>
  );
  if (personProfile)
    return createPortal(
      <main
        className="profile-dialog person-profile-dialog person-profile-page"
        aria-label={title}
      >
        {content}
      </main>,
      document.body,
    );
  return (
    <dialog
      ref={ref}
      className={`profile-dialog${personProfile ? " person-profile-dialog" : ""}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      {content}
    </dialog>
  );
}
