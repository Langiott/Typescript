/**
 * File 070 - ADV Type Guards & predicates (is)
 * Argomento: user-defined type guard (x is T), narrowing su union ERP,
 * type guard generiche, uso con array.filter come predicate.
 * Questa e' una delle parti PIU' importanti del type system: capire come
 * il compiler restringe (narrowing) i tipi tramite control flow analysis.
 * Tutti gli esempi compilano con: tsc --strict --target ES2022 --noEmit.
 */

// ============================================================================
// SEZIONE 0 - Modello dominio ERP (interfacce mock, nessuna libreria esterna)
// ============================================================================
// NOTA: queste interfacce sono definite qui nel file, NON importate da Prisma
// ne da altri moduli del corso. Sono mock del dominio Polyuretech.

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  readonly id: number;
  nome: string;
  badge: string; // formato atteso "UP-001"
  ruolo: Ruolo;
}

interface Timbratura {
  dipendenteId: number;
  entrata: string; // orario naive-UTC "HH:MM"
  uscita: string | null; // null = ancora dentro
  turno: Turno;
}

interface Reparto {
  codice: string;
  descrizione: string;
}

// ============================================================================
// SEZIONE 1 - Il problema: narrowing con typeof/instanceof e i suoi limiti
// ============================================================================

// typeof restringe i primitivi. Dentro il ramo il tipo e' ristretto.
function lunghezza(x: string | number): number {
  if (typeof x === "string") {
    // qui il tipo e': string  -> .length e' lecito
    return x.length;
  }
  // qui il tipo e': number  (control flow analysis ha tolto string)
  return x;
}

// instanceof restringe le classi (funziona a runtime sul prototype).
class ErroreValidazione extends Error {
  constructor(public campo: string) {
    super(`Campo non valido: ${campo}`);
  }
}
function descriviErrore(e: unknown): string {
  if (e instanceof ErroreValidazione) {
    // tipo: ErroreValidazione  -> posso leggere .campo
    return `Validazione fallita su ${e.campo}`;
  }
  if (e instanceof Error) {
    // tipo: Error
    return e.message;
  }
  return "Errore sconosciuto";
}

// LIMITE: typeof/instanceof NON sanno restringere forme di oggetti custom
// ne union di string literal. Serve un user-defined type guard.

// ============================================================================
// SEZIONE 2 - User-defined type guard: la firma "x is T"
// ============================================================================
// Una funzione che ritorna un "type predicate" (x is T) insegna al compiler:
// "se ritorno true, allora nel ramo chiamante x ha tipo T". E' una PROMESSA
// che il compiler si fida: il corpo deve ritornare boolean, ma la coerenza
// logica e' responsabilita' di chi scrive (unsound se menti).

// Guard su primitivo raffinato.
function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.length > 0;
}

const forse: unknown = "UP-001";
if (isNonEmptyString(forse)) {
  // tipo: string  (senza il guard sarebbe rimasto unknown)
  console.log(forse.toUpperCase());
}

// Guard che valida un formato badge con regex (pattern ERP /^UP-\d{3}$/).
// Introduciamo un branded type per rendere il badge "provato".
type Badge = string & { readonly __brand: "Badge" };
function isBadge(x: unknown): x is Badge {
  return typeof x === "string" && /^UP-\d{3}$/.test(x);
}
const raw = "UP-042";
if (isBadge(raw)) {
  // tipo: Badge  -> puo' essere passato dove si richiede un Badge validato
  const b: Badge = raw;
  void b;
}
// ERRORE TS: const bad: Badge = "pippo";
//   Type 'string' is not assignable to type 'Badge'. Il brand impedisce
//   di costruire un Badge senza passare dal guard (o da un assertion).

// Guard su orario "HH:MM" (pattern ERP /^\d{2}:\d{2}$/).
type OrarioHHMM = string & { readonly __brand: "OrarioHHMM" };
function isOrarioHHMM(x: unknown): x is OrarioHHMM {
  return typeof x === "string" && /^\d{2}:\d{2}$/.test(x);
}

// ============================================================================
// SEZIONE 3 - Guard per la forma di un oggetto (structural narrowing)
// ============================================================================
// Da unknown (es. risposta JSON di una API) a Dipendente tipizzato.
// Nota: dobbiamo controllare campo per campo perche' unknown non e' indicizzabile.

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function isRuolo(x: unknown): x is Ruolo {
  return x === "SuperAdmin" || x === "Admin" || x === "Operatore" || x === "QrDisplay";
}

