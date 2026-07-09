/**
 * File 052 - Ambient Declarations (declare)
 * Corso TypeScript - livello INTERMEDIATE.
 * Le "ambient declarations" descrivono al compiler simboli che esistono
 * a runtime ma NON sono definiti in TS (globali del browser, script inclusi
 * via <script>, moduli JS senza tipi). La keyword `declare` dice "fidati,
 * questo esiste": genera SOLO type info, nessun codice emesso (con noEmit
 * nulla viene emesso comunque). Vediamo declare var/function/module, global
 * augmentation e `declare global`, con esempi in dominio ERP Polyuretech.
 */

// Nota: questo file compila con --strict, target ES2022, lib ES2022+DOM, noEmit.
// Tutte le `declare` qui sotto NON creano runtime: promettono solo tipi.

export {}; // rende il file un module: serve per `declare global` piu' avanti.

// ---------------------------------------------------------------------------
// 1) declare var / declare const / declare let
// ---------------------------------------------------------------------------
// Dichiara una variabile globale che qualcun altro (uno <script>, un tag CDN,
// un runtime) ha gia' creato. Il compiler la conosce ma non la emette.

declare const APP_VERSION: string;      // es. iniettata dal bundler come define
declare var __DEBUG__: boolean;         // flag globale legacy stile `var`
declare let CURRENT_TENANT: string;     // multi-tenant id, settato a runtime

// Uso: il tipo e' noto, nessun errore "cannot find name".
const banner = `Polytools v${APP_VERSION}`; // tipo: string
function logIfDebug(msg: string): void {
  if (__DEBUG__) {
    // console.log ha tipo grazie a lib DOM
    console.log(`[${CURRENT_TENANT}] ${msg}`);
  }
}
void logIfDebug; // evita warning "unused"; non chiamato perche' i globali non esistono qui.
void banner;

// ERRORE TS: non puoi assegnare a un `declare const`
// APP_VERSION = "2.0"; // Cannot assign to 'APP_VERSION' because it is a constant.

// ---------------------------------------------------------------------------
// 2) declare function
// ---------------------------------------------------------------------------
// Dichiara la firma di una funzione globale gia' esistente a runtime.
// Nessun body: solo signature. Utile per script legacy inclusi in pagina.

declare function legacyTrackEvent(name: string, payload?: Record<string, unknown>): void;

// Overload ambient: piu' firme, zero implementazione.
declare function parseBadge(input: string): string;
declare function parseBadge(input: number): string;

// Uso tipizzato (non eseguito: la funzione vive altrove):
function esempioTracking(): void {
  legacyTrackEvent("timbratura_ok", { badge: "UP-001" });
  const b = parseBadge(1); // tipo: string
  void b;
}
void esempioTracking;

// ---------------------------------------------------------------------------
// 3) Dominio ERP: tipi base riusati negli esempi
// ---------------------------------------------------------------------------
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  id: number;
  nome: string;
  badge: `UP-${string}`; // template literal type, es. "UP-001"
  ruolo: Ruolo;
}

interface Timbratura {
  dipendenteId: number;
  entrata: string; // "HH:MM" naive-UTC
  uscita: string;  // "HH:MM" naive-UTC
}

const BADGE_RE = /^UP-\d{3}$/;
const ORARIO_RE = /^\d{2}:\d{2}$/;

function isBadge(s: string): boolean {
  return BADGE_RE.test(s); // => true per "UP-042"
}
function isOrario(s: string): boolean {
  return ORARIO_RE.test(s); // => true per "08:30"
}
void isBadge;
void isOrario;

// ---------------------------------------------------------------------------
// 4) declare namespace (ambient namespace)
// ---------------------------------------------------------------------------
// Modella una libreria globale "a oggetti" (stile jQuery/lodash caricata via
// <script>) che espone un namespace globale. Solo tipi, nessuna implementazione.

declare namespace ErpLegacy {
  // Costante esposta dal vecchio script
  const version: string;
  // Funzione utility globale
  function formatBadge(id: number): string; // ritorna "UP-001"
  // Sotto-namespace
  namespace turni {
    function durataMinuti(t: Turno): number;
  }
}

function usaErpLegacy(): void {
  const v = ErpLegacy.version;                 // tipo: string
  const badge = ErpLegacy.formatBadge(1);      // tipo: string
  const durata = ErpLegacy.turni.durataMinuti("P4"); // tipo: number
  void v; void badge; void durata;
}
void usaErpLegacy;

// ---------------------------------------------------------------------------
// 5) declare module: modulo con nome (per JS senza @types)
// ---------------------------------------------------------------------------
// Quando importi un pacchetto JS privo di tipi, un file .d.ts contiene un
// `declare module "nome"`. Qui simuliamo un modulo "erp-badge-utils".
// Nota: DEFINIAMO NOI la shape (mock), il pacchetto reale non esiste.
//
// IMPORTANTE (noEmit + nessun modulo reale): in questo file-module l'uso di
// `declare module "erp-badge-utils"` con successivo `import("erp-badge-utils")`
// darebbe TS2664/TS2307 perche' il modulo non e' risolvibile sul filesystem.
// Per mostrare comunque il PATTERN in un file che compila, dichiariamo il
// modulo come AMBIENT top-level (fuori da qualsiasi augmentation) e NON lo
// importiamo davvero: mostriamo la sua shape via un alias di tipo `typeof`.
// In un vero progetto questo blocco vivrebbe in un file .d.ts separato e
// l'import funzionerebbe normalmente.

