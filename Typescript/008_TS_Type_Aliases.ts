/**
 * 008 - TYPE ALIAS: definire e comporre tipi con `type`
 * Sezione: Fundamentals
 *
 * Un TYPE ALIAS assegna un NOME a un tipo qualsiasi (primitivo, unione,
 * oggetto, tupla, funzione, generico). Non crea un nuovo tipo a runtime:
 * e' solo un alias leggibile e riusabile che il compilatore espande.
 * In questo file usiamo il dominio ERP Polyuretech (badge UP-001, turni
 * P4/P2, Dipendente/Timbratura/Reparto, orari "HH:MM") come esempi reali.
 */

// =============================================================================
// 1. ALIAS DI TIPI PRIMITIVI E SEMPLICI
// =============================================================================

// Un alias puo' rinominare un primitivo: utile per dare SIGNIFICATO al dato.
type Minuti = number;      // tipo: number
type CodiceBadge = string; // tipo: string (formato "SIGLA-NNN", es. "UP-001")
type OrarioHHMM = string;  // tipo: string (formato "HH:MM", es. "08:00")

const pausaPranzo: Minuti = 60;         // => 60
const badgeCapo: CodiceBadge = "UP-001"; // => "UP-001"
const ingressoTurno: OrarioHHMM = "08:00";

// Nota: sono alias, NON tipi distinti: Minuti e number sono intercambiabili.
const sommaMinuti: number = pausaPranzo; // ok, nessun errore

// =============================================================================
// 2. ALIAS DI UNION TYPE (il caso piu' comune)
// =============================================================================

// I ruoli utente del gestionale, come unione di stringhe letterali.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

const ruoloCorrente: Ruolo = "Operatore"; // ok
// ERRORE TS: "Ospite" non e' assegnabile a Ruolo
// const ruoloErrato: Ruolo = "Ospite";

// Stati di una richiesta di permesso.
type StatoRichiesta = "In attesa" | "Approvato" | "Rifiutato";

// Union mista di tipi diversi: un id puo' essere numerico o stringa.
type Identificativo = number | string;
const idA: Identificativo = 42;      // => 42
const idB: Identificativo = "UP-001"; // => "UP-001"

// Acronimi dei turni di produzione.
type AcronimoTurno = "P4" | "P2" | "STD";

// =============================================================================
// 3. ALIAS DI TIPI OGGETTO
// =============================================================================

// Il classico: descrivere la forma di un oggetto di dominio.
type Reparto = {
  id: number;
  nome: string;         // valore enum TipologiaDipendente, es. "Colatura"
  sigla: string;        // 2-4 lettere -> genera il badge
  label: string | null; // nullable, non optional
  attivo: boolean;
};

const repartoColatura: Reparto = {
  id: 1,
  nome: "Colatura",
  sigla: "CO",
  label: null,
  attivo: true,
};

// `?` rende la proprieta' OPTIONAL (puo' mancare del tutto).
// `| null` la rende NULLABLE (deve esserci, ma puo' valere null).
type Turno = {
  id?: number | string;   // optional: puo' mancare
  nome: string;
  acronimo?: AcronimoTurno;
  ingresso: OrarioHHMM;    // "08:00"
  uscita: OrarioHHMM;      // "17:00"
  attivo: boolean;
  pausaMinuti?: Minuti;    // optional
};

const turnoP4: Turno = {
  nome: "Produzione mattino",
  acronimo: "P4",
  ingresso: "08:00",
  uscita: "17:00",
  attivo: true,
  pausaMinuti: 60,
};

// =============================================================================
// 4. COMPORRE ALIAS: INTERSECTION (&)
// =============================================================================

// Intersection: unisce le proprieta' di piu' tipi in uno solo.
type ConTimestamp = {
  creatoIl: string;   // ISO "AAAA-MM-GG"
  aggiornatoIl: string;
};

type ConId = {
  id: number;
};

// Un Reparto "tracciato" ha tutte le proprieta' di Reparto + i timestamp + id.
type RepartoTracciato = Reparto & ConTimestamp & ConId;

const repartoUfficio: RepartoTracciato = {
  id: 16,
  nome: "Ufficio_Informatico",
  sigla: "UI",
  label: "Informatica",
  attivo: true,
  creatoIl: "2026-01-10",
  aggiornatoIl: "2026-07-08",
};

// =============================================================================
// 5. COMPORRE ALIAS: EXTENDING VIA INTERSECTION
// =============================================================================

