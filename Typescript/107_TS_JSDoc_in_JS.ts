/**
 * File 107 - JSDoc + TS in JS
 * =====================================================================
 * Come tipizzare codice JavaScript senza riscriverlo in TypeScript,
 * usando i JSDoc comments (@param, @returns, @type, @typedef) piu' il
 * flag "checkJs" del compiler. Idea: TS legge i commenti JSDoc e fa
 * type checking sul .js come se fosse .ts. Utile per migrazioni
 * graduali di un ERP legacy scritto in JS. Ogni esempio mostra il
 * JSDoc e il suo equivalente TS puro. Livello: ECOSYSTEM/EXTRA.
 */

// NOTA: questo e' un file .ts (compila con tsc --strict). Gli esempi
// JSDoc sono mostrati come STRINGHE/commenti perche' il valore
// didattico e' la sintassi del commento, non l'esecuzione. Dove
// possibile mostro l'equivalente TS reale e valido, cosi' il file
// compila. I blocchi "// JS+JSDoc:" sono da immaginare in un file .js.

export {}; // isola il modulo (evita collisioni di scope globale)

// ---------------------------------------------------------------------
// 0. checkJs / allowJs: attivare il type checking sui .js
// ---------------------------------------------------------------------
// Nel tsconfig.json:
//   {
//     "compilerOptions": {
//       "allowJs": true,     // permette .js nel programma
//       "checkJs": true,     // type-check anche i .js (usa i JSDoc)
//       "strict": true,
//       "noEmit": true
//     }
//   }
// Oppure per-file, in cima al .js:
//   // @ts-check       -> abilita il check solo su quel file
//   // @ts-nocheck     -> disabilita il check su quel file
//   // @ts-expect-error / @ts-ignore -> sulla riga sotto
//
// Con "checkJs" attivo, TS inferisce i tipi dal codice JS e usa i
// JSDoc come annotazioni esplicite. Nessun .ts, nessun transpile
// obbligatorio: il JS resta eseguibile as-is da Node/browser.

// ---------------------------------------------------------------------
// 1. @param e @returns: tipizzare una funzione JS
// ---------------------------------------------------------------------
// JS+JSDoc (in un file .js con // @ts-check):
//
//   /**
//    * Calcola i minuti lavorati tra due orari "HH:MM".
//    * @param {string} entrata - orario di entrata, es "08:30"
//    * @param {string} uscita  - orario di uscita, es "17:00"
//    * @returns {number} minuti totali
//    */
//   function minutiLavorati(entrata, uscita) {
//     const [he, me] = entrata.split(":").map(Number);
//     const [hu, mu] = uscita.split(":").map(Number);
//     return (hu * 60 + mu) - (he * 60 + me);
//   }
//
// Equivalente TS reale (valido, compila):
function minutiLavorati(entrata: string, uscita: string): number {
  const [he, me] = entrata.split(":").map(Number);
  const [hu, mu] = uscita.split(":").map(Number);
  return (hu * 60 + mu) - (he * 60 + me);
}
const durata = minutiLavorati("08:30", "17:00"); // tipo: number
// => 510

// Con // @ts-check, questa chiamata darebbe:
// ERRORE TS: Argument of type 'number' is not assignable to 'string'.
//   minutiLavorati(830, 1700);

// ---------------------------------------------------------------------
// 2. @param opzionale, default e rest
// ---------------------------------------------------------------------
// JS+JSDoc:
//   /**
//    * @param {string} nome
//    * @param {string} [ruolo]        - opzionale: parentesi quadre
//    * @param {number} [pausa=30]      - opzionale con default
//    * @param {...string} note         - rest parameter
//    */
//   function descrivi(nome, ruolo, pausa = 30, ...note) { /* ... */ }
//
// Equivalente TS:
function descrivi(
  nome: string,
  ruolo?: string,
  pausa: number = 30,
  ...note: string[]
): string {
  return `${nome} ${ruolo ?? "N/D"} pausa=${pausa} note=${note.length}`;
}
descrivi("Anna");                          // tipo: string
descrivi("Bruno", "Admin");                // ok
descrivi("Carla", "Operatore", 45, "a", "b"); // ok
// Il "?" JSDoc {string} [ruolo] equivale a "ruolo?: string" in TS.

