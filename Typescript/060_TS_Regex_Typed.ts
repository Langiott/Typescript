/**
 * 060_TS_Regex_Typed.ts
 * Corso TypeScript - File 60: "Regex typed"
 * Come tipizzare l'uso di RegExp in TypeScript: test/exec, match,
 * named capture groups tipizzati, e validazione di stringhe di dominio ERP
 * (badge "UP-001" con /^UP-\d{3}$/ e orario "HH:MM" con /^\d{2}:\d{2}$/).
 * Livello: INTERMEDIATE. Nessuna libreria esterna, solo ASCII.
 */

// ---------------------------------------------------------------------------
// 1. RegExp: creazione di base
// ---------------------------------------------------------------------------

// Literal regex: il tipo inferito e' RegExp.
const soloCifre = /^\d+$/;
// tipo: RegExp

// Costruttore RegExp: utile quando il pattern e' dinamico (stringa runtime).
const dinamica = new RegExp("^UP-\\d{3}$");
// tipo: RegExp

// I flag sono una stringa: g (global), i (ignoreCase), m (multiline), u, s, y.
const conFlag = /up-\d{3}/i;
console.log(conFlag.flags); // => "i"      tipo: string
console.log(conFlag.source); // => "up-\\d{3}"  tipo: string
console.log(conFlag.global); // => false   tipo: boolean

// ---------------------------------------------------------------------------
// 2. test(): ritorna boolean, ottimo per type guard / validazione
// ---------------------------------------------------------------------------

// test() dice solo SI/NO: la firma e' test(s: string): boolean
const eOrario = /^\d{2}:\d{2}$/.test("08:30");
// => true   tipo: boolean

const eBadge = /^UP-\d{3}$/.test("UP-001");
// => true   tipo: boolean

// ---------------------------------------------------------------------------
// 3. Branded types + regex come validatori (narrowing di stringhe)
// ---------------------------------------------------------------------------

// Una stringa qualunque non e' un badge valido: usiamo un branded type
// per distinguere "string generica" da "Badge validato".
type Badge = string & { readonly __brand: "Badge" };
type OrarioHHMM = string & { readonly __brand: "OrarioHHMM" };

const RE_BADGE = /^UP-\d{3}$/;
const RE_ORARIO = /^\d{2}:\d{2}$/;

// Type guard: se ritorna true, TS restringe (narrowing) s a Badge.
function isBadge(s: string): s is Badge {
  return RE_BADGE.test(s);
}

function isOrario(s: string): s is OrarioHHMM {
  return RE_ORARIO.test(s);
}

const input1 = "UP-042";
if (isBadge(input1)) {
  // Qui input1 ha tipo Badge, non piu' string generica.
  const b: Badge = input1; // ok
  console.log("badge valido:", b);
}

// ERRORE TS: non puoi assegnare una string qualunque a Badge senza guard/cast.
// const cattivo: Badge = "ciao";

// ---------------------------------------------------------------------------
// 4. Funzioni "assert" che lanciano se il formato e' sbagliato
// ---------------------------------------------------------------------------

// assertion signature: dopo la chiamata, TS sa che s e' Badge.
function assertBadge(s: string): asserts s is Badge {
  if (!RE_BADGE.test(s)) {
    throw new Error(`Badge non valido: "${s}" (atteso UP-NNN)`);
  }
}

function normalizzaBadge(raw: string): Badge {
  const up = raw.trim().toUpperCase();
  assertBadge(up); // se passa, up e' Badge
  return up; // tipo: Badge
}

console.log(normalizzaBadge("  up-007 ")); // => "UP-007"

// ---------------------------------------------------------------------------
// 5. exec(): ritorna RegExpExecArray | null (serve narrowing su null)
// ---------------------------------------------------------------------------

// exec restituisce null se non trova, oppure un array-like con i gruppi.
const mExec = /^(\d{2}):(\d{2})$/.exec("14:05");
// tipo: RegExpExecArray | null

