/**
 * File 61 - ADV Generics deep (Generics avanzati in profondita')
 *
 * In questo file esploriamo i meccanismi PIU' potenti dei generic in TypeScript:
 * inferenza avanzata (infer, ordine di inferenza), generic con default E constraint
 * insieme, higher-order generics, un cenno alla distributivita' delle conditional
 * type, generic "currying" (funzioni che ritornano funzioni generiche) e alcuni
 * pattern realistici ispirati all'ERP Polyuretech (repository generico, DTO,
 * validazione timbrature). Obiettivo: capire il "perche'" del type system, non
 * solo la sintassi. Tutto compila con tsc --strict, target ES2022.
 */

// ============================================================================
// SEZIONE 0 - Helper di test a livello di tipo (Equal / Expect)
// ----------------------------------------------------------------------------
// Definiamo qui gli helper che useremo per "testare" i tipi. Non sono librerie
// esterne: sono type utility locali. Equal e' il trucco classico basato sulla
// varianza dei parametri di funzione (due tipi sono uguali se e solo se le due
// funzioni condizionali collassano allo stesso ramo).

// Equal<A, B> => true se A e B sono ESATTAMENTE lo stesso type, altrimenti false.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect accetta solo il literal true: se un test fallisce, la riga non compila.
type Expect<T extends true> = T;

// Piccola prova d'uso degli helper.
type _t0 = Expect<Equal<string, string>>; // ok
// ERRORE TS: Type 'false' does not satisfy the constraint 'true'.
// type _tX = Expect<Equal<string, number>>;

// ============================================================================
// SEZIONE 1 - Dominio ERP Polyuretech (entita' di base riusate ovunque)
// ----------------------------------------------------------------------------
// Definiamo le entita' del dominio. Sono interfacce mock locali: NON importiamo
// nulla da Prisma o altri pacchetti, riproduciamo solo la forma dei dati.

// Ruoli come union di string literal: base per molti esempi di distributivita'.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Turni possibili in fabbrica.
type Turno = "P4" | "P2" | "STD";

// Un dipendente. badge ha forma "UP-001" (validata a runtime con regex piu' sotto).
interface Dipendente {
  readonly id: number;
  nome: string;
  badge: `UP-${number}` | string; // template literal type: documenta il pattern
  ruolo: Ruolo;
  turno: Turno;
}

// Una timbratura: orari come stringhe "HH:MM" (formato naive-UTC del nostro ERP).
interface Timbratura {
  readonly id: number;
  dipendenteId: number;
  entrata: string; // "08:00"
  uscita: string | null; // null finche' non si esce
}

// Un reparto.
interface Reparto {
  readonly id: number;
  nome: string;
  responsabileId: number;
}

// ============================================================================
// SEZIONE 2 - Ripasso rapido + constraint (K extends keyof T)
// ----------------------------------------------------------------------------

// La property piu' famosa: prendere un valore in modo type-safe da un oggetto.
// K e' vincolato (constraint) a essere una chiave di T: cosi' il return e' T[K].
function getField<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const d1: Dipendente = {
  id: 1,
  nome: "Mario",
  badge: "UP-001",
  ruolo: "Operatore",
  turno: "P4",
};

const nomeD1 = getField(d1, "nome"); // tipo: string
const ruoloD1 = getField(d1, "ruolo"); // tipo: Ruolo
// ERRORE TS: Argument of type '"stipendio"' is not assignable to parameter of type keyof Dipendente.
// const boom = getField(d1, "stipendio");

// ============================================================================
// SEZIONE 3 - Generic con DEFAULT + CONSTRAINT insieme
// ----------------------------------------------------------------------------
// Un type parameter puo' avere sia un constraint (extends) sia un default (=).
// Sintassi: <T extends Constraint = Default>. Il default DEVE soddisfare il
// constraint, altrimenti errore. Utile quando vuoi un tipo comodo "di serie"
// ma permettere override espliciti.

