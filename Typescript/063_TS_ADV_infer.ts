/**
 * 063_TS_ADV_infer.ts
 * Corso TypeScript - File 63 - ADVANCED: la keyword "infer"
 *
 * "infer" si usa DENTRO un conditional type per catturare (dedurre) una parte
 * di un altro type e legarla a una type variable, riutilizzabile nel ramo true.
 * Qui costruiamo passo dopo passo: ElementType, ReturnType/Parameters manuali,
 * UnwrapPromise, infer multipli, pattern type-level e casi reali ERP Polyuretech.
 * Tutto compila con: tsc --strict --target ES2022 --lib ES2022,DOM --noEmit
 */

// ---------------------------------------------------------------------------
// 0) HELPER DI TEST DI TIPO (type-level testing)
// ---------------------------------------------------------------------------
// Equal<A, B> restituisce true solo se A e B sono lo STESSO type. Il trucco dei
// due generic identity function con condizionali serve a distinguere anche
// coppie ostiche come any vs unknown (che un semplice A extends B non separa).
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect accetta solo il literal true: se un test fallisce, non compila.
type Expect<T extends true> = T;

// Esempi d'uso dell'helper (i type alias _t* servono solo come "asserzioni").
type _t0a = Expect<Equal<string, string>>; // ok
type _t0b = Expect<Equal<1 | 2, 2 | 1>>; // ok, le union sono set (ordine irrilevante)
// type _t0c = Expect<Equal<any, unknown>>; // ERRORE TS: any e unknown non sono uguali

// ---------------------------------------------------------------------------
// 1) infer NEL CONDITIONAL TYPE: l'idea base
// ---------------------------------------------------------------------------
// Sintassi: T extends <pattern con infer X> ? (uso di X) : fallback.
// "infer X" dichiara una nuova type variable X che il compiler assegna facendo
// pattern-matching della struttura di T. E' l'unica sede in cui infer e' lecita.

// UnwrapArray: se T e' un array, estrai il tipo degli elementi, altrimenti T.
type UnwrapArray<T> = T extends (infer E)[] ? E : T;

type UA1 = UnwrapArray<string[]>; // => string
type UA2 = UnwrapArray<number>; // => number (non e' un array: fallback)
type UA3 = UnwrapArray<boolean[][]>; // => boolean[] (solo un livello)
type _t1 = Expect<Equal<UA1, string>>;

// Nota: "(infer E)[]" cattura da un array mutabile. Per coprire anche
// ReadonlyArray usiamo il pattern piu' generale Array<infer E>.
type UnwrapAnyArray<T> = T extends ReadonlyArray<infer E> ? E : T;
type UA4 = UnwrapAnyArray<readonly number[]>; // => number

// ---------------------------------------------------------------------------
// 2) ElementType<T>: elemento di array/tuple/iterabili
// ---------------------------------------------------------------------------
// Versione "iterabile": matcha qualsiasi cosa sia Iterable, cosi funziona per
// array, tuple e string (string e' Iterable<string> in lib DOM/ES2022).
type ElementType<T> = T extends Iterable<infer E> ? E : never;

type EL1 = ElementType<number[]>; // => number
type EL2 = ElementType<[1, "due", true]>; // => 1 | "due" | true (union dei membri)
type EL3 = ElementType<Set<Date>>; // => Date
type EL4 = ElementType<string>; // => string (ogni char e' string)
type _t2 = Expect<Equal<EL1, number>>;

// Su una tuple, l'elemento e' la UNION di tutte le posizioni: utile per ricavare
// il type "uno qualunque degli elementi" da una tuple eterogenea.
type Coppia = [id: number, nome: string];
type MembroCoppia = ElementType<Coppia>; // => number | string

// ---------------------------------------------------------------------------
// 3) ReturnType manuale (MyReturnType) e Parameters manuale
// ---------------------------------------------------------------------------
// Catturiamo il return con infer R nella posizione di ritorno della signature.
type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never;

