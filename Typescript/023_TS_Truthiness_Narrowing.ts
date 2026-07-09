/**
 * File 023 - Truthiness Narrowing in TypeScript
 * Argomento: come TypeScript restringe (narrowing) i type in base alla
 * "truthiness" di un valore, cioe' se e' truthy o falsy dentro un if.
 * Vedremo if(x), gestione di null/undefined/0/"", gli operatori && || ??,
 * l'equality narrowing (===, !==) e un esempio pratico di badge opzionale
 * nel dominio ERP Polyuretech. Livello: FUNDAMENTALS.
 */

// ---------------------------------------------------------------------------
// 1. VALORI FALSY: il ripasso indispensabile
// ---------------------------------------------------------------------------
// In JavaScript (e quindi TypeScript) questi valori sono FALSY, cioe' dentro
// un if() vengono trattati come false:
//   false, 0, -0, 0n (BigInt zero), "" (stringa vuota), null, undefined, NaN
// Tutto il resto e' TRUTHY: "0", "false", [], {}, 42, -1, " " (spazio).

const zero = 0;
const stringaVuota = "";
const spazio = " ";
const arrayVuoto: number[] = [];

if (arrayVuoto) {
  // Questo ramo VIENE eseguito: un array vuoto e' truthy!
  // Errore comune: pensare che [] sia falsy come in altri linguaggi.
}
if (spazio) {
  // Truthy: " " non e' la stringa vuota.
}
void zero;
void stringaVuota; // solo per usare le variabili

// ---------------------------------------------------------------------------
// 2. if(x): il narrowing di base
// ---------------------------------------------------------------------------
// Quando il type include null o undefined, un if(x) li rimuove nel ramo then.

function lunghezza(testo: string | null): number {
  // Qui testo e' string | null
  if (testo) {
    // narrowing: dentro l'if testo e' string (null e "" esclusi)
    return testo.length; // tipo di testo: string
  }
  // Qui testo e' string | null ancora, ma in pratica "" oppure null
  return 0;
}

// ATTENZIONE: if(x) esclude anche la stringa vuota "", non solo null.
// Se "" fosse un valore valido da processare, questo pattern lo scarterebbe.

// ---------------------------------------------------------------------------
// 3. Il trabocchetto del numero 0
// ---------------------------------------------------------------------------
// Con i number, if(x) tratta 0 come falsy: bug classico con contatori/ore.

function descriviOre(ore: number | undefined): string {
  if (ore) {
    // ERRORE LOGICO (non di tipo): se ore === 0 questo ramo NON parte
    return `Ore lavorate: ${ore}`;
  }
  // Qui finiscono sia undefined SIA 0
  return "Nessun dato";
}
void descriviOre(0); // => "Nessun dato"  (probabilmente NON quello che vuoi)

// Modo corretto: controllare esplicitamente undefined/null.
function descriviOreOk(ore: number | undefined): string {
  if (ore !== undefined) {
    // narrowing: ore e' number (anche quando vale 0)
    return `Ore lavorate: ${ore}`; // tipo di ore: number
  }
  return "Nessun dato";
}
void descriviOreOk(0); // => "Ore lavorate: 0"

// ---------------------------------------------------------------------------
// 4. Operatore && (AND logico) e narrowing
// ---------------------------------------------------------------------------
// a && b restituisce a se a e' falsy, altrimenti b. Utile come guard.

interface Dipendente {
  id: number;
  nome: string;
  badge?: string; // opzionale: string | undefined
  ruolo: Ruolo;
}

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

function iniziale(dip: Dipendente): string {
  // dip.badge e' string | undefined
  // Grazie a && accediamo a .charAt solo se badge e' truthy (string non vuota)
  const primaLettera = dip.badge && dip.badge.charAt(0);
  // tipo di primaLettera: string | undefined | "" -> in pratica string | undefined
  return primaLettera ?? "?";
}

// ---------------------------------------------------------------------------
// 5. Operatore || (OR logico) e valori di default
// ---------------------------------------------------------------------------
// a || b restituisce a se a e' truthy, altrimenti b. Comodo per i default,
// ma occhio ai falsy "validi" (0, "").

function turnoConDefault(turno: string | null): string {
  // Se turno e' null o "" usa "STD"
  return turno || "STD";
}
void turnoConDefault(null); // => "STD"
void turnoConDefault("");   // => "STD"  (la stringa vuota e' falsy)
void turnoConDefault("P4"); // => "P4"

// Bug con ||: qui uno 0 legittimo verrebbe sostituito.
function contaConDefaultBuggy(n: number | undefined): number {
  return n || 10; // se n === 0 -> ritorna 10 (sbagliato!)
}
void contaConDefaultBuggy(0); // => 10

