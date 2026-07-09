/**
 * File 068 - ADV Recursive Types
 * Corso TypeScript avanzato - Tipi ricorsivi (recursive types).
 * Un type puo' riferirsi a se stesso: alberi, JSON, DeepReadonly/DeepPartial.
 * Vediamo come il compiler valuta la ricorsione (lazy), i limiti di profondita'
 * (errore "Type instantiation is excessively deep"), e come applicarli all'ERP
 * (albero reparti, DTO annidati, timbrature). Termini tecnici in inglese.
 */

// ============================================================================
// SEZIONE 0 - Helper di type-testing (li useremo in tutto il file)
// ============================================================================

// Equal<A, B>: true se A e B sono lo STESSO type (anche readonly/optional).
// Trucco: due funzioni generic sono assignable solo se i type coincidono.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect<T>: compila solo se T e' esattamente `true`. Test di tipo statico.
type Expect<T extends true> = T;

// Esempio d'uso: se cambiassi il type a destra, la riga darebbe ERRORE TS.
type _t0 = Expect<Equal<1, 1>>; // ok, entrambi 1
// type _tErr = Expect<Equal<1, 2>>; // ERRORE TS: Type 'false' does not satisfy 'true'.

// ============================================================================
// SEZIONE 1 - Il tipo ricorsivo piu' semplice: una lista concatenata
// ============================================================================

// Una linked list: ogni nodo ha un value e un riferimento al type "se stesso".
// La ricorsione e' LAZY: `next: LinkedList<T> | null` e' valido perche' il
// compiler non "espande" LinkedList all'infinito, la risolve on demand.
interface LinkedList<T> {
  value: T;
  next: LinkedList<T> | null;
}

const lista: LinkedList<number> = {
  value: 1,
  next: { value: 2, next: { value: 3, next: null } },
};
// lista.next.next.value // => 3 (a runtime), tipo: number

// Type ricorsivo con union: un valore che puo' essere annidato in array.
type Nested<T> = T | Nested<T>[];
const n1: Nested<number> = 5; // ok
const n2: Nested<number> = [1, [2, [3, [4]]]]; // ok, annidamento arbitrario
// const nErr: Nested<number> = ["x"]; // ERRORE TS: string non e' number

// ============================================================================
// SEZIONE 2 - JSONValue: il classico type ricorsivo per rappresentare JSON
// ============================================================================

// JSON e' definito ricorsivamente: un valore JSON e' primitivo, oppure un
// array di JSONValue, oppure un oggetto le cui property sono JSONValue.
type JSONPrimitive = string | number | boolean | null;
type JSONValue =
  | JSONPrimitive
  | JSONValue[]
  | { [key: string]: JSONValue };

// Esempi validi:
const j1: JSONValue = 42;
const j2: JSONValue = "ciao";
const j3: JSONValue = [1, "due", false, null];
const j4: JSONValue = {
  badge: "UP-001",
  attivo: true,
  turni: ["P4", "P2"],
  meta: { note: null, priorita: 3 },
};

// Esempi NON validi (il type system rifiuta cio' che non e' serializzabile):
// const jErr1: JSONValue = () => 1;              // ERRORE TS: function non e' JSON
// const jErr2: JSONValue = { d: new Date() };    // ERRORE TS: Date non e' JSONValue
// const jErr3: JSONValue = undefined;            // ERRORE TS: undefined non e' JSON (usa null)

// Type guard ricorsivo abbinato: verifica a RUNTIME che un unknown sia JSON.
// Nota: il narrowing di TS segue il control flow, ma la ricorsione a runtime
// la scriviamo noi; il return type `value is JSONValue` fa il narrowing.
function isJSONValue(value: unknown): value is JSONValue {
  if (value === null) return true;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return true;
  if (Array.isArray(value)) return value.every(isJSONValue);
  if (t === "object") {
    return Object.values(value as Record<string, unknown>).every(isJSONValue);
  }
  return false;
}
// isJSONValue({ a: [1, { b: null }] }); // => true
// isJSONValue(new Date());              // => false

