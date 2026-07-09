/**
 * 013 - Literal Types in TypeScript (Fundamentals)
 * ------------------------------------------------
 * I "literal types" permettono di usare un valore SPECIFICO come tipo:
 * non "una string qualsiasi" ma esattamente "P4", non "un number" ma esattamente 4.
 * Combinati in una union (es. "P4" | "P2" | "STD") danno insiemi chiusi e sicuri,
 * ottimi per ruoli, stati, turni e acronimi del dominio Polyuretech.
 * Vediamo string literal, number/boolean literal, union, narrowing, const assertion.
 */

// =============================================================
// 1) STRING LITERAL TYPE: un solo valore ammesso
// =============================================================

// Il tipo di 'turnoFisso' non e' "string" ma esattamente il letterale "P4".
let turnoFisso: "P4";
turnoFisso = "P4"; // OK
// turnoFisso = "P2"; // ERRORE TS: Type '"P2"' is not assignable to type '"P4"'.

// Una const inferisce direttamente il literal type (piu' stretto di 'string').
const acronimoP4 = "P4"; // tipo inferito: "P4"  (non string!)
let acronimoLibero = "P4"; // tipo inferito: string (let allarga il tipo)

// =============================================================
// 2) UNION DI STRING LITERAL: insieme chiuso di valori
// =============================================================

// I ruoli utente reali dell'ERP: solo questi 4 valori sono ammessi.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

const ruoloCorrente: Ruolo = "Operatore"; // OK
// const ruoloErrato: Ruolo = "Ospite";   // ERRORE TS: "Ospite" non e' assegnabile a Ruolo.

// Gli acronimi dei turni di produzione.
type AcronimoTurno = "P4" | "P2" | "STD";

// Gli stati di una richiesta permesso (attenzione agli spazi e maiuscole!).
type StatoRichiesta = "In attesa" | "Approvato" | "Rifiutato";

const statoDemo: StatoRichiesta = "In attesa"; // OK
// const statoKo: StatoRichiesta = "in attesa"; // ERRORE TS: case-sensitive, minuscola non ammessa.

// =============================================================
// 3) NUMBER e BOOLEAN LITERAL
// =============================================================

// Number literal: quante timbrature ha un turno (4 = con pausa pranzo, 2 = senza).
type NumeroTimbrature = 2 | 4;
const timbratureP4: NumeroTimbrature = 4; // OK
// const timbratureX: NumeroTimbrature = 3; // ERRORE TS: 3 non e' 2 | 4.

// Boolean literal: tipo che ammette solo 'true'.
type SempreVero = true;
const attivo: SempreVero = true; // OK
// const attivo2: SempreVero = false; // ERRORE TS: false non assegnabile a true.

// Union mista di letterali (string + number) e' lecita.
type ChiaveGiorno = "Lun" | "Mar" | "Mer" | 1 | 2 | 3;
const g1: ChiaveGiorno = "Lun"; // OK
const g2: ChiaveGiorno = 2; // OK

// =============================================================
// 4) LITERAL TYPES NELLE FUNZIONI (parametri e ritorno)
// =============================================================

// Il parametro accetta SOLO gli acronimi validi -> autocompletamento e sicurezza.
function minutiPrevisti(acronimo: AcronimoTurno): number {
  switch (acronimo) {
    case "P4":
      return 8 * 60; // 480 minuti
    case "P2":
      return 6 * 60; // 360 minuti
    case "STD":
      return 7 * 60 + 30; // 450 minuti
  }
}
const minP4 = minutiPrevisti("P4"); // => 480
// minutiPrevisti("P9"); // ERRORE TS: "P9" non e' un AcronimoTurno.

// Il tipo di ritorno e' una union di letterali: chi chiama sa i valori possibili.
function classificaOre(ore: number): "sotto" | "pieno" | "straordinario" {
  if (ore < 8) return "sotto";
  if (ore === 8) return "pieno";
  return "straordinario";
}
const esitoOre = classificaOre(9); // tipo: "sotto" | "pieno" | "straordinario"

// =============================================================
// 5) NARROWING su union di letterali (type guard automatico)
// =============================================================

