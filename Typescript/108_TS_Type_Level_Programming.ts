/**
 * 108_TS_Type_Level_Programming.ts
 * Argomento 108: Type-level programming (i tipi come calcolo).
 * Idea centrale: il type system di TypeScript e' Turing-completo, quindi
 * possiamo "programmare" con i tipi: funzioni type-level, ricorsione,
 * condizionali, aritmetica con tuple. Dominio esempi: ERP Polyuretech.
 * ATTENZIONE: potenza != saggezza -> vedi sezione "AVVISI DI COMPLESSITA'".
 */

// ============================================================================
// 0) HELPER DI TEST A LIVELLO TIPO (Equal / Expect)
// ============================================================================

// Equal<A,B>: confronto stretto tra due tipi. Il trucco dei due tipi funzione
// generici forza TS a valutare l'IDENTITA' strutturale profonda (non solo
// l'assegnabilita' bidirezionale, che confonderebbe { a: any } con { a: 1 }).
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect<T> compila solo se T e' il letterale true: usato come "assert" statico.
type Expect<T extends true> = T;

// NotEqual di comodo.
type NotEqual<A, B> = Equal<A, B> extends true ? false : true;

// Test dell'helper stesso.
type _t0a = Expect<Equal<1, 1>>;            // ok
type _t0b = Expect<NotEqual<1, 2>>;         // ok
// type _t0c = Expect<Equal<1, 2>>;         // ERRORE TS: false non soddisfa true

// ============================================================================
// 1) I TIPI COME FUNZIONI: i generic sono "funzioni da tipi a tipi"
// ============================================================================

// Un generic con parametro e' letteralmente una funzione: input = argomento
// di tipo, output = tipo calcolato. Qui identita' type-level.
type Id<T> = T;
type _t1a = Id<"UP-001">;                   // tipo: "UP-001"

// "Funzione" che avvolge in array.
type Boxed<T> = T[];
type _t1b = Boxed<number>;                  // tipo: number[]

// "Funzione" a piu' argomenti + valore di default (come parametro default JS).
type Pair<A, B = A> = [A, B];
type _t1c = Pair<string, number>;           // tipo: [string, number]
type _t1d = Pair<boolean>;                  // tipo: [boolean, boolean]

// I conditional type sono l'"if" del linguaggio type-level.
type IsString<T> = T extends string ? true : false;
type _t1e = IsString<"P4">;                 // tipo: true
type _t1f = IsString<number>;               // tipo: false

// ============================================================================
// 2) DISTRIBUTIVITA' DEI CONDITIONAL TYPE SULLE UNION
// ============================================================================

// Quando il tipo controllato e' un "naked type parameter", il conditional si
// DISTRIBUISCE su ciascun membro della union: T extends U diventa
// (A extends U) | (B extends U) | ...  E' il "map" implicito del type system.
type ToArray<T> = T extends unknown ? T[] : never;
type _t2a = ToArray<string | number>;       // tipo: string[] | number[]  (distribuito)

// Per DISABILITARE la distributivita' si avvolge in tupla [T] extends [U].
type ToArrayNonDist<T> = [T] extends [unknown] ? T[] : never;
type _t2b = ToArrayNonDist<string | number>; // tipo: (string | number)[]  (NON distribuito)

// Uso pratico: filtrare ruoli ERP. Ruoli ammessi nel sistema.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Estrae solo i ruoli con permessi di scrittura (distributivita' + condizionale).
type RuoliScrittura<R> = R extends "SuperAdmin" | "Admin" ? R : never;
type _t2c = RuoliScrittura<Ruolo>;          // tipo: "SuperAdmin" | "Admin"
// Perche' funziona: never in una union "sparisce", quindi i ruoli non-scrittura
// vengono scartati automaticamente.

// ============================================================================
// 3) INFERENCE CON `infer`: estrarre pezzi da un tipo
// ============================================================================

// infer introduce una variabile di tipo "catturata" durante il pattern match.
type ElementOf<T> = T extends (infer E)[] ? E : never;
type _t3a = ElementOf<string[]>;            // tipo: string
type _t3b = ElementOf<number>;              // tipo: never (nessun match)

// Estrai il tipo di ritorno di una funzione (come il built-in ReturnType).
type MyReturn<F> = F extends (...args: never[]) => infer R ? R : never;
type _t3c = MyReturn<() => Ruolo>;          // tipo: Ruolo

// Estrai il primo elemento di una tupla (head).
type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never;
type _t3d = Head<[1, 2, 3]>;                // tipo: 1

// Estrai la coda (tail) di una tupla: rest pattern con infer.
type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer R] ? R : [];
type _t3e = Tail<[1, 2, 3]>;                // tipo: [2, 3]

