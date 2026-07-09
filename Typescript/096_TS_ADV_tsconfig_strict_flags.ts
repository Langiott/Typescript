/**
 * 096_TS_ADV_tsconfig_strict_flags.ts
 * File 96 - ADV: tsconfig strict flags spiegati
 * Analisi approfondita delle flag di strictness del compilatore TypeScript:
 * strict, noImplicitAny, strictNullChecks, strictFunctionTypes, strictBindCallApply,
 * noUncheckedIndexedAccess, exactOptionalPropertyTypes, useUnknownInCatchVariables e altre.
 * Ogni flag e' spiegata col "perche" interno (inferenza, control flow, varianza) e con
 * esempi ERP Polyuretech. Il file compila con tsc --strict (gli errori sono commentati).
 */

// =============================================================================
// Helper di test type-level (definiti localmente, nessun import esterno)
// =============================================================================

// Equal confronta due tipi in modo esatto (invariante), non solo per assegnabilita'.
// Il trucco: due funzioni condizionali identiche sono uguali sse e solo se X e Y
// sono lo stesso tipo. E' il pattern standard usato dalle librerie di type-testing.
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
    ? true
    : false;

// Expect forza a livello di compilazione che un tipo sia esattamente `true`.
type Expect<T extends true> = T;

// =============================================================================
// Tipi di dominio ERP Polyuretech riusati negli esempi
// =============================================================================

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  id: number;
  nome: string;
  badge: `UP-${string}`; // template literal type, pattern UP-001
  ruolo: Ruolo;
}

interface Timbratura {
  dipendenteId: number;
  entrata: string; // formato naive-UTC "HH:MM"
  uscita: string; // formato naive-UTC "HH:MM"
}

// =============================================================================
// 1) strict: la meta-flag
// =============================================================================

// "strict": true in tsconfig.json abilita in blocco un insieme di flag:
//   noImplicitAny, strictNullChecks, strictFunctionTypes, strictBindCallApply,
//   strictPropertyInitialization, noImplicitThis, alwaysStrict,
//   useUnknownInCatchVariables (dalla 4.4), e strictBuiltinIteratorReturn (5.6+).
// NON include: noUncheckedIndexedAccess ne' exactOptionalPropertyTypes:
//   vanno abilitate a mano. Questo e' il gotcha piu' comune: "sono in strict
//   ma indicizzare un array mi da' ancora T e non T | undefined".
// Puoi disattivare una singola flag pur restando in strict:
//   { "strict": true, "strictNullChecks": false }  // legale ma sconsigliato.

// =============================================================================
// 2) noImplicitAny
// =============================================================================

// Senza noImplicitAny, un parametro senza annotazione e senza inferenza possibile
// diventa `any` in silenzio, disattivando ogni controllo su di esso.
// Con la flag attiva quel silenzio diventa un errore.

// ERRORE TS: Parameter 'x' implicitly has an 'any' type.
// function raddoppia(x) { return x * 2; }

// Corretto: annotazione esplicita.
function raddoppia(x: number): number {
  return x * 2;
}
raddoppia(21); // => 42

// Nota: l'inferenza contestuale NON e' "implicit any". Qui `t` e' inferito
// come Timbratura dal tipo dell'array, quindi nessun errore anche senza annotare.
const timbrature: Timbratura[] = [];
timbrature.forEach((t) => t.entrata); // t: Timbratura (inferito dal contesto)

// =============================================================================
// 3) strictNullChecks: la flag piu' importante
// =============================================================================

// Senza strictNullChecks, null e undefined appartengono a OGNI tipo: un `string`
// puo' segretamente essere null. Con la flag, null/undefined sono tipi distinti
// e vanno gestiti esplicitamente. E' cio' che rende il control flow analysis utile.

function trovaDipendente(id: number): Dipendente | undefined {
  return undefined; // mock repository: puo' non trovare nulla
}

const d = trovaDipendente(1);
// ERRORE TS: 'd' is possibly 'undefined'.
// console.log(d.nome);

