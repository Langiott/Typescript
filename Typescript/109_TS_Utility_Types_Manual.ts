/**
 * File 109 - Utility Types fatti a mano (livello ADVANCED)
 * Reimplementazione da zero delle utility della standard library TS:
 * MyPartial, MyRequired, MyReadonly, MyPick, MyOmit, MyRecord,
 * MyExclude, MyExtract, MyNonNullable, MyReturnType, MyParameters,
 * MyAwaited, MyReadonlyArray. Ogni utility ha un mini type-test
 * (Equal/Expect) e un esempio nel dominio ERP Polyuretech.
 */

// ============================================================================
// SEZIONE 0 - Helper per i type-test: Equal<A, B> e Expect<T>
// ============================================================================
//
// Equal<A, B> e' il classico trucco basato sui conditional types con funzioni
// generiche: due tipi sono uguali sse una funzione condizionale che dipende
// solo da A produce lo stesso risultato quando dipende solo da B. Questo
// confronto e' piu' preciso di "A extends B ? B extends A ? true : false"
// perche' distingue anche i modificatori (readonly, optional) in molti casi.

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect accetta SOLO il letterale true: se un test fallisce, Equal restituisce
// false e Expect<false> non compila (false non e' assegnabile a true).
type Expect<T extends true> = T;

// NotEqual utile per i controlli negativi.
type NotEqual<A, B> = Equal<A, B> extends true ? false : true;

// ============================================================================
// SEZIONE 0.1 - Modello di dominio ERP Polyuretech (mock locali)
// ============================================================================

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

// Badge nel formato /^UP-\d{3}$/ (a runtime), qui solo alias documentativo.
type Badge = string; // es. "UP-001"
// Orario nel formato /^\d{2}:\d{2}$/ naive-UTC.
type Orario = string; // es. "08:30"

interface Dipendente {
  id: number;
  nome: string;
  badge: Badge; // "UP-001"
  ruolo: Ruolo;
}

interface Timbratura {
  id: number;
  dipendenteId: number;
  entrata: Orario; // "HH:MM" naive-UTC
  uscita: Orario | null; // null se turno ancora aperto
  turno: Turno;
}

interface Reparto {
  id: number;
  nome: string;
  responsabileId: number | null;
}

// ============================================================================
// SEZIONE 1 - MyPartial<T>: rende ogni proprieta' opzionale
// ============================================================================
//
// Meccanismo: mapped type che itera le chiavi K di T con "keyof T" e riscrive
// ogni proprieta' aggiungendo il modificatore "?". Il tipo del valore resta
// T[K] (indexed access). Il "?" trasforma anche il tipo in "T[K] | undefined".

type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

// Esempio ERP: DTO per aggiornamento parziale del dipendente.
type UpdateDipendenteDTO = MyPartial<Dipendente>;
// tipo: { id?: number; nome?: string; badge?: string; ruolo?: Ruolo }

const patchDip: UpdateDipendenteDTO = { nome: "Rossi" }; // OK, resto opzionale

// Type-test: MyPartial deve coincidere con Partial nativo.
type _t_partial = Expect<Equal<MyPartial<Dipendente>, Partial<Dipendente>>>;

// GOTCHA: MyPartial NON e' ricorsivo (shallow). Le proprieta' annidate
// restano obbligatorie. Per il deep occorre una versione ricorsiva.

// ============================================================================
// SEZIONE 2 - MyRequired<T>: rende ogni proprieta' obbligatoria
// ============================================================================
//
// Meccanismo: mapped type con il modificatore "-?" che RIMUOVE l'optional.
// Il segno "-" davanti a "?" e' un "mapping modifier" di sottrazione.

type MyRequired<T> = {
  [K in keyof T]-?: T[K];
};

// Esempio ERP: dato un DTO parziale, ricostruire l'entita' completa.
type DipendenteCompleto = MyRequired<UpdateDipendenteDTO>;
// tipo: { id: number; nome: string; badge: string; ruolo: Ruolo }

// Type-test.
type _t_required = Expect<Equal<DipendenteCompleto, Dipendente>>;

// GOTCHA: "-?" rimuove SOLO l'optional, non aggiunge/toglie "| undefined"
// scritto esplicitamente. Se una prop era "x?: number | undefined", dopo
// MyRequired diventa "x: number | undefined" (undefined resta nell'union).