// ============================================================================
// SEZIONE 3 - Modello di dominio ERP (lo riusiamo negli esempi seguenti)
// ============================================================================

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";
type Orario = string; // formato "HH:MM", validato via regex /^\d{2}:\d{2}$/
type Badge = string; // formato "UP-001", validato via regex /^UP-\d{3}$/

interface Timbratura {
  entrata: Orario; // es "08:00" (orario naive-UTC, salvato come stringa)
  uscita: Orario; // es "17:00"
}

interface Dipendente {
  id: number;
  nome: string;
  badge: Badge;
  ruolo: Ruolo;
  turno: Turno;
  timbrature: Timbratura[];
}

// ============================================================================
// SEZIONE 4 - DeepReadonly: mapped type ricorsivo che congela in profondita'
// ============================================================================

// `readonly` di TS e' shallow: readonly su un array non blocca i suoi elementi.
// DeepReadonly ricorre in ogni property per rendere TUTTO immutabile.
// Meccanismo interno: mapped type `[K in keyof T]` + chiamata ricorsiva sul
// value; il conditional distingue funzioni/primitivi (base case) da oggetti.
type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>> // array -> ReadonlyArray, elementi ricorsivi
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> } // oggetto -> ricorri
    : T; // primitivo/function -> base case, resta com'e'

type DipendenteRO = DeepReadonly<Dipendente>;

const dipRO: DipendenteRO = {
  id: 1,
  nome: "Mario Rossi",
  badge: "UP-001",
  ruolo: "Operatore",
  turno: "P4",
  timbrature: [{ entrata: "08:00", uscita: "17:00" }],
};
// dipRO.nome = "Altro";                        // ERRORE TS: readonly property
// dipRO.timbrature.push({...});                // ERRORE TS: push non esiste su ReadonlyArray
// dipRO.timbrature[0].entrata = "09:00";       // ERRORE TS: readonly in profondita'!

// Test di tipo: la property annidata deve essere readonly.
type _t1 = Expect<Equal<DipendenteRO["nome"], string>>; // il type resta string
// Confronto: readonly built-in NON scende in profondita'.
type ShallowRO = Readonly<Dipendente>;
// ShallowRO permette ancora shallowRO.timbrature[0].entrata = "..." (mutabile),
// mentre DeepReadonly lo vieta: e' questa la differenza chiave.

// ============================================================================
// SEZIONE 5 - DeepPartial: rende opzionale ogni property, a ogni livello
// ============================================================================

// Utile per "patch" / update parziali di DTO annidati (es. PATCH su un
// dipendente in cui invio solo i campi cambiati, anche annidati).
type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[] // array di elementi a loro volta parziali
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> } // ogni property diventa optional
    : T;

type PatchDipendente = DeepPartial<Dipendente>;

// Posso passare solo un sottoinsieme, anche dentro le timbrature:
const patch1: PatchDipendente = { nome: "Nuovo Nome" }; // ok
const patch2: PatchDipendente = { turno: "P2", badge: "UP-042" }; // ok
const patch3: PatchDipendente = {
  timbrature: [{ entrata: "07:30" }], // ok: uscita e' optional grazie a DeepPartial
};
// const patchErr: PatchDipendente = { ruolo: "Capo" }; // ERRORE TS: "Capo" non e' un Ruolo

// GOTCHA: DeepPartial su array rende opzionali gli ELEMENTI interni, non
// impedisce l'array vuoto; se vuoi mantenere l'array intero opzionale, e' la
// property `timbrature?` a esserlo (lo e', perche' e' dentro il mapped type).

// ============================================================================
// SEZIONE 6 - Tipo albero: la struttura reparti dell'ERP (albero n-ario)
// ============================================================================

// Un reparto ha figli che sono a loro volta reparti: albero ricorsivo.
interface Reparto {
  id: number;
  nome: string;
  responsabile?: Badge;
  figli: Reparto[]; // riferimento ricorsivo allo stesso type
}

