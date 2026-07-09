/**
 * File 086 - ADV Functional Programming Typed
 * Programmazione funzionale tipizzata in TypeScript: compose/pipe con overload,
 * curry tipizzato, funzioni pure e transform pipeline sul dominio ERP Polyuretech
 * (Dipendente, Timbratura, Reparto). L'obiettivo e' capire il "perche'" del type
 * system: come gli overload guidano l'inferenza attraverso una catena di funzioni,
 * come si tipizza il currying ricorsivo e come si preservano i tipi in una pipeline.
 * Tutto compila con tsc --strict, target ES2022. Solo ASCII, spiegazioni in italiano.
 */

// ============================================================================
// SEZIONE 0 - Helper di test di tipo (Equal / Expect)
// ============================================================================

// Equal<A, B>: true SOLO se A e B sono identici. Il trucco dei due tipi
// funzione condizionali forza il compiler a confrontare la "identita'" dei
// tipi e non solo l'assegnabilita' (assignability). E' il pattern standard.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect<T>: accetta solo T=true, cosi' un test di tipo errato non compila.
type Expect<T extends true> = T;

// Esempi di uso: se il tipo non coincide, ERRORE TS in compile time.
type _t0 = Expect<Equal<string, string>>; // ok
// type _t0bad = Expect<Equal<string, number>>; // ERRORE TS: Type 'false' does not satisfy 'true'

// ============================================================================
// SEZIONE 1 - Dominio ERP Polyuretech (tipi mock, nessuna libreria)
// ============================================================================

// NB: questi sono tipi "mock" locali; in produzione arriverebbero da Prisma.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

// Badge tipizzato come template literal: pattern "UP-" + 3 cifre.
// A type-level non possiamo forzare "esattamente 3 cifre" con i template
// literal semplici, quindi usiamo un brand + validazione a runtime piu' avanti.
type Badge = `UP-${number}`;

interface Reparto {
  readonly id: number;
  readonly nome: string;
}

interface Dipendente {
  readonly id: number;
  readonly nome: string;
  readonly badge: Badge;
  readonly ruolo: Ruolo;
  readonly repartoId: number;
}

// Orario naive-UTC in formato "HH:MM" (validato a runtime con /^\d{2}:\d{2}$/).
type Orario = string;

interface Timbratura {
  readonly dipendenteId: number;
  readonly entrata: Orario; // "08:00"
  readonly uscita: Orario;  // "17:30"
  readonly turno: Turno;
}

export type { Ruolo, Turno, Badge, Reparto, Dipendente, Orario, Timbratura };

// ============================================================================
// SEZIONE 2 - Funzioni pure: definizione e proprieta'
// ============================================================================

// Una funzione pura: (a) stesso input -> stesso output, (b) nessun side effect.
// L'immutabilita' aiuta la purezza: readonly nei tipi impedisce mutazioni.

// Pura: nessuna mutazione dell'array in ingresso, ne crea uno nuovo.
const aggiungiMinuti = (orario: Orario, minuti: number): Orario => {
  const [h, m] = orario.split(":").map(Number);
  const totale = h * 60 + m + minuti;
  const hh = Math.floor((totale % 1440) / 60);
  const mm = totale % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};
// aggiungiMinuti("08:00", 90) // => "09:30"

// Impura (da NON usare): dipende da stato esterno mutabile. Solo esempio.
let _contatoreImpuro = 0;
const _prossimoId = (): number => ++_contatoreImpuro; // side effect: muta stato

// Helper puro di immutabilita': ritorna una copia congelata a livello di tipo.
const congela = <T>(x: T): Readonly<T> => Object.freeze({ ...x } as T);
// const d = congela(dip); d.nome = "x"; // ERRORE TS: Cannot assign to 'nome' (read-only)

// ============================================================================
// SEZIONE 3 - Compose e Pipe tipizzati con OVERLOAD
// ============================================================================

// Perche' gli overload? Una firma variadica generica sola non riesce a
// "propagare" il tipo di ritorno di f1 come input di f2, ecc. Con gli overload
// scriviamo una firma per ogni aritmeta' (2, 3, 4 funzioni...) e il compiler
// sceglie quella giusta, inferendo passo-passo i tipi intermedi A->B->C->D.

// UnaryFn: funzione a un solo argomento (necessario per pipe/compose).
type UnaryFn<A, B> = (a: A) => B;

