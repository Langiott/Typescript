/**
 * File 057 - Error Handling Typed
 * Corso TypeScript - Gestione degli errori con i type.
 * Da TS 4.4+ il parametro di catch e' 'unknown' (con useUnknownInCatchVariables),
 * percio' va sempre applicato il narrowing prima di usarlo. In questo file:
 * try/catch con unknown, narrowing dell'errore, instanceof Error, cenno alle
 * custom error class e cenno al pattern Result. Contesto dominio ERP Polyuretech.
 * Tutti gli esempi compilano con tsc --strict, target ES2022.
 */

// -----------------------------------------------------------------------------
// 1. Il problema: in catch il tipo e' 'unknown' (TS 4.4+ con useUnknownInCatchVariables)
// -----------------------------------------------------------------------------

// In JavaScript si puo' fare 'throw' di QUALSIASI valore, non solo di Error.
// Percio' TS tipizza la variabile di catch come 'unknown': non si assume nulla.
function esempioCatchUnknown(): string {
  try {
    throw new Error("timbratura non valida");
  } catch (err) {
    // 'err' ha tipo: unknown
    // console.log(err.message); // ERRORE TS: 'err' is of type 'unknown'
    if (err instanceof Error) {
      return err.message; // qui err e' narrowed a Error
    }
    return "errore sconosciuto";
  }
}
// esempioCatchUnknown() // => "timbratura non valida"

// -----------------------------------------------------------------------------
// 2. instanceof Error: il narrowing piu' comune
// -----------------------------------------------------------------------------

// instanceof restringe 'unknown' al type Error, esponendo name/message/stack.
function messaggioErrore(err: unknown): string {
  if (err instanceof Error) {
    // err: Error  -> ha .name, .message, .stack
    return `${err.name}: ${err.message}`;
  }
  // fallback per throw di stringhe, numeri, oggetti generici
  return `Errore non-Error: ${String(err)}`;
}
// messaggioErrore(new TypeError("x")) // => "TypeError: x"
// messaggioErrore("boom")             // => "Errore non-Error: boom"
// messaggioErrore(42)                 // => "Errore non-Error: 42"

// -----------------------------------------------------------------------------
// 3. Narrowing manuale con type guard su oggetti "error-like"
// -----------------------------------------------------------------------------

// Alcune API (es. errori da librerie o da JSON) non sono istanze di Error ma
// hanno comunque una proprieta' 'message'. Un type guard risolve il caso.
interface ErrorLike {
  message: string;
}

function isErrorLike(val: unknown): val is ErrorLike {
  return (
    typeof val === "object" &&
    val !== null &&
    "message" in val &&
    typeof (val as Record<string, unknown>).message === "string"
  );
}

function estraiMessaggio(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (isErrorLike(err)) return err.message; // err: ErrorLike
  return String(err);
}
// estraiMessaggio({ message: "campo badge mancante" }) // => "campo badge mancante"

// -----------------------------------------------------------------------------
// 4. Custom Error class (cenno): estendere Error per errori di dominio
// -----------------------------------------------------------------------------

// Creare sottoclassi di Error permette narrowing specifico con instanceof e
// dati extra tipizzati. Nota: in TS con target ES2022 il prototype si comporta
// correttamente; con target vecchi serviva Object.setPrototypeOf.
class ValidazioneError extends Error {
  constructor(
    public readonly campo: string,
    message: string,
  ) {
    super(message);
    this.name = "ValidazioneError";
  }
}

class BadgeNonValidoError extends ValidazioneError {
  constructor(public readonly badge: string) {
    super("badge", `Badge non valido: ${badge}`);
    this.name = "BadgeNonValidoError";
  }
}

// Regex di dominio ERP.
const RE_BADGE = /^UP-\d{3}$/; // es. "UP-001"
const RE_ORARIO = /^\d{2}:\d{2}$/; // es. "08:30"

function validaBadge(badge: string): string {
  if (!RE_BADGE.test(badge)) {
    throw new BadgeNonValidoError(badge);
  }
  return badge;
}