function calcolaOreLavorate(): number {
  return 8;
}
type OreRet = MyReturnType<typeof calcolaOreLavorate>; // => number
type _t3 = Expect<Equal<OreRet, number>>;

// Parameters manuale: infer P sulla LISTA dei parametri => risulta una tuple.
type MyParameters<F> = F extends (...args: infer P) => any ? P : never;

function assegnaTurno(badge: string, turno: "P4" | "P2" | "STD"): void {}
type ParamsAssegna = MyParameters<typeof assegnaTurno>; // => [badge: string, turno: "P4"|"P2"|"STD"]
type PrimoParam = ParamsAssegna[0]; // => string

// FirstArg: comodo helper che estrae solo il PRIMO parametro (o never se assente).
type FirstArg<F> = F extends (first: infer A, ...rest: any[]) => any ? A : never;
type FA = FirstArg<typeof assegnaTurno>; // => string

// ---------------------------------------------------------------------------
// 4) UnwrapPromise / Awaited manuale (con ricorsione per Promise annidate)
// ---------------------------------------------------------------------------
// Versione base: un solo livello di Promise.
type UnwrapPromiseShallow<T> = T extends Promise<infer V> ? V : T;
type UP1 = UnwrapPromiseShallow<Promise<string>>; // => string
type UP2 = UnwrapPromiseShallow<number>; // => number (non e' una Promise)

// Versione ricorsiva: srotola anche Promise<Promise<...>> fino al valore finale.
// Ogni passo cattura V con infer e richiama se stesso su V finche' resta Promise.
type DeepAwaited<T> = T extends Promise<infer V> ? DeepAwaited<V> : T;
type UP3 = DeepAwaited<Promise<Promise<Promise<boolean>>>>; // => boolean
type UP4 = DeepAwaited<Promise<number[]>>; // => number[]
type _t4 = Expect<Equal<UP3, boolean>>;

// Applicazione: dedurre il tipo "risolto" da una funzione async senza await.
async function fetchBadge(): Promise<string> {
  return "UP-001";
}
type BadgeRisolto = DeepAwaited<MyReturnType<typeof fetchBadge>>; // => string

// ---------------------------------------------------------------------------
// 5) infer MULTIPLI nello stesso pattern
// ---------------------------------------------------------------------------
// Si possono dichiarare piu' infer in un solo conditional: il compiler li lega
// tutti contemporaneamente. Qui separiamo primo elemento e coda di una tuple.
type Head<T> = T extends [infer H, ...infer _Rest] ? H : never;
type Tail<T> = T extends [infer _H, ...infer R] ? R : never;

type H1 = Head<[1, 2, 3]>; // => 1
type T1 = Tail<[1, 2, 3]>; // => [2, 3]
type _t5a = Expect<Equal<H1, 1>>;
type _t5b = Expect<Equal<T1, [2, 3]>>;

// SplitFn: da una funzione ricavo insieme parametri E ritorno in una coppia.
type SplitFn<F> = F extends (...a: infer P) => infer R ? [params: P, ret: R] : never;
type SF = SplitFn<(x: number, y: string) => boolean>; // => [params: [number, string], ret: boolean]

// infer multipli su un OGGETTO: estraggo due property in un colpo solo.
type PickIdName<T> = T extends { id: infer I; nome: infer N }
  ? { id: I; nome: N }
  : never;
type PIN = PickIdName<{ id: number; nome: string; extra: boolean }>;
// => { id: number; nome: string }

// ---------------------------------------------------------------------------
// 6) infer + template literal type (pattern matching su stringhe)
// ---------------------------------------------------------------------------
// infer funziona anche nei template literal: ottimo per fare "parsing" a livello
// di tipo. Qui estraiamo il numero dal badge "UP-XYZ".
type BadgeNumber<S> = S extends `UP-${infer N}` ? N : never;
type BN1 = BadgeNumber<"UP-042">; // => "042" (string literal, non number)
type BN2 = BadgeNumber<"XX-042">; // => never (prefisso non combacia)

