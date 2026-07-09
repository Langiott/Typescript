/**
 * 113_TS_Error_Classes_Typed.ts
 * Argomento 113: Error classes tipizzate
 * In questo file vediamo come definire custom Error class in TypeScript, costruire
 * una gerarchia (ValidationError / NotFoundError / AuthError), fare narrowing con
 * instanceof, propagare la root cause con la option { cause }, e integrare gli errori
 * in un pattern Result<T, E>. Esempi calati sul dominio ERP Polyuretech.
 * Livello: ECOSYSTEM/EXTRA. Compila con tsc --strict, target ES2022.
 */

// ============================================================================
// 1. CUSTOM ERROR CLASS: le basi
// ============================================================================

// La classe Error nativa ha message, name e (da ES2022) stack e cause.
// Per una custom error si estende Error e si imposta name + prototype chain.

class AppError extends Error {
  // Campo custom: codice applicativo stabile (utile per log / i18n)
  readonly code: string;

  constructor(message: string, code: string) {
    super(message); // inizializza this.message
    this.name = "AppError"; // sovrascrive "Error" nel toString / stack
    this.code = code;
    // Fix classico per target < ES2022 e per transpiler: ripristina il prototype.
    // Con target ES2022 spesso non serve, ma e' innocuo e difensivo.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const e1 = new AppError("Qualcosa e' andato storto", "GENERIC");
// e1.name  => "AppError"
// e1.code  => "GENERIC"  (tipo: string)
// e1 instanceof AppError => true
// e1 instanceof Error    => true

// new.target dentro il constructor punta alla classe effettivamente istanziata:
// serve per far funzionare instanceof anche con le sottoclassi (vedi sotto).

// ============================================================================
// 2. GERARCHIA DI ERRORI ERP
// ============================================================================

// Base astratta per tutti gli errori di dominio: aggiunge un discriminante "kind".
// Usare un literal type come discriminante permette lo switch esaustivo.

type ErrorKind = "validation" | "not_found" | "auth" | "conflict";

abstract class DomainError extends Error {
  abstract readonly kind: ErrorKind;
  readonly timestamp: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options); // ES2022: passa la cause al costruttore Error
    this.name = new.target.name; // es. "ValidationError"
    this.timestamp = "2026-07-08T00:00:00Z"; // in prod: new Date().toISOString()
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// --- ValidationError: input non valido (badge, orario, ruolo...) ---
class ValidationError extends DomainError {
  readonly kind = "validation" as const;
  // Campo extra: quale field ha fallito la validazione
  readonly field: string;

  constructor(field: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.field = field;
  }
}

// --- NotFoundError: entita' non trovata (dipendente, reparto...) ---
class NotFoundError extends DomainError {
  readonly kind = "not_found" as const;
  readonly entity: string;
  readonly id: string | number;

  constructor(entity: string, id: string | number, options?: { cause?: unknown }) {
    super(`${entity} con id '${id}' non trovato`, options);
    this.entity = entity;
    this.id = id;
  }
}

// --- AuthError: permessi insufficienti / non autenticato ---
class AuthError extends DomainError {
  readonly kind = "auth" as const;
  readonly requiredRole: Ruolo;

  constructor(requiredRole: Ruolo, message?: string, options?: { cause?: unknown }) {
    super(message ?? `Serve il ruolo '${requiredRole}'`, options);
    this.requiredRole = requiredRole;
  }
}

// --- ConflictError: violazione di invariante (doppia timbratura...) ---
class ConflictError extends DomainError {
  readonly kind = "conflict" as const;
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

// Tipi di dominio ERP usati sopra.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
}

// ============================================================================
// 3. instanceof E NARROWING
// ============================================================================

const errUnknown: unknown = new NotFoundError("Dipendente", 42);

// instanceof restringe unknown -> tipo concreto: dentro il branch e' NotFoundError
if (errUnknown instanceof NotFoundError) {
  // err: NotFoundError
  // err.entity => "Dipendente"   err.id => 42
}

// La gerarchia permette narrowing "a livelli": tutti sono anche DomainError e Error.
if (err instanceof DomainError) {
  // err: DomainError -> ho accesso a kind, timestamp, message
}
if (err instanceof Error) {
  // err: Error -> ho accesso a message, stack
}

// Attenzione: instanceof funziona sulla prototype chain. Se il name viene
// sovrascritto, instanceof NON si basa sul name ma sul prototype: e' robusto.

// ============================================================================
// 4. SWITCH ESAUSTIVO SUL DISCRIMINANTE kind
// ============================================================================

// Preferibile a catene di instanceof quando gli errori sono discriminati union.
// assertNever garantisce a compile-time che tutti i kind siano gestiti.

function assertNever(x: never): never {
  throw new Error(`Caso non gestito: ${JSON.stringify(x)}`);
}

function httpStatusFor(e: DomainError): number {
  switch (e.kind) {
    case "validation":
      return 400;
    case "not_found":
      return 404;
    case "auth":
      return 403;
    case "conflict":
      return 409;
    default:
      // Se aggiungo un nuovo ErrorKind e dimentico un case, qui ho ERRORE TS.
      return assertNever(e.kind);
  }
}

// httpStatusFor(new ValidationError("badge", "formato errato")) => 400
// httpStatusFor(new AuthError("Admin"))                         => 403

// ============================================================================
// 5. LA OPTION cause (ES2022): incatenare la root cause
// ============================================================================

// cause serve a conservare l'errore originale (es. errore driver DB) mentre si
// rilancia un errore di dominio piu' significativo per il chiamante.

function parseOrario(raw: string): string {
  const ORARIO = /^\d{2}:\d{2}$/;
  if (!ORARIO.test(raw)) {
    // Nessuna cause: e' l'errore radice
    throw new ValidationError("orario", `Orario non valido: '${raw}' (atteso HH:MM)`);
  }
  return raw;
}

function salvaTimbratura(rawOrario: string): void {
  try {
    parseOrario(rawOrario);
    // ... scrittura su DB ...
  } catch (low) {
    // Rilancio un errore di piu' alto livello ma preservo la causa tecnica.
    throw new ConflictError("Impossibile salvare la timbratura", { cause: low });
  }
}

// Lettura della cause: cause e' di tipo unknown, va restretta prima dell'uso.
function rootCauseMessage(e: unknown): string {
  let current: unknown = e;
  const messages: string[] = [];
  // Scendo la catena di cause finche' trovo Error con cause
  while (current instanceof Error) {
    messages.push(`${current.name}: ${current.message}`);
    current = current.cause; // cause: unknown
  }
  return messages.join(" <- ");
}

// try {
//   salvaTimbratura("99:99");
// } catch (e) {
//   rootCauseMessage(e);
//   // => "ConflictError: Impossibile salvare la timbratura <- ValidationError: Orario non valido: '99:99' (atteso HH:MM)"
// }

// ============================================================================
// 6. IL PROBLEMA DEL catch: la variabile e' unknown
// ============================================================================

// In strict mode, la variabile di catch e' `unknown` (useUnknownInCatchVariables).
// Non si puo' accedere a .message senza narrowing.

function esempioCatch(): void {
  try {
    parseOrario("xx:yy");
  } catch (e) {
    // e: unknown
    // ERRORE TS: 'e' is of type 'unknown'. -> console.log(e.message)
    if (e instanceof Error) {
      // e: Error -> ora e.message e' lecito
      e.message; // tipo: string
    }
  }
}

// Helper per normalizzare qualsiasi throw (anche throw di stringhe/oggetti) in Error.
function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === "string") return new Error(value);
  return new Error("Errore sconosciuto", { cause: value });
}

