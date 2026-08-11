# Costo azienda

Il costo datore non è `lordo × percentuale media`. Il modello conserva categorie separate:

1. contributi previdenziali;
2. assicurazioni obbligatorie basate sul rischio;
3. accantonamenti differiti, dove previsti;
4. fondi e prelievi aziendali.

| Paese | Elementi modellati | Parametri non deducibili dal salario |
| --- | --- | --- |
| IT | INPS, INAIL, TFR, fondi CCNL | tariffa INAIL/PAT e inquadramento contributivo reale |
| DE | RV, AV, KV, PV, infortuni, insolvenza, U2 | cassa, tariffa BG e aliquota U2 |
| ES | contributi ordinari, MEI, solidarietà, AT/EP | codice CNAE e tariffa AT/EP |
| FR | contributi, AT/MP, Fnal, formazione, mobilité, RGDU | tasso Carsat, commune e coperture collettive |

I menu di rischio sono scenari indicativi e mantengono il risultato `experimental`. Per una
riconciliazione aziendale si deve usare il dato notificato all'impresa; finché non esiste un
input esatto, il totale non è una distinta di versamento.