// ============================================================================
// 4) ARITMETICA A LIVELLO TIPO CON "TUPLE LENGTH"
// ============================================================================

// Il numero non e' calcolabile direttamente: TS non fa 2+2 sui letterali.
// Trucco: rappresentiamo un numero N come una tupla di lunghezza N, poi
// leggiamo/costruiamo tramite la proprieta' ["length"].

// BuildTuple<N>: costruisce una tupla di lunghezza N accumulando elementi.
// Ricorsione: aggiunge un elemento finche' length != N.
type BuildTuple<N extends number, Acc extends unknown[] = []> =
  Acc["length"] extends N ? Acc : BuildTuple<N, [...Acc, unknown]>;
type _t4a = BuildTuple<3>["length"];        // tipo: 3
type _t4b = BuildTuple<3>;                  // tipo: [unknown, unknown, unknown]

// ADD<A,B>: costruisco una tupla lunga A, una lunga B, le concateno e leggo
// la length del risultato. "length" di una tupla e' un letterale numerico.
type Add<A extends number, B extends number> =
  [...BuildTuple<A>, ...BuildTuple<B>]["length"] & number;
type _t4c = Add<2, 3>;                       // tipo: 5
type _t4d = Add<10, 7>;                      // tipo: 17
// Nota: & number serve perche' "length" e' number in generale; l'intersezione
// col letterale calcolato lo restringe e rassicura il compiler.

// SUB<A,B>: sottrazione. Se una tupla lunga A si puo' scrivere come
// [...(lunga B), ...resto], allora A-B = length di resto.
type Sub<A extends number, B extends number> =
  BuildTuple<A> extends [...BuildTuple<B>, ...infer Rest] ? Rest["length"] : never;
type _t4e = Sub<5, 2>;                        // tipo: 3
type _t4f = Sub<7, 7>;                        // tipo: 0
// type _t4g = Sub<2, 5>;                     // tipo: never (underflow: nessun match)

// Confronto: A >= B vero se la sottrazione NON e' never.
type Gte<A extends number, B extends number> =
  Sub<A, B> extends never ? false : true;
type _t4h = Gte<5, 3>;                         // tipo: true
type _t4i = Gte<3, 5>;                         // tipo: false

// ============================================================================
// 5) CONDIZIONALI + RICORSIONE: cicli type-level
// ============================================================================

// La ricorsione e' il "while" del type system: ci si richiama con un
// accumulatore che si avvicina a un caso base.

// Length di una lista scritta a mano (equivalente a ["length"], ma didattico).
type LengthRec<T extends readonly unknown[], Acc extends unknown[] = []> =
  T extends readonly [unknown, ...infer Rest]
    ? LengthRec<Rest, [...Acc, unknown]>
    : Acc["length"];
type _t5a = LengthRec<["a", "b", "c", "d"]>;  // tipo: 4

// Reverse di una tupla: sposto la testa in coda all'accumulatore.
type Reverse<T extends readonly unknown[], Acc extends unknown[] = []> =
  T extends readonly [infer H, ...infer R] ? Reverse<R, [H, ...Acc]> : Acc;
type _t5b = Reverse<[1, 2, 3]>;               // tipo: [3, 2, 1]

// Repeat<T, N>: costruisce una tupla di N copie di T.
type Repeat<T, N extends number, Acc extends T[] = []> =
  Acc["length"] extends N ? Acc : Repeat<T, N, [...Acc, T]>;
type _t5c = Repeat<"P4", 3>;                  // tipo: ["P4", "P4", "P4"]

// Range<N>: [0, 1, ..., N-1] come tupla di letterali numerici.
// Ad ogni passo aggiungo l'indice corrente = length dell'accumulatore.
type Range<N extends number, Acc extends number[] = []> =
  Acc["length"] extends N ? Acc : Range<N, [...Acc, Acc["length"]]>;
type _t5d = Range<5>;                          // tipo: [0, 1, 2, 3, 4]

// Sum di una tupla di numeri (fold ricorsivo con Add).
type Sum<T extends number[], Acc extends number = 0> =
  T extends [infer H extends number, ...infer R extends number[]]
    ? Sum<R, Add<Acc, H>>
    : Acc;
type _t5e = Sum<[1, 2, 3, 4]>;                // tipo: 10

// ============================================================================
// 6) MINI-CALCOLI SU STRINGHE (template literal types)
// ============================================================================

// Le template literal types permettono pattern matching sulle stringhe con infer.

// Split di una stringa su un separatore (ricorsione + template literal).
type Split<S extends string, Sep extends string> =
  S extends `${infer Head}${Sep}${infer Rest}`
    ? [Head, ...Split<Rest, Sep>]
    : [S];