function isDipendente(x: unknown): x is Dipendente {
  if (!isRecord(x)) return false;
  return (
    typeof x.id === "number" &&
    typeof x.nome === "string" &&
    typeof x.badge === "string" &&
    isRuolo(x.ruolo)
  );
}

// Uso realistico: parsing di JSON esterno.
function parseDipendente(json: string): Dipendente | null {
  const data: unknown = JSON.parse(json);
  if (isDipendente(data)) {
    // tipo: Dipendente
    return data;
  }
  return null;
}
const d1 = parseDipendente('{"id":1,"nome":"Anna","badge":"UP-001","ruolo":"Admin"}');
// d1 tipo: Dipendente | null

// ============================================================================
// SEZIONE 4 - Narrowing su discriminated union (stato macchina ERP)
// ============================================================================
// Union discriminata per lo stato di una timbratura live.
type StatoTimbratura =
  | { kind: "assente" }
  | { kind: "dentro"; entrata: string; turno: Turno }
  | { kind: "uscito"; entrata: string; uscita: string; turno: Turno };

// Il discriminante "kind" da solo abilita il narrowing automatico nello switch.
function riepilogo(s: StatoTimbratura): string {
  switch (s.kind) {
    case "assente":
      return "Nessuna timbratura";
    case "dentro":
      // tipo: { kind:"dentro"; entrata:string; turno:Turno }
      return `Dentro dalle ${s.entrata} (turno ${s.turno})`;
    case "uscito":
      return `${s.entrata} -> ${s.uscita} (turno ${s.turno})`;
  }
}

// Guard dedicati sul membro della union (utili fuori da switch, es. in filter).
function isDentro(s: StatoTimbratura): s is Extract<StatoTimbratura, { kind: "dentro" }> {
  return s.kind === "dentro";
}
function isUscito(s: StatoTimbratura): s is Extract<StatoTimbratura, { kind: "uscito" }> {
  return s.kind === "uscito";
}
// Extract<Union, Shape> seleziona dalla union i membri assegnabili a Shape.
// Extract<StatoTimbratura, {kind:"dentro"}> = { kind:"dentro"; entrata:string; turno:Turno }

// ============================================================================
// SEZIONE 5 - array.filter con predicate: da T[] a Sottotipo[]
// ============================================================================
// PROBLEMA classico: filter senza guard NON restringe l'elemento.
const misti: (string | null)[] = ["UP-001", null, "UP-002", null];

// Senza type predicate: il risultato resta (string | null)[].
const ancoraNullable = misti.filter((x) => x !== null);
// tipo di ancoraNullable: (string | null)[]  <-- il null NON e' stato tolto dal tipo!

// Con un type guard come callback, filter usa l'overload che restringe.
function isNotNull<T>(x: T | null): x is T {
  return x !== null;
}
const soloStringhe = misti.filter(isNotNull);
// tipo: string[]  <-- ora il null e' sparito dal tipo. Questo e' il punto chiave.
void soloStringhe;

// Guard generico ancora piu' ampio (toglie null E undefined).
function isPresent<T>(x: T | null | undefined): x is T {
  return x !== null && x !== undefined;
}
const conBuchi: (number | undefined)[] = [1, undefined, 3];
const compatti = conBuchi.filter(isPresent);
// tipo: number[]

// filter su discriminated union restringe al membro giusto.
const storia: StatoTimbratura[] = [
  { kind: "assente" },
  { kind: "dentro", entrata: "08:00", turno: "P4" },
  { kind: "uscito", entrata: "08:00", uscita: "17:00", turno: "P4" },
];
const soloUscite = storia.filter(isUscito);
// tipo: Extract<StatoTimbratura,{kind:"uscito"}>[]
//   -> soloUscite[0].uscita e' string, accesso sicuro
soloUscite.forEach((u) => console.log(u.uscita));

// ============================================================================
// SEZIONE 6 - Type guard generiche riutilizzabili (factory di guard)
// ============================================================================

// Guard su literal preciso: restringe a UN valore della union.
function isRuoloUguale<R extends Ruolo>(target: R) {
  return (x: Ruolo): x is R => x === target;
}
const isAdmin = isRuoloUguale("Admin");
const ruoloIn: Ruolo = "Admin";
if (isAdmin(ruoloIn)) {
  // tipo: "Admin"
  const solo: "Admin" = ruoloIn;
  void solo;
}

// Guard "ha la proprieta' K": restringe ampliando la conoscenza sulla forma.
function hasKey<K extends PropertyKey>(
  obj: object,
  key: K
): obj is Record<K, unknown> {
  return key in obj;
}
function leggiUscita(t: object): unknown {
  if (hasKey(t, "uscita")) {
    // tipo: object & Record<"uscita", unknown>
    return t.uscita;
  }
  return undefined;
}

