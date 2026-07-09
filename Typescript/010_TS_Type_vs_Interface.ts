/**
 * 010 - Type vs Interface: differenze pratiche (esempi ERP Polyuretech)
 *
 * In TypeScript possiamo descrivere la forma di un oggetto con "type" (type alias)
 * oppure con "interface". Spesso sono intercambiabili, ma hanno differenze reali:
 * declaration merging, extends vs intersection, union/tuple/primitive, performance.
 * In questo file vediamo QUANDO usare l'uno o l'altro con i tipi del dominio ERP
 * (Dipendente, Turno, Timbratura, badge UP-001, turni P4/P2, stati richiesta).
 */

// =====================================================================
// 1. Le basi: stesso oggetto descritto con type e con interface
// =====================================================================

// Type alias: descrive la forma di un Dipendente (versione "type").
type DipendenteType = {
  id: number;
  codiceBadge: string; // "UP-001"
  nome: string;
  cognome: string;
};

// Interface: la STESSA forma, ma dichiarata con "interface".
interface DipendenteInterface {
  id: number;
  codiceBadge: string; // "UP-001"
  nome: string;
  cognome: string;
}

// Entrambi si usano allo stesso modo per tipare un valore.
const dip1: DipendenteType = { id: 1, codiceBadge: "UP-001", nome: "Mario", cognome: "Rossi" };
const dip2: DipendenteInterface = { id: 2, codiceBadge: "UI-001", nome: "Lucia", cognome: "Bianchi" };

// Sono strutturalmente compatibili: TS confronta la FORMA, non il nome.
const dip3: DipendenteInterface = dip1; // OK: stessa struttura
// tipo di dip3: DipendenteInterface (ma il valore arriva da un DipendenteType)

// =====================================================================
// 2. Estendere: interface "extends" vs type "&" (intersection)
// =====================================================================

// Con interface si eredita con "extends" (leggibile, in stile OOP).
interface EntitaBase {
  id: number;
  archiviato: boolean;
}
interface Reparto extends EntitaBase {
  nome: string; // valore enum TipologiaDipendente
  sigla: string; // 2-4 lettere -> badge, es. "UP"
}

const rep1: Reparto = { id: 5, archiviato: false, nome: "Ufficio_produzione", sigla: "UP" };

// Con type si "estende" tramite intersection (&).
type EntitaBaseT = { id: number; archiviato: boolean };
type RepartoT = EntitaBaseT & {
  nome: string;
  sigla: string;
};

const rep2: RepartoT = { id: 6, archiviato: false, nome: "Colatura", sigla: "CO" };

// Si possono anche mescolare: una interface puo' estendere un type-object.
interface RepartoConLabel extends RepartoT {
  label: string | null;
}
const rep3: RepartoConLabel = { id: 7, archiviato: true, nome: "Collaudo", sigla: "CD", label: "Q.C." };

// =====================================================================
// 3. Differenza CHIAVE: declaration merging (solo interface)
// =====================================================================

// Le interface con lo STESSO nome si fondono automaticamente (merging).
// Utile per estendere tipi di terze parti o aggiungere campi in piu' punti.
interface ConfigApp {
  baseUrl: string;
}
interface ConfigApp {
  timeoutMs: number; // stessa interface, secondo blocco: si fonde col primo
}
// Ora ConfigApp ha ENTRAMBI i campi.
const config: ConfigApp = { baseUrl: "https://polytools.polyuretech.net", timeoutMs: 5000 };

// Con "type" questo NON e' possibile: ridichiarare un type alias e' un errore.
// ERRORE TS: Duplicate identifier 'ConfigAppT'.
//   type ConfigAppT = { baseUrl: string };
//   type ConfigAppT = { timeoutMs: number };

// =====================================================================
// 4. Cosa fa SOLO il type: union, tuple, primitive, mapped, conditional
// =====================================================================

// Union type: elenco chiuso di valori. Le interface NON possono essere union.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type StatoRichiesta = "In attesa" | "Approvato" | "Rifiutato";

const ruoloCorrente: Ruolo = "Operatore";
// ERRORE TS: Type '"Ospite"' is not assignable to type 'Ruolo'.
//   const ruoloErrato: Ruolo = "Ospite";

