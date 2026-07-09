/**
 * 028_TS_Index_Signatures.ts
 * File numero 28 del corso di TypeScript - Titolo: "Index signatures".
 * Livello: FUNDAMENTALS.
 * Argomento: come tipizzare oggetti con chiavi dinamiche tramite index signatures
 * ([key: string]: T e [key: number]: T), i loro vincoli, un cenno a Record<K, V>,
 * il pattern "mappa reparti per codice" del dominio ERP Polyuretech e il problema
 * classico delle chiavi mancanti che il type system NON segnala di default.
 * Tutto il codice compila con: tsc --strict (target ES2022, lib ES2022+DOM, noEmit).
 */

// ============================================================================
// 1. IL PROBLEMA: perche' servono le index signatures
// ============================================================================

// Un oggetto "normale" ha chiavi note e fisse: TypeScript conosce ogni proprieta'.
interface DipendenteFisso {
  id: number;
  nome: string;
}
// Qui NON possiamo aggiungere chiavi arbitrarie:
const d1: DipendenteFisso = { id: 1, nome: "Anna" };
// d1["reparto"] = "Verniciatura";
// ERRORE TS: Property 'reparto' does not exist on type 'DipendenteFisso'.

// Spesso pero' serve una "mappa" (dictionary) con chiavi non note a priori:
// es. tradurre un codice reparto -> nome esteso. Qui entra la index signature.

// ============================================================================
// 2. SINTASSI BASE: [key: string]: T
// ============================================================================

// Una index signature dice: "qualsiasi chiave di tipo string mappa a un valore T".
interface MappaStringhe {
  [codice: string]: string;
}

const nomiReparti: MappaStringhe = {
  VRN: "Verniciatura",
  ASS: "Assemblaggio",
  MAG: "Magazzino",
};
// Ora possiamo leggere/scrivere qualsiasi chiave string:
nomiReparti["QC"] = "Controllo Qualita'";
const x1 = nomiReparti["VRN"]; // tipo: string  => "Verniciatura"

// Il nome della chiave ("codice") e' puramente documentale: puoi chiamarlo come vuoi.
interface MappaNumeri {
  [chiaveQualsiasi: string]: number;
}
const contatori: MappaNumeri = { entrate: 0, uscite: 0 };
contatori["ritardi"] = 3; // ok

// ============================================================================
// 3. [key: number]: T e la relazione string/number
// ============================================================================

// Le index signatures possono usare number come tipo di chiave.
// Utile per strutture "array-like" indicizzate da id numerico.
interface DipendentePerId {
  [id: number]: string; // id numerico -> nome dipendente
}
const perId: DipendentePerId = {
  1: "Anna",
  2: "Bruno",
  42: "Carla",
};
const nome42 = perId[42]; // tipo: string  => "Carla"

// VINCOLO IMPORTANTE: in JavaScript le chiavi oggetto sono sempre string
// (perId[1] e perId["1"] sono la stessa chiave). Per questo TypeScript impone
// che se hai SIA una index signature number SIA una string, il tipo del valore
// number deve essere assegnabile a quello string.
interface Mista {
  [id: number]: string; // deve essere sotto-tipo del valore string
  [chiave: string]: string;
}
const mista: Mista = { 1: "uno", primo: "one" };
void mista;

// Questo invece NON e' permesso:
// interface MistaRotta {
//   [id: number]: number;   // valore number
//   [chiave: string]: string; // valore string
// }
// ERRORE TS: 'number' index type 'number' is not assignable to 'string' index type 'string'.

// ============================================================================
// 4. VINCOLO: le proprieta' esplicite devono essere compatibili con l'index
// ============================================================================

// Se aggiungi proprieta' nominate accanto a una index signature, il loro tipo
// deve essere assegnabile al tipo del valore dell'index.
interface StatistichePresenze {
  totale: number; // proprieta' esplicita: number -> ok, compatibile
  [giorno: string]: number; // tutte le altre chiavi -> number
}
const stat: StatistichePresenze = { totale: 20, lunedi: 4, martedi: 5 };
void stat;

