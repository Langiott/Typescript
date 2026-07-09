/**
 * File 048 - Indexed Access Types (T[K])
 * Corso TypeScript - Livello INTERMEDIATE
 * In questo file vediamo gli indexed access types: il modo per "leggere"
 * il tipo di una property tramite la sua chiave, esattamente come si accede
 * a un valore con la bracket notation ma a livello di type system.
 * Copriamo: T[K], T["prop"], T[keyof T], element di array con T[number],
 * lookup annidati e pattern utili nel dominio ERP Polyuretech.
 * NOTA: nessuna libreria esterna, tutti i tipi sono definiti qui.
 */

// ============================================================
// 1. BASE: T["prop"] - leggere il tipo di una singola property
// ============================================================

// Entita di dominio: un Dipendente ERP.
interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
  attivo: boolean;
}

// Estraggo il tipo di una property usando la sua chiave letterale.
type IdDipendente = Dipendente["id"]; // tipo: number
type NomeDipendente = Dipendente["nome"]; // tipo: string

// L'esempio piu utile della guida: estrarre il tipo dell'union "ruolo".
type Ruolo = Dipendente["ruolo"];
// tipo: "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay"

// Uso il tipo estratto come parametro: se cambio Dipendente, si aggiorna solo.
function haPermessiAdmin(ruolo: Ruolo): boolean {
  return ruolo === "SuperAdmin" || ruolo === "Admin";
}

// La chiave DEVE esistere, altrimenti errore.
// type Boh = Dipendente["telefono"];
// ERRORE TS: Property 'telefono' does not exist on type 'Dipendente'.

// ============================================================
// 2. ACCESSO MULTIPLO: T[K1 | K2] restituisce l'union dei tipi
// ============================================================

// Passando un union di chiavi ottengo l'union dei tipi corrispondenti.
type IdOppureNome = Dipendente["id" | "nome"]; // tipo: string | number
type FlagOStringa = Dipendente["attivo" | "badge"]; // tipo: string | boolean

// ============================================================
// 3. T[keyof T] - il tipo di TUTTI i valori dell'oggetto
// ============================================================

// keyof T produce l'union delle chiavi; T[keyof T] l'union dei value type.
type ChiaviDipendente = keyof Dipendente;
// tipo: "id" | "nome" | "badge" | "ruolo" | "attivo"

type ValoriDipendente = Dipendente[keyof Dipendente];
// tipo: string | number | boolean
// (le due union letterali di badge/ruolo collassano dentro string)

// Pattern: una config dove i valori possono essere "qualsiasi value" dell'entita.
const snapshot: Record<ChiaviDipendente, ValoriDipendente> = {
  id: 1,
  nome: "Mario Rossi",
  badge: "UP-001",
  ruolo: "Operatore",
  attivo: true,
};

// ============================================================
// 4. T[number] - element type di un array o tupla
// ============================================================

// Dato un array type, T[number] estrae il tipo dell'elemento.
type ListaRuoli = Ruolo[];
type ElementoRuolo = ListaRuoli[number]; // tipo: Ruolo (union dei 4 ruoli)

// Funziona anche partendo da un valore, tramite typeof.
const turniValidi = ["P4", "P2", "STD"] as const;
type Turno = (typeof turniValidi)[number]; // tipo: "P4" | "P2" | "STD"

function descriviTurno(t: Turno): string {
  return `Turno selezionato: ${t}`;
}
// descriviTurno("P4"); // OK
// descriviTurno("P9"); // ERRORE TS: '"P9"' non e assegnabile a Turno.

// Su una tupla, T[number] unisce i tipi di tutte le posizioni.
type Coppia = [string, number];
type ElementoCoppia = Coppia[number]; // tipo: string | number

// Mentre l'accesso posizionale usa l'indice letterale.
type Primo = Coppia[0]; // tipo: string
type Secondo = Coppia[1]; // tipo: number

// ============================================================
// 5. LOOKUP ANNIDATO: attraversare piu livelli
// ============================================================

// Struttura piu profonda: una Timbratura con orari e reparto annidato.
interface Reparto {
  codice: string;
  nome: string;
}

interface Timbratura {
  dipendenteId: number;
  entrata: string; // orario naive-UTC "HH:MM"
  uscita: string; // orario naive-UTC "HH:MM"
  reparto: Reparto;
  note: string[];
}

// Concateno le bracket per scendere di livello.
type NomeReparto = Timbratura["reparto"]["nome"]; // tipo: string
type TipoNote = Timbratura["note"]; // tipo: string[]
type SingolaNota = Timbratura["note"][number]; // tipo: string

// Estraggo il tipo di un orario per una funzione di validazione.
type Orario = Timbratura["entrata"]; // tipo: string
const REGEX_ORARIO = /^\d{2}:\d{2}$/;
function orarioValido(o: Orario): boolean {
  return REGEX_ORARIO.test(o);
}
// orarioValido("08:30"); // => true
// orarioValido("8:3");   // => false

// ============================================================
// 6. INDEXED ACCESS CON GENERICS: lookup type-safe
// ============================================================

// Funzione get generica: K e vincolato a keyof T, il return e T[K].
function getProp<T, K extends keyof T>(oggetto: T, chiave: K): T[K] {
  return oggetto[chiave];
}

const dip: Dipendente = {
  id: 7,
  nome: "Anna Bianchi",
  badge: "UP-007",
  ruolo: "Admin",
  attivo: true,
};

