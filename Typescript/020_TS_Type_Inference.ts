/**
 * File 020 - Type Inference (Inferenza dei tipi)
 * Corso TypeScript - Livello FUNDAMENTALS.
 * TypeScript deduce ("inferisce") i type senza annotazioni esplicite:
 * dalle variabili, dal valore di ritorno, dal contesto (contextual typing).
 * Qui vediamo: inference di variabili, best common type, contextual typing,
 * widening/narrowing, inference del return e la regola su QUANDO annotare.
 * Dominio: ERP Polyuretech (Dipendente, Timbratura, Reparto, Turno, ruoli).
 */

// ============================================================
// 1. INFERENZA DI BASE SULLE VARIABILI
// ============================================================

// Con 'let'/'const' TS deduce il type dal valore iniziale: non serve annotare.
let nomeReparto = "Produzione"; // tipo inferito: string
let numeroDipendenti = 42;      // tipo inferito: number
let reparoAttivo = true;        // tipo inferito: boolean

// ERRORE TS: 'nomeReparto' e' string, non accetta un number.
// nomeReparto = 99; // Type 'number' is not assignable to type 'string'.

// Senza inizializzatore il type diventa 'any' (implicito): da evitare in strict.
// ERRORE TS: Variable 'x' implicitly has type 'any' in some locations...
// let x;
// x = 1; x = "due";

// ============================================================
// 2. WIDENING: const vs let (literal type vs type largo)
// ============================================================

// 'const' su un literal produce un literal type (non allargato / non "widened").
const turnoFisso = "P4"; // tipo: "P4" (literal type), NON string
// 'let' allarga (widening) il literal al type di base.
let turnoVariabile = "P4"; // tipo: string

// Utile: const con literal si usa per costruire union precise.
const badgePrefix = "UP-"; // tipo: "UP-"

// Widening dei null/undefined: in strict restano stretti se annoti, altrimenti allargano.
let valoreIniziale = null; // tipo: any (widening di null senza annotazione)
valoreIniziale = 5;

// ============================================================
// 3. BEST COMMON TYPE (inferenza su array e valori multipli)
// ============================================================

// TS calcola il "best common type" degli elementi dell'array.
const numeri = [1, 2, 3]; // tipo: number[]
const misti = [1, "due", 3]; // tipo: (string | number)[] -> union dei tipi

// Union di literal quando gli elementi sono compatibili ma diversi.
const orari = ["08:00", "12:30", "17:00"]; // tipo: string[]

// Best common type con oggetti: prende la union delle forme.
const record = [{ id: 1 }, { id: 2, nota: "ok" }];
// tipo: ({ id: number; nota?: undefined } | { id: number; nota: string })[]

// Se non esiste un supertype comune, TS produce la union (non un any).
const eterogeneo = [true, "P2", 10]; // tipo: (string | number | boolean)[]

// ============================================================
// 4. INFERENZA DEL RETURN TYPE DELLE FUNZIONI
// ============================================================

// TS deduce il return type dal corpo: qui inferisce 'number'.
function sommaOre(a: number, b: number) {
  return a + b; // return type inferito: number
}

// Return type inferito come union quando ci sono piu' rami.
function statoBadge(valido: boolean) {
  if (valido) return "attivo";
  return null;
} // return type inferito: "attivo" | null

// Return 'void' inferito quando non c'e' return con valore.
function logTimbratura(msg: string) {
  console.log(msg);
} // return type inferito: void

// Inference con oggetto di ritorno: la forma viene dedotta.
function creaDipendente(id: number, nome: string) {
  return { id, nome, attivo: true };
} // return type: { id: number; nome: string; attivo: boolean }

const d1 = creaDipendente(1, "Rossi");
// d1.attivo // tipo: boolean

// ============================================================
// 5. CONTEXTUAL TYPING (inferenza dal contesto)
// ============================================================

// Il contesto (il type atteso) informa i parametri del callback: non serve annotare.
const badges = ["UP-001", "UP-002", "UP-003"];
badges.forEach((b) => {
  // 'b' inferito come string dal contesto di string[]
  console.log(b.toUpperCase());
});

