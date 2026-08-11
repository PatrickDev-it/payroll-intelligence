# Metodo di verifica e rilascio

## 1. Gerarchia delle prove

1. Testo legislativo vigente.
2. Circolare o istruzione operativa dell'autorità.
3. Calcolatore ufficiale, usato come confronto indipendente.
4. Fixture, confini e proprietà automatiche.

Un blog o un aggregatore può suggerire dove cercare, ma non può autorizzare una regola.

## 2. Regole come dati

Ogni parametro contiene `id`, `basis`, date di efficacia, fonte, verifica e versione. Le regole
vecchie non sono sovrascritte: un nuovo anno o una correzione produce un set distinguibile.

## 3. Confidenza

- `verified`: fonte primaria, confronto con calcolatore ufficiale e test ai confini entro €1/anno.
- `supported`: fonte primaria e test, ma confronto ufficiale incompleto o non disponibile.
- `experimental`: parametro aziendale approssimato o semplificazione materiale.

La confidenza del risultato è la più bassa fra tutte le regole applicate. Non si fa media.

## 4. Test obbligatori

- golden case indipendenti;
- soglie a −€0,01, esatto e +€0,01;
- riconciliazione `lordo − trattenute + crediti = netto`;
- riconciliazione completa del costo datore;
- determinismo e centesimi interi;
- input ostili, opzioni inventate e anni mancanti;
- snapshot numerico leggibile per ogni modifica di regola;
- E2E su UI e API.

## 5. Gate di rilascio

Una release non è idonea all'uso interno se typecheck, unità, E2E o build non sono verdi. Per
ogni cambio normativo vanno registrati paesi, profili e intervalli salariali interessati. I
risultati aziendali vanno riconciliati con cedolini anonimizzati prima della promozione.

## 6. Data di efficacia

Il tax year è un input esplicito. Un set mancante è un errore controllato; non si riutilizza
l'anno precedente. Un monitor normativo e la firma di un consulente locale sono processi di
governance esterni al codice e restano necessari anche con tutti i test verdi.
