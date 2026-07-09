/**
 * 112_TS_Narrowing_Advanced.ts
 * File 112 - Narrowing avanzato (control flow analysis)
 *
 * Il narrowing e' il processo con cui il compilatore restringe (narrow) il tipo
 * statico di una variabile lungo i rami di controllo del codice, sfruttando la
 * control flow analysis (CFA). Qui approfondiamo: discriminated union, assertion
 * function, custom type guard, combinazione di in/typeof/instanceof, const
 * narrowing e aliasing (come il compilatore perde/ mantiene il narrowing).
 * Dominio: ERP Polyuretech (Dipendente, Timbratura, Reparto, Turno, ruoli).
 */

// ============================================================================
// 0) HELPER DI TEST A LIVELLO DI TIPO (Equal / Expect)
// ============================================================================
// Pattern classico per asserire uguaglianza tra tipi a compile-time.
// Equal usa l'identita' delle funzioni condizionali: due tipi sono uguali sse
// (<T>() => T extends A ? 1 : 2) e' assegnabile alla stessa forma con B.
// E' piu' preciso di "A extends B ? ..." perche' distingue anche any da unknown.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect accetta solo il letterale true: se il test fallisce, errore di tipo.
type Expect<T extends true> = T;

// Esempi d'uso dell'helper (verificati a compile-time).
type _t0 = Expect<Equal<string, string>>; // ok
type _t1 = Expect<Equal<1 | 2, 2 | 1>>; // ok: le union sono set, ordine irrilevante
// ERRORE TS: Type 'false' does not satisfy the constraint 'true'.
// type _t2 = Expect<Equal<string, number>>;

// ============================================================================
// 1) DOMINIO ERP: tipi base condivisi
// ============================================================================
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";
type Badge = `UP-${number}`; // template literal: "UP-001" e' assegnabile

interface Dipendente {
  readonly id: number;
  nome: string;
  badge: string; // validato a runtime con /^UP-\d{3}$/
  ruolo: Ruolo;
}

// Orario in formato naive-UTC "HH:MM" (regola ERP: mai new Date lato server).
type OrarioHHMM = string; // validato con /^\d{2}:\d{2}$/

// ============================================================================
// 2) CONTROL FLOW ANALYSIS: le basi del narrowing
// ============================================================================
// Il compilatore segue i rami: dopo un check, il tipo cambia in quel ramo.
function descriviRuolo(r: Ruolo | undefined): string {
  if (r === undefined) {
    // qui r: undefined
    return "nessun ruolo";
  }
  // qui r: Ruolo (undefined rimosso dalla union dal ramo precedente)
  return `ruolo=${r}`;
}

// Narrowing per uguaglianza a literal: rimuove membri dalla union.
function isPrivilegiato(r: Ruolo): boolean {
  if (r === "SuperAdmin" || r === "Admin") {
    // r: "SuperAdmin" | "Admin"
    return true;
  }
  // r: "Operatore" | "QrDisplay"  (i due literal gia' esclusi)
  return false;
}

// Narrowing con truthiness: attenzione, 0 e "" sono falsy!
function lunghezzaNome(nome: string | null): number {
  if (!nome) {
    // nome: string | null MA include anche "" (stringa vuota, falsy)
    return 0;
  }
  // nome: string (non-null, ma potrebbe comunque essere non vuoto)
  return nome.length;
}

// ============================================================================
// 3) typeof NARROWING
// ============================================================================
// typeof restringe fra i tipi primitivi: "string" | "number" | "boolean" |
// "bigint" | "symbol" | "undefined" | "object" | "function".
function normalizzaId(x: string | number): number {
  if (typeof x === "string") {
    // x: string
    return Number.parseInt(x, 10);
  }
  // x: number
  return x;
}

// GOTCHA: typeof null === "object". Un check "object" NON esclude null.
function contaChiavi(x: object | null): number {
  if (typeof x === "object" && x !== null) {
    // serve il !== null: senza, x sarebbe object | null
    return Object.keys(x).length;
  }
  return 0;
}

// ============================================================================
// 4) instanceof NARROWING
// ============================================================================
// instanceof usa la prototype chain: restringe a una classe.
class TimbraturaError extends Error {
  constructor(public readonly badge: string) {
    super(`Timbratura non valida per ${badge}`);
    this.name = "TimbraturaError";
  }
}

function gestisciErrore(e: unknown): string {
  if (e instanceof TimbraturaError) {
    // e: TimbraturaError -> accesso a .badge type-safe
    return `errore badge ${e.badge}`;
  }
  if (e instanceof Error) {
    // e: Error
    return e.message;
  }
  // e: unknown  (nessun narrowing applicato)
  return "errore sconosciuto";
}