// toError("boom").message         => "boom"
// toError({ any: 1 }).cause       => { any: 1 }

// ============================================================================
// 7. TYPE GUARD PERSONALIZZATO
// ============================================================================

// Un type guard riusabile per riconoscere i nostri DomainError da un unknown.
function isDomainError(e: unknown): e is DomainError {
  return e instanceof DomainError;
}

// isDomainError(new AuthError("Admin")) => true
// isDomainError(new Error("x"))         => false

// Guard piu' specifico basato sul discriminante (utile dopo serializzazione JSON,
// dove instanceof si perde perche' l'oggetto non e' piu' un'istanza reale).
interface SerializedError {
  kind: ErrorKind;
  name: string;
  message: string;
}
function hasKind(e: unknown): e is SerializedError {
  return (
    typeof e === "object" &&
    e !== null &&
    "kind" in e &&
    typeof (e as Record<string, unknown>).kind === "string"
  );
}

// ============================================================================
// 8. ERROR IN RESULT<T, E>: alternativa alle eccezioni
// ============================================================================

// Il pattern Result rende gli errori parte del tipo di ritorno: il chiamante
// e' costretto dal compiler a gestirli, niente throw "invisibili".

type Ok<T> = { readonly ok: true; readonly value: T };
type Err<E> = { readonly ok: false; readonly error: E };
type Result<T, E> = Ok<T> | Err<E>;