// Se il tipo esplicito NON e' compatibile, errore:
// interface StatRotta {
//   nome: string;              // string
//   [giorno: string]: number;  // number
// }
// ERRORE TS: Property 'nome' of type 'string' is not assignable to 'string' index type 'number'.

// Soluzione comune: allargare il tipo del valore con una union.
interface StatFlessibile {
  nome: string;
  [chiave: string]: string | number; // ora string e number sono entrambi ok
}
const statF: StatFlessibile = { nome: "Settimana 27", totale: 20, lunedi: 4 };
void statF;

// ============================================================================
// 5. INDEX SIGNATURE readonly
// ============================================================================

// Puoi rendere immutabili i valori tramite readonly davanti all'index signature.
interface MappaReadonly {
  readonly [codice: string]: string;
}
const repartiRO: MappaReadonly = { VRN: "Verniciatura" };
const nomeVrn = repartiRO["VRN"]; // tipo: string  => "Verniciatura"
// repartiRO["VRN"] = "Altro";
// ERRORE TS: Index signature in type 'MappaReadonly' only permits reading.

// ============================================================================
// 6. CENNO A Record<K, V> (la scorciatoia idiomatica)
// ============================================================================

// Record<Keys, Value> e' un utility type che genera un oggetto con quelle chiavi.
// Con chiavi generiche string/number equivale a una index signature.
type MappaRecord = Record<string, string>;
const nomiReparti2: MappaRecord = { VRN: "Verniciatura", ASS: "Assemblaggio" };
nomiReparti2["MAG"] = "Magazzino"; // ok, come [key: string]: string

// La forza di Record e' con chiavi da una union literal: le chiavi diventano NOTE
// e OBBLIGATORIE (a differenza dell'index signature che ammette chiavi arbitrarie).
type Turno = "P4" | "P2" | "STD";
type OreTurno = Record<Turno, number>;
const oreDiTurno: OreTurno = { P4: 4, P2: 2, STD: 8 };
const oreP4 = oreDiTurno.P4; // tipo: number  => 4
// Se dimentichi una chiave della union, errore:
// const oreParziali: OreTurno = { P4: 4, P2: 2 };
// ERRORE TS: Property 'STD' is missing in type '{ P4: number; P2: number; }'.

// Nota: Record<Turno, number> NON e' una index signature vera e propria,
// quindi oreDiTurno["ALTRO"] NON compila (chiave non nella union). E' piu' sicuro.

// ============================================================================
// 7. DOMINIO ERP: mappa reparti per codice
// ============================================================================

// Modelliamo il pattern reale: dato un codice reparto, ottenere la sua descrizione.
interface Reparto {
  codice: string;
  nome: string;
  responsabile: string;
}

// Mappa "codice reparto" -> Reparto, tramite index signature.
interface MappaReparti {
  [codice: string]: Reparto;
}

const reparti: MappaReparti = {
  VRN: { codice: "VRN", nome: "Verniciatura", responsabile: "Anna" },
  ASS: { codice: "ASS", nome: "Assemblaggio", responsabile: "Bruno" },
  MAG: { codice: "MAG", nome: "Magazzino", responsabile: "Carla" },
};

// Lookup tipizzato:
const rep = reparti["VRN"]; // tipo: Reparto
const respVrn = reparti["VRN"].responsabile; // tipo: string  => "Anna"

// Aggiunta dinamica di un nuovo reparto a runtime:
reparti["QC"] = { codice: "QC", nome: "Controllo Qualita'", responsabile: "Dario" };

// ============================================================================
// 8. IL PROBLEMA DELLE CHIAVI MANCANTI (il trabocchetto piu' comune)
// ============================================================================

// Con [key: string]: T, TypeScript assume che OGNI accesso restituisca T,
// ANCHE per chiavi che a runtime NON esistono. Questo e' pericoloso.
const inesistente = reparti["NON_ESISTE"]; // tipo: Reparto (bugia!) => undefined a runtime
// TypeScript crede sia sempre un Reparto, ma a runtime e' undefined:
// const nomeCrash = reparti["NON_ESISTE"].nome;
// tipo statico: string, ma a runtime -> TypeError: Cannot read properties of undefined.

