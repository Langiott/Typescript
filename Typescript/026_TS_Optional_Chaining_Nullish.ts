/**
 * File 026 - Optional Chaining & Nullish
 * Corso TypeScript - livello FUNDAMENTALS.
 * Argomento: optional chaining (?., ?.[], ?.()) e nullish coalescing (??),
 * differenza tra ?? e ||, catene sicure su strutture annidate
 * (es. dipendente?.reparto?.nome) e default sicuri nel dominio ERP.
 * Tutti i termini tecnici sono in inglese; testo senza lettere accentate.
 */

export {}; // isola lo scope del modulo (evita collisioni di simboli globali)

// ============================================================
// 1) Perche' esiste l'optional chaining
// ============================================================

// Senza optional chaining, accedere a proprieta' annidate su valori
// potenzialmente null/undefined richiede molti controlli manuali.

interface Reparto {
  id: number;
  nome: string;
  responsabile?: Dipendente; // optional: puo' mancare
}

interface Dipendente {
  id: number;
  nome: string;
  badge: string;              // formato "UP-001"
  reparto?: Reparto;          // optional: un dipendente puo' non avere reparto
}

// Modo VECCHIO (verboso e fragile):
function nomeRepartoVecchio(d: Dipendente): string {
  if (d && d.reparto && d.reparto.nome) {
    return d.reparto.nome;
  }
  return "N/D";
}

// Modo MODERNO con optional chaining: se un anello della catena e'
// null/undefined, l'intera espressione vale undefined (short-circuit).
function nomeRepartoModerno(d: Dipendente): string {
  return d.reparto?.nome ?? "N/D";
}

// ============================================================
// 2) L'operatore ?. (optional chaining su proprieta')
// ============================================================

const d1: Dipendente = { id: 1, nome: "Anna", badge: "UP-001" };

const nomeRep1 = d1.reparto?.nome; // tipo: string | undefined
// => undefined (d1 non ha reparto, la catena corto-circuita)

const d2: Dipendente = {
  id: 2,
  nome: "Bruno",
  badge: "UP-002",
  reparto: { id: 10, nome: "Estrusione" },
};

const nomeRep2 = d2.reparto?.nome; // tipo: string | undefined
// => "Estrusione"

// NOTA sul type: ?. aggiunge sempre 'undefined' al type risultante,
// anche quando la proprieta' finale non e' optional.
const idRep = d2.reparto?.id; // tipo: number | undefined

// ============================================================
// 3) Catene profonde: dipendente?.reparto?.nome
// ============================================================

// Ogni ?. protegge SOLO l'anello immediatamente a sinistra del punto.
// Se reparto e' undefined, l'accesso a .responsabile viene saltato.
function nomeResponsabile(d: Dipendente): string | undefined {
  return d.reparto?.responsabile?.nome;
  // tipo: string | undefined
}

const d3: Dipendente = {
  id: 3,
  nome: "Carla",
  badge: "UP-003",
  reparto: {
    id: 20,
    nome: "Verniciatura",
    responsabile: { id: 99, nome: "Dario", badge: "UP-099" },
  },
};

const capo = nomeResponsabile(d3); // => "Dario"
const capoAssente = nomeResponsabile(d1); // => undefined (nessun reparto)

// ============================================================
// 4) ?.[] optional chaining su accesso con indice / chiave dinamica
// ============================================================

// Utile per array o per accesso via variabile chiave.
interface Turno {
  codice: "P4" | "P2" | "STD";
  orari: string[]; // orari naive-UTC "HH:MM"
}

const turno: Turno | undefined = { codice: "P4", orari: ["06:00", "14:00"] };

const primoOrario = turno?.orari[0]; // tipo: string | undefined
// => "06:00"