// Un alias base riusato per costruirne altri, aggiungendo campi.
type PersonaBase = {
  nome: string;
  cognome: string;
  email: string;
};

// Il Dipendente estende PersonaBase con i campi anagrafici del gestionale.
type Dipendente = PersonaBase & {
  id: number;
  codiceBadge: CodiceBadge; // "UP-001"
  emailPersonale: string | null;
  dataNascita: string | null; // ISO "AAAA-MM-GG"
  archiviato: boolean;
  ruolo: Ruolo;
  tipologia: string;          // reparto
};

const capoTurno: Dipendente = {
  id: 1,
  codiceBadge: "UP-001",
  nome: "Mario",
  cognome: "Rossi",
  email: "mario.rossi@polyuretech.com",
  emailPersonale: null,
  dataNascita: "1985-03-12",
  archiviato: false,
  ruolo: "Operatore",
  tipologia: "Ufficio_produzione",
};

// =============================================================================
// 6. ALIAS DI TUPLE
// =============================================================================

// Una tupla ha lunghezza fissa e tipi per posizione.
type IntervalloOrario = [inizio: OrarioHHMM, fine: OrarioHHMM];
const fasciaMattino: IntervalloOrario = ["08:00", "12:00"]; // => ["08:00","12:00"]

// Coppia badge/ore lavorate, utile per report.
type RigaReport = [badge: CodiceBadge, oreLavorate: number];
const riga: RigaReport = ["UP-001", 7.5]; // => ["UP-001", 7.5]

// =============================================================================
// 7. ALIAS DI TIPI FUNZIONE
// =============================================================================

// Un alias puo' nominare la firma di una funzione: ottimo per callback e API.
type Validatore = (valore: string) => boolean;

// Riusiamo la regex reale del dominio per validare "HH:MM".
const isOrarioValido: Validatore = (v) => /^\d{2}:\d{2}$/.test(v);
const check1 = isOrarioValido("08:30"); // => true
const check2 = isOrarioValido("8:30");  // => false

// Alias di funzione con piu' parametri.
type Convertitore = (valore: string) => number | null;

const timeStringToMinutes: Convertitore = (value) => {
  const text = String(value ?? "").trim();
  if (!/^\d{2}:\d{2}$/.test(text)) return null;
  const [h, m] = text.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};
const minuti = timeStringToMinutes("08:30"); // tipo: number | null  => 510

// =============================================================================
// 8. TYPE ALIAS GENERICI
// =============================================================================

// Un alias parametrizzato da un tipo <T>: riusabile con qualsiasi contenuto.
type Risposta<T> = {
  ok: boolean;
  dati: T;
  messaggio: string | null;
};

const rispostaDip: Risposta<Dipendente> = {
  ok: true,
  dati: capoTurno,
  messaggio: null,
}; // dati e' tipizzato come Dipendente

const rispostaLista: Risposta<Reparto[]> = {
  ok: true,
  dati: [repartoColatura],
  messaggio: "1 reparto",
};

// Alias generico con valore di default per il parametro di tipo.
type Elenco<T = string> = {
  totale: number;
  elementi: T[];
};
const badges: Elenco = { totale: 1, elementi: ["UP-001"] };        // T = string
const numeri: Elenco<number> = { totale: 2, elementi: [7, 8] };    // T = number

// Firma di una fetch tipizzata: mostra il pattern apiGet<T>() (declare = finto).
declare function apiGet<T>(url: string): Promise<Risposta<T>>;
async function caricaDipendenti(): Promise<Dipendente[]> {
  const risposta = await apiGet<Dipendente[]>("/api/dipendenti");
  return risposta.dati; // tipo: Dipendente[]
}
void caricaDipendenti;

// =============================================================================
// 9. DISCRIMINATED UNION CON TYPE ALIAS
// =============================================================================

// Union di oggetti con un campo discriminante ("acronimo"): il narrowing
// su quel campo restringe automaticamente il tipo. Sostituisce i controlli
// stringly-typed su P2/P4 con qualcosa di type-safe.
type TurnoP4 = { acronimo: "P4"; ingresso: OrarioHHMM; uscitaPranzo: OrarioHHMM; uscita: OrarioHHMM };
type TurnoP2 = { acronimo: "P2"; ingresso: OrarioHHMM; uscita: OrarioHHMM };
type TurnoDiscriminato = TurnoP4 | TurnoP2;

