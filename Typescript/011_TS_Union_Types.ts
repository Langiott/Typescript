/**
 * 011 - Union Types: A | B e narrowing di base (Fundamentals)
 *
 * Un union type descrive un valore che puo' essere di UNO tra piu' tipi:
 * `string | number`, `Ruolo`, ecc. Il "narrowing" e' la tecnica con cui TS
 * restringe l'union a un tipo piu' preciso in base a controlli runtime
 * (typeof, in, ===, custom type guard). Esempi dal dominio ERP Polyuretech.
 */

// ============================================================
// 1. Union type di base: A | B
// ============================================================

// Un ID puo' arrivare come numero (DB) o come stringa (querystring URL).
type IdDipendente = number | string;

let id1: IdDipendente = 42; // ok: number
let id2: IdDipendente = "42"; // ok: string
// ERRORE TS: Type 'boolean' is not assignable to type 'IdDipendente'.
// let id3: IdDipendente = true;

// Puoi assegnare un membro dell'union alla variabile union...
const idA: IdDipendente = 7;
// ...ma NON il contrario senza narrowing:
// ERRORE TS: Type 'string | number' is not assignable to type 'number'.
// const soloNumero: number = idA as IdDipendente;
void id1;
void id2;
void idA;

// ============================================================
// 2. Union di stringhe letterali (literal union) = enum "leggero"
// ============================================================

// Ruoli utente ERP: solo questi 4 valori sono ammessi.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

const ruoloUtente: Ruolo = "Operatore"; // ok
// ERRORE TS: Type '"Ospite"' is not assignable to type 'Ruolo'.
// const ruoloErrato: Ruolo = "Ospite";

// Acronimo turno di produzione.
type AcronimoTurno = "P4" | "P2" | "STD";
const turnoCorrente: AcronimoTurno = "P4"; // tipo: "P4"
void ruoloUtente;
void turnoCorrente;

// ============================================================
// 3. Cosa puoi fare SENZA narrowing
// ============================================================

// Su un union sono disponibili SOLO i membri comuni a tutti i tipi.
function lunghezzaCodice(v: string | number): number {
  // .toString() esiste sia su string sia su number -> ok
  return v.toString().length; // tipo: number
}
// ERRORE TS: Property 'toUpperCase' does not exist on type 'string | number'.
// function urla(v: string | number) { return v.toUpperCase(); }
void lunghezzaCodice;

// ============================================================
// 4. Narrowing con typeof (il piu' comune)
// ============================================================

// Normalizza un IdDipendente a number, gestendo entrambi i casi.
function normalizzaId(id: IdDipendente): number {
  if (typeof id === "string") {
    // qui id e' ristretto a: string
    return Number.parseInt(id, 10);
  }
  // qui id e' ristretto a: number
  return id;
}
const nId = normalizzaId("108"); // => 108
void nId;

// typeof funziona con: "string" | "number" | "boolean" | "object" | "function" | "undefined" | "bigint" | "symbol"
function descriviValore(v: string | number | boolean): string {
  if (typeof v === "boolean") return v ? "vero" : "falso"; // v: boolean
  if (typeof v === "number") return `numero ${v.toFixed(0)}`; // v: number
  return `testo "${v.toUpperCase()}"`; // v: string
}
const d1 = descriviValore(true); // => "vero"
const d2 = descriviValore("up"); // => 'testo "UP"'
void d1;
void d2;

// ============================================================
// 5. Narrowing con controllo di uguaglianza (===) su literal union
// ============================================================

// I minuti previsti dipendono dall'acronimo del turno.
function minutiPrevisti(turno: AcronimoTurno): number {
  if (turno === "P4") return 480; // turno: "P4" (con pausa pranzo)
  if (turno === "P2") return 300; // turno: "P2" (senza pausa)
  return 450; // turno: "STD"
}
const mP4 = minutiPrevisti("P4"); // => 480
void mP4;

// ============================================================
// 6. Narrowing con truthiness e null/undefined (strictNullChecks)
// ============================================================

