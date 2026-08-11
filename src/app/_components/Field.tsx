"use client";

/**
 * One labelled control, wired for accessibility once so no call site has to
 * remember.
 *
 * What this owns, and why it is not left to each field:
 *
 * - `<label for>` ↔ `id`. An e2e test counts controls without one and fails at
 *   the first orphan, because a placeholder pretending to be a label is
 *   invisible to a screen reader and disappears the moment you type.
 * - `aria-describedby` pointing at the help text AND the error, in that order,
 *   so the description is announced with the control rather than lost above it.
 *   The old build put explanations in a `title` tooltip: unreachable by
 *   keyboard, unread by most screen readers, and gone on touch.
 * - `aria-invalid` and `role="alert"` on the error, so a rejected value is
 *   announced rather than merely coloured.
 */

import { useRef, type ReactNode } from "react";
import { useI18n } from "./I18nProvider.tsx";

export type FieldProps = {
  id: string;
  label: string;
  shortLabel?: string | undefined;
  help?: string | undefined;
  example?: string | undefined;
  source?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  /** Rendered to the right of the label — a unit, a hint, a reset. */
  aside?: ReactNode;
  children: (aria: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean | undefined;
  }) => ReactNode;
};

export function Field({
  id,
  label,
  shortLabel,
  help,
  example,
  source,
  error,
  required,
  aside,
  children,
}: FieldProps) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field">
      <div className="field-control-shell">
        <label htmlFor={id} className="field-floating-label type-label" title={label}>
          <span className="field-label-text">
            {shortLabel ? (
              <>
                <span className="lg:hidden">{label}</span>
                <span className="hidden lg:inline">{shortLabel}</span>
              </>
            ) : (
              label
            )}
          </span>
          {required ? (
            <span className="ml-[var(--space-label)] text-accent" aria-hidden>
              *
            </span>
          ) : null}
        </label>

        {children({
          id,
          "aria-describedby": describedBy,
          "aria-invalid": error ? true : undefined,
        })}

        {aside ? <span className="field-aside">{aside}</span> : null}
        {help ? <FieldInfo id={id} label={label} help={help} example={example} source={source} /> : null}
      </div>

      {help ? (
        <p id={helpId} className="sr-only">
          {help}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="type-meta mt-[var(--space-tight)] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function FieldInfo({
  id,
  label,
  help,
  example,
  source,
}: {
  id: string;
  label: string;
  help: string;
  example?: string | undefined;
  source?: string | undefined;
}) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = `${id}-dialog-title`;
  const bodyId = `${id}-dialog-body`;

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="field-help-trigger"
        aria-label={t("infoAbout", { label })}
        aria-haspopup="dialog"
        aria-controls={`${id}-dialog`}
        onClick={() => dialogRef.current?.showModal()}
      >
        i
      </button>

      <dialog
        ref={dialogRef}
        id={`${id}-dialog`}
        data-testid="field-info-dialog"
        className="field-info-dialog"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onClose={() => triggerRef.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div
          className="field-info-scrim"
          style={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
          aria-hidden
          onClick={close}
        />
        <div className="field-info-panel" role="document">
          <div className="flex items-start justify-between gap-[var(--space-card)]">
            <div className="min-w-0">
              <p className="type-eyebrow text-accent-ink">{t("parameterGuide")}</p>
              <p id={titleId} className="type-title mt-[var(--space-tight)] text-ink">
                {label}
              </p>
            </div>
            <button type="button" className="field-info-close" aria-label={t("close")} onClick={close}>
              ×
            </button>
          </div>

          <div id={bodyId} className="mt-[var(--space-card)] flex flex-col gap-[var(--space-card-block)]">
            <InfoSection label={t("whatChanges")}>{help}</InfoSection>
            {example ? <InfoSection label={t("example")}>{example}</InfoSection> : null}
            <InfoSection label={t("source")}>
              {source ?? t("defaultSource")}
            </InfoSection>
          </div>

          <div className="mt-[var(--space-card)] flex justify-end border-t border-line pt-[var(--space-content)]">
            <a href="#methodology" className="type-label text-accent-ink hover:underline" onClick={close}>
              {t("methodologyAndSources")}
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}

function InfoSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="type-label text-ink">{label}</p>
      <p className="type-body mt-[var(--space-label)] text-ink-muted">{children}</p>
    </div>
  );
}

/**
 * The one control style in the product. Its height is 10 × --p (40px at the
 * default scale), and the e2e suite enforces a usable floor.
 */
export const CONTROL_CLASS =
  "h-10 w-full min-w-0 rounded-md border border-line-strong bg-surface pr-[var(--control-trailing-space)] pl-[var(--space-control)] text-sm leading-none " +
  "text-ink transition-colors duration-150 hover:border-ink-subtle " +
  "focus:border-accent focus:outline-none aria-[invalid=true]:border-danger";
