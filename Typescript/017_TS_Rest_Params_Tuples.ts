/**
 * File 017 - Rest params & tuples (Rest parameters e Tuple types)
 * Corso TypeScript - livello FUNDAMENTALS.
 * In questo file vediamo i rest parameters (...args), come tipizzarli
 * con array o con tuple, i labeled tuple elements, e lo spread nella
 * chiamata di funzione. Esempi nel dominio ERP Polyuretech (Dipendente,
 * Timbratura, Turno, somma di ore lavorate).
 * Tutto ASCII, niente accenti: si scrive "puo'", "e'", ecc.
 */

// ============================================================
// 1) REST PARAMETERS DI BASE: ...args
// ============================================================

// La funzione raccoglie un numero variabile di argomenti in un array.
// La sintassi ...nome deve essere l'ULTIMO parametro della lista.
function sommaOre(...ore: number[]): number {
  // "ore" qui e' di tipo number[]
  return ore.reduce((acc, o) => acc + o, 0);
}

// Chiamate con quantita' diversa di argomenti:
const totale1 = sommaOre(8, 8, 8, 8, 8); // => 40
const totale2 = sommaOre(4, 4);          // => 8
const totale3 = sommaOre();              // => 0 (zero argomenti e' valido)

// tipo di totale1: number
console.log(totale1, totale2, totale3);

// ERRORE TS: un argomento di tipo sbagliato non compila
// sommaOre(8, "8"); // ERRORE TS: Argument of type 'string' is not assignable to parameter of type 'number'.

// ============================================================
// 2) PARAMETRI FISSI + REST INSIEME
// ============================================================

// I parametri normali vengono prima, il rest raccoglie il resto.
function log(livello: string, ...messaggi: string[]): string {
  return `[${livello}] ${messaggi.join(" ")}`;
}

const riga = log("INFO", "Dipendente", "UP-001", "ha", "timbrato");
// => "[INFO] Dipendente UP-001 ha timbrato"
console.log(riga);

// Il rest puo' anche ricevere zero elementi:
const soloLivello = log("WARN"); // => "[WARN] "
console.log(soloLivello);

// ERRORE TS: il rest deve essere l'ultimo parametro
// function sbagliata(...voci: string[], finale: string) {} // ERRORE TS: A rest parameter must be last in a parameter list.

// ============================================================
// 3) TIPIZZARE IL REST COME TUPLE (non solo array)
// ============================================================

// Un rest parameter puo' essere tipizzato con una TUPLE type: in questo
// modo si fissano numero, ordine e tipo di ciascun argomento.
// Qui la funzione accetta ESATTAMENTE (string, number, boolean).
function registra(...args: [string, number, boolean]): string {
  const [nome, eta, attivo] = args; // destructuring della tuple
  return `${nome} / ${eta} / ${attivo ? "attivo" : "inattivo"}`;
}

const r = registra("Mario", 42, true); // => "Mario / 42 / attivo"
console.log(r);

// ERRORE TS: numero di argomenti sbagliato
// registra("Mario", 42); // ERRORE TS: Expected 3 arguments, but got 2.
// registra("Mario", 42, true, 1); // ERRORE TS: Expected 3 arguments, but got 4.

// ============================================================
// 4) LABELED TUPLE ELEMENTS (etichette leggibili)
// ============================================================

// Le tuple possono avere ETICHETTE (labeled tuple elements): non cambiano
// il tipo, ma migliorano leggibilita' e i suggerimenti dell'editor.
// Utile quando la tuple diventa la firma dei parametri.
type CoordinateTimbratura = [ora: string, minuti: string];

function componiOrario(...t: CoordinateTimbratura): string {
  const [ora, minuti] = t;
  return `${ora}:${minuti}`;
}

const orario = componiOrario("08", "30"); // => "08:30"
console.log(orario);

// Le etichette compaiono anche nei tooltip di una normale firma:
function creaBadge(prefisso: string, numero: number): string {
  // padStart forza 3 cifre: 1 -> "001"
  return `${prefisso}-${String(numero).padStart(3, "0")}`;
}
console.log(creaBadge("UP", 1)); // => "UP-001"

// ============================================================
// 5) TUPLE CON ELEMENTI OPZIONALI E REST INTERNO
// ============================================================

// Una tuple puo' avere elementi OPZIONALI (con ?) e un rest finale.
// Qui: ruolo obbligatorio, reparto opzionale, poi zero o piu' note.
type FirmaUtente = [ruolo: string, reparto?: string, ...note: string[]];

