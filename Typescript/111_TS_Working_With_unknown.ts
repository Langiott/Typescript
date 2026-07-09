/**
 * File 111 - Working with unknown safely
 * Guida all'uso sicuro del type unknown in TypeScript strict.
 * Argomenti: unknown vs any, narrowing obbligatorio, parsing sicuro
 * JSON -> unknown -> tipo di dominio, type guards e best practice.
 * Esempi tratti dal dominio ERP Polyuretech (Dipendente, Timbratura, Reparto).
 * Livello: ECOSYSTEM/EXTRA. Compila con tsc --strict, target ES2022.
 */

// ---------------------------------------------------------------------------
// 1) unknown vs any: la differenza fondamentale
// ---------------------------------------------------------------------------
// any DISATTIVA il type checker: qualsiasi operazione e' permessa e nessun
// errore viene segnalato. unknown e' il "top type" SICURO: puoi assegnare
// qualsiasi valore a unknown, ma NON puoi usarlo finche' non lo restringi.

let valoreAny: any = "UP-001";
valoreAny.toFixed(2); // Nessun errore a compile-time, ESPLODE a runtime
valoreAny.qualsiasiCosa.senza.senso; // any propaga la pericolosita'

let valoreUnknown: unknown = "UP-001";
// ERRORE TS: 'valoreUnknown' is of type 'unknown'.
// valoreUnknown.toFixed(2);
// Con unknown il compilatore ci OBBLIGA a controllare prima di usare.

// Assegnazioni: verso unknown va sempre bene (unknown accetta tutto)
const x1: unknown = 42;
const x2: unknown = "ciao";
const x3: unknown = { badge: "UP-001" };

// Da unknown verso un tipo concreto NON e' permesso senza narrowing
// ERRORE TS: Type 'unknown' is not assignable to type 'string'.
// const s1: string = valoreUnknown;

// any invece si assegna a qualsiasi cosa (ecco perche' e' pericoloso)
const s2: string = valoreAny; // Compila, ma nessuna garanzia reale

// ---------------------------------------------------------------------------
// 2) Tipi di dominio ERP Polyuretech usati negli esempi
// ---------------------------------------------------------------------------

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
}

interface Timbratura {
  dipendenteId: number;
  entrata: string; // orario naive-UTC "HH:MM"
  uscita: string; // orario naive-UTC "HH:MM"
}

interface Reparto {
  id: number;
  nome: string;
  turno: Turno;
}

// Regex di validazione del dominio
const RE_BADGE = /^UP-\d{3}$/;
const RE_ORARIO = /^\d{2}:\d{2}$/;
const RUOLI: readonly Ruolo[] = ["SuperAdmin", "Admin", "Operatore", "QrDisplay"];
const TURNI: readonly Turno[] = ["P4", "P2", "STD"];

// ---------------------------------------------------------------------------
// 3) Narrowing con typeof: il caso dei primitivi
// ---------------------------------------------------------------------------
// typeof restringe unknown ai tipi primitivi: dopo il check il tipo e' noto.

function descriviValore(v: unknown): string {
  if (typeof v === "string") {
    // qui v: string
    return `stringa lunga ${v.length}`;
  }
  if (typeof v === "number") {
    // qui v: number
    return `numero ${v.toFixed(2)}`;
  }
  if (typeof v === "boolean") {
    // qui v: boolean
    return v ? "vero" : "falso";
  }
  // qui v: unknown (nessun ramo ha ristretto)
  return "tipo non gestito";
}

descriviValore("UP-001"); // => "stringa lunga 6"
descriviValore(19.9); // => "numero 19.90"
descriviValore(true); // => "vero"

// ---------------------------------------------------------------------------
// 4) Narrowing di oggetti: attenzione a typeof null
// ---------------------------------------------------------------------------
// typeof null === "object": va escluso esplicitamente prima di leggere campi.

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function leggiBadge(v: unknown): string | undefined {
  if (isObject(v) && typeof v.badge === "string") {
    // qui v: Record<string, unknown>, v.badge: string
    return v.badge;
  }
  return undefined;
}