// ApiResponse: il payload di default e' unknown, ma vincolato a essere un object.
interface ApiResponse<T extends object = Record<string, unknown>> {
  ok: boolean;
  statusCode: number;
  data: T;
}

// Uso senza argomento: T = Record<string, unknown> (il default).
const generico: ApiResponse = {
  ok: true,
  statusCode: 200,
  data: { qualsiasi: "cosa" },
};
void generico;

// Uso con argomento esplicito che rispetta il constraint (Dipendente e' un object).
const tipata: ApiResponse<Dipendente> = {
  ok: true,
  statusCode: 200,
  data: d1,
};
void tipata;

// ERRORE TS: il default o l'argomento deve essere un object; string non lo e'.
// type Rotta = ApiResponse<string>;

// Esempio combinato con inferenza: default + constraint in una funzione factory.
// TId di default e' number (id numerici nel nostro ERP) ma vincolato a
// string | number (chiavi ammesse per una PK).
function makeEntity<
  TData extends object,
  TId extends string | number = number,
>(data: TData, id: TId): { id: TId } & TData {
  return { id, ...data };
}

const e1 = makeEntity({ nome: "Reparto A" }, 10); // id inferito number
const e2 = makeEntity({ nome: "Reparto B" }, "R-99"); // id inferito string
// e1.id: number ; e2.id: string

// ============================================================================
// SEZIONE 4 - Inferenza avanzata con `infer`
// ----------------------------------------------------------------------------
// `infer` introduce una nuova type variable DENTRO una conditional type: dice al
// compiler "estrai questa parte e chiamala X". E' il cuore dell'inferenza avanzata.

// 4.1 Estrarre il tipo di ritorno di una funzione (come il ReturnType built-in).
type MyReturn<F> = F extends (...args: never[]) => infer R ? R : never;

type R1 = MyReturn<() => Dipendente>; // tipo: Dipendente
type R2 = MyReturn<(x: number) => string>; // tipo: string
type R3 = MyReturn<number>; // tipo: never (non e' una funzione)

// 4.2 Estrarre il tipo degli argomenti (tuple). infer su una rest position.
type MyParams<F> = F extends (...args: infer A) => unknown ? A : never;
type P1 = MyParams<(id: number, nome: string) => void>; // tipo: [id: number, nome: string]

// 4.3 Estrarre l'elemento di un array. Utile in repository che ritornano liste.
type ElementOf<T> = T extends readonly (infer E)[] ? E : never;
type El1 = ElementOf<Timbratura[]>; // tipo: Timbratura
type El2 = ElementOf<readonly Ruolo[]>; // tipo: Ruolo

// 4.4 Estrarre il tipo "unwrapped" di una Promise (ricorsivo: gestisce Promise annidate).
type Awaited2<T> = T extends Promise<infer U> ? Awaited2<U> : T;
type A1 = Awaited2<Promise<Dipendente>>; // tipo: Dipendente
type A2 = Awaited2<Promise<Promise<number>>>; // tipo: number (ricorsione)
type A3 = Awaited2<string>; // tipo: string (nessuna Promise)

// 4.5 GOTCHA sull'ordine di inferenza: piu' occorrenze di infer nella stessa
//     posizione covariante -> UNION; in posizione contravariante -> INTERSECTION.
type InferUnion<T> = T extends { a: infer U; b: infer U } ? U : never;
type IU = InferUnion<{ a: string; b: number }>; // tipo: string | number (union)

type InferInter<T> = T extends {
  fn: (a: infer U) => void;
  gn: (a: infer U) => void;
}
  ? U
  : never;
type II = InferInter<{ fn: (a: string) => void; gn: (a: number) => void }>;
// tipo: string & number  => in pratica never (contravarianza -> intersection)

// ============================================================================
// SEZIONE 5 - Distributivita' delle conditional type (cenno + controllo)
// ----------------------------------------------------------------------------
// Quando il tipo controllato (checked type) e' un "naked type parameter" (cioe'
// il parametro nudo, senza wrapping) e riceve una UNION, la conditional
// DISTRIBUISCE su ogni membro della union e poi riunisce i risultati.

