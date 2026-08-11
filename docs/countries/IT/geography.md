# 🇮🇹 Italy — Geography

The two sub-national surtax layers, in full: all 21 regions and autonomous provinces, and
every modelled comune. Split out of [discriminants.md](discriminants.md), which keeps the
summary and the ranking.

Every figure below is computed by the engine from the rule set, at the reference taxable base
of **€40,743.00** (€45,000 RAL less 9.19% IVS and 0.27% FIS dipendente). Prose that disagrees
with this table is wrong, not the other way round.

---
## The two surtax layers

### Region (`addizionale regionale`)

Statutory minimum 1.23 %; regions under a healthcare deficit recovery plan levy up to 3.33 %.

All 21 regions and autonomous provinces are modelled. On the reference taxable base of
€40,743.00 the surtax runs:

| Region | 2026 rates | Surtax | Net |
| --- | --- | ---: | ---: |
| Basilicata, Friuli, Sardegna, Sicilia, Trento, Bolzano, Valle d'Aosta, Veneto | 1.23 % (flat or single band) | € 501.14 | € 30,074.41 |
| Puglia | 1.33 / 1.43 / 1.63 / 1.85 % | € 593.11 | € 29,982.44 |
| Marche | 1.23 / 1.53 / 1.70 / 1.73 % | € 600.03 | € 29,975.52 |
| **Lombardia** (default) | 1.23 / 1.58 / 1.72 / 1.73 % | **€ 609.08** | **€ 29,966.47** |
| Calabria | 1.73 % flat | € 704.85 | € 29,870.70 |
| Liguria | 1.23 / 3.18 / 3.23 % | € 749.63 | € 29,825.92 |
| Emilia-Romagna | 1.33 / 1.93 / 2.78 / 3.33 % | € 804.66 | € 29,770.89 |
| Toscana | 1.42 / 1.43 / 3.32 / 3.33 % | € 821.97 | € 29,753.58 |
| Abruzzo | 1.67 / 2.87 / 3.33 % | € 833.32 | € 29,742.23 |
| Umbria | 1.73 / 3.12 / 3.33 % | € 881.98 | € 29,693.57 |
| Lazio | 1.73 / 3.33 % | € 908.74 | € 29,666.81 |
| Molise | 1.73 / 1.93 / 3.33 % | € 934.74 | € 29,640.81 |
| Piemonte | 1.62 / 2.68 / 3.31 / 3.33 % | € 1,013.19 | € 29,562.36 |
| Campania | 1.73 / 2.96 / 3.20 / 3.33 % | € 1,052.08 | € 29,523.47 |

**Spread € 550.94/year** between the cheapest region and the most expensive, on an identical
salary — Basilicata against Campania.

> **Correction, 2026-08-08; recomputed 2026-08-11.** An earlier version put the spread at
> ≈ €860 and Campania at ≈ €1,361, by treating the top rate as 3.33% on the whole base.
> Campania applies its rates **per slice**. The table above is now also recomputed on the
> €40,743.00 base produced after RFC 008. Only Lombardia is 🟢 — the other 20 are 🟡, pending
> a read of the Dipartimento delle Finanze register.

Two conventions exist and must not be confused:
- **per slice** (Lombardia, L.R. 10/2003 art. 72) — each rate applies to its portion
- **whole base** — once a threshold is crossed, one rate applies to the entire base

The rule object stores which mode applies. Assuming one nationally is a systematic error.

### Municipality (`addizionale comunale`)

Range 0 % – 0.9 %, plus a per-municipality exemption threshold.

Nine are modelled; the register of ~6,900 comuni that levy it has not been ingested, so any
other comune is refused rather than approximated.

| Municipality | Rate | Exemption | On €40,743.00 | Tier |
| --- | --- | --- | ---: | :---: |
| Milano (default) | 0.80 % | € 23,000 | € 325.94 | 🟢 |
| Roma | 0.90 % | € 14,000 | € 366.69 | 🟡 |
| Napoli | 1.00 % | € 12,000 | € 407.43 | 🟡 |
| Firenze | 0.20 % | € 25,000 | € 81.49 | 🟡 |
| Torino, Bologna | 0.80 % | to verify | € 325.94 | 🟠 |
| Trento, Bolzano | — | — | € 0 | 🟡 |
| Comune without the surtax | 0 % | — | € 0 | 🟢 |

**The threshold is a cliff.** Taxable income of €23,000 in Milan pays €0; €23,001 pays
€184.01. See [income-tax.md §4](income-tax.md#4-municipal-surtax--addizionale-comunale).

Residence is fixed at **1 January** of the year following the income year — so a December
move changes the whole year's surtax.

---