// ============================================================================
// 5) in NARROWING (property presence)
// ============================================================================
// L'operatore 'in' restringe fra membri di una union in base alla presenza
// di una property. Utile quando NON c'e' un discriminante comune.
interface Entrata {
  entrata: OrarioHHMM;
}
interface Uscita {
  uscita: OrarioHHMM;
}
type EventoTimbratura = Entrata | Uscita;

function orarioEvento(ev: EventoTimbratura): OrarioHHMM {
  if ("entrata" in ev) {
    // ev: Entrata
    return ev.entrata;
  }
  // ev: Uscita
  return ev.uscita;
}

// ============================================================================
// 6) COMBINARE in / typeof / instanceof
// ============================================================================
// In casi reali i guard si combinano: prima si distingue la forma, poi il tipo.
class Reparto {
  constructor(
    public readonly codice: string,
    public dipendenti: Dipendente[],
  ) {}
}

type SorgenteReparto = Reparto | { codice: string } | string;

function codiceReparto(src: SorgenteReparto): string {
  if (typeof src === "string") {
    // src: string
    return src;
  }
  if (src instanceof Reparto) {
    // src: Reparto
    return src.codice;
  }
  // src: { codice: string }  (unico membro rimasto)
  // 'in' qui e' ridondante ma mostra la combinazione:
  if ("codice" in src) {
    return src.codice;
  }
  return "N/D";
}

// ============================================================================
// 7) DISCRIMINATED UNION (tagged union) - il pattern piu' robusto
// ============================================================================
// Ogni membro ha una property "kind" (il discriminante) con literal type unico.
// Il compilatore usa il discriminante per narrowing esaustivo.
interface TimbraturaAperta {
  kind: "aperta";
  badge: string;
  entrata: OrarioHHMM;
}
interface TimbraturaChiusa {
  kind: "chiusa";
  badge: string;
  entrata: OrarioHHMM;
  uscita: OrarioHHMM;
}
interface TimbraturaAnnullata {
  kind: "annullata";
  badge: string;
  motivo: string;
}
type Timbratura = TimbraturaAperta | TimbraturaChiusa | TimbraturaAnnullata;

// switch sul discriminante: ogni case restringe a un membro preciso.
function riepilogoTimbratura(t: Timbratura): string {
  switch (t.kind) {
    case "aperta":
      // t: TimbraturaAperta
      return `${t.badge} in corso da ${t.entrata}`;
    case "chiusa":
      // t: TimbraturaChiusa
      return `${t.badge} ${t.entrata}-${t.uscita}`;
    case "annullata":
      // t: TimbraturaAnnullata
      return `${t.badge} annullata: ${t.motivo}`;
    default:
      // t: never  <- controllo di esaustivita' (vedi assertNever sotto)
      return assertNever(t);
  }
}

// ============================================================================
// 8) EXHAUSTIVENESS CHECK con never
// ============================================================================
// Se aggiungi un membro alla union e dimentichi un case, 't' NON sara' never
// nel default -> errore di compilazione: la union e' "chiusa" a compile-time.
function assertNever(x: never): never {
  throw new Error(`Caso non gestito: ${JSON.stringify(x)}`);
}

// Verifica type-level: nel case "chiusa" il tipo e' esattamente TimbraturaChiusa.
type _tDiscr = Expect<
  Equal<
    Extract<Timbratura, { kind: "chiusa" }>,
    TimbraturaChiusa
  >
>; // ok

// ============================================================================
// 9) CUSTOM TYPE GUARD (user-defined type predicate)  x is T
// ============================================================================
// Una funzione che ritorna "arg is T" insegna al compilatore a narroware.
// ATTENZIONE: il compilatore si FIDA del predicato, non lo verifica. Se menti,
// il narrowing sara' errato a runtime (unsoundness volontaria).
function isBadge(x: string): x is Badge {
  return /^UP-\d{3}$/.test(x);
}

function isRuolo(x: string): x is Ruolo {
  return (
    x === "SuperAdmin" ||
    x === "Admin" ||
    x === "Operatore" ||
    x === "QrDisplay"
  );
}

function creaDipendente(id: number, nome: string, badgeRaw: string, ruoloRaw: string): Dipendente {
  if (!isBadge(badgeRaw)) {
    throw new Error(`Badge non valido: ${badgeRaw}`);
  }
  // badgeRaw: Badge (narrowed)
  if (!isRuolo(ruoloRaw)) {
    throw new Error(`Ruolo non valido: ${ruoloRaw}`);
  }
  // ruoloRaw: Ruolo (narrowed)
  return { id, nome, badge: badgeRaw, ruolo: ruoloRaw };
}

