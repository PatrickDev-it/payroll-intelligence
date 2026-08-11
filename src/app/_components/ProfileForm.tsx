"use client";

import type { CSSProperties } from "react";
import type { EUCountry, InputDescriptor } from "@engine/model/employee-profile.ts";
import { EU_CATALOG } from "@countries/catalog.ts";
import { indicativeInailPercent } from "@countries/it/inail.ts";
import { paramNameOf } from "../_lib/fields.ts";
import { countryName, localizeInput, message, type Locale } from "../_lib/i18n.ts";
import { CONTROL_CLASS, Field } from "./Field.tsx";
import { MoneyInput } from "./MoneyInput.tsx";
import { SelectControl } from "./ui/Select.tsx";

/**
 * One country-driven parameter rail. Country is permanently first because it
 * changes every field that follows. The adapter still owns the field list and
 * its order; this component only changes its responsive presentation.
 *
 * Desktop pairs both rows on shared tracks, so every control edge has a visual anchor.
 * Smaller viewports reuse the same task order in a compact responsive grid: short
 * controls share tracks while fields with long values can span two. No control is duplicated.
 */
type Props = {
  country: EUCountry;
  inputs: readonly InputDescriptor[];
  values: Record<string, string>;
  supported: readonly EUCountry[];
  taxYear: number;
  grossError?: string | undefined;
  onFieldChange: (field: string, value: string) => void;
  locale: Locale;
};

const COMPACT_PARAMETER_ROWS: Partial<Record<EUCountry, readonly string[]>> = {
  IT: ["payPeriods", "companySize"],
};

const IT_INAIL_RISK_FIELD = "countryOptions.inailRiskClass";
const IT_INAIL_RATE_FIELD = "countryOptions.inailRatePercent";

export function ProfileForm({
  country,
  inputs,
  values,
  supported,
  taxYear,
  grossError,
  onFieldChange,
  locale,
}: Props) {
  const localizedInputs = inputs
    .filter((input) => !input.hidden)
    .map((input) => localizeInput(locale, country, input));
  const grossInput = localizedInputs.find((input) => input.field === "grossAnnual");
  const dependentInputs = localizedInputs.filter((input) => input.field !== "grossAnnual");
  const inailRiskInput = country === "IT"
    ? dependentInputs.find((input) => input.field === IT_INAIL_RISK_FIELD)
    : undefined;
  const inailRateInput = country === "IT"
    ? dependentInputs.find((input) => input.field === IT_INAIL_RATE_FIELD)
    : undefined;
  const desktopInputs = country === "IT"
    ? dependentInputs.filter((input) => input.field !== IT_INAIL_RATE_FIELD)
    : dependentInputs;
  const compactRowFields = COMPACT_PARAMETER_ROWS[country] ?? [];
  const compactRowInputs = compactRowFields
    .map((field) => dependentInputs.find((input) => input.field === field))
    .filter((input): input is InputDescriptor => input !== undefined);
  const hasCompactRow =
    compactRowFields.length > 1 && compactRowInputs.length === compactRowFields.length;
  const compactRowFieldSet = new Set(compactRowFields);
  const compactRowAnchor = hasCompactRow ? compactRowFields.at(-1) : undefined;
  const desktop = desktopLayout(country, desktopInputs);
  const t = (key: Parameters<typeof message>[1], vars?: Record<string, string | number>) =>
    message(locale, key, vars);
  const countryHelp = t("countryHelp", { year: taxYear, count: supported.length });

  return (
    <form
      data-testid="profile-form"
      method="get"
      action="/"
      onSubmit={(event) => event.preventDefault()}
      className="parameter-form"
      style={
        {
          "--parameter-desktop-template": desktop.template,
        } as CSSProperties
      }
    >
      <fieldset data-testid="parameter-primary" className="parameter-primary">
        <legend className="sr-only">{t("primaryParameters")}</legend>

        <div className="parameter-cell parameter-country" style={desktop.country}>
          <Field
            id="field-country"
            label={t("country")}
            help={countryHelp}
            example={t("countryExample")}
            source={t("countrySource")}
            required
          >
            {(aria) => (
              <SelectControl
                {...aria}
                name="country"
                nativeLabel={t("country")}
                value={country}
                onValueChange={(value) => onFieldChange("country", value)}
                options={EU_CATALOG.map((entry) => ({
                  value: entry.code,
                  label: `${entry.flag} ${countryName(locale, entry.code)}${
                    supported.includes(entry.code) ? "" : ` — ${t("unavailable")}`
                  }`,
                }))}
                required
              />
            )}
          </Field>
        </div>

        {grossInput ? (
          <div className="parameter-cell parameter-money" style={desktop.gross}>
            <Control
              input={grossInput}
              values={values}
              error={grossError}
              onFieldChange={onFieldChange}
              locale={locale}
            />
          </div>
        ) : null}
      </fieldset>

      <fieldset
        data-testid="parameter-secondary"
        className="parameter-secondary"
      >
        <legend className="sr-only">{t("otherParameters")}</legend>
        {dependentInputs.map((input) => {
          if (country === "IT" && input.field === IT_INAIL_RATE_FIELD) return null;

          if (
            country === "IT" &&
            input.field === IT_INAIL_RISK_FIELD &&
            inailRiskInput &&
            inailRateInput
          ) {
            return (
              <InailHybridCell
                key={input.field}
                riskInput={inailRiskInput}
                rateInput={inailRateInput}
                values={values}
                taxYear={taxYear}
                onFieldChange={onFieldChange}
                style={desktop.fields.get(input.field)}
              />
            );
          }

          if (hasCompactRow && compactRowFieldSet.has(input.field)) {
            if (input.field !== compactRowAnchor) return null;
            return (
              <div
                key="compact-parameter-row"
                data-testid="parameter-compact-row"
                className="parameter-compact-row"
              >
                {compactRowInputs.map((compactInput) => (
                  <ParameterCell
                    key={compactInput.field}
                    input={compactInput}
                    values={values}
                    onFieldChange={onFieldChange}
                    locale={locale}
                    style={desktop.fields.get(compactInput.field)}
                  />
                ))}
              </div>
            );
          }

          return (
            <ParameterCell
              key={input.field}
              input={input}
              values={values}
              onFieldChange={onFieldChange}
              locale={locale}
              style={desktop.fields.get(input.field)}
            />
          );
        })}
      </fieldset>

    </form>
  );
}

