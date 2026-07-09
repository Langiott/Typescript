/**
 * File 085 - ADV Result/Either pattern
 * Livello: ADVANCED
 * Il pattern Result<T,E> modella successo/errore come VALORE (non eccezione):
 * un discriminated union Ok<T> | Err<E> che il type system obbliga a gestire.
 * Either<L,R> e' la sua forma piu' generica (Left = per convenzione errore, Right = valore).
 * Dominio ERP Polyuretech: validazione DipendenteInput e parse orario "HH:MM" naive-UTC.
 */

// ============================================================================
// SEZIONE 1 - Result<T,E>: definizione con discriminante
// ============================================================================
// L'idea: invece di "lanciare", una funzione RESTITUISCE un oggetto che dice
// esplicitamente se e' andata bene (ok) o male (err). Il campo "ok" (letterale
// true/false) e' il DISCRIMINANTE: consente il narrowing esaustivo.

interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

type Result<T, E> = Ok<T> | Err<E>;

// Nota: usiamo "readonly" per rendere i Result immutabili una volta creati.
// Il discriminante "ok" e' un tipo letterale (true / false), non "boolean":
// questo permette a TypeScript di restringere l'unione via if/switch.

// ============================================================================
// SEZIONE 2 - Costruttori ok() / err()
// ============================================================================
// Funzioni-fabbrica: nascondono la forma dell'oggetto e migliorano l'inferenza.
// Il tipo di ritorno e' esplicitamente Result<...> cosi' l'inferenza al chiamante
// tratta il valore come UNIONE, non come Ok o Err specifico (piu' comodo in catena).

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Perche' "never" nell'altro ramo?
// ok(42) ha tipo Result<number, never>: "never" indica "qui NON puo' esserci errore".
// In unione, X | never === X, quindi Result<number, never> si combina bene con
// Result<number, string> restituendo Result<number, string>.

// Esempi:
const r1 = ok(42);
// tipo: Result<number, never>
const r2 = err("badge non valido");
// tipo: Result<never, string>

// ============================================================================
// SEZIONE 3 - Type guard isOk / isErr
// ============================================================================
// I type guard restringono il tipo. La firma "res is Ok<T>" e' una type predicate:
// dopo un if(isOk(res)) il compilatore SA che res.value esiste.

function isOk<T, E>(res: Result<T, E>): res is Ok<T> {
  return res.ok === true;
}

function isErr<T, E>(res: Result<T, E>): res is Err<E> {
  return res.ok === false;
}

// Uso:
const esempioGuard = ok(7) as Result<number, string>;
if (isOk(esempioGuard)) {
  const v = esempioGuard.value;
  // tipo dentro il ramo: number (narrowed a Ok<number>)
  void v;
} else {
  const e = esempioGuard.error;
  // tipo: string (narrowed a Err<string>)
  void e;
}

// In realta' il discriminante "ok" basta da solo: if (res.ok) { res.value }.
// I type guard sono utili quando passiamo il Result ad altre funzioni/filtri.

// ============================================================================
// SEZIONE 4 - Combinatori: map, mapErr, flatMap/andThen, unwrapOr
// ============================================================================
// Trasformano un Result senza fare "if" a mano ovunque. Sono il cuore del pattern.

// map: trasforma il VALORE di successo, lascia intatto l'errore.
function map<T, E, U>(res: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return res.ok ? ok(fn(res.value)) : res;
}

// mapErr: trasforma l'ERRORE, lascia intatto il valore.
function mapErr<T, E, F>(res: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return res.ok ? res : err(fn(res.error));
}

// flatMap (alias andThen): concatena una funzione che a sua volta ritorna un
// Result. Evita il nesting Result<Result<...>>. E' il "bind" delle monadi.
function flatMap<T, E, U>(
  res: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return res.ok ? fn(res.value) : res;
}

// andThen: stesso identico comportamento di flatMap, nome piu' "parlante"
// (usato in Rust). Lo esponiamo come alias.
const andThen = flatMap;

