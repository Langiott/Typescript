/**
 * 001 - Introduzione a TypeScript (sezione: Fundamentals)
 * Cos'e' TypeScript, perche' usarlo e differenze principali tra JavaScript e TypeScript.
 * TypeScript e' un "superset" tipizzato di JavaScript: aggiunge un sistema di type
 * statici che il compilatore (tsc) controlla PRIMA di eseguire il codice, poi produce
 * JavaScript normale. Esempi tratti dal dominio ERP Polyuretech (Dipendente, Timbratura,
 * badge UP-001, turni P4/P2, orari "HH:MM"). File autonomo: compila con tsc --noEmit strict.
 */

/* =========================================================================
 * 1. COS'E' TYPESCRIPT
 * TS = JavaScript + type. Ogni file .js valido e' (quasi sempre) anche TS valido.
 * Il browser/Node NON eseguono TS: tsc "transpila" .ts -> .js.
 * ========================================================================= */

// In JS puro una variabile puo' cambiare tipo liberamente (fonte di bug):
let valoreJS = "UP-001"; // in JS potresti poi fare valoreJS = 42 senza errori

// In TS il tipo viene INFERITO al primo assegnamento e poi "bloccato":
let codiceBadge = "UP-001"; // tipo inferito: string
codiceBadge = "UI-002"; // OK, ancora string
// ERRORE TS: codiceBadge = 42; -> Type 'number' is not assignable to type 'string'.

/* =========================================================================
 * 2. ANNOTAZIONI DI TIPO ESPLICITE vs INFERENZA
 * Puoi annotare col ": Tipo", ma spesso l'inferenza basta.
 * ========================================================================= */

// Annotazione esplicita:
const nomeAzienda: string = "Polyuretech";
const numeroDipendenti: number = 42; // => 42
const isAttivo: boolean = true;

// Inferenza (consigliata quando ovvia): niente annotazione, TS deduce il tipo.
const siglaReparto = "UP"; // tipo: string
const oreLavorate = 7.5; // tipo: number

// Tipo esplicito utile quando il valore iniziale non basta a dedurre l'intenzione:
let uscitaPranzo: string | null = null; // tipo: string | null (naive-UTC "12:00" oppure null)
uscitaPranzo = "12:00"; // OK

/* =========================================================================
 * 3. PERCHE' TYPESCRIPT: errori a compile-time invece che a runtime
 * ========================================================================= */

// Funzione che converte "HH:MM" in minuti dall'inizio giornata.
function orarioToMinuti(orario: string): number {
  const [ore, minuti] = orario.split(":").map(Number);
  return ore * 60 + minuti;
}
const min1 = orarioToMinuti("08:30"); // => 510
// ERRORE TS: orarioToMinuti(830); -> Argument of type 'number' is not assignable to 'string'.
// In JS puro questa chiamata sbagliata passerebbe e romperebbe a runtime.

/* =========================================================================
 * 4. JS vs TS: lo stesso codice, ma con "rete di sicurezza"
 * Esempio classico: accesso a proprieta' inesistente.
 * ========================================================================= */

type Dipendente = {
  id: number;
  codiceBadge: string; // "UP-001"
  nome: string;
  cognome: string;
  archiviato: boolean;
};

const dip1: Dipendente = {
  id: 1,
  codiceBadge: "UP-001",
  nome: "Mario",
  cognome: "Rossi",
  archiviato: false,
};

console.log(dip1.codiceBadge); // => "UP-001"
// ERRORE TS: console.log(dip1.telefono); -> Property 'telefono' does not exist on type 'Dipendente'.
// In JS puro dip1.telefono darebbe silenziosamente undefined.

/* =========================================================================
 * 5. STRICT MODE e null-safety
 * Con "strict": true, null e undefined NON sono assegnabili ovunque:
 * vanno gestiti in modo esplicito (narrowing).
 * ========================================================================= */

type Timbratura = {
  id: number;
  dipendenteId: number;
  ingresso: string | null; // "08:00" naive-UTC oppure null se non timbrato
  uscita: string | null;
};

