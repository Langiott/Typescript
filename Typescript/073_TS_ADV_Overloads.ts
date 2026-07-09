/**
 * File 073 - ADV Overloads (Function Overloads)
 * -------------------------------------------------------------
 * Argomento: function overloads in TypeScript. Una function puo'
 * esporre PIU' overload signatures (le firme viste dal chiamante)
 * seguite da UNA sola implementation signature + body. Vediamo
 * overload su function, su method, il caso parse turno/orario ERP,
 * i meccanismi interni (resolution, ordine, narrowing) e i pitfall.
 * Tutto compila con tsc --strict (target ES2022). ASCII only.
 */

// =============================================================
// 0) HELPER DI TYPE-TESTING (usati piu' avanti)
// -------------------------------------------------------------
// Equal<A,B> confronta due type a livello type-system; Expect<T>
// accetta solo `true`. Servono per "asserire" un tipo a compile time.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;
type Expect<T extends true> = T;

// Esempio d'uso: se il type inferito cambia, la riga smette di compilare.
type _t0 = Expect<Equal<string, string>>; // ok
// type _tErr = Expect<Equal<string, number>>; // ERRORE TS: 'false' non e' 'true'

// =============================================================
// 1) IL PROBLEMA: perche' non basta una union
// -------------------------------------------------------------
// Vorremmo: se passo number torna string, se passo string torna number.
// Con una firma "union in / union out" perdiamo la correlazione:
function badConvert(x: string | number): string | number {
  return typeof x === "number" ? String(x) : Number(x);
}
const bc1 = badConvert(10); // tipo: string | number  (NON string!)
// Il chiamante non sa che con number ottiene string: correlazione persa.
void bc1;

// =============================================================
// 2) OVERLOAD BASE: firme multiple + UNA implementazione
// -------------------------------------------------------------
// Le prime due sono OVERLOAD SIGNATURES (visibili dall'esterno).
// La terza e' la IMPLEMENTATION SIGNATURE: NON e' chiamabile
// dall'esterno, serve solo a tipare il body e deve essere
// compatibile con tutti gli overload.
function convert(x: number): string;
function convert(x: string): number;
function convert(x: string | number): string | number {
  return typeof x === "number" ? String(x) : Number(x);
}

const c1 = convert(42);      // tipo: string
const c2 = convert("42");    // tipo: number
// const c3 = convert(true); // ERRORE TS: nessun overload accetta boolean
void c1;
void c2;

// NOTA MECCANISMO: il chiamante "vede" SOLO gli overload, mai la
// implementation signature. Anche se l'impl accetta string|number,
// convert(x: boolean) fallisce perche' boolean non matcha nessun overload.

// =============================================================
// 3) RESOLUTION ORDER: l'ordine degli overload conta
// -------------------------------------------------------------
// TS prova gli overload DALL'ALTO VERSO IL BASSO e sceglie il PRIMO
// che matcha. Mettere il piu' generico in cima "ruba" i casi specifici.

// Ordine SBAGLIATO: il generico in cima cattura tutto.
function pickBad(x: unknown): string;
function pickBad(x: number): 42;
function pickBad(x: unknown): unknown {
  return typeof x === "number" ? 42 : "other";
}
const pb = pickBad(1); // tipo: string  (non 42!) perche' il 1o overload matcha prima
void pb;

// Ordine CORRETTO: dal piu' specifico al piu' generico.
function pickGood(x: number): 42;
function pickGood(x: unknown): string;
function pickGood(x: unknown): unknown {
  return typeof x === "number" ? 42 : "other";
}
const pg1 = pickGood(1);     // tipo: 42
const pg2 = pickGood("hi");  // tipo: string
void pg1;
void pg2;

// =============================================================
// 4) L'IMPLEMENTATION NON E' UN OVERLOAD
// -------------------------------------------------------------
// Errore classico: pensare che la firma implementativa sia chiamabile.
function firstArg(a: string): string;
function firstArg(a: string, b: string): string;
function firstArg(a: string, b?: string): string {
  return b === undefined ? a : a + b;
}
const fa1 = firstArg("x");         // ok -> string
const fa2 = firstArg("x", "y");    // ok -> string
// const faErr = firstArg("x", "y", "z"); // ERRORE TS: nessun overload con 3 arg,
//   l'implementation signature (a, b?) NON conta come overload chiamabile.
void fa1;
void fa2;