// Guard "e' uno dei valori di questo array" (utile per whitelist runtime).
function isOneOf<T extends readonly unknown[]>(
  valori: T,
  x: unknown
): x is T[number] {
  return valori.includes(x as T[number]);
}
const TURNI = ["P4", "P2", "STD"] as const;
const forseTurno: unknown = "P2";
if (isOneOf(TURNI, forseTurno)) {
  // tipo: "P4" | "P2" | "STD"  (cioe' TURNI[number], equivalente a Turno)
  const t: Turno = forseTurno;
  void t;
}

// Guard che valida un intero array elemento per elemento (array narrowing).
function isArrayOf<T>(
  x: unknown,
  guard: (item: unknown) => item is T
): x is T[] {
  return Array.isArray(x) && x.every(guard);
}
const jsonList: unknown = ["UP-001", "UP-002"];
if (isArrayOf(jsonList, isBadge)) {
  // tipo: Badge[]
  console.log(jsonList.length);
}

// ============================================================================
// SEZIONE 7 - Repository pattern ERP con guard (esempio realistico)
// ============================================================================
// Pattern tipico: un repository riceve dati grezzi (es. da fetch) e deve
// validarli PRIMA di trattarli come entita' del dominio. I guard sono la
// frontiera tra "unknown esterno" e "tipi interni fidati".

interface Timbratura2 {
  dipendenteId: number;
  entrata: OrarioHHMM;
  uscita: OrarioHHMM | null;
  turno: Turno;
}

function isTurno(x: unknown): x is Turno {
  return x === "P4" || x === "P2" || x === "STD";
}

function isTimbratura2(x: unknown): x is Timbratura2 {
  if (!isRecord(x)) return false;
  const uscitaOk = x.uscita === null || isOrarioHHMM(x.uscita);
  return (
    typeof x.dipendenteId === "number" &&
    isOrarioHHMM(x.entrata) &&
    uscitaOk &&
    isTurno(x.turno)
  );
}

// Repository generico mock: dato un array grezzo, tiene solo le entita' valide.
class TimbraturaRepository {
  private dati: Timbratura2[] = [];

  // Carica da sorgente unknown, scarta le righe non valide (log implicito).
  caricaGrezzo(rows: unknown[]): void {
    // filter con guard: (unknown)[] -> Timbratura2[]
    this.dati = rows.filter(isTimbratura2);
  }

  // Query: timbrature ancora aperte (uscita null). Restringe il campo uscita.
  aperte(): Timbratura2[] {
    return this.dati.filter((t) => t.uscita === null);
  }

  // Query type-safe: chi e' in un dato turno.
  perTurno(turno: Turno): Timbratura2[] {
    return this.dati.filter((t) => t.turno === turno);
  }
}
const repo = new TimbraturaRepository();
repo.caricaGrezzo([
  { dipendenteId: 1, entrata: "08:00", uscita: null, turno: "P4" },
  { dipendenteId: 2, entrata: "bad", uscita: "17:00", turno: "P2" }, // scartata
]);
// repo.aperte() tipo: Timbratura2[]

// ============================================================================
// SEZIONE 8 - Assertion functions (asserts x is T): il "cugino" dei guard
// ============================================================================
// Invece di ritornare boolean, un'assertion function LANCIA se la condizione
// non regge; dopo la chiamata il compiler considera x gia' ristretto (nessun
// if necessario). Firma: "asserts x is T" oppure "asserts cond".

function assertBadge(x: unknown): asserts x is Badge {
  if (!isBadge(x)) {
    throw new ErroreValidazione("badge");
  }
}
function usaBadge(input: unknown): string {
  assertBadge(input);
  // da qui in poi tipo: Badge  (senza ramo if)
  return input.toUpperCase();
}

// Assertion "di condizione" (asserts cond) senza predicate: restringe via CFA.
function assertPresent<T>(x: T | null | undefined, msg = "assente"): asserts x is T {
  if (x === null || x === undefined) throw new Error(msg);
}
function nomeMaiuscolo(d: Dipendente | undefined): string {
  assertPresent(d);
  // tipo: Dipendente
  return d.nome.toUpperCase();
}

// ============================================================================
// SEZIONE 9 - GOTCHA / PITFALLS (trappole comuni e soluzioni)
// ============================================================================