// unwrapOr: estrae il valore, oppure ritorna un default se e' un errore.
// Cosi' "usciamo" dal mondo Result in modo sicuro (mai un throw).
function unwrapOr<T, E>(res: Result<T, E>, fallback: T): T {
  return res.ok ? res.value : fallback;
}

// Esempi combinatori:
const m1 = map(ok(10) as Result<number, string>, (n) => n * 2);
// tipo: Result<number, string> -> Ok, value 20
const m2 = map(err("x") as Result<number, string>, (n) => n * 2);
// tipo: Result<number, string> -> Err, error "x" (fn NON eseguita)

const me1 = mapErr(err("grezzo") as Result<number, string>, (e) => `E:${e}`);
// tipo: Result<number, string> -> Err "E:grezzo"

const fm1 = flatMap(ok(4) as Result<number, string>, (n) =>
  n > 0 ? ok(n + 1) : err("non positivo"),
);
// tipo: Result<number, string> -> Ok 5

const uw1 = unwrapOr(err("boom") as Result<number, string>, -1);
// tipo: number => -1
const uw2 = unwrapOr(ok(99) as Result<number, string>, -1);
// tipo: number => 99

void r1;
void r2;
void m1;
void m2;
void me1;
void fm1;
void uw1;
void uw2;

// ============================================================================
// SEZIONE 5 - Either<L,R>: la forma generica
// ============================================================================
// Result e' un Either "specializzato". Either non impone una semantica:
// per convenzione Left = errore/alternativa, Right = valore "giusto" (right = corretto).
// Discriminante: campo "_tag".

interface Left<L> {
  readonly _tag: "Left";
  readonly left: L;
}

interface Right<R> {
  readonly _tag: "Right";
  readonly right: R;
}

type Either<L, R> = Left<L> | Right<R>;

function left<L>(value: L): Either<L, never> {
  return { _tag: "Left", left: value };
}

function right<R>(value: R): Either<never, R> {
  return { _tag: "Right", right: value };
}

function isLeft<L, R>(e: Either<L, R>): e is Left<L> {
  return e._tag === "Left";
}

function isRight<L, R>(e: Either<L, R>): e is Right<R> {
  return e._tag === "Right";
}

// Ponte Either -> Result: Right diventa Ok, Left diventa Err.
function eitherToResult<L, R>(e: Either<L, R>): Result<R, L> {
  return isRight(e) ? ok(e.right) : err(e.left);
}

const ei1 = right<number>(5);
// tipo: Either<string, number> -> Right 5
const ei2 = left<string>("nope");
// tipo: Either<string, number> -> Left "nope"
const conv = eitherToResult(ei1);
// tipo: Result<number, string> -> Ok 5
void ei2;
void conv;

// ============================================================================
// SEZIONE 6 - Modello dominio ERP + errori tipizzati
// ============================================================================

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  readonly id: number;
  readonly nome: string;
  readonly badge: string; // formato "UP-001"
  readonly ruolo: Ruolo;
}

// Input "grezzo" che arriva dalla UI/API: campi potenzialmente sporchi.
interface DipendenteInput {
  readonly id: unknown;
  readonly nome: unknown;
  readonly badge: unknown;
  readonly ruolo: unknown;
}

// Errori come UNIONE discriminata: cosi' il chiamante puo' switchare sul "kind".
// Molto meglio di stringhe libere: il compilatore aiuta a gestirli tutti.
type ValidationError =
  | { readonly kind: "MissingField"; readonly field: string }
  | { readonly kind: "BadType"; readonly field: string; readonly expected: string }
  | { readonly kind: "BadBadge"; readonly value: string }
  | { readonly kind: "BadRuolo"; readonly value: string };

const RUOLI: readonly Ruolo[] = ["SuperAdmin", "Admin", "Operatore", "QrDisplay"];
const BADGE_RE = /^UP-\d{3}$/;
const ORARIO_RE = /^\d{2}:\d{2}$/;

// ============================================================================
// SEZIONE 7 - Validazione campo per campo (ognuna ritorna un Result)
// ============================================================================

