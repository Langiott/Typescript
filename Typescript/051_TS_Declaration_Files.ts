/**
 * File 051 - Declaration Files (.d.ts)
 * Corso TypeScript - Livello INTERMEDIATE
 *
 * I declaration file (.d.ts) contengono SOLO dichiarazioni di type, senza
 * implementazione (nessun codice eseguibile emesso). Servono a descrivere la
 * "forma" (shape) di librerie JavaScript esistenti, di variabili globali
 * (ambient), o a esporre l'API pubblica di un modulo compilato.
 * Qui vediamo: keyword declare, tipi ambientali (ambient), ambient modules,
 * global augmentation, e come tipizzare una libreria JS non tipizzata.
 * NB: questo file compila come .ts normale; i blocchi tipici da .d.ts sono
 * mostrati come esempi COMMENTATI (in un vero .d.ts non c'e' implementazione).
 */

// ============================================================================
// 1. COSA E' UN .d.ts
// ============================================================================
// Un .d.ts e' un file di sola dichiarazione: descrive i type ma non emette JS.
// Uso tipico:
//   - accanto a una lib JS "mia" (es. lib.js + lib.d.ts)
//   - pacchetti @types/* (DefinitelyTyped) per lib npm senza type propri
//   - dichiarare globali iniettati (es. window.__ERP__, process.env, ecc.)
// Regola d'oro: dentro un .d.ts tutto e' implicitamente "declare" e non ci
// puo' essere codice runtime (niente function body, niente const con valore
// che generi output). Solo signatures.

// Esempio di come apparirebbe un file "erp-utils.d.ts" (qui SOLO commentato):
// // erp-utils.d.ts
// export declare function normalizzaBadge(raw: string): string;
// export declare const VERSIONE_ERP: string;
// export interface DipendenteDTO { id: number; nome: string; }

// ============================================================================
// 2. LA KEYWORD declare
// ============================================================================
// 'declare' dice al compiler: "questo esiste altrove (a runtime), fidati del
// type che ti do, non generare codice". Utile per simboli forniti da JS puro
// o da uno <script> esterno.

// Dichiaro una funzione globale che immagino esista a runtime (es. iniettata).
// Non genera JS: e' solo una promessa di type.
declare function logExterno(msg: string): void;

// Dichiaro una const ambient (valore fornito altrove, es. build-time define).
declare const BUILD_HASH: string;

// Posso usarli come se esistessero (il compiler si fida):
function usaAmbient(): void {
  logExterno("avvio ERP " + BUILD_HASH); // tipizzato, nessun errore di type
}
// usaAmbient(); // NON la chiamo: a runtime logExterno/BUILD_HASH non esistono qui

// ============================================================================
// 3. TIPI AMBIENTALI (ambient) - namespace e variabili globali
// ============================================================================
// 'declare namespace' descrive un oggetto globale con piu' membri (pattern
// classico delle vecchie lib UMD, es. "ErpGlobal.badge(...)").

declare namespace ErpGlobal {
  // union dei ruoli del dominio ERP
  type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

  interface Config {
    apiUrl: string;
    ruoloCorrente: Ruolo;
  }

  // funzioni esposte dalla lib globale
  function init(cfg: Config): void;
  function versione(): string;
}

// Uso del namespace ambient (solo a livello di type, non chiamato a runtime):
function bootstrapErp(): void {
  const cfg: ErpGlobal.Config = {
    apiUrl: "https://polytools.polyuretech.net",
    ruoloCorrente: "Admin", // tipo: ErpGlobal.Ruolo
  };
  ErpGlobal.init(cfg);
  // const v = ErpGlobal.versione(); // tipo: string
}
// bootstrapErp(); // non chiamata: ErpGlobal non esiste a runtime in questo file

// ============================================================================
// 4. AMBIENT MODULE - "declare module 'nome'"
// ============================================================================
// Quando importi una lib JS senza type, puoi dichiararne il modulo. In un vero
// progetto questo sta in un file globals.d.ts. Qui e' COMMENTATO perche' un
// 'declare module' con import reale romperebbe la risoluzione dei moduli.