// ---------------------------------------------------------------------
// 3. @type: annotare una variabile / costante
// ---------------------------------------------------------------------
// JS+JSDoc:
//   /** @type {string} */
//   let badge = leggiBadge();   // TS forza il tipo string
//
//   /** @type {number[]} */
//   const idsDip = [];          // altrimenti sarebbe never[]
//
// Equivalente TS:
let badge: string = "UP-001"; // tipo: string
const idsDip: number[] = [];  // tipo: number[]
idsDip.push(1, 2, 3);

// @type e' utile su literal che TS inferirebbe troppo largo/stretto:
// JS+JSDoc:
//   /** @type {"P4" | "P2" | "STD"} */
//   let turno = "P4";
// Equivalente TS:
let turno: "P4" | "P2" | "STD" = "P4"; // tipo: union letterale
turno = "STD"; // ok
// ERRORE TS: Type '"P9"' is not assignable to type '"P4" | "P2" | "STD"'.
//   turno = "P9";

// ---------------------------------------------------------------------
// 4. @type con cast in-linea: /** @type {X} */ (valore)
// ---------------------------------------------------------------------
// In JS non esiste "value as X"; il cast si scrive con @type
// applicato a una espressione tra parentesi:
//
// JS+JSDoc:
//   const el = /** @type {HTMLInputElement} */ (document.getElementById("b"));
//   const n  = /** @type {number} */ (JSON.parse("42"));
//
// Equivalente TS (usa "as"):
const parsed = JSON.parse("42") as number; // tipo: number
// Esempio browser (non eseguito):
//   const input = document.getElementById("badge") as HTMLInputElement;

// ---------------------------------------------------------------------
// 5. @typedef: definire un object type riutilizzabile
// ---------------------------------------------------------------------
// JS+JSDoc (equivale a una interface/type alias):
//   /**
//    * @typedef {Object} Dipendente
//    * @property {number} id
//    * @property {string} nome
//    * @property {string} badge            - formato "UP-001"
//    * @property {"SuperAdmin"|"Admin"|"Operatore"|"QrDisplay"} ruolo
//    * @property {string} [reparto]        - opzionale
//    */
//
//   /** @type {Dipendente} */
//   const d = { id: 1, nome: "Anna", badge: "UP-001", ruolo: "Admin" };
//
// Equivalente TS reale:
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

interface Dipendente {
  id: number;
  nome: string;
  badge: string;    // "UP-001"
  ruolo: Ruolo;
  reparto?: string; // opzionale
}

const dip: Dipendente = {
  id: 1,
  nome: "Anna",
  badge: "UP-001",
  ruolo: "Admin",
};
// ERRORE TS: Property 'ruolo' is missing / o valore fuori dalla union.
//   const bad: Dipendente = { id: 2, nome: "X", badge: "UP-002", ruolo: "Root" };

// ---------------------------------------------------------------------
// 6. @typedef per un function type (callback)
// ---------------------------------------------------------------------
// JS+JSDoc:
//   /**
//    * @typedef {(dip: Dipendente) => boolean} FiltroDip
//    */
//   /** @type {FiltroDip} */
//   const isAdmin = (d) => d.ruolo === "Admin";
//
// Equivalente TS:
type FiltroDip = (dip: Dipendente) => boolean;
const isAdmin: FiltroDip = (d) => d.ruolo === "Admin";
isAdmin(dip); // => false (dip.ruolo e' "Admin") -> true in realta'

