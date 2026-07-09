/**
 * File 019 - void/never returns (FUNDAMENTALS)
 * Argomento: i return type speciali "void" e "never" in TypeScript.
 * Vediamo: funzioni che non ritornano nulla (void), funzioni che non
 * ritornano MAI (never: throw o loop infinito), la differenza tra void
 * e undefined, e il pattern delle callback tipizzate void.
 * Contesto dominio: ERP Polyuretech (Dipendente, Timbratura, ruoli).
 */

// ============================================================
// 1) return void: funzione che non produce un valore utile
// ============================================================

// Una funzione senza return esplicito ha return type inferito "void".
function logTimbratura(badge: string): void {
  console.log("Timbratura registrata per " + badge);
  // nessun return: il valore prodotto e' void
}
// tipo di logTimbratura: (badge: string) => void

// Anche un "return;" nudo (senza espressione) e' valido con void.
function stampaSeAdmin(ruolo: string): void {
  if (ruolo !== "Admin") return; // early return, esce senza valore
  console.log("Accesso admin");
}

// Il valore restituito da una funzione void e' comunque undefined a runtime,
// ma il TYPE e' void: TS ti scoraggia dall'usarlo.
const risultato = logTimbratura("UP-001");
// tipo di risultato: void
// ERRORE TS: non puoi usarlo come valore utile
// const x: number = risultato; // Type 'void' is not assignable to 'number'

// ============================================================
// 2) Differenza void vs undefined
// ============================================================

// undefined e' un valore specifico; void significa "non mi interessa il ritorno".
function ritornaUndefined(): undefined {
  return undefined; // OBBLIGATORIO: con return type undefined DEVI ritornare
}
// tipo: () => undefined

function ritornaVoid(): void {
  // NON serve return: void non obbliga a ritornare undefined esplicito
}
// tipo: () => void

// Con return type undefined, dimenticare il return e' un errore.
// ERRORE TS: A function whose declared type is neither 'void' nor 'any' must return a value.
// function rotta(): undefined { console.log("ciao"); }

// La differenza chiave: una funzione dichiarata "() => void" puo' essere
// implementata da una funzione che RITORNA qualcosa. TS ignora quel valore.
type Callback = () => void;
const cb: Callback = () => 42; // OK! il numero viene ignorato dal type
// tipo del valore ritornato secondo il chiamante: void, non number

// Questo e' il "void return trick", utile con Array.prototype.forEach ecc.

// ============================================================
// 3) Il "void return trick" con le callback
// ============================================================

// forEach si aspetta una callback (item) => void.
const badges: string[] = ["UP-001", "UP-002", "UP-003"];
const raccolta: string[] = [];

// push ritorna un number (la nuova length), ma forEach vuole void:
// grazie al trick, passare push va bene (il number viene ignorato).
badges.forEach((b) => raccolta.push(b)); // OK anche se push => number
// raccolta: ["UP-001", "UP-002", "UP-003"]

// Callback void esplicita: chi la chiama non deve fidarsi del valore.
function forEachDipendente(
  ids: number[],
  azione: (id: number) => void
): void {
  for (const id of ids) azione(id);
}
forEachDipendente([1, 2, 3], (id) => console.log("processo dipendente " + id));

// ============================================================
// 4) never: la funzione che non ritorna MAI
// ============================================================

// Caso A: la funzione lancia sempre un'eccezione -> non torna mai al chiamante.
function erroreTimbratura(msg: string): never {
  throw new Error("Timbratura non valida: " + msg);
}
// tipo: (msg: string) => never

// Caso B: loop infinito -> il controllo non torna mai indietro.
function pollingLoop(): never {
  while (true) {
    // in un ERP reale qui ci sarebbe un await; esempio didattico
  }
}
// tipo: () => never

// never e' diverso da void: void = "torna ma senza valore",
// never = "non torna proprio".

// ============================================================
// 5) never nel narrowing: exhaustiveness check
// ============================================================

// Union dei turni possibili in Polyuretech.
type Turno = "P4" | "P2" | "STD";

// Helper che accetta solo never: se qualcuno aggiunge un turno e non
// lo gestisce, TS segnala l'errore a compile time.
function assertNever(x: never): never {
  throw new Error("Caso non gestito: " + JSON.stringify(x));
}

function orarioInizioTurno(t: Turno): string {
  switch (t) {
    case "P4":
      return "06:00";
    case "P2":
      return "14:00";
    case "STD":
      return "08:30";
    default:
      // qui t ha tipo never: tutti i casi sono coperti
      return assertNever(t);
  }
}
// orarioInizioTurno("P4") => "06:00"

// Se aggiungessi "P3" a Turno senza un case, la riga assertNever(t)
// diventerebbe:
// ERRORE TS: Argument of type '"P3"' is not assignable to parameter of type 'never'.

// ============================================================
// 6) never come tipo "impossibile" e nelle union
// ============================================================

// never e' l'elemento neutro delle union: sparisce quando unito ad altro.
type T1 = string | never; // tipo: string
type T2 = never | number; // tipo: number

