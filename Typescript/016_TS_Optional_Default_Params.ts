/**
 * File 016 - Optional & Default params (livello INTERMEDIATE)
 * Parametri opzionali con ?, valori di default con =, ordine dei parametri,
 * differenza tra "undefined esplicito" e "argomento mancante", interazione
 * con union type e overload leggero. Dominio ERP Polyuretech (Dipendente,
 * Timbratura, ruoli, badge "UP-001", orari "HH:MM").
 */

// ============================================================================
// 1. PARAMETRI OPZIONALI CON "?"
// ============================================================================
// Il suffisso "?" rende il parametro opzionale: chi chiama puo' ometterlo.
// Il tipo del parametro diventa automaticamente "T | undefined".

function salutaDipendente(nome: string, badge?: string): string {
  // badge ha tipo: string | undefined
  if (badge === undefined) {
    return `Ciao ${nome}`;
  }
  return `Ciao ${nome} (${badge})`;
}

const s1 = salutaDipendente("Mario"); // tipo: string
// => "Ciao Mario"
const s2 = salutaDipendente("Mario", "UP-001"); // tipo: string
// => "Ciao Mario (UP-001)"

// ERRORE TS: un parametro opzionale non puo' precedere uno obbligatorio.
// function errata(badge?: string, nome: string): string { return nome; }
// ERRORE TS: A required parameter cannot follow an optional parameter.

// ============================================================================
// 2. VALORI DI DEFAULT CON "="
// ============================================================================
// Con "= valore" il parametro assume quel valore quando l'argomento manca
// (o quando si passa esplicitamente undefined).

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

function creaEtichetta(nome: string, ruolo: Ruolo = "Operatore"): string {
  // ruolo ha tipo: Ruolo (NON Ruolo | undefined dentro al corpo)
  return `${nome} - ${ruolo}`;
}

const e1 = creaEtichetta("Anna"); // tipo: string
// => "Anna - Operatore"
const e2 = creaEtichetta("Luca", "Admin"); // tipo: string
// => "Luca - Admin"

// Passare undefined esplicito attiva comunque il default:
const e3 = creaEtichetta("Sara", undefined); // tipo: string
// => "Sara - Operatore"

// ============================================================================
// 3. DIFFERENZA TRA "?:" E "= default"
// ============================================================================
// - "badge?: string"        -> dentro la funzione il tipo e' string | undefined
// - "ruolo: Ruolo = 'Op...'" -> dentro la funzione il tipo e' gia' Ruolo
// Entrambi rendono l'argomento omissibile dal lato del chiamante,
// ma solo il default garantisce un valore concreto nel corpo.

function confronto(opz?: number, def: number = 10): number {
  // opz tipo: number | undefined  -> serve un check/coalescing
  // def tipo: number              -> gia' pronto all'uso
  const base = opz ?? 0; // tipo: number
  return base + def;
}

const c1 = confronto(); // => 10
const c2 = confronto(5); // => 15
const c3 = confronto(5, 20); // => 25

// NOTA: un parametro con default NON deve avere anche "?": sarebbe ridondante.
// ERRORE TS: parametro con "?" e default insieme.
// function ridondante(x?: number = 5): number { return x; }
// ERRORE TS: Parameter cannot have question mark and initializer.

// ============================================================================
// 4. ESEMPIO ERP: creaDipendente(nome, badge?, ruolo = "Operatore")
// ============================================================================

interface Dipendente {
  id: number;
  nome: string;
  badge: string | null; // null = badge non ancora assegnato
  ruolo: Ruolo;
}

const badgeRegex = /^UP-\d{3}$/;

let contatoreId = 0;

function creaDipendente(
  nome: string,
  badge?: string,
  ruolo: Ruolo = "Operatore",
): Dipendente {
  // badge tipo: string | undefined
  // ruolo tipo: Ruolo
  let badgeValido: string | null = null;
  if (badge !== undefined) {
    // validazione formato "UP-001"
    badgeValido = badgeRegex.test(badge) ? badge : null;
  }
  contatoreId += 1;
  return { id: contatoreId, nome, badge: badgeValido, ruolo };
}

