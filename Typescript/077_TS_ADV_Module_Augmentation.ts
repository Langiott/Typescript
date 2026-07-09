/**
 * File 077 - ADV Module Augmentation
 * Corso TypeScript avanzato: come ESTENDERE tipi che vivono in altri moduli (o
 * nel global scope) senza modificarne il codice sorgente, usando "declare module"
 * e "declare global". E' il meccanismo che permette a plugin, middleware e librerie
 * di arricchire tipi esistenti (Express Request, Window, oggetti di libreria, ecc.).
 * Vediamo: augmentation di module esterni, merging di interface, global augmentation,
 * pitfall (module vs script, export {}), e casi realistici ispirati all'ERP Polyuretech.
 */

// NOTA: non importiamo NULLA da npm. Dove servirebbe una libreria reale (Express,
// una lib "config", ecc.) definiamo un MOCK locale e lo dichiariamo nei commenti.

// Helper di type-testing usati in tutto il file (pattern "test di tipo").
// Equal confronta due tipi in modo esatto (trucco con funzione condizionale che
// forza TS a valutare l'identita' strutturale, non solo l'assegnabilita').
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
// Expect accetta solo il literal true: se il test fallisce e' ERRORE TS in fase di compilazione.
type Expect<T extends true> = T;

// ---------------------------------------------------------------------------
// 1) IL MECCANISMO BASE: DECLARATION MERGING DI INTERFACE
// ---------------------------------------------------------------------------
// Le interface con lo stesso nome nello STESSO scope si FONDONO (merge). E' la
// primitiva su cui poggia tutta la module augmentation: augmentare = fare merge
// di una interface locale con una definita altrove.

interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
}
// Seconda dichiarazione con lo stesso nome: NON ridefinisce, AGGIUNGE membri.
interface Dipendente {
  ruolo: "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
}
// Il tipo finale ha id + nome + badge + ruolo, come se fosse una sola interface.
const dip1: Dipendente = { id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Operatore" };
// tipo di dip1.ruolo: "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay"

// Meccanismo interno: il merge NON permette di cambiare il tipo di un membro
// gia' esistente con un tipo incompatibile.
// interface Dipendente { id: string } // ERRORE TS: subsequent property declarations
//                                     // must have the same type ('number', non 'string').

// I "type alias" invece NON fanno merge: due 'type X' con lo stesso nome collidono.
// type Reparto = { nome: string }
// type Reparto = { piano: number } // ERRORE TS: Duplicate identifier 'Reparto'.

// ---------------------------------------------------------------------------
// 2) AUGMENTARE UN MODULE ESTERNO CON "declare module"
// ---------------------------------------------------------------------------
// Scenario tipico: una libreria esporta una interface e noi vogliamo aggiungerle
// campi (es. Express: req.user, req.reparto). Con un modulo VERO scriveremmo:
//
//   import "express";
//   declare module "express-serve-static-core" {
//     interface Request { user?: Utente }
//   }
//
// Qui non abbiamo Express, quindi SIMULIAMO una libreria come modulo locale
// tramite un namespace che espone le sue interface. Il PATTERN e' identico.

// --- MOCK della "libreria" (finge di essere un pacchetto npm chiamato "erp-http") ---
namespace ErpHttpLib {
  export interface Request {
    method: string;
    url: string;
    // volutamente NON ci sono user/reparto: li aggiungiamo noi via augmentation.
  }
  export interface Response {
    statusCode: number;
    send(body: string): void;
  }
}

// Utente applicativo che vogliamo "iniettare" nella Request.
interface Utente {
  id: number;
  ruolo: "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
}

// AUGMENTATION del namespace-che-simula-il-module: riapriamo ErpHttpLib e la sua
// interface Request, aggiungendo campi. Con un vero pacchetto npm scriveremmo
// "declare module 'erp-http' { export interface Request { ... } }".
namespace ErpHttpLib {
  export interface Request {
    user?: Utente;         // aggiunto dall'augmentation
    reparto?: string;      // aggiunto dall'augmentation
  }
}

// Ora Request ha method + url + user + reparto, ma il codice della "libreria"
// non e' stato toccato: e' l'essenza dell'augmentation.
function readUser(req: ErpHttpLib.Request): string {
  // req.user e' visibile grazie all'augmentation (era assente nel mock originale).
  return req.user ? `utente#${req.user.id}` : "anonimo";
}
const fakeReq: ErpHttpLib.Request = { method: "GET", url: "/timbrature", user: { id: 7, ruolo: "Admin" } };
readUser(fakeReq); // => "utente#7"

// Test di tipo: la property aggiunta esiste ed e' opzionale del tipo giusto.
type _T1 = Expect<Equal<ErpHttpLib.Request["user"], Utente | undefined>>;

// ---------------------------------------------------------------------------
// 3) LA SINTASSI VERA "declare module 'nome'" (spiegata, poi simulata)
// ---------------------------------------------------------------------------
// Con un pacchetto npm reale che espone AppConfig, l'augmentation si scrive cosi'
// (mostrata SOLO nel commento: creare/augmentare un ambient module NON e' lecito
// dentro un file che e' gia' un modulo -> vedi PITFALL B; va in un .d.ts o script):
//
//   import "config-lib";                       // porta in scope il modulo vero
//   declare module "config-lib" {              // riapre il modulo -> AUGMENTATION
//     export interface AppConfig {
//       turnoDefault: "P4" | "P2" | "STD";     // campi ERP aggiunti
//       fusoOrario: string;                    // orari naive-UTC: "Europe/Rome"
//     }
//   }
//   const cfg = loadConfig();                   // cfg.turnoDefault ora esiste, tipizzato
//
// Poiche' qui non abbiamo npm, SIMULIAMO il modulo con un namespace (stesso meccanismo
// di merge delle interface visto per ErpHttpLib): la libreria e la sua augmentation.
namespace ConfigLib {
  // La "libreria" espone una interface di configurazione, inizialmente scarna.
  export interface AppConfig {
    appName: string;
    port: number;
  }
}
// Augmentation: riapriamo il namespace e aggiungiamo campi specifici dell'ERP.
namespace ConfigLib {
  export interface AppConfig {
    turnoDefault: "P4" | "P2" | "STD";
    fusoOrario: string; // es. "Europe/Rome"; ricordiamo che gli orari sono naive-UTC
  }
}

// Meccanismo interno: TS unisce le due dichiarazioni di AppConfig in una sola
// interface a 4 campi, esattamente come farebbe con "declare module" su un .d.ts.
type ConfigShape = ConfigLib.AppConfig;
// ConfigShape = { appName: string; port: number; turnoDefault: ...; fusoOrario: string }
type _T2 = Expect<Equal<keyof ConfigShape, "appName" | "port" | "turnoDefault" | "fusoOrario">>;

// ---------------------------------------------------------------------------
// 4) GLOBAL AUGMENTATION CON "declare global"
// ---------------------------------------------------------------------------
// "declare global" deve stare dentro un MODULE (un file con almeno un import/export).
// Serve ad aggiungere simboli al global scope: property su Window, metodi su
// prototipi built-in, variabili globali. In questo FILE facciamo export in fondo,
// quindi il file E' un modulo e "declare global" e' lecito.

declare global {
  // Aggiungiamo una variabile globale tipizzata (es. contesto ERP iniettato dal server).
  // eslint-disable-next-line no-var  (var e' obbligatorio per le globali dichiarate)
  var ERP_BUILD: { version: string; commit: string };

  // Estendiamo il tipo Array aggiungendo un metodo "last" (solo TIPO, non implementazione).
  interface Array<T> {
    last(): T | undefined;
  }

  // Esempio browser: estendere Window con un campo custom.
  interface Window {
    ERP_SESSION?: { userId: number; ruolo: string };
  }
}

// Uso della globale dichiarata (il tipo esiste ovunque nel progetto dopo l'augmentation).
function printBuild(): string {
  // ERP_BUILD e' tipizzato: TS conosce version/commit anche senza import.
  return `v${ERP_BUILD.version} (${ERP_BUILD.commit})`;
}
// NB: printBuild non viene chiamata a runtime qui: la globale non e' inizializzata,
// ma a noi interessa la CORRETTEZZA DEI TIPI, non l'esecuzione.

// Il metodo Array.last e' ora visibile a livello di tipo su qualunque array.
function ultimaTimbratura(orari: string[]): string | undefined {
  return orari.last(); // tipo: string | undefined
}
// Per completezza forniamo anche l'implementazione a runtime (senza rompere i tipi).
Array.prototype.last = function <T>(this: T[]): T | undefined {
  return this.length ? this[this.length - 1] : undefined;
};
ultimaTimbratura(["08:00", "12:00", "13:00"]); // => "13:00"

// Esempio browser (NON eseguito): dopo l'augmentation, window.ERP_SESSION e' tipizzato.
// Esempio browser
function readSession(): number | undefined {
  return window.ERP_SESSION?.userId; // tipo: number | undefined
}
void readSession; // referenziata per chiarezza, non invocata

// ---------------------------------------------------------------------------
// 5) USE-CASE REALISTICO ERP: TIPIZZARE UNA LIBRERIA "PLUGIN" ESTENDIBILE
// ---------------------------------------------------------------------------
// Pattern molto comune: una libreria definisce una interface "registro" vuota e
// invita gli utenti ad augmentarla per registrare i propri tipi (es. eventi,
// route, comandi). E' come funzionano i "module registry" di molte lib moderne.

// Con un vero pacchetto npm "event-bus" il registro si augmenta cosi' (SOLO commento):
//   import "event-bus";
//   declare module "event-bus" {
//     export interface EventMap { "timbratura:creata": { dipendenteId: number; ora: string } }
//   }
// Qui usiamo di nuovo un namespace-mock (stesso identico meccanismo di merge).

// --- MOCK libreria "event-bus" (finto pacchetto simulato con namespace) ---
namespace EventBus {
  // La libreria dichiara una interface VUOTA da riempire via augmentation.
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface EventMap {}

  // Il tipo dell'emitter deriva dinamicamente dalla EventMap augmentata:
  // e' un mapped type che genera "on<K>(handler)" per ogni evento registrato.
  export type Emitter = {
    on<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): void;
    emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void;
  };
}