function InailHybridCell({
  riskInput,
  rateInput,
  values,
  taxYear,
  onFieldChange,
  style,
}: {
  riskInput: InputDescriptor;
  rateInput: InputDescriptor;
  values: Record<string, string>;
  taxYear: number;
  onFieldChange: (field: string, value: string) => void;
  style?: CSSProperties | undefined;
}) {
  const riskName = paramNameOf(riskInput.field);
  const rateName = paramNameOf(rateInput.field);
  const riskValue = values[riskName] ?? String(riskInput.defaultValue ?? "");
  const exactRate = values[rateName] ?? "";
  const displayedRate = exactRate || indicativeInailPercent(riskValue, taxYear);

  return (
    <div
      className="parameter-cell parameter-cell-wide parameter-inail-hybrid"
      data-parameter-field={riskInput.field}
      data-parameter-size="wide"
      style={style}
    >
      <Field
        id="field-inail"
        label={riskInput.label}
        help={`${riskInput.help ?? ""} ${rateInput.help ?? ""}`.trim()}
        example={`${riskInput.example ?? ""} ${rateInput.example ?? ""}`.trim()}
        source={`${riskInput.source ?? ""} ${rateInput.source ?? ""}`.trim()}
        required={riskInput.required}
      >
        {(aria) => (
          <div data-testid="inail-hybrid" className="inail-hybrid-control">
            <SelectControl
              {...aria}
              id="field-inail"
              name={riskName}
              nativeLabel={riskInput.label}
              value={riskValue}
              onValueChange={(nextValue) => onFieldChange(riskName, nextValue)}
              options={riskInput.options ?? []}
              required={riskInput.required}
              className="inail-hybrid-select-trigger"
            />
            <span className="inail-hybrid-separator" aria-hidden="true">/</span>
            <div className="inail-hybrid-rate">
              <label htmlFor="field-inailRatePercent" className="sr-only">
                {rateInput.label} %
              </label>
              <input
                id="field-inailRatePercent"
                data-control="number"
                aria-label={`${rateInput.label} %`}
                aria-describedby={aria["aria-describedby"]}
                name={rateName}
                type="number"
                inputMode="decimal"
                min={rateInput.min ?? 0}
                max={rateInput.max}
                step="0.01"
                value={displayedRate || "0"}
                onChange={(event) => onFieldChange(rateName, event.target.value)}
                className="inail-hybrid-rate-input tabular"
              />
              <span className="inail-hybrid-percent" aria-hidden="true">%</span>
            </div>
          </div>
        )}
      </Field>
    </div>
  );
}

