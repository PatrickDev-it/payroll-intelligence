# 🇮🇹 Italy — Discriminants

Everything that changes the Italian result for the same RAL, with magnitude.

Cross-country taxonomy: [../../02-discriminants.md](../../02-discriminants.md).
Magnitudes below are computed at **€45,000 RAL** unless stated.

---

## 1. Impact ranking

| Rank | Discriminant | Δ net at €45k | Modelled |
| ---: | --- | ---: | :---: |
| 1 | `Regime impatriati` (50 % exemption) | **+ € 8,900** | ❌ documented |
| 2 | Municipality of residence | ± € 327 | ✅ 9 modelled |
| 3 | Region of residence | ± € 553 | ✅ all 21 |
| 4 | Dependants aged 21+ | up to − € 1,600 tax | ⚠️ structure only |
| 5 | Contributory ceiling eligibility (pre/post 1996) | 0 at €45k, **± € 2,825** at €150k | ✅ flagged |
| 6 | Number of instalments (12 / 13 / 14) | € 0 annual, **± € 358/month** | ✅ |
| 7 | Fixed-term vs permanent | € 0 employee, **+ € 630** employer | ✅ |
| 8 | INAIL risk class | € 0 employee, **± € 5,800** employer | ✅ parameter |
| 9 | Fringe benefits / welfare | up to + € 1,000 net | ❌ documented |
| 10 | `Premio di risultato` | up to + € 900 | ❌ documented |
| 11 | Under-30 hiring incentive | € 0 employee, − € 6,000 employer | ❌ documented |

---

## 2. Geography — the two surtax layers

Italy taxes income at three levels, and the two sub-national ones are the most under-modelled
discriminant in consumer salary calculators.

| Layer | Range | Modelled |
| --- | --- | --- |
| `Addizionale regionale` | 1.23 % – 3.33 %, per slice **or** on the whole base depending on the region | all **21** regions and autonomous provinces |
| `Addizionale comunale` | 0 % – 1.0 %, each with its own exemption threshold | **9** comuni; the rest refused, not approximated |

**Spread €553.33/year** across the regions on an identical €45,000 salary — Basilicata against
Campania. The comune adds up to €327 on top.