// 5.1 Distributiva: T viene testato membro per membro.
type ToArray<T> = T extends unknown ? T[] : never;
type Distrib = ToArray<string | number>; // tipo: string[] | number[]
//  perche' T "nudo" distribuisce: (string extends unknown ? string[] : ...) |
//                                 (number extends unknown ? number[] : ...)

// 5.2 NON distributiva: avvolgiamo T in una tupla [T] per disattivare la distribuzione.
type ToArrayNonDist<T> = [T] extends [unknown] ? T[] : never;
type NonDistrib = ToArrayNonDist<string | number>; // tipo: (string | number)[]
//  qui [T] NON e' piu' un naked type parameter -> valuta la union tutta insieme.

// 5.3 Applicazione ERP: filtrare dalla union Ruolo i ruoli "umani" (no display).
//     Exclude<T, U> = T extends U ? never : T  (built-in, ma qui distribuisce).
type RuoloUmano = Exclude<Ruolo, "QrDisplay">; // tipo: "SuperAdmin" | "Admin" | "Operatore"
type _t5 = Expect<Equal<RuoloUmano, "SuperAdmin" | "Admin" | "Operatore">>;

// 5.4 Trappola classica: Exclude su union con [] per evitare distribuzione.
//     Se volessi sapere "l'intera union Ruolo e' assegnabile a string?" uso [].
type UnioneEStringa = [Ruolo] extends [string] ? true : false; // tipo: true
type _t6 = Expect<Equal<UnioneEStringa, true>>;

// ============================================================================
// SEZIONE 6 - Higher-order generics (tipi/funzioni che astraggono altri generic)
// ----------------------------------------------------------------------------
// "Higher-order" = generici che prendono o producono altri generici. In TS non
// esistono "higher-kinded types" nativi, ma emuliamo il pattern con interfacce
// generiche passate come vincolo o composte tra loro.

// 6.1 Higher-order su FUNZIONI: una funzione generica che ne compone due,
//     preservando l'inferenza attraverso i tipi intermedi A -> B -> C.
function compose<A, B, C>(
  f: (a: A) => B,
  g: (b: B) => C,
): (a: A) => C {
  return (a: A) => g(f(a));
}

const badgeNumero = (d: Dipendente): string => d.badge; // Dipendente -> string
const lunghezza = (s: string): number => s.length; // string -> number
const badgeLen = compose(badgeNumero, lunghezza); // (d: Dipendente) => number
// badgeLen(d1) => number

// 6.2 Higher-order su TIPI: un mapper generico che applica un "type function"
//     rappresentato come oggetto con un campo che descrive il risultato.
//     Emuliamo un HKT leggero: un "container" con metodo map generico.
interface Functor<T> {
  readonly value: T;
  map<U>(fn: (v: T) => U): Functor<U>; // map ritorna lo stesso "kind" con U
}

function box<T>(value: T): Functor<T> {
  return {
    value,
    map<U>(fn: (v: T) => U): Functor<U> {
      return box(fn(value));
    },
  };
}

const boxed = box(d1).map((d) => d.nome).map((n) => n.toUpperCase());
// boxed: Functor<string> ; boxed.value: string

// 6.3 Higher-order come CONSTRAINT: T deve essere un costruttore generico di
//     "wrapper". Qui il parametro e' vincolato a produrre un certo shape.
type Wrapper<T> = { readonly wrapped: T };
function unwrap<W extends Wrapper<unknown>>(w: W): W["wrapped"] {
  return w.wrapped;
}
const u1 = unwrap({ wrapped: 123 }); // tipo: 123 (literal, perche' W e' inferito preciso)
void u1;

// ============================================================================
// SEZIONE 7 - Generic currying (funzioni che ritornano funzioni generiche)
// ----------------------------------------------------------------------------
// A volte vogliamo "fissare" un type parameter e lasciare che gli altri vengano
// inferiti dopo. Il trucco: una funzione che prende esplicitamente un tipo e
// ritorna una SECONDA funzione generica sui restanti.