// In strict mode `string | null` NON e' usabile come string finche' non escludi il null.
type EmailPersonale = string | null;

function dominioEmail(email: EmailPersonale): string {
  if (email === null) return "(nessuna)"; // email: null
  // qui email: string
  const parti = email.split("@");
  return parti[1] ?? "(dominio sconosciuto)";
}
const dom1 = dominioEmail("mario@polyuretech.com"); // => "polyuretech.com"
const dom2 = dominioEmail(null); // => "(nessuna)"
void dom1;
void dom2;

// Guardia di truthiness: esclude "" e null insieme.
function orarioOppureTrattino(v: string | null): string {
  if (!v) return "-"; // v e' "" oppure null
  return v; // v: string non vuota
}
const or1 = orarioOppureTrattino("08:00"); // => "08:00"
const or2 = orarioOppureTrattino(null); // => "-"
void or1;
void or2;

// ============================================================
// 7. Narrowing con l'operatore `in` (presenza di proprieta')
// ============================================================

// Due forme di reparto: una "minimale", una "completa".
type RepartoMinimo = { sigla: string };
type RepartoCompleto = { sigla: string; label: string; attivo: boolean };

function etichettaReparto(r: RepartoMinimo | RepartoCompleto): string {
  if ("label" in r) {
    // r: RepartoCompleto
    return `${r.label} (${r.attivo ? "attivo" : "disattivo"})`;
  }
  // r: RepartoMinimo
  return r.sigla.toUpperCase();
}
const rep1 = etichettaReparto({ sigla: "up" }); // => "UP"
const rep2 = etichettaReparto({ sigla: "co", label: "Colatura", attivo: true }); // => "Colatura (attivo)"
void rep1;
void rep2;

// ============================================================
// 8. Custom type guard (funzione `x is T`)
// ============================================================

// Un badge valido ha formato SIGLA-NNN, es. "UP-001".
function isBadgeValido(v: string | null): v is string {
  return typeof v === "string" && /^[A-Z]{2,4}-\d{3}$/.test(v);
}

function stampaBadge(v: string | null): string {
  if (isBadgeValido(v)) {
    // v: string (garantito valido)
    return `Badge: ${v}`;
  }
  return "Badge assente o non valido";
}
const bg1 = stampaBadge("UP-001"); // => "Badge: UP-001"
const bg2 = stampaBadge("xx"); // => "Badge assente o non valido"
const bg3 = stampaBadge(null); // => "Badge assente o non valido"
void bg1;
void bg2;
void bg3;

// ============================================================
// 9. Union di oggetti + accesso sicuro alle proprieta'
// ============================================================

type StatoRichiesta = "In attesa" | "Approvato" | "Rifiutato";

// Restituisce un colore/etichetta per lo stato: ogni ramo restringe lo stato.
function coloreStato(stato: StatoRichiesta): string {
  switch (stato) {
    case "In attesa":
      return "grigio"; // stato: "In attesa"
    case "Approvato":
      return "verde"; // stato: "Approvato"
    case "Rifiutato":
      return "rosso"; // stato: "Rifiutato"
  }
}
const col1 = coloreStato("Approvato"); // => "verde"
void col1;

// ============================================================
// 10. Exhaustiveness check con `never`
// ============================================================

// Se un domani aggiungi un nuovo ruolo, TS ti segnalera' il ramo mancante.
function homeDelRuolo(ruolo: Ruolo): string {
  switch (ruolo) {
    case "SuperAdmin":
    case "Admin":
      return "/dashboard";
    case "Operatore":
      return "/timbrature";
    case "QrDisplay":
      return "/qr";
    default: {
      // Se tutti i casi sono coperti, `ruolo` qui e' di tipo never.
      const _mai: never = ruolo;
      return _mai;
    }
  }
}
const home1 = homeDelRuolo("Operatore"); // => "/timbrature"
void home1;

// ============================================================
// 11. Union con array e valori misti (pattern reale ERP)
// ============================================================