// ============================================================================
// SEZIONE 3 - MyReadonly<T>: rende ogni proprieta' di sola lettura
// ============================================================================
//
// Meccanismo: mapped type con il modificatore "readonly" davanti alla chiave.

type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};

// Esempio ERP: una timbratura gia' registrata non deve piu' essere mutata.
type TimbraturaStorica = MyReadonly<Timbratura>;

const t1: TimbraturaStorica = {
  id: 1,
  dipendenteId: 7,
  entrata: "08:00",
  uscita: "17:00",
  turno: "P4",
};
// t1.uscita = "18:00";
// ERRORE TS: Cannot assign to 'uscita' because it is a read-only property.

// Type-test.
type _t_readonly = Expect<Equal<MyReadonly<Timbratura>, Readonly<Timbratura>>>;

// Variante: per TOGLIERE readonly si usa "-readonly".
type MyMutable<T> = {
  -readonly [K in keyof T]: T[K];
};
type _t_mutable = Expect<Equal<MyMutable<TimbraturaStorica>, Timbratura>>;

// GOTCHA: readonly e' shallow e "compile-time only": a runtime l'oggetto e'
// mutabile. E' un vincolo del type checker, non un Object.freeze.

// ============================================================================
// SEZIONE 4 - MyPick<T, K>: seleziona un sottoinsieme di chiavi
// ============================================================================
//
// Meccanismo: il parametro K e' vincolato con "K extends keyof T", cosi' si
// possono passare solo chiavi realmente esistenti. Il mapped type itera su K
// (non su keyof T) e proietta i valori T[P].

type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Esempio ERP: proiezione leggera per una dropdown (solo id + nome).
type DipendenteOption = MyPick<Dipendente, "id" | "nome">;
// tipo: { id: number; nome: string }

const opt: DipendenteOption = { id: 3, nome: "Bianchi" }; // OK

// type BadPick = MyPick<Dipendente, "email">;
// ERRORE TS: Type '"email"' does not satisfy the constraint 'keyof Dipendente'.

// Type-test.
type _t_pick = Expect<
  Equal<MyPick<Dipendente, "id" | "nome">, Pick<Dipendente, "id" | "nome">>
>;

// ============================================================================
// SEZIONE 5 - MyOmit<T, K>: rimuove un sottoinsieme di chiavi
// ============================================================================
//
// Meccanismo: si costruisce la lista delle chiavi da tenere sottraendo K da
// keyof T tramite Exclude, poi si applica MyPick. Qui K NON e' vincolato a
// keyof T (come nel nativo, che accetta anche chiavi arbitrarie).
// Riutilizziamo il nostro MyExclude (definito piu' avanti, ma i type-alias
// non hanno ordine di inizializzazione: la risoluzione e' lazy).

type MyOmit<T, K extends keyof any> = MyPick<T, MyExclude<keyof T, K>>;

// Esempio ERP: input di creazione (l'id lo genera il DB, non arriva dal client).
type CreateDipendenteDTO = MyOmit<Dipendente, "id">;
// tipo: { nome: string; badge: string; ruolo: Ruolo }

const nuovo: CreateDipendenteDTO = {
  nome: "Verdi",
  badge: "UP-042",
  ruolo: "Operatore",
};

// Type-test.
type _t_omit = Expect<
  Equal<MyOmit<Dipendente, "id">, Omit<Dipendente, "id">>
>;

// GOTCHA: MyExclude<keyof T, K> passato a MyPick e' ancora un sottoinsieme di
// keyof T, ma TS non lo "sa" a priori; funziona perche' Exclude restringe.
// Se K contiene chiavi inesistenti, vengono semplicemente ignorate (come Omit).

// ============================================================================
// SEZIONE 6 - MyRecord<K, V>: costruisce un oggetto con chiavi K e valori V
// ============================================================================
//
// Meccanismo: K e' vincolato a "keyof any" (string | number | symbol). Il
// mapped type crea una proprieta' di tipo V per ogni membro di K.

type MyRecord<K extends keyof any, V> = {
  [P in K]: V;
};

// Esempio ERP: mappa ruolo -> etichetta da mostrare in UI.
type EtichetteRuolo = MyRecord<Ruolo, string>;

const labels: EtichetteRuolo = {
  SuperAdmin: "Super Amministratore",
  Admin: "Amministratore",
  Operatore: "Operatore di linea",
  QrDisplay: "Display QR",
};
// Se dimentico una chiave dell'union:
// const bad: EtichetteRuolo = { SuperAdmin: "x" };
// ERRORE TS: missing properties 'Admin', 'Operatore', 'QrDisplay'.

