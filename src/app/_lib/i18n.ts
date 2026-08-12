import type { EUCountry, InputDescriptor } from "@engine/model/employee-profile.ts";
import type { Locale } from "./locale.ts";

export { LOCALES, LOCALE_TAG, localeFrom } from "./locale.ts";
export type { Locale } from "./locale.ts";

const IT = {
  metadataDescription: "Proiezione dal lordo annuo al netto con ogni trattenuta collegata alla norma che la determina.",
  language: "Lingua dell'interfaccia",
  pageScroll: "Scorrimento della pagina",
  displayPreferences: "Preferenze di visualizzazione",
  switchToDarkTheme: "Passa al tema scuro",
  switchToLightTheme: "Passa al tema chiaro",
  primaryParameters: "Parametri principali",
  otherParameters: "Altri parametri del calcolo",
  country: "Paese",
  unavailable: "non disponibile",
  countryHelp: "Anno fiscale {year}. Il prodotto espone soltanto i {count} paesi con motore di calcolo e regole versionate.",
  countryExample: "Italia, Germania, Spagna e Francia sono l'intero perimetro operativo attuale.",
  countrySource: "Registro degli adapter e regole fiscali 2026 disponibili nel motore.",
  infoAbout: "Informazioni su {label}",
  parameterGuide: "Guida al parametro",
  whatChanges: "Cosa cambia",
  example: "Esempio",
  source: "Fonte",
  defaultSource: "Regole 2026 e documentazione del paese selezionato.",
  methodologyAndSources: "Metodologia e fonti →",
  close: "Chiudi",
  confidenceVerified: "Verificato su fonti ufficiali",
  confidenceSupported: "Da documentazione autorevole",
  confidenceExperimental: "Sperimentale — solo indicativo",
  confidenceVerifiedShort: "Verificato",
  confidenceSupportedShort: "Documentato",
  confidenceExperimentalShort: "Sperimentale",
  emptyTitle: "Nessun calcolo da mostrare",
  netPerPeriod: "Media netta per periodo · {periods} periodi",
  netMonthly: "Netto mensile",
  methodAndSources: "Metodo e fonti",
  netAnnual: "Netto annuo",
  twelveMonthAverage: "media su 12 mesi",
  grossRal: "Lordo (RAL)",
  contractFigure: "quanto scrive il contratto",
  withholdings: "Trattenute",
  employeeTaxesContributions: "imposte e contributi dipendente",
  employerCost: "Costo azienda",
  ralMultiplier: "{value} la RAL",
  taxWedge: "Cuneo fiscale",
  wedgeHint: "del costo azienda non arriva al netto",
  costSplitTitle: "Come si divide il costo aziendale",
  oneHundredOf: "100% di {value}",
  costSplitAria: "Ripartizione del costo aziendale di {value}: {segments}",
  splitNet: "Netto al dipendente",
  splitContributions: "Contributi dipendente",
  splitTaxes: "Imposte",
  splitEmployer: "Oneri a carico azienda",
  grossToNet: "Dal lordo al netto",
  breakdownHint: "Trattenute a carico del dipendente · apri una voce per il calcolo e la fonte",
  annualGross: "Retribuzione Annua Lorda",
  socialContributions: "Contributi previdenziali",
  socialNote: "Si sottraggono PRIMA dell'imposta: riducono anche la base imponibile.",
  taxableIncome: "Imponibile fiscale",
  taxableNote: "Lordo meno contributi. È la base su cui si applica l'imposta.",
  taxes: "Imposte",
  cashCredits: "Somme aggiuntive in busta paga",
  cashCreditsNote: "Trasferimenti in denaro, non riduzioni d'imposta: si sommano dopo il calcolo.",
  calculationBasis: "Base di calcolo",
  ofThisBasis: "{value} di questa base",
  calculation: "Calcolo",
  appliedRule: "Norma applicata",
  employerTitle: "Costo per l'azienda",
  employerIntro: "Quello che l'azienda spende per questo contratto. Non è la RAL, e non è quello che il dipendente vede.",
  employerCharges: "Oneri a carico azienda",
  annualTotalCost: "Costo totale annuo",
  mandatoryContributions: "Contributi obbligatori",
  mandatoryInsurance: "Assicurazione obbligatoria",
  deferredPay: "Retribuzione differita",
  otherCosts: "Altri oneri",
  employerShareSentence: "Per ogni {cost} spesi dall'azienda, {share} arriva al dipendente come netto in busta quest'anno. Il resto è imposta o contributo, su entrambi i lati del cedolino.",
  effectiveRates: "Aliquote effettive",
  ratesBasis: "Tutte calcolate sul lordo, non sull'imponibile",
  effectiveRate: "Aliquota effettiva",
  effectiveRateHint: "Imposte + contributi ÷ RAL",
  taxOnly: "Solo imposte",
  taxOnlyHint: "Solo imposta ÷ RAL",
  contributionsOnly: "Solo contributi",
  contributionsOnlyHint: "Solo contributi dipendente ÷ RAL",
  marginalRate: "Aliquota marginale sul lordo",
  marginalRateHelp: "Quanto si trattiene sui prossimi € 1.000 di RAL. Include anche le detrazioni che si erodono, non solo l'aliquota di tabella.",
  marginalRateHeldHelp: "Quanto si trattiene sui prossimi € 1.000 di lordo mantenendo fisse le aliquote comunicate dall'autorità o dall'azienda.",
  marginalRateUnavailableHelp: "Non disponibile: gli input esterni non consentono una variazione marginale attendibile.",
  methodologyTitle: "Metodologia e perimetro del modello",
  taxYearVerified: "Anno d'imposta {year}{date}",
  verifiedOn: " · fonti verificate il {date}",
  howNumbers: "Come si arriva a questi numeri",
  primaryLaw: "Legge primaria",
  primaryLawHelp: "L'articolo che fissa il parametro, non un riassunto.",
  administrativeSource: "Fonte amministrativa",
  administrativeSourceHelp: "La circolare o la tabella dell'ente che lo applica.",
  taxBase: "Base imponibile",
  taxBaseHelp: "A cosa si applica l'aliquota: è l'errore più comune.",
  thresholds: "Soglie e massimali",
  thresholdsHelp: "Tetti, minimi, franchigie e discontinuità.",
  boundaryTests: "Test ai confini",
  boundaryTestsHelp: "Si prova appena sotto, sulla soglia e appena sopra.",
  exclusions: "Cosa questo calcolo non fa",
  simplifications: "Il registro completo delle semplificazioni e della loro stima d'errore è in",
  precision: "Precisione e arrotondamenti",
  precisionBody: "Gli importi sono centesimi interi, mai numeri in virgola mobile. L'arrotondamento avviene solo dove e quando lo impone la norma.",
  deterministic: "Il motore è deterministico e totale: stessi input, stesso risultato; se manca una regola rifiuta il calcolo.",
  confidenceLevels: "Livelli di confidenza",
  verifiedTierHelp: "Fonte primaria e riscontro su un calcolatore ufficiale indipendente.",
  supportedTierHelp: "Fonte primaria o documentazione dell'ente, senza riscontro incrociato.",
  experimentalTierHelp: "Parametro dipendente dall'azienda: nessun valore singolo è universalmente corretto.",
  weakestConfidence: "Il risultato eredita il livello più basso fra le regole che lo compongono, mai una media.",
  countryResearch: "Ricerca completa su questo paese",
  provenanceTitle: "Le {count} regole applicate a questo calcolo",
  provenanceSummary: "Calcolo basato su {rules} regole da {sources} fonti ufficiali",
  validationInfo: "Da tenere presente",
  validationError: "Profilo non calcolabile",
  noResultAnnouncement: "Nessun risultato: controlla i dati inseriti.",
  resultAnnouncement: "Media netta per periodo {period}, netto annuo {annual}.",
  nearThreshold: "Sei vicino a una soglia: {label}",
  thresholdBody: "L'imponibile fino a {threshold} è esente; superata la soglia, l'aliquota colpisce l'intero imponibile. Il tuo imponibile è {taxable}: un piccolo aumento può ridurre il netto. È la norma, non un errore di calcolo.",
  footer: "Strumento interno di proiezione payroll. Il motore rifiuta i profili fuori perimetro; restano esclusi regimi agevolati, benefit e rapporti infra-annuali non dichiarati.",
  profile: "Profilo",
  simplificationsDocumented: "Le semplificazioni sono documentate in",
  grossMissing: "Inserisci la retribuzione annua lorda per vedere il calcolo.",
  grossPositive: "La retribuzione annua lorda deve essere un importo positivo.",
  grossMaximum: "Oltre {value} il modello non è più significativo: le soglie dei regimi speciali cambiano il quadro.",
  officialFieldSource: "Documentazione ufficiale 2026 e fonte normativa indicata dal paese selezionato.",
} as const;

type MessageKey = keyof typeof IT;