const timb1: Timbratura = { id: 10, dipendenteId: 1, ingresso: "08:00", uscita: null };

function descriviIngresso(t: Timbratura): string {
  // ERRORE TS: return t.ingresso.slice(0, 5); -> 't.ingresso' is possibly 'null'.
  // Va gestito il caso null (narrowing):
  if (t.ingresso === null) return "Non timbrato";
  return t.ingresso.slice(0, 5); // qui il tipo e' ristretto a string
}
const desc1 = descriviIngresso(timb1); // => "08:00"

/* =========================================================================
 * 6. TYPE vs INTERFACE (assaggio - approfondito in altri capitoli)
 * Entrambi descrivono la forma di un oggetto. "interface" e' estendibile,
 * "type" e' piu' flessibile (union, tuple, primitivi).
 * ========================================================================= */

interface Reparto {
  id: number;
  nome: string; // valore enum TipologiaDipendente, es. "Colatura"
  sigla: string; // 2-4 lettere -> badge
  attivo: boolean;
}

const repFinitura: Reparto = { id: 3, nome: "Finitura_Imballaggio", sigla: "FI", attivo: true };

// Con "type" possiamo esprimere union di stringhe letterali (impossibile con solo interface):
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
const ruoloCorrente: Ruolo = "Operatore"; // OK
// ERRORE TS: const r: Ruolo = "Ospite"; -> Type '"Ospite"' is not assignable to type 'Ruolo'.

/* =========================================================================
 * 7. UNION TYPES e LITERAL TYPES (fondamentali fin da subito)
 * Modellano insiemi chiusi di valori: piu' sicuri di "string" generico.
 * ========================================================================= */

type StatoRichiesta = "In attesa" | "Approvato" | "Rifiutato";
type Acronimo = "P4" | "P2" | "STD";

const statoFerie: StatoRichiesta = "In attesa";
const turnoOggi: Acronimo = "P4"; // P4 = produzione 4 timbrature (con pausa pranzo)

// Funzione che dipende dall'insieme chiuso di valori:
function coloreStato(s: StatoRichiesta): string {
  switch (s) {
    case "In attesa":
      return "giallo";
    case "Approvato":
      return "verde";
    case "Rifiutato":
      return "rosso";
  }
}
const c1 = coloreStato(statoFerie); // => "giallo"

/* =========================================================================
 * 8. TIPO any vs unknown
 * "any" disattiva i controlli (da evitare). "unknown" e' sicuro: obbliga a
 * fare narrowing prima di usarlo.
 * ========================================================================= */

let qualsiasi: any = "UP-001";
qualsiasi = 42; // permesso (nessun controllo) -> pericoloso

function lunghezzaBadge(v: unknown): number {
  // ERRORE TS: return v.length; -> 'v' is of type 'unknown'.
  if (typeof v === "string") return v.length; // narrowing sicuro
  return 0;
}
const l1 = lunghezzaBadge("UP-001"); // => 6

/* =========================================================================
 * 9. FUNZIONI: parametri opzionali, default e tipo di ritorno
 * ========================================================================= */

// Parametro opzionale (?) e valore di default:
function generaBadge(sigla: string, progressivo: number, uppercase = true): string {
  const num = String(progressivo).padStart(3, "0"); // 1 -> "001"
  const s = uppercase ? sigla.toUpperCase() : sigla;
  return `${s}-${num}`;
}
const badgeGenerato = generaBadge("up", 1); // => "UP-001"

// Ritorno "void" quando non si restituisce nulla:
function log(messaggio: string): void {
  console.log(`[ERP] ${messaggio}`);
}

/* =========================================================================
 * 10. ARRAY e OGGETTI TIPIZZATI
 * ========================================================================= */

const badges: string[] = ["UP-001", "UI-001", "CO-003"]; // array di string
const idsDipendenti: Array<number> = [1, 2, 3]; // sintassi generica equivalente