// Il narrowing distingue le sottoclassi: dal piu' specifico al piu' generico.
function gestisciValidazione(err: unknown): string {
  if (err instanceof BadgeNonValidoError) {
    // err: BadgeNonValidoError -> ha .badge e .campo
    return `Badge errato "${err.badge}" (campo ${err.campo})`;
  }
  if (err instanceof ValidazioneError) {
    // err: ValidazioneError -> ha .campo
    return `Validazione fallita sul campo ${err.campo}`;
  }
  if (err instanceof Error) return err.message;
  return "errore ignoto";
}

// Esempio d'uso:
function provaBadge(badge: string): string {
  try {
    validaBadge(badge);
    return "OK";
  } catch (err) {
    return gestisciValidazione(err);
  }
}
// provaBadge("UP-001") // => "OK"
// provaBadge("X-9")    // => 'Badge errato "X-9" (campo badge)'

// -----------------------------------------------------------------------------
// 5. Discriminated union di errori (alternativa a instanceof)
// -----------------------------------------------------------------------------

// Invece di classi, si puo' modellare l'errore come union discriminata sul
// campo 'kind'. Utile per errori serializzabili (JSON, code oltre confine rete).
type AppError =
  | { kind: "badge"; badge: string }
  | { kind: "orario"; valore: string }
  | { kind: "sconosciuto"; dettaglio: string };

function descriviAppError(e: AppError): string {
  switch (e.kind) {
    case "badge":
      return `Badge non valido: ${e.badge}`; // e: { kind:"badge"; badge:string }
    case "orario":
      return `Orario non valido: ${e.valore}`;
    case "sconosciuto":
      return `Errore: ${e.dettaglio}`;
    default: {
      // exhaustiveness check: se aggiungo un kind, qui errore in compilazione
      const _never: never = e;
      return _never;
    }
  }
}
// descriviAppError({ kind: "orario", valore: "25:00" }) // => "Orario non valido: 25:00"

// -----------------------------------------------------------------------------
// 6. Il pattern Result (cenno): errori come valori, senza throw
// -----------------------------------------------------------------------------

// Result<T, E> rende esplicito nel type che una funzione puo' fallire.
// Nessuna eccezione: il chiamante DEVE controllare 'ok' prima di leggere 'value'.
type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Helper costruttori.
function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}
function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Validazione orario che ritorna un Result invece di lanciare.
function parseOrario(valore: string): Result<string, AppError> {
  if (!RE_ORARIO.test(valore)) {
    return err({ kind: "orario", valore });
  }
  return ok(valore);
}

// Uso: il narrowing su 'ok' apre l'accesso a 'value' oppure a 'error'.
function stampaOrario(input: string): string {
  const res = parseOrario(input);
  if (res.ok) {
    // res: { ok:true; value:string }
    return `Orario ok: ${res.value}`;
  }
  // res: { ok:false; error:AppError }
  return descriviAppError(res.error);
}
// stampaOrario("08:30") // => "Orario ok: 08:30"
// stampaOrario("8:3")   // => "Orario non valido: 8:3"

// -----------------------------------------------------------------------------
// 7. Wrapper: convertire un throw in Result (bridge tra i due mondi)
// -----------------------------------------------------------------------------

// tryCatch esegue una funzione che potrebbe lanciare e ne cattura l'errore
// come valore, normalizzandolo sempre a Error grazie al narrowing.
function tryCatch<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (e) {
    // narrowing: garantiamo un vero Error anche se e' stato lanciato altro
    const errore = e instanceof Error ? e : new Error(String(e));
    return err(errore);
  }
}

// Esempio: incapsulo validaBadge (che lancia) in un Result.
function badgeSicuro(badge: string): Result<string, Error> {
  return tryCatch(() => validaBadge(badge));
}
// badgeSicuro("UP-042").ok // => true
// badgeSicuro("nope").ok   // => false

// -----------------------------------------------------------------------------
// 8. Errori tipizzati e dominio ERP: entita' minime + validazione multipla
// -----------------------------------------------------------------------------

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
}

interface Timbratura {
  entrata: string; // "HH:MM" naive-UTC
  uscita: string; // "HH:MM" naive-UTC
  turno: Turno;
}