const d1 = creaDipendente("Mario Rossi");
// => { id: 1, nome: "Mario Rossi", badge: null, ruolo: "Operatore" }
const d2 = creaDipendente("Anna Bianchi", "UP-002");
// => { id: 2, nome: "Anna Bianchi", badge: "UP-002", ruolo: "Operatore" }
const d3 = creaDipendente("Luca Verdi", "UP-003", "Admin");
// => { id: 3, nome: "Luca Verdi", badge: "UP-003", ruolo: "Admin" }
const d4 = creaDipendente("Test Errato", "X-999");
// => badge non conforme -> { ..., badge: null, ruolo: "Operatore" }

// Per specificare solo il ruolo saltando il badge si usa undefined:
const d5 = creaDipendente("Sara Neri", undefined, "QrDisplay");
// => { id: 5, nome: "Sara Neri", badge: null, ruolo: "QrDisplay" }

// ============================================================================
// 5. ESEMPIO ERP: formatOra(h, m = 0)
// ============================================================================
// Produce un orario naive-UTC in formato "HH:MM" (regex /^\d{2}:\d{2}$/).
// Il default m = 0 permette di scrivere solo l'ora piena.

function formatOra(h: number, m: number = 0): string {
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}`; // tipo: string
}

const o1 = formatOra(8); // => "08:00"
const o2 = formatOra(8, 30); // => "08:30"
const o3 = formatOra(17, 5); // => "17:05"
const o4 = formatOra(9, undefined); // => "09:00" (default riattivato)

// ============================================================================
// 6. ORDINE DEI PARAMETRI: obbligatori, poi opzionali/default
// ============================================================================
// Regola: prima i parametri obbligatori, poi quelli opzionali o con default.
// Se un parametro "in mezzo" e' opzionale, per raggiungere quelli successivi
// occorre passare undefined (vedi d5). In alternativa si usa un options object.

interface OpzioniTimbratura {
  reparto?: string; // opzionale
  turno?: "P4" | "P2" | "STD"; // union opzionale
}

function timbra(
  badge: string,
  entrata: string,
  opzioni: OpzioniTimbratura = {},
): string {
  // opzioni tipo: OpzioniTimbratura (mai undefined nel corpo)
  const reparto = opzioni.reparto ?? "N/D"; // tipo: string
  const turno = opzioni.turno ?? "STD"; // tipo: "P4" | "P2" | "STD"
  return `${badge} entrata ${entrata} reparto ${reparto} turno ${turno}`;
}

const t1 = timbra("UP-001", "08:00");
// => "UP-001 entrata 08:00 reparto N/D turno STD"
const t2 = timbra("UP-002", "09:00", { turno: "P4" });
// => "UP-002 entrata 09:00 reparto N/D turno P4"
const t3 = timbra("UP-003", "07:30", { reparto: "Stampaggio", turno: "P2" });
// => "UP-003 entrata 07:30 reparto Stampaggio turno P2"

// ============================================================================
// 7. INTERAZIONE CON UNION TYPE
// ============================================================================
// Un parametro opzionale con union diventa "union | undefined".
// Va gestito con narrowing prima di usarlo come membro della union.

function descriviTurno(turno?: "P4" | "P2" | "STD"): string {
  // turno tipo: "P4" | "P2" | "STD" | undefined
  switch (turno) {
    case "P4":
      return "Turno 4 squadre";
    case "P2":
      return "Turno 2 squadre";
    case "STD":
      return "Turno standard";
    case undefined:
      return "Turno non specificato";
    default: {
      // exhaustiveness check: qui turno ha tipo never
      const _mai: never = turno;
      return _mai;
    }
  }
}

const u1 = descriviTurno(); // => "Turno non specificato"
const u2 = descriviTurno("P4"); // => "Turno 4 squadre"

// Default con union: il valore di default deve appartenere alla union.
function conDefaultUnion(turno: "P4" | "P2" | "STD" = "STD"): string {
  return `Turno: ${turno}`; // turno tipo: "P4" | "P2" | "STD"
}
// ERRORE TS: default fuori dalla union.
// function errUnion(t: "P4" | "P2" = "STD"): string { return t; }
// ERRORE TS: Type '"STD"' is not assignable to type '"P4" | "P2"'.

// ============================================================================
// 8. UNDEFINED vs MANCANTE (dettaglio su oggetti opzionali)
// ============================================================================
// Con "?" su una proprieta', "mancante" e "= undefined" sono equivalenti al
// controllo `=== undefined`, ma differiscono se si usa "in" o Object.keys.

interface ConfigReport {
  titolo: string;
  righe?: number; // proprieta' opzionale
}

function contaChiavi(cfg: ConfigReport): number {
  return Object.keys(cfg).length; // tipo: number
}

const k1 = contaChiavi({ titolo: "Report" }); // => 1 (righe assente)
const k2 = contaChiavi({ titolo: "Report", righe: undefined }); // => 2 (chiave presente)
// Nota: entrambe le config superano `cfg.righe === undefined`, ma
// Object.keys le distingue: "mancante" != "presente ma undefined".

// ============================================================================
// 9. OVERLOAD LEGGERO (firme multiple con implementazione unica)
// ============================================================================
// Gli overload permettono firme diverse per lo stesso nome funzione.
// Le firme di overload NON hanno corpo; l'implementazione le "copre" tutte.

// Firma A: solo badge -> descrizione breve
function scheda(badge: string): string;
// Firma B: badge + dettaglio flag -> descrizione con ruolo
function scheda(badge: string, conRuolo: true, ruolo: Ruolo): string;
// Implementazione (compatibile con entrambe, usa opzionali/default)
function scheda(badge: string, conRuolo: boolean = false, ruolo?: Ruolo): string {
  if (conRuolo && ruolo !== undefined) {
    return `${badge} [${ruolo}]`;
  }
  return badge;
}

const sc1 = scheda("UP-001"); // tipo: string => "UP-001"
const sc2 = scheda("UP-002", true, "Admin"); // tipo: string => "UP-002 [Admin]"
// ERRORE TS: nessuna firma di overload accetta (badge, true) senza ruolo.
// const sc3 = scheda("UP-003", true);
// ERRORE TS: No overload expects 2 arguments, but overloads do exist that
//            expect either 1 or 3 arguments.

// ============================================================================
// 10. VALORI DI DEFAULT CALCOLATI E DIPENDENTI DA ALTRI PARAMETRI
// ============================================================================
// Un default puo' essere un'espressione e puo' riferirsi ai parametri
// dichiarati PRIMA di esso (mai a quelli dopo).

function intervallo(inizio: number, fine: number = inizio + 8): string {
  // fine di default = inizio + 8 (turno di 8 ore)
  return `${formatOra(inizio)} - ${formatOra(fine)}`; // tipo: string
}

const iv1 = intervallo(8); // => "08:00 - 16:00"
const iv2 = intervallo(6, 14); // => "06:00 - 14:00"

// ERRORE TS: default che usa un parametro successivo.
// function errOrdine(a: number = b, b: number): number { return a + b; }
// ERRORE TS: Parameter 'b' is used before its declaration / before initialization.

// ============================================================================
// 11. EXPORT DEI SIMBOLI LOCALI (per riuso in altri file didattici)
// ============================================================================

export {
  salutaDipendente,
  creaEtichetta,
  creaDipendente,
  formatOra,
  timbra,
  descriviTurno,
  scheda,
  intervallo,
};
export type { Dipendente, Ruolo, OpzioniTimbratura, ConfigReport };

// Uso "void" delle costanti per evitare warning noEmit su variabili non lette:
void [
  s1, s2, e1, e2, e3, c1, c2, c3,
  d1, d2, d3, d4, d5,
  o1, o2, o3, o4,
  t1, t2, t3, u1, u2,
  conDefaultUnion, k1, k2, sc1, sc2, iv1, iv2,
];

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
// - "param?: T"      -> parametro opzionale, tipo interno T | undefined
// - "param: T = val" -> valore di default, tipo interno T (mai undefined)
// - Ordine: obbligatori PRIMA, opzionali/default DOPO
// - undefined esplicito attiva il default; "mancante" != "presente/undefined" (Object.keys)
// - "?" + "=" insieme -> ERRORE TS (question mark and initializer)
// - union opzionale -> "union | undefined": narrowing + case undefined
// - default in union deve appartenere alla union
// - options object ({} default) per saltare parametri intermedi
// - default calcolato puo' usare i parametri dichiarati PRIMA
// - overload: piu' firme senza corpo + 1 implementazione con opzionali/default
// - tsc --strict --target ES2022 --lib ES2022,DOM --noEmit per verifica
