/**
 * 054_TS_Working_With_JSON.ts
 * File numero 54 del corso TypeScript - Argomento: "Working with JSON".
 * In questo modulo vediamo come lavorare in modo type-safe con JSON: JSON.parse
 * ritorna 'any' e va tipizzato, JSON.stringify per serializzare, definire type
 * per le response, validare i dati a runtime e usare 'unknown' + narrowing.
 * Contesto dominio: ERP Polyuretech (Dipendente, Timbratura, Reparto, Turno).
 * Livello: INTERMEDIATE.
 */

// ---------------------------------------------------------------------------
// 1) JSON.parse ritorna 'any' -> pericoloso, va tipizzato
// ---------------------------------------------------------------------------

// JSON.parse ha come tipo di ritorno 'any': TypeScript non controlla nulla.
const grezzo = JSON.parse('{"nome":"Mario"}');
// tipo: any  -> qualsiasi accesso e' permesso ma NON e' verificato
grezzo.qualsiasiCosa.inesistente; // compila ma esplode a runtime (any disattiva i check)

// Assegnando ad una variabile tipizzata "battezziamo" il risultato.
interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
}

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Type annotation esplicita: da qui in poi il compiler tratta 'd' come Dipendente.
const d: Dipendente = JSON.parse('{"id":1,"nome":"Mario","badge":"UP-001","ruolo":"Operatore"}');
d.nome; // tipo: string
// ATTENZIONE: e' una "promessa" al compiler, NON una verifica a runtime.
// Se il JSON non rispetta la forma, il tipo mente. Vedi sezione validazione.

// ---------------------------------------------------------------------------
// 2) Helper generico: parse tipizzato (comodo ma pur sempre una asserzione)
// ---------------------------------------------------------------------------

// Wrapper generic: firma migliore di JSON.parse, ritorna T invece di any.
function parseAs<T>(testo: string): T {
  return JSON.parse(testo) as T;
}

const dip = parseAs<Dipendente>('{"id":2,"nome":"Lucia","badge":"UP-002","ruolo":"Admin"}');
dip.ruolo; // tipo: Ruolo
// Resta un cast: nessun controllo a runtime. Utile solo se la sorgente e' fidata.

// ---------------------------------------------------------------------------
// 3) JSON.stringify: serializzazione
// ---------------------------------------------------------------------------

interface Timbratura {
  dipendenteId: number;
  entrata: string; // orario naive-UTC "HH:MM"
  uscita: string | null;
  turno: Turno;
}

type Turno = "P4" | "P2" | "STD";

const t: Timbratura = { dipendenteId: 2, entrata: "08:00", uscita: null, turno: "P4" };

const json = JSON.stringify(t);
// tipo: string
// => {"dipendenteId":2,"entrata":"08:00","uscita":null,"turno":"P4"}

// Terzo argomento = indentazione (pretty print), utile per log/debug.
const jsonPretty = JSON.stringify(t, null, 2);
// tipo: string  (stringa multi-linea indentata di 2 spazi)

// Secondo argomento = replacer: array di chiavi da includere (whitelist).
const soloOrari = JSON.stringify(t, ["entrata", "uscita"]);
// => {"entrata":"08:00","uscita":null}

// Replacer come funzione: trasforma i valori durante la serializzazione.
const mascherato = JSON.stringify(t, (chiave, valore) =>
  chiave === "dipendenteId" ? "***" : valore
);
// => {"dipendenteId":"***","entrata":"08:00",...}

// Nota: valori 'undefined' e le funzioni vengono OMESSI da stringify.
const conUndefined = JSON.stringify({ a: 1, b: undefined, c: () => 1 });
// => {"a":1}   (b e c spariscono)

// ---------------------------------------------------------------------------
// 4) toJSON: personalizzare la serializzazione di una classe
// ---------------------------------------------------------------------------

// Se un oggetto ha un metodo toJSON(), stringify usa il suo valore di ritorno.
class Reparto {
  constructor(public id: number, public nome: string, private segreto: string) {}
  // Escludiamo 'segreto' dalla serializzazione.
  toJSON() {
    return { id: this.id, nome: this.nome };
  }
}
const rep = new Reparto(3, "Produzione", "password-interna");
JSON.stringify(rep);
// => {"id":3,"nome":"Produzione"}   (segreto non esce)

// ---------------------------------------------------------------------------
// 5) Tipizzare una API response
// ---------------------------------------------------------------------------

// Pattern comune: type che descrive l'involucro (envelope) della response.
interface ApiResponse<T> {
  ok: boolean;
  data: T;
  errore: string | null;
}

