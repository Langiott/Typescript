/**
 * File 025 - null & undefined (strictNullChecks)
 * Corso TypeScript - livello FUNDAMENTALS.
 * Argomento: la gestione di null e undefined con la option strictNullChecks.
 * Vediamo la differenza tra null e undefined, i union type T | null,
 * il narrowing con i controlli, la definite assignment assertion,
 * e la differenza tra proprieta' opzionale (?) e proprieta' | undefined.
 * Tutti gli esempi sono in dominio ERP Polyuretech (Dipendente, Timbratura, ecc.).
 */

// ============================================================
// 1. Cosa fa strictNullChecks
// ============================================================

// Con strictNullChecks=ON (attivo dentro --strict), null e undefined
// NON sono piu' assegnabili a qualunque type: hanno il loro type dedicato.
// Senza strict, questo sarebbe legale ma pericoloso (crash a runtime).

let nomeDipendente: string = "Mario";
// ERRORE TS: Type 'null' is not assignable to type 'string'.
// nomeDipendente = null;
// ERRORE TS: Type 'undefined' is not assignable to type 'string'.
// nomeDipendente = undefined;

// Per permettere null bisogna dichiararlo esplicitamente nel type.
let badge: string | null = "UP-001";
badge = null; // ok: il type include null

// ============================================================
// 2. Differenza semantica tra null e undefined
// ============================================================

// undefined: "valore non ancora assegnato / assente per default".
// null:      "valore assente in modo intenzionale, deciso dal codice".
// Sono due type distinti: 'null' e 'undefined'.

let orarioEntrata: string | undefined; // non inizializzato
console.log(orarioEntrata); // => undefined

let orarioUscita: string | null = null; // volutamente vuoto
console.log(orarioUscita); // => null

// typeof si comporta in modo storico e "strano" su null:
console.log(typeof undefined); // => "undefined"
console.log(typeof null); // => "object"  (bug storico di JS)

// ============================================================
// 3. Il type T | null e il narrowing con i controlli
// ============================================================

// Una funzione che cerca un Dipendente puo' non trovarlo: torna T | null.
interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
}

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

const elenco: Dipendente[] = [
  { id: 1, nome: "Mario", badge: "UP-001", ruolo: "Operatore" },
  { id: 2, nome: "Lucia", badge: "UP-002", ruolo: "Admin" },
];

// Ritorna Dipendente | null: null se non esiste.
function trovaPerId(id: number): Dipendente | null {
  const trovato = elenco.find((d) => d.id === id);
  return trovato ?? null; // find torna Dipendente | undefined -> normalizziamo a null
}

const d1 = trovaPerId(1);
// tipo di d1: Dipendente | null
// ERRORE TS: 'd1' is possibly 'null'.
// console.log(d1.nome);

// Narrowing con un controllo esplicito: dentro l'if, d1 e' Dipendente.
if (d1 !== null) {
  console.log(d1.nome); // qui tipo: Dipendente
}

// Narrowing con truthy check (attenzione: esclude anche "" e 0 se fossero nel type).
if (d1) {
  console.log(d1.badge); // qui tipo: Dipendente
}

// ============================================================
// 4. Optional chaining ?. e nullish coalescing ??
// ============================================================

// ?. corto-circuita a undefined se la parte a sinistra e' null/undefined.
const d2 = trovaPerId(999); // null (non esiste)
console.log(d2?.nome); // => undefined  (non lancia errore)
// tipo di (d2?.nome): string | undefined

// ?? fornisce un fallback SOLO per null/undefined (non per "" o 0).
const nomeSicuro = d2?.nome ?? "sconosciuto";
console.log(nomeSicuro); // => "sconosciuto"   tipo: string

// Differenza tra ?? e ||:
const contaTimbrature = 0;
console.log(contaTimbrature || 10); // => 10  (0 e' falsy, viene scartato!)
console.log(contaTimbrature ?? 10); // => 0   (0 non e' null/undefined: si tiene)

