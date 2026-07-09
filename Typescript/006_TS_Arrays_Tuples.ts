/**
 * 006 - Array e Tuple tipizzati in TypeScript (Fundamentals)
 *
 * In questo file vediamo come tipizzare gli array (T[] e Array<T>), le tuple
 * a lunghezza fissa, le readonly tuple immutabili e le named tuple con
 * etichette leggibili. Usiamo esempi reali dal dominio ERP Polyuretech
 * (badge UP-001, turni P4/P2, orari "HH:MM", ruoli, stati richiesta).
 * Tutti gli esempi che NON devono compilare sono scritti come commento
 * con la nota "// ERRORE TS: ..." cosi' il file resta valido sotto strict.
 */

// =============================================================================
// 1) ARRAY TIPIZZATI: due sintassi equivalenti (T[] e Array<T>)
// =============================================================================

// La sintassi con parentesi quadre: array di stringhe.
const badge: string[] = ["UP-001", "UI-001", "CO-003"];
// tipo: string[]

// La sintassi generica Array<T>: array di numeri (id dipendenti).
const idDipendenti: Array<number> = [1, 2, 3, 7];
// tipo: number[]  (Array<number> e number[] sono identici)

// Array di boolean (flag "presente" per timbrature).
const presenze: boolean[] = [true, false, true];

// TypeScript INFERISCE il tipo dall'inizializzazione: non serve annotare.
const orari = ["08:00", "12:00", "13:00", "17:00"];
// tipo inferito: string[]

// Accesso per indice: il tipo dell'elemento e' quello dell'array.
const primoBadge = badge[0];
// tipo: string  => "UP-001"

// ATTENZIONE: senza "noUncheckedIndexedAccess" l'indice fuori range NON e'
// segnalato dal type checker (a runtime e' undefined). Sotto strict "base"
// il tipo resta string, ma a runtime badge[999] === undefined.
const forseAssente = badge[999];
// tipo: string (ma runtime: undefined) -> occhio!

// ERRORE TS: non puoi mettere un numero in un array di stringhe
// const misto: string[] = ["UP-001", 42];
// ERRORE TS: Type 'number' is not assignable to type 'string'.

// =============================================================================
// 2) ARRAY DI OGGETTI E DI UNION TYPES
// =============================================================================

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type StatoRichiesta = "In attesa" | "Approvato" | "Rifiutato";

// Array di union: solo i valori ammessi dall'union sono accettati.
const ruoliAssegnati: Ruolo[] = ["Admin", "Operatore", "Operatore"];

// ERRORE TS: "Guest" non e' un Ruolo valido
// const ruoliErrati: Ruolo[] = ["Admin", "Guest"];
// ERRORE TS: Type '"Guest"' is not assignable to type 'Ruolo'.

// Array di oggetti: tipizziamo la forma dell'elemento.
type RepartoMinimo = { sigla: string; nome: string; attivo: boolean };

const reparti: RepartoMinimo[] = [
  { sigla: "UP", nome: "Ufficio_produzione", attivo: true },
  { sigla: "UI", nome: "Ufficio_Informatico", attivo: true },
  { sigla: "CO", nome: "Colatura", attivo: false },
];

// Iterazione con inferenza: "r" e' di tipo RepartoMinimo.
const sigleAttive = reparti.filter((r) => r.attivo).map((r) => r.sigla);
// tipo: string[]  => ["UP", "UI"]

// =============================================================================
// 3) METODI DI ARRAY E TIPI INFERITI
// =============================================================================

// map trasforma T[] in U[]: qui number[] -> string[].
const idComeStringhe = idDipendenti.map((id) => `#${id}`);
// tipo: string[]  => ["#1", "#2", "#3", "#7"]

// reduce: accumulatore tipizzato esplicitamente per chiarezza.
const sommaId = idDipendenti.reduce((acc: number, id) => acc + id, 0);
// tipo: number  => 13

// find puo' restituire undefined: il tipo lo riflette (T | undefined).
const trovato = reparti.find((r) => r.sigla === "UP");
// tipo: RepartoMinimo | undefined
const nomeTrovato = trovato?.nome ?? "sconosciuto";
// tipo: string  => "Ufficio_produzione"

// includes come type-narrowing di appartenenza.
const eOperatore = ruoliAssegnati.includes("Operatore");
// tipo: boolean  => true

// =============================================================================
// 4) ARRAY READONLY: immutabilita' a livello di tipo
// =============================================================================

// readonly T[] impedisce mutazioni (push, pop, assegnazione per indice).
const turniAmmessi: readonly string[] = ["P4", "P2", "STD"];
// forma equivalente: ReadonlyArray<string>
const statiAmmessi: ReadonlyArray<StatoRichiesta> = [
  "In attesa",
  "Approvato",
  "Rifiutato",
];

// ERRORE TS: non puoi fare push su un readonly array
// turniAmmessi.push("P8");
// ERRORE TS: Property 'push' does not exist on type 'readonly string[]'.