// SOLUZIONE 1: attivare il flag "noUncheckedIndexedAccess" nel tsconfig.
// Con quel flag ogni accesso via index diventa "T | undefined" e ti costringe
// a gestire il caso mancante. Esempio di come si comporterebbe:
//   const r = reparti["X"]; // tipo: Reparto | undefined
//   r.nome;                 // ERRORE TS: Object is possibly 'undefined'.

// SOLUZIONE 2 (indipendente dal flag): modellare esplicitamente la possibilita'
// di assenza mettendo "| undefined" nel valore dell'index signature.
interface MappaRepartiSicura {
  [codice: string]: Reparto | undefined;
}
const repartiSicuri: MappaRepartiSicura = { ...reparti };
const forse = repartiSicuri["VRN"]; // tipo: Reparto | undefined
// Ora il compilatore ti obbliga a controllare prima di usare:
// forse.nome;
// ERRORE TS: 'forse' is possibly 'undefined'.

// Narrowing corretto con un guard:
function nomeReparto(codice: string): string {
  const r = repartiSicuri[codice]; // tipo: Reparto | undefined
  if (r === undefined) {
    return "Reparto sconosciuto";
  }
  return r.nome; // qui r e' Reparto (narrowed)
}
const n1 = nomeReparto("VRN"); // => "Verniciatura"
const n2 = nomeReparto("ZZZ"); // => "Reparto sconosciuto"

// SOLUZIONE 3: verifica di presenza a runtime prima dell'accesso.
function haReparto(codice: string): boolean {
  return Object.prototype.hasOwnProperty.call(reparti, codice);
}
const c1 = haReparto("VRN"); // => true
const c2 = haReparto("ZZZ"); // => false

// ============================================================================
// 9. ESEMPIO ERP: contare timbrature per badge
// ============================================================================

// Badge nel formato "UP-001"; regex di validazione richiesta dal dominio.
const BADGE_RE = /^UP-\d{3}$/;
const ORARIO_RE = /^\d{2}:\d{2}$/;

interface Timbratura {
  badge: string; // es. "UP-001"
  entrata: string; // orario naive-UTC "HH:MM"
  uscita: string; // orario naive-UTC "HH:MM"
}

// Aggreghiamo il numero di timbrature per ciascun badge in una mappa.
function conteggioPerBadge(timbrature: readonly Timbratura[]): Record<string, number> {
  const conteggio: Record<string, number> = {};
  for (const t of timbrature) {
    if (!BADGE_RE.test(t.badge) || !ORARIO_RE.test(t.entrata)) continue;
    // Accesso con default per gestire la chiave "mancante" al primo incontro:
    const attuale = conteggio[t.badge] ?? 0; // undefined -> 0
    conteggio[t.badge] = attuale + 1;
  }
  return conteggio;
}

const timbrature: Timbratura[] = [
  { badge: "UP-001", entrata: "08:00", uscita: "17:00" },
  { badge: "UP-001", entrata: "08:05", uscita: "17:10" },
  { badge: "UP-002", entrata: "09:00", uscita: "18:00" },
];
const conteggi = conteggioPerBadge(timbrature);
// conteggi => { "UP-001": 2, "UP-002": 1 }
const upUno = conteggi["UP-001"]; // tipo: number  => 2

// ============================================================================
// 10. INDEX SIGNATURE CON TIPI DI CHIAVE RISTRETTI (template literal)
// ============================================================================

// Da TS 4.4+ puoi usare template literal types come chiave dell'index signature,
// restringendo quali stringhe sono ammesse. Qui: solo chiavi che iniziano con "UP-".
interface MappaBadge {
  [badge: `UP-${string}`]: string; // codice badge -> nome dipendente
}
const dipendentiPerBadge: MappaBadge = {
  "UP-001": "Anna",
  "UP-002": "Bruno",
};
dipendentiPerBadge["UP-003"] = "Carla"; // ok
// dipendentiPerBadge["X-999"] = "Errato";
// ERRORE TS: Property 'X-999' is incompatible with index signature (chiave non "UP-...").