// Split di un orario "HH:MM" in ore e minuti (entrambe le meta' con infer).
type ParseOra<S> = S extends `${infer H}:${infer M}` ? { ore: H; minuti: M } : never;
type PO = ParseOra<"08:30">; // => { ore: "08"; minuti: "30" }

// Estrazione del dominio da una mail (utile per validazioni tenant ERP).
type DominioMail<S> = S extends `${infer _User}@${infer Dom}` ? Dom : never;
type DM = DominioMail<"francesco@polyuretech.com">; // => "polyuretech.com"

// ---------------------------------------------------------------------------
// 7) MECCANISMI INTERNI: distributivita' su union
// ---------------------------------------------------------------------------
// Un conditional type "naked" (T sta da solo a sinistra di extends) DISTRIBUISCE
// sui membri di una union: il calcolo si applica a ciascun membro e si ri-unisce.
type BoxNaked<T> = T extends any ? T[] : never;
type BN_a = BoxNaked<string | number>; // => string[] | number[] (distribuito!)

// Per NON distribuire, si avvolge T in una tuple [T] (o si usa un tuple wrap).
// Cosi la union viene trattata come un blocco unico.
type BoxTuple<T> = [T] extends [any] ? T[] : never;
type BN_b = BoxTuple<string | number>; // => (string | number)[]
type _t7 = Expect<Equal<BN_b, (string | number)[]>>;

// Conseguenza pratica con infer: estrarre elementi da una UNION di array.
// Distribuito, ElementUnion agisce su ogni array separatamente.
type ElementUnion<T> = T extends (infer E)[] ? E : never;
type EU = ElementUnion<string[] | number[]>; // => string | number

// ---------------------------------------------------------------------------
// 8) infer con VINCOLI (constraint) - TS 4.7+
// ---------------------------------------------------------------------------
// "infer X extends Constraint" restringe cio' che X puo' catturare e talvolta
// permette conversioni (es. da string literal a number literal).
type FirstStringOnly<T> = T extends [infer H extends string, ...any[]] ? H : never;
type FS1 = FirstStringOnly<["ciao", 1, 2]>; // => "ciao"
type FS2 = FirstStringOnly<[42, "x"]>; // => never (il primo non e' string)

// Conversione numerica: infer N extends number su template literal.
// (In lib recenti il literal viene "promosso" a number literal.)
type ToNumber<S> = S extends `${infer N extends number}` ? N : never;
type TN1 = ToNumber<"123">; // => 123 (number literal)
type TN2 = ToNumber<"abc">; // => never

// ---------------------------------------------------------------------------
// 9) MOCK di libreria (nessun import esterno) per gli esempi ERP
// ---------------------------------------------------------------------------
// Simuliamo un client stile Prisma/Repository SENZA dipendenze npm: sono solo
// interfacce/type locali per mostrare i pattern infer su codice realistico.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  id: number;
  nome: string;
  badge: `UP-${string}`; // vincolo template: badge tipo "UP-001"
  ruolo: Ruolo;
}

interface Reparto {
  id: number;
  nome: string;
  turnoDefault: Turno;
}

interface Timbratura {
  dipendenteId: number;
  entrata: string; // orario naive-UTC "HH:MM"
  uscita: string; // "HH:MM"
}

// Repository mock: metodi async che ritornano Promise di entita'.
interface RepositoryMock {
  findDipendente(id: number): Promise<Dipendente | null>;
  listTimbrature(dipendenteId: number): Promise<Timbratura[]>;
  creaReparto(input: Omit<Reparto, "id">): Promise<Reparto>;
}