const EN: Record<MessageKey, string> = {
  ...IT,
  metadataDescription: "Annual gross-to-net salary projection with every withholding linked to the rule that determines it.",
  displayPreferences: "Display preferences",
  switchToDarkTheme: "Switch to dark theme",
  switchToLightTheme: "Switch to light theme",
  language: "Interface language", primaryParameters: "Main parameters", otherParameters: "Other calculation parameters", country: "Country", unavailable: "unavailable", countryHelp: "Tax year {year}. The product exposes only the {count} countries with a calculation engine and versioned rules.", countryExample: "Italy, Germany, Spain and France are the current operating scope.", countrySource: "Adapter registry and 2026 tax rules available in the engine.", infoAbout: "Information about {label}", parameterGuide: "Parameter guide", whatChanges: "What changes", example: "Example", source: "Source", defaultSource: "2026 rules and documentation for the selected country.", methodologyAndSources: "Methodology and sources →", close: "Close",
  pageScroll: "Page scroll",
  confidenceVerified: "Verified against official sources", confidenceSupported: "Backed by authoritative documentation", confidenceExperimental: "Experimental — indicative only", confidenceVerifiedShort: "Verified", confidenceSupportedShort: "Documented", confidenceExperimentalShort: "Experimental", emptyTitle: "No calculation to show",
  netPerPeriod: "Projected average per pay period · {periods} periods", netMonthly: "Monthly net", methodAndSources: "Method and sources", netAnnual: "Annual net", twelveMonthAverage: "12-month average", grossRal: "Gross salary", contractFigure: "the contractual figure", withholdings: "Withholdings", employeeTaxesContributions: "employee taxes and contributions", employerCost: "Employer cost", ralMultiplier: "{value} gross salary", taxWedge: "Tax wedge", wedgeHint: "of employer cost does not reach net pay", costSplitTitle: "How employer cost is allocated", oneHundredOf: "100% of {value}", costSplitAria: "Allocation of employer cost {value}: {segments}", splitNet: "Employee net pay", splitContributions: "Employee contributions", splitTaxes: "Taxes", splitEmployer: "Employer-side charges",
  grossToNet: "From gross to net", breakdownHint: "Employee withholdings · open a line for its calculation and source", annualGross: "Annual gross salary", socialContributions: "Social security contributions", socialNote: "Deducted BEFORE tax and therefore reduce the taxable base.", taxableIncome: "Taxable income", taxableNote: "Gross less contributions: the base on which tax is charged.", taxes: "Taxes", cashCredits: "Additional cash payments", cashCreditsNote: "Cash transfers, not tax reductions: they are added after the calculation.", calculationBasis: "Calculation basis", ofThisBasis: "{value} of this basis", calculation: "Calculation", appliedRule: "Applied rule",
  employerTitle: "Cost to the employer", employerIntro: "What the employer spends on this contract. It is neither gross salary nor what the employee receives.", employerCharges: "Employer-side charges", annualTotalCost: "Total annual cost", mandatoryContributions: "Mandatory contributions", mandatoryInsurance: "Mandatory insurance", deferredPay: "Deferred compensation", otherCosts: "Other costs", employerShareSentence: "For every {cost} spent by the employer, {share} reaches the employee as net pay this year. The remainder is tax or contributions on either side of payroll.",
  effectiveRates: "Effective rates", ratesBasis: "All calculated on gross salary, not taxable income", effectiveRate: "Effective rate", effectiveRateHint: "Taxes + contributions ÷ gross", taxOnly: "Taxes only", taxOnlyHint: "Tax only ÷ gross", contributionsOnly: "Contributions only", contributionsOnlyHint: "Employee contributions ÷ gross", marginalRate: "Marginal rate on gross salary", marginalRateHelp: "What is withheld from the next €1,000 of gross salary. It includes withdrawn allowances, not just the statutory bracket rate.", marginalRateHeldHelp: "What is withheld from the next €1,000 of gross salary while rates supplied by the authority or employer stay fixed.", marginalRateUnavailableHelp: "Unavailable: external inputs do not support a reliable marginal variation.",
  methodologyTitle: "Methodology and model scope", taxYearVerified: "Tax year {year}{date}", verifiedOn: " · sources verified on {date}", howNumbers: "How these figures are produced", primaryLaw: "Primary law", primaryLawHelp: "The article that sets the parameter, not a summary.", administrativeSource: "Administrative source", administrativeSourceHelp: "The circular or table used by the authority.", taxBase: "Tax base", taxBaseHelp: "What the rate applies to: the most common source of error.", thresholds: "Thresholds and ceilings", thresholdsHelp: "Caps, minima, exemptions and discontinuities.", boundaryTests: "Boundary tests", boundaryTestsHelp: "Tested immediately below, at and immediately above each threshold.", exclusions: "What this calculation excludes", simplifications: "The complete register of simplifications and estimated error is in", precision: "Precision and rounding", precisionBody: "Amounts use integer cents, never floating point. Rounding occurs only where and when the law requires it.", deterministic: "The engine is deterministic and total: identical inputs produce identical results; a missing rule causes refusal, not a guess.", confidenceLevels: "Confidence levels", verifiedTierHelp: "Primary source plus an independent official calculator cross-check.", supportedTierHelp: "Primary or authority source without an independent cross-check.", experimentalTierHelp: "Company-specific parameter: no single value is universally correct.", weakestConfidence: "The result inherits the weakest rule confidence, never an average.", countryResearch: "Complete research for this country",
  provenanceTitle: "The {count} rules applied to this calculation", provenanceSummary: "Calculation based on {rules} rules from {sources} official sources", validationInfo: "Keep in mind", validationError: "Profile cannot be calculated", noResultAnnouncement: "No result: check the entered data.", resultAnnouncement: "Projected average per pay period {period}, annual net {annual}.", nearThreshold: "You are close to a threshold: {label}", thresholdBody: "Taxable income up to {threshold} is exempt; above it the rate applies to the whole base. Your taxable income is {taxable}: a small increase can reduce net pay. This is the law, not a calculation error.", footer: "Internal payroll projection tool. Out-of-scope profiles are refused; relief schemes, benefits and undeclared part-year employment remain excluded.", profile: "Profile", simplificationsDocumented: "Simplifications are documented in", grossMissing: "Enter annual gross salary to see the calculation.", grossPositive: "Annual gross salary must be a positive amount.", grossMaximum: "Above {value} the model is no longer meaningful because special-regime thresholds change the outcome.", officialFieldSource: "Official 2026 documentation and the statutory source identified for the selected country.",
};

