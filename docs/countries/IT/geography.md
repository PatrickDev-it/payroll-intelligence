# 🇮🇹 Italy — Geography

The two sub-national surtax layers, in full: all 21 regions and autonomous provinces, and
every modelled comune. Split out of [discriminants.md](discriminants.md), which keeps the
summary and the ranking.

Every figure below is computed by the engine from the rule set, at the reference taxable base
of **€40,864.50** (€45,000 RAL less 9.19 % INPS). Prose that disagrees with this table is
wrong, not the other way round.

---
## The two surtax layers

### Region (`addizionale regionale`)

Statutory minimum 1.23 %; regions under a healthcare deficit recovery plan levy up to 3.33 %.

All 21 regions and autonomous provinces are modelled. On the reference taxable base of
€40,864.50 the surtax runs:

| Region | 2026 rates | Surtax | Net |
| --- | --- | ---: | ---: |
| Basilicata, Friuli, Sardegna, Sicilia, Trento, Bolzano, Valle d'Aosta, Veneto | 1.23 % (flat or single band) | € 502.63 | € 30,142.95 |
| Puglia | 1.33 / 1.43 / 1.63 / 1.85 % | € 595.09 | € 30,050.49 |
| Marche | 1.23 / 1.53 / 1.70 / 1.73 % | € 602.10 | € 30,043.48 |
| **Lombardia** (default) | 1.23 / 1.58 / 1.72 / 1.73 % | **€ 611.17** | **€ 30,034.41** |
| Calabria | 1.73 % flat | € 706.96 | € 29,938.62 |
| Liguria | 1.23 / 3.18 / 3.23 % | € 753.49 | € 29,892.09 |
| Emilia-Romagna | 1.33 / 1.93 / 2.78 / 3.33 % | € 808.03 | € 29,837.55 |
| Toscana | 1.42 / 1.43 / 3.32 / 3.33 % | € 826.00 | € 29,819.58 |
| Abruzzo | 1.67 / 2.87 / 3.33 % | € 836.81 | € 29,808.77 |
| Umbria | 1.73 / 3.12 / 3.33 % | € 885.77 | € 29,759.81 |
| Lazio | 1.73 / 3.33 % | € 912.79 | € 29,732.79 |
| Molise | 1.73 / 1.93 / 3.33 % | € 938.79 | € 29,706.79 |
| Piemonte | 1.62 / 2.68 / 3.31 / 3.33 % | € 1,017.21 | € 29,628.37 |
| Campania | 1.73 / 2.96 / 3.20 / 3.33 % | € 1,055.96 | € 29,589.62 |

**Spread € 553.33/year** between the cheapest region and the most expensive, on an identical
salary — Basilicata against Campania.

> **Correction, 2026-08-08.** An earlier version of this file put the spread at ≈ €860 and
> Campania at ≈ €1,361, by treating Campania's top rate as a single 3.33 % on the whole base.
> Campania applies its rates **per slice**, so the real figure is €1,055.96. The engine
> computed the table above from the rule set; the prose has been corrected to match it. Only
> Lombardia is 🟢 — the other 20 are 🟡, pending a read of the Dipartimento delle Finanze
> register.

Two conventions exist and must not be confused:
- **per slice** (Lombardia, L.R. 10/2003 art. 72) — each rate applies to its portion
- **whole base** — once a threshold is crossed, one rate applies to the entire base

The rule object stores which mode applies. Assuming one nationally is a systematic error.

### Municipality (`addizionale comunale`)

Range 0 % – 0.9 %, plus a per-municipality exemption threshold.

Nine are modelled; the register of ~6,900 comuni that levy it has not been ingested, so any
other comune is refused rather than approximated.

| Municipality | Rate | Exemption | On €40,864.50 | Tier |
| --- | --- | --- | ---: | :---: |
| Milano (default) | 0.80 % | € 23,000 | € 326.92 | 🟢 |
| Roma | 0.90 % | € 14,000 | € 367.78 | 🟡 |
| Napoli | 1.00 % | € 12,000 | € 408.65 | 🟡 |
| Firenze | 0.20 % | € 25,000 | € 81.73 | 🟡 |
| Torino, Bologna | 0.80 % | to verify | € 326.92 | 🟠 |
| Trento, Bolzano | — | — | € 0 | 🟡 |
| Comune without the surtax | 0 % | — | € 0 | 🟢 |

**The threshold is a cliff.** Taxable income of €23,000 in Milan pays €0; €23,001 pays
€184.01. See [income-tax.md §4](income-tax.md#4-municipal-surtax--addizionale-comunale).

Residence is fixed at **1 January** of the year following the income year — so a December
move changes the whole year's surtax.

---