// ---------------------------------------------------------------------------
// 10) ESEMPIO ERP #1 - Estrarre il DTO risolto da un metodo del repository
// ---------------------------------------------------------------------------
// Combiniamo MyReturnType + DeepAwaited: dato un metodo async, ottengo il type
// del dato "gia' risolto", senza scriverlo a mano. Se il metodo cambia firma,
// il DTO derivato si aggiorna da solo (single source of truth).
type ResolvedResult<F> = DeepAwaited<MyReturnType<F>>;

type DipendenteDTO = ResolvedResult<RepositoryMock["findDipendente"]>;
// => Dipendente | null
type TimbratureDTO = ResolvedResult<RepositoryMock["listTimbrature"]>;
// => Timbratura[]
type _t10 = Expect<Equal<TimbratureDTO, Timbratura[]>>;

// Da li' posso ancora comporre con ElementType per prendere la singola riga.
type RigaTimbratura = ElementType<TimbratureDTO>; // => Timbratura

// ---------------------------------------------------------------------------
// 11) ESEMPIO ERP #2 - Ricavare l'input di creazione senza duplicarlo
// ---------------------------------------------------------------------------
// FirstArg sul metodo creaReparto estrae il type dell'input accettato: se cambia
// lo schema (aggiungo un campo a Reparto) l'input derivato riflette la modifica.
type InputCreaReparto = FirstArg<RepositoryMock["creaReparto"]>;
// => Omit<Reparto, "id"> cioe' { nome: string; turnoDefault: Turno }

// Verifichiamo che l'id NON sia richiesto in input (deve mancare la key "id").
type _t11 = Expect<Equal<keyof InputCreaReparto, "nome" | "turnoDefault">>;

// Uso pratico: una factory tipizzata che accetta esattamente quell'input.
function nuovoRepartoPayload(p: InputCreaReparto): InputCreaReparto {
  return p;
}
const payloadReparto = nuovoRepartoPayload({ nome: "Stampaggio", turnoDefault: "P4" });
// payloadReparto: { nome: string; turnoDefault: Turno }

// ---------------------------------------------------------------------------
// 12) ESEMPIO ERP #3 - State machine timbratura: transizioni type-level
// ---------------------------------------------------------------------------
// Modelliamo lo stato di una timbratura come union di stringhe e usiamo infer
// su template literal per validare/estrarre transizioni "FROM->TO".
type StatoTimbratura = "Aperta" | "Chiusa" | "Annullata";
type Transizione = `${StatoTimbratura}->${StatoTimbratura}`;

// From<T> e To<T>: estraggono i due lati della transizione con infer multipli.
type From<T> = T extends `${infer A}->${infer _B}` ? A : never;
type To<T> = T extends `${infer _A}->${infer B}` ? B : never;

type Fr = From<"Aperta->Chiusa">; // => "Aperta"
type ToStato = To<"Aperta->Chiusa">; // => "Chiusa"

// Solo alcune transizioni sono lecite: le enumeriamo e ne ricaviamo gli stati
// di partenza ammessi (Extract distribuisce sull'union).
type TransizioniValide = "Aperta->Chiusa" | "Aperta->Annullata";
type StatiDiPartenza = From<TransizioniValide>; // => "Aperta"

// Guard-like a livello di valore: la firma accetta solo transizioni valide.
function applicaTransizione(t: TransizioniValide): void {}
applicaTransizione("Aperta->Chiusa"); // ok
// applicaTransizione("Chiusa->Aperta"); // ERRORE TS: transizione non ammessa

// ---------------------------------------------------------------------------
// 13) ESEMPIO ERP #4 - Parser di orario "HH:MM" con infer + constraint
// ---------------------------------------------------------------------------
// Estendiamo ParseOra per PROMUOVERE ore/minuti a number literal via
// "infer ... extends number". Utile per validazioni a livello di tipo.
type ParseOraNum<S> = S extends `${infer H extends number}:${infer M extends number}`
  ? { ore: H; minuti: M }
  : never;
