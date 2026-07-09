/**
 * 004 - Tipi base di TypeScript: string, number, boolean, bigint, symbol.
 * Sezione: Fundamentals.
 * In questa lezione vediamo i tipi primitivi del linguaggio, come TypeScript li
 * inferisce automaticamente, come annotarli esplicitamente e le insidie piu comuni
 * (numeri interi grandi con bigint, symbol come chiavi uniche, string template).
 * Tutti gli esempi usano il dominio ERP Polyuretech (badge UP-001, turni P4/P2, orari HH:MM).
 */

// =============================================================================
// 1) STRING
// =============================================================================

// Annotazione esplicita di una string.
const codiceBadge: string = "UP-001"; // tipo: string

// Inferenza: TypeScript capisce da solo che e una string, l'annotazione e superflua.
const nomeReparto = "Colatura"; // tipo inferito: string

// Template literal string: interpolazione con backtick.
const nomeDip = "Mario";
const cognomeDip = "Rossi";
const etichettaDip = `${nomeDip} ${cognomeDip} (${codiceBadge})`; // => "Mario Rossi (UP-001)"

// Metodi utili sulle string (tutti tipizzati).
const siglaReparto = codiceBadge.slice(0, 2); // => "UP", tipo: string
const badgeUpper = codiceBadge.toUpperCase(); // => "UP-001"
const lunghezzaBadge = codiceBadge.length; // => 6, tipo: number

// Un literal type: NON e "string" generica, ma esattamente il valore "P4".
const turnoAcronimo: "P4" | "P2" | "STD" = "P4"; // tipo: "P4" | "P2" | "STD"

// ERRORE TS: "P9" non appartiene all'union dei literal ammessi.
// const turnoErrato: "P4" | "P2" | "STD" = "P9";

// Padding tipico dei progressivi badge (SIGLA-NNN).
const progressivo = String(1).padStart(3, "0"); // => "001"
const nuovoBadge = `UP-${progressivo}`; // => "UP-001"

// =============================================================================
// 2) NUMBER
// =============================================================================

// In TypeScript esiste UN SOLO tipo number: interi e decimali sono entrambi number.
const idDipendente: number = 42; // tipo: number
const oreLavorate = 7.5; // tipo inferito: number
const minutiStraordinario = 15; // tipo: number

// number copre anche basi diverse e valori speciali.
const esadecimale = 0xff; // => 255
const binario = 0b1010; // => 10
const conSeparatori = 1_000_000; // => 1000000 (underscore solo estetico)
const nonNumero = Number.NaN; // tipo: number (NaN e un number!)
const infinito = Number.POSITIVE_INFINITY; // tipo: number

// Conversione HH:MM -> minuti (pattern ERP). Il risultato e number | null.
function timeStringToMinutes(value: string): number | null {
  const text = value.trim();
  if (!/^\d{2}:\d{2}$/.test(text)) return null;
  const [h, m] = text.split(":").map(Number); // Number: string -> number
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m; // tipo: number
}
const minutiIngresso = timeStringToMinutes("08:00"); // => 480, tipo: number | null

// Attenzione: la divisione produce sempre number (anche fra due interi).
const meta = 3 / 2; // => 1.5, tipo: number

// =============================================================================
// 3) BOOLEAN
// =============================================================================

// Solo due valori: true / false.
const presente: boolean = true; // tipo: boolean
const archiviato = false; // tipo inferito: boolean

// I boolean nascono spesso da confronti o funzioni predicato.
const haStraordinario = minutiStraordinario > 0; // tipo: boolean
const isBadgeValido = /^[A-Z]{2}-\d{3}$/.test(codiceBadge); // tipo: boolean

// ERRORE TS: 1 non e assegnabile a boolean (in TS niente truthiness implicita nelle annotazioni).
// const flagErrato: boolean = 1;

// Doppia negazione per convertire un valore "truthy/falsy" in boolean vero e proprio.
const emailPersonale: string | null = null;
const haEmailPersonale = !!emailPersonale; // => false, tipo: boolean

// =============================================================================
// 4) BIGINT
// =============================================================================

// bigint serve per interi oltre Number.MAX_SAFE_INTEGER (2^53 - 1).
// Si crea con il suffisso n oppure con la funzione BigInt().
const grandeId: bigint = 9007199254740993n; // tipo: bigint
const idDaNumero = BigInt(1000); // => 1000n, tipo: bigint

// I number perdono precisione oltre il limite sicuro; bigint no.
const insicuro = 9007199254740992 + 1; // => 9007199254740992 (SBAGLIATO, precisione persa)
const sicuro = 9007199254740992n + 1n; // => 9007199254740993n (corretto)

// ERRORE TS: non si possono mischiare bigint e number nelle operazioni aritmetiche.
// const misto = grandeId + 1;

// Per operare, converti esplicitamente uno dei due.
const sommaMista = grandeId + BigInt(1); // tipo: bigint

// bigint NON supporta decimali.
// ERRORE TS: 1.5 non e un intero letterale bigint valido.
// const bigDecimale = 1.5n;

// Confronto fra number e bigint: consentito con ==/=== solo dove ha senso il confronto di valore.
const stessoValore = 10n === BigInt(10); // => true, tipo: boolean

// =============================================================================
// 5) SYMBOL
// =============================================================================

// Un symbol e un valore UNICO e immutabile: due symbol non sono mai uguali,
// anche con la stessa descrizione.
const chiaveInterna = Symbol("meta"); // tipo: symbol
const altraChiave = Symbol("meta");
// ERRORE TS 2367: due unique symbol non hanno overlap -> tsc sa a compile-time che sono diversi.
// const sonoUguali = chiaveInterna === altraChiave; // => false (a runtime)
const sonoUguali = (chiaveInterna as symbol) === (altraChiave as symbol); // => false