// Mock di fetch tipizzato: NON gira, e' solo un esempio di firma.
// (interfaccia mock: nel mondo reale useresti il DOM 'fetch'/'Response').
async function getDipendente(id: number): Promise<ApiResponse<Dipendente>> {
  // La response del server e' testo JSON: la tipizziamo con un generic.
  const testo = `{"ok":true,"data":{"id":${id},"nome":"X","badge":"UP-00${id}","ruolo":"Operatore"},"errore":null}`;
  const body = JSON.parse(testo) as ApiResponse<Dipendente>;
  return body;
}
// Esempio d'uso (non chiamato): getDipendente(1).then(r => r.data.nome);

// Response come union discriminata: modella successo/errore in modo esclusivo.
type Risultato<T> =
  | { stato: "ok"; data: T }
  | { stato: "errore"; messaggio: string };

function gestisci(r: Risultato<Dipendente>): string {
  // narrowing sulla proprieta' discriminante 'stato'
  if (r.stato === "ok") {
    return r.data.nome; // qui 'data' esiste
  }
  return r.messaggio; // qui 'messaggio' esiste
}

// ---------------------------------------------------------------------------
// 6) unknown invece di any: la scelta sicura
// ---------------------------------------------------------------------------

// 'unknown' e' come 'any' ma NON permette accessi finche' non fai narrowing.
function parseSicuro(testo: string): unknown {
  return JSON.parse(testo);
}

const x = parseSicuro('{"nome":"Ada"}');
// ERRORE TS: 'x' is of type 'unknown'  -> non puoi fare x.nome direttamente
// x.nome;

// Devi prima restringere il tipo con dei controlli (narrowing).
if (typeof x === "object" && x !== null && "nome" in x) {
  // dentro il blocco 'x' e' ristretto a un oggetto con proprieta' 'nome'
  const nome = (x as { nome: unknown }).nome;
  if (typeof nome === "string") {
    nome; // tipo: string
  }
}

// ---------------------------------------------------------------------------
// 7) Type guards: validare la forma a runtime
// ---------------------------------------------------------------------------

// Un type guard e' una funzione che ritorna 'x is T' e informa il compiler.
function isRuolo(v: unknown): v is Ruolo {
  return v === "SuperAdmin" || v === "Admin" || v === "Operatore" || v === "QrDisplay";
}

// Guard completo per Dipendente: controlla ogni campo del JSON sconosciuto.
function isDipendente(v: unknown): v is Dipendente {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "number" &&
    typeof o.nome === "string" &&
    typeof o.badge === "string" &&
    /^UP-\d{3}$/.test(o.badge) && // badge deve rispettare "UP-001"
    isRuolo(o.ruolo)
  );
}

// parse + validazione: ritorna Dipendente solo se il JSON e' valido.
function parseDipendente(testo: string): Dipendente {
  const raw: unknown = JSON.parse(testo);
  if (!isDipendente(raw)) {
    throw new Error("JSON non valido: forma Dipendente attesa");
  }
  return raw; // tipo: Dipendente  (grazie al type guard)
}

const ok = parseDipendente('{"id":9,"nome":"Nadia","badge":"UP-009","ruolo":"Admin"}');
ok.badge; // tipo: string, garantito valido a runtime
// parseDipendente('{"id":9}'); // lancerebbe: forma non valida

// ---------------------------------------------------------------------------
// 8) Validare formati con regex (orario e badge)
// ---------------------------------------------------------------------------

const RE_ORARIO = /^\d{2}:\d{2}$/; // "HH:MM"
const RE_BADGE = /^UP-\d{3}$/; // "UP-001"

function isTimbratura(v: unknown): v is Timbratura {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  const uscitaOk = o.uscita === null || (typeof o.uscita === "string" && RE_ORARIO.test(o.uscita));
  return (
    typeof o.dipendenteId === "number" &&
    typeof o.entrata === "string" &&
    RE_ORARIO.test(o.entrata) &&
    uscitaOk &&
    (o.turno === "P4" || o.turno === "P2" || o.turno === "STD")
  );
}

const tOk = '{"dipendenteId":2,"entrata":"08:00","uscita":null,"turno":"STD"}';
isTimbratura(JSON.parse(tOk)); // => true
const tKo = '{"dipendenteId":2,"entrata":"8:0","uscita":null,"turno":"STD"}';
isTimbratura(JSON.parse(tKo)); // => false  (entrata non "HH:MM")

// ---------------------------------------------------------------------------
// 9) Validare array e collezioni
// ---------------------------------------------------------------------------

// Per una lista: usa Array.isArray + every con il guard del singolo elemento.
function isDipendenteArray(v: unknown): v is Dipendente[] {
  return Array.isArray(v) && v.every(isDipendente);
}

function parseDipendenti(testo: string): Dipendente[] {
  const raw: unknown = JSON.parse(testo);
  if (!isDipendenteArray(raw)) throw new Error("Attesa lista di Dipendente");
  return raw; // tipo: Dipendente[]
}
// parseDipendenti('[{"id":1,"nome":"A","badge":"UP-001","ruolo":"Admin"}]');

