"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

type SelectOption = {
  value: string;
  label: string;
};

type SelectDropdownProps = {
  label?: string;
  value: string;
  options: readonly SelectOption[] | readonly string[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  buttonClassName?: string;
};

function normalizeOptions(
  options: readonly SelectOption[] | readonly string[],
): SelectOption[] {
  return options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );
}

export function SelectDropdown({
  label,
  value,
  options,
  placeholder = "선택해 주세요",
  onChange,
  className = "",
  buttonClassName = "",
}: SelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const normalized = normalizeOptions(options);
  const selected = normalized.find((option) => option.value === value) ?? null;

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;

    const updatePosition = () => {
      const button = rootRef.current?.querySelector("button");
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight ?? 200;
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const openUpward = spaceBelow < menuHeight && rect.top > spaceBelow;

      setMenuStyle({
        position: "fixed",
        left: rect.left,
        width: Math.max(rect.width, 200),
        top: openUpward ? undefined : rect.bottom + 8,
        bottom: openUpward ? window.innerHeight - rect.top + 8 : undefined,
        zIndex: 200,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label={label ?? placeholder}
            style={menuStyle}
            className="max-h-[280px] overflow-y-auto rounded-2xl border border-[#E5E8EB] bg-white p-2 shadow-[0_16px_40px_rgba(0,0,0,0.14)]"
          >
            {normalized.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] font-semibold transition-colors ${
                    isSelected
                      ? "bg-[#F2F8FF] text-[#3182F6]"
                      : "text-[#191F28] hover:bg-[#F2F4F6]"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="shrink-0 text-[#3182F6]"
                    >
                      <path
                        d="M5 12.5l5 5L19 7"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label ? (
        <label className="mb-1.5 block text-[13px] font-semibold text-[#64748B]">
          {label}
        </label>
      ) : null}

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-left text-[14px] outline-none transition hover:bg-white focus:border-[#3182F6] focus:bg-white focus:ring-2 focus:ring-[#3182F6]/15 ${
          open
            ? "border-[#3182F6] bg-white ring-2 ring-[#3182F6]/15"
            : "border-gray-300"
        } ${buttonClassName}`}
      >
        <span
          className={`truncate ${
            selected ? "font-medium text-[#1E293B]" : "text-[#64748B]"
          }`}
        >
          {selected?.label ?? placeholder}
        </span>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
            open ? "bg-[#E8F3FF] text-[#3182F6]" : "bg-[#F2F4F6] text-[#4E5968]"
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M6.5 9.5L12 15l5.5-5.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {menu}
    </div>
  );
}