// =============================================================
// 5) OVERLOAD PER NUMERO DI ARGOMENTI (opzionali)
// -------------------------------------------------------------
// createRange: 1 arg = 0..end ; 2 arg = start..end.
function createRange(end: number): number[];
function createRange(start: number, end: number): number[];
function createRange(a: number, b?: number): number[] {
  const [start, end] = b === undefined ? [0, a] : [a, b];
  const out: number[] = [];
  for (let i = start; i < end; i++) out.push(i);
  return out;
}
const r1 = createRange(3);     // [0,1,2]
const r2 = createRange(2, 5);  // [2,3,4]
void r1;
void r2;

// =============================================================
// 6) DOMINIO ERP: entita' di base (mock, definite qui)
// -------------------------------------------------------------
// Nessuna libreria esterna: sono type/interface locali del corso.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";
type Badge = `UP-${number}`; // template literal; validazione runtime con regex sotto

interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001", validato a runtime
  ruolo: Ruolo;
}

interface Reparto {
  id: number;
  nome: string;
}

// Timbratura con orari "naive-UTC" come stringhe "HH:MM".
interface Timbratura {
  dipendenteId: number;
  entrata: string; // "08:00"
  uscita: string;  // "17:00"
  turno: Turno;
}

const ORARIO_RE = /^\d{2}:\d{2}$/;
const BADGE_RE = /^UP-\d{3}$/;

// =============================================================
// 7) PARSE TURNO / ORARIO: overload che cambia il RETURN
// -------------------------------------------------------------
// parseTurnoInfo: dato il tag letterale del turno restituiamo un
// oggetto con la durata prevista; overload su literal type per
// avere un return type STRETTO per ciascun turno.
interface TurnoP4 { turno: "P4"; oreTeoriche: 8; notturno: false }
interface TurnoP2 { turno: "P2"; oreTeoriche: 6; notturno: true }
interface TurnoSTD { turno: "STD"; oreTeoriche: 8; notturno: false }

function parseTurnoInfo(t: "P4"): TurnoP4;
function parseTurnoInfo(t: "P2"): TurnoP2;
function parseTurnoInfo(t: "STD"): TurnoSTD;
function parseTurnoInfo(t: Turno): TurnoP4 | TurnoP2 | TurnoSTD {
  switch (t) {
    case "P4": return { turno: "P4", oreTeoriche: 8, notturno: false };
    case "P2": return { turno: "P2", oreTeoriche: 6, notturno: true };
    case "STD": return { turno: "STD", oreTeoriche: 8, notturno: false };
  }
}
const p4 = parseTurnoInfo("P4"); // tipo: TurnoP4  (non la union!)
type _tP4 = Expect<Equal<typeof p4.oreTeoriche, 8>>; // 8 esatto
type _tP4not = Expect<Equal<typeof p4.notturno, false>>;
void p4;

// parseOrario: overload che, in base al secondo parametro, ritorna
// un tuple [h, m] oppure i minuti totali dalla mezzanotte.
function parseOrario(hhmm: string): [number, number];
function parseOrario(hhmm: string, asMinutes: true): number;
function parseOrario(hhmm: string, asMinutes?: boolean): [number, number] | number {
  if (!ORARIO_RE.test(hhmm)) {
    throw new Error(`Orario non valido: ${hhmm}`);
  }
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return asMinutes ? h * 60 + m : [h, m];
}
const hm = parseOrario("08:30");         // tipo: [number, number]  => [8, 30]
const min = parseOrario("08:30", true);  // tipo: number            => 510
void hm;
void min;

// NOTA: overload che discrimina sul VALORE di un flag booleano.
// La firma con `asMinutes: true` deve stare PRIMA di eventuali
// firme piu' generiche per essere raggiungibile (qui l'altra non
// ha secondo argomento, quindi nessun conflitto).

// =============================================================
// 8) OVERLOAD SU METHOD (in interface e class)
// -------------------------------------------------------------
// In una interface gli overload di un method si scrivono ripetendo
// la firma (nessun body). L'implementation vive nella class.
interface OrarioService {
  toMinutes(hhmm: string): number;
  toMinutes(h: number, m: number): number; // secondo overload del method
}

class OrarioServiceImpl implements OrarioService {
  // Nella class: gli overload precedono l'implementazione.
  toMinutes(hhmm: string): number;
  toMinutes(h: number, m: number): number;
  toMinutes(a: string | number, m?: number): number {
    if (typeof a === "string") {
      const [hh, mm] = a.split(":").map(Number);
      return hh * 60 + mm;
    }
    return a * 60 + (m ?? 0);
  }
}
const svc = new OrarioServiceImpl();
const mm1 = svc.toMinutes("01:15"); // => 75
const mm2 = svc.toMinutes(1, 15);   // => 75
void mm1;
void mm2;