const DE: Record<MessageKey, string> = {
  ...EN,
  metadataDescription: "Projektion vom Jahresbrutto zum Netto, bei der jeder Abzug mit seiner Rechtsgrundlage verknüpft ist.",
  displayPreferences: "Anzeigeeinstellungen",
  switchToDarkTheme: "Zum dunklen Design wechseln",
  switchToLightTheme: "Zum hellen Design wechseln",
  language: "Sprache der Benutzeroberfläche", primaryParameters: "Hauptparameter", otherParameters: "Weitere Berechnungsparameter", country: "Land", unavailable: "nicht verfügbar", countryHelp: "Steuerjahr {year}. Das Produkt zeigt nur die {count} Länder mit Berechnungslogik und versionierten Regeln.", countryExample: "Italien, Deutschland, Spanien und Frankreich bilden derzeit den gesamten Funktionsumfang.", countrySource: "Adapterregister und im System verfügbare Steuerregeln 2026.", infoAbout: "Informationen zu {label}", parameterGuide: "Parameterhilfe", whatChanges: "Auswirkung", example: "Beispiel", source: "Quelle", defaultSource: "Regeln 2026 und Dokumentation des gewählten Landes.", methodologyAndSources: "Methodik und Quellen →", close: "Schließen",
  pageScroll: "Seitenscrollleiste",
  confidenceVerified: "Mit offiziellen Quellen verifiziert", confidenceSupported: "Durch maßgebliche Dokumentation belegt", confidenceExperimental: "Experimentell — nur Richtwert", confidenceVerifiedShort: "Verifiziert", confidenceSupportedShort: "Dokumentiert", confidenceExperimentalShort: "Experimentell", emptyTitle: "Keine Berechnung verfügbar",
  netPerPeriod: "Prognostizierter Durchschnitt je Zeitraum · {periods} Zeiträume", netMonthly: "Monatliches Netto", methodAndSources: "Methode und Quellen", netAnnual: "Jahresnetto", twelveMonthAverage: "Durchschnitt über 12 Monate", grossRal: "Bruttojahresgehalt", contractFigure: "vertraglicher Betrag", withholdings: "Abzüge", employeeTaxesContributions: "Steuern und Arbeitnehmerbeiträge", employerCost: "Arbeitgeberkosten", ralMultiplier: "{value} des Bruttos", taxWedge: "Abgabenkeil", wedgeHint: "der Arbeitgeberkosten erreicht nicht das Netto", costSplitTitle: "Aufteilung der Arbeitgeberkosten", oneHundredOf: "100 % von {value}", costSplitAria: "Aufteilung der Arbeitgeberkosten von {value}: {segments}", splitNet: "Netto des Arbeitnehmers", splitContributions: "Arbeitnehmerbeiträge", splitTaxes: "Steuern", splitEmployer: "Arbeitgeberabgaben",
  grossToNet: "Vom Brutto zum Netto", breakdownHint: "Abzüge des Arbeitnehmers · Position für Berechnung und Quelle öffnen", annualGross: "Bruttojahresgehalt", socialContributions: "Sozialversicherungsbeiträge", socialNote: "Werden VOR der Steuer abgezogen und mindern die Bemessungsgrundlage.", taxableIncome: "Steuerpflichtiges Einkommen", taxableNote: "Brutto abzüglich Beiträge: die steuerliche Bemessungsgrundlage.", taxes: "Steuern", cashCredits: "Zusätzliche Auszahlungen", cashCreditsNote: "Geldleistungen, keine Steuerermäßigungen: Sie werden nach der Berechnung addiert.", calculationBasis: "Berechnungsgrundlage", ofThisBasis: "{value} dieser Grundlage", calculation: "Berechnung", appliedRule: "Angewandte Vorschrift",
  employerTitle: "Kosten für den Arbeitgeber", employerIntro: "Was der Arbeitgeber für diesen Vertrag ausgibt. Weder das Brutto noch der Auszahlungsbetrag.", employerCharges: "Arbeitgeberabgaben", annualTotalCost: "Jährliche Gesamtkosten", mandatoryContributions: "Pflichtbeiträge", mandatoryInsurance: "Pflichtversicherung", deferredPay: "Aufgeschobene Vergütung", otherCosts: "Weitere Kosten", employerShareSentence: "Von jeweils {cost} Arbeitgeberaufwand erreichen {share} den Arbeitnehmer als diesjähriges Netto. Der Rest sind Steuern oder Beiträge auf beiden Seiten der Abrechnung.",
  effectiveRates: "Effektive Sätze", ratesBasis: "Alle bezogen auf das Brutto, nicht auf die Steuerbemessungsgrundlage", effectiveRate: "Effektiver Gesamtsatz", effectiveRateHint: "Steuern + Beiträge ÷ Brutto", taxOnly: "Nur Steuern", taxOnlyHint: "Steuern ÷ Brutto", contributionsOnly: "Nur Beiträge", contributionsOnlyHint: "Arbeitnehmerbeiträge ÷ Brutto", marginalRate: "Grenzbelastung des Bruttos", marginalRateHelp: "Abzug von den nächsten 1.000 € Brutto. Enthält auch auslaufende Freibeträge und nicht nur den Tarifsatz.", marginalRateHeldHelp: "Abzug von den nächsten 1.000 € Brutto bei unveränderten, von Behörde oder Arbeitgeber vorgegebenen Sätzen.", marginalRateUnavailableHelp: "Nicht verfügbar: Externe Eingaben erlauben keine verlässliche Grenzbetrachtung.",
  methodologyTitle: "Methodik und Modellumfang", taxYearVerified: "Steuerjahr {year}{date}", verifiedOn: " · Quellen geprüft am {date}", howNumbers: "So entstehen diese Zahlen", primaryLaw: "Primärrecht", primaryLawHelp: "Die Vorschrift, die den Parameter festlegt, nicht eine Zusammenfassung.", administrativeSource: "Verwaltungsquelle", administrativeSourceHelp: "Rundschreiben oder Tabelle der zuständigen Behörde.", taxBase: "Bemessungsgrundlage", taxBaseHelp: "Worauf der Satz angewendet wird: die häufigste Fehlerquelle.", thresholds: "Schwellen und Beitragsbemessungsgrenzen", thresholdsHelp: "Höchstwerte, Mindestwerte, Freibeträge und Sprungstellen.", boundaryTests: "Grenzwerttests", boundaryTestsHelp: "Unmittelbar unter, auf und über jeder Schwelle geprüft.", exclusions: "Was diese Berechnung nicht abdeckt", simplifications: "Das vollständige Register der Vereinfachungen und Fehlerschätzungen steht in", precision: "Genauigkeit und Rundung", precisionBody: "Beträge werden als ganze Cent geführt, nie als Gleitkommazahlen. Gerundet wird nur dort und dann, wo das Gesetz es verlangt.", deterministic: "Die Berechnung ist deterministisch und vollständig: gleiche Eingaben ergeben gleiche Ergebnisse; fehlende Regeln führen zur Ablehnung.", confidenceLevels: "Vertrauensstufen", verifiedTierHelp: "Primärquelle plus Abgleich mit einem unabhängigen offiziellen Rechner.", supportedTierHelp: "Primär- oder Behördenquelle ohne unabhängigen Abgleich.", experimentalTierHelp: "Unternehmensspezifischer Parameter: Kein Einzelwert ist allgemein richtig.", weakestConfidence: "Das Ergebnis übernimmt stets die schwächste Vertrauensstufe, niemals einen Durchschnitt.", countryResearch: "Vollständige Recherche zu diesem Land",
  provenanceTitle: "Die {count} auf diese Berechnung angewandten Regeln", provenanceSummary: "Berechnung auf Basis von {rules} Regeln aus {sources} offiziellen Quellen", validationInfo: "Zu beachten", validationError: "Profil nicht berechenbar", noResultAnnouncement: "Kein Ergebnis: Eingaben prüfen.", resultAnnouncement: "Prognostizierter Durchschnitt je Zeitraum {period}, Jahresnetto {annual}.", nearThreshold: "Nahe an einer Schwelle: {label}", thresholdBody: "Bis {threshold} ist die Bemessungsgrundlage befreit; oberhalb gilt der Satz für die gesamte Grundlage. Ihre Bemessungsgrundlage beträgt {taxable}: Eine kleine Erhöhung kann das Netto senken. Das ist die Rechtslage, kein Rechenfehler.", footer: "Internes Werkzeug zur Entgeltprojektion. Profile außerhalb des Umfangs werden abgelehnt; Begünstigungen, Sachleistungen und nicht angegebene Teiljahresverhältnisse bleiben ausgeschlossen.", profile: "Profil", simplificationsDocumented: "Vereinfachungen sind dokumentiert in", grossMissing: "Bruttojahresgehalt eingeben, um die Berechnung zu sehen.", grossPositive: "Das Bruttojahresgehalt muss positiv sein.", grossMaximum: "Oberhalb von {value} ist das Modell wegen besonderer Schwellen nicht mehr aussagekräftig.", officialFieldSource: "Offizielle Dokumentation 2026 und die für das gewählte Land genannte Rechtsquelle.",
};

const FR: Record<MessageKey, string> = {
  ...EN,
  metadataDescription: "Projection du salaire brut annuel au net, chaque retenue étant reliée à la règle qui la détermine.",
  displayPreferences: "Préférences d’affichage",
  switchToDarkTheme: "Passer au thème sombre",
  switchToLightTheme: "Passer au thème clair",
  language: "Langue de l’interface", primaryParameters: "Paramètres principaux", otherParameters: "Autres paramètres du calcul", country: "Pays", unavailable: "indisponible", countryHelp: "Année fiscale {year}. Le produit n’affiche que les {count} pays dotés d’un moteur et de règles versionnées.", countryExample: "L’Italie, l’Allemagne, l’Espagne et la France constituent le périmètre actuel.", countrySource: "Registre des adaptateurs et règles fiscales 2026 disponibles dans le moteur.", infoAbout: "Informations sur {label}", parameterGuide: "Guide du paramètre", whatChanges: "Ce qui change", example: "Exemple", source: "Source", defaultSource: "Règles 2026 et documentation du pays sélectionné.", methodologyAndSources: "Méthodologie et sources →", close: "Fermer",
  pageScroll: "Défilement de la page",
  confidenceVerified: "Vérifié sur des sources officielles", confidenceSupported: "Appuyé par une documentation de référence", confidenceExperimental: "Expérimental — indicatif uniquement", confidenceVerifiedShort: "Vérifié", confidenceSupportedShort: "Documenté", confidenceExperimentalShort: "Expérimental", emptyTitle: "Aucun calcul à afficher",
  netPerPeriod: "Moyenne projetée par période · {periods} périodes", netMonthly: "Net mensuel", methodAndSources: "Méthode et sources", netAnnual: "Net annuel", twelveMonthAverage: "moyenne sur 12 mois", grossRal: "Salaire brut", contractFigure: "montant contractuel", withholdings: "Retenues", employeeTaxesContributions: "impôts et cotisations salariales", employerCost: "Coût employeur", ralMultiplier: "{value} du brut", taxWedge: "Coin fiscal", wedgeHint: "du coût employeur n’atteint pas le net", costSplitTitle: "Répartition du coût employeur", oneHundredOf: "100 % de {value}", costSplitAria: "Répartition du coût employeur de {value} : {segments}", splitNet: "Net du salarié", splitContributions: "Cotisations salariales", splitTaxes: "Impôts", splitEmployer: "Charges employeur",
  grossToNet: "Du brut au net", breakdownHint: "Retenues salariales · ouvrir une ligne pour le calcul et la source", annualGross: "Salaire brut annuel", socialContributions: "Cotisations sociales", socialNote: "Déduites AVANT l’impôt, elles réduisent aussi l’assiette imposable.", taxableIncome: "Revenu imposable", taxableNote: "Brut moins cotisations : l’assiette sur laquelle l’impôt est appliqué.", taxes: "Impôts", cashCredits: "Versements complémentaires", cashCreditsNote: "Transferts en espèces, et non réductions d’impôt : ils sont ajoutés après le calcul.", calculationBasis: "Base de calcul", ofThisBasis: "{value} de cette base", calculation: "Calcul", appliedRule: "Règle appliquée",
  employerTitle: "Coût pour l’employeur", employerIntro: "Ce que l’employeur dépense pour ce contrat. Ce n’est ni le brut ni ce que reçoit le salarié.", employerCharges: "Charges employeur", annualTotalCost: "Coût annuel total", mandatoryContributions: "Cotisations obligatoires", mandatoryInsurance: "Assurance obligatoire", deferredPay: "Rémunération différée", otherCosts: "Autres coûts", employerShareSentence: "Pour chaque {cost} dépensés par l’employeur, {share} parvient au salarié en net cette année. Le reste correspond aux impôts ou cotisations des deux côtés de la paie.",
  effectiveRates: "Taux effectifs", ratesBasis: "Tous calculés sur le brut, et non sur le revenu imposable", effectiveRate: "Taux effectif", effectiveRateHint: "Impôts + cotisations ÷ brut", taxOnly: "Impôts seulement", taxOnlyHint: "Impôt ÷ brut", contributionsOnly: "Cotisations seulement", contributionsOnlyHint: "Cotisations salariales ÷ brut", marginalRate: "Taux marginal sur le brut", marginalRateHelp: "Retenue sur les 1 000 € de brut suivants. Inclut aussi la diminution des avantages, pas seulement le taux du barème.", marginalRateHeldHelp: "Retenue sur les 1 000 € de brut suivants en maintenant fixes les taux communiqués par l’administration ou l’employeur.", marginalRateUnavailableHelp: "Indisponible : les données externes ne permettent pas une variation marginale fiable.",
  methodologyTitle: "Méthodologie et périmètre du modèle", taxYearVerified: "Année fiscale {year}{date}", verifiedOn: " · sources vérifiées le {date}", howNumbers: "Comment ces chiffres sont obtenus", primaryLaw: "Texte primaire", primaryLawHelp: "L’article qui fixe le paramètre, et non un résumé.", administrativeSource: "Source administrative", administrativeSourceHelp: "La circulaire ou le tableau de l’organisme compétent.", taxBase: "Assiette", taxBaseHelp: "La base à laquelle le taux s’applique : l’erreur la plus fréquente.", thresholds: "Seuils et plafonds", thresholdsHelp: "Plafonds, minima, exonérations et discontinuités.", boundaryTests: "Tests aux limites", boundaryTestsHelp: "Testés juste en dessous, au niveau et juste au-dessus de chaque seuil.", exclusions: "Ce que ce calcul exclut", simplifications: "Le registre complet des simplifications et de leur erreur estimée se trouve dans", precision: "Précision et arrondis", precisionBody: "Les montants utilisent des centimes entiers, jamais des nombres flottants. L’arrondi n’intervient que lorsque la loi l’impose.", deterministic: "Le moteur est déterministe et total : mêmes entrées, même résultat ; une règle absente entraîne un refus.", confidenceLevels: "Niveaux de confiance", verifiedTierHelp: "Source primaire et vérification croisée avec un calculateur officiel indépendant.", supportedTierHelp: "Source primaire ou administrative sans vérification croisée indépendante.", experimentalTierHelp: "Paramètre propre à l’entreprise : aucune valeur unique n’est universellement correcte.", weakestConfidence: "Le résultat hérite du niveau de confiance le plus faible, jamais d’une moyenne.", countryResearch: "Recherche complète sur ce pays",
  provenanceTitle: "Les {count} règles appliquées à ce calcul", provenanceSummary: "Calcul fondé sur {rules} règles provenant de {sources} sources officielles", validationInfo: "À prendre en compte", validationError: "Profil non calculable", noResultAnnouncement: "Aucun résultat : vérifiez les données saisies.", resultAnnouncement: "Moyenne projetée par période {period}, net annuel {annual}.", nearThreshold: "Vous êtes proche d’un seuil : {label}", thresholdBody: "L’assiette est exonérée jusqu’à {threshold} ; au-delà, le taux s’applique à la totalité. Votre assiette est de {taxable} : une faible hausse peut réduire le net. C’est la règle, pas une erreur de calcul.", footer: "Outil interne de projection de paie. Les profils hors périmètre sont refusés ; régimes favorables, avantages et périodes incomplètes non déclarées restent exclus.", profile: "Profil", simplificationsDocumented: "Les simplifications sont documentées dans", grossMissing: "Saisissez le salaire brut annuel pour afficher le calcul.", grossPositive: "Le salaire brut annuel doit être positif.", grossMaximum: "Au-delà de {value}, le modèle n’est plus pertinent car les seuils des régimes spéciaux changent le résultat.", officialFieldSource: "Documentation officielle 2026 et source juridique indiquée pour le pays sélectionné.",
};