// // globals.d.ts
// declare module "libreria-legacy" {
//   export interface OpzioniTimbratura { arrotonda: boolean; }
//   export function calcolaOre(entrata: string, uscita: string): number;
//   const _default: { nome: string };
//   export default _default;
// }
// // poi nel codice:
// // import legacy, { calcolaOre } from "libreria-legacy";

// Wildcard module: tipizzare import di asset non-JS (es. import di ".svg").
// // declare module "*.svg" {
// //   const url: string;
// //   export default url;
// // }

// ============================================================================
// 5. GLOBAL AUGMENTATION - estendere type globali esistenti
// ============================================================================
// 'declare global' (dentro un modulo) aggiunge membri a globali gia' esistenti,
// tipico per estendere Window o process.env. Mostrato COMMENTATO perche' in un
// file che e' gia' un modulo va bene, ma qui evitiamo effetti globali reali.

// // declare global {
// //   interface Window {
// //     __ERP__: { ruolo: ErpGlobal.Ruolo; badge: string };
// //   }
// //   namespace NodeJS {
// //     interface ProcessEnv {
// //       DATABASE_URL: string;
// //       ERP_TURNO_DEFAULT: "P4" | "P2" | "STD";
// //     }
// //   }
// // }
// // export {}; // rende il file un modulo cosi' 'declare global' e' valido

// ============================================================================
// 6. INTERFACE MERGING (dichiarazioni che si fondono)
// ============================================================================
// Le interface con lo stesso nome si fondono: e' il meccanismo dietro
// l'augmentation. Qui lo mostriamo in-file (compila davvero).

interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
}

// seconda dichiarazione: si fonde con la prima aggiungendo campi
interface Dipendente {
  ruolo: ErpGlobal.Ruolo;
  reparto?: string;
}

const dip: Dipendente = {
  id: 1,
  nome: "Rossi",
  badge: "UP-001",
  ruolo: "Operatore",
};
// dip ha TUTTI i campi delle due interface fuse

// ============================================================================
// 7. TIPIZZARE UNA LIBRERIA JS: pattern pratico
// ============================================================================
// Supponiamo una lib JS "timbrature.js" con questa API a runtime:
//   validaOrario(s), parseBadge(s), turni (array)
// Definiamo qui i type mock (in un vero progetto starebbero in timbrature.d.ts).
// COMMENTO: queste interface sono MOCK locali, sostituiscono un @types/*.

// Type che descrive la lib esterna (shape):
interface TimbratureLib {
  // ritorna true se l'orario e' "HH:MM" valido
  validaOrario(s: string): boolean;
  // estrae il numero dal badge "UP-001" -> 1
  parseBadge(badge: string): number | null;
  // turni disponibili
  turni: ReadonlyArray<"P4" | "P2" | "STD">;
}

// In un .d.ts scriveremmo:  declare const timbrature: TimbratureLib;
// Qui, per compilare, forniamo un'implementazione fittizia tipata:
const timbrature: TimbratureLib = {
  validaOrario: (s) => /^\d{2}:\d{2}$/.test(s),
  parseBadge: (b) => {
    const m = /^UP-(\d{3})$/.exec(b);
    return m ? Number(m[1]) : null;
  },
  turni: ["P4", "P2", "STD"],
};

console.log(timbrature.validaOrario("07:30")); // => true
console.log(timbrature.validaOrario("7:30")); // => false (manca uno zero)
console.log(timbrature.parseBadge("UP-042")); // => 42
console.log(timbrature.parseBadge("XX-999")); // => null

// ============================================================================
// 8. FUNCTION OVERLOAD in stile declaration
// ============================================================================
// Nei .d.ts si usano molto gli overload: piu' signature, una implementazione.
// (In un .d.ts ci sono SOLO le signature; qui aggiungiamo il body per compilare.)