// ============================================================================
// 11. ITERARE UNA MAPPA CON INDEX SIGNATURE
// ============================================================================

// for...in enumera le chiavi (sempre come string). Object.entries e' piu' tipizzato.
function elencoResponsabili(m: MappaReparti): string[] {
  const out: string[] = [];
  for (const codice in m) {
    // codice: string; m[codice]: Reparto
    out.push(`${codice}: ${m[codice].responsabile}`);
  }
  return out;
}
const responsabili = elencoResponsabili(reparti);
// => ["VRN: Anna", "ASS: Bruno", "MAG: Carla", "QC: Dario"]

// Object.keys / Object.values / Object.entries tornano tipi utili:
const chiavi = Object.keys(reparti); // tipo: string[]
const valori = Object.values(reparti); // tipo: Reparto[]
const coppie = Object.entries(reparti); // tipo: [string, Reparto][]
void chiavi;
void valori;
void coppie;

// ============================================================================
// 12. INDEX SIGNATURE vs Map (cenno)
// ============================================================================

// Per mappe dinamiche complesse, la Map nativa e' spesso preferibile a un oggetto:
// - accetta chiavi non-string, non ha problemi di prototype pollution
// - .get() ritorna sempre "V | undefined" (chiavi mancanti gestite dal tipo!)
const mappaRep = new Map<string, Reparto>();
mappaRep.set("VRN", { codice: "VRN", nome: "Verniciatura", responsabile: "Anna" });
const viaMap = mappaRep.get("VRN"); // tipo: Reparto | undefined (piu' sicuro)
const viaMapAssente = mappaRep.get("ZZZ"); // tipo: Reparto | undefined => undefined
void viaMap;
void viaMapAssente;

// ============================================================================
// EXPORT (solo simboli locali di questo file)
// ============================================================================

export {
  nomiReparti,
  reparti,
  repartiSicuri,
  nomeReparto,
  haReparto,
  conteggioPerBadge,
  elencoResponsabili,
  mappaRep,
};
export type {
  MappaStringhe,
  MappaReparti,
  MappaRepartiSicura,
  Reparto,
  Timbratura,
  Turno,
  OreTurno,
  MappaBadge,
};

/*
 * ============================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================================
 * - Index signature: { [key: string]: T } consente chiavi dinamiche di tipo T.
 * - Chiave string: [k: string]: T  -> qualsiasi nome di proprieta'.
 * - Chiave number: [k: number]: T  -> id numerici; in JS diventano string.
 * - Vincolo string/number: il valore dell'index number deve essere assegnabile
 *   a quello dell'index string (se coesistono).
 * - Proprieta' esplicite accanto a un index devono avere tipo compatibile col
 *   valore dell'index (allarga con union tipo string | number se serve).
 * - readonly [k: string]: T  -> mappa a sola lettura.
 * - Record<K, V>: scorciatoia; con union literal le chiavi diventano NOTE e
 *   obbligatorie (piu' sicuro di una index signature aperta).
 * - Template literal key: [k: `UP-${string}`]: T -> restringe le chiavi ammesse.
 * - TRABOCCHETTO chiavi mancanti: m["assente"] e' tipizzato T ma a runtime e'
 *   undefined -> crash. Difese:
 *     1) flag tsconfig "noUncheckedIndexedAccess" (accesso diventa T | undefined);
 *     2) modellare il valore come "T | undefined" nell'index signature;
 *     3) hasOwnProperty / controllo prima dell'accesso; oppure usare "?? default".
 * - Iterazione: for...in (chiavi string), Object.keys/values/entries.
 * - Alternativa: Map<K, V> -> .get() ritorna sempre V | undefined (piu' sicuro).
 * ============================================================================
 */