// Augmentation lato ERP: registriamo i nostri eventi di dominio nella EventMap.
namespace EventBus {
  export interface EventMap {
    "timbratura:creata": { dipendenteId: number; ora: string };     // ora "HH:MM"
    "dipendente:aggiornato": { id: number; campi: string[] };
    "reparto:chiuso": { reparto: string; turno: "P4" | "P2" | "STD" };
  }
}

// Ora l'Emitter conosce ESATTAMENTE i nomi evento e i payload, tipati end-to-end.
type BusEmitter = EventBus.Emitter;
declare const bus: BusEmitter; // simuliamo un emitter gia' creato

// Il compilatore verifica sia il nome evento sia la forma del payload.
bus.on("timbratura:creata", (p) => {
  // p e' inferito: { dipendenteId: number; ora: string }
  const _dip: number = p.dipendenteId; // tipo: number
  const _ora: string = p.ora;          // tipo: string
  void _dip; void _ora;
});
bus.emit("reparto:chiuso", { reparto: "R1", turno: "P4" }); // OK
// bus.emit("reparto:chiuso", { reparto: "R1", turno: "X" }); // ERRORE TS: '"X"' non
//                                                            // assegnabile a "P4"|"P2"|"STD".
// bus.on("evento:inesistente", () => {}); // ERRORE TS: '"evento:inesistente"' non
//                                          // e' assegnabile a keyof EventMap.