const ES: Record<MessageKey, string> = {
  ...EN,
  metadataDescription: "Proyección del salario bruto anual al neto, con cada retención vinculada a la norma que la determina.",
  displayPreferences: "Preferencias de visualización",
  switchToDarkTheme: "Cambiar al tema oscuro",
  switchToLightTheme: "Cambiar al tema claro",
  language: "Idioma de la interfaz", primaryParameters: "Parámetros principales", otherParameters: "Otros parámetros del cálculo", country: "País", unavailable: "no disponible", countryHelp: "Ejercicio fiscal {year}. El producto solo muestra los {count} países con motor y reglas versionadas.", countryExample: "Italia, Alemania, España y Francia constituyen el alcance operativo actual.", countrySource: "Registro de adaptadores y reglas fiscales de 2026 disponibles en el motor.", infoAbout: "Información sobre {label}", parameterGuide: "Guía del parámetro", whatChanges: "Qué cambia", example: "Ejemplo", source: "Fuente", defaultSource: "Reglas de 2026 y documentación del país seleccionado.", methodologyAndSources: "Metodología y fuentes →", close: "Cerrar",
  pageScroll: "Desplazamiento de la página",
  confidenceVerified: "Verificado con fuentes oficiales", confidenceSupported: "Respaldado por documentación autorizada", confidenceExperimental: "Experimental — solo orientativo", confidenceVerifiedShort: "Verificado", confidenceSupportedShort: "Documentado", confidenceExperimentalShort: "Experimental", emptyTitle: "No hay cálculo que mostrar",
  netPerPeriod: "Promedio neto proyectado por periodo · {periods} periodos", netMonthly: "Neto mensual", methodAndSources: "Método y fuentes", netAnnual: "Neto anual", twelveMonthAverage: "media de 12 meses", grossRal: "Salario bruto", contractFigure: "importe contractual", withholdings: "Retenciones", employeeTaxesContributions: "impuestos y cotizaciones del trabajador", employerCost: "Coste empresarial", ralMultiplier: "{value} del bruto", taxWedge: "Cuña fiscal", wedgeHint: "del coste empresarial no llega al neto", costSplitTitle: "Distribución del coste empresarial", oneHundredOf: "100 % de {value}", costSplitAria: "Distribución del coste empresarial de {value}: {segments}", splitNet: "Neto del trabajador", splitContributions: "Cotizaciones del trabajador", splitTaxes: "Impuestos", splitEmployer: "Cargas empresariales",
  grossToNet: "Del bruto al neto", breakdownHint: "Retenciones del trabajador · abra una línea para ver el cálculo y la fuente", annualGross: "Salario bruto anual", socialContributions: "Cotizaciones sociales", socialNote: "Se restan ANTES del impuesto y reducen también la base imponible.", taxableIncome: "Base imponible", taxableNote: "Bruto menos cotizaciones: la base sobre la que se aplica el impuesto.", taxes: "Impuestos", cashCredits: "Pagos adicionales", cashCreditsNote: "Transferencias en efectivo, no reducciones del impuesto: se suman después del cálculo.", calculationBasis: "Base de cálculo", ofThisBasis: "{value} de esta base", calculation: "Cálculo", appliedRule: "Norma aplicada",
  employerTitle: "Coste para la empresa", employerIntro: "Lo que la empresa gasta por este contrato. No es el bruto ni lo que recibe el trabajador.", employerCharges: "Cargas empresariales", annualTotalCost: "Coste anual total", mandatoryContributions: "Cotizaciones obligatorias", mandatoryInsurance: "Seguro obligatorio", deferredPay: "Retribución diferida", otherCosts: "Otros costes", employerShareSentence: "Por cada {cost} gastados por la empresa, {share} llega al trabajador como neto este año. El resto son impuestos o cotizaciones a ambos lados de la nómina.",
  effectiveRates: "Tipos efectivos", ratesBasis: "Todos calculados sobre el bruto, no sobre la base imponible", effectiveRate: "Tipo efectivo", effectiveRateHint: "Impuestos + cotizaciones ÷ bruto", taxOnly: "Solo impuestos", taxOnlyHint: "Impuesto ÷ bruto", contributionsOnly: "Solo cotizaciones", contributionsOnlyHint: "Cotizaciones del trabajador ÷ bruto", marginalRate: "Tipo marginal sobre el bruto", marginalRateHelp: "Retención sobre los siguientes 1.000 € de bruto. Incluye también la pérdida de deducciones, no solo el tipo de la escala.", marginalRateHeldHelp: "Retención sobre los siguientes 1.000 € de bruto manteniendo fijos los tipos comunicados por la AEAT o la empresa.", marginalRateUnavailableHelp: "No disponible: los datos externos no permiten una variación marginal fiable.",
  methodologyTitle: "Metodología y alcance del modelo", taxYearVerified: "Ejercicio fiscal {year}{date}", verifiedOn: " · fuentes verificadas el {date}", howNumbers: "Cómo se obtienen estas cifras", primaryLaw: "Norma primaria", primaryLawHelp: "El artículo que fija el parámetro, no un resumen.", administrativeSource: "Fuente administrativa", administrativeSourceHelp: "La circular o tabla del organismo competente.", taxBase: "Base imponible", taxBaseHelp: "A qué se aplica el tipo: el error más habitual.", thresholds: "Umbrales y topes", thresholdsHelp: "Límites, mínimos, exenciones y discontinuidades.", boundaryTests: "Pruebas de límites", boundaryTestsHelp: "Probado justo por debajo, en y justo por encima de cada umbral.", exclusions: "Qué no incluye este cálculo", simplifications: "El registro completo de simplificaciones y su error estimado está en", precision: "Precisión y redondeos", precisionBody: "Los importes usan céntimos enteros, nunca coma flotante. Solo se redondea cuando y donde lo exige la norma.", deterministic: "El motor es determinista y total: las mismas entradas producen el mismo resultado; una regla ausente provoca un rechazo.", confidenceLevels: "Niveles de confianza", verifiedTierHelp: "Fuente primaria y contraste con un calculador oficial independiente.", supportedTierHelp: "Fuente primaria o administrativa sin contraste independiente.", experimentalTierHelp: "Parámetro propio de la empresa: ningún valor único es universalmente correcto.", weakestConfidence: "El resultado hereda el nivel de confianza más bajo, nunca una media.", countryResearch: "Investigación completa sobre este país",
  provenanceTitle: "Las {count} reglas aplicadas a este cálculo", provenanceSummary: "Cálculo basado en {rules} reglas de {sources} fuentes oficiales", validationInfo: "A tener en cuenta", validationError: "Perfil no calculable", noResultAnnouncement: "Sin resultado: revise los datos introducidos.", resultAnnouncement: "Promedio neto proyectado por periodo {period}, neto anual {annual}.", nearThreshold: "Está cerca de un umbral: {label}", thresholdBody: "La base está exenta hasta {threshold}; superado el umbral, el tipo se aplica a toda la base. Su base es {taxable}: un pequeño aumento puede reducir el neto. Es la norma, no un error de cálculo.", footer: "Herramienta interna de proyección de nómina. Se rechazan perfiles fuera de alcance; quedan excluidos regímenes favorables, beneficios y periodos parciales no declarados.", profile: "Perfil", simplificationsDocumented: "Las simplificaciones están documentadas en", grossMissing: "Introduzca el salario bruto anual para ver el cálculo.", grossPositive: "El salario bruto anual debe ser positivo.", grossMaximum: "Por encima de {value}, el modelo deja de ser significativo porque cambian los umbrales de regímenes especiales.", officialFieldSource: "Documentación oficial de 2026 y fuente normativa indicada para el país seleccionado.",
};

