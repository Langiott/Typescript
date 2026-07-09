/**
 * File 033 - readonly fields
 * Corso TypeScript - Livello INTERMEDIATE
 * Argomento: campi readonly nelle class e nei type.
 * Vediamo come dichiarare property immutabili, come inizializzarle nel
 * constructor, la differenza tra readonly e const (compile-time vs runtime,
 * variabile vs property) e come modellare l'id readonly di un Dipendente ERP.
 * Nota: readonly e' un vincolo SOLO a compile-time, sparisce a runtime.
 */

// ---------------------------------------------------------------------------
// 1) readonly base su una class
// ---------------------------------------------------------------------------

// Una property readonly puo' essere assegnata solo in due punti:
// alla dichiarazione oppure dentro il constructor. Dopo e' bloccata.
class Reparto {
  readonly codice: string; // immutabile dopo init
  nome: string; // modificabile normalmente

  constructor(codice: string, nome: string) {
    this.codice = codice; // OK: assegnazione nel constructor
    this.nome = nome;
  }
}

const rep = new Reparto("R-PROD", "Produzione");
console.log(rep.codice); // => "R-PROD"
rep.nome = "Produzione Linea 1"; // OK: nome non e' readonly
// rep.codice = "R-QC";
// ERRORE TS: Cannot assign to 'codice' because it is a read-only property.

// ---------------------------------------------------------------------------
// 2) Parameter properties readonly (shorthand nel constructor)
// ---------------------------------------------------------------------------

// Mettendo il modifier direttamente sul parametro del constructor,
// TypeScript dichiara E assegna la property in automatico.
class Turno {
  constructor(
    readonly codice: "P4" | "P2" | "STD", // property readonly generata
    public durataOre: number, // property pubblica normale
  ) {}
}

const t = new Turno("P4", 8);
console.log(t.codice, t.durataOre); // => "P4" 8
// t.codice = "STD";
// ERRORE TS: Cannot assign to 'codice' because it is a read-only property.

// ---------------------------------------------------------------------------
// 3) L'id readonly del Dipendente (caso ERP tipico)
// ---------------------------------------------------------------------------

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// L'id di un Dipendente non deve mai cambiare dopo la creazione:
// e' l'identita' del record. Lo marchiamo readonly.
class Dipendente {
  readonly id: number; // chiave immutabile
  readonly badge: string; // formato "UP-001", anch'esso stabile
  nome: string; // il nome puo' essere corretto
  ruolo: Ruolo; // il ruolo puo' cambiare (promozione)

  constructor(id: number, badge: string, nome: string, ruolo: Ruolo) {
    this.id = id;
    this.badge = badge;
    this.nome = nome;
    this.ruolo = ruolo;
  }

  // metodo che aggiorna solo cio' che e' lecito aggiornare
  promuovi(nuovoRuolo: Ruolo): void {
    this.ruolo = nuovoRuolo; // OK
    // this.id = this.id + 1;
    // ERRORE TS: Cannot assign to 'id' because it is a read-only property.
  }
}

const dip = new Dipendente(1, "UP-001", "Mario Rossi", "Operatore");
dip.promuovi("Admin");
console.log(dip.ruolo); // => "Admin"
// dip.id = 999;
// ERRORE TS: Cannot assign to 'id' because it is a read-only property.

// ---------------------------------------------------------------------------
// 4) readonly nelle interface e nei type alias
// ---------------------------------------------------------------------------

// Anche le interface possono marcare property come readonly.
interface Timbratura {
  readonly dipendenteId: number; // a quale dipendente appartiene: fisso
  readonly entrata: string; // "HH:MM" naive-UTC
  uscita: string; // puo' essere impostata dopo l'entrata
}

const timb: Timbratura = {
  dipendenteId: 1,
  entrata: "08:00",
  uscita: "",
};
timb.uscita = "17:00"; // OK
// timb.entrata = "09:00";
// ERRORE TS: Cannot assign to 'entrata' because it is a read-only property.

// Nota: readonly nelle interface e' comunque solo compile-time.
// Non impedisce mutazioni fatte da JavaScript puro o via 'as any'.

