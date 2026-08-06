import { useEffect, type ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";

interface DetailModalProps {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  labelledBy: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}

export function DetailModal({
  eyebrow,
  title,
  icon: Icon,
  labelledBy,
  onClose,
  className = "",
  children,
}: DetailModalProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector(".modal-layer--nested")) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="modal-layer detail-modal-layer" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className={`dialog detail-modal ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <header className="dialog__header detail-modal__header">
        <span className="dialog__icon"><Icon /></span>
        <div className="dialog__header-copy"><p className="eyebrow">{eyebrow}</p><h2 id={labelledBy}>{title}</h2></div>
        <button className="icon-button dialog__close" onClick={onClose} aria-label="Close"><X /></button>
      </header>
      <div className="detail-modal__body">{children}</div>
    </section>
  </div>;
}
