/**
 * 007 - Object Types, proprieta' opzionali, nested, readonly (Fundamentals)
 *
 * In questa lezione impariamo a descrivere la FORMA degli oggetti con gli
 * "object type" di TypeScript: proprieta' obbligatorie, proprieta' opzionali (?),
 * oggetti annidati (nested), proprieta' readonly, index signature e la differenza
 * tra `?` e `| undefined`. Gli esempi usano il dominio ERP Polyuretech
 * (Dipendente, Timbratura, Reparto, badge "UP-001", turni P4/P2, orari "HH:MM").
 */

// =============================================================================
// 1. OBJECT TYPE DI BASE
// =============================================================================

// Un object type descrive quali proprieta' ha un oggetto e di che tipo sono.
type Reparto = {
  id: number;
  nome: string;
  sigla: string; // 2-4 lettere usate nel badge, es. "UP"
  attivo: boolean;
};

const colatura: Reparto = {
  id: 1,
  nome: "Colatura",
  sigla: "CO",
  attivo: true,
};
// tipo di colatura.sigla: string  => "CO"

// ERRORE TS: manca la proprieta' obbligatoria `attivo`
// const repartoRotto: Reparto = { id: 2, nome: "Collaudo", sigla: "CL" };
// ERRORE TS: Property 'attivo' is missing in type '{...}'

// ERRORE TS: `id` deve essere number, non string
// const repartoRotto2: Reparto = { id: "3", nome: "Finitura", sigla: "FI", attivo: true };
// ERRORE TS: Type 'string' is not assignable to type 'number'

// =============================================================================
// 2. EXCESS PROPERTY CHECK (proprieta' in eccesso)
// =============================================================================

// Con un OBJECT LITERAL diretto, TS segnala proprieta' extra non previste.
// ERRORE TS: Object literal may only specify known properties
// const repartoExtra: Reparto = { id: 4, nome: "Fresatura", sigla: "FR", attivo: true, colore: "rosso" };

// Se invece passi da una variabile intermedia, il check non scatta (assegnabilita' strutturale):
const grezzo = { id: 4, nome: "Fresatura", sigla: "FR", attivo: true, colore: "rosso" };
const repartoDaGrezzo: Reparto = grezzo; // OK: `grezzo` ha almeno tutte le proprieta' richieste

// =============================================================================
// 3. PROPRIETA' OPZIONALI (?)
// =============================================================================

// Il `?` rende la proprieta' facoltativa: puo' mancare del tutto.
type Turno = {
  nome: string;
  acronimo?: string; // "P4" | "P2" | "STD" - opzionale
  ingresso: string; // "08:00"
  uscita: string; // "17:00"
  pausaMinuti?: number; // opzionale: alcuni turni non hanno pausa
};

const turnoP4: Turno = {
  nome: "Produzione mattino",
  acronimo: "P4",
  ingresso: "08:00",
  uscita: "17:00",
  pausaMinuti: 60,
};

const turnoP2: Turno = {
  nome: "Produzione continuata",
  ingresso: "06:00",
  uscita: "14:00",
  // acronimo e pausaMinuti omessi: sono opzionali
};

// Il tipo di una proprieta' opzionale include automaticamente `undefined`.
// tipo di turnoP2.acronimo: string | undefined
const acr = turnoP2.acronimo; // string | undefined

// Percio' va gestito il caso "assente" prima di usarlo come string.
function etichettaTurno(t: Turno): string {
  // narrowing: se acronimo e' undefined usiamo un fallback
  return t.acronimo ? `${t.nome} (${t.acronimo})` : t.nome;
}
// etichettaTurno(turnoP4) => "Produzione mattino (P4)"
// etichettaTurno(turnoP2) => "Produzione continuata"

// =============================================================================
// 4. `?` VERSUS `| undefined` (differenza importante)
// =============================================================================

type ConOpzionale = { pausaMinuti?: number }; // la chiave puo' MANCARE
type ConUndefined = { pausaMinuti: number | undefined }; // la chiave DEVE esserci, ma puo' valere undefined

const a1: ConOpzionale = {}; // OK: chiave assente
// ERRORE TS: la chiave `pausaMinuti` e' obbligatoria (anche se il valore puo' essere undefined)
// const a2: ConUndefined = {};
const a3: ConUndefined = { pausaMinuti: undefined }; // OK: presente ma undefined

// =============================================================================
// 5. NULL vs UNDEFINED (pattern ERP: campi nullable dal DB)
// =============================================================================