// Narrowing tramite control flow: dopo il guard, il tipo di `d` si restringe.
if (d !== undefined) {
  console.log(d.nome); // d: Dipendente (undefined eliminato dal ramo)
}

// Optional chaining + nullish coalescing sfruttano strictNullChecks.
const nome = d?.nome ?? "sconosciuto"; // tipo: string

// Il non-null assertion `!` dice al compilatore "fidati, non e' null".
// E' un'arma pericolosa: bypassa il check senza generare codice difensivo.
function assumiEsista(id: number): string {
  const emp = trovaDipendente(id);
  return emp!.nome; // se emp e' undefined qui, crash a runtime nonostante il tipo ok
}

// =============================================================================
// 4) strictFunctionTypes: varianza contro-variante dei parametri
// =============================================================================

// Questa flag rende i tipi-parametro delle funzioni controvarianti (comportamento
// type-safe) invece di bivarianti. Vale SOLO per funzioni scritte come `type`/
// signature con la sintassi `(x) => y`, NON per i metodi dichiarati con method
// shorthand nelle interface (che restano bivarianti per compatibilita').

type Handler<T> = (evento: T) => void;

interface EventoBase {
  tipo: string;
}
interface EventoTimbratura extends EventoBase {
  tipo: "timbratura";
  timbratura: Timbratura;
}

// Un Handler<EventoBase> accetta QUALSIASI EventoBase, quindi puo' essere usato
// dove serve un Handler<EventoTimbratura> (che riceve un sottotipo): OK.
let hBase: Handler<EventoBase> = (e) => e.tipo;
let hSpecifico: Handler<EventoTimbratura> = hBase; // OK: contro-varianza corretta

// Il contrario e' UNSAFE: hSpecifico si aspetta il campo .timbratura che un
// EventoBase generico non ha. Con strictFunctionTypes questo e' vietato.
// ERRORE TS: Type 'Handler<EventoTimbratura>' is not assignable to 'Handler<EventoBase>'.
// hBase = hSpecifico;

// Perche' i metodi restano bivarianti: senza quella eccezione, Array<Cane> non
// sarebbe assegnabile ad Array<Animale> perche' push(x: Cane) e push(x: Animale)
// sono in relazione controvariante. La bivarianza dei metodi e' un compromesso pragmatico.

// =============================================================================
// 5) strictBindCallApply
// =============================================================================

// Controlla i tipi degli argomenti passati a Function.prototype.bind/call/apply.
// Senza la flag, call/apply accettano any[] e non verificano nulla.

function formattaBadge(prefisso: string, numero: number): string {
  return `${prefisso}-${String(numero).padStart(3, "0")}`;
}

const badge = formattaBadge.call(undefined, "UP", 1); // tipo: string, => "UP-001"

// ERRORE TS: Argument of type 'string' is not assignable to parameter of type 'number'.
// formattaBadge.call(undefined, "UP", "1");

// bind e' verificato tipo per tipo, inclusa l'applicazione parziale.
const bindUP = formattaBadge.bind(undefined, "UP"); // (numero: number) => string
bindUP(7); // => "UP-007"

// =============================================================================
// 6) noUncheckedIndexedAccess: NON inclusa in strict
// =============================================================================

// Aggiunge automaticamente `| undefined` al risultato di un accesso indicizzato
// (array[i], record[chiave]). Riflette la realta': l'indice potrebbe essere fuori
// range o la chiave assente. Senza la flag TypeScript "mente" restituendo T.

const orari: string[] = ["08:00", "12:00"];

// NOTA sul nostro tsconfig: qui noUncheckedIndexedAccess NON e' attiva (non e'
// inclusa in strict), quindi orari[0] resta `string`. Con la flag ON diventerebbe
// `string | undefined`. Il codice difensivo sotto vale in entrambi i casi.
const primo = orari[0]; // tipo (senza la flag): string; (con la flag): string | undefined
// Con noUncheckedIndexedAccess ON servirebbe il narrowing prima di usare primo:
// ERRORE TS (solo con la flag ON): 'primo' is possibly 'undefined'.
// primo.slice(0, 2);

