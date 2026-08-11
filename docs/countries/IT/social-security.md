# Italia — contributi dipendente 2026

| Parametro | Valore |
| --- | ---: |
| IVS dipendente | 9,19% |
| FIS dipendente, fino a 5 | 0,17% standard; 0,10% nel percorso ridotto dichiarato |
| FIS dipendente, oltre 5 | 0,27% |
| Prima fascia pensionabile | €56.224 |
| Aggiuntivo | 1% sulla quota oltre €56.224 |
| Massimale, quando applicabile | €122.295 |

## Due percorsi legali

`Applicabile`: IVS e aggiuntivo si fermano a €122.295. È il percorso tipico del lavoratore
privo di anzianità contributiva al 31 dicembre 1995 o che ha esercitato l'opzione prevista.

`Non applicabile`: il 9,19% e l'1% aggiuntivo continuano oltre €122.295. Il salario non permette
di indovinare il percorso; per questo lo status è un input.

Esempio a €150.000:

- con massimale: €11.238,91 + €660,71 = **€11.899,62**;
- senza massimale: €13.785,00 + €937,76 = **€14.722,76**.

Il FIS resta una riga distinta dall'IVS e partecipa ai contributi deducibili che formano
l'imponibile fiscale. Per le imprese fino a 5 dipendenti la riduzione non viene inferita:
richiede la dichiarazione del requisito di assenza di domande FIS nei 24 mesi precedenti.

I test coprono €56.224 e €122.295 a ±€0,01, verificano entrambi i percorsi del massimale e i
tre rami FIS (fino a 5 standard, fino a 5 ridotto, oltre 5).
