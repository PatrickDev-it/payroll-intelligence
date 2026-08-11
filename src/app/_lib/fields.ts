/**
 * Field names ↔ URL parameter names.
 *
 * One rule and one exception list. The rule: a parameter is named after the
 * last segment of the field, so `countryOptions.steuerklasse` is `?steuerklasse`
 * and a new country needs no entry here at all. The exception list exists only
 * because Italy shipped first and its URLs are already in circulation — a link
 * someone sent to their accountant must keep working.
 *
 * Shared by the URL reader and the form, because two copies of this map would
 * eventually disagree and the symptom would be a field that silently ignores
 * what you type.
 */

const LEGACY: Readonly<Record<string, string>> = {
  grossAnnual: "gross",
  municipality: "comune",
  payPeriods: "periods",
  contractType: "contract",
  collectiveAgreement: "ccnl",
  jobLevel: "level",
  companySize: "size",
  "countryOptions.inailRiskClass": "inail",
};

export function paramNameOf(field: string): string {
  return LEGACY[field] ?? field.split(".").at(-1) ?? field;
}
