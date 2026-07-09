/**
 * File 030 - typeof operator
 * Corso TypeScript - livello FUNDAMENTALS.
 * L'operatore "typeof" a livello di TYPE estrae il tipo statico da un valore
 * gia' esistente (value space -> type space), evitando di riscrivere a mano
 * la forma di oggetti config, array e funzioni. Da non confondere con il
 * "typeof" a runtime (JavaScript) che ritorna una stringa tipo "string".
 * Qui vediamo: typeof su valori, config object, array, combinazione con keyof
 * e un cenno a ReturnType. Contesto dominio: ERP Polyuretech.
 */

// ============================================================
// 1) DUE "typeof" DIVERSI: runtime vs type-level
// ============================================================

// (a) typeof a RUNTIME (JavaScript classico): ritorna una stringa.
const badge1 = "UP-001";
const kindOfBadge = typeof badge1; // valore: "string" (a runtime)
// kindOfBadge e' una stringa, usata in condizioni: if (typeof x === "string")

// (b) typeof a livello di TYPE: appare in posizione di tipo (dopo ":" o in un
//     type alias) e produce il TIPO del valore, non una stringa.
const ruoloDefault = "Operatore";
type RuoloDefault = typeof ruoloDefault; // tipo: "Operatore" (literal type)
const r: RuoloDefault = "Operatore"; // ok
// const r2: RuoloDefault = "Admin"; // ERRORE TS: "Admin" non e' assegnabile a "Operatore"

// ============================================================
// 2) typeof SU VALORI PRIMITIVI E su const/let
// ============================================================

// Con "let" il tipo inferito e' allargato (widened) al primitivo.
let contatore = 42;
type TContatore = typeof contatore; // tipo: number (let -> widening)

// Con "const" su primitivo si ottiene il literal type.
const versione = 3;
type TVersione = typeof versione; // tipo: 3 (literal)

// typeof su un oggetto ne cattura la forma completa.
const dipendente = {
  id: 1,
  nome: "Mario Rossi",
  badge: "UP-001",
  ruolo: "Operatore",
};
type Dipendente = typeof dipendente;
// tipo: { id: number; nome: string; badge: string; ruolo: string }
const d2: Dipendente = { id: 2, nome: "Ada", badge: "UP-002", ruolo: "Admin" }; // ok

// ============================================================
// 3) typeof DI UN OGGETTO CONFIG (pattern molto comune)
// ============================================================

// Definiamo la config una sola volta come valore, poi ne deriviamo il tipo.
const erpConfig = {
  appName: "Polytools",
  porta: 9000,
  https: true,
  regexBadge: /^UP-\d{3}$/,
  regexOrario: /^\d{2}:\d{2}$/,
  turniValidi: ["P4", "P2", "STD"],
};
type ErpConfig = typeof erpConfig;
// tipo: {
//   appName: string; porta: number; https: boolean;
//   regexBadge: RegExp; regexOrario: RegExp; turniValidi: string[];
// }

// Una funzione che accetta la config tipizzata dal valore stesso.
function descriviConfig(cfg: ErpConfig): string {
  return `${cfg.appName} sulla porta ${cfg.porta}`;
}
descriviConfig(erpConfig); // => "Polytools sulla porta 9000"

// Con "as const" la config diventa readonly e i valori sono literal type.
const erpConfigConst = {
  appName: "Polytools",
  porta: 9000,
  turniValidi: ["P4", "P2", "STD"],
} as const;
type ErpConfigConst = typeof erpConfigConst;
// tipo: {
//   readonly appName: "Polytools";
//   readonly porta: 9000;
//   readonly turniValidi: readonly ["P4", "P2", "STD"];
// }
// erpConfigConst.porta = 8000; // ERRORE TS: porta e' readonly

// ============================================================
// 4) typeof SU ARRAY + indexed access [number]
// ============================================================

// Un array di valori; typeof ne da' il tipo array.
const ruoli = ["SuperAdmin", "Admin", "Operatore", "QrDisplay"];
type RuoliArray = typeof ruoli; // tipo: string[]

// Con "as const" l'array e' una tupla readonly di literal.
const ruoliConst = ["SuperAdmin", "Admin", "Operatore", "QrDisplay"] as const;
type RuoliTuple = typeof ruoliConst;
// tipo: readonly ["SuperAdmin", "Admin", "Operatore", "QrDisplay"]

// Pattern chiave: da array a UNION dei suoi elementi con [number].
type Ruolo = typeof ruoliConst[number];
// tipo: "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay"
const mioRuolo: Ruolo = "Admin"; // ok
// const nope: Ruolo = "Guest"; // ERRORE TS: "Guest" non fa parte della union

// Stesso pattern per i turni: single source of truth nell'array runtime.
const TURNI = ["P4", "P2", "STD"] as const;
type Turno = typeof TURNI[number]; // tipo: "P4" | "P2" | "STD"
function isTurno(x: string): x is Turno {
  return (TURNI as readonly string[]).includes(x);
}
isTurno("P4"); // => true

// typeof su un array di oggetti + [number] estrae il tipo elemento.
const timbrature = [
  { badge: "UP-001", entrata: "08:00", uscita: "17:00" },
  { badge: "UP-002", entrata: "09:00", uscita: "18:00" },
];
type Timbratura = typeof timbrature[number];
// tipo: { badge: string; entrata: string; uscita: string }
const t: Timbratura = { badge: "UP-003", entrata: "07:30", uscita: "16:30" }; // ok