function ParameterCell({
  input,
  values,
  onFieldChange,
  locale,
  style,
}: {
  input: InputDescriptor;
  values: Record<string, string>;
  onFieldChange: (field: string, value: string) => void;
  locale: Locale;
  style?: CSSProperties | undefined;
}) {
  const size = fieldSize(input);
  return (
    <div
      className={`parameter-cell ${size}`}
      data-parameter-field={input.field}
      data-parameter-size={size.replace("parameter-cell-", "")}
      style={style}
    >
      <Control input={input} values={values} onFieldChange={onFieldChange} locale={locale} />
    </div>
  );
}

function Control({
  input,
  values,
  error,
  onFieldChange,
  locale,
}: {
  input: InputDescriptor;
  values: Record<string, string>;
  error?: string | undefined;
  onFieldChange: (field: string, value: string) => void;
  locale: Locale;
}) {
  const name = paramNameOf(input.field);
  const id = `field-${name}`;
  const value = values[name] ?? String(input.defaultValue ?? "");

  return (
    <Field
      id={id}
      label={input.label}
      shortLabel={input.shortLabel}
      help={input.help}
      example={input.example}
      source={input.source}
      error={error}
      required={input.required}
    >
      {(aria) => {
        if (input.kind === "money") {
          return (
            <MoneyInput
              id={id}
              value={value.replace(/\D/g, "")}
              onChange={(digits) => onFieldChange(name, digits)}
              min={input.min ?? 1}
              max={input.max ?? 1_000_000}
              invalid={Boolean(error)}
              describedBy={aria["aria-describedby"]}
              locale={locale}
            />
          );
        }

        if (input.kind === "select" && input.options) {
          return (
            <SelectControl
              {...aria}
              name={name}
              nativeLabel={input.label}
              value={value}
              onValueChange={(nextValue) => onFieldChange(name, nextValue)}
              options={input.options}
              required={input.required}
            />
          );
        }

        return (
          <input
            {...aria}
            data-control="number"
            name={name}
            type="number"
            inputMode={input.kind === "decimal" ? "decimal" : "numeric"}
            min={input.min ?? 0}
            max={input.max}
            step={input.kind === "decimal" ? "0.01" : 1}
            value={value}
            onChange={(event) => onFieldChange(name, event.target.value)}
            className={`${CONTROL_CLASS} tabular`}
          />
        );
      }}
    </Field>
  );
}

/** Width follows the text that must remain visible, on the shared grid only. */
function fieldSize(input: InputDescriptor): string {
  // Numeric controls carry short values even when their floating label is
  // descriptive. Keeping them compact is what lets dense country adapters
  // (notably Germany) retain the same two-row rhythm as every other country.
  if (input.kind === "integer" || input.kind === "decimal" || input.field === "payPeriods") {
    return "parameter-cell-compact";
  }

  const visibleLabel = input.shortLabel ?? input.label;
  const longestChoice = Math.max(...(input.options?.map(({ label }) => label.length) ?? [0]));
  const longest = Math.max(visibleLabel.length, longestChoice);
  if (longest <= 10) return "parameter-cell-compact";
  if (longest <= 24) return "parameter-cell-medium";
  return "parameter-cell-wide";
}

type DesktopLayout = {
  readonly template: string;
  readonly country: CSSProperties;
  readonly gross: CSSProperties;
  readonly fields: ReadonlyMap<string, CSSProperties>;
};

type LayoutItem = {
  readonly key: string;
  readonly weight: number;
};

/**
 * Compose two rows around SHARED columns. The old dense grid sized every cell
 * independently, so its second row could never repeat the first row's axes.
 * Here the lightest-width pairing is chosen once, then both rows consume the
 * same column template: a compact field can sit under another compact field,
 * while broad decisions share a broad column.
 */