// ?.[] serve quando anche il contenitore puo' essere assente:
const orariMap: Record<string, string[]> | undefined = {
  "UP-001": ["08:00", "17:00"],
};
const chiave = "UP-001";
const orariBadge = orariMap?.[chiave]; // tipo: string[] | undefined
// => ["08:00", "17:00"]

const orariMancanti = orariMap?.["UP-999"]; // => undefined (chiave assente)

// Attenzione: ?. su array protegge l'array, NON l'elemento.
// turno?.orari[10] e' string | undefined per ?., ma a runtime
// orari[10] e' undefined se l'indice non esiste (type dice comunque string).

// ============================================================
// 5) ?.() optional chaining su chiamata di funzione
// ============================================================

// Se il metodo/callback puo' non esistere, ?.() lo chiama solo se presente.
interface LoggerErp {
  info?: (msg: string) => void; // metodo optional
}

function registra(log: LoggerErp | undefined, msg: string): void {
  log?.info?.(msg);
  // Chiama info SOLO se log esiste E info e' definito.
  // Se log e' undefined -> non chiama nulla, ritorna undefined.
}

registra(undefined, "test");                 // nessuna chiamata, nessun crash
registra({}, "test");                         // info assente: skip
registra({ info: (m) => void m }, "attivo");  // info presente: chiamata

// ?.() e' utile anche per callback optional passati come parametro.
function timbra(
  onOk?: (badge: string) => void,
): void {
  const badge = "UP-001";
  onOk?.(badge); // invoca solo se il callback e' stato fornito
}

// ============================================================
// 6) ?? (nullish coalescing) vs || (logical OR)
// ============================================================

// ?? restituisce il lato destro SOLO se il sinistro e' null o undefined.
// || restituisce il lato destro per qualsiasi valore FALSY
// (0, "", NaN, false oltre a null/undefined) -> spesso un bug.

const conteggioTimbrature: number = 0;

const conNullish = conteggioTimbrature ?? 10; // => 0  (0 NON e' nullish)
const conOr = conteggioTimbrature || 10;      // => 10 (0 e' falsy!) BUG tipico

const nomeVuoto: string = "";
const labelNullish = nomeVuoto ?? "Anonimo"; // => ""       (stringa vuota valida)
const labelOr = nomeVuoto || "Anonimo";      // => "Anonimo" (scarta "")

// Regola pratica ERP: per numeri (ore, conteggi) e stringhe che possono
// legittimamente essere 0 o "", usa ?? per non perdere valori validi.

// ============================================================
// 7) Combinare optional chaining e ?? per default sicuri
// ============================================================

// Pattern canonico: catena?.prop ?? valoreDefault
function nomeRepartoSicuro(d: Dipendente): string {
  return d.reparto?.nome ?? "Senza reparto";
  // tipo di ritorno: string (undefined eliminato dal ??)
}

// Il ?? "chiude" il type: string | undefined diventa string.
const rep1 = nomeRepartoSicuro(d1); // => "Senza reparto"
const rep3 = nomeRepartoSicuro(d3); // => "Verniciatura"

// Default su numero: durata turno in ore, 0 orari -> 0 fasce valide.
function numeroFasce(t?: Turno): number {
  return t?.orari.length ?? 0; // tipo: number
}
const fasce = numeroFasce(turno);    // => 2
const fasceVuote = numeroFasce(undefined); // => 0

// ============================================================
// 8) ?. dentro condizioni e narrowing
// ============================================================

// Confrontare una catena optional funziona bene con ===.
function haReparto(d: Dipendente): boolean {
  return d.reparto?.id !== undefined; // true se reparto presente
}

// Narrowing: dopo un controllo, il compiler restringe il type.
function stampaBadgeCapo(d: Dipendente): void {
  const capoBadge = d.reparto?.responsabile?.badge; // string | undefined
  if (capoBadge !== undefined) {
    // qui capoBadge e' string (narrowed)
    const valido = /^UP-\d{3}$/.test(capoBadge); // tipo: boolean
    void valido;
  }
}