// map: il return del callback determina il type dell'array risultato.
const lunghezze = badges.map((b) => b.length); // tipo: number[]

// Contextual typing su una function assegnata a un type di function.
type Validatore = (valore: string) => boolean;
// 'v' e' inferito string, return boolean, grazie al type Validatore atteso.
const isBadge: Validatore = (v) => /^UP-\d{3}$/.test(v);

// Event handler (Esempio browser): il parametro e' inferito dal type dell'evento.
// Esempio browser - non viene eseguito qui.
function esempioHandler() {
  document.addEventListener("click", (e) => {
    // 'e' inferito come MouseEvent dal contesto di addEventListener
    console.log(e.clientX);
  });
}
void esempioHandler; // referenziata per evitare "unused", mai chiamata

// ============================================================
// 6. NARROWING (restringere il type nei rami di codice)
// ============================================================

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// typeof narrowing: dentro il ramo, il type e' ristretto.
function descrivi(valore: string | number) {
  if (typeof valore === "string") {
    // qui 'valore' e' string
    return valore.trim();
  }
  // qui 'valore' e' number (narrowed per esclusione)
  return valore.toFixed(2);
}

// Narrowing con controllo di null (truthiness).
function nomeOrDefault(nome: string | null) {
  if (nome) {
    return nome; // qui 'nome' e' string
  }
  return "Sconosciuto";
}

// Narrowing di union di literal con confronto diretto.
function puoAmministrare(ruolo: Ruolo) {
  // ristretto per uguaglianza: TS sa quali literal restano
  return ruolo === "SuperAdmin" || ruolo === "Admin";
}

// Narrowing con 'in' operator su union di oggetti.
interface Entrata { tipo: "entrata"; ora: string }
interface Uscita { tipo: "uscita"; ora: string; motivo: string }
type Timbratura = Entrata | Uscita;

function descriviTimbratura(t: Timbratura) {
  // discriminated union: il campo 'tipo' guida il narrowing
  if (t.tipo === "uscita") {
    // qui 't' e' Uscita: 'motivo' e' accessibile
    return `Uscita ${t.ora} (${t.motivo})`;
  }
  // qui 't' e' Entrata
  return `Entrata ${t.ora}`;
}

// ============================================================
// 7. CONST ASSERTION (as const) per bloccare il widening
// ============================================================

// Senza 'as const' l'oggetto ha type largo (string, number...).
const turnoLargo = { codice: "P4", ore: 6 };
// tipo: { codice: string; ore: number }

// Con 'as const' i valori diventano literal e tutto readonly.
const turnoStretto = { codice: "P4", ore: 6 } as const;
// tipo: { readonly codice: "P4"; readonly ore: 6 }

// ERRORE TS: proprieta' readonly, non riassegnabile.
// turnoStretto.ore = 8; // Cannot assign to 'ore' because it is a read-only property.

// as const su array -> tuple readonly di literal, utile per union derivate.
const turniValidi = ["P4", "P2", "STD"] as const;
// tipo: readonly ["P4", "P2", "STD"]
type Turno = (typeof turniValidi)[number]; // tipo: "P4" | "P2" | "STD"

const turnoScelto: Turno = "P2"; // ok
// ERRORE TS: "P9" non e' un Turno valido.
// const turnoErrato: Turno = "P9";

// ============================================================
// 8. INFERENZA E DEFAULT DEI PARAMETRI
// ============================================================

// Un default value fa inferire il type del parametro.
function conSeparatore(ora: string, sep = ":") {
  // 'sep' inferito string dal default; return inferito string
  return ora.split(sep).join(sep);
}
void conSeparatore("08:00");

// Parametro opzionale: il type diventa 'string | undefined'.
function saluta(nome?: string) {
  // 'nome' e' string | undefined -> serve narrowing
  return nome ? `Ciao ${nome}` : "Ciao";
}
void saluta;

// ============================================================
// 9. QUANDO ANNOTARE (e quando lasciar fare all'inference)
// ============================================================

// REGOLA: NON annotare quando l'inference e' gia' precisa e leggibile.
const oreLavorate = 8; // ovvio: lasciare inferire number