// PITFALL 1 - Guard UNSOUND: il compiler si fida ciecamente della firma.
// Se il corpo mente, ottieni un crash a runtime senza errore di compilazione.
function isNumberSbagliato(x: unknown): x is number {
  return typeof x === "string"; // BUG logico: controlla string ma promette number
}
const q: unknown = "ciao";
if (isNumberSbagliato(q)) {
  // tipo (secondo il compiler): number  -> ma a runtime e' "ciao"!
  // const doppio = q * 2; // NaN a runtime, nessun ERRORE TS -> guard unsound
}
// SOLUZIONE: il corpo del guard DEVE testare davvero la condizione promessa.

// PITFALL 2 - filter senza guard non restringe (gia' visto in Sez.5).
// Molti pensano che filter(x => x != null) tolga null dal tipo: NON lo fa.
const arr: (string | undefined)[] = ["a", undefined];
const nonRistretto = arr.filter((x) => x !== undefined);
// tipo: (string | undefined)[]  <-- ancora undefined nel tipo
// SOLUZIONE: usare un type predicate, es. arr.filter(isPresent) -> string[].
void nonRistretto;

// PITFALL 3 - Guard su membro OPZIONALE con "in" e strictNullChecks.
// "key" in obj dice che la chiave esiste, NON che il valore non sia undefined.
interface ConOpzionale {
  uscita?: string;
}
function leggiSeEsce(o: ConOpzionale): string {
  if ("uscita" in o) {
    // Con exactOptionalPropertyTypes il narrowing e' piu' stretto; in strict
    // "normale" o.uscita puo' comunque essere string | undefined.
    return o.uscita ?? "aperta";
  }
  return "aperta";
}
// SOLUZIONE: preferire il check diretto sul valore: if (o.uscita !== undefined).
void leggiSeEsce;

// PITFALL 4 - Il narrowing di un guard si PERDE dopo una callback/await, perche'
// il control flow analysis non attraversa i confini di una closure differita.
function esempioClosurePerdita(x: string | null): void {
  if (isNotNull(x)) {
    // qui tipo: string
    setTimeout(() => {
      // dentro la closure tipo: string | null  <-- narrowing perso!
      // x.toUpperCase(); // ERRORE TS: 'x' is possibly 'null'.
      console.log(x?.toUpperCase());
    }, 0);
  }
}
// SOLUZIONE: copiare in una const locale (const v = x;) dopo il guard, la const
// e' definitivamente string e non viene "riaperta".
void esempioClosurePerdita;

// ============================================================================
// SEZIONE 10 - Type-level: test dei predicate con helper Equal/Expect
// ============================================================================
// I guard sono runtime, ma possiamo verificare a livello di TIPO che il
// narrowing produca esattamente il tipo atteso. Helper type-level classici:

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;
type Expect<T extends true> = T;

// Utility che estrae il tipo ristretto da un type guard (il "T" della firma).
type GuardTarget<G> = G extends (x: any) => x is infer T ? T : never;

// Test: isNotNull<string> deve restringere a string.
type _t1 = Expect<Equal<GuardTarget<typeof isBadge>, Badge>>;
type _t2 = Expect<Equal<GuardTarget<typeof isTurno>, Turno>>;
type _t3 = Expect<Equal<GuardTarget<typeof isRuolo>, Ruolo>>;
// Se una di queste NON fosse true, il file NON compilerebbe (Expect fallisce).
// I tre alias sono solo controlli di tipo; il void serve a "usarli".
void 0 as unknown as _t1 & _t2 & _t3;

// Distributivita' + inferenza: Extract e' distributivo sulle union.
// Extract<A|B|C, S> = (A extends S?A:never) | (B extends S?B:never) | ...
type SoloUscito = Extract<StatoTimbratura, { kind: "uscito" }>;
type _t4 = Expect<Equal<SoloUscito["uscita"], string>>;
void 0 as unknown as _t4;

// ============================================================================
// SEZIONE 11 - Combinare guard: composizione and/or type-safe
// ============================================================================
// Comporre due guard in AND: il tipo risultante e' l'intersezione dei target.
function and<A, B>(
  g1: (x: unknown) => x is A,
  g2: (x: unknown) => x is B
): (x: unknown) => x is A & B {
  return (x): x is A & B => g1(x) && g2(x);
}
const isBadgeStringa = and(isNonEmptyString, isBadge);
// GuardTarget<typeof isBadgeStringa> = string & Badge  (=> Badge, il piu' stretto)

