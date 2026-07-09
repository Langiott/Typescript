/**
 * File 024 - Discriminated Unions (Fundamentals)
 * Le discriminated unions (dette anche tagged unions) sono union type in cui
 * ogni membro condivide un campo comune "discriminante" (tag/kind) con valore
 * literal diverso. Il compiler usa quel campo per fare narrowing automatico e,
 * con switch/if, riesce a distinguere in modo sicuro ogni variante.
 * Vedremo: campo discriminante, switch, esempio Evento timbratura e la
 * verifica di esaustivita' (exhaustiveness check) con il type "never".
 */

// ---------------------------------------------------------------------------
// 1) IL PROBLEMA: union "piatta" senza discriminante
// ---------------------------------------------------------------------------

// Con questa union NON sappiamo quale forma abbiamo davvero: i campi sono tutti
// opzionali e il compiler non puo' aiutarci a distinguere i casi.
interface CerchioVago {
  raggio?: number;
  lato?: number;
}
function areaVaga(f: CerchioVago): number {
  // Dobbiamo controllare a mano l'esistenza dei campi: fragile e prolisso.
  if (f.raggio !== undefined) return Math.PI * f.raggio ** 2;
  if (f.lato !== undefined) return f.lato ** 2;
  return 0;
}
// => calcolo possibile ma senza garanzie: nulla vieta { raggio: 1, lato: 2 }

// ---------------------------------------------------------------------------
// 2) LA SOLUZIONE: campo discriminante "kind" con literal type
// ---------------------------------------------------------------------------

// Ogni variante ha un campo "kind" con un literal DIVERSO. E' questa la chiave.
interface Cerchio {
  kind: "cerchio"; // literal type discriminante
  raggio: number;
}
interface Quadrato {
  kind: "quadrato";
  lato: number;
}
interface Rettangolo {
  kind: "rettangolo";
  base: number;
  altezza: number;
}
// La discriminated union e' l'unione delle varianti.
type Forma = Cerchio | Quadrato | Rettangolo;

// Dentro un if sul campo kind, il compiler fa narrowing al tipo esatto.
function area(f: Forma): number {
  if (f.kind === "cerchio") {
    // qui f e' Cerchio: f.raggio e' accessibile, f.lato NO
    return Math.PI * f.raggio ** 2;
  }
  if (f.kind === "quadrato") {
    return f.lato ** 2; // f e' Quadrato
  }
  // qui f e' Rettangolo per esclusione
  return f.base * f.altezza;
}
// => area({ kind: "cerchio", raggio: 2 }) vale ~12.566

// ---------------------------------------------------------------------------
// 3) SWITCH sul discriminante: forma idiomatica
// ---------------------------------------------------------------------------

// Lo switch sul campo kind e' il pattern piu' leggibile per le union.
function nomeForma(f: Forma): string {
  switch (f.kind) {
    case "cerchio":
      return `cerchio r=${f.raggio}`; // f: Cerchio
    case "quadrato":
      return `quadrato l=${f.lato}`; // f: Quadrato
    case "rettangolo":
      return `rettangolo ${f.base}x${f.altezza}`; // f: Rettangolo
  }
}
// => nomeForma({ kind: "quadrato", lato: 3 }) === "quadrato l=3"

// ---------------------------------------------------------------------------
// 4) ESEMPIO DOMINIO ERP: Evento di timbratura { kind: "entrata" | "uscita" }
// ---------------------------------------------------------------------------

// Ruoli del sistema come union di literal (usato piu' avanti).
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Gli orari sono stringhe naive-UTC nel formato "HH:MM".
type OrarioHHMM = string; // vincolo runtime via regex /^\d{2}:\d{2}$/

// Ogni evento condivide il discriminante "kind".
interface EventoEntrata {
  kind: "entrata";
  badge: string; // es. "UP-001"
  orario: OrarioHHMM; // es. "08:30"
}
interface EventoUscita {
  kind: "uscita";
  badge: string;
  orario: OrarioHHMM;
  // Solo l'uscita puo' avere una nota di fine turno.
  notaFineTurno?: string;
}
// Discriminated union della timbratura.
type EventoTimbratura = EventoEntrata | EventoUscita;