const MESSAGES: Record<Locale, Record<MessageKey, string>> = { it: IT, en: EN, de: DE, fr: FR, es: ES };

export function message(locale: Locale, key: MessageKey, vars: Record<string, string | number> = {}): string {
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    MESSAGES[locale][key],
  );
}

const COUNTRY_NAMES: Record<Locale, Record<EUCountry, string>> = {
  it: { IT: "Italia", DE: "Germania", ES: "Spagna", FR: "Francia" },
  en: { IT: "Italy", DE: "Germany", ES: "Spain", FR: "France" },
  de: { IT: "Italien", DE: "Deutschland", ES: "Spanien", FR: "Frankreich" },
  fr: { IT: "Italie", DE: "Allemagne", ES: "Espagne", FR: "France" },
  es: { IT: "Italia", DE: "Alemania", ES: "España", FR: "Francia" },
};

export function countryName(locale: Locale, country: EUCountry): string {
  return COUNTRY_NAMES[locale][country];
}

type FieldCopy = { label: string; short?: string; help: string };
const FIELD_COPY: Record<Exclude<Locale, "it">, Record<string, FieldCopy>> = {
  en: {
    grossAnnual: { label: "Annual gross salary", short: "Annual gross", help: "Annual gross before employee taxes and contributions. It is not the employer's total cost." },
    "IT:region": { label: "Region", help: "Determines the regional income-tax surcharge; autonomous provinces are shown as P.A." },
    "IT:location": { label: "Municipality / city", short: "Location", help: "Selects the municipality and its region together, so local income-tax surcharges always stay consistent." },
    "IT:countryOptions.pensionCeilingStatus": { label: "Pension ceiling", short: "IVS ceiling", help: "Confirms whether the statutory INPS pension contribution ceiling applies to this employee." },
    "IT:municipality": { label: "Municipality", help: "Determines the municipal surcharge and any exemption cliff." },
    "IT:collectiveAgreement": { label: "Collective agreement", short: "CCNL", help: "Determines pay periods, contractual minimum and employer-funded benefits, not tax." },
    payPeriods: { label: "Pay periods", help: "Changes each payslip amount, never the annual total." },
    companySize: { label: "No. employees", help: "Determines employer rates and thresholds linked to company headcount." },
    jobLevel: { label: "Job level", short: "Level", help: "Checks the contractual minimum salary; it does not change taxes or contributions." },
    contractType: { label: "Contract", help: "Fixed-term and permanent contracts can have different employer contribution rates." },
    "IT:countryOptions.inailRiskClass": { label: "INAIL", help: "Indicative occupational-risk class; the actual rate is company-specific." },
    "IT:countryOptions.inailRatePercent": { label: "INAIL", help: "Overrides the indicative INAIL class with the company's notified rate." },
    "DE:region": { label: "Land", help: "Determines church-tax rate and the Saxony split of long-term-care insurance." },
    "DE:countryOptions.steuerklasse": { label: "Steuerklasse", help: "Payroll tax class based on the employee's household situation." },
    "DE:countryOptions.churchMember": { label: "Kirchensteuer", help: "Whether church tax is due; the rate depends on the Land." },
    "DE:countryOptions.familyStatus": { label: "Parenthood and children under 25", short: "Children (care)", help: "Separates permanent parent status from the number of children under 25 relevant to long-term-care insurance." },
    "DE:countryOptions.hasParentStatus": { label: "Parent status", help: "Records parenthood independently from the current age of qualifying children." },
    "DE:countryOptions.qualifyingChildrenUnder25": { label: "Children under 25", short: "Children <25", help: "Determines the reduction from the second through fifth qualifying child." },
    age: { label: "Age", help: "Used for age-dependent social-insurance supplements." },
    "DE:countryOptions.zusatzbeitrag": { label: "Zusatzbeitrag", help: "Indicative health-fund supplementary contribution band, shared with the employer." },
    "DE:countryOptions.zusatzbeitragRatePercent": { label: "Exact Zusatz", help: "Overrides the band with the health fund's exact total rate." },
    "DE:countryOptions.unfallRiskClass": { label: "Gefahrtarif", help: "Indicative occupational accident risk class set by the Berufsgenossenschaft." },
    "DE:countryOptions.unfallRatePercent": { label: "Exact Unfall rate", help: "Overrides the risk class with the actual Berufsgenossenschaft rate." },
    "DE:countryOptions.u1RatePercent": { label: "Exact U1 rate", help: "Required for an eligible employer and taken from the selected Krankenkasse reimbursement tariff." },
    "DE:countryOptions.u2RatePercent": { label: "Exact U2 rate", help: "Overrides the average maternity levy with the health fund's U2 rate." },
    "ES:region": { label: "Autonomous community", help: "Legislates part of IRPF; foral territories are outside the model." },
    "ES:countryOptions.aeatWithholdingRate": { label: "AEAT withholding", short: "AEAT IRPF", help: "Official 2026 payroll withholding percentage returned by AEAT for this employee." },
    "ES:jobLevel": { label: "Grupo de cotización", short: "Contribution group", help: "Determines the minimum monthly contribution base." },
    "ES:countryOptions.cnaeRiskClass": { label: "AT/EP", help: "Indicative occupational-risk rate based on the employer's CNAE activity." },
    "ES:countryOptions.atepRatePercent": { label: "Exact AT/EP rate", help: "Overrides the indicative class with the rate for the company's CNAE code." },
    "FR:region": { label: "Local scheme", help: "Selects the general scheme or the Alsace-Moselle local scheme." },
    "FR:countryOptions.statut": { label: "Statut", help: "Cadre status adds the Apec contribution." },
    "FR:countryOptions.pasRatePercent": { label: "PAS rate", short: "PAS", help: "Active withholding rate transmitted by DGFiP and applied to net imposable; it is not reconstructed from the annual tax scale." },
    "FR:countryOptions.foyer": { label: "Tax household", short: "Foyer fiscal", help: "Determines household parts used by the French income-tax quotient." },
    "FR:countryOptions.versementMobilite": { label: "Versement mobilité", help: "Indicative employer mobility levy based on establishment location and headcount." },
    "FR:countryOptions.versementMobiliteRatePercent": { label: "Exact mobilité rate", help: "Overrides the scenario with the establishment's exact AOM rate." },
    "FR:countryOptions.mutuelleEmployeeAnnual": { label: "Annual employee mutuelle", short: "Annual mutuelle", help: "Exact annual employee share from the mandatory company health plan; leave blank when unavailable." },
    "FR:countryOptions.prevoyanceEmployeeAnnual": { label: "Annual employee prévoyance", short: "Annual prévoyance", help: "Exact annual employee share from the mandatory collective protection plan; no default is assumed." },
    "FR:countryOptions.children": { label: "Dependent children", short: "Children", help: "Determines additional household parts, subject to the quotient-familial cap." },
    "FR:countryOptions.atmpRiskClass": { label: "AT/MP", help: "Indicative workplace-risk class; the actual Carsat rate is establishment-specific." },
    "FR:countryOptions.atmpRatePercent": { label: "Exact AT/MP rate", help: "Overrides the class with the rate notified by Carsat." },
  },
  de: {}, fr: {}, es: {},
};