// ---------------------------------------------------------------------
// 7. @typedef generico con @template
// ---------------------------------------------------------------------
// @template introduce type parameters (i generics di TS).
// JS+JSDoc:
//   /**
//    * @template T
//    * @typedef {{ ok: true, data: T } | { ok: false, error: string }} Result
//    */
//
//   /**
//    * @template T
//    * @param {T} data
//    * @returns {{ ok: true, data: T }}
//    */
//   function ok(data) { return { ok: true, data }; }
//
// Equivalente TS:
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}
const r = ok(dip); // tipo: { ok: true; data: Dipendente }
// => { ok: true, data: {...} }

// ---------------------------------------------------------------------
// 8. @typedef "import" di un tipo da un altro modulo
// ---------------------------------------------------------------------
// In JS puoi riferire un tipo TS senza import di runtime, con la
// sintassi import(...) dentro il JSDoc (solo type-level):
//
// JS+JSDoc:
//   /** @type {import("./models").Timbratura} */
//   let t;
//
//   /**
//    * @param {import("express").Request} req
//    * @param {import("express").Response} res
//    */
//   function handler(req, res) { /* ... */ }
//
// L'import(...) NON genera codice: e' cancellato in compile time.
// Qui definisco un mock locale invece di importare (regola: nessun
// import esterno). Interfacce mock Express (semplificate):
interface MockReq { body: unknown; params: Record<string, string>; }
interface MockRes { json(data: unknown): void; status(code: number): MockRes; }

function handler(req: MockReq, res: MockRes): void {
  res.status(200).json({ ricevuto: req.body });
}
void handler; // silenzia "unused" senza eseguire

// ---------------------------------------------------------------------
// 9. @typedef Timbratura + @type su array
// ---------------------------------------------------------------------
// JS+JSDoc:
//   /**
//    * @typedef {Object} Timbratura
//    * @property {number} dipId
//    * @property {string} entrata   - "HH:MM"
//    * @property {string} uscita    - "HH:MM"
//    * @property {"P4"|"P2"|"STD"} turno
//    */
//   /** @type {Timbratura[]} */
//   const registro = [];
//
// Equivalente TS:
interface Timbratura {
  dipId: number;
  entrata: string; // "HH:MM" naive-UTC
  uscita: string;  // "HH:MM"
  turno: "P4" | "P2" | "STD";
}
const registro: Timbratura[] = [
  { dipId: 1, entrata: "08:30", uscita: "17:00", turno: "P4" },
];
const totali = registro.map((t) => minutiLavorati(t.entrata, t.uscita));
// tipo: number[]  => [510]

// ---------------------------------------------------------------------
// 10. @enum: costante-oggetto tipizzata come enum
// ---------------------------------------------------------------------
// JS+JSDoc: @enum tipizza le proprieta' di un oggetto congelato.
//   /** @enum {string} */
//   const Turni = { P4: "P4", P2: "P2", STD: "STD" };
//   // Turni.P4 -> tipo "P4" | "P2" | "STD" ... (string enum)
//
// Equivalente TS idiomatico (as const, niente enum keyword):
const Turni = { P4: "P4", P2: "P2", STD: "STD" } as const;
type TurnoVal = (typeof Turni)[keyof typeof Turni]; // "P4"|"P2"|"STD"
const tv: TurnoVal = Turni.P2; // tipo: "P2"
void tv;

// ---------------------------------------------------------------------
// 11. @typedef con union e intersection
// ---------------------------------------------------------------------
// JS+JSDoc:
//   /** @typedef {{ badge: string }} ConBadge */
//   /** @typedef {{ reparto: string }} ConReparto */
//   /** @typedef {ConBadge & ConReparto} DipCompleto */    // intersection
//   /** @typedef {Dipendente | { anonimo: true }} MaybeDip */ // union
//
// Equivalente TS:
type ConBadge = { badge: string };
type ConReparto = { reparto: string };
type DipCompleto = ConBadge & ConReparto;      // intersection
type MaybeDip = Dipendente | { anonimo: true }; // union