if (mExec) {
  // mExec[0] e' l'intero match, poi i capture groups per indice.
  console.log(mExec[0]); // => "14:05"  tipo: string
  console.log(mExec[1]); // => "14"     tipo: string
  console.log(mExec[2]); // => "05"     tipo: string
  console.log(mExec.index); // => 0     tipo: number
}

// ERRORE TS: senza il narrowing su null non puoi indicizzare direttamente.
// const cifra = /(\d+)/.exec("x")[1]; // Object is possibly 'null'

// ---------------------------------------------------------------------------
// 6. String.match(): dipende dal flag g
// ---------------------------------------------------------------------------

// Senza flag g: match si comporta come exec -> RegExpMatchArray | null
const match1 = "09:15".match(/^(\d{2}):(\d{2})$/);
// tipo: RegExpMatchArray | null
if (match1) {
  console.log(match1[1], match1[2]); // => "09" "15"
}

// Con flag g: ritorna string[] | null (SENZA i capture groups, solo i match interi).
const match2 = "UP-001 UP-002 UP-003".match(/UP-\d{3}/g);
// tipo: RegExpMatchArray | null  (a runtime: string[])
console.log(match2); // => ["UP-001", "UP-002", "UP-003"]

// ---------------------------------------------------------------------------
// 7. Named capture groups tipizzati
// ---------------------------------------------------------------------------

// I named groups (?<nome>...) finiscono in match.groups, ma TS di default
// li tipizza come { [key: string]: string } | undefined (poco preciso).
const RE_ORARIO_NAMED = /^(?<ore>\d{2}):(?<min>\d{2})$/;

const gRaw = RE_ORARIO_NAMED.exec("23:59");
if (gRaw && gRaw.groups) {
  // tipo di gRaw.groups: { [key: string]: string }
  console.log(gRaw.groups.ore, gRaw.groups.min); // => "23" "59"
}

// Per avere i named groups TIPIZZATI definiamo un'interfaccia e un piccolo
// wrapper che fa il cast in un punto solo (single source of truth).
interface OrarioGroups {
  ore: string;
  min: string;
}

// Il tipo del risultato di exec con groups tipizzati: intersezione mirata.
type TypedExec<G> = (RegExpExecArray & { groups: G }) | null;

function execOrario(s: string): TypedExec<OrarioGroups> {
  return RE_ORARIO_NAMED.exec(s) as TypedExec<OrarioGroups>;
}

const parsed = execOrario("07:45");
if (parsed) {
  const ore = parsed.groups.ore; // tipo: string (proprieta' nota)
  const min = parsed.groups.min; // tipo: string
  console.log(`${ore}h ${min}m`); // => "07h 45m"
  // ERRORE TS: 'sec' non esiste su OrarioGroups.
  // console.log(parsed.groups.sec);
}

// ---------------------------------------------------------------------------
// 8. Da named groups a un tipo di dominio (parsing tipizzato)
// ---------------------------------------------------------------------------

interface OrarioParsed {
  ore: number;
  minuti: number;
}

// Ritorna OrarioParsed | null: null se il formato non e' HH:MM valido.
function parseOrario(s: string): OrarioParsed | null {
  const m = execOrario(s);
  if (!m) return null;
  const ore = Number(m.groups.ore);
  const minuti = Number(m.groups.min);
  // Validazione semantica oltre a quella sintattica del regex.
  if (ore > 23 || minuti > 59) return null;
  return { ore, minuti };
}

console.log(parseOrario("08:30")); // => { ore: 8, minuti: 30 }
console.log(parseOrario("25:00")); // => null (regex ok ma ore fuori range)
console.log(parseOrario("8:3")); // => null (regex fallisce)

// ---------------------------------------------------------------------------
// 9. Badge parsing: estrarre il numero progressivo tipizzato
// ---------------------------------------------------------------------------

interface BadgeParsed {
  prefisso: "UP";
  numero: number; // 1..999
}

const RE_BADGE_NAMED = /^UP-(?<num>\d{3})$/;

function parseBadge(s: string): BadgeParsed | null {
  const m = RE_BADGE_NAMED.exec(s) as TypedExec<{ num: string }>;
  if (!m) return null;
  return { prefisso: "UP", numero: Number(m.groups.num) };
}