// --- PIPE: esegue da SINISTRA a DESTRA. pipe(f, g)(x) === g(f(x)) ---
// Ogni overload aggiunge un anello nella catena e vincola i tipi intermedi.
function pipe<A, B>(f1: UnaryFn<A, B>): UnaryFn<A, B>;
function pipe<A, B, C>(f1: UnaryFn<A, B>, f2: UnaryFn<B, C>): UnaryFn<A, C>;
function pipe<A, B, C, D>(
  f1: UnaryFn<A, B>,
  f2: UnaryFn<B, C>,
  f3: UnaryFn<C, D>
): UnaryFn<A, D>;
function pipe<A, B, C, D, E>(
  f1: UnaryFn<A, B>,
  f2: UnaryFn<B, C>,
  f3: UnaryFn<C, D>,
  f4: UnaryFn<D, E>
): UnaryFn<A, E>;
// Firma di IMPLEMENTAZIONE: non visibile ai chiamanti, tipizzata "larga".
// I ...fns sono trattati come UnaryFn<any, any> solo qui dentro.
function pipe(...fns: Array<UnaryFn<any, any>>): UnaryFn<any, any> {
  return (x: any) => fns.reduce((acc, fn) => fn(acc), x);
}

// --- COMPOSE: esegue da DESTRA a SINISTRA. compose(f, g)(x) === f(g(x)) ---
// Nota come l'ordine dei tipi negli overload sia "invertito" rispetto a pipe.
function compose<A, B>(f1: UnaryFn<A, B>): UnaryFn<A, B>;
function compose<A, B, C>(f2: UnaryFn<B, C>, f1: UnaryFn<A, B>): UnaryFn<A, C>;
function compose<A, B, C, D>(
  f3: UnaryFn<C, D>,
  f2: UnaryFn<B, C>,
  f1: UnaryFn<A, B>
): UnaryFn<A, D>;
function compose(...fns: Array<UnaryFn<any, any>>): UnaryFn<any, any> {
  return (x: any) => fns.reduceRight((acc, fn) => fn(acc), x);
}

export { pipe, compose };
export type { UnaryFn };

// Esempio pipe: catena string -> number -> number -> string, tipi inferiti.
const lunghezza = (s: string): number => s.length;
const doppio = (n: number): number => n * 2;
const etichetta = (n: number): string => `val:${n}`;

const pipeline1 = pipe(lunghezza, doppio, etichetta);
// tipo: UnaryFn<string, string>
const r1 = pipeline1("Polyuretech"); // => "val:22"

// Esempio compose: stessa logica ma ordine di lettura invertito.
const composed1 = compose(etichetta, doppio, lunghezza);
// tipo: UnaryFn<string, string>
const rc1 = composed1("ERP"); // => "val:6"

// Verifica type-level: il ritorno e' davvero UnaryFn<string, string>.
type _tPipe = Expect<Equal<typeof pipeline1, UnaryFn<string, string>>>;

// GOTCHA: se un anello non combacia, l'errore appare sull'argomento sbagliato.
// const rotto = pipe(lunghezza, etichetta, doppio);
// ERRORE TS: Argument of type '(n: number) => number' is not assignable...
// perche' etichetta ritorna string ma doppio si aspetta number.

// ============================================================================
// SEZIONE 4 - Curry tipizzato (fixed-arity e ricorsivo)
// ============================================================================

// Currying: trasforma f(a, b, c) in f(a)(b)(c). La sfida e' tipizzare la
// catena di chiamate parziali. Partiamo dal caso a arieta' fissa (piu' leggibile).

// curry2: da (a, b) => r  a  a => b => r
function curry2<A, B, R>(f: (a: A, b: B) => R): (a: A) => (b: B) => R {
  return (a: A) => (b: B) => f(a, b);
}

// curry3: da (a, b, c) => r  a  a => b => c => r
function curry3<A, B, C, R>(
  f: (a: A, b: B, c: C) => R
): (a: A) => (b: B) => (c: C) => R {
  return (a: A) => (b: B) => (c: C) => f(a, b, c);
}

const somma3 = (a: number, b: number, c: number): number => a + b + c;
const somma3Curried = curry3(somma3);
const r2 = somma3Curried(1)(2)(3); // tipo: number, => 6

export { curry2, curry3 };