// ============================================================
// 5. Proprieta' opzionale (?) vs proprieta' | undefined
// ============================================================

// Proprieta' opzionale: la chiave puo' MANCARE del tutto.
interface TimbraturaOpz {
  entrata: string; // "HH:MM"
  uscita?: string; // opzionale: puo' non esserci la chiave
}

// Valida: la chiave 'uscita' e' del tutto assente.
const t1: TimbraturaOpz = { entrata: "08:00" };
// Valida: presente con valore.
const t2: TimbraturaOpz = { entrata: "08:00", uscita: "17:00" };

// Proprieta' con union | undefined: la chiave DEVE essere presente,
// ma il suo valore puo' essere undefined.
interface TimbraturaUnion {
  entrata: string;
  uscita: string | undefined; // la chiave e' obbligatoria
}

// ERRORE TS: Property 'uscita' is missing.
// const t3: TimbraturaUnion = { entrata: "08:00" };
// Valida: devo scrivere la chiave, anche se il valore e' undefined.
const t4: TimbraturaUnion = { entrata: "08:00", uscita: undefined };

// Nota: con exactOptionalPropertyTypes le due forme divergono di piu';
// qui restiamo al comportamento standard di --strict.

// Il tipo di t1.uscita e' string | undefined in entrambi i casi.
console.log(t1.uscita); // => undefined
console.log(t4.uscita); // => undefined

// ============================================================
// 6. Definite assignment assertion (! sulla dichiarazione)
// ============================================================

// A volte sappiamo che una variabile verra' inizializzata prima dell'uso,
// ma il compiler non riesce a dimostrarlo. Il suffisso ! sopprime il check.

let repartoCorrente!: string; // "definite assignment assertion"

function inizializzaReparto(): void {
  repartoCorrente = "Verniciatura";
}

inizializzaReparto();
console.log(repartoCorrente.toUpperCase()); // => "VERNICIATURA"

// Attenzione: e' una PROMESSA al compiler. Se non inizializzi, crash a runtime.

// Stessa idea sulle proprieta' di classe.
class GestoreTurni {
  turnoAttivo!: Turno; // ! : promettiamo di settarlo prima dell'uso

  constructor() {
    this.carica();
  }

  carica(): void {
    this.turnoAttivo = "P4";
  }
}

type Turno = "P4" | "P2" | "STD";

const g = new GestoreTurni();
console.log(g.turnoAttivo); // => "P4"

// ============================================================
// 7. Non-null assertion (! sull'espressione)
// ============================================================

// L'operatore ! dopo un'espressione dice "fidati, non e' null/undefined".
// Rimuove null e undefined dal type. Usare con parsimonia.

const forseDip: Dipendente | null = trovaPerId(2);
const dipSicuro = forseDip!; // tipo: Dipendente (null rimosso a forza)
console.log(dipSicuro.nome); // => "Lucia"

// Se ci sbagliamo, il ! non protegge: sarebbe un crash a runtime.
// Meglio un vero narrowing con if quando possibile.

// ============================================================
// 8. null/undefined nei parametri e nei valori di ritorno
// ============================================================

// Parametro opzionale -> il suo type include undefined.
function saluta(nome?: string): string {
  // nome: string | undefined
  return "Ciao " + (nome ?? "collega");
}
console.log(saluta()); // => "Ciao collega"
console.log(saluta("Mario")); // => "Ciao Mario"

// Parametro con default: dentro la funzione il type e' gia' string (no undefined).
function salutaDefault(nome: string = "collega"): string {
  // nome: string  (il default rimuove undefined)
  return "Ciao " + nome.toUpperCase();
}
console.log(salutaDefault()); // => "Ciao COLLEGA"

// Ritorno T | null: forza il chiamante a gestire l'assenza.
function orarioEntrataDi(id: number): string | null {
  const dip = trovaPerId(id);
  if (dip === null) return null;
  return "08:00"; // esempio statico
}

