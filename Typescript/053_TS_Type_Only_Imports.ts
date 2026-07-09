/**
 * File 053 - Type-only imports (import type / export type)
 * Corso TypeScript - Livello INTERMEDIATE.
 * Questo file spiega import/export "type-only": come importare ed esportare
 * SOLO tipi (type, interface) senza portarsi dietro valori a runtime.
 * Temi: import type, export type, import { type X }, verbatimModuleSyntax,
 * isolatedModules e i benefici (bundle piu' leggeri, niente cicli, chiarezza).
 * NB: gli import/export qui usano SOLO simboli definiti in questo stesso file.
 */

// ---------------------------------------------------------------------------
// 1) IL PROBLEMA: type erasure e import "misti"
// ---------------------------------------------------------------------------
// A runtime i tipi (type/interface) NON esistono: vengono cancellati (erased).
// Un normale "import { Foo }" pero' non dice al compilatore se Foo e' un tipo
// o un valore, quindi in alcune configurazioni l'import viene emesso comunque.
// "import type" dichiara esplicitamente che stiamo importando SOLO un tipo,
// e quell'import sparisce completamente dall'output JavaScript.

// Dominio ERP Polyuretech: definiamo le entita' che riuseremo come "tipi".
export type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
export type Turno = "P4" | "P2" | "STD";

export interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
}

export interface Timbratura {
  dipendenteId: number;
  entrata: string; // orario naive-UTC "HH:MM"
  uscita: string;  // orario naive-UTC "HH:MM"
}

export interface Reparto {
  id: number;
  nome: string;
  turnoDefault: Turno;
}

// ---------------------------------------------------------------------------
// 2) export type: esportare SOLO il tipo
// ---------------------------------------------------------------------------
// "export type { ... }" marca l'export come type-only: chi importa sa che
// puo' usarlo solo in posizione di tipo, mai come valore a runtime.
type BadgePattern = `UP-${number}`; // template literal type per il badge
export type { BadgePattern };

// Possiamo anche ri-esportare piu' tipi insieme in un unico export type.
export type { Dipendente as Employee, Timbratura as Clocking };
// Nota: gli alias (as) rinominano il tipo per i consumatori.

// ---------------------------------------------------------------------------
// 3) Un "valore" vero (funzione) da esportare in modo NORMALE
// ---------------------------------------------------------------------------
// Questo NON e' un tipo: esiste a runtime, quindi si esporta con export normale.
export const REGEX_BADGE = /^UP-\d{3}$/;
export const REGEX_ORARIO = /^\d{2}:\d{2}$/;

export function isBadgeValido(badge: string): boolean {
  return REGEX_BADGE.test(badge);
}
// isBadgeValido("UP-001") // => true
// isBadgeValido("XY-1")   // => false

// ---------------------------------------------------------------------------
// 4) import type: la forma "tutto type-only"
// ---------------------------------------------------------------------------
// In un file REALE separato scriveresti (esempi commentati perche' qui non
// possiamo importare da altri file del corso):
//
//   import type { Dipendente, Ruolo } from "./053_TS_Type_Only_Imports";
//   import type Reparto from "./reparti"; // anche il default puo' essere type-only
//
// Vantaggio: l'import viene garantito rimosso dal JS emesso. Se provi a usarlo
// come valore ottieni un errore chiaro:
//
//   import type { REGEX_BADGE } from "./x";
//   REGEX_BADGE.test("UP-001");
//   // ERRORE TS: 'REGEX_BADGE' cannot be used as a value because it was
//   //            imported using 'import type'.

// ---------------------------------------------------------------------------
// 5) import { type X }: import MISTO inline
// ---------------------------------------------------------------------------
// Dalla stessa "source" puoi importare valori e tipi in una sola istruzione,
// marcando i singoli specificatori con la keyword "type":
//
//   import { isBadgeValido, type Dipendente, type Ruolo } from "./util";
//
// Qui isBadgeValido resta un valore (emesso a runtime), mentre Dipendente e
// Ruolo sono type-only inline (cancellati). Utile per non spezzare in due
// istruzioni separate.

// ---------------------------------------------------------------------------
// 6) Uso pratico dei tipi importati/definiti
// ---------------------------------------------------------------------------
// Funzione che valida un dipendente: usa i tipi in posizione di tipo (ok anche
// se fossero type-only) e i valori (regex/funzione) a runtime.
export function validaDipendente(d: Dipendente): boolean {
  return isBadgeValido(d.badge) && d.nome.trim().length > 0;
}
// validaDipendente({ id: 1, nome: "Rossi", badge: "UP-007", ruolo: "Operatore" })
// // => true