// Narrowing sicuro: la nota esiste solo nel ramo "uscita".
function descriviEvento(e: EventoTimbratura): string {
  switch (e.kind) {
    case "entrata":
      return `Entrata ${e.badge} alle ${e.orario}`;
    case "uscita": {
      const nota = e.notaFineTurno ? ` (${e.notaFineTurno})` : "";
      return `Uscita ${e.badge} alle ${e.orario}${nota}`;
    }
  }
}
// => descriviEvento({ kind: "entrata", badge: "UP-001", orario: "08:30" })
//    === "Entrata UP-001 alle 08:30"

// ERRORE TS: accedere a un campo di un'altra variante non compila.
function noteVietata(e: EventoTimbratura): void {
  // if (e.kind === "entrata") { console.log(e.notaFineTurno); }
  // ERRORE TS: Property 'notaFineTurno' does not exist on type 'EventoEntrata'.
  void e;
}

// ---------------------------------------------------------------------------
// 5) VALIDAZIONE con le regex del dominio (badge e orario)
// ---------------------------------------------------------------------------

const RE_BADGE = /^UP-\d{3}$/; // "UP-001"
const RE_ORARIO = /^\d{2}:\d{2}$/; // "08:30"

// Costruisce un evento valido oppure lancia: il tipo di ritorno resta la union.
function creaEvento(
  kind: "entrata" | "uscita",
  badge: string,
  orario: OrarioHHMM,
): EventoTimbratura {
  if (!RE_BADGE.test(badge)) throw new Error(`Badge non valido: ${badge}`);
  if (!RE_ORARIO.test(orario)) throw new Error(`Orario non valido: ${orario}`);
  // Il literal kind fa scegliere al compiler la variante giusta.
  return { kind, badge, orario };
}
// => creaEvento("uscita", "UP-042", "17:00") ha tipo EventoTimbratura

// ---------------------------------------------------------------------------
// 6) ESAUSTIVITA' con "never": il controllo che non dimentica casi
// ---------------------------------------------------------------------------

// Helper: se il codice arriva qui, "x" dovrebbe essere never. Se non lo e',
// significa che manca la gestione di una variante e il compiler segnala.
function assertNever(x: never): never {
  throw new Error(`Caso non gestito: ${JSON.stringify(x)}`);
}

// Switch esaustivo: nel default "e" e' ristretto a never.
function segnoOrario(e: EventoTimbratura): "+" | "-" {
  switch (e.kind) {
    case "entrata":
      return "+";
    case "uscita":
      return "-";
    default:
      // Qui e: never. Se aggiungessimo una variante senza gestirla, ERRORE TS.
      return assertNever(e);
  }
}
// => segnoOrario({ kind: "entrata", ... }) === "+"

// Dimostrazione: aggiungiamo una variante "pausa" a una nuova union.
interface EventoPausa {
  kind: "pausa";
  badge: string;
  minuti: number;
}
type EventoEsteso = EventoTimbratura | EventoPausa;

// Se gestiamo solo entrata/uscita, "pausa" resta e "e" NON e' never nel default.
function segnoEsteso(e: EventoEsteso): string {
  switch (e.kind) {
    case "entrata":
      return "+";
    case "uscita":
      return "-";
    case "pausa":
      return `pausa ${e.minuti}m`; // se togliessimo questo case: ERRORE TS su assertNever
    default:
      return assertNever(e);
  }
}
// => segnoEsteso({ kind: "pausa", badge: "UP-001", minuti: 15 }) === "pausa 15m"

// ERRORE TS (dimostrativo): senza il case "pausa", il default fallisce a compile time.
//   default:
//     return assertNever(e);
//   ERRORE TS: Argument of type 'EventoPausa' is not assignable to parameter of type 'never'.

// ---------------------------------------------------------------------------
// 7) NARROWING con "if/else if" invece dello switch
// ---------------------------------------------------------------------------

// Lo stesso narrowing funziona con catene if/else basate sul discriminante.
function minutiExtra(e: EventoEsteso): number {
  if (e.kind === "entrata") return 0;
  else if (e.kind === "uscita") return 0;
  else return e.minuti; // e: EventoPausa per esclusione
}
// => minutiExtra({ kind: "pausa", badge: "UP-002", minuti: 10 }) === 10

