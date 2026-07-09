/**
 * 110_TS_Recursive_Generics_Adv.ts
 * Argomento 110 - Generics ricorsivi avanzati (ADVANCED).
 * Esploriamo tipi che si richiamano su se stessi: DeepPartial/DeepReadonly,
 * Paths<T> (percorsi punto-separati), Get<T,Path>, Flatten, Join, tuple
 * ricorsive e i LIMITI di profondita' del type checker.
 * Dominio: ERP Polyuretech (Dipendente, Timbratura, Reparto, Turno).
 * Tutto compila con: tsc --strict --target ES2022 --lib ES2022,DOM --noEmit
 */

// ============================================================
// 0. HELPER DI TEST DI TIPO (Equal / Expect)
// ============================================================
// Equal<A,B> confronta due tipi in modo "esatto" sfruttando il fatto che
// due funzioni condizionali identiche sono assegnabili solo se A e B sono
// strutturalmente identici (trucco noto: (<T>() => T extends A ? 1 : 2)).
// Perche' funziona: il compilatore confronta i due tipi condizionali
// "differiti" (non risolti) e li considera uguali solo se i rami coincidono.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect accetta solo il letterale true: se un test fallisce, ERRORE TS.
type Expect<T extends true> = T;

// Prova rapida degli helper.
type _t0 = Expect<Equal<string, string>>; // ok => true
// type _t0Bad = Expect<Equal<string, number>>; // ERRORE TS: false non e' true

// ============================================================
// 1. MODELLO ERP (mock, nessuna libreria esterna)
// ============================================================
// Questi sono tipi mock del dominio Polyuretech, definiti localmente.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";
type Badge = `UP-${number}`; // pattern /^UP-\d{3}$/ approssimato a livello tipo
type Orario = `${number}:${number}`; // pattern /^\d{2}:\d{2}$/

interface Reparto {
  id: number;
  nome: string;
  turno: Turno;
}

interface Timbratura {
  entrata: Orario; // orario naive-UTC "HH:MM"
  uscita: Orario | null;
}

interface Dipendente {
  id: number;
  nome: string;
  badge: Badge;
  ruolo: Ruolo;
  reparto: Reparto;
  ultimaTimbratura: Timbratura;
}

// ============================================================
// 2. DeepPartial<T> - rendere opzionale in profondita'
// ============================================================
// Partial<T> nativo agisce solo al primo livello. DeepPartial ricorre
// dentro gli oggetti annidati. La ricorsione avviene nel ramo "then":
// se la proprieta' e' un oggetto, riapplichiamo DeepPartial.
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

// Nota: `T extends object` cattura anche array e funzioni; per un modello
// dati semplice va bene, ma vedi GOTCHA piu' sotto per gli array.
type DipendentePatch = DeepPartial<Dipendente>;
// tipo: { id?: number; nome?: string; ...; reparto?: { id?: number; nome?: string; turno?: Turno } }

// DTO di update parziale realistico: aggiorno solo il turno del reparto.
const patch: DipendentePatch = {
  reparto: { turno: "P2" }, // ok: tutto opzionale in profondita'
};
void patch;

// ============================================================
// 3. DeepReadonly<T> - immutabilita' profonda
// ============================================================
// Stesso schema di DeepPartial ma con il modifier `readonly`.
// Utile per snapshot immutabili di stato ERP (es. stato macchina turni).
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

type DipendenteRO = DeepReadonly<Dipendente>;
const snap: DipendenteRO = {
  id: 1,
  nome: "Rossi",
  badge: "UP-001",
  ruolo: "Operatore",
  reparto: { id: 4, nome: "Estrusione", turno: "P4" },
  ultimaTimbratura: { entrata: "08:00", uscita: null },
};
// snap.reparto.turno = "STD"; // ERRORE TS: Cannot assign to 'turno' (read-only)
void snap;