// SI' annotare il type di ritorno di function pubbliche/esportate:
// documenta il contratto e blocca regressioni accidentali.
function calcolaStraordinario(ore: number): number {
  return Math.max(0, ore - 8);
}

// SI' annotare quando l'inference sarebbe troppo larga o sbagliata.
// Senza annotazione questo array sarebbe string[]; noi vogliamo la union.
const ruoliAmmessi: Ruolo[] = ["Admin", "Operatore"];

// SI' annotare i parametri di function (non c'e' contesto da cui inferire).
function validaOra(ora: string): boolean {
  return /^\d{2}:\d{2}$/.test(ora);
}
void validaOra("12:30");

// SI' annotare per catturare errori a monte (type esplicito sulla variabile).
let contatore: number = 0;
contatore += 1;
// ERRORE TS: bloccato dall'annotazione esplicita.
// contatore = "molti";

// ============================================================
// 10. INFERENZA CON GENERICS (accenno)
// ============================================================

// Il type parameter T viene inferito dall'argomento passato.
function primo<T>(arr: T[]): T | undefined {
  return arr[0];
}
const p1 = primo([10, 20, 30]); // T inferito number -> tipo: number | undefined
const p2 = primo(["UP-001", "UP-002"]); // T inferito string -> string | undefined
void p1;
void p2;

// L'inference sceglie il best common type anche per il type parameter.
const p3 = primo([1, "due"]); // T inferito string | number
void p3;

// ============================================================
// 11. ESEMPIO ERP COMPLETO (mette insieme i concetti)
// ============================================================

interface Dipendente {
  id: number;
  nome: string;
  badge: string; // pattern "UP-001"
  ruolo: Ruolo;
}

// Return type inferito: la forma dell'oggetto costruito.
function riepilogo(dip: Dipendente, timbrature: Timbratura[]) {
  const entrate = timbrature.filter((t) => t.tipo === "entrata"); // Timbratura[]
  const totale = timbrature.length; // number
  return {
    chi: dip.nome,
    ruolo: dip.ruolo,
    entrate: entrate.length,
    totale,
  };
} // return: { chi: string; ruolo: Ruolo; entrate: number; totale: number }

const esempioDip: Dipendente = {
  id: 1,
  nome: "Bianchi",
  badge: "UP-007",
  ruolo: "Operatore",
};
const esempioTimb: Timbratura[] = [
  { tipo: "entrata", ora: "08:00" },
  { tipo: "uscita", ora: "17:00", motivo: "fine turno" },
];
const r = riepilogo(esempioDip, esempioTimb);
// r.entrate // tipo: number (tutto inferito, nessuna annotazione sul return)
void r;

// ============================================================
// EXPORT (solo simboli locali di questo file)
// ============================================================

export { creaDipendente, riepilogo, validaOra, turniValidi };
export type { Ruolo, Turno, Timbratura, Dipendente, Validatore };

// ============================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================
/*
  - Inference variabili: TS deduce il type dal valore iniziale.
  - Senza inizializzatore + strict -> implicit 'any' (errore): annota.
  - Widening: 'let x = "P4"' -> string ; 'const x = "P4"' -> "P4" (literal).
  - Best common type: array/valori multipli -> union o supertype comune.
  - Return inference: dedotto dal corpo (number, void, union, oggetto...).
  - Contextual typing: parametri di callback inferiti dal contesto atteso.
  - Narrowing: typeof / truthiness / '===' / 'in' / discriminated union.
  - Discriminated union: campo comune (es. 'tipo') guida il narrowing.
  - as const: blocca widening -> literal + readonly (utile per union derivate).
  - (typeof arr)[number]: deriva una union di literal da un array 'as const'.
  - Default parametro -> inferisce il type del parametro.
  - Parametro '?' -> 'T | undefined': richiede narrowing.
  - Generics: il type parameter T e' inferito dagli argomenti (best common type).
  - QUANDO annotare: return di API pubbliche, parametri di function, quando
    l'inference e' troppo larga/errata, o per bloccare regressioni.
  - QUANDO NON annotare: inference gia' precisa e leggibile (evita rumore).
*/