// CONSTRUCTOR OVERLOADS: anche il constructor puo' avere overload.
class Intervallo {
  readonly start: number;
  readonly end: number;
  constructor(hhmm: string);            // overload 1: da "HH:MM-HH:MM"
  constructor(start: number, end: number); // overload 2: da minuti
  constructor(a: string | number, b?: number) {
    if (typeof a === "string") {
      const [s, e] = a.split("-");
      this.start = svc.toMinutes(s);
      this.end = svc.toMinutes(e);
    } else {
      this.start = a;
      this.end = b ?? a;
    }
  }
}
const iv = new Intervallo("08:00-17:00"); // start 480, end 1020
void iv;

// =============================================================
// 9) OVERLOAD REALISTICO ERP: repository findDipendente
// -------------------------------------------------------------
// Un repository "overloadato": per id numerico -> Dipendente | undefined
// per badge string che matcha "UP-xxx" -> Dipendente | undefined
// per un predicato -> array. Il return type dipende dall'input.
class DipendenteRepo {
  constructor(private readonly rows: Dipendente[]) {}

  findDipendente(id: number): Dipendente | undefined;
  findDipendente(badge: string): Dipendente | undefined;
  findDipendente(pred: (d: Dipendente) => boolean): Dipendente[];
  findDipendente(
    arg: number | string | ((d: Dipendente) => boolean),
  ): Dipendente | Dipendente[] | undefined {
    if (typeof arg === "number") {
      return this.rows.find((d) => d.id === arg);
    }
    if (typeof arg === "string") {
      return this.rows.find((d) => d.badge === arg);
    }
    return this.rows.filter(arg);
  }
}

const repo = new DipendenteRepo([
  { id: 1, nome: "Mara", badge: "UP-001", ruolo: "Operatore" },
  { id: 2, nome: "Leo", badge: "UP-002", ruolo: "Admin" },
]);
const byId = repo.findDipendente(1);                    // Dipendente | undefined
const byBadge = repo.findDipendente("UP-002");          // Dipendente | undefined
const admins = repo.findDipendente((d) => d.ruolo === "Admin"); // Dipendente[]
void byId;
void byBadge;
void admins;

// MECCANISMO: passando una arrow function, TS sceglie il 3o overload
// e infatti `admins` e' un array, NON `Dipendente | undefined`.
type _tAdmins = Expect<Equal<typeof admins, Dipendente[]>>;

// =============================================================
// 10) OVERLOAD vs FUNCTION SIGNATURE OBJECT (type-level)
// -------------------------------------------------------------
// Un overload puo' essere descritto anche come TYPE con firme multiple
// nella stessa call-signature list. Utile per tipare una variabile.
type Convert = {
  (x: number): string;
  (x: string): number;
};
const convert2: Convert = ((x: string | number) =>
  typeof x === "number" ? String(x) : Number(x)) as Convert;
const cc1 = convert2(1);   // tipo: string
const cc2 = convert2("1"); // tipo: number
void cc1;
void cc2;

// GOTCHA sull'inferenza: `typeof convert` collassa a un tipo singolo
// utile solo per l'ULTIMO overload quando usato in certi contesti
// generici. In pratica gli overload NON si distribuiscono bene dentro
// utilities come Parameters/ReturnType: catturano solo l'ULTIMO overload.
type ConvRet = ReturnType<typeof convert>;   // tipo: number  (solo ultimo overload!)
type ConvArg = Parameters<typeof convert>;   // tipo: [x: string]
type _tConvRet = Expect<Equal<ConvRet, number>>;
type _tConvArg = Expect<Equal<ConvArg, [x: string]>>;
// -> Se ti serve TUTTI gli overload, preferisci un discriminated
//    return type con conditional type invece degli overload (vedi 11).

// =============================================================
// 11) ALTERNATIVA MODERNA: conditional return type (spesso meglio)
// -------------------------------------------------------------
// Molti casi risolti storicamente con overload oggi si esprimono con
// un generic + conditional type: un'unica firma, return correlato.
type OutFor<T> = T extends number ? string : T extends string ? number : never;
function convert3<T extends number | string>(x: T): OutFor<T> {
  return (typeof x === "number" ? String(x) : Number(x)) as OutFor<T>;
}
const cd1 = convert3(1);   // tipo: string
const cd2 = convert3("1"); // tipo: number
void cd1;
void cd2;
// PRO: ReturnType/Parameters funzionano meglio, si compone con generics.
// CONTRO: serve un cast nel body (il compiler non restringe OutFor<T>
// dentro l'implementazione) e i messaggi di errore sono meno chiari.