// Type guard generico su array: filtra i null preservando il tipo elemento.
function isNotNull<T>(x: T | null | undefined): x is T {
  return x !== null && x !== undefined;
}
const grezzi: (Dipendente | null)[] = [];
const puliti: Dipendente[] = grezzi.filter(isNotNull);
// senza il predicato, filter tornerebbe (Dipendente | null)[] anche dopo il check.

// ============================================================================
// 10) ASSERTION FUNCTION  (asserts ...)
// ============================================================================
// Due forme: "asserts x" (x truthy dopo il ritorno) e "asserts x is T".
// Se la funzione ritorna normalmente, il compilatore ASSUME l'asserzione vera
// da quel punto in poi (narrowing che dura fino a fine scope, non solo un ramo).
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function assertIsBadge(x: string): asserts x is Badge {
  if (!isBadge(x)) throw new Error(`Badge non valido: ${x}`);
}

function timbra(badgeRaw: string, orario: string): string {
  assertIsBadge(badgeRaw);
  // da qui in poi badgeRaw: Badge, senza bisogno di un if
  assert(/^\d{2}:\d{2}$/.test(orario), "Orario non HH:MM");
  // orario resta string (asserts cond non cambia il tipo, solo la reachability)
  return `${badgeRaw}@${orario}`;
}

// GOTCHA importante: le assertion function richiedono ANNOTAZIONE esplicita.
// ERRORE TS: Assertions require every name in the call target to be declared
//            with an explicit type annotation.
// const assertBis = (c: unknown): asserts c => { if (!c) throw new Error(); };
// (una arrow assegnata a const senza annotare la const non compila)

// ============================================================================
// 11) CONST NARROWING (literal widening vs const)
// ============================================================================
// let widening: il tipo si allarga al tipo base; const mantiene il literal.
let turnoLet = "P4"; // tipo: string  (widening)
const turnoConst = "P4"; // tipo: "P4"  (literal type preservato)
type _tLet = Expect<Equal<typeof turnoLet, string>>; // ok
type _tConst = Expect<Equal<typeof turnoConst, "P4">>; // ok

// const assertion "as const": rende readonly e preserva i literal in profondita'.
const config = {
  turno: "P4",
  attivo: true,
  soglie: [8, 10],
} as const;
// config.turno: "P4"  (non string); config.soglie: readonly [8, 10]
type _tCfgTurno = Expect<Equal<typeof config.turno, "P4">>; // ok
// ERRORE TS: Cannot assign to 'turno' because it is a read-only property.
// config.turno = "P2";

// Uso pratico: derivare una union di literal da un array as const.
const TURNI = ["P4", "P2", "STD"] as const;
type TurnoDaArray = (typeof TURNI)[number]; // "P4" | "P2" | "STD"
type _tTurni = Expect<Equal<TurnoDaArray, Turno>>; // ok

// GOTCHA widening: senza as const l'oggetto perde i literal.
const cfgLarga = { turno: "P4" }; // turno: string
// ERRORE TS: Type 'string' is not assignable to type 'Turno'.
// const t: Turno = cfgLarga.turno;
const t: Turno = cfgLarga.turno as Turno; // serve assert o as const

// ============================================================================
// 12) ALIASING: quando il narrowing SI MANTIENE e quando SI PERDE
// ============================================================================
// (a) TS supporta il "const aliased condition": se estrai una condizione in una
//     const, il narrowing sull'oggetto vale anche usando l'alias.
interface Payload {
  dip?: Dipendente;
}
function usaAlias(p: Payload): string {
  const d = p.dip; // d: Dipendente | undefined
  if (d) {
    // d: Dipendente  (alias narrowed)
    return d.nome;
  }
  return "vuoto";
}

// (b) Discriminant aliasing: anche estraendo il discriminante in una const,
//     il narrowing sull'oggetto viene applicato (dal TS 4.4+).
function usaAliasDiscr(t2: Timbratura): string {
  const k = t2.kind; // k: "aperta" | "chiusa" | "annullata"
  if (k === "chiusa") {
    // t2: TimbraturaChiusa  (grazie all'alias del discriminante)
    return t2.uscita;
  }
  return "n/d";
}