// Non-English field copy is deliberately derived from the same semantic keys;
// statutory names remain native because those are the words on the payslip.
const GENERIC_FIELD_LABELS: Record<"de" | "fr" | "es", Record<string, [string, string?]>> = {
  de: {
    grossAnnual: ["Bruttojahresgehalt", "Jahresbrutto"], payPeriods: ["Zahlungen"], companySize: ["Anz. Beschäftigte"], jobLevel: ["Einstufung", "Stufe"], contractType: ["Vertrag"], age: ["Alter"],
    "IT:region": ["Region"], "IT:location": ["Gemeinde / Stadt", "Ort"], "IT:countryOptions.pensionCeilingStatus": ["Beitragsbemessungsgrenze", "IVS-Grenze"], "IT:municipality": ["Gemeinde"], "IT:collectiveAgreement": ["Tarifvertrag", "CCNL"], "IT:countryOptions.inailRiskClass": ["INAIL"], "IT:countryOptions.inailRatePercent": ["INAIL"],
    "DE:region": ["Bundesland", "Land"], "DE:countryOptions.steuerklasse": ["Steuerklasse"], "DE:countryOptions.churchMember": ["Kirchensteuer"], "DE:countryOptions.familyStatus": ["Elternstatus und Kinder unter 25", "Kinder (Pflege)"], "DE:countryOptions.hasParentStatus": ["Elterneigenschaft"], "DE:countryOptions.qualifyingChildrenUnder25": ["Kinder unter 25", "Kinder <25"], "DE:countryOptions.zusatzbeitrag": ["Zusatzbeitrag"], "DE:countryOptions.zusatzbeitragRatePercent": ["Genauer Zusatzbeitrag", "Zusatz genau"], "DE:countryOptions.unfallRiskClass": ["Gefahrtarif"], "DE:countryOptions.unfallRatePercent": ["Genauer Unfallsatz", "Unfall genau"], "DE:countryOptions.u1RatePercent": ["Genauer U1-Satz", "U1 genau"], "DE:countryOptions.u2RatePercent": ["Genauer U2-Satz", "U2 genau"],
    "ES:region": ["Autonome Gemeinschaft"], "ES:countryOptions.aeatWithholdingRate": ["AEAT-Einbehalt", "AEAT IRPF"], "ES:jobLevel": ["Grupo de cotización", "Beitragsgruppe"], "ES:countryOptions.cnaeRiskClass": ["AT/EP"], "ES:countryOptions.atepRatePercent": ["Genauer AT/EP-Satz"],
    "FR:region": ["Lokales System"], "FR:countryOptions.statut": ["Statut"], "FR:countryOptions.pasRatePercent": ["PAS-Satz", "PAS"], "FR:countryOptions.foyer": ["Steuerhaushalt", "Foyer fiscal"], "FR:countryOptions.versementMobilite": ["Versement mobilité"], "FR:countryOptions.versementMobiliteRatePercent": ["Genauer Mobilitätssatz", "Mobilité genau"], "FR:countryOptions.mutuelleEmployeeAnnual": ["Jährlicher Mutuelle-Anteil", "Mutuelle jährlich"], "FR:countryOptions.prevoyanceEmployeeAnnual": ["Jährlicher Prévoyance-Anteil", "Prévoyance jährlich"], "FR:countryOptions.children": ["Unterhaltsberechtigte Kinder", "Kinder"], "FR:countryOptions.atmpRiskClass": ["AT/MP"], "FR:countryOptions.atmpRatePercent": ["Genauer AT/MP-Satz"],
  },
  fr: {
    grossAnnual: ["Salaire brut annuel", "Brut annuel"], payPeriods: ["Versements"], companySize: ["Nb salariés"], jobLevel: ["Niveau"], contractType: ["Contrat"], age: ["Âge"],
    "IT:region": ["Région"], "IT:location": ["Commune / ville", "Localité"], "IT:countryOptions.pensionCeilingStatus": ["Plafond de cotisation", "Plafond IVS"], "IT:municipality": ["Commune"], "IT:collectiveAgreement": ["Convention collective", "CCNL"], "IT:countryOptions.inailRiskClass": ["INAIL"], "IT:countryOptions.inailRatePercent": ["INAIL"],
    "DE:region": ["Land"], "DE:countryOptions.steuerklasse": ["Steuerklasse"], "DE:countryOptions.churchMember": ["Kirchensteuer"], "DE:countryOptions.familyStatus": ["Parentalité et enfants de moins de 25 ans", "Enfants (dépendance)"], "DE:countryOptions.hasParentStatus": ["Qualité de parent"], "DE:countryOptions.qualifyingChildrenUnder25": ["Enfants de moins de 25 ans", "Enfants <25"], "DE:countryOptions.zusatzbeitrag": ["Zusatzbeitrag"], "DE:countryOptions.zusatzbeitragRatePercent": ["Zusatz exact"], "DE:countryOptions.unfallRiskClass": ["Gefahrtarif"], "DE:countryOptions.unfallRatePercent": ["Taux Unfall exact"], "DE:countryOptions.u1RatePercent": ["Taux U1 exact"], "DE:countryOptions.u2RatePercent": ["Taux U2 exact"],
    "ES:region": ["Communauté autonome"], "ES:countryOptions.aeatWithholdingRate": ["Retenue AEAT", "IRPF AEAT"], "ES:jobLevel": ["Grupo de cotización", "Groupe de cotisation"], "ES:countryOptions.cnaeRiskClass": ["AT/EP"], "ES:countryOptions.atepRatePercent": ["Taux AT/EP exact"],
    "FR:region": ["Régime local"], "FR:countryOptions.statut": ["Statut"], "FR:countryOptions.pasRatePercent": ["Taux PAS", "PAS"], "FR:countryOptions.foyer": ["Foyer fiscal"], "FR:countryOptions.versementMobilite": ["Versement mobilité"], "FR:countryOptions.versementMobiliteRatePercent": ["Taux mobilité exact"], "FR:countryOptions.mutuelleEmployeeAnnual": ["Part salariale mutuelle annuelle", "Mutuelle annuelle"], "FR:countryOptions.prevoyanceEmployeeAnnual": ["Part salariale prévoyance annuelle", "Prévoyance annuelle"], "FR:countryOptions.children": ["Enfants à charge", "Enfants"], "FR:countryOptions.atmpRiskClass": ["AT/MP"], "FR:countryOptions.atmpRatePercent": ["Taux AT/MP exact"],
  },
  es: {
    grossAnnual: ["Salario bruto anual", "Bruto anual"], payPeriods: ["Pagas"], companySize: ["N.º empleados"], jobLevel: ["Nivel"], contractType: ["Contrato"], age: ["Edad"],
    "IT:region": ["Región"], "IT:location": ["Municipio / ciudad", "Localidad"], "IT:countryOptions.pensionCeilingStatus": ["Tope de cotización", "Tope IVS"], "IT:municipality": ["Municipio"], "IT:collectiveAgreement": ["Convenio colectivo", "CCNL"], "IT:countryOptions.inailRiskClass": ["INAIL"], "IT:countryOptions.inailRatePercent": ["INAIL"],
    "DE:region": ["Land"], "DE:countryOptions.steuerklasse": ["Steuerklasse"], "DE:countryOptions.churchMember": ["Kirchensteuer"], "DE:countryOptions.familyStatus": ["Paternidad e hijos menores de 25", "Hijos (dependencia)"], "DE:countryOptions.hasParentStatus": ["Condición de progenitor"], "DE:countryOptions.qualifyingChildrenUnder25": ["Hijos menores de 25", "Hijos <25"], "DE:countryOptions.zusatzbeitrag": ["Zusatzbeitrag"], "DE:countryOptions.zusatzbeitragRatePercent": ["Zusatz exacto"], "DE:countryOptions.unfallRiskClass": ["Gefahrtarif"], "DE:countryOptions.unfallRatePercent": ["Tipo Unfall exacto"], "DE:countryOptions.u1RatePercent": ["Tipo U1 exacto"], "DE:countryOptions.u2RatePercent": ["Tipo U2 exacto"],
    "ES:region": ["Comunidad autónoma"], "ES:countryOptions.aeatWithholdingRate": ["Retención AEAT", "IRPF AEAT"], "ES:jobLevel": ["Grupo de cotización"], "ES:countryOptions.cnaeRiskClass": ["AT/EP"], "ES:countryOptions.atepRatePercent": ["Tipo AT/EP exacto"],
    "FR:region": ["Régimen local"], "FR:countryOptions.statut": ["Statut"], "FR:countryOptions.pasRatePercent": ["Tipo PAS", "PAS"], "FR:countryOptions.foyer": ["Hogar fiscal", "Foyer fiscal"], "FR:countryOptions.versementMobilite": ["Versement mobilité"], "FR:countryOptions.versementMobiliteRatePercent": ["Tipo mobilité exacto"], "FR:countryOptions.mutuelleEmployeeAnnual": ["Aportación anual de mutuelle", "Mutuelle anual"], "FR:countryOptions.prevoyanceEmployeeAnnual": ["Aportación anual de prévoyance", "Prévoyance anual"], "FR:countryOptions.children": ["Hijos a cargo", "Hijos"], "FR:countryOptions.atmpRiskClass": ["AT/MP"], "FR:countryOptions.atmpRatePercent": ["Tipo AT/MP exacto"],
  },
};