console.log(parseBadge("UP-001")); // => { prefisso: "UP", numero: 1 }
console.log(parseBadge("XX-001")); // => null

// ---------------------------------------------------------------------------
// 10. replace() con funzione e con gruppi ($1) - tipizzazione
// ---------------------------------------------------------------------------

// replace(regex, replacement): il replacement puo' usare $1, $2, $<nome>.
const mascherato = "UP-001".replace(RE_BADGE_NAMED, "UP-***");
// tipo: string  => "UP-***"
console.log(mascherato);

// Callback: (match, ...groups, offset, fullString) -> string.
// Con flag g applica a tutte le occorrenze.
const incrementato = "UP-001 UP-009".replace(
  /UP-(\d{3})/g,
  (_full: string, num: string): string => {
    const n = Number(num) + 1;
    return "UP-" + String(n).padStart(3, "0");
  },
);
// tipo: string  => "UP-002 UP-010"
console.log(incrementato);

// ---------------------------------------------------------------------------
// 11. matchAll(): iterare tutti i match CON i capture groups
// ---------------------------------------------------------------------------

// A differenza di match(/g), matchAll ritorna un IterableIterator che
// conserva i gruppi di ogni match. Richiede flag g.
const testo = "Presenti: UP-001, UP-042, UP-999";
const tutti = [...testo.matchAll(/UP-(?<num>\d{3})/g)];
// tipo: RegExpExecArray[]  (ogni elemento e' un match completo)
const numeri = tutti.map((m) => Number(m.groups?.num));
// tipo: number[]  => [1, 42, 999]
console.log(numeri);

// ---------------------------------------------------------------------------
// 12. Union di ruoli validati via regex/set (dominio ERP)
// ---------------------------------------------------------------------------

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

const RE_TURNO = /^(P4|P2|STD)$/;

function isTurno(s: string): s is Turno {
  return RE_TURNO.test(s);
}

const t = "P4";
if (isTurno(t)) {
  const turno: Turno = t; // ok, narrowed
  console.log("turno:", turno);
}

// ---------------------------------------------------------------------------
// 13. Entita' di dominio che usano i branded types validati
// ---------------------------------------------------------------------------

interface Dipendente {
  id: number;
  nome: string;
  badge: Badge; // solo valori passati da isBadge/assertBadge
  ruolo: Ruolo;
}

interface Timbratura {
  dipendenteId: number;
  entrata: OrarioHHMM; // stringa "HH:MM" naive-UTC validata
  uscita: OrarioHHMM;
}

// Factory che valida in ingresso e restituisce entita' tipizzate.
function creaDipendente(
  id: number,
  nome: string,
  badgeRaw: string,
  ruolo: Ruolo,
): Dipendente {
  assertBadge(badgeRaw); // badgeRaw diventa Badge o lancia
  return { id, nome, badge: badgeRaw, ruolo };
}

function creaTimbratura(
  dipendenteId: number,
  entrataRaw: string,
  uscitaRaw: string,
): Timbratura {
  if (!isOrario(entrataRaw) || !isOrario(uscitaRaw)) {
    throw new Error("Orari non validi, atteso formato HH:MM");
  }
  return { dipendenteId, entrata: entrataRaw, uscita: uscitaRaw };
}

const d = creaDipendente(1, "Mario Rossi", "UP-001", "Operatore");
console.log(d.badge); // => "UP-001"
const tb = creaTimbratura(1, "08:00", "17:30");
console.log(tb.entrata, tb.uscita); // => "08:00" "17:30"

// ---------------------------------------------------------------------------
// 14. Template literal types: validazione a livello di TYPE (compile-time)
// ---------------------------------------------------------------------------

// I regex validano a RUNTIME. I template literal types validano a COMPILE-TIME
// forme semplici. Non possono contare cifre come \d{3}, ma vincolano la forma.
type BadgeShape = `UP-${number}`;
const bs: BadgeShape = "UP-123"; // ok a compile-time
// ERRORE TS: manca il prefisso "UP-".
// const bsBad: BadgeShape = "123";