// (c) PERDITA di narrowing con le closure: dentro un callback il compilatore
//     assume che la variabile possa essere stata riassegnata.
function perditaConCallback(p: Payload): void {
  let d = p.dip;
  if (!d) return;
  // qui d: Dipendente
  const cb = (): string => {
    // ERRORE TS: 'd' is possibly 'undefined'.
    // return d.nome;
    // il narrowing NON attraversa la closure perche' 'd' e' let (riassegnabile)
    return d ? d.nome : "?";
  };
  cb();
}
// FIX: usare const invece di let rende 'd' non riassegnabile e il narrowing
// viene preservato anche dentro la closure.
function fixConCallback(p: Payload): void {
  const d = p.dip;
  if (!d) return;
  const cb = (): string => d.nome; // ok: d e' const -> narrowing preservato
  cb();
}

// (d) PERDITA con accesso a property non "readonly": una chiamata a funzione tra
//     il check e l'uso puo' invalidare il narrowing di una property mutabile.
interface Sessione {
  utente: Dipendente | null;
}
declare function effettoCollaterale(): void;
function perditaProperty(s: Sessione): string {
  if (s.utente !== null) {
    // s.utente: Dipendente
    effettoCollaterale(); // TS NON assume che azzeri s.utente (property analysis)
    return s.utente.nome; // qui resta narrowed: property access narrowing tenuto
  }
  return "?";
}

// ============================================================================
// 13) ESEMPIO ERP REALISTICO: repository + Result discriminato
// ============================================================================
// Pattern Result (ok/err) come discriminated union: niente eccezioni, narrowing
// forzato dal compilatore prima di leggere il valore.
type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}
function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Mock del repository (nessuna dipendenza: interfaccia definita qui nel file).
interface DipendenteRepository {
  findByBadge(badge: string): Dipendente | undefined;
}

class RepoInMemory implements DipendenteRepository {
  constructor(private readonly items: Dipendente[]) {}
  findByBadge(badge: string): Dipendente | undefined {
    return this.items.find((d) => d.badge === badge);
  }
}

function caricaDipendente(repo: DipendenteRepository, badgeRaw: string): Result<Dipendente> {
  if (!isBadge(badgeRaw)) {
    return err(`Formato badge errato: ${badgeRaw}`);
  }
  const found = repo.findByBadge(badgeRaw);
  if (!found) {
    return err(`Nessun dipendente con badge ${badgeRaw}`);
  }
  return ok(found);
}

function consumaResult(repo: DipendenteRepository, badge: string): string {
  const r = caricaDipendente(repo, badge);
  if (r.ok) {
    // r: { ok: true; value: Dipendente } -> r.value type-safe
    return `Trovato ${r.value.nome}`;
  }
  // r: { ok: false; error: string } -> NON esiste r.value qui
  // ERRORE TS: Property 'value' does not exist on type '{ ok: false; error: string }'.
  // return r.value;
  return `Errore: ${r.error}`;
}

// ============================================================================
// 14) ESEMPIO ERP REALISTICO: state machine timbratura con transizioni
// ============================================================================
// La discriminated union modella gli stati leciti: le transizioni impossibili
// diventano errori di tipo (impossibile chiudere una timbratura annullata).
function chiudiTimbratura(t: Timbratura, uscita: OrarioHHMM): Result<TimbraturaChiusa> {
  switch (t.kind) {
    case "aperta":
      // t: TimbraturaAperta -> ho entrata, posso chiudere
      return ok({ kind: "chiusa", badge: t.badge, entrata: t.entrata, uscita });
    case "chiusa":
      return err("Timbratura gia' chiusa");
    case "annullata":
      return err("Timbratura annullata, non chiudibile");
    default:
      return assertNever(t);
  }
}

// ============================================================================
// 15) NARROWING SU unknown (input non fidato, es. body JSON)
// ============================================================================
// Da 'unknown' NON si legge nulla senza prima narroware: pattern di validazione.
function parseDipendente(input: unknown): Result<Dipendente> {
  if (typeof input !== "object" || input === null) {
    return err("payload non oggetto");
  }
  // input: object (non null). Serve 'in' per le property (non tipizzate ancora).
  if (!("badge" in input) || !("nome" in input) || !("ruolo" in input)) {
    return err("campi mancanti");
  }
  // Le property lette da 'in' su object sono 'unknown': vanno ristrette una a una.
  const rec = input as Record<"badge" | "nome" | "ruolo", unknown>;
  if (typeof rec.badge !== "string" || !isBadge(rec.badge)) {
    return err("badge invalido");
  }
  if (typeof rec.nome !== "string") {
    return err("nome invalido");
  }
  if (typeof rec.ruolo !== "string" || !isRuolo(rec.ruolo)) {
    return err("ruolo invalido");
  }
  // Tutte le property ristrette: costruzione type-safe.
  return ok({ id: 0, nome: rec.nome, badge: rec.badge, ruolo: rec.ruolo });
}