// Nel DB molti campi sono nullable: si modellano con `| null`, non con `?`.
type Dipendente = {
  id: number;
  codiceBadge: string; // "UP-001"
  nome: string;
  cognome: string;
  email: string;
  emailPersonale: string | null; // presente ma puo' essere null
  numeroCellulare: string | null;
  dataAssunzione: string | null; // ISO "AAAA-MM-GG"
  archiviato: boolean;
};

const upSacripanti: Dipendente = {
  id: 1,
  codiceBadge: "UP-001",
  nome: "Francesco",
  cognome: "Sacripanti",
  email: "francesco.sacripanti@polyuretech.com",
  emailPersonale: null, // sappiamo che e' "vuoto", non "sconosciuto"
  numeroCellulare: null,
  dataAssunzione: "2020-03-01",
  archiviato: false,
};

// Con `| null` la chiave e' obbligatoria: NON puoi ometterla.
// ERRORE TS: Property 'emailPersonale' is missing
// const uiRotto: Dipendente = { id: 2, codiceBadge: "UI-001", nome: "Anna", cognome: "Bianchi", email: "a@b.it", numeroCellulare: null, dataAssunzione: null, archiviato: false };

// Gestione sicura del null con narrowing:
function contattoPreferito(d: Dipendente): string {
  return d.emailPersonale ?? d.email; // nullish coalescing: se null usa email aziendale
}
// contattoPreferito(upSacripanti) => "francesco.sacripanti@polyuretech.com"

// =============================================================================
// 6. OGGETTI ANNIDATI (nested object types)
// =============================================================================

type Indirizzo = {
  via: string;
  citta: string;
  cap: string;
};

// Un object type puo' contenere altri object type e array di oggetti.
type SchedaDipendente = {
  dipendente: Dipendente;
  reparto: Reparto;
  indirizzo: Indirizzo | null;
  turniAssegnati: Turno[]; // array di oggetti annidati
};

const scheda: SchedaDipendente = {
  dipendente: upSacripanti,
  reparto: colatura,
  indirizzo: { via: "Via Roma 1", citta: "Ancona", cap: "60100" },
  turniAssegnati: [turnoP4, turnoP2],
};

// Accesso annidato: TS conosce il tipo a ogni livello.
const cittaScheda = scheda.indirizzo?.citta; // string | undefined (per via del `| null`)
// tipo: string | undefined  => "Ancona"

const primoTurno = scheda.turniAssegnati[0].ingresso; // string => "08:00"

// Nested inline: si puo' definire la forma direttamente, senza type separato.
type MiniTimbratura = {
  data: string;
  orari: {
    ingresso: string | null;
    uscita: string | null;
  };
};

const mt: MiniTimbratura = {
  data: "2026-07-08",
  orari: { ingresso: "08:00", uscita: null },
};
// mt.orari.uscita  => null

// =============================================================================
// 7. READONLY (proprieta' immutabili)
// =============================================================================

// `readonly` impedisce la riassegnazione DOPO la creazione dell'oggetto.
type TimbraturaImmutabile = {
  readonly id: number;
  readonly dipendenteId: number;
  readonly data: string; // "AAAA-MM-GG"
  presente: boolean; // questa resta modificabile
};

const timb: TimbraturaImmutabile = {
  id: 100,
  dipendenteId: 1,
  data: "2026-07-08",
  presente: true,
};

timb.presente = false; // OK: non e' readonly
// ERRORE TS: Cannot assign to 'id' because it is a read-only property
// timb.id = 999;

// readonly e' "shallow": protegge la proprieta', non l'oggetto puntato.
type ContenitoreReadonly = {
  readonly info: { nota: string };
};
const cont: ContenitoreReadonly = { info: { nota: "iniziale" } };
cont.info.nota = "modificata"; // OK: `nota` interna NON e' readonly
// ERRORE TS: cont.info = { nota: "x" };  // riassegnare `info` non e' permesso

// Array readonly: niente push/pop, solo lettura.
const orariFissi: readonly string[] = ["08:00", "12:00", "13:00", "17:00"];
const primoOrario = orariFissi[0]; // string => "08:00"
// ERRORE TS: Property 'push' does not exist on type 'readonly string[]'
// orariFissi.push("18:00");

// =============================================================================
// 8. UTILITY `Readonly<T>` E `Partial<T>`
// =============================================================================

// Readonly<T> rende readonly TUTTE le proprieta' (mapped type predefinito).
type RepartoBloccato = Readonly<Reparto>;
const repBloccato: RepartoBloccato = { id: 5, nome: "Tecnopolimeri", sigla: "TP", attivo: true };
// ERRORE TS: Cannot assign to 'attivo' because it is a read-only property
// repBloccato.attivo = false;