function descriviUtente(...u: FirmaUtente): string {
  const [ruolo, reparto = "N/D", ...note] = u;
  return `${ruolo} @ ${reparto} (${note.length} note)`;
}

console.log(descriviUtente("Admin"));                       // => "Admin @ N/D (0 note)"
console.log(descriviUtente("Operatore", "Stampaggio"));     // => "Operatore @ Stampaggio (0 note)"
console.log(descriviUtente("Operatore", "Stampaggio", "a", "b")); // => "Operatore @ Stampaggio (2 note)"

// ============================================================
// 6) SPREAD NELLA CHIAMATA: passare un array come argomenti
// ============================================================

// Lo spread (...) "srotola" un array negli argomenti di una funzione.
const oreSettimana = [8, 8, 8, 8, 4];
const totSettimana = sommaOre(...oreSettimana); // => 36
console.log(totSettimana);

// Si possono combinare valori fissi e spread:
const extra = [2, 2];
const totConExtra = sommaOre(8, ...extra, 8); // => 20
console.log(totConExtra);

// Con una tuple type, lo spread deve avere la lunghezza esatta:
const trip: [string, number, boolean] = ["Lia", 30, false];
console.log(registra(...trip)); // => "Lia / 30 / inattivo"

// ERRORE TS: uno spread di array generico non ha lunghezza fissa,
// quindi non e' assegnabile a una tuple a lunghezza fissa.
// const arr: number[] = [1, 2, 3];
// registra("x", ...arr); // ERRORE TS: A spread argument must either have a tuple type or be passed to a rest parameter.

// ============================================================
// 7) DOMINIO ERP: union di ruoli e Turno
// ============================================================

// Union type dei ruoli previsti dall'ERP.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

// Interface mock del Dipendente (NON importata: definita qui).
interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
}

// Funzione con rest di Dipendente: filtra chi ha un certo ruolo.
function conRuolo(ruolo: Ruolo, ...dipendenti: Dipendente[]): Dipendente[] {
  return dipendenti.filter((d) => d.ruolo === ruolo);
}

const d1: Dipendente = { id: 1, nome: "Anna", badge: "UP-001", ruolo: "Admin" };
const d2: Dipendente = { id: 2, nome: "Bruno", badge: "UP-002", ruolo: "Operatore" };
const d3: Dipendente = { id: 3, nome: "Carla", badge: "UP-003", ruolo: "Admin" };

const admin = conRuolo("Admin", d1, d2, d3); // => [Anna, Carla]
console.log(admin.map((d) => d.nome));       // => ["Anna", "Carla"]

// ============================================================
// 8) VALIDAZIONE ORARI E BADGE (regex + rest)
// ============================================================

// Regex del dominio: orario "HH:MM" e badge "UP-###".
const RE_ORARIO = /^\d{2}:\d{2}$/;
const RE_BADGE = /^UP-\d{3}$/;

// Il rest raccoglie un numero variabile di orari da validare.
function tuttiOrariValidi(...orari: string[]): boolean {
  return orari.every((o) => RE_ORARIO.test(o));
}

console.log(tuttiOrariValidi("08:00", "12:30", "17:45")); // => true
console.log(tuttiOrariValidi("08:00", "8:0"));            // => false

// Badge singolo:
function badgeValido(badge: string): boolean {
  return RE_BADGE.test(badge);
}
console.log(badgeValido("UP-001")); // => true
console.log(badgeValido("XX-1"));   // => false

// ============================================================
// 9) TIMBRATURE: tuple [entrata, uscita] e calcolo minuti
// ============================================================

// Interface mock della Timbratura (orari naive-UTC come stringhe "HH:MM").
interface Timbratura {
  entrata: string; // "08:00"
  uscita: string;  // "17:00"
}

// Converte "HH:MM" in minuti dalla mezzanotte.
function inMinuti(orario: string): number {
  const [h, m] = orario.split(":").map(Number);
  return h * 60 + m;
}

// Rest di Timbratura: somma i minuti lavorati di piu' timbrature.
function minutiTotali(...timbrature: Timbratura[]): number {
  return timbrature.reduce(
    (acc, t) => acc + (inMinuti(t.uscita) - inMinuti(t.entrata)),
    0
  );
}