// GOTCHA importante: la promozione a number LITERAL avviene solo se la stringa e'
// la forma CANONICA del numero. "8" -> 8, ma "08" (zero iniziale) NON e' canonica
// e degrada a "number" generico. Ecco perche' PON1 ha ore: number, non ore: 8.
type PON1 = ParseOraNum<"08:30">; // => { ore: number; minuti: 30 } (08 non canonico!)
type PON2 = ParseOraNum<"8:30">; // => { ore: 8; minuti: 30 } (forma canonica -> literal)
type PON3 = ParseOraNum<"otto:trenta">; // => never (non convertibile a number)
type _t13a = Expect<Equal<PON2, { ore: 8; minuti: 30 }>>;
type _t13b = Expect<Equal<PON1, { ore: number; minuti: 30 }>>;

// A runtime la validazione resta con regex (il type non sostituisce il check):
const RE_ORARIO = /^\d{2}:\d{2}$/;
const RE_BADGE = /^UP-\d{3}$/;
function isOrarioValido(s: string): boolean {
  return RE_ORARIO.test(s);
}
function isBadgeValido(s: string): s is `UP-${string}` {
  // type predicate: se true, TS restringe s a `UP-${string}`
  return RE_BADGE.test(s);
}
// Esempio d'uso del narrowing dato dal type predicate:
function stampaBadge(x: string): void {
  if (isBadgeValido(x)) {
    const b: `UP-${string}` = x; // ok: qui x e' ristretto
    void b;
  }
}

// ---------------------------------------------------------------------------
// 14) infer per PROPERTY per costruire mapped type derivati
// ---------------------------------------------------------------------------
// UnwrapFnValues: dato un oggetto di funzioni, ricava un oggetto con i loro
// return type. Iteriamo con mapped type e per ogni valore applichiamo infer R.
type UnwrapFnValues<T> = {
  [K in keyof T]: T[K] extends (...a: any[]) => infer R ? R : never;
};
interface AzioniUI {
  getOre: () => number;
  getBadge: () => `UP-${string}`;
  isAttivo: () => boolean;
}
type ValoriAzioni = UnwrapFnValues<AzioniUI>;
// => { getOre: number; getBadge: `UP-${string}`; isAttivo: boolean }
type _t14 = Expect<Equal<ValoriAzioni["getBadge"], `UP-${string}`>>;

// ---------------------------------------------------------------------------
// 15) GOTCHA / PITFALLS (trappole comuni con infer)
// ---------------------------------------------------------------------------

// GOTCHA A) infer usata FUORI da un conditional type: non compila.
// type Sbagliato<T> = infer X; // ERRORE TS: 'infer' declarations are only permitted
//                              // in the 'extends' clause of a conditional type.
// Soluzione: mettere infer nel pattern a destra di "extends".

// GOTCHA B) Overload: infer sul return cattura SOLO l'ultima signature visibile.
interface Sovraccarico {
  (x: string): number;
  (x: number): string;
}
type RetOverload = MyReturnType<Sovraccarico>; // => string (prende l'ultimo overload)
// Attenzione: NON e' number | string. Se servono tutti gli overload va gestito
// caso per caso; il pattern (...args)=>infer R risolve solo l'ultima firma.

// GOTCHA C) Distributivita' non voluta su union con infer.
// Se T e' string[] | number[], ElementUnion distribuisce e produce string|number.
// Se invece VOLEVI trattare la union come un tutt'uno, usa il tuple-wrap:
type ElementNoDist<T> = [T] extends [(infer E)[]] ? E : never;
type END = ElementNoDist<string[] | number[]>; // => never
// Perche' never? Perche' [string[]|number[]] NON e' assegnabile a [array-di-un-solo-E]:
// non esiste un unico E che copra entrambi. La distributivita' spesso e' cio' che vuoi;
// disattivala solo con consapevolezza.