// Va gestito con narrowing (buona pratica a prescindere dalla flag):
if (primo !== undefined) {
  primo.slice(0, 2); // primo: string
}

// Record con chiavi arbitrarie: l'accesso e' sempre potenzialmente undefined
// SOLO con la flag ON. Senza, TypeScript restituisce string anche per chiavi assenti.
const orariPerReparto: Record<string, string> = { produzione: "06:00" };
const x = orariPerReparto["magazzino"]; // tipo: string (con noUncheckedIndexedAccess: string | undefined)

// GOTCHA: il .length e il for..of NON sono coperti dalla flag, quindi restano
// ergonomici. La perdita si sente solo con accesso per indice numerico esplicito.
for (const o of orari) {
  o.slice(0, 2); // o: string (for..of non aggiunge undefined)
}

// =============================================================================
// 7) exactOptionalPropertyTypes: NON inclusa in strict
// =============================================================================

// Distingue "proprieta' assente" da "proprieta' presente valorizzata a undefined".
// Senza la flag, `campo?: T` significa `campo?: T | undefined` e puoi assegnare
// esplicitamente undefined. Con la flag ON, un `?:` significa "puo' mancare", ma
// NON "puo' valere undefined": per permettere undefined esplicito devi scriverlo.

interface FiltroTurno {
  turno?: Turno; // con exactOptionalPropertyTypes: assente OPPURE un Turno, non undefined
}

const f1: FiltroTurno = {}; // OK: assente
const f2: FiltroTurno = { turno: "P4" }; // OK: valorizzato

// ERRORE TS: Type 'undefined' is not assignable to type 'Turno'.
//            (con exactOptionalPropertyTypes attivo)
// const f3: FiltroTurno = { turno: undefined };

// Se vuoi ammettere anche undefined esplicito, dichiaralo tu nel tipo:
interface FiltroTurno2 {
  turno?: Turno | undefined; // assente OPPURE Turno OPPURE undefined
}
const f4: FiltroTurno2 = { turno: undefined }; // OK

// Perche' conta: JSON.stringify({turno: undefined}) omette la chiave, mentre
// {turno: "P4"} la include. La flag ti costringe a essere intenzionale.

// =============================================================================
// 8) useUnknownInCatchVariables (inclusa in strict dalla 4.4)
// =============================================================================

// La variabile di catch diventa `unknown` invece di `any`. Corretto: a runtime
// puoi lanciare qualsiasi valore (throw "stringa", throw 42), non solo Error.
// unknown ti costringe a fare narrowing prima di usarla.

function parseOrario(raw: string): number {
  try {
    const [hh, mm] = raw.split(":");
    if (hh === undefined || mm === undefined) throw new Error("formato non valido");
    return Number(hh) * 60 + Number(mm);
  } catch (err) {
    // err: unknown (non piu' any)
    // ERRORE TS: 'err' is of type 'unknown'.
    // console.log(err.message);

    // Narrowing esplicito con instanceof:
    if (err instanceof Error) {
      console.log(err.message); // err: Error
    }
    return -1;
  }
}
parseOrario("08:30"); // => 510

// Type guard riutilizzabile per messaggi d'errore sicuri.
function messaggioErrore(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "errore sconosciuto";
}

// =============================================================================
// 9) strictPropertyInitialization + noImplicitThis (incluse in strict)
// =============================================================================

// strictPropertyInitialization: ogni field di classe non-optional deve essere
// inizializzato nel costruttore o alla dichiarazione, altrimenti errore.
class RepositoryTimbrature {
  // ERRORE TS: Property 'cache' has no initializer and is not definitely assigned.
  // private cache: Map<number, Timbratura[]>;

  // Corretto: inizializzato inline.
  private readonly cache: Map<number, Timbratura[]> = new Map();