// 7.1 Problema: in una singola call TS inferisce TUTTI i parametri o NESSUNO
//     esplicitamente. Il currying separa "fisso T qui" da "inferisci K dopo".
function pluckFactory<T>() {
  // Ritorna una funzione generica su K (chiave), con T gia' fissato.
  return function <K extends keyof T>(key: K) {
    return (obj: T): T[K] => obj[key];
  };
}

// Fisso T = Dipendente, poi le chiamate successive inferiscono K dai literal.
const pluckDip = pluckFactory<Dipendente>();
const getRuolo = pluckDip("ruolo"); // (obj: Dipendente) => Ruolo
const getNome = pluckDip("nome"); // (obj: Dipendente) => string
const rr = getRuolo(d1); // tipo: Ruolo
void rr;
// ERRORE TS: "xyz" non e' una keyof Dipendente.
// const bad = pluckDip("xyz");

// 7.2 Currying con default: la prima funzione fissa il "tag", la seconda i dati.
//     Utile per action creator (stile Redux) type-safe senza librerie.
function actionCreator<TType extends string>(type: TType) {
  return function <TPayload = void>() {
    return (payload: TPayload): { type: TType; payload: TPayload } => ({
      type,
      payload,
    });
  };
}

const timbraEntrata = actionCreator("TIMBRA_ENTRATA")<{ dipendenteId: number }>();
const azione = timbraEntrata({ dipendenteId: 1 });
// azione: { type: "TIMBRA_ENTRATA"; payload: { dipendenteId: number } }

// ============================================================================
// SEZIONE 8 - Mapped + conditional insieme (calcolo a livello di tipo)
// ----------------------------------------------------------------------------
// Combiniamo mapped type, key remapping (as) e conditional per "calcolare" tipi.

// 8.1 Estrarre solo le chiavi il cui valore e' di un certo tipo (es. le string).
type KeysOfType<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never;
}[keyof T];

type ChiaviStringDip = KeysOfType<Dipendente, string>; // tipo: "nome" | "badge" | ...
//  Nota: badge e' `UP-${number}` | string quindi resta stringa; id (number) escluso.

// 8.2 Generare getter type-safe da un'entita' con key remapping (template literal).
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type DipGetters = Getters<Pick<Dipendente, "nome" | "ruolo">>;
// tipo: { getNome: () => string; getRuolo: () => Ruolo }

// 8.3 DTO: rendere opzionali solo alcune chiavi (patch parziale di timbratura).
//     PartialBy<T, K> = tutto T ma con le chiavi K rese optional.
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type PatchTimbratura = PartialBy<Timbratura, "uscita">;
// tipo: { id: number; dipendenteId: number; entrata: string; uscita?: string | null }

// ============================================================================
// SEZIONE 9 - Esempio ERP realistico: Repository generico AVANZATO
// ----------------------------------------------------------------------------
// Costruiamo passo dopo passo un repository generico con constraint sull'entita'
// (deve avere una PK), default sul tipo di id, e metodi che sfruttano keyof.

// 9.1 Un'entita' e' qualsiasi cosa con un id. Vincoliamo con questo shape base.
interface HasId<TId extends string | number = number> {
  readonly id: TId;
}

// 9.2 Il repository: T deve estendere HasId; ricaviamo il tipo dell'id da T["id"].
//     Usiamo default TId = number ma lo leghiamo a T con una constraint indiretta.
interface Repository<T extends HasId<TId>, TId extends string | number = number> {
  getById(id: TId): T | undefined;
  getAll(): readonly T[];
  create(data: Omit<T, "id">): T; // niente id in input: lo genera il repo
  update(id: TId, patch: Partial<Omit<T, "id">>): T | undefined;
  remove(id: TId): boolean;
  // query type-safe: filtra per una qualsiasi chiave/valore dell'entita'.
  findBy<K extends keyof T>(key: K, value: T[K]): readonly T[];
}

// 9.3 Implementazione in-memory generica (una sola classe per QUALSIASI entita').
class InMemoryRepository<
  T extends HasId<TId>,
  TId extends string | number = number,