leggiBadge({ badge: "UP-042" }); // => "UP-042"
leggiBadge({ nome: "Mario" }); // => undefined
leggiBadge(null); // => undefined (escluso da isObject)

// ---------------------------------------------------------------------------
// 5) Custom type guard: "v is T" per tipi di dominio
// ---------------------------------------------------------------------------
// Una type guard restituisce un boolean e informa il compilatore del tipo.

function isRuolo(v: unknown): v is Ruolo {
  return typeof v === "string" && (RUOLI as readonly string[]).includes(v);
}

function isTurno(v: unknown): v is Turno {
  return typeof v === "string" && (TURNI as readonly string[]).includes(v);
}

function isBadge(v: unknown): v is string {
  return typeof v === "string" && RE_BADGE.test(v);
}

function isOrario(v: unknown): v is string {
  return typeof v === "string" && RE_ORARIO.test(v);
}

isRuolo("Admin"); // => true
isRuolo("Root"); // => false
isBadge("UP-007"); // => true
isBadge("UP-7"); // => false
isOrario("08:30"); // => true
isOrario("8:30"); // => false

// ---------------------------------------------------------------------------
// 6) Type guard composta: validare un Dipendente completo da unknown
// ---------------------------------------------------------------------------

function isDipendente(v: unknown): v is Dipendente {
  return (
    isObject(v) &&
    typeof v.id === "number" &&
    typeof v.nome === "string" &&
    isBadge(v.badge) &&
    isRuolo(v.ruolo)
  );
}

function isTimbratura(v: unknown): v is Timbratura {
  return (
    isObject(v) &&
    typeof v.dipendenteId === "number" &&
    isOrario(v.entrata) &&
    isOrario(v.uscita)
  );
}

const grezzo: unknown = { id: 1, nome: "Mario", badge: "UP-001", ruolo: "Operatore" };
if (isDipendente(grezzo)) {
  // qui grezzo: Dipendente, accesso sicuro ai campi
  grezzo.ruolo; // tipo: Ruolo
}

// ---------------------------------------------------------------------------
// 7) Parsing sicuro JSON -> unknown -> tipo di dominio
// ---------------------------------------------------------------------------
// JSON.parse ha firma "(text: string) => any": e' un buco nel type system.
// BEST PRACTICE: forzare il risultato a unknown e poi validare con guardie.

function parseJsonUnknown(testo: string): unknown {
  return JSON.parse(testo) as unknown; // any -> unknown, richiude il buco
}

function parseDipendente(testo: string): Dipendente | null {
  let dato: unknown;
  try {
    dato = parseJsonUnknown(testo);
  } catch {
    // JSON malformato: mai fidarsi dell'input esterno
    return null;
  }
  return isDipendente(dato) ? dato : null;
}

parseDipendente('{"id":1,"nome":"Mario","badge":"UP-001","ruolo":"Admin"}');
// => oggetto Dipendente valido
parseDipendente('{"id":1,"nome":"Mario","badge":"UP-1","ruolo":"Admin"}');
// => null (badge non valido)
parseDipendente("non-json");
// => null (parse fallito)

// ---------------------------------------------------------------------------
// 8) Parsing di array: validare ogni elemento
// ---------------------------------------------------------------------------

function isArrayOf<T>(v: unknown, guard: (e: unknown) => e is T): v is T[] {
  return Array.isArray(v) && v.every(guard);
}

function parseListaDipendenti(testo: string): Dipendente[] | null {
  let dato: unknown;
  try {
    dato = parseJsonUnknown(testo);
  } catch {
    return null;
  }
  return isArrayOf(dato, isDipendente) ? dato : null;
}

parseListaDipendenti('[{"id":1,"nome":"A","badge":"UP-001","ruolo":"Admin"}]');
// => Dipendente[]
parseListaDipendenti('[{"id":1}]'); // => null