const dc: DipCompleto = { badge: "UP-003", reparto: "Stampaggio" };
void dc;

// ---------------------------------------------------------------------
// 12. @callback: sintassi alternativa per function types
// ---------------------------------------------------------------------
// @callback e' un @typedef con @param/@returns per una funzione.
// JS+JSDoc:
//   /**
//    * @callback OnTimbratura
//    * @param {Timbratura} t
//    * @param {number} minuti
//    * @returns {void}
//    */
//   /** @type {OnTimbratura} */
//   const log = (t, m) => console.log(t.dipId, m);
//
// Equivalente TS:
type OnTimbratura = (t: Timbratura, minuti: number) => void;
const logTimb: OnTimbratura = (t, m) => {
  void t; void m; // niente console side-effect richiesto
};
void logTimb;

// ---------------------------------------------------------------------
// 13. @type su classe JS + @property implicite
// ---------------------------------------------------------------------
// In JS le classi si tipizzano annotando i campi con @type e i
// metodi con @param/@returns:
//   class Reparto {
//     /** @param {string} nome */
//     constructor(nome) {
//       /** @type {string} */
//       this.nome = nome;
//       /** @type {Dipendente[]} */
//       this.membri = [];
//     }
//     /** @param {Dipendente} d @returns {void} */
//     aggiungi(d) { this.membri.push(d); }
//   }
//
// Equivalente TS:
class Reparto {
  nome: string;
  membri: Dipendente[] = [];
  constructor(nome: string) {
    this.nome = nome;
  }
  aggiungi(d: Dipendente): void {
    this.membri.push(d);
  }
}
const rep = new Reparto("Stampaggio");
rep.aggiungi(dip);
rep.membri.length; // => 1

// ---------------------------------------------------------------------
// 14. @satisfies (TS 4.9+) anche in JSDoc
// ---------------------------------------------------------------------
// @satisfies verifica la compatibilita' senza allargare il tipo:
// JS+JSDoc:
//   /** @satisfies {Record<string, Ruolo>} */
//   const mappa = { anna: "Admin", bruno: "Operatore" };
//   // mappa.anna resta di tipo "Admin", non allargato a Ruolo
//
// Equivalente TS:
const mappa = {
  anna: "Admin",
  bruno: "Operatore",
} satisfies Record<string, Ruolo>;
type TAnna = typeof mappa.anna; // tipo: "Admin" (letterale preservato)
void ("" as TAnna);

// ---------------------------------------------------------------------
// 15. @overload (TS 5.0+): piu' firme in JSDoc
// ---------------------------------------------------------------------
// JS+JSDoc:
//   /**
//    * @overload
//    * @param {string} x
//    * @returns {string}
//    */
//   /**
//    * @overload
//    * @param {number} x
//    * @returns {number}
//    */
//   /** @param {string|number} x @returns {string|number} */
//   function raddoppia(x) { return typeof x === "string" ? x + x : x * 2; }
//
// Equivalente TS (function overloads):
function raddoppia(x: string): string;
function raddoppia(x: number): number;
function raddoppia(x: string | number): string | number {
  return typeof x === "string" ? x + x : x * 2;
}
const a1 = raddoppia("ab"); // tipo: string => "abab"
const a2 = raddoppia(21);   // tipo: number => 42
void a1; void a2;

// ---------------------------------------------------------------------
// 16. Utility types funzionano anche in JSDoc
// ---------------------------------------------------------------------
// JS+JSDoc:
//   /** @type {Partial<Dipendente>} */   const patch = { nome: "Zoe" };
//   /** @type {Pick<Dipendente, "id"|"nome">} */ const mini = { id: 9, nome: "Z" };
//   /** @type {Readonly<Timbratura>} */  const ro = registro[0];
//
// Equivalente TS:
const patch: Partial<Dipendente> = { nome: "Zoe" };
const mini: Pick<Dipendente, "id" | "nome"> = { id: 9, nome: "Z" };
const ro: Readonly<Timbratura> = registro[0];
void patch; void mini; void ro;
// ERRORE TS: Cannot assign to 'entrata' because it is a read-only property.
//   ro.entrata = "09:00";