> implements Repository<T, TId> {
  private items: T[] = [];
  private seq = 0;

  constructor(private readonly makeId: (n: number) => TId) {}

  getById(id: TId): T | undefined {
    return this.items.find((it) => it.id === id);
  }

  getAll(): readonly T[] {
    return this.items;
  }

  create(data: Omit<T, "id">): T {
    const id = this.makeId(++this.seq);
    // Cast controllato: uniamo id + data per ricostruire T. E' il classico punto
    // in cui serve un'asserzione perche' TS non sa che {id} & Omit<T,"id"> === T.
    const entity = { id, ...data } as unknown as T;
    this.items.push(entity);
    return entity;
  }

  update(id: TId, patch: Partial<Omit<T, "id">>): T | undefined {
    const found = this.getById(id);
    if (!found) return undefined;
    Object.assign(found, patch);
    return found;
  }

  remove(id: TId): boolean {
    const before = this.items.length;
    this.items = this.items.filter((it) => it.id !== id);
    return this.items.length < before;
  }

  findBy<K extends keyof T>(key: K, value: T[K]): readonly T[] {
    return this.items.filter((it) => it[key] === value);
  }
}

// 9.4 Uso: repository di Dipendente con id numerico auto-incrementale.
const repoDip = new InMemoryRepository<Dipendente>((n) => n);
const nuovo = repoDip.create({
  nome: "Luigi",
  badge: "UP-002",
  ruolo: "Admin",
  turno: "STD",
});
// nuovo: Dipendente (con id assegnato)
const soloAdmin = repoDip.findBy("ruolo", "Admin"); // tipo: readonly Dipendente[]
// ERRORE TS: "Manager" non e' assegnabile a Ruolo.
// const err = repoDip.findBy("ruolo", "Manager");
void soloAdmin;

// 9.5 Uso con id string: repository di reparto con id tipo "R-1".
const repoReparto = new InMemoryRepository<Reparto & HasId<string>, string>(
  (n) => `R-${n}`,
);
void repoReparto;

// ============================================================================
// SEZIONE 10 - Esempio ERP: validazione + type guard generico
// ----------------------------------------------------------------------------
// Pattern: un validatore generico che, se passa, NARROW il tipo (type predicate).

// 10.1 Regex del dominio (documentate nelle note del corso).
const RE_ORARIO = /^\d{2}:\d{2}$/; // "HH:MM"
const RE_BADGE = /^UP-\d{3}$/; // "UP-001"

// 10.2 Un "Validator<T>" e' una funzione che dato unknown dice se e' T (type guard).
type Validator<T> = (value: unknown) => value is T;

// 10.3 Combinatore generico: crea un validator da una regex per branded string.
//      Usiamo un branded type per distinguere "OrarioValido" da una string qualsiasi.
type Branded<T, B extends string> = T & { readonly __brand: B };
type OrarioValido = Branded<string, "OrarioValido">;
type BadgeValido = Branded<string, "BadgeValido">;

function regexValidator<T extends string>(re: RegExp): Validator<T> {
  return (value: unknown): value is T =>
    typeof value === "string" && re.test(value);
}

const isOrario = regexValidator<OrarioValido>(RE_ORARIO);
const isBadge = regexValidator<BadgeValido>(RE_BADGE);

// 10.4 Uso: dopo il guard, il tipo e' ristretto al branded type.
function stampaOrario(input: unknown): void {
  if (isOrario(input)) {
    // Qui input: OrarioValido (branded). Non e' piu' unknown.
    const _ok: OrarioValido = input; // ok
    void _ok;
  }
}
void stampaOrario;

// 10.5 Guard generico su array: filtra e NARROW gli elementi in un colpo solo.
function filterValid<T>(arr: readonly unknown[], guard: Validator<T>): T[] {
  return arr.filter(guard) as T[];
}
const orariGrezzi: unknown[] = ["08:00", "notte", "17:30", 42];
const orariValidi = filterValid(orariGrezzi, isOrario); // tipo: OrarioValido[]
void orariValidi;
void isBadge;

