/**
 * 027_TS_readonly.ts
 * File 027 del corso TypeScript - Argomento: "readonly"
 * Il modifier readonly rende una property non riassegnabile dopo l'inizializzazione.
 * Vedremo: readonly su property, ReadonlyArray<T>, readonly tuple, cenno ad "as const",
 * il concetto di immutabilita' SUPERFICIALE (shallow) e un esempio di config ERP immutabile.
 * Livello: FUNDAMENTALS. Tutto in ASCII, senza lettere accentate (e' / puo' / cita').
 */

export {}; // isola lo scope del modulo per evitare collisioni di nomi globali

// ============================================================
// 1) readonly su property di interface
// ============================================================

// La property "id" non puo' essere riassegnata dopo la creazione dell'oggetto.
interface Dipendente {
  readonly id: number; // sola lettura: fissata alla creazione
  nome: string; // normale: modificabile
  readonly badge: string; // il badge non cambia mai (es "UP-001")
  ruolo: Ruolo;
}

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

const dip: Dipendente = { id: 1, nome: "Mario", badge: "UP-001", ruolo: "Operatore" };

dip.nome = "Mario Rossi"; // OK: nome non e' readonly
dip.ruolo = "Admin"; // OK

// dip.id = 2;          // ERRORE TS: Cannot assign to 'id' because it is a read-only property.
// dip.badge = "UP-002";// ERRORE TS: Cannot assign to 'badge' because it is a read-only property.

// ============================================================
// 2) readonly nelle classi (property e parameter property)
// ============================================================

// readonly in una class: assegnabile solo nel costruttore o inline.
class Timbratura {
  readonly badge: string;
  entrata: string; // orario naive-UTC "HH:MM"
  uscita: string;

  constructor(badge: string, entrata: string, uscita: string) {
    this.badge = badge; // OK: assegnazione nel costruttore
    this.entrata = entrata;
    this.uscita = uscita;
  }

  // Metodo che tenta di modificare il badge -> non compila (mostrato come commento).
  // rinomina(nuovo: string) { this.badge = nuovo; }
  // ERRORE TS: Cannot assign to 'badge' because it is a read-only property.
}

const t = new Timbratura("UP-001", "08:00", "17:00");
t.entrata = "08:05"; // OK
// t.badge = "UP-999"; // ERRORE TS: read-only property.

// Parameter property: "readonly" davanti al parametro del costruttore crea e inizializza il campo.
class Reparto {
  constructor(
    readonly id: number, // diventa this.id sola lettura
    readonly nome: string, // diventa this.nome sola lettura
  ) {}
}

const rep = new Reparto(3, "Produzione");
// rep.id = 4; // ERRORE TS: read-only property.
console.log(rep.nome); // => "Produzione"

// ============================================================
// 3) ReadonlyArray<T> e la sintassi readonly T[]
// ============================================================

// Un ReadonlyArray blocca i metodi che mutano l'array (push, pop, splice, ...).
const turniFissi: ReadonlyArray<string> = ["P4", "P2", "STD"];
// Sintassi equivalente e piu' compatta:
const turniFissi2: readonly string[] = ["P4", "P2", "STD"];

console.log(turniFissi[0]); // => "P4"  (la lettura per indice e' permessa)
console.log(turniFissi.length); // => 3

// turniFissi.push("P1");   // ERRORE TS: Property 'push' does not exist on type 'readonly string[]'.
// turniFissi[0] = "P1";    // ERRORE TS: Index signature in type 'readonly string[]' only permits reading.

// I metodi non-mutanti restituiscono un array normale (mutabile).
const maiuscoli = turniFissi.map((x) => x.toUpperCase()); // tipo: string[]
maiuscoli.push("EXTRA"); // OK: map produce un array normale

// Attenzione alla direzione dell'assegnazione:
const mutabile: string[] = ["a", "b"];
const soloLettura: readonly string[] = mutabile; // OK: string[] -> readonly string[]
// const ritorno: string[] = soloLettura;         // ERRORE TS: readonly string[] non e' assegnabile a string[].

// ============================================================
// 4) readonly tuple (tuple immutabili)
// ============================================================

// Una tuple readonly fissa sia i tipi per posizione sia l'immutabilita'.
type Coordinata = readonly [number, number];
const punto: Coordinata = [45, 12];
console.log(punto[0]); // => 45
// punto[0] = 0; // ERRORE TS: Cannot assign to '0' because it is a read-only property.

