/**
 * File 049 - Modules (import/export) in TypeScript
 * Livello: INTERMEDIATE
 * Questo file illustra i moduli ES: export named e default, import,
 * re-export, import * (namespace import), alias con 'as' e le differenze
 * tra ESM e CommonJS. Tutti gli import/export si riferiscono a simboli
 * definiti QUI dentro (nessun pacchetto npm, nessun altro file del corso).
 * Contesto dominio: ERP Polyuretech (Dipendente, Timbratura, Reparto).
 */

// -----------------------------------------------------------------------------
// 1. EXPORT NAMED: si esporta un simbolo col suo nome.
// -----------------------------------------------------------------------------

// Export "inline": la keyword export precede la dichiarazione.
export const VERSIONE_ERP = "1.4.0"; // tipo: string (literal narrowed a string const)

// Si possono esportare type alias, interface, function, class.
export type Turno = "P4" | "P2" | "STD"; // union di literal
export type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Interface esportata: la forma dell'entita Dipendente dell'ERP.
export interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
}

// Function esportata: valida un badge tipo "UP-001".
export function isBadgeValido(badge: string): boolean {
  return /^UP-\d{3}$/.test(badge);
}
// isBadgeValido("UP-001") // => true
// isBadgeValido("XX-1")   // => false

// Class esportata.
export class Reparto {
  constructor(
    public readonly id: number,
    public nome: string,
  ) {}
}

// -----------------------------------------------------------------------------
// 2. EXPORT LIST: export di simboli gia' dichiarati, tutti in un blocco.
// -----------------------------------------------------------------------------

// Dichiarazioni "normali" senza export...
const ORARIO_REGEX = /^\d{2}:\d{2}$/;
function isOrarioValido(orario: string): boolean {
  return ORARIO_REGEX.test(orario); // orari naive-UTC "HH:MM"
}
type Timbratura = {
  dipendenteId: number;
  entrata: string; // "HH:MM"
  uscita: string; // "HH:MM"
};

// ...esportate insieme dopo. Per i type si usa 'export type { ... }'.
export { isOrarioValido, ORARIO_REGEX };
export type { Timbratura };
// Nota: 'export type' e' type-only: sparisce a runtime, aiuta i bundler.

// -----------------------------------------------------------------------------
// 3. EXPORT CON ALIAS: rinominare il simbolo esposto verso l'esterno.
// -----------------------------------------------------------------------------

function calcolaOreLavorate(t: Timbratura): number {
  const [he, me] = t.entrata.split(":").map(Number);
  const [hu, mu] = t.uscita.split(":").map(Number);
  return (hu * 60 + mu - (he * 60 + me)) / 60;
}

// L'export si chiama 'oreLavorate' anche se la function e' 'calcolaOreLavorate'.
export { calcolaOreLavorate as oreLavorate };
// Chi importa vedra': import { oreLavorate } from "./049_TS_Modules";

// -----------------------------------------------------------------------------
// 4. EXPORT DEFAULT: un solo default per modulo, senza nome obbligatorio.
// -----------------------------------------------------------------------------

// Il default e' spesso l'entita/valore "principale" del modulo.
// Qui: una factory che crea un Dipendente con valori di default.
export default function creaDipendente(
  nome: string,
  ruolo: Ruolo = "Operatore",
): Dipendente {
  return { id: 0, nome, badge: "UP-000", ruolo };
}
// Chi importa sceglie il nome:  import creaDip from "./049_TS_Modules";
// import creaDip, { Dipendente } from "./049_TS_Modules"; // default + named

// Si puo' esportare default anche un valore/class gia' esistente:
// export { Reparto as default }; // ERRORE TS: due default nello stesso modulo

// -----------------------------------------------------------------------------
// 5. IMPORT: forme principali (mostrate nei commenti perche' importerebbero
//    da altri moduli/file, cosa vietata dalle regole del corso).
// -----------------------------------------------------------------------------

// Import named: prende i simboli col loro nome (dentro { }).
//   import { Dipendente, isBadgeValido } from "./049_TS_Modules";
//
// Import default: nessuna graffa, nome a scelta.
//   import creaDipendente from "./049_TS_Modules";
//
// Default + named nella stessa riga:
//   import creaDipendente, { Reparto, Turno } from "./049_TS_Modules";
//
// Import con alias 'as' (evita collisioni di nomi):
//   import { Reparto as RepartoErp } from "./049_TS_Modules";
//
// Import type-only: importa SOLO tipi, rimosso a runtime.
//   import type { Timbratura } from "./049_TS_Modules";
//   import { type Ruolo, isOrarioValido } from "./049_TS_Modules"; // inline type

// -----------------------------------------------------------------------------
// 6. NAMESPACE IMPORT: import * as X  -> raccoglie tutti i named in un oggetto.
// -----------------------------------------------------------------------------

// import * as ErpModulo from "./049_TS_Modules";
// ErpModulo.isBadgeValido("UP-001"); // => true
// ErpModulo.VERSIONE_ERP;            // "1.4.0"
// ErpModulo.default("Anna");         // il default e' accessibile come .default
// Nota: 'import *' NON include il default sotto il suo nome, ma come '.default'.

