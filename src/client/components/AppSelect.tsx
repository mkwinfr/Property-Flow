import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

export interface AppSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

interface AppSelectProps {
  value: string;
  options: AppSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  className?: string;
  compact?: boolean;
}

export function AppSelect({ value, options, onChange, ariaLabel, disabled = false, required = false, searchable, className = "", compact = false }: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 240, openAbove: false });
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const useSearch = searchable ?? options.length > 8;
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => options.filter((option) => !query || option.label.toLowerCase().includes(query.toLowerCase())), [options, query]);
  const enabled = filtered.map((option, index) => ({ option, index })).filter(({ option }) => !option.disabled);

  const placeMenu = () => {
    const rect = root.current?.getBoundingClientRect();
    if (!rect) return;
    const estimatedHeight = Math.min(330, 48 + filtered.length * 38);
    const openAbove = window.innerHeight - rect.bottom < estimatedHeight && rect.top > estimatedHeight;
    setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 240) - 8)), top: openAbove ? rect.top - 6 : rect.bottom + 6, width: Math.max(rect.width, 240), openAbove });
  };

  const openMenu = () => {
    if (disabled) return;
    setQuery("");
    setHighlighted(Math.max(0, options.findIndex((option) => option.value === value && !option.disabled)));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    placeMenu();
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !menu.current?.contains(target)) setOpen(false);
    };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); root.current?.querySelector("button")?.focus(); } };
    const reposition = () => placeMenu();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    requestAnimationFrame(() => useSearch ? searchInput.current?.focus() : menu.current?.focus());
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); window.removeEventListener("resize", reposition); window.removeEventListener("scroll", reposition, true); };
  }, [open]);

  useEffect(() => { if (highlighted >= filtered.length) setHighlighted(Math.max(0, filtered.length - 1)); }, [filtered.length, highlighted]);

  const choose = (option: AppSelectOption) => { if (option.disabled) return; onChange(option.value); setOpen(false); root.current?.querySelector("button")?.focus(); };
  const move = (direction: 1 | -1) => {
    if (!enabled.length) return;
    const current = enabled.findIndex(({ index }) => index === highlighted);
    const next = enabled[(current + direction + enabled.length) % enabled.length];
    if (next) setHighlighted(next.index);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) { event.preventDefault(); openMenu(); return; }
    if (!open) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); move(event.key === "ArrowDown" ? 1 : -1); }
    if (event.key === "Enter" && filtered[highlighted]) { event.preventDefault(); choose(filtered[highlighted]); }
    if (event.key === "Home") { event.preventDefault(); setHighlighted(enabled[0]?.index ?? 0); }
    if (event.key === "End") { event.preventDefault(); setHighlighted(enabled.at(-1)?.index ?? 0); }
  };

  const groups = Array.from(new Set(filtered.map((option) => option.group ?? "")));
  return <div className={`app-select ${compact ? "app-select--compact" : ""}`} ref={root}>
    <button type="button" role="combobox" className={`app-select__trigger ${className}`} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listboxId : undefined} aria-required={required} disabled={disabled} onClick={() => open ? setOpen(false) : openMenu()} onKeyDown={onKeyDown}><span>{selected?.label ?? "Select"}</span><ChevronDown /></button>
    {open && createPortal(<div className={`app-select__popover ${position.openAbove ? "app-select__popover--above" : ""}`} ref={menu} style={{ left: position.left, top: position.top, width: position.width }} onKeyDown={onKeyDown}>
      {useSearch && <label className="app-select__search"><Search /><input ref={searchInput} value={query} onChange={(event) => { setQuery(event.target.value); setHighlighted(0); }} placeholder="Search options" aria-label={`Search ${ariaLabel}`} /></label>}
      <div className="app-select__options" id={listboxId} role="listbox" aria-label={ariaLabel} tabIndex={useSearch ? -1 : 0}>
        {groups.map((group) => <div className="app-select__group" key={group || "default"}>{group && <p>{group}</p>}{filtered.map((option, index) => (option.group ?? "") === group && <button type="button" role="option" aria-selected={option.value === value} disabled={option.disabled} className={highlighted === index ? "highlighted" : ""} onPointerEnter={() => setHighlighted(index)} onClick={() => choose(option)} key={`${group}-${option.value}`}><span>{option.label}</span>{option.value === value && <Check />}</button>)}</div>)}
        {!filtered.length && <p className="app-select__empty">No matching options</p>}
      </div>
    </div>, document.body)}
  </div>;
}