// Un'intera gerarchia costruita a mano:
const organico: Reparto = {
  id: 1,
  nome: "Produzione",
  responsabile: "UP-001",
  figli: [
    {
      id: 2,
      nome: "Poliuretano",
      figli: [
        { id: 4, nome: "Stampaggio P4", figli: [] },
        { id: 5, nome: "Stampaggio P2", figli: [] },
      ],
    },
    { id: 3, nome: "Finitura", figli: [] },
  ],
};

// Funzione ricorsiva che percorre l'albero (visita depth-first).
// Il return type e' un array piatto di nomi; la ricorsione e' sui `figli`.
function nomiReparti(nodo: Reparto): string[] {
  return [nodo.nome, ...nodo.figli.flatMap(nomiReparti)];
}
// nomiReparti(organico)
// => ["Produzione", "Poliuretano", "Stampaggio P4", "Stampaggio P2", "Finitura"]

// Cerca un reparto per id nell'albero (ritorna undefined se assente).
function trovaReparto(nodo: Reparto, id: number): Reparto | undefined {
  if (nodo.id === id) return nodo;
  for (const figlio of nodo.figli) {
    const trovato = trovaReparto(figlio, id);
    if (trovato) return trovato;
  }
  return undefined;
}
// trovaReparto(organico, 4)?.nome // => "Stampaggio P4"

// Variante generic: un albero di QUALSIASI payload, riusabile.
interface TreeNode<T> {
  value: T;
  children: TreeNode<T>[];
}
// TreeNode<Dipendente> sarebbe un organigramma di persone, stessa forma.

// ============================================================================
// SEZIONE 7 - Type-level recursion: calcolo sui type (tuple e path)
// ============================================================================

// I recursive types non servono solo per dati: sono un vero linguaggio di
// calcolo a livello di type. Esempio: invertire una tuple ricorsivamente.
type Reverse<T extends unknown[]> = T extends [infer Head, ...infer Rest]
  ? [...Reverse<Rest>, Head] // stacca Head, inverti Rest, riattacca in coda
  : []; // base case: tuple vuota

type R1 = Reverse<[1, 2, 3]>; // => [3, 2, 1]
type _t2 = Expect<Equal<R1, [3, 2, 1]>>;

// Lunghezza di una tuple via ricorsione (accumulatore in una tuple di appoggio).
type Length<T extends unknown[], Acc extends unknown[] = []> = T extends [
  unknown,
  ...infer Rest,
]
  ? Length<Rest, [unknown, ...Acc]> // consuma un elemento, cresce Acc
  : Acc["length"]; // base case: leggi length dell'accumulatore

type L1 = Length<["a", "b", "c", "d"]>; // => 4
type _t3 = Expect<Equal<L1, 4>>;