// Utile per un intervallo orario che non deve cambiare: [entrata, uscita].
type IntervalloOrario = readonly [string, string];
const turnoStd: IntervalloOrario = ["08:00", "17:00"];
// turnoStd.push("18:00"); // ERRORE TS: 'push' non esiste su readonly tuple.
const [inizio, fine] = turnoStd; // destructuring: OK (crea nuove binding)
console.log(inizio, fine); // => "08:00" "17:00"

// ============================================================
// 5) Cenno ad "as const"
// ============================================================

// "as const" crea un literal type profondamente readonly e restringe i tipi ai literal.
const RUOLI = ["SuperAdmin", "Admin", "Operatore", "QrDisplay"] as const;
// tipo di RUOLI: readonly ["SuperAdmin", "Admin", "Operatore", "QrDisplay"]
// RUOLI.push("X"); // ERRORE TS: 'push' non esiste (readonly).

// Possiamo derivare una union dai valori dell'array literal:
type RuoloDaConst = (typeof RUOLI)[number]; // "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay"
const rr: RuoloDaConst = "Admin"; // OK
// const bad: RuoloDaConst = "Ospite"; // ERRORE TS: "Ospite" non e' un ruolo valido.

// Con "as const" anche le property degli oggetti diventano readonly literal.
const TURNO_DEFAULT = { codice: "STD", durataOre: 8 } as const;
// tipo: { readonly codice: "STD"; readonly durataOre: 8 }
// TURNO_DEFAULT.durataOre = 9; // ERRORE TS: read-only property.

// ============================================================
// 6) Immutabilita' SUPERFICIALE (shallow) - punto chiave
// ============================================================

// readonly blocca la RIASSEGNAZIONE della property, NON il contenuto degli oggetti annidati.
interface ConfigNidificata {
  readonly regex: { badge: RegExp; orario: RegExp };
  readonly turni: string[]; // readonly sul riferimento, non sugli elementi
}

const cfg: ConfigNidificata = {
  regex: { badge: /^UP-\d{3}$/, orario: /^\d{2}:\d{2}$/ },
  turni: ["P4", "P2", "STD"],
};

// cfg.turni = []; // ERRORE TS: read-only property (non posso riassegnare il riferimento).
cfg.turni.push("P1"); // OK ma PERICOLOSO: l'array interno resta mutabile (shallow!).
cfg.regex.badge = /x/; // OK: l'oggetto annidato non e' readonly.

// Per bloccare anche gli annidamenti servono readonly "in profondita'" (es. readonly array + as const)
// oppure un Deep-Readonly mapped type (vedi sotto).

// Mapped type ricorsivo per una immutabilita' PROFONDA (deep readonly).
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

type ConfigProfonda = DeepReadonly<{ turni: string[]; soglie: { max: number } }>;
const cfgDeep: ConfigProfonda = { turni: ["STD"], soglie: { max: 10 } };
// cfgDeep.turni.push("P4"); // ERRORE TS: 'push' non esiste (turni ora e' readonly).
// cfgDeep.soglie.max = 99;  // ERRORE TS: read-only property (annidato bloccato).

// ============================================================
// 7) Utility type Readonly<T>
// ============================================================

// Readonly<T> e' un mapped type predefinito: rende readonly tutte le property (livello 1).
interface Turno {
  codice: string;
  durataOre: number;
}
type TurnoBloccato = Readonly<Turno>;
// equivale a: { readonly codice: string; readonly durataOre: number }

const turnoP4: TurnoBloccato = { codice: "P4", durataOre: 6 };
// turnoP4.durataOre = 8; // ERRORE TS: read-only property.

// Object.freeze restituisce un Readonly<T> a runtime (congela davvero, ma solo shallow).
const frozen = Object.freeze({ codice: "P2", durataOre: 4 }); // tipo: Readonly<{...}>
// frozen.codice = "X"; // ERRORE TS: read-only property.

// ============================================================
// 8) readonly nelle funzioni: proteggere gli argomenti
// ============================================================

// Dichiarare il parametro come readonly promette che la funzione NON mutera' l'array.
function primoOrario(orari: readonly string[]): string {
  // orari.push("x"); // ERRORE TS: la funzione non puo' mutare un readonly array.
  return orari[0] ?? "--:--";
}
console.log(primoOrario(["08:00", "12:00"])); // => "08:00"
console.log(primoOrario(turniFissi)); // OK: accetta anche ReadonlyArray

