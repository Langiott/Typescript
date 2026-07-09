/**
 * File 042 - Generic functions (funzioni generiche)
 * Corso TypeScript - livello INTERMEDIATE.
 * In questo file vediamo come scrivere funzioni generic, riutilizzabili su piu' type,
 * l'uso di piu' type parameter <T, U>, la differenza tra type inference e type argument
 * esplicito, utility come first<T>(arr) e una versione tipizzata di map.
 * Dominio: ERP Polyuretech (Dipendente, Timbratura, Reparto, Turno).
 * Tutti gli esempi sono ASCII e compilano con tsc --strict (target ES2022).
 */

// ---------------------------------------------------------------------------
// 1. Perche' i generic: il problema del riuso senza perdere il type
// ---------------------------------------------------------------------------

// Senza generic saremmo tentati di usare 'any', ma perdiamo ogni informazione.
function identityAny(value: any): any {
  return value;
}
const a1 = identityAny(42); // tipo: any  <- brutto, nessun controllo

// Con un generic type parameter <T> il tipo entra ed esce preservato.
function identity<T>(value: T): T {
  return value;
}
const a2 = identity(42); // tipo: number (T inferito = number)
const a3 = identity("UP-001"); // tipo: string
const a4 = identity<boolean>(true); // T esplicito = boolean

// ---------------------------------------------------------------------------
// 2. Inferenza vs type argument esplicito
// ---------------------------------------------------------------------------

// Nella maggior parte dei casi TS infersce T dagli argomenti: non serve scriverlo.
const inferred = identity({ id: 1, nome: "Rossi" }); // tipo: { id: number; nome: string }

// A volte serve essere espliciti, ad esempio con literal type che vogliamo mantenere.
const ruoloA = identity("Admin"); // tipo: string  (allargato)
const ruoloB = identity<"Admin">("Admin"); // tipo: "Admin" (literal preservato)

// Esplicito utile anche quando l'argomento non basta a inferire (vedi funzioni factory).
function makeArray<T>(length: number, fill: T): T[] {
  return new Array<T>(length).fill(fill);
}
const zeros = makeArray(3, 0); // tipo: number[]  => [0,0,0]
const badges = makeArray<string>(2, "UP-000"); // tipo: string[]

// ---------------------------------------------------------------------------
// 3. Entita' di dominio ERP (mock, definite qui, nessun import esterno)
// ---------------------------------------------------------------------------

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
}

interface Timbratura {
  dipendenteId: number;
  entrata: string; // orario naive-UTC "HH:MM"
  uscita: string; // "HH:MM"
}

interface Reparto {
  id: number;
  nome: string;
  turno: Turno;
}

