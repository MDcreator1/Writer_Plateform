"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icon-registry";

export interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string; // Wrapper class
  triggerClassName?: string; // Customize trigger button
  dropdownClassName?: string; // Customize dropdown panel
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  position?: "bottom" | "top";
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select Option",
  className = "",
  triggerClassName = "",
  dropdownClassName = "",
  disabled = false,
  size = "md",
  position = "bottom"
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  // Size configurations
  const sizeStyles = {
    sm: "px-2.5 py-1 text-xs h-8 rounded-lg",
    md: "px-4 py-2 text-sm h-10 rounded-lg",
    lg: "px-5 py-2.5 text-md h-12 rounded-xl"
  };

  const optionSizeStyles = {
    sm: "px-2 py-1.5 text-xs rounded-md",
    md: "px-3 py-2 text-xs font-semibold rounded-lg",
    lg: "px-4 py-2.5 text-sm font-semibold rounded-lg"
  };

  return (
    <div className={`relative inline-block w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        className={`w-full flex items-center justify-between gap-2.5 bg-surface border border-border outline-none transition duration-150 text-left focus:border-accent/70 focus:ring-1 focus:ring-accent/30 ${
          sizeStyles[size]
        } ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-accent"
        } ${triggerClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate text-ink">
          {selectedOption?.icon && <span className="flex shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <Icon
          name="chevronDown"
          className={`h-4 w-4 text-muted transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-accent" : ""
          }`}
        />
      </button>

      {isOpen && (
        <ul
          className={`absolute left-0 z-[1000] w-full min-w-[160px] max-h-60 overflow-y-auto border border-border/40 bg-surface-raised/95 shadow-soft backdrop-blur-xl p-1 gap-0.5 grid focus:outline-none animate-in fade-in zoom-in-95 duration-150 ${
            position === "top" ? "bottom-full mb-1.5" : "mt-1.5"
          } ${
            size === "lg" ? "rounded-2xl" : "rounded-xl"
          } ${dropdownClassName}`}
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full flex items-center justify-between text-left transition-colors cursor-pointer ${
                    optionSizeStyles[size]
                  } ${
                    isSelected
                      ? "bg-accent-soft/70 text-accent border border-accent/15"
                      : "text-soft-ink hover:bg-surface/60 hover:text-ink"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {option.icon && <span className="flex shrink-0">{option.icon}</span>}
                    <span className="truncate">{option.label}</span>
                  </div>
                  {isSelected && <Icon name="check" className="h-3.5 w-3.5 text-accent shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