// overload: con un solo orario ritorna stringa, con due ritorna la differenza
function orario(s: string): string;
function orario(entrata: string, uscita: string): number;
function orario(a: string, b?: string): string | number {
  if (b === undefined) return a;
  const [he, me] = a.split(":").map(Number);
  const [hu, mu] = b.split(":").map(Number);
  return hu * 60 + mu - (he * 60 + me);
}

const o1 = orario("08:00"); // tipo: string
const o2 = orario("08:00", "17:30"); // tipo: number => 570
console.log(o1, o2); // => 08:00 570

// ============================================================================
// 9. declare + class (solo shape, niente implementazione)
// ============================================================================
// In un .d.ts si dichiara la forma di una class esterna senza corpo dei metodi.
// Esempio COMMENTATO (in .d.ts):
// // declare class Turno {
// //   constructor(codice: "P4" | "P2" | "STD");
// //   readonly codice: string;
// //   durataOreStandard(): number;
// // }

// Equivalente compilabile in questo file (con implementazione):
class Turno {
  constructor(public readonly codice: "P4" | "P2" | "STD") {}
  durataOreStandard(): number {
    return this.codice === "STD" ? 8 : 6;
  }
}
const t = new Turno("P4");
console.log(t.durataOreStandard()); // => 6

// ============================================================================
// 10. TYPE-ONLY vs VALUE: cosa vive in un .d.ts
// ============================================================================
// In un .d.ts puoi esportare: type, interface, declare const/function/class,
// declare namespace. NON puoi mettere logica. La distinzione type vs value:
//   - 'export type { X }'  -> solo type, cancellato all'emit
//   - 'export { X }'       -> value (o value+type)
// Qui esportiamo simboli LOCALI (regola del corso: solo simboli del file).

type RuoloErp = ErpGlobal.Ruolo; // alias locale del type ambient

// ============================================================================
// 11. MODULE AUGMENTATION di un modulo esistente (pattern)
// ============================================================================
// Per aggiungere membri a un modulo di terze parti:
// // declare module "libreria-legacy" {
// //   interface OpzioniTimbratura { fusoRoma?: boolean; } // si fonde
// // }
// Il merging vale anche per i moduli, non solo per le interface globali.

// ============================================================================
// 12. TRIPLE-SLASH DIRECTIVES (riferimenti tra .d.ts)
// ============================================================================
// All'inizio di un .d.ts si possono usare direttive tripla-slash per includere
// altre dichiarazioni (mostrate come commento, sono commenti speciali TS):
// /// <reference types="node" />
// /// <reference path="./altre-dichiarazioni.d.ts" />
// Oggi si preferiscono i moduli ES; le triple-slash restano per globali/legacy.

// ============================================================================
// ESPORTI DI ESEMPIO (solo simboli locali di questo file)
// ============================================================================
export { timbrature, orario, Turno, dip };
export type { TimbratureLib, Dipendente, RuoloErp };

/*
============================================================================
RIEPILOGO COMANDI / CONCETTI
============================================================================
- .d.ts: SOLO dichiarazioni di type, nessun JS emesso, tutto implicit "declare".
- declare function / declare const: promette che un simbolo esiste a runtime.
- declare namespace: descrive un oggetto globale multi-membro (lib UMD/legacy).
- declare module "nome": tipizza una lib JS senza @types.
- declare module "*.ext": wildcard per import di asset (svg, css, ...).
- declare global { ... } + export {}: augmenta globali (Window, ProcessEnv).
- interface merging: interface con stesso nome si fondono (base dell'augment).
- module augmentation: aggiungere membri a un modulo esterno via declare module.
- overload: piu' signature, una sola implementazione (tipico nei .d.ts).
- declare class: shape di una class esterna senza corpo dei metodi.
- export type {} = solo type (cancellato all'emit); export {} = value.
- triple-slash: /// <reference types="..."> e /// <reference path="...">.
- @types/* (DefinitelyTyped): pacchetti di .d.ts per lib npm non tipizzate.
- Regola: in un .d.ts niente logica runtime, solo signatures.
============================================================================
*/