// ---------------------------------------------------------------------------
// 10) reviver: trasformare i valori durante il parse
// ---------------------------------------------------------------------------

// Secondo argomento di JSON.parse = reviver: converte i valori mentre legge.
// Esempio: trasformare stringhe ISO in Date (JSON non ha un tipo Date nativo).
interface Evento {
  nome: string;
  quando: Date;
}
const rawEvento = '{"nome":"turno","quando":"2026-07-08T08:00:00.000Z"}';
const ev = JSON.parse(rawEvento, (chiave, valore) =>
  chiave === "quando" ? new Date(valore) : valore
) as Evento;
ev.quando.getFullYear(); // => 2026  (ora e' un vero Date)

// ---------------------------------------------------------------------------
// 11) Errori di parse: gestirli sempre
// ---------------------------------------------------------------------------

// JSON.parse lancia SyntaxError su testo malformato -> avvolgere in try/catch.
function parseSafe<T>(testo: string, guard: (v: unknown) => v is T): T | null {
  let raw: unknown;
  try {
    raw = JSON.parse(testo);
  } catch {
    return null; // testo non e' JSON valido
  }
  return guard(raw) ? raw : null; // valido solo se supera il guard
}

const r1 = parseSafe('{"id":1,"nome":"A","badge":"UP-001","ruolo":"Admin"}', isDipendente);
// tipo: Dipendente | null
const r2 = parseSafe("non-json", isDipendente); // => null
const r3 = parseSafe('{"id":1}', isDipendente); // => null (guard fallisce)

// ---------------------------------------------------------------------------
// 12) Tipizzare oggetti "a dizionario" (Record) da JSON
// ---------------------------------------------------------------------------

// Mappa badge -> ruolo, chiavi dinamiche: usa Record<string, T>.
type MappaRuoli = Record<string, Ruolo>;
const mappa = JSON.parse('{"UP-001":"Admin","UP-002":"Operatore"}') as MappaRuoli;
mappa["UP-001"]; // tipo: Ruolo
// Anche qui il cast non valida: per sicurezza itera e controlla con isRuolo.

// ---------------------------------------------------------------------------
// 13) JSON.stringify di union e valori annidati
// ---------------------------------------------------------------------------

// Il tipo si serializza senza perdere struttura; il RITORNO e' sempre string.
const nidificato = {
  reparto: "Produzione",
  dipendenti: [dip, d],
  turnoAttivo: "P4" as Turno,
};
const jsonNidificato = JSON.stringify(nidificato);
// tipo: string

// Round-trip: stringify poi parse -> serve ri-validare (il tipo va riasserito).
const tornaIndietro = JSON.parse(jsonNidificato) as typeof nidificato;
tornaIndietro.turnoAttivo; // tipo: Turno (asserito, non verificato)

// ---------------------------------------------------------------------------
// export dei simboli locali (solo roba definita in questo file)
// ---------------------------------------------------------------------------

export {
  parseAs,
  parseDipendente,
  parseDipendenti,
  parseSafe,
  isDipendente,
  isTimbratura,
  isRuolo,
  Reparto,
};
export type { Dipendente, Ruolo, Timbratura, Turno, ApiResponse, Risultato, MappaRuoli };

/*
 * ---------------------------------------------------------------------------
 * RIEPILOGO COMANDI / CONCETTI
 * ---------------------------------------------------------------------------
 * - JSON.parse(testo) ritorna 'any': non fidarsi, tipizzare o usare 'unknown'.
 * - const x: T = JSON.parse(...) e JSON.parse(...) as T = ASSERZIONI, non validano.
 * - parseAs<T>(): wrapper con firma migliore, ma resta un cast.
 * - JSON.stringify(v) -> string; (v, replacer) whitelist o funzione; (v, null, 2) pretty.
 * - undefined/funzioni vengono OMESSI da stringify.
 * - metodo toJSON() personalizza la serializzazione (nasconde campi privati).
 * - ApiResponse<T> / Risultato<T> (union discriminata) per tipizzare le response.
 * - 'unknown' e' 'any' sicuro: obbliga al narrowing prima dell'accesso.
 * - type guard 'v is T': valida la forma a runtime e informa il compiler.
 * - Array.isArray(v) && v.every(guard) per validare le collezioni.
 * - regex per formati: /^UP-\d{3}$/ badge, /^\d{2}:\d{2}$/ orario "HH:MM".
 * - reviver in JSON.parse(testo, fn) per convertire valori (es. string ISO -> Date).
 * - JSON.parse lancia SyntaxError: avvolgere sempre in try/catch (vedi parseSafe).
 * - Record<string, T> per oggetti a chiavi dinamiche letti da JSON.
 * - Regola d'oro: al confine (I/O di rete) usa 'unknown' + guard, non 'any'.
 * ---------------------------------------------------------------------------
 */