// ============================================================
// 4. Join<Parti, Sep> - concatenare tuple di stringhe
// ============================================================
// Ricorsione sulle tuple con pattern [Head, ...Tail]. Il caso base e' la
// tupla vuota (=> "") e il caso con un solo elemento (evita separatore finale).
type Join<
  Parts extends readonly string[],
  Sep extends string = "."
> = Parts extends readonly []
  ? ""
  : Parts extends readonly [infer Only extends string]
    ? Only
    : Parts extends readonly [
          infer Head extends string,
          ...infer Rest extends string[]
        ]
      ? `${Head}${Sep}${Join<Rest, Sep>}`
      : string;

type J1 = Join<["reparto", "turno"]>; // tipo: "reparto.turno"
type J2 = Join<["a", "b", "c"], "/">; // tipo: "a/b/c"
type J3 = Join<[]>; // tipo: ""
type _tJoin = Expect<Equal<J1, "reparto.turno">>; // ok

// ============================================================
// 5. Split<S, Sep> - operazione inversa di Join
// ============================================================
// Analizziamo la stringa con template literal + `infer`. Ricorsione sul
// resto della stringa finche' non troviamo piu' il separatore.
type Split<
  S extends string,
  Sep extends string = "."
> = S extends `${infer Head}${Sep}${infer Tail}`
  ? [Head, ...Split<Tail, Sep>]
  : [S];

type S1 = Split<"reparto.turno">; // tipo: ["reparto", "turno"]
type S2 = Split<"a/b/c", "/">; // tipo: ["a", "b", "c"]
type _tSplit = Expect<Equal<S1, ["reparto", "turno"]>>; // ok
// Round-trip: Join e Split sono inversi (per stringhe senza separatore interno).
type _tRound = Expect<Equal<Join<Split<"reparto.turno">>, "reparto.turno">>; // ok

// ============================================================
// 6. Paths<T> - tutti i percorsi punto-separati di un oggetto
// ============================================================
// Genera le "chiavi profonde" come "reparto.turno", "ultimaTimbratura.entrata".
// Meccanismo: per ogni chiave K, se il valore e' un oggetto ricorriamo e
// prependiamo `${K}.`; altrimenti emettiamo solo K. La union nasce dalla
// distributivita' del mapped type su keyof T.
// `& string` filtra le chiavi number/symbol (i template literal accettano
// solo string|number|bigint|boolean, ma vogliamo path testuali puliti).
type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type Paths<T> = T extends Primitive
  ? never
  : {
      [K in keyof T & string]: T[K] extends Primitive
        ? K
        : T[K] extends object
          ? K | `${K}.${Paths<T[K]>}`
          : K;
    }[keyof T & string];

type DipPaths = Paths<Dipendente>;
// tipo (union): "id" | "nome" | "badge" | "ruolo" | "reparto" |
//   "reparto.id" | "reparto.nome" | "reparto.turno" |
//   "ultimaTimbratura" | "ultimaTimbratura.entrata" | "ultimaTimbratura.uscita"

// Verifichiamo che alcuni path esistano nella union.
type _tP1 = Expect<Equal<Extract<DipPaths, "reparto.turno">, "reparto.turno">>; // ok
const p: DipPaths = "ultimaTimbratura.entrata"; // ok: e' un path valido
// const pBad: DipPaths = "reparto.inesistente"; // ERRORE TS: non e' un path noto
void p;

// ============================================================
// 7. Get<T, Path> - leggere il tipo a un percorso
// ============================================================
// Inverso di Paths: dato "reparto.turno" restituisce Turno. Ricorsione:
// separiamo Head.Tail, indicizziamo T[Head] e ricorriamo su Tail.
type Get<T, Path extends string> = Path extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T
    ? Get<T[Head], Tail>
    : never
  : Path extends keyof T
    ? T[Path]
    : never;

type G1 = Get<Dipendente, "reparto.turno">; // tipo: Turno
type G2 = Get<Dipendente, "ultimaTimbratura.entrata">; // tipo: Orario
type G3 = Get<Dipendente, "nome">; // tipo: string
type G4 = Get<Dipendente, "reparto.inesistente">; // tipo: never
type _tG1 = Expect<Equal<G1, Turno>>; // ok
type _tG4 = Expect<Equal<G4, never>>; // ok

