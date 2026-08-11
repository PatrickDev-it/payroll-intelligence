"use client";

import { useLayoutEffect, useState, type AriaAttributes, type ReactNode } from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { CONTROL_CLASS } from "../Field.tsx";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean | undefined;
};

type SelectControlProps = Pick<
  AriaAttributes,
  "aria-describedby" | "aria-invalid" | "aria-label"
> & {
  id: string;
  name: string;
  nativeLabel: string;
  options: readonly SelectOption[];
  value?: string | undefined;
  defaultValue?: string | undefined;
  onValueChange: (value: string) => void;
  disabled?: boolean | undefined;
  required?: boolean | undefined;
  className?: string | undefined;
  renderValue?: ReactNode;
  hideChevron?: boolean | undefined;
  contentWidth?: "trigger" | "options" | undefined;
};

/**
 * Radix needs a numeric side offset so its collision engine can reserve the
 * gap. Resolve that number from the form's CSS rhythm instead of duplicating a
 * pixel value here; changing `--p` therefore moves controls and menus together.
 */
function useParameterGap() {
  const [gap, setGap] = useState(0);

  useLayoutEffect(() => {
    const syncGap = () => {
      const parameterForm = document.querySelector<HTMLElement>(".parameter-form");
      if (!parameterForm) return;

      const resolvedGap = Number.parseFloat(getComputedStyle(parameterForm).rowGap);
      if (Number.isFinite(resolvedGap)) setGap(resolvedGap);
    };

    syncGap();
    window.addEventListener("resize", syncGap);
    return () => window.removeEventListener("resize", syncGap);
  }, []);

  return gap;
}

/**
 * The product select, composed with the same Radix primitive used by shadcn.
 * Its portal and Popper positioning keep the menu inside the visible viewport;
 * the trigger remains the single labelled, tabbable control in the form.
 */
export function SelectControl({
  id,
  name,
  nativeLabel,
  options,
  value,
  defaultValue,
  onValueChange,
  disabled,
  required,
  className = "",
  renderValue,
  hideChevron = false,
  contentWidth = "trigger",
  ...aria
}: SelectControlProps) {
  const selection =
    value !== undefined ? { value } : defaultValue !== undefined ? { defaultValue } : {};
  const selectedValue = value ?? defaultValue;
  const selectedLabel = options.find((option) => option.value === selectedValue)?.label;
  const contentGap = useParameterGap();

  return (
    <SelectPrimitive.Root
      {...selection}
      disabled={disabled ?? false}
      onValueChange={onValueChange}
    >
      <SelectPrimitive.Trigger
        {...aria}
        id={id}
        data-slot="select-trigger"
        data-control="select"
        data-fallback-for={id}
        data-value={value ?? defaultValue ?? ""}
        aria-required={required || undefined}
        className={`${CONTROL_CLASS} shadcn-select-trigger ${className}`}
      >
        <span className="select-value">
          {renderValue ?? <SelectPrimitive.Value>{selectedLabel}</SelectPrimitive.Value>}
        </span>
        {hideChevron ? null : (
          <SelectPrimitive.Icon asChild>
            <span className="select-chevron" aria-hidden />
          </SelectPrimitive.Icon>
        )}
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          data-slot="select-content"
          position="popper"
          side="bottom"
          align={contentWidth === "options" ? "end" : "start"}
          sideOffset={contentGap}
          avoidCollisions
          data-content-width={contentWidth}
          className="select-content"
        >
          <SelectPrimitive.ScrollUpButton className="select-scroll-button" aria-hidden>
            <span className="select-scroll-chevron select-scroll-chevron-up" />
          </SelectPrimitive.ScrollUpButton>

          <SelectPrimitive.Viewport className="select-viewport">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled ?? false}
                data-slot="select-item"
                data-value={option.value}
                className="select-item"
              >
                <SelectPrimitive.ItemText asChild>
                  <span className="select-item-text">{option.label}</span>
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="select-item-indicator">
                  <span aria-hidden>✓</span>
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>

          <SelectPrimitive.ScrollDownButton className="select-scroll-button" aria-hidden>
            <span className="select-scroll-chevron select-scroll-chevron-down" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>

      <noscript>
        <style>{`.shadcn-select-trigger[data-fallback-for="${id}"]{display:none!important}`}</style>
        <label htmlFor={`${id}-fallback`} className="sr-only">
          {nativeLabel}
        </label>
        <select
          id={`${id}-fallback`}
          name={name}
          defaultValue={value ?? defaultValue}
          disabled={disabled}
          required={required}
          className={`${CONTROL_CLASS} appearance-none ${className}`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      </noscript>
    </SelectPrimitive.Root>
  );
}