// ---------------------------------------------------------------------------
// 8) DISCRIMINANTE NUMERICO o BOOLEANO (non solo stringhe)
// ---------------------------------------------------------------------------

// Il tag puo' essere anche un number literal.
interface RispostaOk {
  status: 200;
  data: string;
}
interface RispostaErrore {
  status: 404 | 500;
  messaggio: string;
}
type Risposta = RispostaOk | RispostaErrore;

function gestisci(r: Risposta): string {
  switch (r.status) {
    case 200:
      return r.data; // r: RispostaOk
    default:
      return r.messaggio; // r: RispostaErrore
  }
}
// => gestisci({ status: 200, data: "ciao" }) === "ciao"

// Con boolean: campo "ok" come discriminante (pattern Result/Either).
interface Successo<T> {
  ok: true;
  valore: T;
}
interface Fallimento {
  ok: false;
  errore: string;
}
type Result<T> = Successo<T> | Fallimento;

function unwrap<T>(r: Result<T>): T {
  if (r.ok) return r.valore; // r: Successo<T>
  throw new Error(r.errore); // r: Fallimento
}
// => unwrap({ ok: true, valore: 42 }) === 42

// ---------------------------------------------------------------------------
// 9) MAP di handler per variante (alternativa allo switch)
// ---------------------------------------------------------------------------

// Un oggetto che mappa ogni kind a una funzione: tipizzato in modo esaustivo.
type Handlers = {
  [K in EventoTimbratura["kind"]]: (
    e: Extract<EventoTimbratura, { kind: K }>,
  ) => string;
};

const handlers: Handlers = {
  entrata: (e) => `IN ${e.orario}`, // e: EventoEntrata
  uscita: (e) => `OUT ${e.orario}`, // e: EventoUscita
};

function applica(e: EventoTimbratura): string {
  // Il cast e' ristretto dalla mappa: ogni kind chiama il suo handler.
  return (handlers[e.kind] as (x: EventoTimbratura) => string)(e);
}
// => applica({ kind: "uscita", badge: "UP-003", orario: "18:00" }) === "OUT 18:00"

// ---------------------------------------------------------------------------
// 10) ERRORI COMUNI da evitare
// ---------------------------------------------------------------------------

// (a) Dimenticare "kind" rende impossibile il narrowing.
//     type Male = { raggio: number } | { lato: number };
//     Non c'e' un tag comune: il compiler non puo' distinguere in switch.

// (b) Usare "string" al posto di un literal annulla la discriminazione.
//     interface Rotta { kind: string; } // kind non e' un tag utile

// (c) Assegnare un kind sbagliato: ERRORE TS.
//     const x: EventoEntrata = { kind: "uscita", badge: "UP-001", orario: "08:00" };
//     ERRORE TS: Type '"uscita"' is not assignable to type '"entrata"'.

// ---------------------------------------------------------------------------
// Export dei simboli locali (solo tipi/valori definiti in questo file).
// ---------------------------------------------------------------------------
export type {
  Forma,
  EventoTimbratura,
  EventoEntrata,
  EventoUscita,
  EventoEsteso,
  Result,
  Ruolo,
};
export { area, descriviEvento, creaEvento, segnoOrario, segnoEsteso, unwrap };

/*
 * ===========================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ===========================================================================
 * - Discriminated union = union di interface che condividono un campo tag/kind
 *   con literal type DIVERSO per ogni variante.
 * - Il campo discriminante puo' essere string, number o boolean literal.
 * - narrowing: if (x.kind === "...") o switch (x.kind) restringe al tipo esatto.
 * - switch sul discriminante = pattern idiomatico e leggibile.
 * - esaustivita': default -> assertNever(x: never): never garantisce a compile
 *   time che tutte le varianti siano gestite (aggiungerne una senza case = ERRORE TS).
 * - Extract<Union, { kind: K }> estrae la variante con un dato tag.
 * - Result<T> = { ok:true, valore } | { ok:false, errore }: pattern success/fail.
 * - Errori tipici: nessun tag comune, tag di tipo string, kind assegnato errato.
 * - Dominio ERP: EventoTimbratura { kind:"entrata"|"uscita", badge "UP-xxx", orario "HH:MM" }.
 * ===========================================================================
 */
