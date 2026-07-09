/**
 * 009 - TypeScript Interfaces (Fundamentals)
 * Argomento: Interface: dichiarazione, extends, metodi, index signature.
 * Un'interface descrive la FORMA (shape) di un oggetto: proprieta', metodi,
 * proprieta' opzionali e readonly, firme di chiamata e index signature.
 * Vedremo anche extends (ereditarieta' multipla), declaration merging e
 * la differenza pratica con i type alias, usando il dominio ERP Polyuretech.
 */

// ============================================================================
// 1) DICHIARAZIONE DI BASE
// ============================================================================

// Un'interface elenca le proprieta' e i loro tipi.
interface Reparto {
  id: number;
  nome: string;   // valore enum TipologiaDipendente, es. "Colatura"
  sigla: string;  // 2-4 lettere per il badge, es. "UP"
  attivo: boolean;
}

// Si usa come annotazione di tipo su una variabile/oggetto.
const colatura: Reparto = {
  id: 1,
  nome: "Colatura",
  sigla: "CO",
  attivo: true,
};
// colatura.nome -> tipo: string  // => "Colatura"

// ERRORE TS: proprieta' mancante -> Property 'attivo' is missing
// const repartoRotto: Reparto = { id: 2, nome: "Finitura_Imballaggio", sigla: "FI" };

// ERRORE TS: proprieta' in eccesso (excess property check sui literal)
// const repartoExtra: Reparto = { id: 3, nome: "Collaudo", sigla: "CL", attivo: true, colore: "rosso" };

// ============================================================================
// 2) PROPRIETA' OPZIONALI (?) E READONLY
// ============================================================================

// `?` rende la proprieta' opzionale; `readonly` la rende immutabile dopo l'init.
interface Turno {
  readonly id: number;     // non riassegnabile
  nome: string;
  acronimo?: "P4" | "P2" | "STD"; // opzionale: puo' mancare
  ingresso: string;        // "08:00"
  uscita: string;          // "17:00"
  pausaMinuti?: number;    // opzionale
}

const turnoP4: Turno = {
  id: 10,
  nome: "Produzione mattino",
  acronimo: "P4",
  ingresso: "08:00",
  uscita: "17:00",
  pausaMinuti: 60,
};

// acronimo puo' essere undefined se non fornito: tipo "P4" | "P2" | "STD" | undefined
const acr = turnoP4.acronimo; // tipo: "P4" | "P2" | "STD" | undefined

// ERRORE TS: Cannot assign to 'id' because it is a read-only property
// turnoP4.id = 99;

// ============================================================================
// 3) METODI: firme di metodo e proprieta'-funzione
// ============================================================================

// Un'interface puo' dichiarare metodi in due stili equivalenti nella pratica.
interface CalcolatoreOre {
  // stile "method shorthand"
  minutiPrevisti(turno: Turno): number;
  // stile "property con funzione"
  descrivi: (turno: Turno) => string;
}

const calcolatore: CalcolatoreOre = {
  minutiPrevisti(turno) {
    // narrowing su acronimo opzionale
    const pausa = turno.pausaMinuti ?? 0;
    return 8 * 60 - pausa; // esempio semplificato
  },
  descrivi: (turno) => `${turno.nome} (${turno.acronimo ?? "STD"})`,
};

const previsti = calcolatore.minutiPrevisti(turnoP4); // tipo: number  // => 420
const testo = calcolatore.descrivi(turnoP4);          // tipo: string  // => "Produzione mattino (P4)"

// ============================================================================
// 4) EXTENDS: un'interface eredita da un'altra
// ============================================================================

interface EntitaBase {
  id: number;
  archiviato: boolean;
}

// Ruolo del dominio ERP.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Dipendente estende EntitaBase: eredita id e archiviato, e aggiunge campi.
interface Dipendente extends EntitaBase {
  codiceBadge: string;          // "UP-001"
  nome: string;
  cognome: string;
  email: string;
  emailPersonale: string | null;
  ruolo: Ruolo;
  tipologia: string;            // reparto
}