const t1: Timbratura = { entrata: "08:00", uscita: "12:00" }; // 240
const t2: Timbratura = { entrata: "13:00", uscita: "17:00" }; // 240
console.log(minutiTotali(t1, t2)); // => 480

// Passaggio via spread da un array di timbrature:
const giornata: Timbratura[] = [t1, t2];
console.log(minutiTotali(...giornata)); // => 480

// ============================================================
// 10) REST GENERICO CON TUPLE: preservare i tipi (variadic tuple)
// ============================================================

// Con un generic <T extends unknown[]> si cattura la tuple degli argomenti
// e la si puo' riusare: qui creiamo una funzione che aggiunge un prefisso
// e poi inoltra gli altri argomenti a una funzione data.
function conLog<T extends unknown[], R>(
  etichetta: string,
  fn: (...args: T) => R
): (...args: T) => R {
  return (...args: T): R => {
    console.log(`chiamo ${etichetta} con`, args.length, "argomenti");
    return fn(...args); // spread della tuple T come argomenti
  };
}

// Avvolgiamo sommaOre mantenendo la firma (...number[]) => number:
const sommaOreConLog = conLog("sommaOre", sommaOre);
console.log(sommaOreConLog(8, 8, 8)); // log + => 24

// ============================================================
// 11) HEAD/TAIL: manipolare tuple con rest nel type
// ============================================================

// Type helper: separa il primo elemento (Head) dal resto (Tail).
type Head<T extends unknown[]> = T extends [infer H, ...unknown[]] ? H : never;
type Tail<T extends unknown[]> = T extends [unknown, ...infer R] ? R : [];

type Esempio = [Ruolo, Turno, string];
type PrimoTipo = Head<Esempio>; // tipo: Ruolo
type RestoTipi = Tail<Esempio>; // tipo: [Turno, string]

// Uso a runtime coerente coi type:
const tuplaEsempio: Esempio = ["Operatore", "P4", "note"];
const primo: PrimoTipo = tuplaEsempio[0]; // "Operatore"
const resto: RestoTipi = [tuplaEsempio[1], tuplaEsempio[2]]; // ["P4", "note"]
console.log(primo, resto);

// ============================================================
// 12) READONLY TUPLE E as const
// ============================================================

// Una tuple readonly non e' modificabile: utile per costanti di dominio.
const TURNI: readonly Turno[] = ["P4", "P2", "STD"];
// ERRORE TS: non si puo' fare push su readonly array
// TURNI.push("STD"); // ERRORE TS: Property 'push' does not exist on type 'readonly Turno[]'.

// "as const" produce una tuple readonly con tipi letterali stretti:
const configTurno = ["P4", 4] as const; // tipo: readonly ["P4", 4]
console.log(configTurno[0], configTurno[1]); // => "P4" 4

// Uno spread di readonly tuple funziona in chiamata di rest params:
const oreFisse = [8, 8, 8] as const; // readonly [8, 8, 8]
console.log(sommaOre(...oreFisse)); // => 24

// ============================================================
// EXPORT (solo simboli locali di questo file)
// ============================================================

export { sommaOre, registra, minutiTotali, conRuolo, tuttiOrariValidi, conLog };
export type { Dipendente, Timbratura, Ruolo, Turno, FirmaUtente, Head, Tail };

/*
 * ============================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================
 * - ...args: number[]      -> rest parameter, raccoglie N argomenti in un array.
 * - Il rest deve essere l'ULTIMO parametro della firma.
 * - Parametri fissi + rest: (livello: string, ...messaggi: string[]).
 * - Rest tipizzato come TUPLE: (...args: [string, number, boolean]) -> arita' fissa.
 * - Labeled tuple elements: [ora: string, minuti: string] -> etichette leggibili.
 * - Tuple con opzionali e rest: [ruolo: string, reparto?: string, ...note: string[]].
 * - Spread in chiamata: fn(...array) srotola l'array negli argomenti.
 * - Spread + tuple a lunghezza fissa: serve una tuple, non un array generico.
 * - Variadic tuple generics: <T extends unknown[]> per preservare le firme.
 * - Head/Tail con infer e rest nei type: [infer H, ...] / [unknown, ...infer R].
 * - readonly tuple e "as const": costanti immutabili con tipi letterali stretti.
 * - Dominio ERP: sommaOre, minutiTotali, conRuolo, validazione orari "HH:MM" e badge "UP-###".
 */