export const FIELD_HELP_GENERIC: Record<"de" | "fr" | "es", Record<string, string>> = {
  de: { gross: "Jährliches Brutto vor Steuern und Arbeitnehmerbeiträgen; nicht der Gesamtaufwand des Arbeitgebers.", geography: "Dieser Wert bestimmt die örtlich geltenden Steuern, Zuschläge oder Sozialversicherungsregeln.", periods: "Ändert den Betrag je Abrechnung, niemals die Jahressumme.", headcount: "Bestimmt arbeitgeberseitige Sätze und Schwellen nach Unternehmensgröße.", contract: "Die Vertragsart kann die Arbeitgeberbeiträge verändern, nicht zwingend das Arbeitnehmernetto.", level: "Prüft Einstufung oder Mindestbemessungsgrundlage; die genaue Auswirkung hängt vom Land ab.", children: "Beeinflusst familien- oder kinderbezogene Steuer- und Sozialversicherungsregeln.", age: "Wird für altersabhängige Sozialversicherungsregeln benötigt.", withholding: "Offizieller individueller Einbehalt, der direkt auf der Abrechnung angewandt wird.", risk: "Richtwert der betrieblichen Risikoklasse; der tatsächliche Satz ist unternehmens- oder betriebsstättenspezifisch.", exact: "Ersetzt den Richtwert durch den exakten, dem Unternehmen mitgeteilten Prozentsatz.", amount: "Exakter jährlicher Arbeitnehmerbetrag aus der Abrechnung oder dem betrieblichen Vertrag; leer lassen, wenn unbekannt.", profile: "Persönliches oder sozialversicherungsrechtliches Merkmal, das die Berechnung beeinflusst." },
  fr: { gross: "Brut annuel avant impôts et cotisations salariales ; ce n’est pas le coût total employeur.", geography: "Cette valeur détermine les impôts, surtaxes ou règles sociales applicables localement.", periods: "Modifie le montant de chaque paie, jamais le total annuel.", headcount: "Détermine les taux et seuils employeur liés à l’effectif.", contract: "Le type de contrat peut modifier les cotisations employeur, sans nécessairement changer le net salarié.", level: "Contrôle le classement ou l’assiette minimale ; l’effet exact dépend du pays.", children: "Modifie les règles fiscales ou sociales liées aux enfants et au foyer.", age: "Utilisé pour les règles sociales dépendant de l’âge.", withholding: "Retenue individuelle officielle appliquée directement sur la paie.", risk: "Classe de risque indicative ; le taux réel dépend de l’entreprise ou de l’établissement.", exact: "Remplace le scénario indicatif par le taux exact notifié à l’entreprise.", amount: "Montant salarial annuel exact figurant sur la paie ou le contrat collectif ; laisser vide s’il est inconnu.", profile: "Caractéristique personnelle ou sociale qui modifie le calcul." },
  es: { gross: "Bruto anual antes de impuestos y cotizaciones del trabajador; no es el coste total empresarial.", geography: "Este valor determina los impuestos, recargos o reglas sociales aplicables localmente.", periods: "Cambia el importe de cada nómina, nunca el total anual.", headcount: "Determina tipos y umbrales empresariales vinculados al tamaño de la plantilla.", contract: "El tipo de contrato puede cambiar las cotizaciones empresariales sin modificar necesariamente el neto.", level: "Comprueba la clasificación o base mínima; el efecto exacto depende del país.", children: "Modifica reglas fiscales o sociales vinculadas a hijos y unidad familiar.", age: "Se utiliza para reglas de seguridad social dependientes de la edad.", withholding: "Retención individual oficial aplicada directamente en la nómina.", risk: "Clase de riesgo orientativa; el tipo real depende de la empresa o centro de trabajo.", exact: "Sustituye el escenario orientativo por el porcentaje exacto notificado a la empresa.", amount: "Importe anual exacto a cargo del trabajador según nómina o contrato colectivo; déjelo vacío si se desconoce.", profile: "Característica personal o de seguridad social que modifica el cálculo." },
};

const FIELD_EXAMPLE_GENERIC: Record<Exclude<Locale, "it">, Record<"gross" | "periods" | "rate" | "amount" | "selection", string>> = {
  en: {
    gross: "For €45,000 annual gross, enter 45000; pay periods and net pay are derived from that amount.",
    periods: "€30,000 annual net is €2,500 over 12 payments or about €2,143 over 14.",
    rate: "At €45,000 gross, a 1% rate is approximately €450 per year; enter 0.4 for 0.4%, not 4.",
    amount: "If the employee pays €42.50 each month, enter 510.00 as the exact annual amount.",
    selection: "Select the value shown on the employee's official payroll, contract or insurance record.",
  },
  de: {
    gross: "Bei 45.000 € Jahresbrutto 45000 eingeben; Zahlungen und Netto werden daraus abgeleitet.",
    periods: "30.000 € Jahresnetto entsprechen 2.500 € bei 12 oder rund 2.143 € bei 14 Zahlungen.",
    rate: "Bei 45.000 € Brutto entsprechen 1 % rund 450 € jährlich; für 0,4 % ist 0,4 einzugeben, nicht 4.",
    amount: "Bei monatlich 42,50 € Arbeitnehmeranteil den exakten Jahresbetrag 510,00 eingeben.",
    selection: "Den Wert auswählen, der in Abrechnung, Vertrag oder Versicherungsunterlagen steht.",
  },
  fr: {
    gross: "Pour 45 000 € de brut annuel, saisir 45000 ; les versements et le net en sont dérivés.",
    periods: "30 000 € de net annuel représentent 2 500 € sur 12 versements ou environ 2 143 € sur 14.",
    rate: "Pour 45 000 € de brut, 1 % représente environ 450 € par an ; saisir 0,4 pour 0,4 %, et non 4.",
    amount: "Pour une part salariale mensuelle de 42,50 €, saisir le montant annuel exact de 510,00.",
    selection: "Sélectionner la valeur figurant sur la paie, le contrat ou le dossier d'assurance officiel.",
  },
  es: {
    gross: "Para 45.000 € de bruto anual, introduzca 45000; pagas y neto se derivan de ese importe.",
    periods: "30.000 € de neto anual son 2.500 € en 12 pagas o aproximadamente 2.143 € en 14.",
    rate: "Con 45.000 € de bruto, el 1 % son unos 450 € al año; introduzca 0,4 para el 0,4 %, no 4.",
    amount: "Si la aportación mensual del trabajador es 42,50 €, introduzca el importe anual exacto 510,00.",
    selection: "Seleccione el valor que figure en la nómina, contrato o registro de seguro oficial.",
  },
};

const OPTION_LABELS: Record<Locale, Record<string, string>> = {
  it: {},
  en: { yes: "Yes", no: "No", low: "Low", average: "Average", high: "High", permanent: "Permanent", fixed_term: "Fixed-term", office: "Office", retail: "Retail", manufacturing: "Manufacturing", construction: "Construction", unknown: "Check required", subject: "Applicable", not_subject: "Not applicable", single: "Single", couple: "Couple", parent_isole: "Single parent", none: "No children", parent_0: "Parent · none under 25", parent_1: "1 under 25", parent_2: "2 under 25", parent_3: "3 under 25", parent_4: "4 under 25", parent_5plus: "5+ under 25", other_urban: "Medium urban area", lyon: "Large urban area" },
  de: { yes: "Ja", no: "Nein", low: "Niedrig", average: "Mittel", high: "Hoch", permanent: "Unbefristet", fixed_term: "Befristet", office: "Büro", retail: "Handel", manufacturing: "Industrie", construction: "Baugewerbe", unknown: "Zu prüfen", subject: "Anwendbar", not_subject: "Nicht anwendbar", single: "Alleinstehend", couple: "Paar", parent_isole: "Alleinerziehend", none: "Keine Kinder", parent_0: "Elternteil · keine unter 25", parent_1: "1 unter 25", parent_2: "2 unter 25", parent_3: "3 unter 25", parent_4: "4 unter 25", parent_5plus: "5+ unter 25", other_urban: "Mittlerer Ballungsraum", lyon: "Großer Ballungsraum" },
  fr: { yes: "Oui", no: "Non", low: "Faible", average: "Moyen", high: "Élevé", permanent: "CDI", fixed_term: "CDD", office: "Bureau", retail: "Commerce", manufacturing: "Industrie", construction: "Bâtiment", unknown: "À vérifier", subject: "Applicable", not_subject: "Non applicable", single: "Célibataire", couple: "Couple", parent_isole: "Parent isolé", none: "Aucun enfant", parent_0: "Parent · aucun de moins de 25 ans", parent_1: "1 de moins de 25 ans", parent_2: "2 de moins de 25 ans", parent_3: "3 de moins de 25 ans", parent_4: "4 de moins de 25 ans", parent_5plus: "5+ de moins de 25 ans", other_urban: "Agglomération moyenne", lyon: "Grande agglomération" },
  es: { yes: "Sí", no: "No", low: "Bajo", average: "Medio", high: "Alto", permanent: "Indefinido", fixed_term: "Temporal", office: "Oficina", retail: "Comercio", manufacturing: "Industria", construction: "Construcción", unknown: "Por verificar", subject: "Aplicable", not_subject: "No aplicable", single: "Soltero", couple: "Pareja", parent_isole: "Progenitor solo", none: "Sin hijos", parent_0: "Progenitor · ninguno menor de 25", parent_1: "1 menor de 25", parent_2: "2 menores de 25", parent_3: "3 menores de 25", parent_4: "4 menores de 25", parent_5plus: "5+ menores de 25", other_urban: "Área urbana media", lyon: "Gran área urbana" },
};

export function localizeInput(locale: Locale, country: EUCountry, input: InputDescriptor): InputDescriptor {
  if (locale === "it") return input;
  const key = `${country}:${input.field}`;
  const english = FIELD_COPY.en[key] ?? FIELD_COPY.en[input.field];
  const nativeLabel = locale === "en" ? undefined : GENERIC_FIELD_LABELS[locale][key] ?? GENERIC_FIELD_LABELS[locale][input.field];
  const localized: FieldCopy | undefined = locale === "en" ? english : nativeLabel && english ? {
    label: nativeLabel[0],
    ...(nativeLabel[1] ? { short: nativeLabel[1] } : {}),
    help: FIELD_HELP_GENERIC[locale][fieldHelpKind(input)] ?? english.help,
  } : english;
  if (!localized) return input;
  const { example: untranslatedExample, options, ...baseInput } = input;
  void untranslatedExample;
  return {
    ...baseInput,
    label: localized.label,
    ...(localized.short ? { shortLabel: localized.short } : {}),
    help: localized.help,
    example: FIELD_EXAMPLE_GENERIC[locale][fieldExampleKind(input)],
    source: message(locale, "officialFieldSource"),
    ...(options ? {
      options: options.map((option) => ({
        ...option,
        label: OPTION_LABELS[locale][option.value] ?? option.label,
      })),
    } : {}),
  };
}