const r = getProp(dip, "ruolo"); // r ha tipo: Ruolo (union dei 4 ruoli)
const b = getProp(dip, "badge"); // b ha tipo: string
// getProp(dip, "email"); // ERRORE TS: '"email"' non e assegnabile a keyof Dipendente.

// Anche una set type-safe: il valore deve combaciare con T[K].
function setProp<T, K extends keyof T>(oggetto: T, chiave: K, valore: T[K]): void {
  oggetto[chiave] = valore;
}
setProp(dip, "attivo", false); // OK: attivo e boolean
// setProp(dip, "attivo", "no"); // ERRORE TS: string non assegnabile a boolean.

// ============================================================
// 7. PICK-LIKE: costruire tipi derivati con indexed access
// ============================================================

// Estraggo un "sotto-tipo" combinando piu lookup in un nuovo oggetto.
type AnagraficaMinima = {
  id: Dipendente["id"];
  badge: Dipendente["badge"];
  ruolo: Dipendente["ruolo"];
};
// equivalente a { id: number; badge: string; ruolo: Ruolo }

const anagrafica: AnagraficaMinima = { id: 7, badge: "UP-007", ruolo: "Admin" };

// Pattern mappa: dato un dizionario, ne estraggo il tipo del valore.
interface DizionarioReparti {
  P4: Reparto;
  P2: Reparto;
  STD: Reparto;
}
type ValoreReparto = DizionarioReparti[keyof DizionarioReparti]; // tipo: Reparto
type ChiaveReparto = keyof DizionarioReparti; // tipo: "P4" | "P2" | "STD"

// ============================================================
// 8. ARRAY DI ENTITA: element type di collezioni ERP
// ============================================================

// Da una lista tipizzata, T[number] mi rida' l'entita singola.
type ListaDipendenti = Dipendente[];
type UnDipendente = ListaDipendenti[number]; // tipo: Dipendente

// Utile per funzioni che processano un elemento della collezione.
function badgeDi(elem: ListaDipendenti[number]): string {
  return elem.badge; // tipo: string
}

// Con const assertion posso derivare union di valori concreti da un array.
const badgesNoti = ["UP-001", "UP-002", "UP-007"] as const;
type BadgeNoto = (typeof badgesNoti)[number]; // tipo: "UP-001" | "UP-002" | "UP-007"
const REGEX_BADGE = /^UP-\d{3}$/;
function badgeFormattatoOk(b: string): boolean {
  return REGEX_BADGE.test(b);
}

// ============================================================
// 9. CASI LIMITE E NOTE UTILI
// ============================================================

// (a) Con property opzionale, il lookup include undefined.
interface ConfigTurno {
  nome: string;
  pausaMinuti?: number;
}
type Pausa = ConfigTurno["pausaMinuti"]; // tipo: number | undefined

// (b) Su un Record, l'accesso con la chiave-indice rida' il value type.
type MappaOrari = Record<string, string>;
type ValoreOrario = MappaOrari[string]; // tipo: string

// (c) Indexed access e readonly: si conserva il tipo, non il modificatore.
interface SoloLettura {
  readonly codice: string;
}
type CodiceRO = SoloLettura["codice"]; // tipo: string (readonly non "viaggia")

// (d) Combinare keyof + generics per una funzione "raggruppa per campo".
function valoriDelCampo<T, K extends keyof T>(righe: T[], campo: K): T[K][] {
  return righe.map((r) => r[campo]);
}
const tuttiIRuoli = valoriDelCampo([dip], "ruolo"); // tipo: Ruolo[]
const tuttiGliId = valoriDelCampo([dip], "id"); // tipo: number[]

// Piccolo uso a runtime per evitare simboli "morti" (nessun output reale).
export function demoIndexedAccess(): string {
  const parti = [
    haPermessiAdmin(anagrafica.ruolo),
    descriviTurno("STD"),
    orarioValido(dip.badge.length === 6 ? "08:30" : "00:00"),
    badgeFormattatoOk(b),
    badgeDi(dip),
    r,
    snapshot.nome,
    tuttiIRuoli.length,
    tuttiGliId.length,
    (dip.id as ElementoCoppia) !== undefined,
  ];
  return parti.join(" | ");
}

// Export dei tipi utili per ripasso / riuso locale.
export type {
  Dipendente,
  Ruolo,
  Turno,
  Timbratura,
  Orario,
  UnDipendente,
  BadgeNoto,
  AnagraficaMinima,
  ChiaveReparto,
  ValoreReparto,
  Pausa,
  ElementoRuolo,
};
export { getProp, setProp, valoriDelCampo };

/*
 * ============================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================
 * - T["prop"]           -> tipo di una singola property (es: Dipendente["ruolo"]).
 * - T["a" | "b"]        -> union dei tipi delle chiavi indicate.
 * - keyof T             -> union delle chiavi di T.
 * - T[keyof T]          -> union di TUTTI i value type di T.
 * - T[number]           -> element type di un array o tupla.
 * - Tupla[0], Tupla[1]  -> accesso posizionale con indice letterale.
 * - typeof arr[number]  -> deriva union dai valori (con "as const").
 * - T["a"]["b"]         -> lookup annidato su piu livelli.
 * - <T, K extends keyof T>(o: T, k: K): T[K] -> get/set type-safe.
 * - Property opzionale  -> il lookup include | undefined.
 * - Record<K, V>[K]     -> rida' il value type V.
 * - La chiave inesistente da ERRORE TS a compile-time.
 * - readonly NON si propaga attraverso l'indexed access.
 */