const dip1: Dipendente = {
  id: 1,
  archiviato: false,
  codiceBadge: "UP-001",
  nome: "Mario",
  cognome: "Rossi",
  email: "mario.rossi@polyuretech.com",
  emailPersonale: null,
  ruolo: "Operatore",
  tipologia: "Ufficio_produzione",
};
// dip1.archiviato -> ereditato da EntitaBase, tipo: boolean

// ============================================================================
// 5) EXTENDS MULTIPLO: comporre piu' interface
// ============================================================================

interface ConTimestamp {
  creatoIl: string;   // ISO "AAAA-MM-GG"
  aggiornatoIl: string;
}

interface ConAutore {
  autoreBadge: string; // "UI-001"
}

// Un'interface puo' estendere PIU' interface contemporaneamente.
interface RigaAudit extends ConTimestamp, ConAutore {
  messaggio: string;
}

const audit1: RigaAudit = {
  creatoIl: "2026-07-08",
  aggiornatoIl: "2026-07-08",
  autoreBadge: "UI-001",
  messaggio: "Timbratura corretta manualmente",
};
// audit1 ha tutte le proprieta' delle tre interface unite.

// ============================================================================
// 6) INDEX SIGNATURE: chiavi dinamiche
// ============================================================================

// Quando le chiavi non sono note in anticipo si usa un index signature.
// Qui: mappa da codiceBadge (string) al numero di ore lavorate.
interface OrePerBadge {
  [codiceBadge: string]: number;
}

const oreGiornata: OrePerBadge = {
  "UP-001": 7.5,
  "UI-001": 8,
  "CO-003": 6.25,
};
const oreUP = oreGiornata["UP-001"]; // tipo: number  // => 7.5

// Index signature + proprieta' fisse: le fisse devono essere compatibili col tipo dell'index.
interface ContatoriReparto {
  totale: number;                 // proprieta' fissa
  [nomeReparto: string]: number;  // chiavi dinamiche, stesso tipo number
}
const contatori: ContatoriReparto = { totale: 42, Colatura: 12, Collaudo: 30 };
// contatori["Colatura"] -> tipo: number  // => 12

// Index signature numerico (utile per strutture tipo array/mappa per id).
interface DipendentiPerId {
  [id: number]: Dipendente;
}
const registro: DipendentiPerId = { 1: dip1 };
// registro[1] -> tipo: Dipendente

// ============================================================================
// 7) FIRME DI CHIAMATA E DI COSTRUZIONE (call / construct signatures)
// ============================================================================

// Un'interface puo' descrivere una FUNZIONE tramite una call signature.
interface Validatore {
  (valore: string): boolean;          // call signature
  descrizione: string;                // le funzioni sono oggetti: possono avere proprieta'
}

const orarioRegex = /^\d{2}:\d{2}$/;
const validaOrario: Validatore = Object.assign(
  (valore: string) => orarioRegex.test(valore),
  { descrizione: "Valida formato HH:MM" }
);
const okOrario = validaOrario("08:30");     // tipo: boolean  // => true
const koOrario = validaOrario("8:30");      // tipo: boolean  // => false
// validaOrario.descrizione -> tipo: string  // => "Valida formato HH:MM"

// Construct signature: descrive un costruttore (new ...).
interface CostruttoreErrore {
  new (messaggio: string): Error;
}
function creaErrore(Ctor: CostruttoreErrore, msg: string): Error {
  return new Ctor(msg);
}
const err = creaErrore(Error, "Badge non valido"); // tipo: Error

// ============================================================================
// 8) INTERFACCE GENERICHE
// ============================================================================

// Un'interface puo' avere parametri di tipo (generics).
interface Risposta<T> {
  ok: boolean;
  dati: T;
  messaggio?: string;
}

// Risposta specializzata per una lista di dipendenti.
const rispDipendenti: Risposta<Dipendente[]> = {
  ok: true,
  dati: [dip1],
};
// rispDipendenti.dati -> tipo: Dipendente[]

// Interface con method generico (il tipo si risolve alla chiamata).
interface RepositoryLettura {
  trovaPerId<T extends EntitaBase>(elenco: T[], id: number): T | undefined;
}
const repo: RepositoryLettura = {
  trovaPerId(elenco, id) {
    return elenco.find((e) => e.id === id);
  },
};
const trovato = repo.trovaPerId([dip1], 1); // tipo: Dipendente | undefined