// Esempio ERP: conteggio timbrature per turno.
type ConteggioPerTurno = MyRecord<Turno, number>;
const conteggio: ConteggioPerTurno = { P4: 12, P2: 5, STD: 30 };

// Type-test.
type _t_record = Expect<Equal<MyRecord<Ruolo, string>, Record<Ruolo, string>>>;

// ============================================================================
// SEZIONE 7 - MyExclude<T, U>: sottrazione tra union (distributiva)
// ============================================================================
//
// Meccanismo: conditional type DISTRIBUTIVO. Quando T e' un parametro "nudo"
// (naked) in "T extends U ? ...", TS distribuisce il condizionale su ogni
// membro dell'union T. Ogni membro assegnabile a U diventa "never" (e never
// scompare dalle union), gli altri sopravvivono.

type MyExclude<T, U> = T extends U ? never : T;

// Esempio ERP: ruoli che NON possono operare (togliamo Operatore e QrDisplay).
type RuoliAmministrativi = MyExclude<Ruolo, "Operatore" | "QrDisplay">;
// tipo: "SuperAdmin" | "Admin"

// Type-test.
type _t_exclude = Expect<
  Equal<MyExclude<Ruolo, "Operatore" | "QrDisplay">, "SuperAdmin" | "Admin">
>;

// GOTCHA: la distribuzione avviene SOLO se il parametro e' "nudo". Se lo
// avvolgi in una tupla ([T] extends [U]) la distribuzione si disattiva.

// ============================================================================
// SEZIONE 8 - MyExtract<T, U>: intersezione filtrante tra union (distributiva)
// ============================================================================
//
// Meccanismo: speculare a MyExclude. Tiene i membri di T assegnabili a U.

type MyExtract<T, U> = T extends U ? T : never;

// Esempio ERP: dei turni, tieni solo quelli "produttivi" P-qualcosa.
type TurniProduttivi = MyExtract<Turno, "P4" | "P2" | "NOTTE">;
// tipo: "P4" | "P2"  ("NOTTE" non esiste in Turno, "STD" viene scartato)

// Type-test.
type _t_extract = Expect<Equal<TurniProduttivi, "P4" | "P2">>;

// GOTCHA: MyExtract intersecato con membri inesistenti (es. "NOTTE") non da'
// errore: semplicemente non contribuisce, perche' nessun membro di T combacia.

// ============================================================================
// SEZIONE 9 - MyNonNullable<T>: rimuove null e undefined da una union
// ============================================================================
//
// Meccanismo classico: MyExclude<T, null | undefined>. In alternativa si puo'
// usare l'intersezione con {} (trick), ma qui restiamo espliciti e leggibili.

type MyNonNullable<T> = MyExclude<T, null | undefined>;

// Esempio ERP: il campo uscita e' "Orario | null". Dopo il controllo runtime
// (if (t.uscita !== null)) vogliamo il tipo senza null.
type UscitaCerta = MyNonNullable<Timbratura["uscita"]>;
// tipo: string  (Orario, con null rimosso)

// Type-test.
type _t_nonnull = Expect<Equal<MyNonNullable<string | null | undefined>, string>>;

// GOTCHA: MyNonNullable e' distributivo (eredita da MyExclude). Su un tipo
// non-union (es. "number | null") funziona comunque, restituendo "number".

// ============================================================================
// SEZIONE 10 - MyReturnType<F>: estrae il tipo di ritorno con "infer"
// ============================================================================
//
// Meccanismo: "infer R" dichiara una variabile di tipo dentro un conditional.
// Diciamo "se F e' una funzione (...args) => R, cattura R". Il fallback "any"
// (o never) copre il caso F non-funzione. Usiamo "any[]" per gli argomenti
// per accettare qualunque firma.

type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never;

// Esempio ERP: una factory che costruisce una timbratura.
function creaTimbratura(dipId: number, entrata: Orario) {
  return {
    id: 0,
    dipendenteId: dipId,
    entrata,
    uscita: null as Orario | null,
    turno: "STD" as Turno,
  };
}
type TimbraturaCreata = MyReturnType<typeof creaTimbratura>;
// tipo: { id: number; dipendenteId: number; entrata: string;
//         uscita: string | null; turno: Turno }

// Type-test con una funzione semplice.
type _t_ret = Expect<Equal<MyReturnType<() => Ruolo>, Ruolo>>;
type _t_ret2 = Expect<Equal<MyReturnType<typeof creaTimbratura>, Timbratura>>;

