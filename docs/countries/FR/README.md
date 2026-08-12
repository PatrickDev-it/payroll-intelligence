# Francia 2026

**Motore eseguibile · confidenza complessiva experimental** per AT/MP, versement mobilité,
quote datoriali di mutuelle/prévoyance e per il barème definitivo sui redditi 2026 non ancora
approvato.

## PAS e imposta annuale non sono la stessa cosa

Il netto payroll sottrae il prélèvement à la source applicando al `net imposable` il tasso PAS
attivo dichiarato dall'utente. Il tasso è quello trasmesso dalla DGFiP al datore e non viene
ricostruito dal quoziente familiare. Il risultato è annualizzato: non pretende di riprodurre
arrotondamenti o cambi di tasso di ogni singolo mese.

Il barème 2026, legalmente applicabile ai redditi 2025, resta una stima annuale annidata e non
riduce il netto una seconda volta. Il foyer distingue `single`, `couple` e `parent_isole`; un
parent isolé con un figlio ha due parts e usa il tetto dedicato di €4.262 per il primo figlio.

## RGDU verificata

L'art. D241-7 usa lo SMIC vigente al 1° gennaio 2026:

- €12,02 × 1.820 = **€21.876,40**;
- estinzione a 3 SMIC = **€65.629,20**;
- riferimento riproporzionato con `workingTimePercent`.

Il risultato è stato confrontato con Urssaf Mon-entreprise. Non viene usata la media ponderata
fra gli aumenti di gennaio e giugno.

## Perimetro

Regime generale o Alsace-Moselle, 12 mensilità, anno completo, un datore. Cadre, foyer, figli,
dimensione azienda, AT/MP e mobilité sono input. Le quote salariali annue esatte e deducibili di
mutuelle e prévoyance possono essere dichiarate; se assenti non viene applicato alcun default.
Assenze, quote datoriali e accordi di categoria non vengono inventati.