// Esempio ERP: getter type-safe generico su un repository in-memory.
declare function getAt<T, P extends Paths<T>>(obj: T, path: P): Get<T, P>;
const dip: Dipendente = {
  id: 1,
  nome: "Bianchi",
  badge: "UP-002",
  ruolo: "Admin",
  reparto: { id: 2, nome: "Taglio", turno: "STD" },
  ultimaTimbratura: { entrata: "07:30", uscita: "16:30" },
};
const turnoLetto = getAt(dip, "reparto.turno"); // tipo: Turno
const entrataLetta = getAt(dip, "ultimaTimbratura.entrata"); // tipo: Orario
// const boom = getAt(dip, "reparto.zzz"); // ERRORE TS: path non assegnabile a Paths<Dipendente>
void turnoLetto;
void entrataLetta;

// ============================================================
// 8. Flatten<T> - appiattire un oggetto in { "a.b": V }
// ============================================================
// Combina Paths e Get: costruiamo un record mappato su tutti i path,
// dove il valore e' il tipo letto a quel path. Otteniamo la vista "flat".
type Flatten<T> = {
  [P in Paths<T>]: Get<T, P>;
};

type DipFlat = Flatten<Dipendente>;
// tipo: {
//   "id": number; "nome": string; "badge": Badge; "ruolo": Ruolo;
//   "reparto": Reparto; "reparto.id": number; "reparto.nome": string;
//   "reparto.turno": Turno; "ultimaTimbratura": Timbratura;
//   "ultimaTimbratura.entrata": Orario; "ultimaTimbratura.uscita": Orario | null;
// }
type _tFlat = Expect<Equal<DipFlat["reparto.turno"], Turno>>; // ok

// ============================================================
// 9. FlattenArray (tuple ricorsive) - appiattire array annidati
// ============================================================
// Diverso da Flatten<oggetto>: qui appiattiamo TUPLE annidate a un livello
// piatto. Ricorsione [Head, ...Tail]: se Head e' un array ricorriamo dentro.
type FlattenArray<T extends readonly unknown[]> = T extends readonly [
  infer Head,
  ...infer Tail
]
  ? Head extends readonly unknown[]
    ? [...FlattenArray<Head>, ...FlattenArray<Tail>]
    : [Head, ...FlattenArray<Tail>]
  : [];

type FA1 = FlattenArray<[1, [2, 3], [[4], 5]]>; // tipo: [1, 2, 3, 4, 5]
type _tFA = Expect<Equal<FA1, [1, 2, 3, 4, 5]>>; // ok

// ============================================================
// 10. Tuple ricorsive: Length, Reverse, Push, BuildTuple
// ============================================================
// Length di una tupla e' la property `length` (letterale numerico).
type Length<T extends readonly unknown[]> = T["length"];
type L1 = Length<["P4", "P2", "STD"]>; // tipo: 3

// Reverse: sposta Head in coda ricorsivamente.
type Reverse<T extends readonly unknown[]> = T extends readonly [
  infer Head,
  ...infer Tail
]
  ? [...Reverse<Tail>, Head]
  : [];
type R1 = Reverse<["P4", "P2", "STD"]>; // tipo: ["STD", "P2", "P4"]
type _tR = Expect<Equal<R1, ["STD", "P2", "P4"]>>; // ok

// BuildTuple<N>: costruisce una tupla di lunghezza N accumulando elementi.
// Usato per aritmetica type-level (contatori di profondita').
type BuildTuple<N extends number, Acc extends unknown[] = []> =
  Acc["length"] extends N ? Acc : BuildTuple<N, [...Acc, unknown]>;
type BT3 = BuildTuple<3>; // tipo: [unknown, unknown, unknown]
type _tBT = Expect<Equal<Length<BT3>, 3>>; // ok