// Path type ricorsivo: tutte le "dotted paths" di un oggetto annidato.
// Utile per funzioni get(obj, "a.b.c") type-safe (es. accedere a config ERP).
type Paths<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${K}` | `${K}.${Paths<T[K]>}` // ricorsione sul sotto-oggetto
        : `${K}`;
    }[keyof T & string]
  : never;

interface Config {
  db: { host: string; porta: number };
  auth: { supabase: { url: string } };
}
type ConfigPaths = Paths<Config>;
// => "db" | "db.host" | "db.porta" | "auth" | "auth.supabase" | "auth.supabase.url"
type _t4 = Expect<Equal<Extract<ConfigPaths, "auth.supabase.url">, "auth.supabase.url">>;

// ============================================================================
// SEZIONE 8 - Esempio ERP realistico: repository con risultati "deep frozen"
// ============================================================================

// Pattern: un repository ritorna dati che il chiamante NON deve mutare.
// Usiamo DeepReadonly per garantire l'immutabilita' a compile time.
interface RepartoRepository {
  // Ritorna l'intero albero congelato: nessuno puo' modificarlo per sbaglio.
  getAlbero(): DeepReadonly<Reparto>;
  // Applica un patch parziale (DeepPartial) e ritorna il nuovo stato.
  patch(id: number, changes: DeepPartial<Reparto>): void;
}

// Implementazione mock (in-memory) per illustrare i type.
class InMemoryRepartoRepo implements RepartoRepository {
  constructor(private root: Reparto) {}

  getAlbero(): DeepReadonly<Reparto> {
    return this.root; // il narrowing del return type lo espone come immutabile
  }

  patch(id: number, changes: DeepPartial<Reparto>): void {
    const nodo = trovaReparto(this.root, id);
    if (!nodo) return;
    // Object.assign a runtime; a compile time changes e' un DeepPartial<Reparto>.
    if (changes.nome !== undefined) nodo.nome = changes.nome;
    if (changes.responsabile !== undefined) nodo.responsabile = changes.responsabile;
  }
}

const repo = new InMemoryRepartoRepo(organico);
const alberoRO = repo.getAlbero();
// alberoRO.nome = "X";               // ERRORE TS: readonly (deep)
// alberoRO.figli[0].nome = "X";      // ERRORE TS: readonly anche nei figli!
repo.patch(3, { nome: "Finitura e Collaudo" }); // ok, patch parziale valido
// repo.patch(3, { turno: "P4" });    // ERRORE TS: 'turno' non esiste su Reparto

// ============================================================================
// SEZIONE 9 - Esempio ERP realistico: validazione di un DTO JSON annidato
// ============================================================================

// Un payload di importazione turni arriva come JSONValue (da fetch/body).
// Vogliamo un type piu' preciso e una funzione che lo "restringa" in modo
// sicuro. Mostriamo come combinare JSONValue con guard mirati.
interface ImportTurniDTO {
  giorno: string; // "2026-07-08"
  righe: Array<{ badge: Badge; turno: Turno; timbrature: Timbratura[] }>;
}

const badgeRe = /^UP-\d{3}$/;
const orarioRe = /^\d{2}:\d{2}$/;

function isTurno(x: unknown): x is Turno {
  return x === "P4" || x === "P2" || x === "STD";
}

// Guard che valida struttura + regex; ritorna x is ImportTurniDTO.
function isImportTurniDTO(x: JSONValue): x is JSONValue & ImportTurniDTO {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const o = x as Record<string, JSONValue>;
  if (typeof o.giorno !== "string") return false;
  if (!Array.isArray(o.righe)) return false;
  return o.righe.every((r) => {
    if (typeof r !== "object" || r === null || Array.isArray(r)) return false;
    const rr = r as Record<string, JSONValue>;
    if (typeof rr.badge !== "string" || !badgeRe.test(rr.badge)) return false;
    if (!isTurno(rr.turno)) return false;
    if (!Array.isArray(rr.timbrature)) return false;
    return rr.timbrature.every((t) => {
      if (typeof t !== "object" || t === null || Array.isArray(t)) return false;
      const tt = t as Record<string, JSONValue>;
      return (
        typeof tt.entrata === "string" &&
        orarioRe.test(tt.entrata) &&
        typeof tt.uscita === "string" &&
        orarioRe.test(tt.uscita)
      );
    });
  });
}

// Uso: parto da un JSONValue "grezzo" e ottengo un DTO tipizzato.
function processaImport(payload: JSONValue): number {
  if (!isImportTurniDTO(payload)) {
    throw new Error("Payload non valido");
  }
  // Qui payload e' ristretto: TS conosce payload.righe, .badge, ecc.
  return payload.righe.length; // tipo: number
}
// processaImport({ giorno: "2026-07-08", righe: [] }) // => 0

// ============================================================================
// SEZIONE 10 - Esempio ERP: state machine ricorsiva della timbratura
// ============================================================================

// Uno stato che puo' contenere una "history" ricorsiva di stati precedenti.
// Utile per undo/redo o audit trail della timbratura.
type StatoTimbratura =
  | { tipo: "chiuso"; precedente: StatoTimbratura | null }
  | { tipo: "aperto"; entrata: Orario; precedente: StatoTimbratura | null };

const s0: StatoTimbratura = { tipo: "chiuso", precedente: null };
const s1: StatoTimbratura = { tipo: "aperto", entrata: "08:00", precedente: s0 };
const s2: StatoTimbratura = { tipo: "chiuso", precedente: s1 };
// Discriminated union + ricorsione: risalgo la catena precedente in sicurezza.
function profonditaStorico(s: StatoTimbratura | null): number {
  return s === null ? 0 : 1 + profonditaStorico(s.precedente);
}
// profonditaStorico(s2) // => 3

// ============================================================================
// SEZIONE 11 - GOTCHA / PITFALLS (trappole comuni con i recursive types)
// ============================================================================

// PITFALL 1 - "Type instantiation is excessively deep and possibly infinite".
// Le ricorsioni type-level hanno un limite (circa profondita' ~50/100). Un
// contatore mal fatto puo' esploderla. Soluzione: usare tuple-accumulator e
// fermarsi presto, oppure limitare la profondita' (vedi PITFALL 4).
// type Boom<N extends number, Acc extends unknown[] = []> =
//   Acc["length"] extends N ? Acc : Boom<N, [unknown, ...Acc]>;
// type X = Boom<10000>; // ERRORE TS: Type instantiation is excessively deep...

// PITFALL 2 - DeepReadonly "rompe" i tipi speciali (Date, Map, function).
// Il nostro DeepReadonly con `T extends object` mappa ANCHE Date/Map, che non
// hanno property come si aspetta -> Date diventerebbe {} (perde i metodi).
// Soluzione: aggiungere un ramo che lascia intatti i built-in.
type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type DeepReadonlySafe<T> = T extends Primitive | Function | Date
  ? T // lascia intatti primitivi, function e Date (base case allargato)
  : T extends (infer U)[]
    ? ReadonlyArray<DeepReadonlySafe<U>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonlySafe<T[K]> }
      : T;
interface ConLog {
  quando: Date;
  onTick: () => void;
}
type ConLogRO = DeepReadonlySafe<ConLog>;
type _t5 = Expect<Equal<ConLogRO["quando"], Date>>; // Date preservata, non {}

// PITFALL 3 - Union che si "distribuisce" nella ricorsione in modo indesiderato.
// Un conditional type nudo su un generic e' DISTRIBUTIVO: DeepPartial<A | B>
// applica DeepPartial ad A e a B separatamente. Di solito e' cio' che vuoi,
// ma se NON lo vuoi devi "avvolgere" in tuple per disattivare la distribuzione.
type NoDistrib<T> = [T] extends [object] ? "oggetto" : "altro";
type D1 = NoDistrib<{ a: 1 } | number>; // => "altro" (valutato in blocco)
// Con la forma nuda `T extends object ? ...` avresti avuto una union di risultati.
type _t6 = Expect<Equal<D1, "altro">>;

// PITFALL 4 - Ricorsione infinita su strutture cicliche: il TYPE va bene
// (e' lazy), ma la FUNZIONE ricorsiva a runtime va in stack overflow se il
// dato ha cicli. Soluzione: passare un Set di gia'-visitati.
function nomiRepartiSafe(nodo: Reparto, visti = new Set<number>()): string[] {
  if (visti.has(nodo.id)) return []; // taglia il ciclo a runtime
  visti.add(nodo.id);
  return [nodo.nome, ...nodo.figli.flatMap((f) => nomiRepartiSafe(f, visti))];
}
// nomiRepartiSafe(organico) // stessa uscita, ma robusto contro cicli

// ============================================================================
// SEZIONE 12 - Limitare la profondita' della ricorsione type-level (utile!)
// ============================================================================

// A volte VUOI fermare la ricorsione a N livelli (es. per non far esplodere il
// compiler o per una API che accetta solo path fino a un certo livello).
// Trucco classico: una tuple "prev" che fa da decremento di un contatore.
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// Prev[3] // => 2 : "decremento" a livello di type usando l'indice della tuple.

// DeepPartial con budget di profondita' D (default 5): oltre D, si ferma (T).
type DeepPartialN<T, D extends number = 5> = D extends 0
  ? T // budget esaurito: base case, non ricorrere oltre
  : T extends (infer U)[]
    ? DeepPartialN<U, Prev[D]>[] // decrementa D via Prev[D]
    : T extends object
      ? { [K in keyof T]?: DeepPartialN<T[K], Prev[D]> }
      : T;

// Con un albero molto profondo, DeepPartialN evita di scendere all'infinito.
type PatchReparto2 = DeepPartialN<Reparto, 3>; // solo 3 livelli resi optional
const pr: PatchReparto2 = { nome: "Solo primo livello editabile" }; // ok

// ============================================================================
// SEZIONE 13 - Bonus type-level: appiattire un JSON in coppie chiave/valore
// ============================================================================

// Combiniamo Paths (sez.7) con un lookup ricorsivo del value in quel path.
// PathValue<T, P>: dato un path "a.b.c", ricava il type del valore finale.
type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest> // scendi di un livello e ricorri sul resto
    : never
  : P extends keyof T
    ? T[P] // ultimo segmento: leggi il type
    : never;

type V1 = PathValue<Config, "db.porta">; // => number
type V2 = PathValue<Config, "auth.supabase.url">; // => string
type _t7 = Expect<Equal<V1, number>>;
type _t8 = Expect<Equal<V2, string>>;

// get() type-safe: il path e' vincolato a Paths<T>, il ritorno a PathValue.
// (Implementazione runtime minima; il valore aggiunto e' tutto nei type.)
function get<T, P extends Paths<T>>(obj: T, path: P): PathValue<T, P> {
  return path
    .split(".")
    .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)[k], obj) as PathValue<T, P>;
}
const cfg: Config = { db: { host: "127.0.0.1", porta: 5432 }, auth: { supabase: { url: "https://x" } } };
const porta = get(cfg, "db.porta"); // tipo: number, => 5432
// get(cfg, "db.inesistente"); // ERRORE TS: path non ammesso da Paths<Config>

// ============================================================================
// SEZIONE 14 - Export dei simboli locali (solo simboli definiti in questo file)
// ============================================================================

export type {
  JSONValue,
  JSONPrimitive,
  DeepReadonly,
  DeepReadonlySafe,
  DeepPartial,
  DeepPartialN,
  Reparto,
  TreeNode,
  Paths,
  PathValue,
  Equal,
  Expect,
  ImportTurniDTO,
  StatoTimbratura,
};
export {
  isJSONValue,
  nomiReparti,
  trovaReparto,
  nomiRepartiSafe,
  isImportTurniDTO,
  processaImport,
  profonditaStorico,
  get,
  InMemoryRepartoRepo,
};

/*
============================================================================
RIEPILOGO COMANDI / CONCETTI (ripasso veloce)
============================================================================
- Recursive type: un type che si riferisce a se stesso; valutato in modo LAZY.
- LinkedList<T> / TreeNode<T>: strutture ricorsive classiche (lista, albero).
- Nested<T> = T | Nested<T>[]: annidamento arbitrario via union ricorsiva.
- JSONValue: primitivi | JSONValue[] | { [k]: JSONValue } -> modella JSON.
- Type guard ricorsivo: `value is JSONValue` + ricorsione a runtime.
- DeepReadonly<T>: mapped type ricorsivo, readonly in profondita' (vs Readonly shallow).
- DeepReadonlySafe<T>: come sopra ma preserva Date/Function/primitivi (PITFALL 2).
- DeepPartial<T>: ogni property optional a ogni livello (patch/PATCH annidati).
- DeepPartialN<T, D>: DeepPartial con budget di profondita' D (usa Prev[D]).
- Albero Reparto (figli: Reparto[]): visita/ricerca ricorsiva; usa Set anti-ciclo.
- Type-level recursion: Reverse, Length (tuple), Paths, PathValue -> tipi come calcolo.
- Equal<A,B> / Expect<T extends true>: test di tipo statici nel file.
- infer + rest [Head, ...Rest]: pattern per ricorrere su tuple.
- Distributivita': conditional nudo su generic si distribuisce sulle union;
  `[T] extends [X]` la disattiva (PITFALL 3).
- Limite compiler: "Type instantiation is excessively deep" -> limita profondita' (PITFALL 1/4).
- ERP: DeepReadonly per repository immutabili, DeepPartial per patch, JSONValue
  per validare DTO import turni, state machine ricorsiva per audit timbrature.
- @decorator: NON compila con experimentalDecorators=FALSE -> solo nei commenti.
============================================================================
*/