// ---------------------------------------------------------------------
// 17. Validazione con type guard (utile in JS non tipizzato a runtime)
// ---------------------------------------------------------------------
// I JSDoc NON validano a runtime: sono cancellati. Serve un guard.
const RX_BADGE = /^UP-\d{3}$/;
const RX_ORA = /^\d{2}:\d{2}$/;

// JS+JSDoc: /** @param {unknown} v @returns {v is string} */
function isBadge(v: unknown): v is string {
  return typeof v === "string" && RX_BADGE.test(v);
}
function isOra(v: unknown): v is string {
  return typeof v === "string" && RX_ORA.test(v);
}
const inputBadge: unknown = "UP-007";
if (isBadge(inputBadge)) {
  inputBadge; // tipo ristretto: string
}
isOra("08:30"); // => true
isOra("8:5");   // => false

// ---------------------------------------------------------------------
// 18. @deprecated, @see, @example (tag documentativi)
// ---------------------------------------------------------------------
// Non cambiano il tipo ma appaiono negli editor / IntelliSense:
//   /**
//    * @deprecated usa minutiLavorati()
//    * @see minutiLavorati
//    * @example
//    *   oreLavorate("08:00", "16:00") // => 8
//    * @param {string} e @param {string} u @returns {number}
//    */
// Equivalente TS: stessi tag valgono in .ts.
/** @deprecated usa minutiLavorati() */
function oreLavorate(e: string, u: string): number {
  return minutiLavorati(e, u) / 60;
}
oreLavorate("08:00", "16:00"); // => 8  (l'editor barra il nome)

// ---------------------------------------------------------------------
// 19. Esportare tipi definiti via JSDoc @typedef
// ---------------------------------------------------------------------
// In un .js, un @typedef diventa esportabile cosi':
//   /** @typedef {import('./x').Dipendente} Dipendente */
//   export {}; // + in un file d.ts o via "export" del typedef
// In TS esportiamo tipi con "export type". Qui esporto i simboli
// locali definiti sopra:
export type {
  Dipendente,
  Timbratura,
  Reparto as RepartoType, // Reparto e' anche una classe (valore)
  Ruolo,
  Result,
  FiltroDip,
  DipCompleto,
  MaybeDip,
};
export { minutiLavorati, oreLavorate, isBadge, isOra, ok, Reparto };

// ---------------------------------------------------------------------
// RIEPILOGO COMANDI / CONCETTI
// ---------------------------------------------------------------------
// - allowJs: includi i .js nel programma TS.
// - checkJs: type-check dei .js usando i JSDoc.
// - // @ts-check / // @ts-nocheck: on/off per singolo file .js.
// - // @ts-expect-error / // @ts-ignore: sopprimi errore riga sotto.
// - @param {T} nome / @param {T} [opz] / @param {T} [x=def] / @param {...T}
// - @returns {T}: tipo di ritorno.
// - @type {T}: annota variabile, campo, o cast /** @type {T} */ (expr).
// - @typedef {Object} + @property: definisce un object type (interface).
// - @typedef {(a:A)=>B} / @callback: definisce un function type.
// - @template T: introduce generics.
// - import("mod").Tipo: riferisce tipi di altri moduli (solo type-level).
// - @enum {string}: oggetto tipizzato (in TS: "as const").
// - @satisfies {T}: verifica senza allargare (TS 4.9+).
// - @overload: firme multiple (TS 5.0+).
// - @deprecated / @see / @example: doc tag, non cambiano i tipi.
// - Utility types (Partial/Pick/Readonly/Record...) valgono in JSDoc.
// - I JSDoc sono CANCELLATI a runtime: per validare usa type guard.
// - Equivalenze: {string} [x]  <=> x?: string ; @typedef Object <=> interface.