const dipendenti: Dipendente[] = [
  { id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Operatore" },
  { id: 2, nome: "Bianchi", badge: "UP-002", ruolo: "Admin" },
  { id: 3, nome: "Verdi", badge: "UP-003", ruolo: "QrDisplay" },
];

// ---------------------------------------------------------------------------
// 4. first<T>(arr): primo elemento con type corretto
// ---------------------------------------------------------------------------

// Ritorna il primo elemento oppure undefined se l'array e' vuoto.
function first<T>(arr: readonly T[]): T | undefined {
  return arr[0];
}
const primoDip = first(dipendenti); // tipo: Dipendente | undefined
const primoNum = first([10, 20, 30]); // tipo: number | undefined  => 10
const primoVuoto = first<string>([]); // tipo: string | undefined  => undefined

// Variante che pretende un array non vuoto tramite tuple type: niente undefined.
function firstOfNonEmpty<T>(arr: readonly [T, ...T[]]): T {
  return arr[0];
}
const sicuro = firstOfNonEmpty([dipendenti[0], dipendenti[1]]); // tipo: Dipendente
// ERRORE TS: un array vuoto non e' assegnabile a [T, ...T[]]
// const ko = firstOfNonEmpty([]);

// last<T>: simmetrico a first.
function last<T>(arr: readonly T[]): T | undefined {
  return arr.length ? arr[arr.length - 1] : undefined;
}
const ultimo = last(dipendenti); // tipo: Dipendente | undefined

// ---------------------------------------------------------------------------
// 5. map tipizzato: due type parameter <T, U>
// ---------------------------------------------------------------------------

// La callback trasforma T in U: il risultato e' U[]. Classico esempio di due generic.
function mapArray<T, U>(arr: readonly T[], fn: (item: T, index: number) => U): U[] {
  const out: U[] = [];
  for (let i = 0; i < arr.length; i++) {
    out.push(fn(arr[i], i));
  }
  return out;
}

// T = Dipendente, U = string: estraiamo i badge.
const listaBadge = mapArray(dipendenti, (d) => d.badge); // tipo: string[]
// => ["UP-001", "UP-002", "UP-003"]

// T = Dipendente, U = { badge; nome }: proiezione su nuovo shape.
const proiezione = mapArray(dipendenti, (d) => ({ badge: d.badge, nome: d.nome }));
// tipo: { badge: string; nome: string }[]

// T = number, U = string: U inferito dal return della callback.
const etichette = mapArray([1, 2, 3], (n) => `#${n}`); // tipo: string[]  => ["#1","#2","#3"]

// ---------------------------------------------------------------------------
// 6. Altre utility generic comuni
// ---------------------------------------------------------------------------

// filter tipizzato che restituisce lo stesso T[].
function filterArray<T>(arr: readonly T[], pred: (item: T) => boolean): T[] {
  return arr.filter(pred);
}
const admins = filterArray(dipendenti, (d) => d.ruolo === "Admin"); // tipo: Dipendente[]

// pluck<T, K>: estrae una property; K vincolato con 'keyof T' (constraint).
function pluck<T, K extends keyof T>(arr: readonly T[], key: K): T[K][] {
  return arr.map((item) => item[key]);
}
const nomi = pluck(dipendenti, "nome"); // tipo: string[]  => ["Rossi","Bianchi","Verdi"]
const ruoli = pluck(dipendenti, "ruolo"); // tipo: Ruolo[]
// ERRORE TS: "eta'" non e' una key di Dipendente
// const boom = pluck(dipendenti, "eta");

// indexBy<T, K>: costruisce un Record indicizzato per una property string.
function indexBy<T>(arr: readonly T[], key: (item: T) => string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of arr) {
    out[key(item)] = item;
  }
  return out;
}
const perBadge = indexBy(dipendenti, (d) => d.badge); // tipo: Record<string, Dipendente>
const dipUP002 = perBadge["UP-002"]; // tipo: Dipendente  => Bianchi

// ---------------------------------------------------------------------------
// 7. Generic con piu' parametri e valori di default
// ---------------------------------------------------------------------------

// pair<T, U>: crea una tuple [T, U]. Due type parameter indipendenti.
function pair<T, U>(a: T, b: U): [T, U] {
  return [a, b];
}
const p1 = pair("UP-001", 8); // tipo: [string, number]
const p2 = pair(dipendenti[0], "P4" as Turno); // tipo: [Dipendente, Turno]

// Default type parameter: se U non e' fornito ne' inferibile, vale string.
function wrap<T, U = string>(value: T, meta?: U): { value: T; meta?: U } {
  return { value, meta };
}
const w1 = wrap(10); // tipo: { value: number; meta?: string }
const w2 = wrap(10, true); // tipo: { value: number; meta?: boolean }

// ---------------------------------------------------------------------------
// 8. Generic + narrowing: applicazione al dominio ERP
// ---------------------------------------------------------------------------

const RE_ORARIO = /^\d{2}:\d{2}$/;
const RE_BADGE = /^UP-\d{3}$/;

// Type guard generic: filtra via i valori null/undefined mantenendo il type.
function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
const grezzi: (string | undefined)[] = ["UP-001", undefined, "UP-003"];
const puliti = grezzi.filter(isPresent); // tipo: string[]  => ["UP-001","UP-003"]

