# Perimetro, semplificazioni e rifiuti

## Contratto comune

Calcolo annuale 2026, un dipendente, un datore, anno completo, remunerazione monetaria stabile.
Il motore non genera adempimenti e non sostituisce il payroll provider.

## Italia

- Solo comuni presenti nel registro applicativo.
- Massimale IVS richiesto sopra la soglia; non viene più applicato indistintamente.
- INAIL e alcune voci del costo datore restano scenari di rischio.
- Solo CCNL e livelli caricati; niente incentivi, premi di risultato o impatriati.

## Germania

- Steuerklasse I-IV; V e VI rifiutate.
- Assicurazione pubblica assunta; sopra la JAEG viene mostrato un avviso sulla PKV.
- Zusatzbeitrag, infortuni e U2 dipendono da cassa e datore; gli override esatti sono accettati.
- U1 è calcolata solo con conteggio AAG ≤30 e aliquota Krankenkasse dichiarata; altrimenti è assente.
- I quattro vettori BMF verificano il percorso annuale stabile delle classi I-IV, non Faktorverfahren o ELStAM aggiuntive.
- Kinderfreibeträge completi non modellati.

## Spagna

- Il netto richiede l'aliquota di ritenuta AEAT; non usa più il debito finale come sostituto.
- La stima annuale conserva scala statale e comunitaria come confronto.
- Navarra, Paesi Baschi, Ceuta e Melilla non sono approssimati.
- Basi annualizzate affidabili per salario stabile; eventi mensili esclusi.

## Francia

- RGDU usa lo SMIC al 1° gennaio e working time dichiarato.
- Il confronto annuale usa il barème 2026 sui redditi 2025; quello applicabile ai redditi 2026 non è ancora emanato.
- Mutuelle e prévoyance salariali entrano solo se dichiarate come importi annui esatti; quote datoriali escluse.
- AT/MP e mobilité esatti dipendono dallo stabilimento.
- Assenze e ingressi/uscite nell'anno non sono ancora modellati.

## Regola di sicurezza

Un profilo fuori da questi limiti deve essere rifiutato oppure chiaramente etichettato
`experimental`. Non si promuove una stima a payroll solo perché riconcilia aritmeticamente.