// ============================================================
// 9) ?? con assegnazione: l'operatore ??=
// ============================================================

// ??= assegna il default SOLO se la variabile e' null/undefined.
interface Config {
  turnoDefault?: "P4" | "P2" | "STD";
}

function normalizzaConfig(c: Config): Required<Config> {
  c.turnoDefault ??= "STD"; // se assente -> "STD", altrimenti invariato
  return { turnoDefault: c.turnoDefault };
}
const cfg = normalizzaConfig({}); // => { turnoDefault: "STD" }
const cfg2 = normalizzaConfig({ turnoDefault: "P4" }); // => { turnoDefault: "P4" }

// Confronto: ||= e &&= esistono ma seguono la logica falsy/truthy.
let contatore = 0;
contatore ||= 5; // => 5  (0 e' falsy) -- spesso indesiderato
let contatore2 = 0;
contatore2 ??= 5; // => 0  (0 non e' nullish) -- preserva lo zero

// ============================================================
// 10) Errori comuni (mostrati come commento, il file compila)
// ============================================================

// ?. NON rende assegnabile la catena: non puoi scrivere su un anello optional.
// ERRORE TS: The left-hand side of an assignment expression may not be
//            an optional property access.
// d1.reparto?.nome = "X";

// Non puoi usare il risultato string|undefined dove serve string puro.
// ERRORE TS: Type 'string | undefined' is not assignable to type 'string'.
// const solo: string = d1.reparto?.nome;
const solo: string = d1.reparto?.nome ?? "N/D"; // corretto con ??

// Precedenza: ?? non si mescola con || / && senza parentesi.
// ERRORE TS: '??' and '||' cannot be mixed without parentheses.
// const x = a || b ?? c;
// Corretto: const x = (a || b) ?? c;

// ============================================================
// 11) Esempio ERP completo: costruire una riga di report
// ============================================================

interface RigaReport {
  badge: string;
  reparto: string;
  responsabile: string;
  fasce: number;
}

function costruisciRiga(d: Dipendente, t?: Turno): RigaReport {
  return {
    badge: d.badge ?? "UP-000",
    reparto: d.reparto?.nome ?? "Senza reparto",
    responsabile: d.reparto?.responsabile?.nome ?? "N/D",
    fasce: t?.orari.length ?? 0,
  };
}

const riga = costruisciRiga(d3, turno);
// => { badge: "UP-003", reparto: "Verniciatura",
//      responsabile: "Dario", fasce: 2 }

const rigaMinima = costruisciRiga(d1, undefined);
// => { badge: "UP-001", reparto: "Senza reparto",
//      responsabile: "N/D", fasce: 0 }

export type { Dipendente, Reparto, Turno, RigaReport };
export { nomeRepartoSicuro, costruisciRiga, numeroFasce };

/*
============================================================
RIEPILOGO COMANDI / CONCETTI
============================================================
- ?.            : accesso a proprieta' sicuro; short-circuit a undefined.
- ?.[chiave]    : accesso a indice/chiave dinamica sicuro (array, Record).
- ?.()          : chiamata di funzione/metodo solo se esiste.
- catena a?.b?.c: ogni ?. protegge l'anello alla sua sinistra.
- Il type con ?. include SEMPRE undefined nel risultato.
- ??            : default solo se il sinistro e' null/undefined.
- ||            : default per QUALSIASI falsy (0, "", false, NaN) -> rischio bug.
- ?? chiude il type: string | undefined -> string dopo ?? default.
- ??=           : assegna default solo se null/undefined (preserva 0 e "").
- ||= / &&=     : varianti falsy/truthy, usare con cautela.
- Non si assegna a una catena optional (LHS non ammesso).
- ?? non si mescola con || / && senza parentesi esplicite.
- Pattern ERP:  d.reparto?.nome ?? "Senza reparto"  per default sicuri.
============================================================
*/