  // Alternativa: il definite assignment assertion `!` promette che verra'
  // valorizzato altrove (es. da un framework di DI). Usa con cautela.
  private connessione!: unknown;

  registra(t: Timbratura): void {
    // noImplicitThis: dentro un metodo `this` e' tipato RepositoryTimbrature,
    // non any; una callback che perde il binding di this darebbe errore.
    const lista = this.cache.get(t.dipendenteId) ?? [];
    lista.push(t);
    this.cache.set(t.dipendenteId, lista);
  }
}
new RepositoryTimbrature().registra({ dipendenteId: 1, entrata: "08:00", uscita: "17:00" });

// =============================================================================
// 10) ESEMPIO ERP realistico: DTO validato con tutte le flag attive
// =============================================================================

// Il regex di validazione e' documentazione; a livello di tipo usiamo template
// literal types per avvicinarci al pattern /^UP-\d{3}$/ e /^\d{2}:\d{2}$/.
type OrarioHHMM = `${number}:${number}`; // approssimazione a compile-time

interface TimbraturaDTO {
  dipendenteId: number;
  entrata: OrarioHHMM;
  uscita?: OrarioHHMM; // exactOptional: assente o valorizzata, mai undefined esplicito
}

// Validatore che sfrutta strictNullChecks + noUncheckedIndexedAccess.
function validaDTO(input: Record<string, unknown>): TimbraturaDTO | null {
  const id = input["dipendenteId"]; // tipo: unknown (Record<string, unknown>)
  const entrata = input["entrata"]; // unknown
  if (typeof id !== "number") return null;
  if (typeof entrata !== "string") return null;
  if (!/^\d{2}:\d{2}$/.test(entrata)) return null;
  // Cast controllato solo DOPO la validazione runtime.
  return { dipendenteId: id, entrata: entrata as OrarioHHMM };
}
validaDTO({ dipendenteId: 1, entrata: "08:00" });

// =============================================================================
// 11) ESEMPIO ERP: state machine turno con exhaustive check
// =============================================================================

// Discriminated union: lo stato del turno di un operatore.
type StatoTurno =
  | { stato: "assente" }
  | { stato: "presente"; entrata: string }
  | { stato: "in_pausa"; entrata: string; inizioPausa: string };

// never nel default forza l'exhaustiveness: se aggiungi un caso alla union e
// dimentichi di gestirlo, il compilatore segnala qui. E' il pattern piu' potente
// abilitato da strictNullChecks + control flow narrowing.
function descriviStato(s: StatoTurno): string {
  switch (s.stato) {
    case "assente":
      return "Operatore assente";
    case "presente":
      return `Presente dalle ${s.entrata}`; // s ristretto al ramo "presente"
    case "in_pausa":
      return `In pausa dalle ${s.inizioPausa}`;
    default: {
      const _exhaustive: never = s; // se un caso manca, s NON e' never -> errore
      return _exhaustive;
    }
  }
}
descriviStato({ stato: "presente", entrata: "08:00" });

// =============================================================================
// 12) Test type-level delle flag (verifiche a compile-time)
// =============================================================================

// Con noUncheckedIndexedAccess l'accesso indicizzato includerebbe undefined.
type _T1 = Expect<Equal<(typeof orari)[number], string>>; // elemento base: string
// Nel NOSTRO tsconfig noUncheckedIndexedAccess NON e' attiva, quindi typeof primo
// e' `string`. Con la flag ON diventerebbe `string | undefined`.
type _T2 = Expect<Equal<typeof primo, string>>; // senza la flag: string
// Variante didattica: cosi' sarebbe con noUncheckedIndexedAccess ON.
type _T2ConFlag = Equal<string | undefined, string | undefined>; // true

// Con strictNullChecks, `string | null` NON e' assegnabile a `string`.
type SenzaNull<T> = T extends null | undefined ? never : T;
type _T3 = Expect<Equal<SenzaNull<string | null>, string>>;

// Con exactOptionalPropertyTypes il tipo di keyof resta pulito.
type _T4 = Expect<Equal<keyof FiltroTurno, "turno">>;

