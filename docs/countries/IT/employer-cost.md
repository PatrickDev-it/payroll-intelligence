# Italia — costo azienda 2026

**Confidenza complessiva experimental.** Il costo esatto dipende da CSC/inquadramento INPS,
PAT e tariffa INAIL, CCNL, dimensione e agevolazioni dell'impresa.

## Componenti modellate

| Componente | Modello corrente |
| --- | --- |
| IVS datore | 23,81%, con massimale solo quando il profilo è soggetto alla L. 335/1995 |
| CUAF | 0,68% per il profilo Terziario di riferimento |
| Maternità | 0,24% per il profilo Terziario di riferimento |
| Malattia | 2,44% per il profilo Terziario di riferimento |
| NASpI ordinaria | 1,61% |
| Fondo di garanzia TFR | 0,20%, esposto separatamente |
| FIS datore | 0,33% fino a 5 dipendenti; 0,20% nel percorso ridotto; 0,53% oltre 5 |
| INAIL | scenario per classe di rischio; non sostituisce la tariffa PAT |
| TFR | lordo / 13,5 meno la quota 0,50% ex art. 3 L. 297/1982 |
| Fondo CCNL | importo del contratto selezionato |
| NASpI termine | maggiorazione 1,40%, più 0,50 punti per rinnovo, quando applicabile |

Il massimale di €122.295 segue lo stesso status dichiarato per il dipendente: se non applicabile,
anche il percorso datore continua oltre la soglia. La quota 0,50% sottratta nel calcolo del TFR
e il contributo datoriale 0,20% al Fondo di garanzia sono due voci giuridicamente distinte e
restano entrambe visibili.

## Fixture €45.000

| Voce | Importo |
| --- | ---: |
| Lordo | €45.000,00 |
| IVS datore | €10.714,50 |
| CUAF | €306,00 |
| Maternità | €108,00 |
| Malattia | €1.098,00 |
| NASpI ordinaria | €724,50 |
| Fondo di garanzia TFR | €90,00 |
| FIS datore (>5 dipendenti) | €238,50 |
| INAIL scenario ufficio | €180,00 |
| TFR netto | €3.108,33 |
| Fondo Est | €144,00 |
| **Costo totale** | **€61.711,83** |

Questa fixture serve alla regressione. Per una distinta aziendale reale vanno inseriti o
riconciliati i tassi notificati all'impresa.
