"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Native modal focus containment, background lock and opener restoration. */
export default function NativeDialog({open, onClose, title, children, className = ""}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!open || !mounted || !ref.current) return;
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scroll = { x: window.scrollX, y: window.scrollY };
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
      window.scrollTo({ left: scroll.x, top: scroll.y, behavior: "instant" as ScrollBehavior });
      if (opener?.isConnected) opener.focus({preventScroll: true});
    };
  }, [open, mounted]);
  if (!mounted) return null;
  return createPortal(<dialog ref={ref} className={`native-dialog ${className}`} aria-labelledby={titleId}
    onCancel={e => { e.preventDefault(); closeRef.current(); }}
    onKeyDownCapture={e => {
      // Search inputs consume Escape to clear their value; dismissal must stay consistent.
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeRef.current(); }
    }}
    onClick={e => {
      if (e.target !== e.currentTarget) return;
      const r = e.currentTarget.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeRef.current();
    }}>
    <div className="native-dialog-header"><h2 id={titleId}>{title}</h2><button type="button" className="native-dialog-close" aria-label={`Close ${title}`} onClick={() => closeRef.current()}><span aria-hidden="true">×</span> Close</button></div>
    <div className="native-dialog-content">{children}</div>
  </dialog>, document.body);
}