// Alias di un primitivo (una interface non puo' rappresentare un primitivo).
type Badge = string; // "UP-001"
const b1: Badge = "CO-003";

// Tuple: coppia posizionale con tipi fissi (solo type).
type IntervalloOrario = [inizio: string, fine: string]; // ["08:00", "17:00"]
const turnoStd: IntervalloOrario = ["08:00", "17:00"];
// turnoStd[0] tipo: string ("08:00")

// Mapped type: costruisce un nuovo type mappando le chiavi di un altro.
type Opzionale<T> = { [K in keyof T]?: T[K] };
type RepartoParziale = Opzionale<Reparto>;
const patchReparto: RepartoParziale = { sigla: "UP" }; // tutte le chiavi opzionali: basta una
// patchReparto tipo: { id?, archiviato?, nome?, sigla? }
type _RepartoAttivo = RepartoParziale; // alias solo per riuso

// Conditional type: sceglie un tipo in base a una condizione (solo type).
type SePresente<T> = T extends null | undefined ? never : T;
type OrarioSicuro = SePresente<string | null>; // => string

// =====================================================================
// 5. Optional (?) vs nullable (| null): differenza pratica ERP
// =====================================================================

// Il dominio ERP usa spesso "| null" per i campi opzionali dal DB.
interface DipendenteDb {
  id: number;
  codiceBadge: string;
  emailPersonale: string | null; // presente ma puo' valere null
  dataNascita?: string; // puo' MANCARE del tutto (undefined)
}

// "| null": la chiave DEVE esistere, ma il valore puo' essere null.
const dDb1: DipendenteDb = { id: 1, codiceBadge: "UP-001", emailPersonale: null };
// "?": la chiave puo' essere del tutto assente.
// dataNascita e' omessa sopra: OK grazie a "?".

// ERRORE TS: Property 'emailPersonale' is missing (con "| null" la chiave e' obbligatoria).
//   const dDbErr: DipendenteDb = { id: 2, codiceBadge: "UI-001" };

// =====================================================================
// 6. Discriminated union (turni P4/P2): il type brilla qui
// =====================================================================

// Discriminated union: campo comune "acronimo" fa da discriminante.
interface TurnoP4 {
  acronimo: "P4"; // 4 timbrature, con pausa pranzo
  ingresso: string; // "08:00"
  uscitaPranzo: string; // "12:00"
  rientroPranzo: string; // "13:00"
  uscita: string; // "17:00"
}
interface TurnoP2 {
  acronimo: "P2"; // 2 timbrature, senza pausa
  ingresso: string;
  uscita: string;
}
type Turno = TurnoP4 | TurnoP2;

// Narrowing: TS restringe il type in base al discriminante.
function minutiPausa(t: Turno): number {
  if (t.acronimo === "P4") {
    // qui t e' TurnoP4: uscitaPranzo/rientroPranzo esistono
    return minutiTra(t.uscitaPranzo, t.rientroPranzo);
  }
  // qui t e' TurnoP2: nessuna pausa
  return 0;
}

function minutiTra(a: string, b: string): number {
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  };
  return toMin(b) - toMin(a);
}

const p4: TurnoP4 = { acronimo: "P4", ingresso: "08:00", uscitaPranzo: "12:00", rientroPranzo: "13:00", uscita: "17:00" };
const p2: TurnoP2 = { acronimo: "P2", ingresso: "08:00", uscita: "14:00" };
const pausaP4 = minutiPausa(p4); // => 60
const pausaP2 = minutiPausa(p2); // => 0

// =====================================================================
// 7. Generics con type e interface: entrambi supportano parametri
// =====================================================================

// Interface generica: contenitore risposta API.
interface ApiResponse<T> {
  ok: boolean;
  data: T;
}
// Type generico: equivalente.
type ApiResult<T> = { ok: boolean; data: T };

const respDip: ApiResponse<DipendenteType> = { ok: true, data: dip1 };
const respList: ApiResult<Ruolo[]> = { ok: true, data: ["Admin", "Operatore"] };
// respList.data tipo: Ruolo[]

