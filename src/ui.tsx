import {
  useEffect,
  useRef,
  useId,
  isValidElement,
  cloneElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { X, Check, AlertCircle } from "lucide-react";
import { stateLabels, type State } from "./model";
export function Badge({ state }: { state: State }) {
  return (
    <span className={`badge ${state}`}>
      <span className="dot" />
      {stateLabels[state]}
    </span>
  );
}
export function Notice({
  children,
  success = false,
}: {
  children: ReactNode;
  success?: boolean;
}) {
  return (
    <div className={`notice ${success ? "success" : ""}`} role="status">
      {success ? <Check size={18} /> : <AlertCircle size={18} />}
      <span>{children}</span>
    </div>
  );
}
export function Modal({
  title,
  children,
  close,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    el.showModal();
    return () => {
      el.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
      aria-label={title}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="ปิด"
          disabled={busy}
          onClick={close}
        >
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  const control = isValidElement(children)
    ? (children as ReactElement<{
        id?: string;
        role?: string;
        "aria-labelledby"?: string;
      }>)
    : null;
  const native =
    control && ["input", "select", "textarea"].includes(String(control.type));
  return (
    <div className="field">
      {native ? (
        <label htmlFor={id}>{label}</label>
      ) : (
        <span id={id}>{label}</span>
      )}
      {control
        ? cloneElement(
            control,
            native ? { id } : { role: "group", "aria-labelledby": id },
          )
        : children}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <AlertCircle size={32} />
      <p>{children}</p>
    </div>
  );
}
export function Portrait({ index, name }: { index: number; name: string }) {
  return (
    <div
      className="portrait"
      role="img"
      aria-label={`รูปตัวอย่าง ${name}`}
      style={{ backgroundPosition: `${index * 50}% top` }}
    />
  );
}
export function go(path: string) {
  window.location.hash = path;
}
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