// ---------------------------------------------------------------------------
// 9) unknown nei catch: la scelta corretta per gli errori
// ---------------------------------------------------------------------------
// Con "useUnknownInCatchVariables" (attivo in strict) la variabile di catch
// e' unknown, non any. Va quindi ristretta prima di leggere .message.

function messaggioErrore(e: unknown): string {
  if (e instanceof Error) {
    // qui e: Error
    return e.message;
  }
  if (typeof e === "string") {
    return e;
  }
  return "Errore sconosciuto";
}

function timbra(orario: unknown): string {
  try {
    if (!isOrario(orario)) {
      throw new Error("Orario non valido, atteso HH:MM");
    }
    return `Timbratura registrata alle ${orario}`;
  } catch (e) {
    // e: unknown -> narrowing obbligatorio
    return messaggioErrore(e);
  }
}

timbra("08:00"); // => "Timbratura registrata alle 08:00"
timbra("8"); // => "Orario non valido, atteso HH:MM"

// ---------------------------------------------------------------------------
// 10) unknown come firma pubblica di API "aperte"
// ---------------------------------------------------------------------------
// Preferisci unknown ad any nelle firme che ricevono input non fidato:
// costringi il chiamante a validare invece di propagare insicurezza.

function salvaConfig(payload: unknown): Reparto | null {
  if (
    isObject(payload) &&
    typeof payload.id === "number" &&
    typeof payload.nome === "string" &&
    isTurno(payload.turno)
  ) {
    // payload ora e' strutturalmente un Reparto
    return { id: payload.id, nome: payload.nome, turno: payload.turno };
  }
  return null;
}

salvaConfig({ id: 3, nome: "Stampaggio", turno: "P4" });
// => { id: 3, nome: "Stampaggio", turno: "P4" }
salvaConfig({ id: 3, nome: "Stampaggio", turno: "P9" });
// => null (turno non valido)

// ---------------------------------------------------------------------------
// 11) Assertion function: alternativa alle type guard
// ---------------------------------------------------------------------------
// "asserts v is T" fa fallire l'esecuzione se il tipo non e' quello atteso,
// altrimenti restringe il tipo nel codice che segue la chiamata.

function assertDipendente(v: unknown): asserts v is Dipendente {
  if (!isDipendente(v)) {
    throw new Error("Payload non e' un Dipendente valido");
  }
}

function stampaRuolo(v: unknown): Ruolo {
  assertDipendente(v);
  // dopo l'assert, v: Dipendente
  return v.ruolo;
}

stampaRuolo({ id: 1, nome: "Ada", badge: "UP-010", ruolo: "SuperAdmin" });
// => "SuperAdmin"

// ---------------------------------------------------------------------------
// 12) unknown e union: restringere passo dopo passo
// ---------------------------------------------------------------------------

type RisultatoParse =
  | { ok: true; valore: Dipendente }
  | { ok: false; errore: string };

function parseSicuro(testo: string): RisultatoParse {
  let dato: unknown;
  try {
    dato = parseJsonUnknown(testo);
  } catch {
    return { ok: false, errore: "JSON malformato" };
  }
  if (!isDipendente(dato)) {
    return { ok: false, errore: "Struttura Dipendente non valida" };
  }
  return { ok: true, valore: dato };
}

const r = parseSicuro('{"id":9,"nome":"Eve","badge":"UP-099","ruolo":"QrDisplay"}');
if (r.ok) {
  r.valore.nome; // tipo: string, accesso sicuro
} else {
  r.errore; // tipo: string
}

// ---------------------------------------------------------------------------
// 13) Errori comuni da NON fare con unknown
// ---------------------------------------------------------------------------

// (a) Cast diretto a T senza validazione: bypassa la sicurezza come any
const pericoloso: unknown = { badge: 123 };
// Compila ma e' una BUGIA: badge a runtime e' number, non string
const finto = pericoloso as Dipendente;
// finto.badge.toUpperCase() -> ESPLODE a runtime nonostante il tipo dica string

