# 🇮🇹 Italy — Collective Agreements (CCNL)

Why an Italian payroll model cannot be built on statute alone.

---

## 1. What a CCNL is

A `Contratto Collettivo Nazionale di Lavoro` is a sectoral agreement between employer
associations and unions. Roughly **1,000** are registered in the CNEL archive, and one always
applies: the employment contract states which.

The CCNL is **not** a minor overlay on statutory law. It determines:

| Determines | Effect on the calculation |
| --- | --- |
| Minimum pay by level (`minimo tabellare`) | Validates or floors the input RAL |
| **Number of instalments** (12 / 13 / 14) | Changes the **monthly** figure — the headline output |
| `Scatti di anzianità` (seniority increments) | Increases gross over time |
| Supplementary healthcare and pension funds | **Employer cost** line items |
| Sickness top-up above the INPS benefit | Employer cost |
| Notice periods, `TFR` handling nuances | Termination cost |
| Working hours, overtime multipliers | Gross composition |

For a calculator whose primary output is *monthly net*, the instalment count is decisive: the
same €45,000 RAL is €2,145/month over 14 instalments and €2,503/month over 12. Neither is
wrong; they answer different questions. Getting this silently wrong is the most likely way an
Italian user immediately loses trust in the number.

---

## 2. Reference agreement — CCNL Terziario, Distribuzione e Servizi

Confcommercio. The largest private-sector agreement in Italy (~3.5 m workers) and the
prototype's default.

### Levels and minimums

Monthly contractual minimums in force from **November 2025**:

| Level | Typical role | `Minimo tabellare` |
| --- | --- | ---: |
| **Quadri** | Middle management | € 2,183.09 |
| **I** | Highly qualified, coordination responsibility | € 1,966.54 |
| **II** | Specialised functions, autonomy | € 1,701.04 |
| **III** ← default | Qualified, specific technical/administrative skills | **€ 1,453.94** |
| **IV** | Executive tasks requiring practical training | € 1,257.46 |
| **V** | Simple executive tasks | € 1,136.07 |
| **VI** | Basic tasks | € 1,019.94 |
| **VII** | Unskilled | € 873.22 |

Scheduled increase from **1 November 2026**: +€35.00/month at level IV (→ €1,292.46),
re-parameterised across the other levels, under the 2024–2027 renewal.

### Structural parameters

| Parameter | Value |
| --- | --- |
| **Instalments** | **14** — 12 monthly + 13ª (December) + 14ª (July) |
| Weekly hours | 40 |
| Annual leave | 26 working days |
| `Scatti di anzianità` | max 5, every 2 years |
| Probation (level III) | 60 days |
| Supplementary healthcare | **Fondo Est** — employer ≈ €12/month, employee ≈ €2/month |
| Supplementary pension | **Fon.Te** — employer ≈ 1.55 % if the employee joins |

### Minimum annual gross at level III

```
€ 1,453.94 × 14 instalments = € 20,355.16/yr
```

This is the *contractual minimum*, not the market rate — a useful `validate()` floor, not a
prediction.

---

## 3. How the instalment count works

The 13ª and 14ª are **not bonuses**. They are part of the annual gross, accrued monthly and
paid in December and July.

```
RAL € 45,000, 14 instalments  →  € 3,214.29 gross per instalment
RAL € 45,000, 13 instalments  →  € 3,461.54 gross per instalment
RAL € 45,000, 12 instalments  →  € 3,750.00 gross per instalment
```

Annual net is identical in all three cases. Monthly net is not:

| Instalments | Net per instalment | Note |
| --- | ---: | --- |
| 14 | € 2,145.32 | 12 ordinary + 2 extra months |
| 13 | € 2,310.34 | 12 ordinary + 1 extra month |
| 12 | € 2,502.87 | flat |

> **A real-payroll caveat the prototype does not model.** In actual payroll, the 13ª and 14ª
> are taxed **without** the monthly `detrazioni` (which are apportioned over 12 ordinary
> months only). The extra instalment is therefore taxed more heavily than an ordinary month,
> and the *ordinary* months are correspondingly lighter. Annual totals are unaffected — which
> is why an annual projection is legitimate — but a user comparing to their December payslip
> will see a difference. This is stated in the UI rather than modelled.