// --- Curry GENERICO ricorsivo a livello di tipo ---
// Curried<P, R>: dato un tuple di parametri P e ritorno R, produce la catena
// di funzioni unarie. La ricorsione sui tuple types e' il meccanismo chiave:
// [First, ...Rest] destruttura la testa, e ricorsivamente curry-a il resto.
type Curried<P extends any[], R> = P extends [infer First, ...infer Rest]
  ? Rest extends []
    ? (arg: First) => R // ultimo argomento: ritorna R
    : (arg: First) => Curried<Rest, R> // altrimenti: continua la catena
  : R; // nessun parametro: e' gia' un valore R

// curry generico: la firma pubblica usa Curried; l'implementazione accumula args.
function curry<P extends any[], R>(fn: (...args: P) => R): Curried<P, R> {
  const raccogli = (acc: any[]): any =>
    acc.length >= fn.length
      ? fn(...(acc as P))
      : (next: any) => raccogli([...acc, next]);
  return raccogli([]) as Curried<P, R>;
}

export { curry };
export type { Curried };

// Esempio: curry su funzione a 3 argomenti eterogenei.
const formatta = (badge: Badge, ruolo: Ruolo, attivo: boolean): string =>
  `${badge}/${ruolo}/${attivo ? "on" : "off"}`;

const formattaC = curry(formatta);
// tipo: (arg: Badge) => (arg: Ruolo) => (arg: boolean) => string
const r3 = formattaC("UP-001")("Operatore")(true); // => "UP-001/Operatore/on"

// Verifica type-level della catena curried.
type _tCurry = Expect<
  Equal<
    typeof formattaC,
    (arg: Badge) => (arg: Ruolo) => (arg: boolean) => string
  >
>;

// GOTCHA: fn.length ignora i parametri con default e i rest. Se la funzione ha
// parametri opzionali, il curry generico si "blocca" prima. Soluzione: currya
// solo funzioni a arieta' fissa, oppure passa esplicitamente il numero di args.

// ============================================================================
// SEZIONE 5 - Transform pipeline sul dominio ERP (esempio realistico)
// ============================================================================

// Dataset di esempio (immutabile: as const dove utile).
const reparti: readonly Reparto[] = [
  { id: 1, nome: "Produzione" },
  { id: 2, nome: "Qualita'" },
];

const dipendenti: readonly Dipendente[] = [
  { id: 1, nome: "Mario Rossi", badge: "UP-001", ruolo: "Operatore", repartoId: 1 },
  { id: 2, nome: "Lucia Bianchi", badge: "UP-002", ruolo: "Admin", repartoId: 2 },
  { id: 3, nome: "Gino Verdi", badge: "UP-003", ruolo: "Operatore", repartoId: 1 },
];

const timbrature: readonly Timbratura[] = [
  { dipendenteId: 1, entrata: "08:00", uscita: "17:00", turno: "STD" },
  { dipendenteId: 1, entrata: "08:15", uscita: "12:00", turno: "P4" },
  { dipendenteId: 3, entrata: "06:00", uscita: "14:00", turno: "P4" },
];

// Helper puri e generici, pensati per essere composti in pipe.
// Tutti prendono readonly array e ritornano nuovi array (nessuna mutazione).
const filtra =
  <T>(pred: (x: T) => boolean) =>
  (xs: readonly T[]): readonly T[] =>
    xs.filter(pred);

const mappa =
  <T, U>(f: (x: T) => U) =>
  (xs: readonly T[]): readonly U[] =>
    xs.map(f);

const ordina =
  <T>(cmp: (a: T, b: T) => number) =>
  (xs: readonly T[]): readonly T[] =>
    [...xs].sort(cmp); // copia: sort muterebbe l'originale

// Minuti lavorati da una timbratura (funzione pura di dominio).
const minutiLavorati = (t: Timbratura): number => {
  const [he, me] = t.entrata.split(":").map(Number);
  const [hu, mu] = t.uscita.split(":").map(Number);
  return hu * 60 + mu - (he * 60 + me);
};

// DTO di output della pipeline (transform: Timbratura -> RiepilogoDTO).
interface RiepilogoDTO {
  readonly dipendenteId: number;
  readonly turno: Turno;
  readonly minuti: number;
  readonly ore: string; // "HH:MM"
}

const toRiepilogo = (t: Timbratura): RiepilogoDTO => {
  const min = minutiLavorati(t);
  return {
    dipendenteId: t.dipendenteId,
    turno: t.turno,
    minuti: min,
    ore: aggiungiMinuti("00:00", min),
  };
};