// oreLavorate puo' essere number (calcolate) oppure null (giorno non chiuso).
function formattaOre(oreLavorate: number | null): string {
  return oreLavorate === null ? "n/d" : `${oreLavorate.toFixed(2)} h`;
}
const fo1 = formattaOre(7.5); // => "7.50 h"
const fo2 = formattaOre(null); // => "n/d"
void fo1;
void fo2;

// Union in un array: lista di id eterogenei da sorgenti diverse.
const idsGrezzi: (number | string)[] = [1, "2", 3, "004"];
const idsNumerici: number[] = idsGrezzi.map(normalizzaId); // => [1, 2, 3, 4]
void idsNumerici;

// ============================================================
// 12. Narrowing con Array.isArray
// ============================================================

// Un filtro puo' arrivare come singola sigla o come lista di sigle.
type FiltroSigla = string | string[];

function contaSigle(f: FiltroSigla): number {
  if (Array.isArray(f)) return f.length; // f: string[]
  return f.length === 0 ? 0 : 1; // f: string
}
const cs1 = contaSigle("UP"); // => 1
const cs2 = contaSigle(["UP", "CO", "UI"]); // => 3
void cs1;
void cs2;

// ============================================================
// 13. Esempio browser (DOM): narrowing di Element
// ============================================================

// Esempio browser: non viene eseguito qui, ma compila con lib DOM.
function esempioDomNonChiamato(): void {
  const el: HTMLElement | null = document.getElementById("badge");
  if (el === null) return; // el: null escluso
  // el: HTMLElement
  if (el instanceof HTMLInputElement) {
    // narrowing con instanceof -> el: HTMLInputElement
    el.value = "UP-001";
  } else {
    el.textContent = "UP-001";
  }
}
void esempioDomNonChiamato;

// ============================================================
// 14. Riuso: normalizzare orario "HH:MM" da input incerto
// ============================================================

// value puo' essere string, number (minuti) o null. Union + narrowing.
function toOrarioHHMM(value: string | number | null): string {
  if (value === null) return "-"; // value: null
  if (typeof value === "number") {
    // value: number (minuti dopo la mezzanotte)
    const h = String(Math.floor(value / 60)).padStart(2, "0");
    const m = String(value % 60).padStart(2, "0");
    return `${h}:${m}`;
  }
  // value: string
  return /^\d{2}:\d{2}$/.test(value) ? value : "-";
}
const t1 = toOrarioHHMM("08:00"); // => "08:00"
const t2 = toOrarioHHMM(490); // => "08:10"
const t3 = toOrarioHHMM(null); // => "-"
const t4 = toOrarioHHMM("orario"); // => "-"
void t1;
void t2;
void t3;
void t4;

// Esporta alcuni simboli DEFINITI IN QUESTO FILE (esempio moduli autonomo).
export { normalizzaId, minutiPrevisti, isBadgeValido, coloreStato };
export type { Ruolo, AcronimoTurno, StatoRichiesta, IdDipendente };

/*
============================================================
RIEPILOGO COMANDI / CONCETTI
============================================================
- Union type:            A | B  -> valore di UNO tra i tipi.
- Literal union:         "P4" | "P2" | "STD" (enum leggero, autocompletamento).
- Senza narrowing:       accessibili SOLO i membri comuni a tutti i tipi.
- typeof narrowing:      "string" | "number" | "boolean" | "object" | "function" | "undefined" | "bigint" | "symbol".
- Uguaglianza (===):     restringe le literal union nei rami if/switch.
- strictNullChecks:      escludere null/undefined prima di usare il valore (=== null, ?? , !v).
- Operatore `in`:        "prop" in obj -> distingue forme di oggetto.
- instanceof:            narrowing su classi/DOM (HTMLInputElement, ...).
- Array.isArray:         distingue T da T[].
- Custom type guard:     function isX(v): v is X { ... } -> narrowing riusabile.
- Exhaustiveness:        default -> const _: never = x; segnala casi mancanti.
- Compila con:           tsc --noEmit (strict:true, target ES2022, lib ES2022+DOM).
*/