// ---------------------------------------------------------------------------
// 6. Operatore ?? (nullish coalescing): il default "giusto"
// ---------------------------------------------------------------------------
// a ?? b restituisce b SOLO se a e' null o undefined (NON se e' 0 o "").
// E' la scelta corretta quando 0 e "" sono valori validi.

function contaConDefaultOk(n: number | undefined): number {
  return n ?? 10; // n === 0 -> ritorna 0; n === undefined -> ritorna 10
}
void contaConDefaultOk(0);         // => 0
void contaConDefaultOk(undefined); // => 10

// ?? restringe il type: dopo ?? il risultato non e' null/undefined.
function nomeSicuro(nome: string | null | undefined): string {
  const n = nome ?? "Sconosciuto"; // tipo di n: string
  return n.toUpperCase();
}

// ---------------------------------------------------------------------------
// 7. Assegnamenti nullish/logici: ??=, ||=, &&=
// ---------------------------------------------------------------------------
// Varianti di assegnamento che combinano l'operatore con "=".

interface Config {
  turno?: string;
  ore?: number;
}

function normalizzaConfig(cfg: Config): Required<Config> {
  cfg.turno ??= "STD"; // assegna "STD" solo se turno e' null/undefined
  cfg.ore ??= 0;       // 0 resta 0 (?? non lo tocca); assegna solo se assente
  return cfg as Required<Config>;
}
void normalizzaConfig({}); // => { turno: "STD", ore: 0 }

// ---------------------------------------------------------------------------
// 8. Equality narrowing con === e !==
// ---------------------------------------------------------------------------
// Confrontare con un letterale restringe il type nei due rami.

function saluta(ruolo: Ruolo): string {
  if (ruolo === "SuperAdmin") {
    // narrowing: ruolo e' "SuperAdmin"
    return "Benvenuto capo";
  }
  // narrowing: ruolo e' "Admin" | "Operatore" | "QrDisplay"
  return `Ciao ${ruolo}`;
}

// Equality tra due variabili: TS restringe entrambe al type comune.
function stessoValore(a: string | number, b: string | boolean): void {
  if (a === b) {
    // L'unico type in comune e' string, quindi qui a: string e b: string
    console.log(a.toUpperCase(), b.toLowerCase());
  }
}
void stessoValore;

// ---------------------------------------------------------------------------
// 9. Narrowing di null E undefined insieme con != null
// ---------------------------------------------------------------------------
// x != null (con == "loose") e' true solo se x non e' ne' null ne' undefined.
// E' un idioma comodo per escludere entrambi in un colpo solo.

function primoCarattere(s: string | null | undefined): string {
  if (s != null) {
    // narrowing: s e' string (esclusi sia null sia undefined)
    return s.charAt(0);
  }
  return "";
}
void primoCarattere(undefined); // => ""

// ---------------------------------------------------------------------------
// 10. ESEMPIO ERP: badge opzionale del Dipendente
// ---------------------------------------------------------------------------
// Il badge ha formato "UP-001". E' opzionale: un nuovo assunto potrebbe non
// averlo ancora. Combiniamo truthiness narrowing, ?? e una regex.

const BADGE_REGEX = /^UP-\d{3}$/;

function badgeValido(dip: Dipendente): boolean {
  // Prima escludiamo undefined/"" con un semplice if(truthy)
  if (!dip.badge) {
    // dip.badge e' undefined oppure "" -> non valido
    return false;
  }
  // Qui dip.badge e' string (non vuota): possiamo testare la regex
  return BADGE_REGEX.test(dip.badge); // tipo di dip.badge: string
}

// Etichetta da mostrare: usa il badge se presente, altrimenti un placeholder.
function etichettaBadge(dip: Dipendente): string {
  // ?? gestisce solo undefined; l'if gestisce la stringa vuota separatamente
  const b = dip.badge ?? "";
  return b !== "" ? b : "BADGE-DA-ASSEGNARE";
}
void etichettaBadge({ id: 1, nome: "Rossi", ruolo: "Operatore" });
// => "BADGE-DA-ASSEGNARE"
void etichettaBadge({ id: 2, nome: "Bianchi", badge: "UP-007", ruolo: "Operatore" });
// => "UP-007"

// ---------------------------------------------------------------------------
// 11. ESEMPIO ERP: orario timbratura opzionale
// ---------------------------------------------------------------------------
// Gli orari sono stringhe naive-UTC "HH:MM". L'uscita puo' mancare (turno
// ancora aperto). Combiniamo && per validare in modo sicuro.

const ORARIO_REGEX = /^\d{2}:\d{2}$/;