type _t6a = Split<"08:30", ":">;              // tipo: ["08", "30"]
type _t6b = Split<"a,b,c", ",">;              // tipo: ["a", "b", "c"]

// Join inverso: concatena una tupla di stringhe con un separatore.
type Join<T extends string[], Sep extends string> =
  T extends [infer H extends string, ...infer R extends string[]]
    ? R extends []
      ? H
      : `${H}${Sep}${Join<R, Sep>}`
    : "";
type _t6c = Join<["08", "30"], ":">;          // tipo: "08:30"

// Uppercase di un ruolo via intrinsic string type (utility built-in).
type _t6d = Uppercase<"admin">;               // tipo: "ADMIN"

// ============================================================================
// 7) ESEMPI ERP POLYURETECH REALISTICI
// ============================================================================

// --- 7.1 Modello dominio (mock, definiti qui: nessuna libreria esterna) ---
type Turno = "P4" | "P2" | "STD";
type OrarioHHMM = `${number}:${number}`;      // approssimazione template literal
type Badge = `UP-${number}`;                  // approssima /^UP-\d{3}$/

interface Dipendente {
  id: number;
  nome: string;
  badge: Badge;                               // es: "UP-001"
  ruolo: Ruolo;
}

interface Timbratura {
  dipendenteId: number;
  entrata: OrarioHHMM;                        // "08:30" naive-UTC
  uscita: OrarioHHMM | null;                  // null = turno aperto
  turno: Turno;
}

// --- 7.2 DTO derivato: rendo opzionali i campi calcolati lato server ---
// Pattern: mapped type + key remapping per costruire un "CreateDTO".
// Ometto id (autogenerato) e rendo uscita non richiesta alla creazione.
type CreateTimbraturaDTO = Omit<Timbratura, "uscita"> & { uscita?: OrarioHHMM };
const nuovaTimbratura: CreateTimbraturaDTO = {
  dipendenteId: 1,
  entrata: "08:00",
  turno: "P4",
};                                            // ok: uscita opzionale

// --- 7.3 Repository type-level: deriva i metodi dal nome dell'entita' ---
// Key remapping con template literal per generare "findDipendente", "saveDipendente".
type Repository<Name extends string, Entity> = {
  [K in Name as `find${Capitalize<K>}`]: (id: number) => Entity | null;
} & {
  [K in Name as `save${Capitalize<K>}`]: (e: Entity) => Entity;
};
type DipendenteRepo = Repository<"dipendente", Dipendente>;
// DipendenteRepo ha: findDipendente(id) e saveDipendente(e)
declare const repo: DipendenteRepo;
type _t7a = ReturnType<DipendenteRepo["findDipendente"]>; // tipo: Dipendente | null
type _t7b = Parameters<DipendenteRepo["saveDipendente"]>; // tipo: [Dipendente]

// --- 7.4 Validazione orario a livello tipo: "HH" e "MM" a 2 cifre ---
// Verifico che la stringa sia esattamente "d d : d d" con 4 cifre + ":".
type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type IsOrario<S extends string> =
  S extends `${Digit}${Digit}:${Digit}${Digit}` ? true : false;
type _t7c = IsOrario<"08:30">;                // tipo: true
type _t7d = IsOrario<"8:30">;                 // tipo: false (manca una cifra)
type _t7e = IsOrario<"08-30">;                // tipo: false (separatore errato)

// --- 7.5 State machine dei turni a livello tipo ---
// Transizioni ammesse: STD -> P2 -> P4; da P4 si torna a STD (fine giornata).
type NextTurno<T extends Turno> =
  T extends "STD" ? "P2" :
  T extends "P2" ? "P4" :
  T extends "P4" ? "STD" :
  never;
type _t7f = NextTurno<"STD">;                 // tipo: "P2"
type _t7g = NextTurno<"P4">;                  // tipo: "STD"

// CanTransition: la transizione X->Y e' valida se Y = NextTurno<X>.
type CanTransition<From extends Turno, To extends Turno> =
  NextTurno<From> extends To ? true : false;
type _t7h = CanTransition<"STD", "P2">;       // tipo: true
type _t7i = CanTransition<"STD", "P4">;       // tipo: false (salto non ammesso)

// --- 7.6 DeepReadonly ricorsivo per snapshot immutabili di stato ERP ---
type DeepReadonly<T> =
  T extends (infer E)[] ? readonly DeepReadonly<E>[] :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T;
type StatoImmutabile = DeepReadonly<{ dip: Dipendente; timbrature: Timbratura[] }>;
// StatoImmutabile.dip.nome e' readonly, timbrature e' readonly array, ecc.
declare const snap: StatoImmutabile;
// snap.dip.nome = "x";                       // ERRORE TS: readonly property
// snap.timbrature.push(nuovaTimbratura as never); // ERRORE TS: push non esiste su readonly[]