// (b) Doppio cast "as unknown as T" per forzare tipi incompatibili
const numero: number = 42;
// ERRORE TS: Conversion of type 'number' to type 'string' may be a mistake.
// const brutto = numero as string;
const forzato = numero as unknown as string; // Compila, ma e' un abuso: EVITARE

// (c) Dimenticare typeof null quando si validano oggetti
function leggiNomeSbagliato(v: unknown): string {
  // Se v e' null qui "v.nome" darebbe errore a runtime senza il check null
  if (typeof v === "object" && v !== null && "nome" in v) {
    const nome = (v as { nome: unknown }).nome;
    return typeof nome === "string" ? nome : "";
  }
  return "";
}
leggiNomeSbagliato(null); // => "" (gestito correttamente col check v !== null)

// ---------------------------------------------------------------------------
// 14) Helper riutilizzabile: getProp tipizzata da unknown
// ---------------------------------------------------------------------------

function getStringProp(v: unknown, chiave: string): string | undefined {
  if (isObject(v)) {
    const val = v[chiave];
    return typeof val === "string" ? val : undefined;
  }
  return undefined;
}

getStringProp({ badge: "UP-001" }, "badge"); // => "UP-001"
getStringProp({ badge: 123 }, "badge"); // => undefined
getStringProp(42, "badge"); // => undefined

// ---------------------------------------------------------------------------
// 15) Esempio browser (NON eseguito): fetch restituisce dati unknown
// ---------------------------------------------------------------------------
// La risposta di rete e' input esterno non fidato: trattala come unknown
// e validala con le stesse guardie usate per il JSON locale.

// Esempio browser
async function caricaDipendente(url: string): Promise<Dipendente | null> {
  const resp = await fetch(url);
  const dato: unknown = await resp.json(); // .json() ritorna Promise<any>: forziamo unknown
  return isDipendente(dato) ? dato : null;
}

// ---------------------------------------------------------------------------
// Export locali (solo simboli definiti in questo file)
// ---------------------------------------------------------------------------

export {
  descriviValore,
  isObject,
  isRuolo,
  isTurno,
  isBadge,
  isOrario,
  isDipendente,
  isTimbratura,
  isArrayOf,
  parseJsonUnknown,
  parseDipendente,
  parseListaDipendenti,
  messaggioErrore,
  timbra,
  salvaConfig,
  assertDipendente,
  stampaRuolo,
  parseSicuro,
  getStringProp,
  caricaDipendente,
};

export type { Ruolo, Turno, Dipendente, Timbratura, Reparto, RisultatoParse };

// ---------------------------------------------------------------------------
// RIEPILOGO COMANDI / CONCETTI
// ---------------------------------------------------------------------------
// - unknown = top type SICURO; any = top type INSICURO (disattiva i controlli).
// - Verso unknown si assegna tutto; da unknown serve narrowing per usarlo.
// - typeof restringe i primitivi (string, number, boolean, "object").
// - typeof null === "object": escludi sempre v !== null prima di leggere campi.
// - Custom type guard: funzione con firma "v is T" che ritorna boolean.
// - Assertion function: firma "asserts v is T", lancia se il tipo non torna.
// - JSON.parse ritorna any: forzare a unknown e validare con guardie.
// - Valida gli array elemento per elemento (isArrayOf + guard).
// - catch (e) e' unknown in strict: usa e instanceof Error prima di .message.
// - Preferisci unknown ad any nelle firme che ricevono input non fidato.
// - EVITA: "as T" senza validazione e "as unknown as T" per forzare tipi.
// - fetch/.json() ritornano any: assegna a unknown e valida come il JSON locale.
// - Verifica: tsc --strict --target ES2022 --lib ES2022,DOM --noEmit 111_TS_Working_With_unknown.ts