function desktopLayout(country: EUCountry, inputs: readonly InputDescriptor[]): DesktopLayout {
  const taskFlow = taskFlowDesktopLayout(country, inputs);
  if (taskFlow) return taskFlow;

  const controlCount = inputs.length + 2;
  const columnCount = Math.ceil(controlCount / 2);
  const hasNestedPair = controlCount % 2 === 1;
  const topInputCount = Math.max(0, columnCount - (hasNestedPair ? 3 : 2));
  const chosen = bestTopInputIndices(inputs, topInputCount, columnCount, hasNestedPair);
  const topInputs = inputs.filter((_, index) => chosen.has(index));
  const bottomInputs = inputs.filter((_, index) => !chosen.has(index));

  const top: LayoutItem[] = hasNestedPair
    ? [
        { key: "$country-start", weight: 0.625 },
        { key: "$country-end", weight: 0.625 },
        { key: "$gross", weight: 0.8 },
        ...topInputs.map(layoutItem),
      ]
    : [
        { key: "$country", weight: 1.25 },
        { key: "$gross", weight: 0.8 },
        ...topInputs.map(layoutItem),
      ];
  const bottom = bottomInputs.map(layoutItem);
  const weights = Array.from({ length: columnCount }, (_, index) =>
    Math.max(top[index]?.weight ?? 0.55, bottom[index]?.weight ?? 0.55),
  );
  const fields = new Map<string, CSSProperties>();

  top.forEach((item, index) => {
    if (!item.key.startsWith("$")) fields.set(item.key, gridCell(1, index + 1));
  });
  bottom.forEach((item, index) => fields.set(item.key, gridCell(2, index + 1)));

  return {
    template: weights.map((weight) => `minmax(0, ${weight}fr)`).join(" "),
    country: gridCell(1, 1, hasNestedPair ? 2 : 1),
    gross: gridCell(1, hasNestedPair ? 3 : 2),
    fields,
  };
}

type DesktopTaskFlow = {
  readonly top: readonly string[];
  readonly bottom: readonly string[];
  readonly spans?: Readonly<Record<string, number>>;
  readonly weights?: Readonly<Record<string, number>>;
};

const DESKTOP_TASK_FLOWS: Readonly<Record<EUCountry, DesktopTaskFlow>> = {
  // Where and under which employment agreement? Then pay → agreement → level → periods.
  IT: {
    top: [
      "$country",
      "location",
      "contractType",
      "companySize",
      "countryOptions.pensionCeilingStatus",
    ],
    bottom: [
      "$gross",
      "collectiveAgreement",
      "jobLevel",
      "payPeriods",
      "countryOptions.inailRiskClass",
    ],
    weights: { "countryOptions.inailRiskClass": 1.5 },
  },
  // Tax identity first; health, accident and employer-specific rates second.
  DE: {
    top: [
      "$country",
      "region",
      "countryOptions.steuerklasse",
      "countryOptions.churchMember",
      "age",
      "countryOptions.children",
    ],
    bottom: [
      "$gross",
      "countryOptions.zusatzbeitrag",
      "countryOptions.zusatzbeitragRatePercent",
      "countryOptions.unfallRiskClass",
      "countryOptions.unfallRatePercent",
      "countryOptions.u2RatePercent",
    ],
    weights: { "$country": 1, "$gross": 1 },
  },
  // Jurisdiction and contract first; pay → contribution group → periods → withholding second.
  ES: {
    top: [
      "$country",
      "region",
      "contractType",
      "countryOptions.cnaeRiskClass",
    ],
    bottom: [
      "$gross",
      "jobLevel",
      "payPeriods",
      "countryOptions.aeatWithholdingRate",
      "countryOptions.atepRatePercent",
    ],
    spans: { "countryOptions.cnaeRiskClass": 2 },
  },
  // Household/company context first; pay → status → employer levies and risk second.
  FR: {
    top: [
      "$country",
      "region",
      "countryOptions.foyer",
      "countryOptions.children",
      "companySize",
    ],
    bottom: [
      "$gross",
      "countryOptions.statut",
      "countryOptions.versementMobilite",
      "countryOptions.versementMobiliteRatePercent",
      "countryOptions.atmpRiskClass",
      "countryOptions.atmpRatePercent",
    ],
    spans: { companySize: 2 },
  },
};

/**
 * Each country reads as two parallel questions: context/profile above and the
 * resulting pay/company levers below. The map captures payroll semantics; this
 * builder owns all grid mechanics, including the single German nested pair.
 */