// ---------------------------------------------------------------------------
// 5) Differenza tra readonly e const
// ---------------------------------------------------------------------------

// - const: vincola una VARIABILE (binding). Non puoi riassegnare la variabile,
//   ma puoi mutare l'oggetto a cui punta.
// - readonly: vincola una PROPERTY. Non puoi riassegnare quella property.

const badge = "UP-007"; // const: binding immutabile
// badge = "UP-008";
// ERRORE TS: Cannot assign to 'badge' because it is a constant.

const config = { turno: "STD" }; // const punta a un oggetto...
config.turno = "P4"; // ...ma le sue property SONO mutabili! OK
console.log(config.turno); // => "P4"

// Con readonly invece la property e' bloccata anche se la variabile e' let:
interface ConfigRO {
  readonly turno: string;
}
let cfg: ConfigRO = { turno: "STD" };
cfg = { turno: "P2" }; // OK: riassegno la variabile (e' let)
// cfg.turno = "P4";
// ERRORE TS: Cannot assign to 'turno' because it is a read-only property.

// In sintesi:
// const  -> immutabilita' del BINDING (variabile)   -> runtime + compile-time
// readonly -> immutabilita' della PROPERTY          -> solo compile-time

// ---------------------------------------------------------------------------
// 6) readonly array e ReadonlyArray
// ---------------------------------------------------------------------------

// Un array readonly non espone i metodi che mutano (push, pop, splice...).
const ruoli: readonly Ruolo[] = ["SuperAdmin", "Admin", "Operatore"];
console.log(ruoli[0]); // => "SuperAdmin"  (leggere e' consentito)
// ruoli.push("QrDisplay");
// ERRORE TS: Property 'push' does not exist on type 'readonly Ruolo[]'.
// ruoli[0] = "Admin";
// ERRORE TS: Index signature in type 'readonly Ruolo[]' only permits reading.

// Sintassi equivalente con il generic ReadonlyArray<T>:
const orari: ReadonlyArray<string> = ["08:00", "12:00", "17:00"];
console.log(orari.length); // => 3

// Tuple readonly (utile per coppie fisse tipo intervallo orario):
const intervallo: readonly [string, string] = ["08:00", "17:00"];
console.log(intervallo[1]); // => "17:00"
// intervallo[0] = "09:00";
// ERRORE TS: Cannot assign to '0' because it is a read-only property.

// ---------------------------------------------------------------------------
// 7) Il mapped type Readonly<T>
// ---------------------------------------------------------------------------

// Readonly<T> e' un utility type che rende readonly TUTTE le property di T.
interface DipendenteData {
  id: number;
  nome: string;
  ruolo: Ruolo;
}

type DipendenteFrozen = Readonly<DipendenteData>;
// equivale a:
// { readonly id: number; readonly nome: string; readonly ruolo: Ruolo }

const snapshot: DipendenteFrozen = { id: 1, nome: "Mario", ruolo: "Operatore" };
console.log(snapshot.nome); // => "Mario"
// snapshot.nome = "Luigi";
// ERRORE TS: Cannot assign to 'nome' because it is a read-only property.

// Attenzione: Readonly<T> e' SHALLOW (superficiale). Le property annidate
// restano mutabili se sono oggetti.
interface DipendenteConReparto {
  id: number;
  reparto: { nome: string };
}
const dcr: Readonly<DipendenteConReparto> = { id: 1, reparto: { nome: "QC" } };
// dcr.id = 2;
// ERRORE TS: Cannot assign to 'id' because it is a read-only property.
dcr.reparto.nome = "Produzione"; // OK: il livello annidato NON e' readonly!
console.log(dcr.reparto.nome); // => "Produzione"

// ---------------------------------------------------------------------------
// 8) readonly e narrowing / literal types (const assertion)
// ---------------------------------------------------------------------------

// 'as const' rende readonly (deep, per literal) e restringe ai literal types.
const turniFissi = ["P4", "P2", "STD"] as const;
// tipo: readonly ["P4", "P2", "STD"]
type TurnoLett = (typeof turniFissi)[number]; // "P4" | "P2" | "STD"