// Accumula piu' AppError in un solo Result (validazione "raccogli tutto").
function validaTimbratura(t: Timbratura): Result<Timbratura, AppError[]> {
  const errori: AppError[] = [];
  if (!RE_ORARIO.test(t.entrata)) errori.push({ kind: "orario", valore: t.entrata });
  if (!RE_ORARIO.test(t.uscita)) errori.push({ kind: "orario", valore: t.uscita });
  if (errori.length > 0) return err(errori);
  return ok(t);
}
// validaTimbratura({ entrata:"08:00", uscita:"17:00", turno:"STD" }).ok // => true
// validaTimbratura({ entrata:"8", uscita:"x", turno:"P4" }).ok          // => false (2 errori)

// -----------------------------------------------------------------------------
// 9. async/await: catch resta 'unknown' anche con le Promise rejection
// -----------------------------------------------------------------------------

// Anche in una funzione async il valore intercettato in catch e' 'unknown':
// una Promise puo' essere rejected con qualsiasi valore, non solo con Error.
async function caricaDipendente(id: number): Promise<Result<Dipendente, Error>> {
  try {
    // simulazione: se id <= 0 la "chiamata" fallisce
    if (id <= 0) throw new ValidazioneError("id", `id non valido: ${id}`);
    const dip: Dipendente = { id, nome: "Rossi", badge: "UP-007", ruolo: "Operatore" };
    return ok(dip);
  } catch (e) {
    // e: unknown -> normalizzo
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
// await caricaDipendente(1)  // => { ok:true, value:{...} }
// await caricaDipendente(0)  // => { ok:false, error: ValidazioneError }

// -----------------------------------------------------------------------------
// 10. throw di 'unknown' e la utility 'assertNever' / assertion functions
// -----------------------------------------------------------------------------

// Un'assertion function restringe il type del chiamante dopo la chiamata.
// Se non lancia, TS "sa" che la condizione e' vera da quel punto in poi.
function assertDefined<T>(val: T | null | undefined, msg: string): asserts val is T {
  if (val === null || val === undefined) {
    throw new Error(msg);
  }
}

function nomeDipendente(dip: Dipendente | null): string {
  assertDefined(dip, "dipendente mancante");
  // dopo l'assert, dip: Dipendente (non piu' null)
  return dip.nome;
}
// nomeDipendente({ id:1, nome:"Bianchi", badge:"UP-001", ruolo:"Admin" }) // => "Bianchi"
// nomeDipendente(null) // lancia Error("dipendente mancante")

// -----------------------------------------------------------------------------
// Export dei simboli locali (solo simboli definiti in QUESTO file)
// -----------------------------------------------------------------------------

export {
  messaggioErrore,
  estraiMessaggio,
  isErrorLike,
  ValidazioneError,
  BadgeNonValidoError,
  validaBadge,
  descriviAppError,
  ok,
  err,
  parseOrario,
  tryCatch,
  validaTimbratura,
  caricaDipendente,
  assertDefined,
};
export type { ErrorLike, AppError, Result, Dipendente, Timbratura, Ruolo, Turno };

/*
 * =============================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * =============================================================================
 * - catch (err): dal TS 4.4+ (useUnknownInCatchVariables) err e' 'unknown'.
 * - Prima di usare err serve narrowing: instanceof, typeof, type guard.
 * - instanceof Error: restringe a Error (name, message, stack).
 * - Type guard 'val is ErrorLike': narrowing custom su oggetti error-like.
 * - Custom error: class X extends Error; impostare this.name nel constructor.
 * - instanceof su sottoclassi: dal piu' specifico al piu' generico.
 * - Discriminated union { kind }: errori serializzabili + exhaustiveness (never).
 * - Result<T,E> = {ok:true;value} | {ok:false;error}: errori come valori.
 * - ok()/err(): costruttori helper del Result.
 * - tryCatch(): converte funzioni che lanciano in un Result normalizzato.
 * - Normalizzare: e instanceof Error ? e : new Error(String(e)).
 * - async: anche li' il catch e' 'unknown' (rejection di qualsiasi valore).
 * - asserts val is T: assertion function che fa narrowing dopo la chiamata.
 * - Object.setPrototypeOf: serviva per custom Error con target < ES2015.
 * =============================================================================
 */