const o = orarioEntrataDi(1);
if (o !== null) {
  console.log(o); // tipo: string  => "08:00"
}

// ============================================================
// 9. Validazione con narrowing (pattern ERP)
// ============================================================

const RE_ORARIO = /^\d{2}:\d{2}$/;
const RE_BADGE = /^UP-\d{3}$/;

// Torna string valida oppure null se il formato e' sbagliato.
function normalizzaOrario(input: string | null | undefined): string | null {
  if (input == null) return null; // == null cattura SIA null SIA undefined
  if (!RE_ORARIO.test(input)) return null;
  return input;
}

console.log(normalizzaOrario("08:30")); // => "08:30"
console.log(normalizzaOrario("8:30")); // => null (formato errato)
console.log(normalizzaOrario(null)); // => null
console.log(normalizzaOrario(undefined)); // => null

// Nota sul trucco '== null': l'uguaglianza lasca (==) e' l'UNICO caso
// in cui usare == e' idiomatico: matcha esattamente null e undefined.

// Type guard che valida un badge e restringe il type.
function isBadgeValido(x: string | null): x is string {
  return x !== null && RE_BADGE.test(x);
}

const b: string | null = "UP-007";
if (isBadgeValido(b)) {
  console.log(b.length); // qui tipo: string  => 6
}

// ============================================================
// 10. Il type 'never' e l'esaurimento con null
// ============================================================

// Dopo aver escluso tutti i casi, il residuo puo' diventare never.
function descriviValore(v: string | null | undefined): string {
  if (typeof v === "string") return "stringa: " + v;
  if (v === null) return "e' null";
  // qui v: undefined
  return "e' undefined";
}
console.log(descriviValore("ciao")); // => "stringa: ciao"
console.log(descriviValore(null)); // => "e' null"
console.log(descriviValore(undefined)); // => "e' undefined"

// ============================================================
// 11. Esempio browser (NON eseguito qui)
// ============================================================

// Esempio browser: querySelector torna Element | null, va sempre controllato.
function esempioDom(): void {
  const el = document.querySelector("#badge"); // Element | null
  // ERRORE TS: 'el' is possibly 'null'.
  // el.textContent = "UP-001";
  if (el !== null) {
    el.textContent = "UP-001"; // qui tipo: Element
  }
}
void esempioDom; // riferita ma non eseguita

// ============================================================
// Export di simboli locali (solo di questo file)
// ============================================================

export { trovaPerId, normalizzaOrario, isBadgeValido, saluta };
export type { Dipendente, Ruolo, Turno, TimbraturaOpz, TimbraturaUnion };

/*
 * ============================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================
 * - strictNullChecks: null/undefined non assegnabili ovunque; hanno type propri.
 * - null    -> assenza intenzionale; undefined -> non inizializzato/assente.
 * - typeof null === "object" (bug storico); typeof undefined === "undefined".
 * - T | null / T | undefined: dichiarare esplicitamente l'assenza nel type.
 * - Narrowing: if (x !== null), if (x), typeof, per restringere il type.
 * - ?.  optional chaining -> corto-circuita a undefined.
 * - ??  nullish coalescing -> fallback solo per null/undefined (NON per 0/"").
 * - || vs ??: || scarta ogni falsy (0, "", false); ?? solo null/undefined.
 * - Proprieta' opzionale (k?: T): la chiave puo' mancare.
 * - Proprieta' k: T | undefined: chiave obbligatoria, valore puo' essere undefined.
 * - let x!: T -> definite assignment assertion (promessa di init).
 * - espr! -> non-null assertion (rimuove null/undefined dal type, a rischio tuo).
 * - Parametro opzionale (nome?) include undefined; default (= "..") lo rimuove.
 * - == null cattura sia null sia undefined (unico uso idiomatico di ==).
 * - Type guard 'x is T' per validare e restringere (badge, orario).
 * - document.querySelector -> Element | null: controllare sempre.
 */