function descriviTurno(t: TurnoDiscriminato): string {
  switch (t.acronimo) {
    case "P4":
      // qui t e' ristretto a TurnoP4: uscitaPranzo esiste
      return `P4 con pausa pranzo alle ${t.uscitaPranzo}`;
    case "P2":
      // qui t e' ristretto a TurnoP2: uscitaPranzo NON esiste
      return `P2 continuato ${t.ingresso}-${t.uscita}`;
  }
}
const testoTurno = descriviTurno({ acronimo: "P2", ingresso: "08:00", uscita: "16:00" });

// =============================================================================
// 10. ALIAS RICORSIVI
// =============================================================================

// Un alias puo' riferirsi a se stesso: utile per strutture ad albero o JSON.
type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [chiave: string]: Json };

const configReparto: Json = {
  sigla: "CO",
  attivo: true,
  turni: ["P4", "P2"],
  soglie: { straordinarioMin: 30 },
}; // tipo: Json (valido e ricorsivo)

// =============================================================================
// 11. TYPE vs INTERFACE (differenza pratica)
// =============================================================================

// Con `type` puoi nominare QUALSIASI tipo (union, tupla, primitivo).
// Con `interface` solo forme oggetto, ma sfrutti la dichiarazione multipla.
interface DipendenteIntf {
  id: number;
  codiceBadge: string;
}
// interface: dichiarazioni successive si FONDONO (declaration merging)
interface DipendenteIntf {
  ruolo: Ruolo;
}
const dipIntf: DipendenteIntf = { id: 2, codiceBadge: "UI-001", ruolo: "Admin" };

// I type alias NON si fondono: due `type Foo` con lo stesso nome darebbero
// ERRORE TS: Duplicate identifier 'DipendenteAlias'.
type DipendenteAlias = { id: number; codiceBadge: string };
// ERRORE TS: Duplicate identifier -> non si puo' ridichiarare:
// type DipendenteAlias = { ruolo: Ruolo };
const dipAlias: DipendenteAlias = { id: 3, codiceBadge: "CO-003" };

// =============================================================================
// 12. ESEMPIO BROWSER (DOM) - non eseguito, solo compilato
// =============================================================================

// Esempio browser: alias per un handler di eventi tipico della UI badge.
type ClickHandler = (evento: MouseEvent) => void;

// Esempio browser: funzione NON chiamata, cosi' non tocca il DOM a runtime.
function collegaPulsanteTimbra(handler: ClickHandler): void {
  const bottone = document.querySelector<HTMLButtonElement>("#timbra");
  if (bottone) {
    bottone.addEventListener("click", handler);
  }
}
void collegaPulsanteTimbra;

// =============================================================================
// 13. EXPORT DI UN TYPE ALIAS (nello stesso file)
// =============================================================================

// Si puo' esportare un alias per riusarlo altrove: qui esportiamo simboli
// definiti IN QUESTO stesso file (nessun import da altri file del corso).
export type { Dipendente, Reparto, Turno, Ruolo, StatoRichiesta };
export { timeStringToMinutes };

// =============================================================================
// RIEPILOGO COMANDI / CONCETTI
// =============================================================================
/*
  - type Nome = ...            -> crea un ALIAS (nessun tipo runtime, solo nome).
  - Alias di primitivi         -> danno significato (type Minuti = number).
  - Union                      -> type Ruolo = "Admin" | "Operatore".
  - Oggetto                    -> type Reparto = { id: number; ... }.
  - `?` optional vs `| null`   -> puo' mancare vs deve esserci ma nullo.
  - Intersection &             -> A & B unisce le proprieta'.
  - Extending via &            -> type Dipendente = PersonaBase & { ... }.
  - Tuple                      -> type Intervallo = [OrarioHHMM, OrarioHHMM].
  - Funzione                   -> type Validatore = (v: string) => boolean.
  - Generici                   -> type Risposta<T> = { dati: T; ... }.
  - Default generico           -> type Elenco<T = string>.
  - Discriminated union        -> switch sul campo discriminante (narrowing).
  - Ricorsivi                  -> type Json = ... | Json[] | { [k]: Json }.
  - type vs interface          -> type = qualsiasi tipo; interface = merging.
  - export type { ... }        -> esporta gli alias per riusarli.
  - Errori intenzionali        -> lasciati COMMENTATI con "// ERRORE TS:".
*/