// I tipi usati solo in annotazioni sono candidati perfetti a import type.
function durataMinuti(t: Timbratura): number {
  const [h1, m1] = t.entrata.split(":").map(Number);
  const [h2, m2] = t.uscita.split(":").map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}
// durataMinuti({ dipendenteId: 1, entrata: "08:00", uscita: "12:30" }) // => 270
void durataMinuti;

// ---------------------------------------------------------------------------
// 7) type-only import usato come VALORE: perche' e' un errore
// ---------------------------------------------------------------------------
// Un tipo non ha rappresentazione a runtime, quindi non puoi:
//  - istanziarlo con "new"
//  - usarlo in "instanceof"
//  - leggerne proprieta' a runtime
//
//   import type { Dipendente } from "./x";
//   const d = new Dipendente();      // ERRORE TS: only refers to a type
//   if (x instanceof Dipendente) {}  // ERRORE TS: not a value
//
// Se ti serve il costruttore a runtime, allora NON e' type-only: usa import
// normale (e deve essere una class, non una interface).

// ---------------------------------------------------------------------------
// 8) Classi: valore E tipo insieme
// ---------------------------------------------------------------------------
// Una class crea sia un valore (il costruttore) sia un tipo (l'istanza).
// Se ti serve solo il TIPO dell'istanza, puoi importarla come type-only.
export class RepartoService {
  private reparti: Reparto[] = [];
  aggiungi(r: Reparto): void {
    this.reparti.push(r);
  }
  turnoDi(id: number): Turno | undefined {
    return this.reparti.find((r) => r.id === id)?.turnoDefault;
  }
}
// import type { RepartoService } ...  -> puoi annotare "s: RepartoService"
// ma NON puoi fare "new RepartoService()" (serve import normale del valore).

// Esempio: usare la classe SOLO come tipo (annotazione), non come costruttore.
function contaTurno(s: RepartoService, id: number): Turno | "N/D" {
  return s.turnoDi(id) ?? "N/D";
}
void contaTurno;

// ---------------------------------------------------------------------------
// 9) isolatedModules: perche' spinge verso import/export type
// ---------------------------------------------------------------------------
// Con "isolatedModules": true ogni file viene transpilato in ISOLAMENTE (es.
// da Babel/esbuild/swc) senza vedere gli altri file. Il transpiler NON sa se
// un simbolo re-esportato e' un tipo o un valore. Quindi:
//
//   export { Dipendente } from "./x";        // AMBIGUO con isolatedModules
//   // ERRORE TS (isolatedModules): re-export solo di tipo -> usa 'export type'
//
//   export type { Dipendente } from "./x";   // OK: esplicitamente type-only
//
// Regola pratica: con isolatedModules, i re-export di soli tipi DEVONO usare
// "export type" (o "export { type X }") per non rompere il transpiler.

// ---------------------------------------------------------------------------
// 10) verbatimModuleSyntax (cenno): TS 5.x)
// ---------------------------------------------------------------------------
// Flag moderna (sostituisce importsNotUsedAsValues + preserveValueImports).
// Con "verbatimModuleSyntax": true il compilatore emette gli import/export
// ESATTAMENTE come li scrivi:
//  - "import type" / "export type"  -> sempre RIMOSSI dall'output.
//  - "import { ... }" normale        -> sempre MANTENUTO, anche se usato solo
//                                       come tipo (quindi devi marcare i tipi
//                                       con "type" tu stesso, o resta nel JS).
//
// Effetto pratico: la flag ti OBBLIGA a essere esplicito. Esempio:
//
//   import { type Ruolo, isBadgeValido } from "./util";
//   //       ^^^^ type-only inline: rimosso;  isBadgeValido: mantenuto.
//
// Senza il "type", "Ruolo" resterebbe nell'import emesso (import inutile a
// runtime). Con verbatimModuleSyntax questo e' voluto e prevedibile.

// ---------------------------------------------------------------------------
// 11) Beneficio: rompere i CICLI di import (import cycles)
// ---------------------------------------------------------------------------
// Se A importa un TIPO da B e B importa un TIPO da A, un import normale puo'
// creare un ciclo a runtime (con "undefined" temporanei). "import type" toglie
// l'import dal JS emesso -> il ciclo a runtime sparisce, resta solo type-level.
//
// Pseudo-esempio (commentato):
//   // file a.ts
//   import type { B } from "./b"; // solo tipo -> nessun ciclo runtime
//   export interface A { partner: B }
//   // file b.ts
//   import type { A } from "./a"; // solo tipo -> nessun ciclo runtime
//   export interface B { partner: A }