// Add<A,B> a livello di tipo: concateno due tuple e leggo la length.
type Add<A extends number, B extends number> = Length<
  [...BuildTuple<A>, ...BuildTuple<B>]
>;
type Sum = Add<2, 3>; // tipo: 5
type _tAdd = Expect<Equal<Sum, 5>>; // ok

// ============================================================
// 11. LIMITI DI PROFONDITA' - contatore per fermare la ricorsione
// ============================================================
// Il compilatore ha un limite di profondita' di istanziazione (circa 50)
// e di ricorsione condizionale. Per DeepPartial su strutture cicliche o
// molto profonde conviene un contatore di profondita' esplicito.
// Prev<N> ottiene N-1 usando una tupla-indice: [-1 sentinel, 0,1,2,...].
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// DeepPartialLimited ferma la ricorsione quando Depth arriva a 0.
// Depth default 6: oltre non scende, restituisce il tipo cosi' com'e'.
type DeepPartialLimited<T, Depth extends number = 6> = Depth extends 0
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartialLimited<T[K], Prev[Depth]> }
    : T;

type DP2 = DeepPartialLimited<Dipendente, 1>;
// A profondita' 1 solo il primo livello diventa opzionale-ricorsivo,
// il livello successivo (reparto) resta col tipo pieno.
const dp2: DP2 = { nome: "X", reparto: { id: 9, nome: "M", turno: "STD" } };
// Nota: reparto qui va fornito INTERO perche' Depth e' esaurito.
void dp2;

// Perche' serve: senza freno, un tipo auto-referente esploderebbe.
interface Nodo {
  valore: string;
  figli: Nodo[]; // struttura potenzialmente infinita
}
type NodoPatch = DeepPartialLimited<Nodo, 3>; // ok: si ferma a 3 livelli
void ({} as NodoPatch);

// ============================================================
// 12. Esempio ERP realistico: PathValue update type-safe
// ============================================================
// Simuliamo un repository che aggiorna un singolo campo profondo di un
// Dipendente in modo type-safe: la coppia (path, value) e' vincolata.
type UpdateOp<T> = {
  [P in Paths<T>]: { path: P; value: Get<T, P> };
}[Paths<T>];

declare function applyUpdate<T>(entity: T, op: UpdateOp<T>): T;

const op1: UpdateOp<Dipendente> = {
  path: "reparto.turno",
  value: "P2", // deve essere Turno, coerente col path
};
// const opBad: UpdateOp<Dipendente> = { path: "reparto.turno", value: "XX" };
// ERRORE TS: "XX" non e' assegnabile a Turno (il value e' vincolato dal path)
applyUpdate(dip, op1);
void op1;

// ============================================================
// 13. Esempio ERP: validazione path di ordinamento (query builder)
// ============================================================
// Un endpoint di lista accetta un campo di sort che DEVE essere un path
// valido del modello. Il tipo Paths garantisce l'esaustivita' a compile time.
interface ListQuery<T> {
  sortBy: Paths<T>;
  dir: "asc" | "desc";
}
const query: ListQuery<Dipendente> = {
  sortBy: "ultimaTimbratura.entrata",
  dir: "asc",
};
// const queryBad: ListQuery<Dipendente> = { sortBy: "foo.bar", dir: "asc" };
// ERRORE TS: "foo.bar" non e' un path valido di Dipendente
void query;

// ============================================================
// 14. Esempio ERP: stato macchina turni con DeepReadonly snapshot
// ============================================================
// Uno stato immutabile di una postazione: una volta creato lo snapshot,
// nessun campo (nemmeno annidato) e' modificabile -> sicurezza sui reducer.
interface StatoPostazione {
  reparto: Reparto;
  operatore: { badge: Badge; ruolo: Ruolo };
  aperturaTurno: Orario;
}
type StatoImmutabile = DeepReadonly<StatoPostazione>;
function reducer(s: StatoImmutabile): StatoImmutabile {
  // s.operatore.ruolo = "Admin"; // ERRORE TS: read-only in profondita'
  // Ritorniamo un nuovo stato (pattern immutabile).
  return { ...s, aperturaTurno: "06:00" as Orario };
}
void reducer;

