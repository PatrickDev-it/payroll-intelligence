# 🇩🇪 Germany — Country Factsheet

**Tier: 🟠 EXPERIMENTAL — implemented** · Tax year **2026** · Currency **EUR**

> The annual stable-salary wage-tax path is reconciled exactly against four complete BMF PAP
> 2026 vectors (Steuerklassen I–IV). The complete result remains *experimental* whenever the
> health-fund `Zusatzbeitrag`, Berufsgenossenschaft accident rate or U2 rate use scenario
> values rather than exact employer declarations. U1 requires both the represented AAG
> headcount and an exact Krankenkasse rate; it is never guessed.

Germany is the structurally hardest EU income tax to model correctly, for one reason: **it is
not a bracket table.** §32a EStG defines the tax as a **piecewise polynomial**. Modelling it
as brackets is the most common error in German net calculators and produces errors of
several hundred euros in the progressive zone.

---

## 1. Income tax — `Einkommensteuer` / `Lohnsteuer`

### Zones (§32a EStG, 2026)

| Zone | `zu versteuerndes Einkommen` | Rate |
| --- | --- | --- |
| 1 — `Grundfreibetrag` | € 0 – 12,348 | **0 %** |
| 2 — progression | € 12,349 – 69,878 | **14 % → 42 %**, continuously |
| 3 — proportional | € 69,879 – 277,825 | **42 %** |
| 4 — `Reichensteuer` | above € 277,826 | **45 %** |

`Grundfreibetrag` **€12,348** (single) / **€24,696** (jointly assessed).

> **Zone 2 is not linear and not a bracket.** It is defined by two quadratic polynomials with
> distinct coefficients (a sub-zone break around €17,800). The marginal rate rises
> continuously from 14 % to 42 %, so the average rate at any point cannot be recovered from a
> bracket table. The engine models this with the `formula` primitive, coefficients stored as
> data and re-read from §32a each year.

### Surcharges

| Item | Rate | Base |
| --- | --- | --- |
| `Solidaritätszuschlag` | 5.5 % | Assessed income tax, **only above a `Freigrenze`** of roughly €20,000 of tax (≈ €100k income). Zero for the reference case. |
| `Kirchensteuer` | **8 %** (Bayern, Baden-Württemberg) / **9 %** (all other Länder) | Assessed income tax. Only for registered church members. |

Church tax is the German geography discriminant, and it is opt-in by religious affiliation
rather than by residence. The default scenario is 0 %, and membership is an explicit input.

### `Steuerklassen` — the family discriminant

| Class | Applies to | Effect | Modelled |
| --- | --- | --- | :---: |
| **I** ← default | Single | Baseline (§ 32a Abs. 1) | ✅ |
| II | Single parent | + base `Entlastungsbetrag` €4,260 | ✅ |
| III | Married, higher earner | Splitting tariff (§ 32a Abs. 5): tax on half, doubled | ✅ |
| IV | Married, similar earnings | Each as if single — same tariff as I | ✅ |
| V | Married, lower earner | Own construction under § 39b Abs. 2 Satz 7-9 | ❌ |
| VI | Second job | No allowances | ❌ |

`Ehegattensplitting` (joint income halved, taxed, doubled) is **the single largest family tax
effect in the EU** — worth up to ~€10,000/yr for a single-earner couple. A German calculator
without `Steuerklasse` is not imprecise; it is wrong for half the population.

The extra €240 per further eligible child belongs to the ELStAM allowance path and is not
inferred from the separate Pflege count of children under 25. Faktorverfahren and other
ELStAM allowances are outside the represented PAP scope.

---

## 2. Employee social security

Four branches, each with its own ceiling (`Beitragsbemessungsgrenze`).

| Branch | Total | Employee | Employer | Ceiling (annual) |
| --- | ---: | ---: | ---: | ---: |
| `Rentenversicherung` (pension) | 18.6 % | **9.3 %** | 9.3 % | **€ 101,400** |
| `Arbeitslosenversicherung` (unemployment) | 2.6 % | **1.3 %** | 1.3 % | € 101,400 |
| `Krankenversicherung` (health) — base | 14.6 % | **7.3 %** | 7.3 % | **€ 69,750** |
| `Zusatzbeitrag` — fund-specific | ≈ 2.9 % avg | **≈ 1.45 %** | ≈ 1.45 % | € 69,750 |
| `Pflegeversicherung` (long-term care) | ≈ 3.6 % | **1.8 %** | 1.8 % | € 69,750 |
| `Pflege` childless surcharge (age 23+) | +0.6 % | **+0.6 %** | — | € 69,750 |

**Employee total ≈ 21.75 %** (childless) / **21.15 %** (with children) below both ceilings.

Two parameters that are genuinely variable and therefore exposed as inputs:

- **`Zusatzbeitrag`** is set by each health fund and ranges roughly **2.2 % – 4.3 %** in 2026.
  The average announced by the BMG in the Bundesanzeiger on 10 November 2025 is **2.9 %**,
  halved between employer and employee. Up to ~€700/yr of spread at the ceiling.