// ============================================================================
// SEZIONE 11 - Esempio ERP: state machine tipizzata (union discriminata + generic)
// ----------------------------------------------------------------------------
// Modelliamo lo stato di una timbratura come state machine type-safe.

// 11.1 Stati come union discriminata sul campo `stato`.
type StatoTimbratura =
  | { stato: "aperta"; entrata: string }
  | { stato: "chiusa"; entrata: string; uscita: string }
  | { stato: "annullata"; motivo: string };

// 11.2 Estrarre uno stato specifico dalla union con un helper generico.
//      Extract distribuisce e tiene solo i membri col discriminante richiesto.
type StatoConTag<S extends StatoTimbratura["stato"]> = Extract<
  StatoTimbratura,
  { stato: S }
>;
type SoloChiusa = StatoConTag<"chiusa">;
// tipo: { stato: "chiusa"; entrata: string; uscita: string }

// 11.3 Transizione type-safe: da "aperta" a "chiusa" richiede una uscita.
function chiudi(t: StatoConTag<"aperta">, uscita: string): StatoConTag<"chiusa"> {
  return { stato: "chiusa", entrata: t.entrata, uscita };
}
const aperta: StatoConTag<"aperta"> = { stato: "aperta", entrata: "08:00" };
const chiusa = chiudi(aperta, "17:00"); // tipo: SoloChiusa
void chiusa;