// Test di tipo: la EventMap augmentata contiene le nostre chiavi.
type _T3 = Expect<Equal<
  keyof EventBus.EventMap,
  "timbratura:creata" | "dipendente:aggiornato" | "reparto:chiuso"
>>;

// ---------------------------------------------------------------------------
// 6) USE-CASE ERP: AUGMENTARE UN "REPOSITORY" GENERICO DI LIBRERIA
// ---------------------------------------------------------------------------
// Simuliamo una micro-ORM che offre un Repository<T> base; via augmentation
// aggiungiamo metodi di dominio (es. findByBadge) senza toccare la libreria.

// --- MOCK libreria "mini-orm" (namespace-mock; con npm reale: declare module "mini-orm") ---
namespace MiniOrm {
  export interface Repository<T> {
    findById(id: number): T | undefined;
    all(): T[];
  }
}

// Entita' di dominio Timbratura (orari naive-UTC come stringhe "HH:MM").
interface Timbratura {
  id: number;
  dipendenteId: number;
  entrata: string; // "HH:MM"
  uscita: string;  // "HH:MM"
}

// Augmentation del Repository generico: aggiungiamo un metodo trasversale.
// Nota: e' un metodo generico su T, cosi' vale per QUALSIASI entita' del repo.
// Le interface generic si augmentano mantenendo lo stesso parametro <T>.
namespace MiniOrm {
  export interface Repository<T> {
    // paginazione generica aggiunta a tutti i repository
    page(offset: number, limit: number): T[];
  }
}

type TimbRepo = MiniOrm.Repository<Timbratura>;
declare const repo: TimbRepo;
const primaPagina = repo.page(0, 20); // tipo: Timbratura[] (metodo aggiunto via augmentation)
void primaPagina;
const unaTimb = repo.findById(1);      // tipo: Timbratura | undefined (metodo originale)
void unaTimb;

// GOTCHA importante: NON si possono aggiungere overload di funzione a un modulo
// riaprendo una FUNCTION gia' dichiarata come "export function" a meno di
// dichiararla di nuovo come overload set. In pratica per estendere si augmenta
// una INTERFACE, non si "ri-firma" una funzione: le interface fanno merge, le
// function no. (Le function ambientali con stessa firma sono duplicati -> errore.)

// ---------------------------------------------------------------------------
// 7) AUGMENTATION CHE INTERAGISCE CON UNION E CONTROL FLOW (perche' funziona)
// ---------------------------------------------------------------------------
// Aggiungere un campo discriminante a interface unite fa scattare il narrowing.
// Costruiamo una macchina a stati per una Timbratura e mostriamo come il campo
// aggiunto guida la control flow analysis.

interface StatoAperta { fase: "aperta"; entrata: string }
interface StatoChiusa { fase: "chiusa"; entrata: string; uscita: string }
type StatoTimbratura = StatoAperta | StatoChiusa;

// Il discriminante "fase" permette a TS di restringere il tipo in ogni branch.
function durataMinuti(s: StatoTimbratura): number | null {
  if (s.fase === "aperta") {
    // qui s e' StatoAperta: s.uscita NON esiste.
    // return toMin(s.uscita) - toMin(s.entrata); // ERRORE TS: 'uscita' non esiste su StatoAperta.
    return null;
  }
  // narrowing: qui s e' StatoChiusa, uscita e' garantita.
  return toMin(s.uscita) - toMin(s.entrata);
}
function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
durataMinuti({ fase: "chiusa", entrata: "08:00", uscita: "17:00" }); // => 540

// ---------------------------------------------------------------------------
// 8) PATTERN TYPE-LEVEL: DERIVARE UN TIPO DALLA MAPPA AUGMENTATA
// ---------------------------------------------------------------------------
// Poiche' l'augmentation modifica una interface "registro", possiamo calcolare
// tipi derivati da essa. Esempio: una union discriminata generata dagli eventi.