function validaId(v: unknown): Result<number, ValidationError> {
  if (v === undefined || v === null) return err({ kind: "MissingField", field: "id" });
  if (typeof v !== "number" || !Number.isInteger(v))
    return err({ kind: "BadType", field: "id", expected: "integer" });
  return ok(v);
}

function validaNome(v: unknown): Result<string, ValidationError> {
  if (v === undefined || v === null) return err({ kind: "MissingField", field: "nome" });
  if (typeof v !== "string") return err({ kind: "BadType", field: "nome", expected: "string" });
  return ok(v);
}

function validaBadge(v: unknown): Result<string, ValidationError> {
  if (v === undefined || v === null) return err({ kind: "MissingField", field: "badge" });
  if (typeof v !== "string") return err({ kind: "BadType", field: "badge", expected: "string" });
  if (!BADGE_RE.test(v)) return err({ kind: "BadBadge", value: v });
  return ok(v);
}

function validaRuolo(v: unknown): Result<Ruolo, ValidationError> {
  if (v === undefined || v === null) return err({ kind: "MissingField", field: "ruolo" });
  if (typeof v !== "string") return err({ kind: "BadType", field: "ruolo", expected: "string" });
  // includes su readonly array di stringhe: serve un cast controllato per il narrowing.
  if (!RUOLI.includes(v as Ruolo)) return err({ kind: "BadRuolo", value: v });
  return ok(v as Ruolo);
}

// Composizione: usiamo flatMap per fermarci al primo errore (fail-fast).
// Ogni andThen aggiunge un campo solo se i precedenti sono andati bene.
function validaDipendente(input: DipendenteInput): Result<Dipendente, ValidationError> {
  return flatMap(validaId(input.id), (id) =>
    flatMap(validaNome(input.nome), (nome) =>
      flatMap(validaBadge(input.badge), (badge) =>
        map(validaRuolo(input.ruolo), (ruolo) => ({ id, nome, badge, ruolo })),
      ),
    ),
  );
}