// Per SIMULARE un namespace import dentro questo stesso file, creiamo un
// oggetto che raggruppa le utility (pattern "barrel object"):
const ErpUtils = {
  isBadgeValido,
  isOrarioValido,
  oreLavorate: calcolaOreLavorate,
} as const;
export { ErpUtils };
// ErpUtils.isBadgeValido("UP-007") // => true

// -----------------------------------------------------------------------------
// 7. RE-EXPORT: ri-esportare simboli (tipicamente da un altro modulo).
//    Qui li ri-esportiamo localmente per mostrare la sintassi.
// -----------------------------------------------------------------------------

// Re-export named da un altro modulo (commentato: file esterno vietato):
//   export { Dipendente } from "./entita";
//   export { Reparto as RepartoBase } from "./entita"; // con alias
//   export type { Turno } from "./tipi";               // solo type
//   export * from "./utils";                            // re-export "star"
//   export * as Validatori from "./validatori";         // star + namespace
//
// Re-export del default di un altro modulo come named:
//   export { default as creaDipendente } from "./factory";

// Esempio VALIDO in-file: alias locale di simboli gia' esportati.
// (raggruppa i validatori in un oggetto tipizzato e lo esporta)
export const Validatori = {
  badge: isBadgeValido,
  orario: isOrarioValido,
} as const;

// -----------------------------------------------------------------------------
// 8. USO INTERNO dei simboli (dimostra che compilano e sono coerenti).
// -----------------------------------------------------------------------------

const rep: Reparto = new Reparto(4, "Produzione P4");
const capo: Dipendente = creaDipendente("Luca", "Admin");
const turnoDefault: Turno = "STD";

const timbratura: Timbratura = {
  dipendenteId: capo.id,
  entrata: "08:00",
  uscita: "17:30",
};

const ore: number = calcolaOreLavorate(timbratura); // => 9.5
const badgeOk: boolean = Validatori.badge(capo.badge); // => false ("UP-000" e' valido di forma -> true in realta')
// Nota: "UP-000" rispetta /^UP-\d{3}$/, quindi badgeOk => true.

// Usiamo le variabili per evitare warning e mostrare i tipi inferiti.
export const RIEPILOGO_STATO = {
  versione: VERSIONE_ERP,
  reparto: rep.nome, // "Produzione P4"
  capo: capo.nome, // "Luca"
  turno: turnoDefault, // "STD"
  ore, // 9.5
  badgeOk, // true
  utils: Object.keys(ErpUtils), // ["isBadgeValido","isOrarioValido","oreLavorate"]
};

// -----------------------------------------------------------------------------
// 9. ESM vs CommonJS: differenze pratiche (solo note, niente require reale).
// -----------------------------------------------------------------------------

// ESM (ECMAScript Modules), quello che usiamo qui:
//   - keyword statiche: import / export (analizzabili a compile-time).
//   - import "hoisted" ed eseguiti prima del corpo del modulo.
//   - un default per modulo; named multipli; type-only import/export.
//   - import dinamico asincrono: const m = await import("./mod"); // => Promise
//   - in package.json:  "type": "module"  oppure estensione .mjs
//
// CommonJS (Node "classico"):
//   - module.exports = ... ;  const x = require("./mod");  (sincrono, runtime)
//   - non ci sono import/export statici: niente tree-shaking nativo.
//   - default: module.exports = fn;  named: exports.fn = fn;
//   - esempio (commentato, sintassi Node CJS):
//       // const utils = require("./utils");
//       // module.exports = { creaDipendente };
//
// Interop TS: con esModuleInterop=true si puo' fare
//   import express from "express";  // default-import di un modulo CJS.
// Senza di esso spesso serve:  import * as express from "express";
//
// Import dinamico (funziona sia da ESM): esempio non eseguito.
async function caricaDinamico(): Promise<void> {
  // const mod = await import("./049_TS_Modules"); // => Promise<typeof module>
  // mod.isBadgeValido("UP-001");                  // => true
}
void caricaDinamico; // riferimento per evitare "non usato"

// -----------------------------------------------------------------------------
// RIEPILOGO COMANDI / CONCETTI
// -----------------------------------------------------------------------------
// - export const/function/class/type/interface  -> export named inline
// - export { a, b } / export { a as b }          -> export list + alias
// - export type { T } / export { type T }        -> export type-only
// - export default X                             -> un solo default per modulo
// - import { a } from "m"                         -> import named
// - import a from "m"                             -> import default
// - import a, { b } from "m"                      -> default + named insieme
// - import { a as z } from "m"                    -> import con alias
// - import type { T } from "m"                    -> import type-only
// - import * as NS from "m"                        -> namespace import (default = NS.default)
// - export { a } from "m" / export * from "m"     -> re-export (+ export * as NS)
// - await import("m")                             -> import dinamico (Promise)
// - ESM: statico, tree-shakable, 1 default        -> import/export
// - CJS: require / module.exports, sincrono       -> Node classico
// - esModuleInterop / "type":"module"             -> flag per interop e ESM