// never e' assegnabile a QUALSIASI tipo (bottom type).
function usaNever(): void {
  const n = erroreTimbratura("test"); // tipo: never (di fatto irraggiungibile)
  const s: string = n; // OK a livello di type: never -> string
  const num: number = n; // OK anche questo
  void s;
  void num;
}
void usaNever;

// Al contrario, NESSUN valore concreto e' assegnabile a never (tranne never).
// ERRORE TS: Type 'string' is not assignable to type 'never'.
// const impossibile: never = "ciao";

// ============================================================
// 7) never dai filtri di tipo (conditional types)
// ============================================================

// Escludere membri da una union produce never per i rami scartati,
// che vengono poi eliminati dalla union risultante.
type SoloAdmin<R> = R extends "Admin" | "SuperAdmin" ? R : never;
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type RuoliAmministrativi = SoloAdmin<Ruolo>; // tipo: "SuperAdmin" | "Admin"

// (Questo e' esattamente come funziona il built-in Extract/Exclude.)

// ============================================================
// 8) void vs never nei metodi e nelle interface
// ============================================================

// Interfaccia mock (NON e' una libreria: definita qui) per un logger ERP.
interface Logger {
  info(msg: string): void; // torna nulla di utile
  fatal(msg: string): never; // termina sempre il flusso (throw)
}

const loggerConsole: Logger = {
  info(msg) {
    console.log("[INFO] " + msg);
  },
  fatal(msg) {
    throw new Error("[FATAL] " + msg);
  },
};
void loggerConsole;

// Un metodo dichiarato void puo' essere implementato ritornando qualcosa:
interface Handler {
  onTimbratura(orario: string): void;
}
const handler: Handler = {
  onTimbratura: (orario) => orario.length, // ritorna number, ignorato: OK
};
void handler;

// ============================================================
// 9) Esempio dominio: validazione con throw (never) + void di supporto
// ============================================================

const RE_BADGE = /^UP-\d{3}$/;
const RE_ORARIO = /^\d{2}:\d{2}$/;

// Ritorna never se il badge e' invalido: dopo la chiamata TS sa che
// oltre quel punto il valore e' garantito valido (assertion function).
function assertBadgeValido(badge: string): asserts badge is string {
  if (!RE_BADGE.test(badge)) {
    // il ramo che lancia ha implicitamente tipo never
    throw new Error("Badge non valido: " + badge);
  }
}

// void: registra la timbratura ma non restituisce nulla di utile.
function registraTimbratura(badge: string, orario: string): void {
  assertBadgeValido(badge); // se invalido, throw (never) -> non prosegue
  if (!RE_ORARIO.test(orario)) {
    erroreTimbratura(orario); // never: interrompe qui
  }
  console.log("OK " + badge + " @ " + orario);
}
registraTimbratura("UP-001", "08:30"); // => OK UP-001 @ 08:30
// registraTimbratura("X", "08:30");    // lancerebbe a runtime

// ============================================================
// 10) void nei Promise: async che non restituisce dati
// ============================================================

// Una funzione async senza dati utili ha tipo Promise<void>.
async function syncReparti(): Promise<void> {
  // await ... operazioni sul DB
  // nessun return di valore
}
// tipo: () => Promise<void>
void syncReparti;

// Callback che ritorna Promise<void> vs void: entrambe usabili dove
// serve () => void, grazie allo stesso trick (i valori sono ignorati).
type TaskVoid = () => void;
const taskAsync: TaskVoid = async () => {
  await Promise.resolve();
}; // OK: Promise<void> accettata dove serve void
void taskAsync;

// ============================================================
// Export di simboli LOCALI (solo di questo file)
// ============================================================
export {
  logTimbratura,
  registraTimbratura,
  orarioInizioTurno,
  assertNever,
  erroreTimbratura,
};
export type {
  Callback,
  Turno,
  Ruolo,
  RuoliAmministrativi,
  Logger,
  TaskVoid,
};

/*
 * ============================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================
 * - void: return type di funzioni che non producono un valore utile.
 * - "return;" nudo e assenza di return => void.
 * - void vs undefined: undefined e' un valore ("() => undefined" OBBLIGA
 *   il return); void non obbliga e IGNORA eventuali valori ritornati.
 * - void return trick: una () => void accetta callback che ritornano
 *   qualcosa (es. Array.push => number) senza errore.
 * - never: funzioni che NON tornano mai (throw sempre, oppure loop while(true)).
 * - never != void: void torna senza valore, never non torna affatto.
 * - never e' il bottom type: assegnabile a tutto, nessun valore assegnabile a never.
 * - never sparisce nelle union: (string | never) === string.
 * - assertNever(x: never): exhaustiveness check nello switch (default).
 * - conditional types: il ramo scartato produce never (base di Exclude/Extract).
 * - assertion function "asserts x is T": se non valido throw (never).
 * - async senza dati => Promise<void>; usabile dove serve () => void.
 * ============================================================
 */