// findBy<T>: generic + predicate, riusabile su qualsiasi collezione ERP.
function findBy<T>(arr: readonly T[], pred: (item: T) => boolean): T | undefined {
  for (const item of arr) {
    if (pred(item)) return item;
  }
  return undefined;
}
const opBadge = findBy(dipendenti, (d) => RE_BADGE.test(d.badge) && d.ruolo === "Operatore");
// tipo: Dipendente | undefined  => Rossi

// Validazione generic di una lista di orari (Timbratura naive-UTC "HH:MM").
const timbrate: Timbratura[] = [
  { dipendenteId: 1, entrata: "08:00", uscita: "17:00" },
  { dipendenteId: 2, entrata: "09:30", uscita: "18:15" },
];
const orariEntrata = pluck(timbrate, "entrata"); // tipo: string[]
const tuttiValidi = orariEntrata.every((o) => RE_ORARIO.test(o)); // tipo: boolean  => true

// ---------------------------------------------------------------------------
// 9. Generic function type e passaggio di funzioni generiche
// ---------------------------------------------------------------------------

// Possiamo tipizzare una variabile con una signature generic.
type Mapper = <T, U>(arr: readonly T[], fn: (x: T) => U) => U[];
const myMap: Mapper = (arr, fn) => arr.map(fn);
const doppi = myMap([1, 2, 3], (n) => n * 2); // tipo: number[]  => [2,4,6]

// compose<A, B, C>: componiamo due funzioni preservando i tipi lungo la catena.
function compose<A, B, C>(f: (b: B) => C, g: (a: A) => B): (a: A) => C {
  return (a) => f(g(a));
}
const badgeLen = compose(
  (s: string) => s.length, // B=string -> C=number
  (d: Dipendente) => d.badge // A=Dipendente -> B=string
);
const len = badgeLen(dipendenti[0]); // tipo: number  => 6

// ---------------------------------------------------------------------------
// 10. Esempio browser (NON eseguito): generic su una funzione DOM-like
// ---------------------------------------------------------------------------

// Esempio browser: querySelector tipizzato via generic, mostrato ma non chiamato.
function selectFirst<E extends Element>(root: ParentNode, selector: string): E | null {
  return root.querySelector<E>(selector);
}
// const btn = selectFirst<HTMLButtonElement>(document, "button.timbra"); // non eseguito

// ---------------------------------------------------------------------------
// 11. Export dei simboli locali (solo simboli definiti in questo file)
// ---------------------------------------------------------------------------

export {
  identity,
  makeArray,
  first,
  firstOfNonEmpty,
  last,
  mapArray,
  filterArray,
  pluck,
  indexBy,
  pair,
  wrap,
  isPresent,
  findBy,
  compose,
};
export type { Ruolo, Turno, Dipendente, Timbratura, Reparto, Mapper };

/*
 * RIEPILOGO COMANDI / CONCETTI
 * - function f<T>(x: T): T  -> type parameter singolo, preserva il type (meglio di any).
 * - Inferenza: TS deduce T dagli argomenti; esplicito f<T>(...) quando serve (literal, factory).
 * - Piu' type parameter: <T, U> es. mapArray(arr, fn) trasforma T[] in U[].
 * - first<T>(arr): T | undefined; firstOfNonEmpty con tuple [T, ...T[]] evita undefined.
 * - Constraint: <K extends keyof T> in pluck; vincola K alle key valide di T.
 * - Record<string, T> con indexBy per indicizzare collezioni (es. per badge).
 * - Default type parameter: <T, U = string> quando U puo' mancare.
 * - Type guard generic: value is T (isPresent) per narrowing e filter().
 * - Generic function type: type Mapper = <T,U>(...)=>U[]; compose preserva A->B->C.
 * - readonly T[] negli input: firma piu' sicura, accetta array normali e readonly.
 * - Esempi browser (querySelector<E>) mostrati ma non eseguiti.
 */