const DOMAIN_REPLACEMENTS: Record<Exclude<Locale, "it">, readonly (readonly [string, string])[]> = {
  en: [["a carico del dipendente", "employee"], ["dipendente", "employee"], ["a carico azienda", "employer"], ["azienda", "employer"], ["Contributi", "Contributions"], ["Contributo", "Contribution"], ["Assicurazione", "Insurance"], ["Disoccupazione", "Unemployment"], ["Formazione professionale", "Vocational training"], ["Previdenza", "Pension"], ["Pensione", "Pension"], ["Malattia", "Health insurance"], ["Imposta", "Tax"], ["Addizionale", "Surcharge"], ["Detrazione", "Tax credit"], ["Massimale", "Ceiling"], ["Base minima", "Minimum base"], ["Base di contribuzione", "Contribution base"], ["Retribuzione", "Pay"], ["Fondo", "Fund"], ["lorda", "gross"], ["netta", "net"]],
  de: [["a carico del dipendente", "Arbeitnehmer"], ["dipendente", "Arbeitnehmer"], ["a carico azienda", "Arbeitgeber"], ["azienda", "Arbeitgeber"], ["Contributi", "Beiträge"], ["Contributo", "Beitrag"], ["Assicurazione", "Versicherung"], ["Disoccupazione", "Arbeitslosigkeit"], ["Formazione professionale", "Berufsbildung"], ["Previdenza", "Altersvorsorge"], ["Pensione", "Rente"], ["Malattia", "Krankenversicherung"], ["Imposta", "Steuer"], ["Addizionale", "Zuschlag"], ["Detrazione", "Steuergutschrift"], ["Massimale", "Höchstgrenze"], ["Base minima", "Mindestbemessungsgrundlage"], ["Base di contribuzione", "Beitragsgrundlage"], ["Retribuzione", "Vergütung"], ["Fondo", "Fonds"], ["lorda", "brutto"], ["netta", "netto"]],
  fr: [["a carico del dipendente", "salariale"], ["dipendente", "salarié"], ["a carico azienda", "employeur"], ["azienda", "employeur"], ["Contributi", "Cotisations"], ["Contributo", "Cotisation"], ["Assicurazione", "Assurance"], ["Disoccupazione", "Chômage"], ["Formazione professionale", "Formation professionnelle"], ["Previdenza", "Retraite"], ["Pensione", "Retraite"], ["Malattia", "Maladie"], ["Imposta", "Impôt"], ["Addizionale", "Surtaxe"], ["Detrazione", "Crédit d’impôt"], ["Massimale", "Plafond"], ["Base minima", "Assiette minimale"], ["Base di contribuzione", "Assiette de cotisation"], ["Retribuzione", "Rémunération"], ["Fondo", "Fonds"], ["lorda", "brute"], ["netta", "nette"]],
  es: [["a carico del dipendente", "del trabajador"], ["dipendente", "trabajador"], ["a carico azienda", "empresarial"], ["azienda", "empresa"], ["Contributi", "Cotizaciones"], ["Contributo", "Cotización"], ["Assicurazione", "Seguro"], ["Disoccupazione", "Desempleo"], ["Formazione professionale", "Formación profesional"], ["Previdenza", "Previsión"], ["Pensione", "Pensión"], ["Malattia", "Enfermedad"], ["Imposta", "Impuesto"], ["Addizionale", "Recargo"], ["Detrazione", "Deducción"], ["Massimale", "Tope"], ["Base minima", "Base mínima"], ["Base di contribuzione", "Base de cotización"], ["Retribuzione", "Retribución"], ["Fondo", "Fondo"], ["lorda", "bruta"], ["netta", "neta"]],
};

export function localizeDomainText(locale: Locale, text: string): string {
  if (locale === "it") return text;
  return DOMAIN_REPLACEMENTS[locale].reduce(
    (translated, [from, to]) => translated.replaceAll(from, to),
    text,
  );
}

const COMMON_NOTE: Record<Exclude<Locale, "it">, string> = {
  en: "Full calendar year, one employer and employment income only.",
  de: "Volles Kalenderjahr, ein Arbeitgeber und ausschließlich Einkünfte aus Beschäftigung.",
  fr: "Année civile complète, un seul employeur et uniquement des revenus salariés.",
  es: "Año natural completo, un único empleador y solo rendimientos del trabajo.",
};

const COUNTRY_NOTE: Record<Exclude<Locale, "it">, Record<EUCountry, readonly string[]>> = {
  en: {
    IT: ["Family dependants, relief schemes and benefits are excluded.", "INAIL is company-specific; the displayed occupational-risk rate is indicative."],
    DE: ["Private health insurance above the JAEG and tax classes V/VI are excluded.", "Health-fund and accident-insurance rates remain company-specific."],
    ES: ["Foral territories and regional deductions are excluded.", "AEAT withholding drives payroll net; the annual IRPF estimate is shown separately."],
    FR: ["Employee mutuelle and prévoyance are included only when exact annual amounts are supplied; employer shares and collective-agreement benefits remain excluded.", "AT/MP and versement mobilité rates depend on the establishment."],
  },
  de: {
    IT: ["Familienlasten, Begünstigungen und Sachleistungen sind ausgeschlossen.", "INAIL ist unternehmensabhängig; der angezeigte Risikosatz ist ein Richtwert."],
    DE: ["Private Krankenversicherung oberhalb der JAEG sowie Steuerklassen V/VI sind ausgeschlossen.", "Krankenkassen- und Unfallversicherungssätze bleiben unternehmensabhängig."],
    ES: ["Foralgebiete und regionale Abzüge sind ausgeschlossen.", "Der AEAT-Einbehalt bestimmt das Abrechnungsnetto; die jährliche IRPF-Schätzung bleibt getrennt."],
    FR: ["Mutuelle und prévoyance werden nur mit exakten jährlichen Arbeitnehmerbeträgen einbezogen; Arbeitgeberanteile und tarifliche Leistungen bleiben ausgeschlossen.", "AT/MP und versement mobilité hängen von der Betriebsstätte ab."],
  },
  fr: {
    IT: ["Les charges de famille, régimes favorables et avantages sont exclus.", "L’INAIL dépend de l’entreprise ; le taux de risque affiché est indicatif."],
    DE: ["L’assurance maladie privée au-dessus de la JAEG et les classes V/VI sont exclues.", "Les taux de caisse maladie et d’assurance accident restent propres à l’entreprise."],
    ES: ["Les territoires foraux et déductions régionales sont exclus.", "La retenue AEAT détermine le net de paie ; l’estimation annuelle IRPF reste séparée."],
    FR: ["Mutuelle et prévoyance ne sont incluses qu’avec les montants salariaux annuels exacts ; les parts employeur et avantages conventionnels restent exclus.", "Les taux AT/MP et versement mobilité dépendent de l’établissement."],
  },
  es: {
    IT: ["Se excluyen cargas familiares, regímenes favorables y beneficios.", "El INAIL depende de la empresa; el tipo de riesgo mostrado es orientativo."],
    DE: ["Se excluyen el seguro médico privado por encima de la JAEG y las clases V/VI.", "Los tipos de caja médica y seguro de accidentes dependen de la empresa."],
    ES: ["Se excluyen los territorios forales y deducciones autonómicas.", "La retención AEAT determina el neto de nómina; la estimación anual de IRPF se mantiene separada."],
    FR: ["Mutuelle y prévoyance solo se incluyen con importes anuales exactos del trabajador; las cuotas empresariales y beneficios de convenio quedan excluidos.", "Los tipos AT/MP y versement mobilité dependen del centro."],
  },
};

export function localizeNotes(locale: Locale, country: EUCountry, original: readonly string[]): readonly string[] {
  return locale === "it" ? original : [COMMON_NOTE[locale], ...COUNTRY_NOTE[locale][country]];
}

function fieldHelpKind(input: InputDescriptor): string {
  if (input.field === "grossAnnual") return "gross";
  if (input.field === "region" || input.field === "municipality" || input.field === "location") return "geography";
  if (input.field === "payPeriods") return "periods";
  if (input.field === "companySize") return "headcount";
  if (input.field === "contractType") return "contract";
  if (input.field === "jobLevel") return "level";
  if (input.field.endsWith("children")) return "children";
  if (input.field === "age") return "age";
  if (input.field.includes("Withholding")) return "withholding";
  if (input.field.includes("RiskClass")) return "risk";
  if (input.field.endsWith("EmployeeAnnual")) return "amount";
  if (input.kind === "decimal") return "exact";
  return "profile";
}

function fieldExampleKind(input: InputDescriptor): "gross" | "periods" | "rate" | "amount" | "selection" {
  if (input.field === "grossAnnual") return "gross";
  if (input.field === "payPeriods") return "periods";
  if (input.field.endsWith("EmployeeAnnual")) return "amount";
  if (input.kind === "decimal" || input.field.includes("RiskClass")) return "rate";
  return "selection";
}