// GOTCHA D) infer "vuota": se il pattern non matcha, cade nel ramo false.
// Dimenticare il ramo false (fallback) forza never o errori a valle.
type SoloSeArray<T> = T extends (infer E)[] ? E : never; // never e' un fallback esplicito
type SSA = SoloSeArray<string>; // => never (voluto), non un errore
// Meglio never esplicito che lasciare il conditional incompleto.

// ---------------------------------------------------------------------------
// 16) PATTERN TYPE-LEVEL: Reverse di una tuple (ricorsione + infer multipli)
// ---------------------------------------------------------------------------
// Costruzione passo-passo: separo Head/Tail e ricompongo in ordine inverso.
// Mostra come infer + ricorsione realizzano un "calcolo" sui type.
type Reverse<T extends readonly any[]> = T extends [infer H, ...infer R]
  ? [...Reverse<R>, H]
  : [];
type RV = Reverse<[1, 2, 3, 4]>; // => [4, 3, 2, 1]
type _t16 = Expect<Equal<RV, [4, 3, 2, 1]>>;

// Last<T>: ultimo elemento, catturando la coda con "...infer" e l'ultimo con infer.
type Last<T extends readonly any[]> = T extends [...any[], infer L] ? L : never;
type LST = Last<[Dipendente, Reparto, Timbratura]>; // => Timbratura

// ---------------------------------------------------------------------------
// 17) Concatenazione finale: da metodo repo a "riga" tipizzata in un colpo
// ---------------------------------------------------------------------------
// Uniamo piu' utility (ResolvedResult -> ElementType) per estrarre, da qualsiasi
// metodo che ritorna Promise<Array<Row>>, il type Row. Zero duplicazione.
type RowOf<F> = ElementType<ResolvedResult<F>>;
type RigaDaRepo = RowOf<RepositoryMock["listTimbrature"]>; // => Timbratura
type _t17 = Expect<Equal<RigaDaRepo, Timbratura>>;

// Esportiamo un sottoinsieme utile (solo simboli locali di questo file).
export type {
  Equal,
  Expect,
  ElementType,
  MyReturnType,
  MyParameters,
  DeepAwaited,
  ResolvedResult,
  RowOf,
  Dipendente,
  Timbratura,
  Reparto,
};
export { isBadgeValido, isOrarioValido };

/**
 * RIEPILOGO COMANDI / CONCETTI
 * ----------------------------------------------------------------------------
 * - infer X: dichiara una type variable dedotta; SOLO nell'extends di un
 *   conditional type (T extends <pattern con infer X> ? X : fallback).
 * - ElementType<T>: T extends Iterable<infer E> ? E : never (array/tuple/string/Set).
 * - MyReturnType<F>: F extends (...a:any[]) => infer R ? R : never.
 * - MyParameters<F>: F extends (...a: infer P) => any ? P : never (tuple).
 * - FirstArg<F>: primo parametro via (first: infer A, ...rest).
 * - UnwrapPromise/DeepAwaited: srotola Promise, ricorsivo per Promise annidate.
 * - infer multipli: piu' infer nello stesso pattern (Head/Tail, SplitFn, oggetti).
 * - Template literal + infer: parsing di tipo ("UP-${infer N}", "${H}:${M}").
 * - infer X extends C: vincolo/conversione (es. `${infer N extends number}`).
 * - Distributivita': conditional "naked" distribuisce su union; [T] la blocca.
 * - Ricorsione type-level: Reverse/Last con infer + spread ...infer.
 * - GOTCHA: infer fuori dal conditional (errore); overload -> solo ultima firma;
 *   distributivita' non voluta -> tuple-wrap [T]; metti sempre un fallback (never).
 * - Test di tipo: Equal<A,B> + Expect<...> (non compila se un tipo e' sbagliato).
 * - ERP: DTO derivati da metodi repo, input di creazione senza duplicati,
 *   state machine transizioni "FROM->TO", parser orario "HH:MM", badge "UP-###".
 * ----------------------------------------------------------------------------
 */