// Poiche' non muta, la funzione accetta sia string[] sia readonly string[]:
const orariMutabili = ["09:00"]; // tipo: string[]
console.log(primoOrario(orariMutabili)); // OK

// ============================================================
// 9) Esempio applicato: config ERP immutabile (Polyuretech)
// ============================================================

// Definiamo una configurazione applicativa che non deve essere alterata a runtime.
interface ErpConfig {
  readonly appName: string;
  readonly ruoliValidi: readonly Ruolo[];
  readonly turni: readonly ["P4", "P2", "STD"]; // readonly tuple con literal
  readonly patterns: {
    readonly badge: RegExp;
    readonly orario: RegExp;
  };
  readonly limiti: {
    readonly maxOreGiorno: number;
    readonly minutiPausa: number;
  };
}

const ERP_CONFIG: ErpConfig = {
  appName: "PolyTools",
  ruoliValidi: ["SuperAdmin", "Admin", "Operatore", "QrDisplay"],
  turni: ["P4", "P2", "STD"],
  patterns: {
    badge: /^UP-\d{3}$/,
    orario: /^\d{2}:\d{2}$/,
  },
  limiti: {
    maxOreGiorno: 8,
    minutiPausa: 30,
  },
};

// Tentativi di modifica bloccati dal compiler (protezione della config):
// ERP_CONFIG.appName = "Altro";          // ERRORE TS: read-only property.
// ERP_CONFIG.limiti.maxOreGiorno = 12;   // ERRORE TS: read-only property (annidato dichiarato readonly).
// ERP_CONFIG.turni.push("P1");           // ERRORE TS: 'push' non esiste su readonly tuple.

// Uso in lettura: validazione di un badge e di un orario con i pattern immutabili.
function validaBadge(badge: string): boolean {
  return ERP_CONFIG.patterns.badge.test(badge); // solo lettura della config
}
function validaOrario(hhmm: string): boolean {
  return ERP_CONFIG.patterns.orario.test(hhmm);
}

console.log(validaBadge("UP-001")); // => true
console.log(validaBadge("XX-1")); // => false
console.log(validaOrario("08:30")); // => true
console.log(validaOrario("8:30")); // => false

// Controllo che un ruolo sia tra quelli validi, sfruttando la lista readonly.
function isRuoloValido(x: string): x is Ruolo {
  return (ERP_CONFIG.ruoliValidi as readonly string[]).includes(x);
}
console.log(isRuoloValido("Admin")); // => true
console.log(isRuoloValido("Ospite")); // => false

// ============================================================
// 10) readonly vs const: differenza importante
// ============================================================

// "const" agisce sulla VARIABILE (binding), "readonly" agisce sulla PROPERTY.
const arr = [1, 2, 3]; // const: non posso riassegnare 'arr'...
arr.push(4); // ...ma posso mutare il contenuto: arr e' [1,2,3,4]
// arr = [];            // ERRORE TS: Cannot assign to 'arr' because it is a constant.

let box: { readonly val: number } = { val: 1 };
box = { val: 2 }; // OK: la VARIABILE box non e' const, posso riassegnarla
// box.val = 3;      // ERRORE TS: 'val' e' read-only (la property lo e', non la variabile).

// Export di alcuni simboli locali per il ripasso (solo simboli definiti qui).
export type { Dipendente, ErpConfig, DeepReadonly, Coordinata, IntervalloOrario, Ruolo };
export { ERP_CONFIG, validaBadge, validaOrario, isRuoloValido, primoOrario };

// ============================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================
// - readonly property: non riassegnabile dopo l'init (in oggetto o class/constructor).
// - parameter property: "constructor(readonly id: number)" crea e blocca il campo.
// - ReadonlyArray<T> === readonly T[]: niente push/pop/splice; lettura per indice OK.
// - readonly tuple: "readonly [number, number]" fissa posizioni e immutabilita'.
// - as const: literal type deeply readonly; utile per union via (typeof X)[number].
// - immutabilita' SUPERFICIALE (shallow): readonly blocca il riferimento, non gli annidati.
// - DeepReadonly<T>: mapped type ricorsivo per immutabilita' profonda.
// - Readonly<T>: utility predefinita (livello 1); Object.freeze -> Readonly<T> a runtime.
// - param readonly nelle funzioni: promette di non mutare; accetta array mutabili e non.
// - const vs readonly: const = binding della variabile; readonly = property dell'oggetto.