interface Timbratura {
  entrata: string;        // sempre presente, es. "08:00"
  uscita?: string | null; // puo' mancare (turno aperto) -> string | null | undefined
}

function turnoChiuso(t: Timbratura): boolean {
  // t.uscita truthy && formato valido: se uscita e' null/undefined/""
  // l'espressione corto-circuita a un valore falsy prima della regex.
  return Boolean(t.uscita && ORARIO_REGEX.test(t.uscita));
  // dentro test(...) t.uscita e' string grazie al narrowing di &&
}
void turnoChiuso({ entrata: "08:00" });                    // => false
void turnoChiuso({ entrata: "08:00", uscita: "17:00" });   // => true
void turnoChiuso({ entrata: "08:00", uscita: null });      // => false

// Durata "grezza" solo se entrambe le stringhe ci sono.
function haOrariCompleti(t: Timbratura): string {
  if (t.entrata && t.uscita) {
    // narrowing: entrata e uscita sono entrambe string non vuote
    return `${t.entrata} -> ${t.uscita}`;
  }
  return `${t.entrata} -> (in corso)`;
}
void haOrariCompleti({ entrata: "08:00" }); // => "08:00 -> (in corso)"

// ---------------------------------------------------------------------------
// 12. Truthiness dentro il ternario e concatenazione di guard
// ---------------------------------------------------------------------------
// Si possono concatenare piu' controlli truthy per accessi annidati sicuri.

interface Reparto {
  nome: string;
  responsabile?: Dipendente;
}

function badgeResponsabile(rep: Reparto): string {
  // rep.responsabile puo' mancare; il suo badge puo' mancare a sua volta.
  // Ogni && aggiunge un livello di narrowing.
  const badge = rep.responsabile && rep.responsabile.badge;
  // tipo di badge: string | undefined
  return badge ?? "nessun badge";
}
void badgeResponsabile({ nome: "Produzione" }); // => "nessun badge"

// Equivalente moderno con optional chaining (?.), coerente con ??:
function badgeResponsabile2(rep: Reparto): string {
  return rep.responsabile?.badge ?? "nessun badge";
}
void badgeResponsabile2;

// ---------------------------------------------------------------------------
// 13. Errori tipici COMMENTATI (il file resta valido)
// ---------------------------------------------------------------------------

function esempiErrori(dip: Dipendente): void {
  // Senza narrowing, accedere a un valore possibilmente undefined da' errore:
  // ERRORE TS: 'dip.badge' is possibly 'undefined'.
  // const x: number = dip.badge.length;

  // ?? e || non si possono mescolare senza parentesi:
  // ERRORE TS: '||' and '??' operations cannot be mixed; use parentheses.
  // const y = dip.badge || "a" ?? "b";

  // Uso corretto con parentesi (compila):
  const y = (dip.badge || "a") ?? "b"; // tipo: string
  void y;
}
void esempiErrori;

// ---------------------------------------------------------------------------
// 14. Export dei simboli locali (solo roba definita in questo file)
// ---------------------------------------------------------------------------
export {
  lunghezza,
  descriviOreOk,
  turnoConDefault,
  contaConDefaultOk,
  nomeSicuro,
  badgeValido,
  etichettaBadge,
  turnoChiuso,
  badgeResponsabile2,
};
export type { Dipendente, Timbratura, Reparto, Ruolo, Config };

/*
 * ===========================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ===========================================================================
 * - Valori FALSY: false, 0, -0, 0n, "", null, undefined, NaN. Tutto il resto truthy.
 * - [] e {} sono TRUTHY (attenzione se vieni da altri linguaggi).
 * - if(x): rimuove null/undefined nel ramo then, ma esclude anche 0 e "".
 * - Bug del 3: if(number) scarta lo 0 -> usa x !== undefined per i number.
 * - &&: ritorna il primo falsy, altrimenti l'ultimo; ottimo per guard/access.
 * - ||: default sui FALSY (0 e "" inclusi) -> rischioso con 0/"".
 * - ??: default solo su null/undefined -> corretto quando 0/"" sono validi.
 * - ??=, ||=, &&=: assegnamenti condizionati corrispondenti.
 * - Equality narrowing: === / !== con un letterale restringe le union.
 * - a === b tra union: TS restringe al type in comune.
 * - x != null: idioma per escludere insieme null E undefined.
 * - Optional chaining ?. + ?? : accesso e default sicuri e leggibili.
 * - Non mescolare || e ?? senza parentesi (errore TS).
 * - ERP: badge "UP-\d{3}", orari "\d{2}:\d{2}"; campi opzionali -> narrowing.
 * ===========================================================================
 */