// Costruttori helper (inferenza pulita del literal ok)
function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}
function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

// Esempio: validazione badge senza throw. L'errore e' tipizzato nel ritorno.
function validaBadge(raw: string): Result<string, ValidationError> {
  const BADGE = /^UP-\d{3}$/;
  if (!BADGE.test(raw)) {
    return err(new ValidationError("badge", `Badge non valido: '${raw}' (atteso UP-000)`));
  }
  return ok(raw);
}

const r1 = validaBadge("UP-001");
// r1: Result<string, ValidationError>
if (r1.ok) {
  // r1.value: string  => "UP-001"
} else {
  // r1.error: ValidationError
}

// La union di piu' errori nel canale E: il chiamante li discrimina con kind.
type LookupError = NotFoundError | AuthError;

const archivio: Dipendente[] = [
  { id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Operatore" },
  { id: 2, nome: "Bianchi", badge: "UP-002", ruolo: "Admin" },
];

function trovaDipendente(id: number, chiamante: Ruolo): Result<Dipendente, LookupError> {
  if (chiamante !== "Admin" && chiamante !== "SuperAdmin") {
    return err(new AuthError("Admin", "Solo Admin puo' leggere l'anagrafica"));
  }
  const d = archivio.find((x) => x.id === id);
  if (!d) {
    return err(new NotFoundError("Dipendente", id));
  }
  return ok(d);
}

const r2 = trovaDipendente(99, "Admin");
// r2: Result<Dipendente, NotFoundError | AuthError>
if (!r2.ok) {
  switch (r2.error.kind) {
    case "not_found":
      // r2.error: NotFoundError
      r2.error.entity; // "Dipendente"
      break;
    case "auth":
      // r2.error: AuthError
      r2.error.requiredRole; // "Admin"
      break;
  }
}

// Bridge da eccezioni a Result: cattura un throw e lo impacchetta.
function tryCatch<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (e) {
    return err(toError(e));
  }
}

// tryCatch(() => parseOrario("08:30")) => { ok: true, value: "08:30" }
// tryCatch(() => parseOrario("boom"))  => { ok: false, error: ValidationError }

// unwrap: estrae il valore o rilancia l'errore (utile ai confini "throw-friendly").
function unwrap<T, E>(r: Result<T, E>): T {
  if (r.ok) return r.value;
  throw r.error;
}

// ============================================================================
// 9. FLUSSO ERP COMPLETO: validazione + auth + not_found con cause
// ============================================================================

interface Timbratura {
  badge: string;
  orario: string; // "HH:MM" naive-UTC
  tipo: "entrata" | "uscita";
  turno: "P4" | "P2" | "STD";
}

// Registra una timbratura orchestrando piu' step; ogni errore e' tipizzato.
function registraTimbratura(
  chiamante: Ruolo,
  input: { badge: string; orario: string; tipo: "entrata" | "uscita"; turno: "P4" | "P2" | "STD" }
): Result<Timbratura, ValidationError | AuthError | NotFoundError> {
  // 1) Authorization
  if (chiamante === "QrDisplay") {
    return err(new AuthError("Operatore", "QrDisplay non puo' timbrare"));
  }
  // 2) Validation del badge
  const badgeR = validaBadge(input.badge);
  if (!badgeR.ok) return badgeR; // Err<ValidationError> compatibile con la union

  // 3) Validation dell'orario (qui uso throw + tryCatch per mostrare il bridge)
  const orarioR = tryCatch(() => parseOrario(input.orario));
  if (!orarioR.ok) {
    // orarioR.error e' Error generico: lo riconfeziono in ValidationError con cause
    return err(new ValidationError("orario", "Orario non valido", { cause: orarioR.error }));
  }
  // 4) Existence del dipendente
  const esiste = archivio.some((d) => d.badge === input.badge);
  if (!esiste) return err(new NotFoundError("Dipendente", input.badge));

  return ok({ badge: badgeR.value, orario: orarioR.value, tipo: input.tipo, turno: input.turno });
}