// Pipeline 1: solo turni P4, trasforma in DTO, ordina per minuti desc.
// I tipi fluiscono: readonly Timbratura[] -> readonly Timbratura[] ->
// readonly RiepilogoDTO[] -> readonly RiepilogoDTO[].
const soloP4EOrdinati = pipe(
  filtra<Timbratura>((t) => t.turno === "P4"),
  mappa(toRiepilogo),
  ordina<RiepilogoDTO>((a, b) => b.minuti - a.minuti)
);
// tipo: UnaryFn<readonly Timbratura[], readonly RiepilogoDTO[]>
const riepilogoP4 = soloP4EOrdinati(timbrature);
// => [{dipendenteId:3, turno:"P4", minuti:480, ore:"08:00"},
//     {dipendenteId:1, turno:"P4", minuti:225, ore:"03:45"}]

type _tPipeErp = Expect<
  Equal<typeof soloP4EOrdinati, UnaryFn<readonly Timbratura[], readonly RiepilogoDTO[]>>
>;

// ============================================================================
// SEZIONE 6 - Repository pattern funzionale + reducer tipizzato
// ============================================================================

// Un "repository" puro: funzioni che interrogano un dataset immutabile.
// Nessun accesso a DB reale: qui il dataset e' in memoria (mock).
const trovaPerBadge =
  (badge: Badge) =>
  (xs: readonly Dipendente[]): Dipendente | undefined =>
    xs.find((d) => d.badge === badge);

const nomeReparto =
  (rs: readonly Reparto[]) =>
  (d: Dipendente): string =>
    rs.find((r) => r.id === d.repartoId)?.nome ?? "N/D";

// Composizione: dal badge al nome del reparto in un colpo solo.
// NB: usiamo funzioni intermedie unarie per restare compatibili con pipe.
const badgeAlReparto = (badge: Badge): string => {
  const dip = trovaPerBadge(badge)(dipendenti);
  return dip ? nomeReparto(reparti)(dip) : "N/D";
};
// badgeAlReparto("UP-003") // => "Produzione"

// Reduce tipizzato: raggruppa minuti per dipendente. Record<number, number>.
const totaleMinutiPerDipendente = (
  ts: readonly Timbratura[]
): Readonly<Record<number, number>> =>
  ts.reduce<Record<number, number>>((acc, t) => {
    acc[t.dipendenteId] = (acc[t.dipendenteId] ?? 0) + minutiLavorati(t);
    return acc;
  }, {});
// totaleMinutiPerDipendente(timbrature) // => { "1": 525, "3": 480 }

export { trovaPerBadge, nomeReparto, badgeAlReparto, totaleMinutiPerDipendente };
export type { RiepilogoDTO };

// ============================================================================
// SEZIONE 7 - Result monad (gestione errori senza throw, type-safe)
// ============================================================================

// In FP evitiamo throw: modelliamo il fallimento nel tipo. Result e' una union
// discriminata; il campo "ok" e' il discriminante che abilita il narrowing.
type Result<T, E = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// mapResult: applica f solo sul ramo ok. Il tipo di errore E resta invariato.
const mapResult =
  <T, U, E>(f: (t: T) => U) =>
  (r: Result<T, E>): Result<U, E> =>
    r.ok ? ok(f(r.value)) : r;

// chainResult (flatMap/bind): per concatenare operazioni che possono fallire.
// Cruciale per non annidare Result<Result<...>>.
const chainResult =
  <T, U, E>(f: (t: T) => Result<U, E>) =>
  (r: Result<T, E>): Result<U, E> =>
    r.ok ? f(r.value) : r;

// Validazioni pure di dominio che ritornano Result.
const validaOrario = (s: string): Result<Orario> =>
  /^\d{2}:\d{2}$/.test(s) ? ok(s) : err(`orario non valido: ${s}`);

const validaBadge = (s: string): Result<Badge> =>
  /^UP-\d{3}$/.test(s) ? ok(s as Badge) : err(`badge non valido: ${s}`);

// Pipeline di validazione: badge + orario, corto-circuito al primo errore.
const validaTimbraturaInput = (badge: string, entrata: string): Result<{ badge: Badge; entrata: Orario }> => {
  const rb = validaBadge(badge);
  if (!rb.ok) return rb; // narrowing: qui rb e' il ramo error
  const re = validaOrario(entrata);
  if (!re.ok) return re;
  return ok({ badge: rb.value, entrata: re.value });
};
// validaTimbraturaInput("UP-001", "08:00") // => { ok:true, value:{...} }
// validaTimbraturaInput("X-1", "08:00")     // => { ok:false, error:"badge non valido: X-1" }