- **`Pflegeversicherung`** is **3.6 %** in 2026, unchanged. The employee carries 1.8 %, plus
  0.6 pp if childless and aged 23 or over, minus 0.25 pp for each of the second to fifth
  children while the youngest is under 25. ↻ **Sachsen** is a genuine geographic split: the
  employee pays 2.3 % and the employer 1.3 %, because the Land kept the Buß- und Bettag.

### The private-insurance threshold

↻ Above **€77,400/yr** (`Jahresarbeitsentgeltgrenze` 2026, SVBezGrV 2026 — it was €73,800 in
2025) an employee may leave the public system
for `private Krankenversicherung`. This changes both employee and employer cost materially
and is priced by age and health, not by income. Assumed **public** in the prototype.

### The taxable base — where Germany differs from Italy

Contributions are **not** simply deducted. The taxable base is:

```
gross
− Werbungskostenpauschbetrag              € 1,230   (§ 9a Nr. 1a EStG)
− Sonderausgabenpauschbetrag              €    36   (§ 10c EStG)
− Entlastungsbetrag (Steuerklasse II)     € 4,260 + € 240 per further child (§ 24b)
− Vorsorgepauschale                       § 39b Abs. 2 Satz 5 Nr. 3
= zu versteuerndes Einkommen
```

↻ **The `Vorsorgepauschale` changed for 2026** (BMF letter of 14 August 2025). Its parts:

| Part | 2026 rule | Ceiling |
| --- | --- | ---: |
| a) pension | 9.3 % of wage, 100 % deductible since 2023 | € 101,400 |
| b) health | **7.0 %** — the *reduced* rate, not the 7.3 % actually withheld — plus half the fund's Zusatzbeitrag | € 69,750 |
| c) care | the employee's actual care rate | € 69,750 |
| e) unemployment | ↻ **new from 2026**: 1.3 %, but only insofar as b + c + e stays under **€1,900** | € 101,400 |

The €1,900 cap is normally exhausted by b and c alone, so part (e) is zero at any ordinary
salary. ↻ The **minimum Vorsorgepauschale** (12 % of wage, capped at €1,900/€3,000) is
**abolished from 2026**.

At €45,000 the pauschale is €9,067.50 against €9,787.50 of contributions actually withheld —
so the taxable base is €720 HIGHER than "gross minus contributions minus Pauschbeträge" would
give, worth roughly €200 of extra tax. That gap is asserted as a test, not as a comment.

---

## 3. Employer cost

| Item | Rate | Base | On € 45,000 |
| --- | ---: | --- | ---: |
| `Rentenversicherung` | 9.3 % | ≤ 101,400 | € 4,185.00 |
| `Arbeitslosenversicherung` | 1.3 % | ≤ 101,400 | € 585.00 |
| `Krankenversicherung` + half `Zusatzbeitrag` | 8.75 % | ≤ 69,750 | € 3,937.50 |
| `Pflegeversicherung` | 1.8 % (Sachsen 1.3 %) | ≤ 69,750 | € 810.00 |
| `Insolvenzgeldumlage` (U3) | 0.15 % | ≤ 101,400 | € 67.50 |
| `Umlage U1` | declared exact rate, only at AAG count ≤ 30 | recurring pension-insurable pay ≤ 101,400 | conditional |
| `Umlage U2` | ≈ 0.44 % scenario or declared exact rate | recurring pension-insurable pay ≤ 101,400 | € 198.00 |
| `Unfallversicherung` | ≈ 0.5 % 🟠 | gross | € 225.00 |
| **TOTAL EMPLOYER COST** | **1.222 ×** | | **€ 55,008.00** |

U1 applies to employers that generally employ no more than 30 relevant workers. The count has
AAG-specific exclusions/weights and is therefore labelled as such in the input. If it is 30
or lower, calculation refuses to proceed without the exact U1 tariff selected with the
Krankenkasse. U1 and U2 exclude one-off remuneration and stop at the pension contribution
ceiling, as specified by Deutsche Rentenversicherung.

**No severance accrual.** Germany has no TFR equivalent — severance is contingent on
termination, not accrued — which is worth about 7 points of employer cost against Italy.

### Evidence status and remaining scope

The dedicated PAP fixture artefact records all 35 inputs named by Anlage 1, official outputs,
access date, extraction method and SHA-256 of each BMF XML response. At €60,000 annual recurring
pay the engine matches `LSTLZZ` to the cent for classes I–IV. This verifies those recorded
vectors, not unsupported PAP branches or the whole German adapter.

1. Add PAP fixtures at further gross and Soli boundaries without changing expected outputs in
   the same formula patch.
2. Implement `Steuerklassen` V and VI (§ 39b Abs. 2 Satz 7-9 uses its own construction, not the
   plain tariff) and the `Kinderfreibeträge`.
3. Represent private health insurance, Faktorverfahren and ELStAM Freibetrag/Hinzurechnung.