// =============================================================
// 12) OVERLOAD e OPTIONAL/REST: ordine e compatibilita'
// -------------------------------------------------------------
// L'implementation signature deve ACCETTARE tutte le forme degli
// overload, altrimenti errore. Qui usiamo rest per coprire i casi.
function logRow(msg: string): void;
function logRow(dip: Dipendente, msg: string): void;
function logRow(...args: [string] | [Dipendente, string]): void {
  if (args.length === 1) {
    // qui args e' [string]
    void args[0].toUpperCase();
  } else {
    const [dip, msg] = args;
    void `${dip.badge}: ${msg}`;
  }
}
logRow("avvio");
logRow({ id: 3, nome: "Ugo", badge: "UP-003", ruolo: "Operatore" }, "in servizio");

// =============================================================
// 13) GOTCHA / PITFALLS (trappole comuni)
// -------------------------------------------------------------

// PITFALL A) Implementation signature "troppo stretta".
//   function f(x: number): number;
//   function f(x: string): string;
//   function f(x: number): number { return x; }
// ERRORE TS: la firma implementativa (x: number) non e' compatibile
//   con l'overload (x: string). L'impl deve coprire l'UNIONE: (x: number|string).

// PITFALL B) Chiamare la firma implementativa.
//   convert(true);
// ERRORE TS: anche se l'impl accetta string|number, dall'esterno
//   vedi solo gli overload dichiarati -> boolean non e' ammesso.

// PITFALL C) Overload piu' generico messo per primo (vedi sezione 3):
//   "ruba" i casi specifici e restringe il return in modo sbagliato.
//   Soluzione: ordina dal piu' SPECIFICO al piu' generico.

// PITFALL D) return type mancante -> TS deduce l'impl e perde gli overload.
//   Se dimentichi i due overload e lasci solo l'impl con union,
//   torni al caso "badConvert" (sezione 1): correlazione persa.

// PITFALL E) Overload che si "coprono" tra loro producono chiamate
//   irraggiungibili. Esempio: (x: unknown) prima di (x: number) rende
//   il secondo overload MAI selezionato (vedi pickBad).

// PITFALL F) `void arg[0].toUpperCase()` funziona in 12 perche' abbiamo
//   ristretto con args.length; senza il narrowing su length TS non sa
//   quale ramo della tuple union e' attivo.

// =============================================================
// 14) MECCANISMO INTERNO (riassunto del "perche'")
// -------------------------------------------------------------
// - Il compiler tiene una LISTA ordinata di call signatures (gli
//   overload). Alla chiamata, prova ciascuna in ordine e usa la PRIMA
//   assegnabile agli argomenti forniti (arity + tipi).
// - La implementation signature NON entra nella lista visibile: e'
//   solo il "contratto interno" che il body deve rispettare e che
//   deve essere super-tipo di tutti gli overload.
// - Utilities come ReturnType/Parameters/typeof su una function
//   overloadata catturano SOLO l'ULTIMO overload (limite noto):
//   per questo per composizione generica si preferiscono conditional
//   type (sezione 11).
// - Control flow analysis nel body (typeof, length, in) e' cio' che
//   permette all'implementazione union-based di restare type-safe.

// =============================================================
// 15) EXPORT (solo simboli locali di questo file)
// -------------------------------------------------------------
export {
  convert,
  convert2,
  convert3,
  parseTurnoInfo,
  parseOrario,
  OrarioServiceImpl,
  Intervallo,
  DipendenteRepo,
  ORARIO_RE,
  BADGE_RE,
};
export type {
  Equal,
  Expect,
  Ruolo,
  Turno,
  Badge,
  Dipendente,
  Reparto,
  Timbratura,
  OrarioService,
  Convert,
  OutFor,
  TurnoP4,
  TurnoP2,
  TurnoSTD,
};

// =============================================================
// RIEPILOGO COMANDI / CONCETTI
// -------------------------------------------------------------
// - Overload = N firme visibili (overload signatures) + 1 impl signature+body.
// - L'implementation signature NON e' chiamabile dall'esterno.
// - L'impl deve essere compatibile (super-tipo) di TUTTI gli overload.
// - Resolution: dall'alto verso il basso, vince la PRIMA firma assegnabile.
// - Ordina gli overload dal piu' SPECIFICO al piu' generico.
// - Overload su method: ripeti le firme in interface; impl nella class.
// - Constructor overloads: firme senza body + un solo body.
// - Overload utili per correlare input->output (number->string, ...).
// - ReturnType/Parameters/typeof catturano SOLO l'ultimo overload.
// - Alternativa moderna: generic + conditional type (return correlato,
//   compone meglio ma richiede cast nel body).
// - Pitfall: impl troppo stretta, chiamare l'impl, overload generico
//   in cima, return type mancante, overload irraggiungibili.
// - Helper di test tipo: Equal<A,B> + Expect<T extends true>.