// Trasformiamo EventBus.EventMap (augmentata) in una union di messaggi { type, payload }.
type EventUnion = {
  [K in keyof EventBus.EventMap]: {
    type: K;
    payload: EventBus.EventMap[K];
  }
}[keyof EventBus.EventMap];
// EventUnion =
//   | { type: "timbratura:creata"; payload: { dipendenteId: number; ora: string } }
//   | { type: "dipendente:aggiornato"; payload: { id: number; campi: string[] } }
//   | { type: "reparto:chiuso"; payload: { reparto: string; turno: "P4"|"P2"|"STD" } }

// Un dispatcher esaustivo sulla union derivata (se aggiungo un evento e non lo
// gestisco, il branch default lo intercetta a livello di tipo con "never").
function describe(ev: EventUnion): string {
  switch (ev.type) {
    case "timbratura:creata":
      return `nuova timbratura dip#${ev.payload.dipendenteId} @ ${ev.payload.ora}`;
    case "dipendente:aggiornato":
      return `dip#${ev.payload.id} campi: ${ev.payload.campi.join(",")}`;
    case "reparto:chiuso":
      return `reparto ${ev.payload.reparto} turno ${ev.payload.turno}`;
    default: {
      // Se la union non e' esaurita, ev qui NON e' never -> ERRORE alla riga sotto.
      const _exhaustive: never = ev;
      return _exhaustive;
    }
  }
}
describe({ type: "reparto:chiuso", payload: { reparto: "R2", turno: "STD" } });
// => "reparto R2 turno STD"

// ---------------------------------------------------------------------------
// 9) GOTCHA / PITFALLS (trappole classiche della module augmentation)
// ---------------------------------------------------------------------------

// PITFALL A - "declare global" in un file che NON e' un modulo.
// Se il file non ha alcun import/export e' uno "script" globale, e li' "declare global"
// e' illegale (sei GIA' nel global scope). Soluzione: rendi il file un modulo aggiungendo
// "export {}" in fondo. Questo file esporta simboli in fondo, quindi e' a posto.
// (Errore che vedresti in un file-script:)
//   declare global { interface Window { X: number } }
//   // ERRORE TS: Augmentations for the global scope can only be nested in
//   //           external modules or ambient module declarations.

// PITFALL B - "declare module" in un file che e' GIA' un modulo (script vs module).
// In un file con import/export al top-level (come QUESTO), "declare module 'pkg'" e'
// interpretato come AUGMENTATION di 'pkg'; se 'pkg' non e' risolvibile:
//   declare module "config-lib" { export interface AppConfig { x: number } }
//   // ERRORE TS 2664: Invalid module name in augmentation, module 'config-lib'
//   //                 cannot be found.
// Regola pratica:
//  - per AUGMENTARE un modulo reale -> import "pkg"; declare module "pkg" { export interface ... }
//  - per DICHIARARE da zero un ambient module (lib senza .d.ts) -> mettilo in un file
//    .d.ts o in uno "script" (file senza import/export), non in un module.
// Per questo qui abbiamo simulato le librerie con dei namespace: il meccanismo di
// merge e' identico e resta tutto compilabile in un unico file-modulo.

// PITFALL C - cambiare il tipo di un campo esistente via augmentation.
// L'augmentation puo' solo AGGIUNGERE membri, non ridefinire tipi incompatibili.
// namespace ErpHttpLib { export interface Request { method: number } }
// // ERRORE TS: subsequent property declarations must have the same type
// //           (property 'method' deve restare 'string').

// PITFALL D - dimenticare "var" nelle globali con "declare global".
// Le variabili globali dichiarate DEVONO usare "var" (non let/const) per finire
// sul globalThis in modo visibile ovunque.
// declare global { const ERP_X: number } // ERRORE TS: A 'const' initializer in an
//                                         // ambient context must be a literal... (e non
//                                         // diventa una vera global mutabile). Usa "var".