// Partial<T> rende OPZIONALI tutte le proprieta': comodo per aggiornamenti parziali.
type PatchDipendente = Partial<Dipendente>;
function aggiornaDipendente(base: Dipendente, patch: PatchDipendente): Dipendente {
  return { ...base, ...patch }; // merge: patch sovrascrive i campi presenti
}
const upArchiviato = aggiornaDipendente(upSacripanti, { archiviato: true });
// upArchiviato.archiviato  => true

// =============================================================================
// 9. INDEX SIGNATURE (oggetti con chiavi dinamiche)
// =============================================================================

// Quando non conosci in anticipo i nomi delle chiavi (es. conteggi per reparto).
type ConteggioPerReparto = {
  [sigla: string]: number;
};

const conteggi: ConteggioPerReparto = {
  CO: 3, // Colatura
  CL: 2, // Collaudo
  FI: 5, // Finitura_Imballaggio
};
const nColatura = conteggi["CO"]; // number => 3
const assente = conteggi["ZZ"]; // tipo: number, ma a runtime e' undefined (attenzione!)

// `Record<K, V>` e' il modo idiomatico per lo stesso pattern.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type LabelRuoli = Record<Ruolo, string>;
const labelRuoli: LabelRuoli = {
  SuperAdmin: "Super amministratore",
  Admin: "Amministratore",
  Operatore: "Operatore di reparto",
  QrDisplay: "Schermo QR",
};
// labelRuoli.Operatore  => "Operatore di reparto"

// =============================================================================
// 10. OBJECT TYPE COME PARAMETRO (destrutturazione tipata)
// =============================================================================

// Parametri "a oggetto" con destrutturazione e default per gli opzionali.
function generaBadge({ sigla, progressivo }: { sigla: string; progressivo: number }): string {
  const nnn = String(progressivo).padStart(3, "0");
  return `${sigla.toUpperCase()}-${nnn}`;
}
const nuovoBadge = generaBadge({ sigla: "up", progressivo: 1 }); // "UP-001"

// Proprieta' opzionale in parametro oggetto con valore di default.
function descriviTurno({ nome, acronimo = "STD" }: Turno): string {
  return `${acronimo}: ${nome}`;
}
// descriviTurno(turnoP2)  => "STD: Produzione continuata"

// =============================================================================
// 11. ESEMPIO BROWSER (DOM) - non eseguito, solo illustrativo
// =============================================================================

// Esempio browser: leggere un input HH:MM e costruire un oggetto Timbratura parziale.
// La funzione non viene mai chiamata, quindi non tocca il DOM a runtime; compila comunque.
function leggiOrarioDaInput(): { ingresso: string | null } {
  // Esempio browser
  const el = document.getElementById("ingresso") as HTMLInputElement | null;
  const valore = el?.value ?? "";
  return { ingresso: /^\d{2}:\d{2}$/.test(valore) ? valore : null };
}
void leggiOrarioDaInput; // riferimento senza eseguire, per evitare warning concettuali

// =============================================================================
// 12. EXPORT LOCALE (moduli) - simboli definiti IN QUESTO stesso file
// =============================================================================

// Si possono esportare tipi/valori definiti nel file. Qui creiamo alias nuovi
// per non ridichiarare nomi gia' usati sopra.
export type RepartoExport = Reparto;
export const repartoDefault: Reparto = { id: 0, nome: "Ufficio_Informatico", sigla: "UI", attivo: true };

// =============================================================================
// RIEPILOGO COMANDI / CONCETTI
// =============================================================================
/*
 - Object type:            type T = { prop: tipo; ... }
 - Proprieta' opzionale:    prop?: tipo   (puo' mancare; tipo diventa `tipo | undefined`)
 - `?` vs `| undefined`:   `?` la chiave puo' mancare; `| undefined` la chiave e' obbligatoria
 - Nullable (DB):          prop: tipo | null  (chiave obbligatoria, valore puo' essere null)
 - Nested:                 object type dentro object type; accesso con optional chaining ?.
 - readonly prop:          readonly prop: tipo  (no riassegnazione; e' SHALLOW)
 - readonly array:         readonly tipo[]  (no push/pop)
 - Readonly<T>:            tutte le proprieta' readonly
 - Partial<T>:             tutte le proprieta' opzionali (patch/update)
 - Index signature:        { [k: string]: V }
 - Record<K, V>:           mappa tipata con chiavi note
 - Excess property check:  scatta sugli object literal diretti, non via variabile
 - Narrowing null/undef:   usa ?? (nullish) e ?. (optional chaining)
 - Comando controllo:      tsc --noEmit  (strict, target ES2022, lib ES2022+DOM)
*/