// ============================================================================
// 8) PATTERN "TIPI COME PROVE": asserzioni statiche sul dominio
// ============================================================================

// Usiamo Expect/Equal per congelare invarianti del dominio: se qualcuno cambia
// il tipo Ruolo e rompe un'assunzione, il file NON compila piu' (test statico).
type _p1 = Expect<Equal<RuoliScrittura<Ruolo>, "SuperAdmin" | "Admin">>;
type _p2 = Expect<Equal<Add<8, 4>, 12>>;
type _p3 = Expect<Equal<Split<"08:30", ":">, ["08", "30"]>>;
type _p4 = Expect<Equal<NextTurno<"P2">, "P4">>;
type _p5 = Expect<Equal<Sum<[1, 2, 3, 4]>, 10>>;

// ============================================================================
// 9) GOTCHA / PITFALLS
// ============================================================================

// GOTCHA 1 - Ricorsione troppo profonda: "Type instantiation is excessively deep".
// Add funziona per numeri piccoli; con numeri grandi TS supera il limite.
// type _g1 = Add<600, 600>;                  // ERRORE TS: Type instantiation is excessively deep and possibly infinite
// Soluzione: mantenere i numeri piccoli, oppure usare aritmetica a cifre, o
// evitare del tutto il calcolo type-level per range grandi.

// GOTCHA 2 - Distributivita' non voluta.
// Volevo sapere se l'INTERA union e' string; per errore uso il naked parameter
// e ottengo distribuzione membro a membro.
type _WrongAllString<T> = T extends string ? true : false;
type _g2wrong = _WrongAllString<string | number>; // tipo: boolean (true | false), NON quello che volevo
// Soluzione: disattivare la distributivita' con le tuple.
type AllString<T> = [T] extends [string] ? true : false;
type _g2ok = AllString<string | number>;      // tipo: false (corretto)

// GOTCHA 3 - Confusione tra "assegnabilita'" e "uguaglianza".
// A extends B non significa A === B. any e' assegnabile a tutto.
type _naive<A, B> = A extends B ? (B extends A ? true : false) : false;
type _g3 = _naive<{ a: any }, { a: 1 }>;      // tipo: true (INGANNEVOLE)
// Soluzione: usare Equal<> (i due tipi funzione) per un confronto stretto.
type _g3fix = Equal<{ a: any }, { a: 1 }>;    // tipo: false (corretto)

// GOTCHA 4 - infer nel punto sbagliato / vincoli mancanti.
// Senza il vincolo "extends number" su H, Add<Acc, H> non compilerebbe perche'
// H sarebbe unknown. I vincoli inline "infer H extends number" (TS 4.7+)
// filtrano E convertono in un colpo solo.
// type BadSum<T extends number[]> = T extends [infer H, ...infer R] ? Add<0, H> : 0; // ERRORE TS: H (unknown) non e' number
// Soluzione: "infer H extends number" come mostrato in Sum al punto 5.

// ============================================================================
// 10) EXPORT LOCALI (solo simboli definiti in questo file)
// ============================================================================

export type {
  Equal,
  Expect,
  NotEqual,
  Add,
  Sub,
  Gte,
  BuildTuple,
  Range,
  Sum,
  Reverse,
  Repeat,
  Split,
  Join,
  NextTurno,
  CanTransition,
  DeepReadonly,
  Repository,
  Ruolo,
  Turno,
  Dipendente,
  Timbratura,
  CreateTimbraturaDTO,
};

export { nuovaTimbratura };

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
// - Generic = funzione type-level: input tipo -> output tipo (Id<T>, Pair<A,B>).
// - Conditional type T extends U ? X : Y = "if" del type system.
// - Distributivita': naked parameter distribuisce sulla union; [T] la disattiva.
// - infer <V>: cattura pezzi di tipo durante il pattern match.
// - Aritmetica: numero <-> tupla via ["length"]; Add = concat, Sub = rest-match.
// - Ricorsione = "while" con accumulatore fino al caso base (BuildTuple, Range, Sum).
// - Template literal types: pattern match su stringhe (Split, Join, IsOrario).
// - Mapped type + key remapping (as): genera metodi/DTO (Repository, CreateDTO).
// - Equal<A,B> (doppio tipo funzione) = confronto stretto; Expect<T extends true> = assert.
// - PITFALL: profondita' eccessiva, distributivita' non voluta, assegnabilita' != uguaglianza, vincoli su infer.
// - AVVISO COMPLESSITA': il type-level programming e' potente ma costoso in
//   compilazione e leggibilita'; usarlo solo dove porta valore reale.