function taskFlowDesktopLayout(
  country: EUCountry,
  inputs: readonly InputDescriptor[],
): DesktopLayout | undefined {
  const flow = DESKTOP_TASK_FLOWS[country];
  const byField = new Map(inputs.map((input) => [input.field, input]));
  const fieldKeys = [...flow.top, ...flow.bottom].filter((key) => !key.startsWith("$"));
  if (inputs.length !== fieldKeys.length || fieldKeys.some((field) => !byField.has(field))) {
    return undefined;
  }

  const spanOf = (key: string) => flow.spans?.[key] ?? 1;
  const trackCount = (row: readonly string[]) => row.reduce((sum, key) => sum + spanOf(key), 0);
  const columnCount = trackCount(flow.top);
  if (trackCount(flow.bottom) !== columnCount) return undefined;

  const weightOf = (key: string) => {
    const override = flow.weights?.[key];
    if (override !== undefined) return override;
    if (key === "$country" || key === "$gross") return 0.8;
    return fieldWeight(byField.get(key)!);
  };
  const rowWeights = (row: readonly string[]) => {
    const weights = Array.from({ length: columnCount }, () => 0.55);
    let start = 0;
    for (const key of row) {
      const span = spanOf(key);
      const trackWeight = weightOf(key) / span;
      for (let index = start; index < start + span; index += 1) {
        weights[index] = Math.max(weights[index]!, trackWeight);
      }
      start += span;
    }
    return weights;
  };
  const topWeights = rowWeights(flow.top);
  const bottomWeights = rowWeights(flow.bottom);
  const weights = topWeights.map((weight, index) => Math.max(weight, bottomWeights[index]!));
  const fields = new Map<string, CSSProperties>();
  let countryCell: CSSProperties | undefined;
  let grossCell: CSSProperties | undefined;

  const place = (row: readonly string[], rowNumber: number) => {
    let column = 1;
    for (const key of row) {
      const span = spanOf(key);
      const cell = gridCell(rowNumber, column, span);
      if (key === "$country") countryCell = cell;
      else if (key === "$gross") grossCell = cell;
      else fields.set(key, cell);
      column += span;
    }
  };
  place(flow.top, 1);
  place(flow.bottom, 2);

  if (!countryCell || !grossCell) return undefined;

  return {
    template: weights.map((weight) => `minmax(0, ${weight}fr)`).join(" "),
    country: countryCell,
    gross: grossCell,
    fields,
  };
}

function bestTopInputIndices(
  inputs: readonly InputDescriptor[],
  count: number,
  columnCount: number,
  hasNestedPair: boolean,
): ReadonlySet<number> {
  let best = new Set<number>();
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of combinations(inputs.length, count)) {
    // Geography is the first discriminant after country and gross. Keep it in
    // the scanning row even if a narrower numerical pairing scores marginally
    // better.
    if (count > 0 && !candidate.includes(0)) continue;
    const chosen = new Set(candidate);
    const top = hasNestedPair
      ? [
          0.625,
          0.625,
          0.8,
          ...inputs.filter((_, index) => chosen.has(index)).map(fieldWeight),
        ]
      : [
        1.25,
        0.8,
        ...inputs.filter((_, index) => chosen.has(index)).map(fieldWeight),
        ];
    const bottom = inputs.filter((_, index) => !chosen.has(index)).map(fieldWeight);
    const score = Array.from({ length: columnCount }, (_, index) => {
      const a = top[index] ?? 0.55;
      const b = bottom[index] ?? 0.55;
      return (a - b) ** 2;
    }).reduce((sum, value) => sum + value, 0);

    if (score < bestScore) {
      best = chosen;
      bestScore = score;
    }
  }

  return best;
}

function combinations(length: number, count: number): readonly number[][] {
  const result: number[][] = [];
  const visit = (start: number, selected: number[]) => {
    if (selected.length === count) {
      result.push(selected);
      return;
    }
    for (let index = start; index <= length - (count - selected.length); index += 1) {
      visit(index + 1, [...selected, index]);
    }
  };
  visit(0, []);
  return result;
}

function layoutItem(input: InputDescriptor): LayoutItem {
  return { key: input.field, weight: fieldWeight(input) };
}

function fieldWeight(input: InputDescriptor): number {
  const size = fieldSize(input);
  if (size === "parameter-cell-compact") return 0.75;
  if (size === "parameter-cell-medium") return 1.15;
  return 1.65;
}

function gridCell(row: number, column: number, span = 1): CSSProperties {
  return {
    "--parameter-desktop-row": String(row),
    "--parameter-desktop-column": `${column} / span ${span}`,
  } as CSSProperties;
}
