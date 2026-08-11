# Discriminanti supportati

| Paese | Discriminanti principali | Rifiuti espliciti |
| --- | --- | --- |
| IT | regione, comune modellato, CCNL/livello, mensilità, dimensione, contratto, massimale IVS, rischio INAIL | comune non caricato, status massimale ignoto sopra €122.295, lavoro non dipendente |
| DE | Land, Steuerklasse I-IV, chiesa, figli, età, Zusatzbeitrag, rischio infortuni | classi V/VI, valuta non EUR, tipo impiego non modellato |
| ES | comunità comune, contratto, mensilità, gruppo contributivo, aliquota AEAT, rischio CNAE | territori forali/speciali, aliquota AEAT mancante, evento mensile non modellato |
| FR | regime locale, cadre, foyer, figli, dimensione, part-time, AT/MP, mobilité | regime sconosciuto, mensilità diversa da 12, tipo impiego non modellato |

## Fuori perimetro comune

- rapporti iniziati o cessati nell'anno;
- più datori o altri redditi;
- bonus e benefit non inclusi nel lordo dichiarato;
- assenze con basi contributive speciali;
- agevolazioni, impatriati ed incentivi all'assunzione;
- dirigenti, apprendisti e autonomi.

Questi casi non vanno stimati aggiungendo un default. Devono diventare input e regole testate,
oppure restare un rifiuto documentato.
