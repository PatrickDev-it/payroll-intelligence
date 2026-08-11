# Modello comune

## Input

`EmployeeProfile` contiene paese, anno, lordo annuo, mensilità, tipo di rapporto, percentuale di
lavoro e discriminanti nazionali. Gli input nazionali vivono in `countryOptions` e sono
dichiarati dall'adapter: l'interfaccia non conosce Steuerklasse, massimale IVS o AEAT.

## Output

`PayrollCalculation` separa:

- contributi e imposte dipendente;
- imponibile e netto annuo/per periodo;
- contributi, assicurazioni, accantonamenti e altri costi datore;
- aliquote effettive, marginale e cuneo fiscale;
- versione motore, versione regole, confidenza, fonti e note.

Ogni `CalculationLine` porta importo firmato, base, formula, `ruleIds` e confidenza. Può inoltre
dichiarare due semantiche indipendenti:

- `taxRole`: `payroll_withholding` oppure `annual_settlement_estimate`, per non confondere
  quanto trattenuto in busta con la stima dell'imposta finale;
- `valueOrigin`: `computed_rule` oppure `declared_input`, per distinguere un valore calcolato
  dal motore da un parametro comunicato da datore, autorità o utente. L'origine non modifica
  né innalza la confidenza della regola.

L'aliquota marginale è una coppia discriminata: il valore è numerico quando la policy è
`recompute` o `hold_external_inputs`; è `null` soltanto con `unavailable`. Una percentuale
dichiarata viene acquisita come decimale esatto (massimo sei decimali), convertita subito in
parti per miliardo e applicata con un solo arrotondamento monetario.

## Architettura

Ogni paese implementa `CountryPayrollAdapter`:

1. `requiredInputs(profile)` dichiara il form;
2. `validate(profile)` rifiuta casi impossibili o non modellati;
3. `calculate(profile, rules)` esegue un calcolo puro;
4. `explain(result, lineId)` collega numero e fonte.

L'engine condiviso contiene solo primitive generiche: scaglioni progressivi, aliquota piatta o
con tetto, bande, crediti a riduzione, esenzioni a soglia, lookup e formule parametrizzate.
L'aggiunta futura di un paese deve essere additiva, non un ramo `if country` nell'engine.