// ---------------------------------------------------------------------------
// 12) Beneficio: tree-shaking e bundle piu' piccoli
// ---------------------------------------------------------------------------
// Un "import type" garantisce che il modulo sorgente NON venga incluso nel
// bundle solo per i suoi tipi. Anche side-effect di import accidentali (es.
// codice che gira al primo require) vengono evitati, perche' l'import sparisce.

// ---------------------------------------------------------------------------
// 13) Pattern ERP: separare "modello (tipi)" da "servizi (valori)"
// ---------------------------------------------------------------------------
// Convenzione utile: un file di soli tipi (models) e un file di logica.
// I consumatori fanno "import type" dai models e import normale dai servizi.
export type ChiaveOrdinamento = keyof Dipendente; // "id"|"nome"|"badge"|"ruolo"

export function ordinaDipendenti(
  lista: Dipendente[],
  chiave: ChiaveOrdinamento,
): Dipendente[] {
  return [...lista].sort((a, b) =>
    String(a[chiave]).localeCompare(String(b[chiave])),
  );
}
// ordinaDipendenti(lista, "badge") // ordina per badge; "id"/"nome"/"ruolo" ok
// ordinaDipendenti(lista, "stipendio")
// // ERRORE TS: '"stipendio"' non e' assegnabile a keyof Dipendente.

// ---------------------------------------------------------------------------
// 14) Tipi mock di libreria (React/Express) definiti QUI
// ---------------------------------------------------------------------------
// NB: NON importiamo pacchetti npm. Mostriamo come, in un progetto reale, i
// tipi di libreria si importano come type-only. Qui definiamo interfacce mock.
export interface ReqMock<Body> {
  body: Body;
  params: Record<string, string>;
}
export interface ResMock {
  json(payload: unknown): void;
  status(code: number): ResMock;
}
// In un file reale con Express installato scriveresti:
//   import type { Request, Response } from "express"; // solo tipi -> erased
// e useresti Request/Response solo nelle annotazioni degli handler.
export type Handler<B> = (req: ReqMock<B>, res: ResMock) => void;

const creaDipendente: Handler<Dipendente> = (req, res) => {
  if (!validaDipendente(req.body)) {
    res.status(400).json({ errore: "dati non validi" });
    return;
  }
  res.status(201).json({ ok: true, badge: req.body.badge });
};
void creaDipendente;

// ---------------------------------------------------------------------------
// 15) import type dynamic (cenno): typeof import(...)
// ---------------------------------------------------------------------------
// Per riferirsi al TIPO di un modulo caricato dinamicamente, senza caricarlo
// davvero, si usa "typeof import(...)". Esempio (commentato, riferimento
// relativo fittizio):
//
//   type ModuloUtils = typeof import("./053_TS_Type_Only_Imports");
//   // ModuloUtils avrebbe: { isBadgeValido: ..., RepartoService: ..., ... }
//
// E' tutto a type-level: nessun import a runtime viene emesso.

// ---------------------------------------------------------------------------
// 16) Riassunto operativo con un piccolo "barrel" locale
// ---------------------------------------------------------------------------
// Un "barrel" e' un file che ri-esporta simboli. Con soli tipi si usa
// "export type", con valori "export". Qui li teniamo separati e chiari.
export type { Reparto as RepartoModel };        // type-only re-export locale
export { validaDipendente as validate };        // value re-export locale (alias)

// ===========================================================================
// RIEPILOGO COMANDI / CONCETTI (ripasso veloce)
// ===========================================================================
// - I tipi sono "erased": non esistono a runtime (type/interface spariscono).
// - import type { X }        -> importa SOLO tipi; import rimosso dal JS.
// - import Def, { ... }      -> normale; puo' emettere l'import a runtime.
// - import { type X, val }   -> misto inline: X type-only, val valore.
// - export type { X }        -> esporta/ri-esporta SOLO tipi (type-only).
// - export { type X, val }   -> misto inline anche in export.
// - Type-only usato come valore -> ERRORE (no new/instanceof/accesso runtime).
// - class = valore + tipo; se serve solo il tipo istanza -> import type ok,
//   ma per "new" serve import normale del valore.
// - isolatedModules: true    -> re-export di soli tipi DEVE usare export type.
// - verbatimModuleSyntax: true -> emette gli import "verbatim"; sii esplicito
//   con "type" o gli import di tipo restano nel bundle.
// - Benefici: bundle piu' piccoli/tree-shaking, niente import cycles a runtime,
//   codice piu' leggibile (tipo vs valore evidente), transpiler-friendly.
// - typeof import("...")      -> tipo di un modulo, tutto a type-level.
// ===========================================================================
