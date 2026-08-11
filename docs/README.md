# Documentazione operativa

Questa documentazione descrive soltanto il prodotto eseguibile: IT, DE, ES e FR nel 2026.

| Documento | Contenuto |
| --- | --- |
| [00-methodology.md](00-methodology.md) | prove richieste, confidenza, criteri di rilascio |
| [01-common-model.md](01-common-model.md) | input, output e architettura adapter |
| [02-discriminants.md](02-discriminants.md) | fatti che cambiano il risultato per paese |
| [03-employer-cost.md](03-employer-cost.md) | composizione e limiti del costo azienda |
| [04-glossary.md](04-glossary.md) | terminologia IT/DE/ES/FR |
| [05-sources.md](05-sources.md) | sole fonti primarie e servizi ufficiali |
| [06-simplifications.md](06-simplifications.md) | perimetro ammesso e rifiuti |
| [countries/](countries/README.md) | schede nazionali |

Le regole eseguibili risiedono in `src/countries/<ISO>/rules/2026.json`. Le pagine descrittive
non prevalgono mai sui file versionati e sui test; il filesystem e le pubblicazioni ufficiali
sono l'autorità.