// unique symbol: costante a livello di tipo, utile come chiave stabile.
const TAG_TIMBRATURA: unique symbol = Symbol("timbratura"); // tipo: unique symbol

// Usare un symbol come chiave di proprieta (non collide mai con chiavi string).
type RecordConMeta = {
  data: string;
  [TAG_TIMBRATURA]: string; // proprieta con chiave symbol
};
const rec: RecordConMeta = {
  data: "2026-07-08",
  [TAG_TIMBRATURA]: "sorgente:badge-reader",
};
const metaTimbratura = rec[TAG_TIMBRATURA]; // tipo: string

// Symbol.for crea/recupera symbol dal registro GLOBALE (questi SI condividono).
const globale1 = Symbol.for("polyuretech.app");
const globale2 = Symbol.for("polyuretech.app");
const globaliUguali = (globale1 as symbol) === (globale2 as symbol); // => true

// =============================================================================
// 6) typeof: distinguere i tipi a runtime (narrowing)
// =============================================================================

// typeof restituisce una string che descrive il tipo primitivo a runtime.
function descriviValore(v: string | number | boolean | bigint | symbol): string {
  // Ogni ramo esegue narrowing: dentro l'if, v ha il tipo ristretto.
  if (typeof v === "string") return `stringa lunga ${v.length}`; // v: string
  if (typeof v === "number") return `numero ${v.toFixed(2)}`; // v: number
  if (typeof v === "boolean") return v ? "vero" : "falso"; // v: boolean
  if (typeof v === "bigint") return `bigint ${v.toString()}`; // v: bigint
  return v.toString(); // v: symbol
}
const d1 = descriviValore("UP-001"); // => "stringa lunga 6"
const d2 = descriviValore(480); // => "numero 480.00"
const d3 = descriviValore(true); // => "vero"

// =============================================================================
// 7) Wrapper object vs primitivi (insidia classica)
// =============================================================================

// I tipi primitivi si scrivono minuscoli: string, number, boolean, bigint, symbol.
// Le versioni maiuscole (String, Number...) sono i WRAPPER object: quasi mai da usare.
const primitivo: string = "ok"; // corretto

// ERRORE TS: String (oggetto) non e assegnabile a string primitivo.
// const wrapper: string = new String("no");

// =============================================================================
// 8) Applicazione al dominio ERP: un mini record Timbratura tipizzato
// =============================================================================

type StatoRichiesta = "In attesa" | "Approvato" | "Rifiutato";

type Timbratura = {
  id: number; // number
  codiceBadge: string; // string, es. "UP-001"
  data: string; // string ISO "AAAA-MM-GG"
  ingresso: string | null; // "08:00" naive-UTC, oppure null
  presente: boolean; // boolean
  oreLavorate: number | null; // number | null
  minutiStraordinario: number; // number
  stato: StatoRichiesta; // literal union
};

const timbraturaOggi: Timbratura = {
  id: 1,
  codiceBadge: "UP-001",
  data: "2026-07-08",
  ingresso: "08:00",
  presente: true,
  oreLavorate: 7.5,
  minutiStraordinario: 15,
  stato: "Approvato",
};

// Uso combinato dei tipi base per formattare una durata (pattern ERP).
function formatDurataMinuti(mins: number): string {
  const ore = Math.floor(mins / 60); // number
  const resto = String(mins % 60).padStart(2, "0"); // string
  return `${ore}h ${resto}m`; // template string
}
const durata = formatDurataMinuti(465); // => "7h 45m"

// =============================================================================
// 9) Esempio browser (DOM): NON eseguito a runtime, serve solo a mostrare i tipi.
// =============================================================================

// Esempio browser: leggere il valore di un input orario come string.
function leggiOrarioDaInput(): string | null {
  const el = document.getElementById("ingresso"); // HTMLElement | null
  if (el instanceof HTMLInputElement) {
    return el.value; // el.value: string
  }
  return null;
}
// Nota: leggiOrarioDaInput NON viene chiamata qui, quindi non tocca il DOM a runtime.

// =============================================================================
// 10) Export nello STESSO file (per illustrare i moduli senza dipendenze esterne)
// =============================================================================

export { timeStringToMinutes, formatDurataMinuti, timbraturaOggi };
export type { Timbratura, StatoRichiesta };

/*
=============================================================================
RIEPILOGO COMANDI / CONCETTI
=============================================================================
- string      : testo. Literal type ("P4"), template `${...}`, metodi tipizzati.
- number       : UNICO tipo per interi e decimali; NaN e Infinity sono number.
- boolean      : solo true/false; niente truthiness implicita nelle annotazioni.
- bigint       : interi oltre 2^53-1; suffisso n o BigInt(); NO decimali; non mischiare con number.
- symbol       : valore sempre unico; unique symbol come chiave stabile; Symbol.for = registro globale.
- Inferenza    : spesso l'annotazione e superflua, TS deduce il tipo dal valore.
- typeof       : narrowing a runtime fra i primitivi ("string"|"number"|"boolean"|"bigint"|"symbol").
- Primitivi minuscoli (string) vs wrapper object maiuscoli (String): usa sempre i minuscoli.
- Limite sicuro number: Number.MAX_SAFE_INTEGER (9007199254740991).
- Regex ERP HH:MM: /^\d{2}:\d{2}$/ ; badge: /^[A-Z]{2}-\d{3}$/.
- Compila con: tsc --noEmit (strict, target ES2022, lib ES2022+DOM).
=============================================================================
*/