// =============================================================================
// GOTCHA / PITFALLS
// =============================================================================

// GOTCHA 1: "sono in strict ma array[i] mi da' T non T|undefined".
//   noUncheckedIndexedAccess NON e' in strict. Va aggiunta a mano in tsconfig.

// GOTCHA 2: exactOptionalPropertyTypes e le spread di oggetti parziali.
//   Se costruisci un oggetto con { ...base, turno: forse } dove forse: Turno|undefined,
//   la flag puo' rifiutarlo. Soluzione: assegna la chiave solo se definita, oppure
//   dichiara `turno?: Turno | undefined` nel target.
// ERRORE TS (con la flag): { turno: undefined } non assegnabile a { turno?: Turno }
// const cattivo: FiltroTurno = { turno: Math.random() > 0.5 ? "P4" : undefined };
const buono: FiltroTurno = Math.random() > 0.5 ? { turno: "P4" } : {}; // OK

// GOTCHA 3: il non-null assertion `!` e i cast `as` disattivano le flag localmente.
//   Compilano ma spostano il rischio a runtime. Preferisci sempre il narrowing.
//   `emp!.nome` e `x as Timbratura` sono debiti tecnici, non fix.

// GOTCHA 4: strictFunctionTypes non protegge i metodi (method shorthand).
//   interface I { on(cb: (e: EventoBase) => void): void }  -> parametro bivariante.
//   Se vuoi la controvarianza, dichiara la property come field function:
//   interface I { on: (cb: (e: EventoBase) => void) => void }

// GOTCHA 5: disabilitare strictNullChecks ma tenere strict=true "sembra" ok ma
//   rompe il control flow narrowing ovunque e riporta null/undefined in ogni tipo.
//   Non farlo su codebase nuove.

// Nota: la sintassi @decorator (es. @Injectable) NON compila con
// experimentalDecorators=false, quindi appare solo in questo commento.

// =============================================================================
// export locali (solo simboli definiti in questo file)
// =============================================================================

export { raddoppia, formattaBadge, validaDTO, descriviStato, messaggioErrore, RepositoryTimbrature };
export type {
  Equal,
  Expect,
  Dipendente,
  Timbratura,
  TimbraturaDTO,
  StatoTurno,
  Handler,
  FiltroTurno,
  OrarioHHMM,
};

// =============================================================================
// RIEPILOGO COMANDI / CONCETTI
// =============================================================================
// - strict: meta-flag; abilita noImplicitAny, strictNullChecks, strictFunctionTypes,
//   strictBindCallApply, strictPropertyInitialization, noImplicitThis, alwaysStrict,
//   useUnknownInCatchVariables. NON abilita noUncheckedIndexedAccess ne' exactOptionalPropertyTypes.
// - noImplicitAny: vieta gli any impliciti; l'inferenza contestuale non conta come implicit any.
// - strictNullChecks: null/undefined sono tipi distinti; abilita control flow narrowing.
// - strictFunctionTypes: parametri funzione controvarianti (solo su function type, non method shorthand).
// - strictBindCallApply: bind/call/apply verificano i tipi degli argomenti.
// - strictPropertyInitialization: field di classe devono essere inizializzati o marcati con !.
// - noImplicitThis: this tipato nei metodi, non any.
// - noUncheckedIndexedAccess (OPT-IN): array[i]/record[k] restituiscono T | undefined.
// - exactOptionalPropertyTypes (OPT-IN): ?: significa "assente", non "undefined esplicito".
// - useUnknownInCatchVariables: catch(err) -> err: unknown, richiede narrowing.
// - Narrowing: if/typeof/instanceof/discriminated union + never per exhaustiveness.
// - Anti-pattern: `!` (non-null assertion) e `as` (cast) bypassano le flag -> debito a runtime.
// - tsc: target ES2022, lib ES2022+DOM, experimentalDecorators=false, noEmit; @decorator solo nei commenti.