// GOTCHA: con overload, "infer R" cattura solo l'ULTIMA firma della lista di
// overload (comportamento identico a ReturnType nativo).

// ============================================================================
// SEZIONE 11 - MyParameters<F>: estrae la tupla dei parametri con "infer"
// ============================================================================
//
// Meccanismo: come sopra, ma "infer P" si mette al posto della LISTA di
// argomenti (...args: infer P). P viene inferito come una tupla dei tipi
// parametro.

type MyParameters<F> = F extends (...args: infer P) => any ? P : never;

// Esempio ERP: i parametri della factory di cui sopra.
type ParamsCreazione = MyParameters<typeof creaTimbratura>;
// tipo: [dipId: number, entrata: string]

// Uso pratico: inoltrare gli stessi argomenti (spread di tupla tipata).
function logCreazione(...args: ParamsCreazione): void {
  const [dipId, entrata] = args;
  // console.log(dipId, entrata);
  void dipId;
  void entrata;
}
logCreazione(7, "08:15"); // OK
// logCreazione(7);
// ERRORE TS: Expected 2 arguments, but got 1.

// Type-test.
type _t_params = Expect<Equal<MyParameters<(a: number, b: Ruolo) => void>, [a: number, b: Ruolo]>>;

// GOTCHA: la tupla inferita conserva i NOMI dei parametri (label) come sopra,
// ma i nomi non influiscono sull'assegnabilita' (sono solo documentativi).

// ============================================================================
// SEZIONE 12 - MyAwaited<T>: "srotola" una Promise (anche annidata) con infer
// ============================================================================
//
// Meccanismo: se T e' una Promise<U>, cattura U con "infer U"; poi, poiche' U
// potrebbe essere ancora una Promise (Promise<Promise<...>>), si ricorre
// ricorsivamente con MyAwaited<U>. Se T non e' una Promise, si restituisce T.
// Usiamo la struttura "thenable" (oggetto con .then) come fa Awaited nativo,
// ma qui semplifichiamo su PromiseLike/Promise.

type MyAwaited<T> =
  T extends Promise<infer U>
    ? MyAwaited<U> // ricorsione: srotola Promise annidate
    : T;

// Alias richiesto (case-insensitive nel testo): stesso tipo.
type Myawaited<T> = MyAwaited<T>;

// Esempio ERP: una repository che ritorna una Promise di Dipendente.
async function findDipendente(id: number): Promise<Dipendente> {
  return { id, nome: "X", badge: "UP-001", ruolo: "Operatore" };
}
type Risolto = MyAwaited<ReturnType<typeof findDipendente>>;
// tipo: Dipendente

// Promise annidata (raro ma possibile): si srotola fino in fondo.
type Doppia = MyAwaited<Promise<Promise<Turno>>>;
// tipo: Turno

// Type-test.
type _t_await = Expect<Equal<MyAwaited<Promise<Dipendente>>, Dipendente>>;
type _t_await2 = Expect<Equal<MyAwaited<Promise<Promise<number>>>, number>>;
type _t_await3 = Expect<Equal<MyAwaited<Ruolo>, Ruolo>>; // gia' non-Promise

// GOTCHA: il PromiseLike vero puo' avere .then con thenable annidati; la
// versione nativa Awaited gestisce anche i thenable generici via "then".
// Questa semplificazione copre Promise<...> ma non tutti gli oggetti .then.

// ============================================================================
// SEZIONE 13 - MyReadonlyArray<T>: array immutabile a livello di tipo
// ============================================================================
//
// Meccanismo: un ReadonlyArray espone gli elementi ma vieta push/pop/assegna-
// mento per indice. Lo definiamo come mapped type sulle chiavi numeriche piu'
// length/iterator, ma il modo idiomatico e' un'interfaccia con solo membri
// read-only. Qui usiamo l'equivalenza con "readonly T[]".

type MyReadonlyArray<T> = readonly T[];

// Esempio ERP: la lista dei ruoli ammessi non deve essere modificata.
const RUOLI_AMMESSI: MyReadonlyArray<Ruolo> = [
  "SuperAdmin",
  "Admin",
  "Operatore",
  "QrDisplay",
];