// Oggetto "dizionario" con Record:
const contatoriPerReparto: Record<string, number> = {
  Colatura: 5,
  Collaudo: 2,
  Tornitura_metalli: 4,
};
const nColatura = contatoriPerReparto["Colatura"]; // tipo: number => 5

/* =========================================================================
 * 11. VALIDAZIONE TYPE-SAFE (pattern reale ERP: HH:MM -> minuti)
 * Ritorna number oppure null se il formato non e' valido.
 * ========================================================================= */

function timeStringToMinutes(value: string): number | null {
  const text = value.trim();
  if (!/^\d{2}:\d{2}$/.test(text)) return null; // regex reale orario HH:MM
  const [h, m] = text.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}
const mOk = timeStringToMinutes("13:00"); // => 780
const mBad = timeStringToMinutes("99:99"); // => null

/* =========================================================================
 * 12. ESEMPIO BROWSER (DOM): mai chiamato, solo illustrativo.
 * Il codice DOM compila (lib "DOM" attiva) ma non viene eseguito qui.
 * ========================================================================= */

// Esempio browser
function mostraBadgeInPagina(badge: string): void {
  const el = document.getElementById("badge"); // tipo: HTMLElement | null
  if (el === null) return; // narrowing obbligatorio con strict
  el.textContent = badge;
}
// (nessuna chiamata a mostraBadgeInPagina: evitiamo dipendenze runtime)

/* =========================================================================
 * 13. MODULI (import/export nello STESSO file)
 * TS supporta i moduli ES. Qui esportiamo simboli definiti in questo file.
 * ========================================================================= */

export type { Dipendente, Timbratura, Reparto, Ruolo, StatoRichiesta };
export { generaBadge, timeStringToMinutes };

/* =========================================================================
 * 14. NOTA SUI DECORATOR (TS 5.x, stage-3 nativi, experimentalDecorators:false)
 * I decorator moderni NON richiedono experimentalDecorators. Esempio COMMENTATO
 * per non introdurre effetti collaterali; concettualmente:
 *
 *   function logMetodo<T, A extends unknown[], R>(
 *     metodo: (this: T, ...args: A) => R,
 *     ctx: ClassMethodDecoratorContext
 *   ) {
 *     return function (this: T, ...args: A): R {
 *       console.log(`Chiamata a ${String(ctx.name)}`);
 *       return metodo.apply(this, args);
 *     };
 *   }
 *
 *   class ServizioTimbrature {
 *     @logMetodo
 *     registra(badge: string): string { return `Timbrato ${badge}`; }
 *   }
 * ========================================================================= */

/* =========================================================================
 * 15. TIPI Node NON disponibili di default: dichiararli localmente se servono.
 * ========================================================================= */

declare const process: { env: Record<string, string | undefined> };
const ambiente = process.env["NODE_ENV"] ?? "development"; // tipo: string

/* =========================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * -------------------------------------------------------------------------
 * - TypeScript = JavaScript + type statici; il compilatore e' "tsc".
 * - Transpilazione:            tsc            (genera .js)
 * - Solo controllo tipi:       tsc --noEmit
 * - Config progetto:           tsconfig.json  ("strict": true consigliato)
 * - Inizializza config:        tsc --init
 * - Inferenza: TS deduce il tipo dal valore iniziale (non sempre serve annotare).
 * - Annotazione esplicita:     let x: string
 * - Union / literal types:     "P4" | "P2" | "STD" ; StatoRichiesta.
 * - null-safety (strict):      string | null -> serve narrowing (if !== null).
 * - any = nessun controllo (evita); unknown = sicuro (richiede narrowing).
 * - type vs interface: entrambi descrivono oggetti; type fa anche union/tuple.
 * - Array: T[] oppure Array<T>; dizionari: Record<K, V>.
 * - Funzioni: parametri opzionali (?), default (= valore), ritorno void.
 * - Moduli ES: export/import (ogni file autonomo).
 * - Decorator moderni: stage-3, experimentalDecorators:false.
 * - Vantaggio chiave: errori catturati a COMPILE-TIME, non a runtime.
 * ========================================================================= */