// PITFALL E - collisione tra augmentation di piu' plugin.
// Se due augmentation aggiungono lo STESSO campo con tipi diversi, si ha lo stesso
// errore del PITFALL C. Convenzione: campi opzionali e namespaced (es. user?, erp_reparto?)
// per ridurre le collisioni tra plugin che estendono lo stesso Request.

// ---------------------------------------------------------------------------
// 10) MINI-RIEPILOGO OPERATIVO CON UN ESEMPIO CHE CONCATENA I PEZZI
// ---------------------------------------------------------------------------
// Mettiamo insieme: Request augmentata (user) + validazione badge/orario di dominio,
// simulando un handler ERP che legge un utente iniettato e valida i dati.

const BADGE_RE = /^UP-\d{3}$/;       // badge tipo "UP-001"
const ORARIO_RE = /^\d{2}:\d{2}$/;   // orario "HH:MM"

function isBadge(x: string): boolean { return BADGE_RE.test(x); }
function isOrario(x: string): boolean { return ORARIO_RE.test(x); }

// L'handler usa ErpHttpLib.Request (augmentata) e i tipi ERP; e' pura logica di tipo.
function handleTimbratura(req: ErpHttpLib.Request, badge: string, ora: string): string {
  if (!req.user) return "401 non autenticato";               // req.user viene dall'augmentation
  if (req.user.ruolo !== "Operatore" && req.user.ruolo !== "Admin") return "403 vietato";
  if (!isBadge(badge)) return `400 badge non valido: ${badge}`;
  if (!isOrario(ora)) return `400 orario non valido: ${ora}`;
  return `201 timbratura ok per ${badge} @ ${ora} (by dip#${req.user.id})`;
}
handleTimbratura(
  { method: "POST", url: "/timb", user: { id: 3, ruolo: "Operatore" } },
  "UP-014",
  "08:30",
); // => "201 timbratura ok per UP-014 @ 08:30 (by dip#3)"

// Export locali (rende questo file un MODULO, requisito per "declare global").
// Esportiamo SOLO simboli definiti qui sopra.
export { readUser, printBuild, describe, handleTimbratura, isBadge, isOrario };
export type { Utente, StatoTimbratura, EventUnion, Dipendente, Timbratura };

/*
 * ==========================================================================
 * RIEPILOGO COMANDI / CONCETTI (ripasso veloce)
 * ==========================================================================
 * - Declaration merging: due INTERFACE stesso nome/scope -> si fondono (i type alias NO).
 * - Merge non puo' ridefinire un membro esistente con tipo incompatibile (solo aggiunge).
 * - Augmentare module esterno: import "pkg"; declare module "pkg" { export interface X {...} }.
 * - Augmentare interface interna a un module -> usare "export interface" (fa merge).
 * - declare module "nome" per CREARE un ambient module (lib senza .d.ts): va in .d.ts o in uno "script".
 * - In un file-modulo, declare module "pkg" = AUGMENTATION: se pkg non e' risolvibile -> TS2664.
 * - declare global { ... } -> aggiunge al global scope; DEVE stare in un modulo (usa export {} se serve).
 * - Globali dichiarate: usare "var" (non let/const) per renderle vere global.
 * - Estendere built-in: declare global { interface Array<T> { ... } } / interface Window { ... }.
 * - Pattern "registry": lib espone interface VUOTA (EventMap), l'utente la augmenta -> tipi derivati.
 * - Mapped type su interface augmentata -> generare Emitter/union esaustiva da chiavi registrate.
 * - Aggiungere discriminante fa scattare narrowing / control flow analysis (never = esaustivita').
 * - namespace X {} riaperto -> stesso merge di interface: utile per SIMULARE moduli senza npm.
 * - Helper Equal/Expect -> test di tipo che falliscono in compilazione se il tipo cambia.
 * - PITFALL: script vs module (export {}), declare module in un modulo (TS2664), ridefinire campi, "var" mancante, collisioni plugin.
 * - Le FUNCTION dei module non fanno merge come le interface: per estendere, augmenta INTERFACE.
 * ==========================================================================
 */