// ============================================================================
// 9) DECLARATION MERGING (peculiarita' delle interface)
// ============================================================================

// A differenza dei type alias, due interface con lo STESSO nome si FONDONO.
interface ConfigApp {
  baseUrl: string;
}
interface ConfigApp {
  timeoutMs: number; // aggiunta alla stessa interface
}
// Ora ConfigApp richiede ENTRAMBE le proprieta'.
const config: ConfigApp = { baseUrl: "https://polytools.polyuretech.net", timeoutMs: 5000 };
// config -> { baseUrl: string; timeoutMs: number }

// ============================================================================
// 10) INTERFACE vs TYPE (quando usare cosa)
// ============================================================================

// Un type alias puo' descrivere la stessa shape...
type StatoRichiesta = "In attesa" | "Approvato" | "Rifiutato"; // union: solo type
interface RichiestaPermesso {
  id: number;
  dipendenteBadge: string; // "UP-001"
  stato: StatoRichiesta;
}
const richiesta: RichiestaPermesso = { id: 1, dipendenteBadge: "UP-001", stato: "In attesa" };

// Nota didattica:
// - interface: shape di oggetti/classi, extends, declaration merging.
// - type: union, intersection, tuple, mapped/conditional type, alias di primitivi.
// ERRORE TS: un type NON puo' fare merging -> Duplicate identifier 'StatoRichiesta'
// type StatoRichiesta = "Altro";

// ============================================================================
// 11) IMPLEMENTS: una classe implementa un'interface
// ============================================================================

interface GeneratoreBadge {
  genera(sigla: string, progressivo: number): string;
}

class GeneratoreBadgeStandard implements GeneratoreBadge {
  genera(sigla: string, progressivo: number): string {
    const nnn = String(progressivo).padStart(3, "0");
    return `${sigla.toUpperCase()}-${nnn}`; // "UP-001"
  }
}
const gen = new GeneratoreBadgeStandard();
const nuovoBadge = gen.genera("up", 1); // tipo: string  // => "UP-001"

// ============================================================================
// 12) INTERFACCE ED API DEL BROWSER (non eseguite)
// ============================================================================

// Esempio browser: un'interface che descrive un elemento del DOM lato UI.
// La funzione NON viene chiamata, quindi non tocca il runtime; compila comunque.
interface BadgeElement {
  testo: string;
  render(target: HTMLElement): void;
}
function montaBadge(badge: BadgeElement): void {
  // Esempio browser
  const div = document.createElement("div");
  div.textContent = badge.testo;
  badge.render(div);
}
void montaBadge; // riferimento per evitare confusione; non invocata

// ============================================================================
// 13) MODULI: export di simboli definiti IN QUESTO FILE
// ============================================================================

// Si possono esportare interface e valori definiti qui (nessun import esterno).
export type { Dipendente, Turno, RichiestaPermesso };
export { GeneratoreBadgeStandard };

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
/*
- interface Nome { prop: tipo }            -> descrive la shape di un oggetto
- prop?: tipo                              -> proprieta' opzionale (tipo | undefined)
- readonly prop                            -> non riassegnabile dopo l'init
- metodo(a): T  /  metodo: (a) => T        -> due stili per i metodi
- interface B extends A                     -> ereditarieta' (anche multipla: extends A, B)
- [chiave: string]: T                      -> index signature (chiavi dinamiche)
  * le proprieta' fisse devono essere compatibili col tipo dell'index
- (a: X): Y                                -> call signature (interface come funzione)
- new (a: X): Y                            -> construct signature (costruttore)
- interface I<T> { ... }                   -> interface generica
- metodo<T>(...)                           -> metodo generico (risolto alla chiamata)
- declaration merging                      -> interface con stesso nome si fondono (type NO)
- class C implements I                     -> la classe deve rispettare la shape di I
- interface vs type:
  * interface -> oggetti/classi, extends, merging
  * type      -> union, intersection, tuple, mapped/conditional, alias primitivi
- export type { ... } / export { ... }     -> esporta simboli definiti nello stesso file
*/