// Confrontando con un letterale, TS restringe (narrowing) il tipo nel ramo.
function coloreStato(stato: StatoRichiesta): string {
  if (stato === "Approvato") {
    // qui 'stato' e' ristretto a "Approvato"
    return "verde";
  }
  if (stato === "Rifiutato") {
    return "rosso";
  }
  // qui resta solo "In attesa"
  return "giallo";
}
const colore = coloreStato("Rifiutato"); // => "rosso"

// =============================================================
// 6) EXHAUSTIVENESS CHECK con 'never'
// =============================================================

// Se aggiungi un nuovo ruolo alla union, il default forza un errore a compile-time:
// utile per non dimenticare mai un caso.
function descriviRuolo(r: Ruolo): string {
  switch (r) {
    case "SuperAdmin":
      return "Accesso totale";
    case "Admin":
      return "Gestione anagrafiche";
    case "Operatore":
      return "Timbrature e reparto";
    case "QrDisplay":
      return "Solo visualizzazione QR";
    default: {
      // Se 'r' non e' mai 'never' qui, significa che un caso manca.
      const esaustivo: never = r;
      return esaustivo;
    }
  }
}
const descr = descriviRuolo("Admin"); // => "Gestione anagrafiche"

// =============================================================
// 7) LITERAL WIDENING: perche' 'let' perde il literal type
// =============================================================

// Con const il tipo resta stretto; con let TS lo "allarga" a string.
const acr1 = "P2"; // tipo: "P2"
let acr2 = "P2"; // tipo: string

function usaTurno(_a: AcronimoTurno): void {}
usaTurno(acr1); // OK: "P2" e' compatibile con AcronimoTurno
// usaTurno(acr2); // ERRORE TS: string non e' assegnabile a AcronimoTurno.

// Annotazione esplicita per mantenere il tipo stretto anche con let:
let acr3: AcronimoTurno = "STD";
usaTurno(acr3); // OK

// =============================================================
// 8) CONST ASSERTION ('as const')
// =============================================================

// Senza 'as const' l'oggetto ha proprieta' allargate (string, number...).
const turnoLibero = { acronimo: "P4", ingresso: "08:00" };
// turnoLibero.acronimo -> string

// Con 'as const' tutto diventa readonly e literal.
const turnoBloccato = { acronimo: "P4", ingresso: "08:00" } as const;
// turnoBloccato.acronimo -> "P4" (literal, readonly)
// turnoBloccato.acronimo = "P2"; // ERRORE TS: Cannot assign, e' readonly.

// 'as const' su array crea una tupla readonly di letterali.
const acronimiValidi = ["P4", "P2", "STD"] as const;
// tipo: readonly ["P4", "P2", "STD"]
type AcronimoDaArray = (typeof acronimiValidi)[number]; // "P4" | "P2" | "STD"

const primoAcr: AcronimoDaArray = "P4"; // OK

// =============================================================
// 9) TEMPLATE LITERAL TYPES (union combinate in stringhe)
// =============================================================

// Il badge dipendente ha formato SIGLA-NNN, es. "UP-001".
// Con i template literal types possiamo modellare pattern di stringhe.
type SiglaReparto = "UP" | "UI" | "CO";
type CodiceBadge = `${SiglaReparto}-${number}`;

const badge1: CodiceBadge = "UP-001"; // OK
const badge2: CodiceBadge = "CO-3"; // OK (il number literal accetta cifre)
// const badgeKo: CodiceBadge = "XX-001"; // ERRORE TS: "XX" non e' una SiglaReparto.

// Template literal per costruire chiavi/etichette.
type EtichettaTurno = `Turno ${AcronimoTurno}`; // "Turno P4" | "Turno P2" | "Turno STD"
const et: EtichettaTurno = "Turno P4"; // OK

// =============================================================
// 10) LITERAL TYPES negli oggetti e discriminated union
// =============================================================

// Una proprieta' literal fa da "tag" discriminante tra varianti diverse.
type TurnoP4 = {
  acronimo: "P4";
  ingresso: string;
  uscitaPranzo: string;
  rientroPranzo: string;
  uscita: string;
};
type TurnoP2 = {
  acronimo: "P2";
  ingresso: string;
  uscita: string;
};
type TurnoUnion = TurnoP4 | TurnoP2;