// Namespace ambient che simula la "shape" del modulo "erp-badge-utils".
// (In produzione: `declare module "erp-badge-utils" { export function ... }`
//  dentro un file .d.ts, poi `import { normalizeBadge } from "erp-badge-utils"`.)
declare namespace ErpBadgeUtils {
  function normalizeBadge(raw: string): string;
  function badgeToId(badge: `UP-${string}`): number;
  const DEFAULT_PREFIX: "UP";
  // Aggiunta (vedi punto 9 - equivalente della module augmentation):
  function idToBadge(id: number): `UP-${string}`;
}

// Uso tipizzato dello "shape" del modulo ambient: compila perche' il tipo
// esiste; a runtime i simboli non ci sono, percio' resta in funzione non
// chiamata. Serve solo a mostrare il typing.
function esempioModuloAmbient(): void {
  const id = ErpBadgeUtils.badgeToId("UP-007");      // tipo: number
  const norm = ErpBadgeUtils.normalizeBadge(" up-007 "); // tipo: string
  const prefix = ErpBadgeUtils.DEFAULT_PREFIX;       // tipo: "UP"
  void id; void norm; void prefix;
}
void esempioModuloAmbient;

// ---------------------------------------------------------------------------
// 6) Wildcard module: declare module "*.ext"
// ---------------------------------------------------------------------------
// Pattern classico per far accettare import di asset non-JS (svg, css, json...)
// I bundler li trasformano; TS ha solo bisogno di sapere il tipo dell'import.
//
// NOTA (noEmit, file-module): un `declare module "*.svg"` come AUGMENTATION
// richiederebbe che il modulo-pattern sia risolvibile, dando TS2664 in questo
// contesto. Mostriamo quindi il pattern in un blocco commentato "stile .d.ts":
// e' esattamente cio' che scriveresti in un file `globals.d.ts` del progetto.

// --- globals.d.ts (esempio, NON compilato qui) -----------------------------
// declare module "*.svg" {
//   const src: string;
//   export default src;
// }
//
// declare module "*.reparto.json" {
//   interface RepartoData {
//     id: number;
//     nome: string;
//     turnoDefault: "P4" | "P2" | "STD";
//   }
//   const data: RepartoData;
//   export default data;
// }
// ---------------------------------------------------------------------------

// Equivalente "che compila": modelliamo il TIPO dell'asset importato senza
// usare la wildcard-module (che qui non e' risolvibile).
type SvgImport = string; // `import logo from "./x.svg"` -> tipo: string
interface RepartoData {
  id: number;
  nome: string;
  turnoDefault: Turno;
}
type RepartoJsonImport = RepartoData; // default export di "*.reparto.json"

const logoMock: SvgImport = "data:image/svg+xml,<svg/>";
const repartoMock: RepartoJsonImport = { id: 1, nome: "Estrusione", turnoDefault: "P4" };
void logoMock; void repartoMock;

// Esempio d'uso (non eseguito), come apparirebbe col wildcard-module attivo:
// import logo from "./polytools.svg";      // tipo: string
// import p4 from "./p4.reparto.json";      // tipo: RepartoData

// ---------------------------------------------------------------------------
// 7) Global augmentation: aggiungere proprieta' a interfacce esistenti
// ---------------------------------------------------------------------------
// La lib DOM definisce `Window`. Se il nostro codice mette roba su `window`
// (es. window.__ERP__), possiamo AUGMENTARE l'interfaccia esistente cosi'
// che `window.__ERP__` sia tipizzato invece di dare errore.

// Esempio browser: interfaccia dell'app globale attaccata a window.
interface ErpGlobalApi {
  tenant: string;
  ruoloCorrente: Ruolo;
  logout(): void;
}

declare global {
  // Merge dichiarativo con lib.dom Window: aggiunge una proprieta' opzionale.
  interface Window {
    __ERP__?: ErpGlobalApi;
  }
}

// Esempio browser (non eseguito: nessun DOM reale in questo contesto):
function leggiTenantDaWindow(): string {
  // window ha tipo grazie a lib DOM; __ERP__ grazie all'augmentation sopra.
  return window.__ERP__?.tenant ?? "sconosciuto"; // tipo: string
}
void leggiTenantDaWindow;

// ERRORE TS: senza l'augmentation, questo darebbe:
// Property '__ERP__' does not exist on type 'Window & typeof globalThis'.

// ---------------------------------------------------------------------------
// 8) declare global: aggiungere variabili globali nuove
// ---------------------------------------------------------------------------
// Oltre ad augmentare interfacce, dentro `declare global` possiamo dichiarare
// nuove variabili/funzioni globali visibili in tutto il progetto.

declare global {
  // Variabile globale iniettata dall'ambiente ERP.
  var ERP_BUILD_ID: string;
  // Funzione globale di logging aziendale.
  function erpAudit(azione: string, dip?: Dipendente): void;
}