// Piu' preciso: HH:MM sfruttando template literal (senza vincolo di range).
type OreDigit = `${number}${number}`;
type OrarioShape = `${OreDigit}:${OreDigit}`;
const os: OrarioShape = "08:30"; // ok
// Nota: OrarioShape accetta anche "99:99"; il range va comunque validato a runtime.

// Combinare i due mondi: template literal per la forma statica, regex per il
// controllo forte a runtime (numero di cifre + range).
function badgeLetterale<T extends BadgeShape>(b: T): Badge {
  assertBadge(b);
  return b;
}
console.log(badgeLetterale("UP-500")); // => "UP-500"

// ---------------------------------------------------------------------------
// 15. lastIndex e regex stateful con flag g (attenzione ai bug)
// ---------------------------------------------------------------------------

// Una regex con flag g mantiene lastIndex tra le chiamate di exec/test:
// riusare la STESSA istanza in loop puo' dare risultati inaspettati.
const reGlobal = /UP-\d{3}/g;
console.log(reGlobal.test("UP-001")); // => true  (lastIndex avanza)
console.log(reGlobal.test("UP-001")); // => false (riparte da lastIndex!)
reGlobal.lastIndex = 0; // reset manuale per riusarla
console.log(reGlobal.test("UP-001")); // => true

// Consiglio: per validazione usa regex SENZA flag g (nessuno stato).

// ---------------------------------------------------------------------------
// 16. Utility generica: validatore riusabile tipizzato
// ---------------------------------------------------------------------------

// Crea un type guard a partire da una regex e un branded type target.
function makeGuard<B extends string>(re: RegExp) {
  return (s: string): s is B => re.test(s);
}

const isBadge2 = makeGuard<Badge>(/^UP-\d{3}$/);
const isOrario2 = makeGuard<OrarioHHMM>(/^\d{2}:\d{2}$/);

console.log(isBadge2("UP-777")); // => true
console.log(isOrario2("24:00")); // => true (sintassi ok; range va oltre)

// ---------------------------------------------------------------------------
// 17. Export dei simboli locali (solo simboli definiti in questo file)
// ---------------------------------------------------------------------------

export {
  RE_BADGE,
  RE_ORARIO,
  isBadge,
  isOrario,
  assertBadge,
  parseOrario,
  parseBadge,
  creaDipendente,
  creaTimbratura,
  makeGuard,
};
export type {
  Badge,
  OrarioHHMM,
  OrarioParsed,
  BadgeParsed,
  Dipendente,
  Timbratura,
  Ruolo,
  Turno,
  BadgeShape,
  OrarioShape,
};

/*
 * RIEPILOGO COMANDI / CONCETTI
 * - Literal /.../ e new RegExp("..."): entrambi tipo RegExp; flags/source/global.
 * - test(s): boolean -> ideale per type guard "s is Brand".
 * - exec(s): RegExpExecArray | null -> narrowing su null obbligatorio.
 * - str.match(re): senza g -> RegExpMatchArray|null (con groups); con g -> string[]|null.
 * - str.matchAll(re/g): iteratore con TUTTI i match e i loro capture groups.
 * - str.replace(re, str|fn): $1/$<nome> nella stringa, oppure callback tipizzata.
 * - Named groups (?<nome>...): in .groups; di default { [k:string]: string }|undefined.
 * - Tipizzarli: cast in un wrapper con TypedExec<G> = RegExpExecArray & { groups: G }.
 * - Branded types (string & {__brand}): distinguono string generica da valore validato.
 * - Type guard "s is B" e assertion "asserts s is B" per narrowing.
 * - Template literal types: validazione di FORMA a compile-time (no conteggio cifre/range).
 * - Runtime vs compile-time: regex per range/cifre, template literal per la forma.
 * - Flag g + lastIndex: regex stateful -> per validazione usa regex SENZA g.
 * - Dominio ERP: /^UP-\d{3}$/ per badge, /^\d{2}:\d{2}$/ per orario HH:MM naive-UTC.
 */
