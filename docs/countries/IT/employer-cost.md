# Italia — costo azienda 2026

**Confidenza complessiva experimental.** Il costo esatto dipende da CSC/inquadramento INPS,
PAT e tariffa INAIL, CCNL, dimensione e agevolazioni dell'impresa.

## Componenti modellate

| Componente | Modello corrente |
| --- | --- |
| INPS datore | 29,78% per il profilo Terziario di riferimento |
| INAIL | scenario per classe di rischio; non sostituisce la tariffa PAT |
| TFR | lordo / 13,5 meno il fondo garanzia già compreso nei contributi |
| Fondo CCNL | importo del contratto selezionato |
| NASpI termine | maggiorazione 1,40% per il contratto a termine |

Il massimale di €122.295 segue lo stesso status dichiarato per il dipendente: se non applicabile,
anche il percorso datore continua oltre la soglia. Il fondo di garanzia TFR non va sommato due
volte: è già nella contribuzione e viene sottratto dall'accantonamento netto.

## Fixture €45.000

| Voce | Importo |
| --- | ---: |
| Lordo | €45.000,00 |
| INPS datore | €13.401,00 |
| INAIL scenario ufficio | €180,00 |
| TFR netto | €3.108,33 |
| Fondo Est | €144,00 |
| **Costo totale** | **€61.833,33** |

Questa fixture serve alla regressione. Per una distinta aziendale reale vanno inseriti o
riconciliati i tassi notificati all'impresa.