// ============================================================
// 15. GOTCHA / PITFALLS
// ============================================================
//
// GOTCHA 1: `T extends object` inghiotte gli ARRAY.
// DeepPartial<string[]> diventa un oggetto con chiavi numeriche opzionali,
// non un array. Se vuoi preservare gli array trattali PRIMA:
type DeepPartialArr<T> = T extends (infer U)[]
  ? DeepPartialArr<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartialArr<T[K]> }
    : T;
type _tArr = Expect<Equal<DeepPartialArr<string[]>, string[]>>; // ok, resta array
//
// GOTCHA 2: le FUNZIONI sono `object`. DeepReadonly<() => void> proverebbe a
// mappare le chiavi di una funzione (di solito nessuna) restituendo {}.
// Soluzione: escludere le funzioni con un ramo `T extends Function ? T : ...`.
type DeepReadonlySafe<T> = T extends (...a: never[]) => unknown
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonlySafe<T[K]> }
    : T;
type _tFn = Expect<Equal<DeepReadonlySafe<() => number>, () => number>>; // ok
//
// GOTCHA 3: Paths su tipi ricorsivi (Nodo) genera errore di profondita'
// "Type instantiation is excessively deep and possibly infinite".
// type NodoPaths = Paths<Nodo>; // ERRORE TS: instantiation excessively deep
// Soluzione: limitare la profondita' (come al punto 11) o non usare Paths
// su strutture auto-referenti.
//
// GOTCHA 4: chiavi opzionali in Get. Se una property e' opzionale (V | undefined)
// Get la restituisce con undefined incluso; ricordarsi di gestirlo a runtime.
// Inoltre `[K in keyof T & string]` scarta chiavi number/symbol: se il tuo
// oggetto usa chiavi numeriche i loro path NON compaiono in Paths<T>.

// ============================================================
// 16. EXPORT locali (solo simboli di questo file)
// ============================================================
export type {
  Equal,
  Expect,
  DeepPartial,
  DeepReadonly,
  Join,
  Split,
  Paths,
  Get,
  Flatten,
  FlattenArray,
  Reverse,
  BuildTuple,
  Add,
  DeepPartialLimited,
  UpdateOp,
  ListQuery,
  DeepReadonly as DeepReadonlyAlias,
};
export { getAt, applyUpdate, reducer };

/*
 * ============================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================
 * - Generic ricorsivo: un tipo che si richiama su T[K] / Tail.
 * - DeepPartial<T>: opzionale in profondita' (ricorsione nel ramo then).
 * - DeepReadonly<T>: readonly in profondita'; usalo per snapshot immutabili.
 * - Equal<A,B> / Expect<T extends true>: test di tipo a compile time.
 * - Join<Parts,Sep> / Split<S,Sep>: tuple<->stringa, inversi tra loro.
 * - Paths<T>: union dei percorsi punto-separati ("a.b.c").
 * - Get<T,Path>: tipo del valore a un path; inverso di Paths.
 * - Flatten<T>: record { "a.b": V } via Paths + Get.
 * - FlattenArray<T>: appiattisce tuple annidate ([H,...T] ricorsivo).
 * - Tuple ricorsive: Length, Reverse, BuildTuple, Add (aritmetica type-level).
 * - Limiti profondita': contatore Prev[Depth] per fermare la ricorsione (~50).
 * - Distributivita': mapped type su keyof genera union di path.
 * - Pattern [Head, ...Tail] e `${infer H}${Sep}${infer T}` per ricorsione.
 * - GOTCHA: array/funzioni sono object; tipi ciclici -> "excessively deep".
 * - ERP: UpdateOp (path+value vincolati), ListQuery.sortBy, StatoImmutabile.
 * ============================================================
 */