// Esempi validazione:
const dipOk = validaDipendente({ id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Operatore" });
// tipo: Result<Dipendente, ValidationError> -> Ok
const dipBadBadge = validaDipendente({ id: 2, nome: "Bianchi", badge: "X-1", ruolo: "Admin" });
// tipo: Result<Dipendente, ValidationError> -> Err { kind: "BadBadge", value: "X-1" }
const dipMiss = validaDipendente({ id: undefined, nome: "Verdi", badge: "UP-009", ruolo: "Admin" });
// tipo: Result<Dipendente, ValidationError> -> Err { kind: "MissingField", field: "id" }

if (isErr(dipBadBadge)) {
  // switch esaustivo sul discriminante "kind"
  switch (dipBadBadge.error.kind) {
    case "MissingField":
      break;
    case "BadType":
      break;
    case "BadBadge":
      // dipBadBadge.error.value: string
      break;
    case "BadRuolo":
      break;
    // default non necessario: l'unione e' esaustiva. Se aggiungessimo un kind
    // nuovo e dimenticassimo un case, con "noImplicitReturns"/exhaustive check
    // il compilatore ci avviserebbe (vedi assertNever piu' sotto).
  }
}
void dipOk;
void dipMiss;

// ============================================================================
// SEZIONE 8 - parse orario "HH:MM" che RITORNA Result (niente throw)
// ============================================================================
// Gli orari nell'ERP sono naive-UTC ("08:30"). Un parser che lancia costringe
// a try/catch sparsi; con Result l'errore e' parte della firma.

type OrarioError =
  | { readonly kind: "FormatoOrario"; readonly value: string }
  | { readonly kind: "OreFuoriRange"; readonly ore: number }
  | { readonly kind: "MinutiFuoriRange"; readonly minuti: number };

interface Orario {
  readonly ore: number; // 0..23
  readonly minuti: number; // 0..59
}

function parseOrario(s: string): Result<Orario, OrarioError> {
  if (!ORARIO_RE.test(s)) return err({ kind: "FormatoOrario", value: s });
  const ore = Number(s.slice(0, 2));
  const minuti = Number(s.slice(3, 5));
  if (ore > 23) return err({ kind: "OreFuoriRange", ore });
  if (minuti > 59) return err({ kind: "MinutiFuoriRange", minuti });
  return ok({ ore, minuti });
}

// Esempi parse:
const o1 = parseOrario("08:30");
// tipo: Result<Orario, OrarioError> -> Ok { ore: 8, minuti: 30 }
const o2 = parseOrario("8:3");
// tipo: Result<Orario, OrarioError> -> Err { kind: "FormatoOrario", value: "8:3" }
const o3 = parseOrario("25:00");
// tipo: Result<Orario, OrarioError> -> Err { kind: "OreFuoriRange", ore: 25 }
const o4 = parseOrario("10:75");
// tipo: Result<Orario, OrarioError> -> Err { kind: "MinutiFuoriRange", minuti: 75 }
void o1;
void o2;
void o3;
void o4;

// Converte in minuti-dall-inizio-giornata: utile per confronti timbrature.
function orarioInMinuti(o: Orario): number {
  return o.ore * 60 + o.minuti;
}

// ============================================================================
// SEZIONE 9 - Catena di operazioni (timbratura entrata/uscita)
// ============================================================================
// Vogliamo: parse entrata -> parse uscita -> verifica che uscita > entrata ->
// calcolo durata. Ogni passo puo' fallire; la catena si ferma al primo errore.

type TimbraturaError =
  | OrarioError
  | { readonly kind: "UscitaPrimaDiEntrata"; readonly entrata: string; readonly uscita: string };

interface DurataTurno {
  readonly minuti: number;
}

// Nota: entrambe le funzioni di parse ritornano OrarioError; per concatenarle
// nella stessa catena allarghiamo l'errore a TimbraturaError con mapErr (qui e'
// un no-op semantico perche' OrarioError e' sottoinsieme di TimbraturaError,
// ma rende il tipo dell'unione esplicito e uniforme).
function calcolaDurata(
  entrataStr: string,
  uscitaStr: string,
): Result<DurataTurno, TimbraturaError> {
  const eR: Result<Orario, TimbraturaError> = parseOrario(entrataStr);
  return flatMap(eR, (entrata) => {
    const uR: Result<Orario, TimbraturaError> = parseOrario(uscitaStr);
    return flatMap(uR, (uscita) => {
      const dm = orarioInMinuti(uscita) - orarioInMinuti(entrata);
      if (dm <= 0)
        return err({ kind: "UscitaPrimaDiEntrata", entrata: entrataStr, uscita: uscitaStr });
      return ok({ minuti: dm });
    });
  });
}

// Esempi catena:
const t1 = calcolaDurata("08:00", "17:30");
// tipo: Result<DurataTurno, TimbraturaError> -> Ok { minuti: 570 }
const t2 = calcolaDurata("08:00", "07:00");
// tipo: Result<DurataTurno, TimbraturaError> -> Err { kind: "UscitaPrimaDiEntrata", ... }
const t3 = calcolaDurata("08:xx", "17:00");
// tipo: Result<DurataTurno, TimbraturaError> -> Err { kind: "FormatoOrario", value: "08:xx" }

// Consumo tipico: unwrapOr per un default, oppure map per formattare.
const durataMin = unwrapOr(map(t1, (d) => d.minuti), 0);
// tipo: number => 570
const descrizione = isOk(t3)
  ? `Durata ${t3.value.minuti} min`
  : `Errore timbratura: ${t3.error.kind}`;
// tipo: string => "Errore timbratura: FormatoOrario"
void t2;
void durataMin;
void descrizione;

// Combina catena Result con il modello Dipendente: dato un input grezzo e due
// orari, produce un "record turno" completo, fermandosi al primo errore.
type TurnoError = ValidationError | TimbraturaError;

interface RecordTurno {
  readonly dipendente: Dipendente;
  readonly durata: DurataTurno;
  readonly turno: Turno;
}

function registraTurno(
  input: DipendenteInput,
  entrata: string,
  uscita: string,
  turno: Turno,
): Result<RecordTurno, TurnoError> {
  // validaDipendente -> ValidationError; allarghiamo l'errore all'unione TurnoError.
  const dipR: Result<Dipendente, TurnoError> = validaDipendente(input);
  return flatMap(dipR, (dipendente) => {
    const durR: Result<DurataTurno, TurnoError> = calcolaDurata(entrata, uscita);
    return map(durR, (durata) => ({ dipendente, durata, turno }));
  });
}

const rec = registraTurno(
  { id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Operatore" },
  "08:00",
  "16:00",
  "STD",
);
// tipo: Result<RecordTurno, TurnoError> -> Ok (durata 480 min)
void rec;

// ============================================================================
// SEZIONE 10 - assertNever: exhaustiveness check sugli errori
// ============================================================================
// Pattern per garantire di aver gestito TUTTI i kind. Se l'unione cresce e un
// case manca, "x" non e' piu' "never" e il compilatore segnala l'errore.

function assertNever(x: never): never {
  throw new Error("Caso non gestito: " + JSON.stringify(x));
}

function descriviValidationError(e: ValidationError): string {
  switch (e.kind) {
    case "MissingField":
      return `Campo mancante: ${e.field}`;
    case "BadType":
      return `Tipo errato per ${e.field}, atteso ${e.expected}`;
    case "BadBadge":
      return `Badge non valido: ${e.value}`;
    case "BadRuolo":
      return `Ruolo non valido: ${e.value}`;
    default:
      // Se togliessimo un case sopra:
      // ERRORE TS: Argument of type 'ValidationError' is not assignable to parameter of type 'never'.
      return assertNever(e);
  }
}
void descriviValidationError;

// ============================================================================
// SEZIONE 11 - GOTCHA / PITFALLS
// ============================================================================

// GOTCHA 1 - Il discriminante DEVE essere un tipo letterale, non "boolean".
//   interface OkBad<T> { ok: boolean; value: T }  // <-- boolean generico
//   Con "ok: boolean" il narrowing if(res.ok) NON restringe l'unione: TypeScript
//   non sa distinguere Ok da Err. Usare sempre "ok: true" / "ok: false".

// GOTCHA 2 - map/flatMap NON eseguono la funzione se il Result e' Err.
//   Aspettarsi side effect "sempre" e' un errore logico:
const spia = map(err("x") as Result<number, string>, (n) => {
  // questo blocco NON viene eseguito perche' il Result e' Err
  return n * 2;
});
// tipo: Result<number, string> (resta l'Err originale)
void spia;

// GOTCHA 3 - unwrap "cieco" (senza controllo) reintroduce il throw.
//   Un ipotetico unwrap(res) che fa "if(!res.ok) throw res.error" annulla i
//   vantaggi del pattern. Preferire unwrapOr / match / narrowing. Qui NON lo
//   definiamo apposta: usiamo unwrapOr o gli isOk/isErr.

// GOTCHA 4 - Tipi errore incompatibili in catena.
//   flatMap richiede lo STESSO tipo E su entrambi i Result. Se una funzione
//   ritorna Result<_, OrarioError> e un'altra Result<_, ValidationError>, non
//   si concatenano direttamente:
//   ERRORE TS: Argument of type 'Result<number, OrarioError>' is not assignable
//   to parameter '(value: T) => Result<U, ValidationError>'.
//   Soluzione: allargare l'errore all'unione (come TurnoError) o usare mapErr
//   per uniformare, esattamente come fatto in registraTurno().

// GOTCHA 5 - "ok" come funzione vs "ok" come campo.
//   Abbiamo la funzione costruttore ok() e il campo booleano res.ok: nomi simili
//   ma contesti diversi. Non confonderli; alcuni preferiscono chiamare i
//   costruttori Ok/Err (maiuscoli) o success/failure per evitare ambiguita'.

// GOTCHA 6 - Result<never, never> da ok(...) usato male.
//   ok() ritorna Result<T, never>. Se assegni ok(1) a Result<number, string>
//   va bene (never e' sottotipo di string). Ma se vuoi che l'inferenza tratti
//   il ramo come unione fin da subito, annota il tipo di ritorno della funzione
//   (come fanno validaId ecc.), non affidarti all'inferenza locale.

// GOTCHA 7 - Non "svuotare" l'errore troppo presto.
//   Fare unwrapOr all'inizio della catena butta via l'informazione sull'errore.
//   Mantieni il Result il piu' a lungo possibile e "esci" (unwrapOr/match) solo
//   al confine (controller HTTP, log), dove decidi cosa fare del fallimento.

// ============================================================================
// SEZIONE 12 - Helper Equal / Expect (type-level testing, opzionale)
// ============================================================================
// Verificano UGUAGLIANZE DI TIPO a compile-time. Nessun effetto a runtime.

type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;

type Expect<T extends true> = T;

// Casi di test (se una condizione fosse falsa -> errore di compilazione):
// Nota: "typeof ok" e "typeof unwrapOr" sono i tipi delle funzioni GENERICHE.
// NON possiamo instanziarli con argomenti di tipo in una "typeof" query
// (typeof ok<number> darebbe TS2558: "Expected 1 type arguments"); usiamo
// invece ReturnType applicato al tipo generico, che TypeScript risolve con i
// default/inferenza dei parametri e ci basta per il test didattico.
type _T1 = Expect<Equal<ReturnType<typeof ok>, Result<unknown, never>>>;
type _T2 = Expect<Equal<ReturnType<typeof parseOrario>, Result<Orario, OrarioError>>>;
type _T3 = Expect<Equal<typeof andThen, typeof flatMap>>;
// _T4 verifica che unwrapOr estragga T (il primo parametro di tipo):
type _T4 = Expect<Equal<ReturnType<typeof unwrapOr>, unknown>>;

// Esempio di test NEGATIVO (commentato: se decommentato NON compila):
// type _Bad = Expect<Equal<Result<number, string>, string>>;
// ERRORE TS: Type 'false' does not satisfy the constraint 'true'.

// "Usiamo" gli alias di tipo per evitare warning noUnusedLocals sui tipi
// (i type alias non generano noUnusedLocals, ma li citiamo per chiarezza).
export type { _T1, _T2, _T3, _T4 };

// ============================================================================
// SEZIONE 13 - Export dei simboli locali (riuso didattico)
// ============================================================================
export {
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  flatMap,
  andThen,
  unwrapOr,
  left,
  right,
  isLeft,
  isRight,
  eitherToResult,
  validaDipendente,
  parseOrario,
  orarioInMinuti,
  calcolaDurata,
  registraTurno,
  descriviValidationError,
  assertNever,
};
export type {
  Ok,
  Err,
  Result,
  Either,
  Left,
  Right,
  Dipendente,
  DipendenteInput,
  Ruolo,
  Turno,
  ValidationError,
  Orario,
  OrarioError,
  TimbraturaError,
  TurnoError,
  DurataTurno,
  RecordTurno,
  Equal,
  Expect,
};

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
// - Result<T,E> = Ok<T> | Err<E>: errore come VALORE, non eccezione.
// - Discriminante letterale "ok: true"/"ok: false" abilita il narrowing.
// - Costruttori: ok(v): Result<T,never>, err(e): Result<never,E>.
// - Type guard: isOk (res is Ok<T>), isErr (res is Err<E>).
// - Combinatori: map (valore), mapErr (errore), flatMap/andThen (concatena Result), unwrapOr (esce con default).
// - Either<L,R> = Left<L> | Right<R>: forma generica; Left=errore, Right=valore; ponte eitherToResult.
// - Errori come union discriminata (kind) -> switch esaustivo + assertNever.
// - validaDipendente: catena fail-fast di validazioni campo-per-campo.
// - parseOrario "HH:MM": ritorna Result invece di lanciare (naive-UTC ERP).
// - calcolaDurata / registraTurno: catene multi-step con errore allargato all'unione.
// - PITFALL: discriminante non-boolean, fn non eseguita su Err, unwrap cieco = throw, tipi E incompatibili in catena, uscire dal Result troppo presto.
// - Equal/Expect: test di uguaglianza di tipo a compile-time.