// ============================================================================
// 16) GOTCHA / PITFALLS
// ============================================================================
// (P1) typeof array === "object": un array NON e' distinguibile da un oggetto
//      con typeof. Usare Array.isArray, che e' un type guard integrato.
function normalizzaBadge(x: string | string[]): string[] {
  if (Array.isArray(x)) {
    // x: string[]
    return x;
  }
  // x: string
  return [x];
}

// (P2) Il narrowing di una property NON sopravvive alla riassegnazione dell'
//      oggetto. Qui riassegno l'union e perdo il narrowing precedente.
function pitfallRiassegno(t: Timbratura, altra: Timbratura): string {
  if (t.kind === "chiusa") {
    t = altra; // riassegnato: torna Timbratura completa
    // ERRORE TS: Property 'uscita' does not exist on type 'TimbraturaAperta'...
    // return t.uscita;
    return t.kind;
  }
  return t.kind;
}

// (P3) I custom guard sono "fidati": un guard errato inganna il compilatore.
//      Qui il guard e' SBAGLIATO (controlla la property errata) e a runtime
//      il tipo sara' diverso, ma TS non se ne accorge.
function guardBacato(x: unknown): x is Dipendente {
  // BUG intenzionale: non verifica nulla di reale.
  return typeof x === "object";
}
// Uso pericoloso (compila, ma e' unsound): responsabilita' del programmatore.
// if (guardBacato(qualcosa)) { qualcosa.badge; /* runtime: puo' esplodere */ }

// (P4) Truthiness su number/string: 0 e "" sono falsy. Per distinguere
//      "assente" da "valore zero" usare confronti espliciti (=== undefined).
function minutiRitardo(m: number | undefined): string {
  // if (!m) ... -> sbagliato: nasconde il caso m === 0 (nessun ritardo valido)
  if (m === undefined) {
    return "n/d";
  }
  // m: number  (0 incluso correttamente)
  return `${m} min`;
}

// ============================================================================
// 17) EXPORT locali (solo simboli definiti in questo file)
// ============================================================================
export {
  descriviRuolo,
  normalizzaId,
  gestisciErrore,
  orarioEvento,
  codiceReparto,
  riepilogoTimbratura,
  assertNever,
  isBadge,
  isRuolo,
  isNotNull,
  assert,
  assertIsBadge,
  timbra,
  creaDipendente,
  caricaDipendente,
  consumaResult,
  chiudiTimbratura,
  parseDipendente,
  normalizzaBadge,
  minutiRitardo,
  ok,
  err,
  RepoInMemory,
  Reparto,
  TimbraturaError,
};
export type {
  Equal,
  Expect,
  Ruolo,
  Turno,
  Badge,
  Dipendente,
  OrarioHHMM,
  EventoTimbratura,
  Timbratura,
  TimbraturaAperta,
  TimbraturaChiusa,
  TimbraturaAnnullata,
  Result,
  DipendenteRepository,
  TurnoDaArray,
};

/*
 * ============================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================================
 * - Control Flow Analysis (CFA): il tipo cambia lungo i rami del codice.
 * - typeof narrowing: primitivi; GOTCHA typeof null === "object".
 * - instanceof narrowing: usa la prototype chain (classi/Error).
 * - in narrowing: presenza di property; utile senza discriminante comune.
 * - Combinare typeof + instanceof + in: dal caso largo al caso preciso.
 * - Discriminated union: property "kind" con literal unico -> switch sicuro.
 * - Exhaustiveness: default -> assertNever(x: never) forza la copertura.
 * - Custom type guard: "x is T"; il compilatore si FIDA (unsound se menti).
 * - Assertion function: "asserts cond" / "asserts x is T"; richiede annotazione
 *   esplicita; narrowing valido fino a fine scope (non solo un ramo).
 * - const narrowing: const preserva i literal, let fa widening.
 * - as const: readonly profondo + literal; array as const -> union via [number].
 * - Aliasing: const su condizione/discriminante mantiene il narrowing (4.4+);
 *   let dentro closure lo perde -> usare const.
 * - unknown: nessun accesso senza narrowing; validazione via typeof + in + guard.
 * - Result<ok/err> discriminato: forza il check prima di leggere value.
 * - GOTCHA: Array.isArray per gli array; truthiness nasconde 0 e "".
 * - Helper type-level Equal/Expect: test di uguaglianza tipi a compile-time.
 */