**The municipal threshold is a cliff, not an allowance.** Above it the rate applies to the
*entire* taxable base: in Milan €23,000 pays €0 and €23,001 pays €184.01. See
[income-tax.md §4](income-tax.md#4-municipal-surtax--addizionale-comunale).

Two conventions coexist for the regional surtax — **per slice** (Lombardia, L.R. 10/2003
art. 72) and **whole base** — and the rule object stores which. Assuming one nationally is a
systematic error.

Residence is fixed at **1 January** of the year following the income year, so a December move
changes the whole year.

→ **Full tables, region by region and comune by comune: [geography.md](geography.md).**

---

## 3. Contract and status

| Discriminant | Employee effect | Employer effect |
| --- | --- | --- |
| **Permanent** (default) | — | baseline |
| **Fixed-term** | Minimum employment credit €1,380 instead of €690 (low incomes only) | **+1.40 %** NASpI surcharge = **+€630** at €45k; +0.50 % per renewal |
| **Apprenticeship** | Same tax treatment | Employer contribution ≈ **11.61 %** (firms ≤ 9) — saves ≈ €8,200 |
| **Director** (`amministratore`) | `Gestione Separata` instead of FPLD; no TFR, no NASpI | Different rates entirely |
| **Part-time** | Proportional, but the daily `minimale` (€58.13) can bite | Proportional |
| **Impiegato vs operaio** | — | Different INAIL class; sickness handling differs by CCNL |

---

## 4. Family

Modelled structurally, excluded from the prototype per the brief.

| Situation | Effect |
| --- | --- |
| Children **under 21** | **No payroll effect** — covered by the `Assegno Unico Universale`, paid by INPS outside payroll |
| Children **21+** dependent | `Detrazione` up to ~€800/child, tapering with `reddito complessivo` |
| Dependent spouse | `Detrazione` up to €800, tapering to zero at €80,000 |
| Other dependants | €750, tapering to €80,000; since 2025 restricted to cohabiting ascendants |

A dependant must have own income ≤ **€2,840.51** (€4,000 for children under 24).

The AUU point is the one most often got wrong by non-Italian models: Italy *looks* like it
has no child tax relief in payroll, and correctly so — the relief moved to a separate benefit
in March 2022.

---

## 5. Age and hiring incentives

| Incentive | Condition | Effect |
| --- | --- | --- |
| `Bonus Giovani` | Under 30, first permanent contract | Up to €500/month employer relief, 24 months (€6,000/yr) |
| `Bonus Donne` | Specific categories of women hired permanently | Similar |
| `Decontribuzione Sud` | Southern regions | Phasing out under EU state-aid rules |
| Disability hiring | Registered disability | Up to 70 % contribution relief |

All employer-side, all excluded from the prototype, all surfaced in the UI as
"incentives that could reduce this cost". The default profile (age 30) sits just outside the
under-30 window — deliberately, since the brief specifies no reliefs.

---

## 6. Special regimes

### `Regime impatriati` — art. 5 D.Lgs. 209/2023

The highest-impact discriminant in the Italian system.

| Condition | |
| --- | --- |
| Not tax-resident in Italy for the previous 3 years | |
| Commitment to remain resident 4 years | |
| Work mainly performed in Italy | |
| High qualification or specialisation | |

**Effect:** 50 % of employment income exempt (60 % with a child under 18), for 5 years,
capped at €600,000 of income.

At €45,000 RAL this changes net from **€30,034 to roughly €38,900** — a **+€8,900/yr**
difference, larger than every other discriminant combined.

It is excluded because eligibility depends on facts payroll cannot verify (prior residence
history, qualification assessment). It is *surfaced* because silently ignoring an €8,900
effect is not a conservative default for a company whose customers are, in significant part,
inbound hires.

### Others

| Regime | Effect |
| --- | --- |
| Researchers and lecturers | 90 % exemption, up to 6 years |
| `Frontalieri` (Switzerland border) | Special base and credit |
| Professional sportspeople | Reduced exemption rates |

---

## 7. Remuneration composition

| Item | Limit | Effect at €45k |
| --- | --- | --- |
| Meal vouchers | €8/day electronic, €4 paper | ≈ +€440/yr net (220 days × €8, exempt) |
| Fringe benefits | €1,000 (€2,000 with dependent children) | Up to +€1,000 net |
| Corporate welfare (art. 51 c. 2 TUIR) | Uncapped within categories | Variable |
| `Premio di risultato` | €3,000, substitute tax 1 % (2025–2027), if `reddito` ≤ €80,000 | Up to +€900 vs ordinary taxation |
| Supplementary pension | Deductible to €5,164.57 | Reduces taxable income |
| Company car | Taxed on ACI value: 10 % BEV / 20 % PHEV / 50 % ICE (2025+ registrations) | Variable |

**The fringe-benefit threshold is a cliff**: €1,000.00 is fully exempt, €1,000.01 makes the
entire amount taxable. Structurally identical to the Milan surtax threshold — the same
`threshold_exemption` primitive covers both.

---

## 8. Employer-side discriminants

| Discriminant | Effect on employer cost |
| --- | --- |
| Headcount ≤ 5 / 6–49 / ≥ 50 | FIS 0.50 % vs 0.80 %; TFR to `Fondo Tesoreria` at ≥ 50 (cash flow only) |
| INAIL risk class | 0.4 ‰ – 130 ‰ — **± €5,800/yr** at €45k between office and heavy industry |
| CCNL | Supplementary funds: €144/yr (Terziario) to ~4 % of gross (`Cassa Edile`, construction) |
| Region | Former `Decontribuzione Sud`, phasing out |
| Contract type | +1.40 % NASpI surcharge on fixed-term |

---

## 9. The default profile, restated

```
Region             Lombardia          →  addizionale 1.23–1.73 % per slice
Municipality       Milano             →  0.80 %, exempt ≤ €23,000
Contract           Permanent, full-time, impiegato
CCNL               Terziario Confcommercio, level III, 14 instalments
Age                30                 →  outside the under-30 incentive window
Family             Single, no dependants
Special regimes    None
Benefits           None
INPS ceiling       Applies (post-1996 first insured)
Employer           Private, 6–49 employees, office activity (INAIL 4 ‰)
Period             Full calendar year
```

Every one is an input with a default, not a hardcoded value.