// 11.4 Exhaustiveness check con `never`: se aggiungi uno stato e dimentichi un
//      case, il compiler segnala l'errore sul parametro `never`.
function describeStato(s: StatoTimbratura): string {
  switch (s.stato) {
    case "aperta":
      return `Entrata ${s.entrata}, in corso`;
    case "chiusa":
      return `Dalle ${s.entrata} alle ${s.uscita}`;
    case "annullata":
      return `Annullata: ${s.motivo}`;
    default: {
      // Se la union cresce e manca un case, `s` NON e' piu' never -> ERRORE TS qui.
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}
void describeStato;

// ============================================================================
// SEZIONE 12 - GOTCHA / PITFALLS (trappole comuni e soluzioni)
// ----------------------------------------------------------------------------

// GOTCHA 1: distributivita' indesiderata su union.
//   Vogliamo "T e' esattamente string?" ma con T nudo la conditional distribuisce.
type IsString_WRONG<T> = T extends string ? true : false;
type G1a = IsString_WRONG<"a" | 1>; // tipo: boolean (true | false !!) -> NON quello che vuoi
//   Soluzione: avvolgere in tupla per bloccare la distribuzione.
type IsString_OK<T> = [T] extends [string] ? true : false;
type G1b = IsString_OK<"a" | 1>; // tipo: false (valuta la union intera)
type _g1 = Expect<Equal<G1b, false>>;

// GOTCHA 2: constraint troppo largo perde l'inferenza del literal.
//   Se il parametro e' `string`, TS allarga "P4" a string e perdi il literal.
function tagWide(t: string) {
  return t;
}
const w = tagWide("P4"); // tipo: string (literal perso)
void w;
//   Soluzione: constraint <T extends string> cattura il literal type esatto.
function tagNarrow<T extends string>(t: T): T {
  return t;
}
const nrw = tagNarrow("P4"); // tipo: "P4"
void nrw;

// GOTCHA 3: `keyof any` e index signature.
//   keyof su un tipo con index signature include number|string, non solo le chiavi note.
interface Dizionario {
  [k: string]: number;
}
type ChiaviDiz = keyof Dizionario; // tipo: string | number
//   Soluzione: se vuoi solo chiavi "note", usa un type con proprieta' esplicite,
//   oppure filtra con mapped type. Attenzione quando fai getField su dizionari.

// GOTCHA 4: default generic + argomenti espliciti PARZIALI disattivano l'inferenza.
//   Con <T, D = T>: se fornisci SOLO <T> in modo esplicito, D NON viene piu'
//   inferito dagli argomenti -> usa il suo default (= T). Errore facile da fare.
function idOr<T, D = T>(value: T | undefined, fallback: D): T | D {
  return value ?? fallback;
}
// ERRORE TS: fornendo <number> esplicito, D usa il default = number, quindi
// fallback deve essere number: "n/d" (string) non e' assegnabile a number.
// const rBad = idOr<number>(undefined, "n/d");
//   Soluzione A: lasciare inferire TUTTO (nessun argomento di tipo esplicito).
const rOk = idOr(undefined as number | undefined, "n/d"); // tipo: number | string
//   qui T inferito da value (number), D inferito da fallback (string): funziona.
void rOk;

// ============================================================================
// SEZIONE 13 - Test di tipo finali (dimostrano che i calcoli sono corretti)
// ----------------------------------------------------------------------------
type _T1 = Expect<Equal<MyReturn<() => number>, number>>;
type _T2 = Expect<Equal<ElementOf<Dipendente[]>, Dipendente>>;
type _T3 = Expect<Equal<Awaited2<Promise<Promise<string>>>, string>>;
type _T4 = Expect<Equal<Distrib, string[] | number[]>>;
type _T5 = Expect<Equal<NonDistrib, (string | number)[]>>;
type _T6 = Expect<Equal<SoloChiusa, { stato: "chiusa"; entrata: string; uscita: string }>>;
type _T7 = Expect<Equal<PatchTimbratura["uscita"], string | null | undefined>>;

// ============================================================================
// SEZIONE 14 - Export dei simboli locali (solo simboli definiti in questo file)
// ============================================================================
export {
  getField,
  makeEntity,
  compose,
  box,
  unwrap,
  pluckFactory,
  actionCreator,
  InMemoryRepository,
  regexValidator,
  filterValid,
  chiudi,
  describeStato,
};

export type {
  Equal,
  Expect,
  Ruolo,
  Turno,
  Dipendente,
  Timbratura,
  Reparto,
  ApiResponse,
  MyReturn,
  MyParams,
  ElementOf,
  Awaited2,
  ToArray,
  ToArrayNonDist,
  KeysOfType,
  Getters,
  PartialBy,
  Repository,
  HasId,
  Validator,
  Branded,
  StatoTimbratura,
  StatoConTag,
};

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI (ripasso veloce)
// ----------------------------------------------------------------------------
// - Equal<A,B> / Expect<true>      : test di tipo (fallisce = non compila).
// - <K extends keyof T>            : constraint per accesso type-safe (T[K]).
// - <T extends C = D>              : constraint + default insieme (D deve estendere C).
// - infer R in conditional         : estrae un sotto-tipo (ReturnType, Params, ElementOf).
// - infer multiplo covariante      : union ; contravariante (posizione args) : intersection.
// - T extends U (T nudo) + union   : DISTRIBUISCE su ogni membro.
// - [T] extends [U]                : disattiva la distribuzione (valuta union intera).
// - Exclude/Extract                : conditional distributive built-in su union.
// - compose(f,g)                   : higher-order su funzioni, preserva l'inferenza.
// - Functor<T>.map                 : emulazione leggera di higher-order su tipi.
// - factory<T>() => <K>(...)       : generic currying (fissa T, inferisci K dopo).
// - actionCreator(type)<Payload>() : currying con default per action type-safe.
// - mapped + as + template literal : Getters, key remapping, calcolo a livello di tipo.
// - KeysOfType<T,V>                : filtra chiavi per tipo del valore.
// - PartialBy<T,K>                 : DTO con solo alcune chiavi opzionali.
// - Repository<T extends HasId>    : repository generico ERP (id da T["id"], default number).
// - Validator<T> = value is T      : type guard generico -> narrowing dopo il check.
// - Branded<T,B>                   : branded type (OrarioValido/BadgeValido) via regex.
// - union discriminata + never     : state machine + exhaustiveness check.
// - GOTCHA: distributivita', perdita literal, keyof con index signature, default vs inferenza.