function esempioGlobalReale(): void {
  // Entrambi tipizzati come globali del progetto.
  const build = ERP_BUILD_ID; // tipo: string
  erpAudit("apertura_pannello");
  void build;
}
void esempioGlobalReale;

// Nota importante: `declare global` e' consentito SOLO in un file che e' gia'
// un module (ha import/export). Per questo abbiamo messo `export {}` in cima.
// In un file "script" (senza import/export) NON serve `declare global`:
// basta `declare var` top-level, che e' gia' globale.

// ---------------------------------------------------------------------------
// 9) Module augmentation: estendere un modulo esistente
// ---------------------------------------------------------------------------
// Analogo di global augmentation ma su un modulo: in un progetto reale si
// riapre `declare module "erp-badge-utils"` per AGGIUNGERE una funzione, e il
// declaration merging unisce le due dichiarazioni dello stesso modulo.
//
// NOTA (noEmit, file-module): la module augmentation richiede che il modulo
// "erp-badge-utils" sia risolvibile (altrimenti TS2664). In questo file l'abbiamo
// gia' modellato come namespace ambient `ErpBadgeUtils` (punto 5), dove la
// funzione aggiunta `idToBadge` e' semplicemente un membro in piu' del namespace:
// e' l'equivalente "che compila" della module augmentation.

function esempioAugmentModulo(): void {
  const badge = ErpBadgeUtils.idToBadge(3); // tipo: `UP-${string}` (es. "UP-003")
  void badge;
}
void esempioAugmentModulo;

// ---------------------------------------------------------------------------
// 10) Ambient enum vs const enum (cenno)
// ---------------------------------------------------------------------------
// `declare enum` descrive un enum che esiste altrove a runtime: nessun oggetto
// viene emesso qui, si assume presente. Utile per JS legacy che espone un enum.

declare enum StatoTimbratura {
  Aperta,
  Chiusa,
  Annullata,
}

function descriviStato(s: StatoTimbratura): string {
  // Confronto tipizzato; i valori numerici arrivano dal runtime esterno.
  return s === StatoTimbratura.Chiusa ? "chiusa" : "in corso"; // tipo: string
}
void descriviStato;

// ---------------------------------------------------------------------------
// 11) Pattern: guardia runtime + tipo ambient (sicurezza)
// ---------------------------------------------------------------------------
// `declare` promette al compiler qualcosa che potrebbe NON esistere davvero.
// Best practice: verificare a runtime prima di usare un globale "promesso".

function tenantSicuro(): string {
  // typeof su un possibile globale non emette errore anche se assente.
  if (typeof CURRENT_TENANT === "string" && CURRENT_TENANT.length > 0) {
    return CURRENT_TENANT; // narrowing: string
  }
  return "default";
}
void tenantSicuro;

// Validazione difensiva di dati provenienti da un modulo ambient (mock):
function validaTimbratura(t: Timbratura): boolean {
  return ORARIO_RE.test(t.entrata) && ORARIO_RE.test(t.uscita); // => true/false
}
void validaTimbratura;

// ---------------------------------------------------------------------------
// 12) Esporta simboli LOCALI (solo di questo file)
// ---------------------------------------------------------------------------
export type { Dipendente, Timbratura, Ruolo, Turno };
export { isBadge, isOrario, validaTimbratura, StatoTimbratura };

// ---------------------------------------------------------------------------
// RIEPILOGO COMANDI / CONCETTI
// ---------------------------------------------------------------------------
// - Ambient declaration = `declare`: descrive tipi di cose che esistono a
//   runtime ma non sono scritte in TS; NON emette codice.
// - declare const/var/let: variabili globali gia' esistenti (bundler, script).
// - declare function: firma (anche overload) di funzione globale, senza body.
// - declare namespace: libreria globale "a oggetti" (stile <script> jQuery).
// - declare module "nome": tipizza un pacchetto JS senza @types. ATTENZIONE:
//   con noEmit e senza il modulo reale sul filesystem l'import da' TS2664/2307;
//   il posto giusto e' un file .d.ts separato. Qui usiamo un namespace ambient
//   `ErpBadgeUtils` come equivalente "che compila".
// - declare module "*.ext": wildcard per import di asset (svg/json/css); va in
//   un globals.d.ts del progetto (qui mostrato come blocco commentato .d.ts).
// - declare global { ... }: dentro un module, aggiunge globali/interfacce.
// - Global augmentation: `interface Window { ... }` in declare global -> merge.
// - Module augmentation: riaprire `declare module "x"` per aggiungere membri
//   (richiede modulo risolvibile; qui simulata come membro extra del namespace).
// - declare enum: enum presente a runtime altrove.
// - Un file diventa module con import/export (qui `export {}`): richiesto da
//   `declare global`. File senza import/export = script (declare gia' globale).
// - Sicurezza: `declare` e' una promessa non verificata -> aggiungi guardie
//   runtime (typeof, regex, ?.) prima di fidarti dei globali.
// - I .d.ts sono file di sole dichiarazioni ambient (niente implementazione).