export { ok, err, mapResult, chainResult, validaOrario, validaBadge, validaTimbraturaInput };
export type { Result };

// ============================================================================
// SEZIONE 8 - Point-free style e tap (debug puro)
// ============================================================================

// Point-free: definire funzioni senza nominare gli argomenti, componendo.
// Qui "riepilogaMinuti" e' point-free: nessun parametro esplicito nominato.
const riepilogaMinuti: UnaryFn<readonly Timbratura[], readonly number[]> = pipe(
  filtra<Timbratura>((t) => t.turno !== "STD"),
  mappa(minutiLavorati)
);
// riepilogaMinuti(timbrature) // => [225, 480]

// tap: esegue un side effect (log) ma ritorna il valore intatto -> resta
// componibile in pipe. Utile per debug senza rompere la catena.
const tap =
  <T>(effetto: (x: T) => void) =>
  (x: T): T => {
    effetto(x);
    return x;
  };

// Esempio (non eseguito): inserire un tap in mezzo a una pipe per ispezionare.
// const debugPipe = pipe(
//   filtra<Timbratura>((t) => t.turno === "P4"),
//   tap((xs) => console.log("dopo filtro:", xs.length)),
//   mappa(toRiepilogo)
// );

export { riepilogaMinuti, tap };

// ============================================================================
// SEZIONE 9 - GOTCHA / PITFALLS
// ============================================================================

// PITFALL 1 - Inferenza generica persa nella pipe.
// Se passi una funzione generica "nuda" a pipe, TS potrebbe fissare il generico
// a {} o unknown. Soluzione: istanziare esplicitamente (filtra<Timbratura>).
// const p = pipe(filtra, mappa(minutiLavorati)); // ERRORE TS: generico non risolto
// Corretto: pipe(filtra<Timbratura>((t)=>true), ...)

// PITFALL 2 - Ordine invertito compose vs pipe.
// compose(f, g)(x) === f(g(x)) (destra->sinistra). Confonderlo produce catene
// che NON compilano perche' i tipi intermedi non combaciano.
// const bad = compose(lunghezza, doppio); // ERRORE TS: number non e' string

// PITFALL 3 - Mutazione nascosta in funzioni "pure".
// Array.prototype.sort muta in place: una "funzione pura" che fa xs.sort()
// corrompe l'input. Soluzione: [...xs].sort() come in ordina().
// const impura = (xs: number[]) => xs.sort(); // muta xs -> NON pura

// PITFALL 4 - Overload troppo corti.
// Gli overload di pipe/compose arrivano a 4-5 funzioni. Oltre, TS cade sulla
// firma di implementazione (any) e perde i tipi. Soluzione: aggiungere overload
// o spezzare la pipe in due pipe piu' corte annidate.
// const troppoLunga = pipe(f1,f2,f3,f4,f5,f6); // ritorno: any (nessun overload)

// PITFALL 5 - Curry e parametri opzionali.
// curry usa fn.length che NON conta parametri con "=" default o "?". La catena
// si chiude troppo presto. Soluzione: currya solo arieta' fissa e obbligatoria.

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
// - Funzione pura: stesso input->output, nessun side effect; readonly per immutabilita'.
// - pipe(f,g): esecuzione sinistra->destra, g(f(x)); tipizzata con overload per arieta'.
// - compose(f,g): esecuzione destra->sinistra, f(g(x)); ordine tipi invertito.
// - UnaryFn<A,B>: (a:A)=>B, mattone base di pipe/compose.
// - Overload: una firma per aritmeta'; il compiler propaga A->B->C->D passo-passo.
// - Firma di implementazione (any): invisibile ai chiamanti, non tipizza le call.
// - Curry: f(a,b,c) -> a=>b=>c=>r; curry2/curry3 fissi; curry generico ricorsivo.
// - Curried<P,R>: tipo ricorsivo su tuple [First,...Rest] che costruisce la catena.
// - fn.length: base del curry a runtime; ignora default e rest params (pitfall).
// - Transform pipeline: filtra/mappa/ordina generici e componibili su dataset ERP.
// - Reduce tipizzato: reduce<Acc> per raggruppamenti (Record<number, number>).
// - Result<T,E>: union discriminata (ok:true/false) per errori senza throw.
// - map/chain su Result: trasforma/concatena preservando il ramo error.
// - tap: side effect componibile che ritorna il valore intatto (debug).
// - Point-free: comporre senza nominare gli argomenti.
// - Equal/Expect: test di tipo compile-time con il trucco delle funzioni condizionali.