// ============================================================
// 5) COMBINAZIONE typeof + keyof
// ============================================================

// keyof lavora su TIPI; per ottenere le chiavi da un VALORE serve typeof prima.
type ChiaviConfig = keyof typeof erpConfig;
// tipo: "appName" | "porta" | "https" | "regexBadge" | "regexOrario" | "turniValidi"
const k: ChiaviConfig = "porta"; // ok
// const k2: ChiaviConfig = "host"; // ERRORE TS: "host" non e' una chiave

// Getter type-safe: la chiave e' vincolata alle chiavi reali dell'oggetto.
function leggiConfig<K extends keyof typeof erpConfig>(chiave: K): (typeof erpConfig)[K] {
  return erpConfig[chiave];
}
const porta = leggiConfig("porta"); // tipo: number => 9000
const nome = leggiConfig("appName"); // tipo: string => "Polytools"
// leggiConfig("host"); // ERRORE TS: "host" non e' una chiave valida

// Mappa ruolo -> livello di accesso, con chiavi derivate dal valore.
const livelloRuolo = {
  SuperAdmin: 3,
  Admin: 2,
  Operatore: 1,
  QrDisplay: 0,
};
type RuoloConosciuto = keyof typeof livelloRuolo;
// tipo: "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay"
function livelloDi(ruolo: RuoloConosciuto): number {
  return livelloRuolo[ruolo];
}
livelloDi("Admin"); // => 2

// ============================================================
// 6) typeof SU FUNZIONI + cenno a ReturnType / Parameters
// ============================================================

// typeof su una funzione ne cattura la SIGNATURE (tipo funzione).
function creaDipendente(id: number, nome: string, badge: string) {
  return { id, nome, badge, attivo: true };
}
type CreaDipendenteFn = typeof creaDipendente;
// tipo: (id: number, nome: string, badge: string) => { id:number; nome:string; badge:string; attivo:boolean }

// ReturnType<T> estrae il tipo di RITORNO da un tipo funzione.
// Combinato con "typeof" si ricava il tipo del risultato senza dichiararlo.
type DipendenteCreato = ReturnType<typeof creaDipendente>;
// tipo: { id: number; nome: string; badge: string; attivo: boolean }
const nuovo: DipendenteCreato = { id: 9, nome: "Eva", badge: "UP-009", attivo: true }; // ok

// Parameters<T> estrae la tupla dei parametri.
type ParamsCrea = Parameters<typeof creaDipendente>;
// tipo: [id: number, nome: string, badge: string]
const args: ParamsCrea = [10, "Lia", "UP-010"]; // ok
creaDipendente(...args); // => { id: 10, nome: "Lia", badge: "UP-010", attivo: true }

// Utile per riusare il tipo di ritorno di un factory in piu' punti del codice.
function validatoreOrario() {
  const re = /^\d{2}:\d{2}$/;
  return (v: string): boolean => re.test(v);
}
type FnOrario = ReturnType<typeof validatoreOrario>; // tipo: (v: string) => boolean
const check: FnOrario = validatoreOrario();
check("08:30"); // => true
check("8:30"); // => false

// ============================================================
// 7) MINI CASO ERP: config + ruoli + turni tutti derivati da valori
// ============================================================

const seedReparti = ["Produzione", "Magazzino", "Qualita", "Uffici"] as const;
type Reparto = typeof seedReparti[number];
// tipo: "Produzione" | "Magazzino" | "Qualita" | "Uffici"

interface RigaRegistro {
  badge: string;
  ruolo: Ruolo; // union derivata da array via typeof [number]
  turno: Turno; // idem
  reparto: Reparto; // idem
}

const riga: RigaRegistro = {
  badge: "UP-001",
  ruolo: "Operatore",
  turno: "P4",
  reparto: "Produzione",
}; // ok
// const rigaKo: RigaRegistro = { badge: "UP-002", ruolo: "Guest", turno: "P4", reparto: "Uffici" };
// ERRORE TS: "Guest" non e' un Ruolo valido

// Export di simboli LOCALI per il ripasso (solo cose definite in questo file).
export type { ErpConfig, Ruolo, Turno, Reparto, DipendenteCreato };
export { erpConfig, TURNI, leggiConfig, livelloDi };

// ============================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================
// - typeof (runtime JS): ritorna stringa "string"|"number"|... per narrowing.
// - typeof (type-level): valore -> tipo, si usa in posizione di tipo.
// - let -> widening (number); const -> literal type (3, "Operatore").
// - type T = typeof oggetto: cattura la forma dell'oggetto.
// - as const: rende readonly e trasforma i valori in literal type.
// - typeof array: string[] senza as const, tupla readonly con as const.
// - typeof arr[number]: da array/tupla alla UNION dei suoi elementi.
// - keyof typeof oggetto: union delle chiavi di un VALORE (typeof prima).
// - (typeof obj)[K] con K extends keyof typeof obj: getter type-safe.
// - typeof funzione: cattura la signature della funzione.
// - ReturnType<typeof fn>: tipo di ritorno; Parameters<typeof fn>: tupla args.
// - Pattern ERP: array runtime = single source of truth per union di tipi.