// Il campo literal 'acronimo' permette a TS di sapere quale forma usare.
function haPausaPranzo(t: TurnoUnion): boolean {
  if (t.acronimo === "P4") {
    // qui t e' TurnoP4: uscitaPranzo esiste
    return t.uscitaPranzo.length > 0;
  }
  // qui t e' TurnoP2: niente pausa
  return false;
}
const turnoEsempio: TurnoUnion = {
  acronimo: "P4",
  ingresso: "08:00",
  uscitaPranzo: "12:00",
  rientroPranzo: "13:00",
  uscita: "17:00",
};
const pausa = haPausaPranzo(turnoEsempio); // => true

// =============================================================
// 11) LITERAL come valori di default e mapping
// =============================================================

// Mappa da stato (literal) a codice colore: la 'key' e' vincolata dalla union.
const coloriStato: Record<StatoRichiesta, string> = {
  "In attesa": "#facc15",
  Approvato: "#22c55e",
  Rifiutato: "#ef4444",
};
const c = coloriStato["Approvato"]; // => "#22c55e"
// Se dimentichi una chiave della union, Record<StatoRichiesta, string> da' errore.

// =============================================================
// 12) Esempio browser (DOM) - non eseguito, solo illustrativo
// =============================================================

// Esempio browser: molte API DOM usano literal types nei parametri.
// Racchiuso in funzione NON chiamata, cosi' non serve un vero 'document' a runtime.
function esempioBrowserLiteral(): void {
  // Il secondo parametro di scrollTo/insertAdjacentHTML e' una union di letterali.
  const el = document.getElementById("app");
  el?.insertAdjacentHTML("beforeend", "<span>timbratura</span>");
  // "beforeend" e' un literal type: "beforebegin"|"afterbegin"|"beforeend"|"afterend".
  // el?.insertAdjacentHTML("dentro", ""); // ERRORE TS: "dentro" non e' una posizione valida.

  const stato: DocumentReadyState = document.readyState; // "loading"|"interactive"|"complete"
  void stato;
}
void esempioBrowserLiteral;

// =============================================================
// 13) Combinare literal + validazione runtime (type guard)
// =============================================================

// A runtime i dati arrivano come 'string' generica (es. da fetch): serve un guard
// che restringa 'string' verso la union di letterali.
function isAcronimoTurno(v: string): v is AcronimoTurno {
  return v === "P4" || v === "P2" || v === "STD";
}
function parseAcronimo(input: string): AcronimoTurno {
  if (isAcronimoTurno(input)) {
    return input; // qui input e' AcronimoTurno
  }
  return "STD"; // fallback sicuro
}
const acrParsed = parseAcronimo("P2"); // => "P2"

// Esempio export (simboli definiti in QUESTO file, nessun riferimento esterno).
export type { Ruolo, AcronimoTurno, StatoRichiesta, CodiceBadge };
export { minutiPrevisti, parseAcronimo };

/**
 * RIEPILOGO COMANDI / CONCETTI
 * ----------------------------
 * - String literal:      let x: "P4"  -> ammette solo il valore "P4".
 * - Union di letterali:  type Ruolo = "Admin" | "Operatore" | ...  (insieme chiuso).
 * - Number/boolean literal: 2 | 4 ; true  come tipi.
 * - const vs let:        const inferisce il literal; let allarga a string (widening).
 * - Narrowing:           if (x === "Approvato") restringe il tipo nel ramo.
 * - Exhaustiveness:      const n: never = x  nel default per coprire tutti i casi.
 * - as const:            rende readonly + literal (oggetti, array/tuple).
 * - (typeof arr)[number]: deriva una union di letterali da un array 'as const'.
 * - Template literal:    type CodiceBadge = `${Sigla}-${number}`  (es. "UP-001").
 * - Discriminated union: campo literal (tag) per distinguere varianti (P4 vs P2).
 * - Record<Union, T>:    mappa con chiavi vincolate alla union di letterali.
 * - Type guard:          v is AcronimoTurno per passare da string a literal a runtime.
 * - Compila con: tsc --noEmit --strict --target ES2022 --lib ES2022,DOM
 */