---

## 4. What is implemented, and what exists

Selectable — the agreements whose **employer fund contribution** could be sourced:

| CCNL | Instalments | Employer fund | Pay table | Tier |
| --- | :---: | --- | --- | :---: |
| Terziario (Confcommercio) | 14 | Fondo Est € 12/month | all 8 levels | 🟡 |
| Metalmeccanici industria | 13 | Metasalute BASE € 13/month | endpoints only (D1, A1) | 🟡 |
| Studi professionali | 14 | Cadiprof + Ebipro € 27/month | levels, no minimums | 🟡 |
| *Nessun CCNL* | 12 | — | — | 🟢 |

Documented but not offered: Metalmeccanici artigianato (13, San.Arti + Fondapi), Turismo (14,
Fast + Fon.Te), Credito ABI (13+, Fondo Sanitario), Chimico-farmaceutico (13, Faschim +
Fonchim), Edilizia (13, Cassa Edile), Dirigenti industria (13, Fasi + Previndai).

**Why so few.** Not an engineering limit. A CCNL touches the calculation in exactly three
places — instalments, the validation floor, one employer-cost line — and none of them touches
IRPEF, INPS or the surtaxes, which are statute. Adding one is data entry. The obstacle is that
Italy has ~1,000 registered agreements whose pay tables live in per-renewal PDFs, with no
machine-readable register like the one the Dipartimento delle Finanze keeps for surtaxes.

Where a level's minimum is not loaded, the engine **skips the check** rather than inventing a
floor — an absent minimum must not become either a silent pass or a fabricated number.

### Deliberately excluded

| CCNL | Reason |
| --- | --- |
| **Edilizia industria** | `Cassa Edile` is not additive to this model. It absorbs holiday pay, the Christmas bonus and part of the TFR — items already counted elsewhere here — so adding it as "+15 %" would double-count them. It must be modelled by *replacing* those lines, and it varies by province. |
| Turismo / Pubblici esercizi | Structurally compatible; the employer share of Fondo Fast was not sourced. |
| Dirigenti industria | Fasi and Previndai matter, but executives have their own contributory regime and ceiling — not the `impiegato` profile this prototype computes. |

---

## 5. Modelling approach

A CCNL is a **rule set keyed by CCNL code**, not code:

```yaml
id: IT.CCNL.TERZIARIO_CONFCOMMERCIO
name: Terziario, Distribuzione e Servizi
cnel_code: H011

parameters:
  instalments: 14
  weekly_hours: 40
  seniority_increments: { max: 5, every_months: 24 }

  levels:
    QUADRI: { minimum_monthly: 2183.09 }
    I:      { minimum_monthly: 1966.54 }
    II:     { minimum_monthly: 1701.04 }
    III:    { minimum_monthly: 1453.94 }
    IV:     { minimum_monthly: 1257.46 }
    V:      { minimum_monthly: 1136.07 }
    VI:     { minimum_monthly: 1019.94 }
    VII:    { minimum_monthly: 873.22 }

  employer_funds:
    - { id: EST,   type: healthcare, employer_monthly: 12.00, employee_monthly: 2.00 }
    - { id: FONTE, type: pension,    employer_rate: 0.0155, optional: true }

effective_from: 2025-11-01
source:
  authority: Confcommercio / CNEL
  document: CCNL Terziario 2024–2027, tabelle retributive
  url: https://www.cnel.it/Archivio-Contratti
```

The engine needs **no CCNL-specific code**: `instalments` drives the monthly division,
`levels` drives validation, `employer_funds` drives employer-cost lines. Adding a CCNL is a
YAML file.

Only three CCNLs are shipped (Terziario, Metalmeccanici Industria, Studi Professionali). The
remaining ~997 are a data-entry problem, not an engineering one — which is the point of
modelling them as data.

---

## 6. Sources

- **CNEL — Archivio Nazionale dei Contratti Collettivi** — the official register:
  https://www.cnel.it/Archivio-Contratti
- **Confcommercio** — CCNL Terziario texts and pay tables:
  https://www.confcommercio.it
- CCNL Terziario Distribuzione e Servizi, renewal 2024–2027, pay tables in force from
  November 2025 and scheduled increases from November 2026