function turnoValido(x: TurnoLett): boolean {
  return turniFissi.includes(x);
}
console.log(turnoValido("P4")); // => true
// turniFissi.push("EXTRA");
// ERRORE TS: Property 'push' does not exist on type 'readonly [...]'.

// Un oggetto con 'as const': tutte le property diventano readonly literal.
const defaults = { turno: "STD", ruolo: "Operatore" } as const;
// tipo property turno: "STD" (non string), e readonly
// defaults.turno = "P4";
// ERRORE TS: Cannot assign to 'turno' because it is a read-only property.

// ---------------------------------------------------------------------------
// 9) readonly come "vincolo di sola lettura" nelle firme delle funzioni
// ---------------------------------------------------------------------------

// Accettare readonly Ruolo[] segnala che la funzione NON mutera' l'array.
// Un normale Ruolo[] e' assegnabile a readonly Ruolo[] (piu' permissivo).
function primoRuolo(lista: readonly Ruolo[]): Ruolo | undefined {
  // lista.push("Admin");  // ERRORE TS: push non esiste su readonly array
  return lista[0];
}
const mutabile: Ruolo[] = ["Admin", "Operatore"];
console.log(primoRuolo(mutabile)); // => "Admin"

// Il contrario NON vale: un readonly array non e' assegnabile a uno mutabile.
// function vuole(x: Ruolo[]) {}
// vuole(ruoli);
// ERRORE TS: The type 'readonly Ruolo[]' is 'readonly' and cannot be
// assigned to the mutable type 'Ruolo[]'.

// ---------------------------------------------------------------------------
// 10) Pattern: factory che crea entita' con id readonly validato
// ---------------------------------------------------------------------------

const RE_BADGE = /^UP-\d{3}$/;
const RE_ORARIO = /^\d{2}:\d{2}$/;

// La factory valida gli input e restituisce un oggetto con id/badge readonly.
// Dopo la creazione, l'identita' e' immutabile per il resto del programma.
function creaDipendente(id: number, badge: string, nome: string): Readonly<Dipendente> | null {
  if (!RE_BADGE.test(badge)) return null; // badge non valido
  return new Dipendente(id, badge, nome, "Operatore");
}

const nuovo = creaDipendente(42, "UP-042", "Anna Verdi");
if (nuovo) {
  console.log(nuovo.badge); // => "UP-042"
  // nuovo.nome = "Anna Bianchi";
  // ERRORE TS: con Readonly<Dipendente> anche 'nome' e' bloccato a compile-time
}

// Esempio validazione orario (readonly perche' una timbratura entrata e' fissa)
function orarioValido(o: string): boolean {
  return RE_ORARIO.test(o);
}
console.log(orarioValido("08:30")); // => true
console.log(orarioValido("8:30")); // => false

// ---------------------------------------------------------------------------
// export dei simboli locali (solo roba definita in questo file)
// ---------------------------------------------------------------------------

export { Reparto, Turno, Dipendente, creaDipendente, orarioValido };
export type { Ruolo, Timbratura, DipendenteData, DipendenteFrozen, TurnoLett };

// ---------------------------------------------------------------------------
// RIEPILOGO COMANDI / CONCETTI
// ---------------------------------------------------------------------------
// - readonly prop: assegnabile SOLO alla dichiarazione o nel constructor.
// - Parameter property: constructor(readonly x: T) dichiara + assegna in 1 riga.
// - id/badge Dipendente: readonly = identita' immutabile del record.
// - readonly nelle interface: valido a compile-time, sparisce a runtime.
// - const vincola la VARIABILE (binding); readonly vincola la PROPERTY.
// - const oggetto: binding fisso ma property interne mutabili.
// - readonly Ruolo[] / ReadonlyArray<T>: nessun metodo mutante (push/pop...).
// - tuple readonly: readonly [A, B] blocca gli indici.
// - Readonly<T>: mapped type, rende readonly tutte le prop (SHALLOW).
// - as const: readonly + narrowing ai literal types (deep sui literal).
// - firma con readonly array: segnala "non muto"; Ruolo[] -> readonly Ruolo[] OK,
//   ma readonly Ruolo[] -> Ruolo[] NON e' consentito.
// - readonly e' compile-time only: non protegge da 'as any' o JS puro.