// ERRORE TS: non puoi assegnare per indice
// turniAmmessi[0] = "X";
// ERRORE TS: Index signature in type 'readonly string[]' only permits reading.

// Leggere va sempre bene.
const primoTurno = turniAmmessi[0];
// tipo: string  => "P4"

// =============================================================================
// 5) TUPLE: array a lunghezza fissa con tipi per posizione
// =============================================================================

// Una tupla fissa i tipi POSIZIONE per posizione e la lunghezza.
// Esempio: intervallo orario [inizio, fine] come coppia di "HH:MM".
type IntervalloOrario = [string, string];
const mattina: IntervalloOrario = ["08:00", "12:00"];
// tipo: [string, string]

const inizio = mattina[0];
// tipo: string  => "08:00"
const fine = mattina[1];
// tipo: string  => "12:00"

// ERRORE TS: la tupla ha esattamente 2 elementi
// const troppi: IntervalloOrario = ["08:00", "12:00", "13:00"];
// ERRORE TS: Source has 3 element(s) but target allows only 2.

// Tupla con tipi eterogenei: [badge, oreLavorate, presente].
type RigaPresenza = [string, number, boolean];
const riga: RigaPresenza = ["UP-001", 7.5, true];
// tipo: [string, number, boolean]

// Destructuring della tupla: i tipi seguono le posizioni.
const [badgeRiga, oreRiga, presenteRiga] = riga;
// badgeRiga: string, oreRiga: number, presenteRiga: boolean

// ERRORE TS: posizione 1 deve essere number, non string
// const rigaErr: RigaPresenza = ["UP-001", "sette", true];
// ERRORE TS: Type 'string' is not assignable to type 'number'.

// =============================================================================
// 6) NAMED TUPLE: etichette per rendere le posizioni leggibili
// =============================================================================

// Le etichette (label) sono solo documentazione: NON cambiano il tipo,
// ma migliorano IntelliSense e leggibilita' (utili nelle firme di funzione).
type Coordinata = [ora: string, minuti: number];
const c: Coordinata = ["08:00", 30];
// tipo: [ora: string, minuti: number]

// Named tuple nella firma di una funzione: i nomi appaiono nei suggerimenti.
function creaTimbratura(dati: [badge: string, ora: string, presente: boolean]) {
  const [b, o, p] = dati;
  return { badge: b, ora: o, presente: p };
}
const t1 = creaTimbratura(["UP-001", "08:00", true]);
// t1: { badge: string; ora: string; presente: boolean }

// Named tuple come tipo di ritorno: valori con significato chiaro.
function splitOrario(hhmm: string): [ore: number, minuti: number] {
  const [h, m] = hhmm.split(":").map(Number);
  return [h ?? 0, m ?? 0];
}
const [oreSplit, minutiSplit] = splitOrario("12:30");
// oreSplit: number => 12, minutiSplit: number => 30

// =============================================================================
// 7) READONLY TUPLE: coppie immutabili
// =============================================================================

// readonly davanti alla tupla la rende immutabile e ne fissa la lunghezza.
type IntervalloBloccato = readonly [string, string];
const pomeriggio: IntervalloBloccato = ["13:00", "17:00"];

// ERRORE TS: non puoi modificare una readonly tuple
// pomeriggio[0] = "14:00";
// ERRORE TS: Cannot assign to '0' because it is a read-only property.

// "as const" produce una readonly tuple con tipi LETTERALI (non widening).
const turnoStandard = ["08:00", "12:00", "13:00", "17:00"] as const;
// tipo: readonly ["08:00", "12:00", "13:00", "17:00"]
const ingressoStd = turnoStandard[0];
// tipo: "08:00"  (letterale, non string)

// Utile per derivare union dai valori: typeof + indice numerico.
const acronimiTurno = ["P4", "P2", "STD"] as const;
type AcronimoTurno = (typeof acronimiTurno)[number];
// tipo: "P4" | "P2" | "STD"
const turnoScelto: AcronimoTurno = "P4";

// ERRORE TS: "P8" non fa parte dell'union derivata
// const turnoNo: AcronimoTurno = "P8";
// ERRORE TS: Type '"P8"' is not assignable to type '"P4" | "P2" | "STD"'.

// =============================================================================
// 8) TUPLE CON ELEMENTI OPZIONALI E REST
// =============================================================================

// Elemento opzionale (?): la tupla puo' avere 2 o 3 elementi.
type TurnoOrari = [ingresso: string, uscita: string, pausaMinuti?: number];
const senzaPausa: TurnoOrari = ["08:00", "16:00"];
const conPausa: TurnoOrari = ["08:00", "17:00", 60];

// Rest element (...T[]): primo fisso, poi N stringhe (es. lista timbrature).
type GiornataTimbrature = [data: string, ...orari: string[]];
const giornata: GiornataTimbrature = ["2026-07-08", "08:00", "12:00", "13:00", "17:00"];
const dataGiornata = giornata[0];
// tipo: string  => "2026-07-08"