// Comporre in OR: il tipo risultante e' l'unione dei target.
function or<A, B>(
  g1: (x: unknown) => x is A,
  g2: (x: unknown) => x is B
): (x: unknown) => x is A | B {
  return (x): x is A | B => g1(x) || g2(x);
}
const isBadgeOrOrario = or(isBadge, isOrarioHHMM);
const campo: unknown = "08:30";
if (isBadgeOrOrario(campo)) {
  // tipo: Badge | OrarioHHMM
  void campo;
}

// ============================================================================
// SEZIONE 12 - Esempio finale integrato: pipeline di validazione DTO
// ============================================================================
// DTO in ingresso (unknown) -> validato -> mappato su entita' interna.
// Mostra guard di forma + filter con predicate + assertion, tutto insieme.

interface DipendenteDTO {
  id: number;
  nome: string;
  badge: string;
  ruolo: string; // arriva come string generica dall'esterno
}

function isDipendenteDTO(x: unknown): x is DipendenteDTO {
  return (
    isRecord(x) &&
    typeof x.id === "number" &&
    typeof x.nome === "string" &&
    typeof x.badge === "string" &&
    typeof x.ruolo === "string"
  );
}

// Mappatura DTO -> Dipendente con validazione del ruolo (string -> Ruolo).
function toDipendente(dto: DipendenteDTO): Dipendente | null {
  if (!isRuolo(dto.ruolo)) return null; // ruolo non valido -> scarta
  if (!isBadge(dto.badge)) return null; // badge fuori formato -> scarta
  return { id: dto.id, nome: dto.nome, badge: dto.badge, ruolo: dto.ruolo };
}

// Pipeline: array unknown -> DTO validi -> entita' valide.
function importaDipendenti(payload: unknown): Dipendente[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter(isDipendenteDTO) // unknown[] -> DipendenteDTO[]
    .map(toDipendente) // -> (Dipendente | null)[]
    .filter(isPresent); // -> Dipendente[]  (guard toglie i null)
}
const importati = importaDipendenti([
  { id: 1, nome: "Anna", badge: "UP-001", ruolo: "Admin" },
  { id: 2, nome: "Bruno", badge: "X", ruolo: "Admin" }, // badge invalido -> scartato
  { id: 3, nome: "Carla", badge: "UP-003", ruolo: "Capo" }, // ruolo invalido -> scartato
]);
// importati tipo: Dipendente[]  (contiene solo Anna)
console.log(importati.length); // => 1

// ============================================================================
// EXPORT (solo simboli locali di questo file)
// ============================================================================
export {
  isNonEmptyString,
  isBadge,
  isOrarioHHMM,
  isRuolo,
  isTurno,
  isDipendente,
  isPresent,
  isNotNull,
  isArrayOf,
  isOneOf,
  hasKey,
  assertBadge,
  assertPresent,
  and,
  or,
  importaDipendenti,
  TimbraturaRepository,
};
export type {
  Ruolo,
  Turno,
  Dipendente,
  Timbratura,
  Reparto,
  Badge,
  OrarioHHMM,
  StatoTimbratura,
  DipendenteDTO,
  Equal,
  Expect,
  GuardTarget,
};

/* ============================================================================
 * RIEPILOGO COMANDI / CONCETTI (ripasso veloce)
 * ============================================================================
 * - type predicate: firma "function f(x): x is T" -> insegna il narrowing.
 * - il compiler SI FIDA della firma: guard scritto male = unsound (crash runtime).
 * - typeof -> primitivi; instanceof -> classi; guard custom -> forme e union.
 * - narrowing = control flow analysis restringe il tipo dentro un ramo.
 * - discriminated union: campo "kind" abilita narrowing automatico in switch/if.
 * - Extract<Union, Shape> seleziona i membri della union (distributivo).
 * - array.filter(guard) usa l'overload che RESTRINGE l'elemento: T[] -> Sub[].
 * - filter(x => x != null) NON restringe il tipo; serve un type predicate.
 * - guard generici: isPresent<T>, isNotNull<T>, isArrayOf<T>, isOneOf.
 * - hasKey / "key in obj": esistenza chiave, NON garantisce valore != undefined.
 * - assertion function: "asserts x is T" LANCIA e restringe senza if.
 * - "asserts cond" (senza is): restringe via CFA (es. assertPresent).
 * - branded type (string & {__brand}): impedisce di costruire il tipo senza guard.
 * - narrowing PERSO dentro closure/await -> copiare in const locale.
 * - composizione guard: and -> A & B ; or -> A | B.
 * - test type-level: Equal<A,B>, Expect<true>, GuardTarget<G> (infer del predicate).
 * - regole ERP: badge /^UP-\d{3}$/ ; orario /^\d{2}:\d{2}$/ ; ruoli e turni union.
 * ==========================================================================*/