const primo: Ruolo = RUOLI_AMMESSI[0]; // lettura OK
// RUOLI_AMMESSI.push("Admin");
// ERRORE TS: Property 'push' does not exist on type 'readonly Ruolo[]'.
// RUOLI_AMMESSI[0] = "Admin";
// ERRORE TS: Index signature in type 'readonly Ruolo[]' only permits reading.

// Type-test: equivalente al ReadonlyArray nativo.
type _t_roarr = Expect<Equal<MyReadonlyArray<Ruolo>, ReadonlyArray<Ruolo>>>;

// GOTCHA: "readonly T[]" e "ReadonlyArray<T>" sono lo STESSO tipo (zucchero
// sintattico). L'immutabilita' e' shallow: se T e' un oggetto, le sue prop
// interne restano mutabili a meno di rendere anche quelle readonly.

// ============================================================================
// SEZIONE 14 - Composizione: le utility si combinano
// ============================================================================
//
// Le utility fatte a mano si compongono esattamente come quelle native.

// DTO di aggiornamento senza id, con tutti i campi opzionali e readonly.
type PatchDipReadonly = MyReadonly<MyPartial<MyOmit<Dipendente, "id">>>;
// tipo: { readonly nome?: string; readonly badge?: string; readonly ruolo?: Ruolo }

const p: PatchDipReadonly = { ruolo: "Admin" };
// p.ruolo = "Operatore";
// ERRORE TS: Cannot assign to 'ruolo' because it is a read-only property.

// Mappa turno -> lista (readonly) di orari di ingresso previsti.
type OrariPerTurno = MyRecord<Turno, MyReadonlyArray<Orario>>;
const orari: OrariPerTurno = {
  P4: ["06:00", "14:00", "22:00"],
  P2: ["06:00", "18:00"],
  STD: ["08:30"],
};
void p;
void orari;
void patchDip;
void opt;
void nuovo;
void labels;
void conteggio;
void t1;
void primo;
// (Risolto e' un type alias: non ha valore a runtime, niente void)
// (i type alias non generano runtime; le "void" sopra sono sui VALORI)

// Riferimenti ai tipi-test per evitare "declared but never used" con noUnused*.
type _AllTests = [
  _t_partial, _t_required, _t_readonly, _t_mutable, _t_pick, _t_omit,
  _t_record, _t_exclude, _t_extract, _t_nonnull, _t_ret, _t_ret2,
  _t_await, _t_await2, _t_await3, _t_params, _t_roarr
];

// Export dei simboli locali (solo tipi + qualche costante) per riuso didattico.
export type {
  Equal,
  Expect,
  NotEqual,
  MyPartial,
  MyRequired,
  MyReadonly,
  MyMutable,
  MyPick,
  MyOmit,
  MyRecord,
  MyExclude,
  MyExtract,
  MyNonNullable,
  MyReturnType,
  MyParameters,
  MyAwaited,
  Myawaited,
  MyReadonlyArray,
  Dipendente,
  Timbratura,
  Reparto,
  Ruolo,
  Turno,
};
export { RUOLI_AMMESSI };

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
// - Equal<A,B> / Expect<T extends true>: pattern per type-test compile-time.
// - Mapped types: { [K in keyof T]: ... } iterano le chiavi.
// - Modificatori mapped: "?" (optional), "-?" (toglie optional),
//   "readonly" / "-readonly" (aggiunge/toglie immutabilita').
// - MyPartial = "?"; MyRequired = "-?"; MyReadonly = "readonly"; MyMutable = "-readonly".
// - MyPick: itera su K extends keyof T; MyOmit = MyPick<T, MyExclude<keyof T,K>>.
// - MyRecord<K extends keyof any, V>: costruisce oggetti chiave->valore.
// - Conditional distributivo: T extends U su union "nuda" distribuisce.
// - MyExclude = T extends U ? never : T; MyExtract = T extends U ? T : never.
// - MyNonNullable = MyExclude<T, null | undefined>.
// - infer: cattura tipi dentro conditional (MyReturnType, MyParameters, MyAwaited).
// - MyReturnType: (...a:any[]) => infer R; MyParameters: (...a:infer P) => any.
// - MyAwaited ricorsivo: srotola Promise<Promise<...>>.
// - MyReadonlyArray<T> === readonly T[] === ReadonlyArray<T>.
// - PITFALL: tutte queste utility sono SHALLOW (non ricorsive) e compile-time.
// - PITFALL: distribuzione si disattiva con [T] extends [U] (tupla wrap).
// - PITFALL: readonly/Partial non fanno nulla a runtime (nessun freeze).