const esito = registraTimbratura("Operatore", {
  badge: "UP-001",
  orario: "08:00",
  tipo: "entrata",
  turno: "P4",
});
// esito.ok === true -> esito.value: Timbratura

// Handler che trasforma il Result in una "risposta HTTP" (mock, nessun framework).
interface MockResponse {
  status: number;
  body: { message: string; code?: string } | Timbratura;
}
function toResponse(r: Result<Timbratura, DomainError>): MockResponse {
  if (r.ok) return { status: 201, body: r.value };
  return { status: httpStatusFor(r.error), body: { message: r.error.message, code: r.error.kind } };
}

// ============================================================================
// 10. SERIALIZZAZIONE: attenzione: instanceof si perde oltre il confine JSON
// ============================================================================

// JSON.stringify di un Error di default perde message/name (proprieta' non-enumerable).
// Meglio un metodo toJSON esplicito.

class SerializableError extends DomainError {
  readonly kind = "validation" as const;
  toJSON(): SerializedError {
    return { kind: this.kind, name: this.name, message: this.message };
  }
}

// const s = JSON.stringify(new SerializableError("boom"));
// => '{"kind":"validation","name":"SerializableError","message":"boom"}'
// Dopo il parse NON e' piu' un'istanza: usare hasKind()/kind, non instanceof.

// ============================================================================
// 11. NOTA SUI DECORATORS (experimentalDecorators = FALSE)
// ============================================================================

// La sintassi seguente NON compila in questo setup, la mostriamo solo commentata:
//
//   @LogErrors
//   class Servizio { /* ... */ }
//
// Per loggare gli errori senza decorators, wrappare la funzione (higher-order):
function withErrorLog<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  return (...args: A): R => {
    try {
      return fn(...args);
    } catch (e) {
      // In prod: logger.error(...)
      const _msg = toError(e).message;
      throw e; // rilancio preservando lo stack
    }
  };
}

// const safeParse = withErrorLog(parseOrario);
// safeParse("08:30") => "08:30"

// ============================================================================
// 12. EXPORTS locali
// ============================================================================

export {
  AppError,
  DomainError,
  ValidationError,
  NotFoundError,
  AuthError,
  ConflictError,
  SerializableError,
  httpStatusFor,
  rootCauseMessage,
  toError,
  isDomainError,
  hasKind,
  ok,
  err,
  tryCatch,
  unwrap,
  validaBadge,
  trovaDipendente,
  registraTimbratura,
  toResponse,
  withErrorLog,
};
export type {
  ErrorKind,
  Ruolo,
  Dipendente,
  Timbratura,
  Result,
  Ok,
  Err,
  LookupError,
  SerializedError,
  MockResponse,
};

/*
 * ============================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================================
 * - class X extends Error: custom error; impostare this.name in constructor.
 * - Object.setPrototypeOf(this, new.target.prototype): fix prototype chain difensivo.
 * - new.target: la classe effettivamente istanziata (utile per name e prototype).
 * - Gerarchia: abstract DomainError -> ValidationError / NotFoundError / AuthError / ConflictError.
 * - kind: literal discriminante -> switch esaustivo + assertNever(x: never).
 * - instanceof: narrowing basato sulla prototype chain (robusto anche col name sovrascritto).
 * - { cause } (ES2022): super(message, { cause }); cause e' unknown, va restretta.
 * - rootCauseMessage: risale la catena current.cause finche' instanceof Error.
 * - useUnknownInCatchVariables: la var di catch e' unknown -> narrowing obbligatorio.
 * - toError(unknown): normalizza qualsiasi throw in Error.
 * - Type guard: (e): e is DomainError; hasKind per oggetti post-JSON.
 * - Result<T,E> = Ok<T> | Err<E>: errori nel tipo di ritorno, gestione forzata dal compiler.
 * - ok()/err()/tryCatch()/unwrap(): helper del pattern Result e bridge con le eccezioni.
 * - toJSON(): serializzare gli Error (le proprieta' di Error non sono enumerable).
 * - Oltre il confine JSON instanceof si perde: usare il discriminante kind.
 * - Decorators OFF: usare higher-order function (withErrorLog) al posto di @LogErrors.
 * ============================================================================
 */