// Le tuple con rest sono ottime come parametri variadici tipizzati.
function log(...args: [livello: string, ...messaggi: string[]]): string {
  const [livello, ...messaggi] = args;
  return `[${livello}] ${messaggi.join(" ")}`;
}
const linea = log("INFO", "badge", "UP-001", "timbrato");
// tipo: string  => "[INFO] badge UP-001 timbrato"

// =============================================================================
// 9) TUPLE vs ARRAY: quando usare cosa (esempio pratico ERP)
// =============================================================================

// Array: numero VARIABILE di elementi OMOGENEI (es. molti badge).
const listaBadge: string[] = ["UP-001", "UI-001", "CO-003", "UP-002"];

// Tupla: numero FISSO di elementi con SIGNIFICATO posizionale
// (es. una singola coppia badge->ore, oppure un record "colonnare").
type Record_BadgeOre = [badge: string, ore: number];
const recordOre: Record_BadgeOre = ["UP-001", 7.5];

// Conversione tipica: da array di oggetti a array di tuple (per una tabella).
type Dipendente1 = { codiceBadge: string; nome: string; ruolo: Ruolo };
const dipendenti1: Dipendente1[] = [
  { codiceBadge: "UP-001", nome: "Mario", ruolo: "Operatore" },
  { codiceBadge: "UI-001", nome: "Luca", ruolo: "Admin" },
];
const righeTabella: Array<[string, string, Ruolo]> = dipendenti1.map(
  (d) => [d.codiceBadge, d.nome, d.ruolo]
);
// tipo: [string, string, Ruolo][]

// =============================================================================
// 10) PATTERN REALE: parsing "HH:MM" -> tupla [ore, minuti] tipizzata
// =============================================================================

// Restituiamo una named tuple o null se il formato non e' valido.
function orarioInComponenti(value: string): [ore: number, minuti: number] | null {
  const text = value.trim();
  if (!/^\d{2}:\d{2}$/.test(text)) return null;
  const [h, m] = text.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return [h, m];
}
const comp = orarioInComponenti("12:30");
// tipo: [ore: number, minuti: number] | null
if (comp !== null) {
  // narrowing: dentro l'if "comp" e' la tupla, non null
  const totMinuti = comp[0] * 60 + comp[1];
  // tipo: number  => 750
  void totMinuti;
}

// Estrazione progressivo badge "UP-001" -> tupla [sigla, progressivo].
function splitBadge(codiceBadge: string): [sigla: string, progressivo: string] {
  const match = codiceBadge.match(/^([A-Z]{1,4})-(\d+)$/);
  if (!match) return [codiceBadge, ""];
  return [match[1] ?? "", match[2] ?? ""];
}
const [sigla, progr] = splitBadge("UP-001");
// sigla: string => "UP", progr: string => "001"

// =============================================================================
// 11) ESEMPIO BROWSER (non eseguito: solo per illustrare tuple + DOM)
// =============================================================================

// Esempio browser: usiamo una readonly tuple per una lista di classi CSS.
// La funzione non viene chiamata, ma il file compila (lib DOM attiva).
function evidenziaBadgeUI(): void {
  const classi = ["badge", "badge--attivo"] as const;
  // tipo: readonly ["badge", "badge--attivo"]
  const el = document.querySelector(".badge");
  if (el) el.classList.add(...classi);
}
void evidenziaBadgeUI; // riferita ma non eseguita

// =============================================================================
// 12) EXPORT (simboli definiti in QUESTO stesso file)
// =============================================================================

export type { IntervalloOrario, RigaPresenza, AcronimoTurno };
export { splitOrario, orarioInComponenti, splitBadge };

/*
 * =============================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * =============================================================================
 * - Array:            T[]  oppure  Array<T>  (equivalenti)
 * - Readonly array:   readonly T[]  oppure  ReadonlyArray<T>
 * - Tupla:            [T, U, ...]  lunghezza e tipi fissi per posizione
 * - Named tuple:      [nome: T, altro: U]  etichette = solo leggibilita'
 * - Readonly tuple:   readonly [T, U]  immutabile e a lunghezza fissa
 * - as const:         crea readonly tuple con tipi LETTERALI (no widening)
 * - Union da valori:  (typeof arr)[number]  estrae l'union degli elementi
 * - Opzionale:        [a: T, b?: U]  ultimo/i elementi opzionali
 * - Rest in tupla:    [primo: T, ...resto: U[]]  parametri variadici tipizzati
 * - Destructuring:    const [a, b] = tupla  (tipi seguono le posizioni)
 * - find/[]:          possono dare  T | undefined  (occhio agli indici)
 * - Quando: array = N elementi omogenei; tupla = pochi elementi posizionali
 * =============================================================================
 */