// Funzione generica type-safe (pattern apiGet<T> del dominio).
declare function fakeFetch(url: string): unknown;
function apiGet<T>(url: string): T {
  return fakeFetch(url) as T; // in reale: validazione/parse; qui solo illustrativo
}
const timbrature = apiGet<Timbratura[]>("/api/timbrature"); // tipo: Timbratura[]

interface Timbratura {
  id: number;
  dipendenteId: number;
  data: string; // "AAAA-MM-GG"
  ingresso: string | null; // "08:00" naive-UTC
  uscita: string | null;
  presente: boolean;
}

// =====================================================================
// 8. Implements: una classe puo' implementare sia type sia interface
// =====================================================================

interface Validabile {
  valido(): boolean;
}
type ConBadge = { codiceBadge: string };

// La classe implementa sia una interface sia un type-object: entrambi OK.
class DipendenteEntity implements Validabile, ConBadge {
  constructor(public codiceBadge: string, public nome: string) {}
  valido(): boolean {
    return /^[A-Z]{2,4}-\d{3}$/.test(this.codiceBadge); // badge tipo "UP-001"
  }
}
const e1 = new DipendenteEntity("UP-001", "Mario");
const e1Valido = e1.valido(); // => true

// =====================================================================
// 9. readonly e utility type funzionano con entrambi
// =====================================================================

interface RepartoRO {
  readonly id: number; // non riassegnabile dopo la creazione
  nome: string;
}
const repRo: RepartoRO = { id: 10, nome: "Finitura_Imballaggio" };
// ERRORE TS: Cannot assign to 'id' because it is a read-only property.
//   repRo.id = 99;

// Utility type applicati sia a type sia a interface.
type SoloLettura<T> = Readonly<T>;
type ParzialeDip = Partial<DipendenteType>; // tutti i campi opzionali
const patchDip: ParzialeDip = { nome: "Anna" }; // OK: solo un campo

// =====================================================================
// 10. Esempio browser (NON eseguito): tipizzare un elemento del DOM
// =====================================================================

// Esempio browser: si usa una interface del DOM (HTMLInputElement).
// La funzione non viene chiamata, serve solo a mostrare il pattern.
function leggiBadgeDaInput(): string {
  // Esempio browser
  const input = document.querySelector<HTMLInputElement>("#badge");
  return input ? input.value : ""; // input.value tipo: string
}
void leggiBadgeDaInput; // riferimento per evitare confusione, non esegue

// =====================================================================
// 11. Regola pratica: quando usare cosa
// =====================================================================

// interface: forme di oggetti/classi pubbliche, API estensibili (merging), gerarchie con extends.
// type:      union, tuple, primitive, mapped/conditional type, composizioni con &.
// In caso di dubbio su un semplice oggetto: entrambi vanno bene; scegli uno stile e sii coerente.

// Esempio finale che combina i concetti: stato richiesta come union + oggetto.
interface RichiestaPermesso {
  dipendenteId: number;
  dal: string; // "AAAA-MM-GG"
  al: string;
  stato: StatoRichiesta; // union type riusata
}
const richiesta1: RichiestaPermesso = {
  dipendenteId: 1,
  dal: "2026-07-10",
  al: "2026-07-12",
  stato: "In attesa",
};
// richiesta1.stato tipo: "In attesa" | "Approvato" | "Rifiutato"

export { DipendenteEntity, apiGet };
export type { Turno, Ruolo, RichiestaPermesso };

/* =====================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * =====================================================================
 * - type e interface: spesso intercambiabili per oggetti (confronto strutturale).
 * - interface extends X   vs   type A = X & { ... }  (intersection).
 * - declaration merging: SOLO interface (stesso nome -> si fondono).
 * - SOLO type: union (|), tuple, primitive alias, mapped type, conditional type.
 * - optional "?" (chiave assente)  vs  "| null" (chiave presente, valore null).
 * - discriminated union: campo discriminante (es. acronimo "P4"/"P2") + narrowing.
 * - generics: sia type sia interface accettano parametri <T>.
 * - implements: una classe puo' implementare interface e type-object.
 * - readonly + utility type (Partial, Readonly, Pick...) funzionano con entrambi.
 * - Regola: interface per API/classi estensibili; type per union/composizioni.
 * - Compila con: tsc --noEmit --strict --target ES2022 --lib ES2022,DOM
 * ===================================================================== */
