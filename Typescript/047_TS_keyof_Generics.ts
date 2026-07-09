/**
 * File 047 - keyof + Generics
 * Corso TypeScript - livello INTERMEDIATE.
 * Questo file mostra come combinare l'operator "keyof" con i generic per
 * scrivere funzioni type-safe di accesso alle proprieta': get<T, K extends keyof T>,
 * pluck (estrarre una colonna da un array), setProperty (scrittura type-safe).
 * Dominio ERP Polyuretech: entita' Dipendente, Turno, ruoli come union type.
 * Tutti gli esempi compilano con tsc --strict; gli errori voluti sono commentati.
 */

// ============================================================
// 1) RIPASSO: keyof su un type/interface
// ============================================================

// Definiamo l'entita' di dominio Dipendente.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
  turno: Turno;
  attivo: boolean;
}

// keyof produce la union dei nomi delle proprieta' (le chiavi).
type ChiaviDipendente = keyof Dipendente;
// tipo: "id" | "nome" | "badge" | "ruolo" | "turno" | "attivo"

// Un valore tipizzato con quella union accetta SOLO chiavi valide.
const chiaveValida: ChiaviDipendente = "badge"; // OK
// const chiaveErrata: ChiaviDipendente = "email";
// ERRORE TS: Type '"email"' is not assignable to type 'keyof Dipendente'.

// Un'istanza di esempio riusata in tutto il file.
const dip: Dipendente = {
  id: 1,
  nome: "Mario Rossi",
  badge: "UP-001",
  ruolo: "Operatore",
  turno: "P4",
  attivo: true,
};

// ============================================================
// 2) get<T, K extends keyof T>: accesso type-safe a una proprieta'
// ============================================================

/**
 * get restituisce il valore di una proprieta' scelta a runtime,
 * ma il tipo di ritorno e' INFERITO come T[K] (indexed access type).
 * Cosi' il compilatore sa il tipo esatto di ogni proprieta'.
 */
function get<T, K extends keyof T>(oggetto: T, chiave: K): T[K] {
  return oggetto[chiave];
}

const idDip = get(dip, "id"); // tipo: number  => 1
const nomeDip = get(dip, "nome"); // tipo: string  => "Mario Rossi"
const ruoloDip = get(dip, "ruolo"); // tipo: Ruolo   => "Operatore"
const attivoDip = get(dip, "attivo"); // tipo: boolean => true

// Il vantaggio: la chiave e' controllata a compile-time.
// const x = get(dip, "stipendio");
// ERRORE TS: Argument of type '"stipendio"' is not assignable to
//            parameter of type 'keyof Dipendente'.

// E il tipo di ritorno segue la chiave: niente "any", niente cast.
// idDip.toFixed(2);      // OK: number ha toFixed
// nomeDip.toUpperCase(); // OK: string ha toUpperCase
// idDip.toUpperCase();
// ERRORE TS: Property 'toUpperCase' does not exist on type 'number'.

// ============================================================
// 3) Perche' "K extends keyof T" e non solo "string"
// ============================================================

// Versione NON sicura (da NON usare): perde l'informazione di tipo.
function getUnsafe(oggetto: Record<string, unknown>, chiave: string): unknown {
  return oggetto[chiave];
}
const grezzo = getUnsafe(dip as unknown as Record<string, unknown>, "nome"); // tipo: unknown (serve narrowing manuale)
if (typeof grezzo === "string") {
  // qui grezzo e' string dopo il narrowing
  const upper = grezzo.toUpperCase(); // tipo: string
  void upper;
}

// Con il generic vincolato invece il tipo e' preciso senza narrowing.

// ============================================================
// 4) setProperty<T, K extends keyof T>: scrittura type-safe
// ============================================================

/**
 * setProperty scrive una proprieta' garantendo che il valore
 * abbia ESATTAMENTE il tipo T[K]. Impossibile assegnare un tipo sbagliato.
 */
function setProperty<T, K extends keyof T>(
  oggetto: T,
  chiave: K,
  valore: T[K],
): void {
  oggetto[chiave] = valore;
}

setProperty(dip, "nome", "Luigi Verdi"); // OK: string atteso
setProperty(dip, "attivo", false); // OK: boolean atteso
setProperty(dip, "turno", "STD"); // OK: Turno atteso

// setProperty(dip, "attivo", "si");
// ERRORE TS: Argument of type 'string' is not assignable to parameter of type 'boolean'.

// setProperty(dip, "turno", "P9");
// ERRORE TS: Argument of type '"P9"' is not assignable to parameter of type 'Turno'.

// ============================================================
// 5) update parziale: molte proprieta' insieme (Partial<T>)
// ============================================================

/**
 * updateEntita' applica un patch parziale. Ogni chiave del patch
 * deve appartenere a T e il valore deve rispettare T[quella chiave].
 */
function updateEntita<T>(oggetto: T, patch: Partial<T>): T {
  return { ...oggetto, ...patch };
}

const dipAggiornato = updateEntita(dip, { ruolo: "Admin", attivo: false });
// tipo: Dipendente, con ruolo "Admin" e attivo false

// const err = updateEntita(dip, { ruolo: "Capo" });
// ERRORE TS: Type '"Capo"' is not assignable to type 'Ruolo'.

// ============================================================
// 6) pluck: estrarre una "colonna" da un array di oggetti
// ============================================================

/**
 * pluck prende un array di T e una chiave K, e restituisce
 * un array di T[K] (i valori di quella colonna). Inferenza completa.
 */
function pluck<T, K extends keyof T>(elenco: T[], chiave: K): T[K][] {
  return elenco.map((e) => e[chiave]);
}

const squadra: Dipendente[] = [
  { id: 1, nome: "Mario", badge: "UP-001", ruolo: "Operatore", turno: "P4", attivo: true },
  { id: 2, nome: "Anna", badge: "UP-002", ruolo: "Admin", turno: "P2", attivo: true },
  { id: 3, nome: "Nadia", badge: "UP-003", ruolo: "QrDisplay", turno: "STD", attivo: false },
];

const badges = pluck(squadra, "badge"); // tipo: string[]  => ["UP-001","UP-002","UP-003"]
const ruoli = pluck(squadra, "ruolo"); // tipo: Ruolo[]   => ["Operatore","Admin","QrDisplay"]
const ids = pluck(squadra, "id"); // tipo: number[]  => [1,2,3]

// I risultati mantengono il tipo elemento: niente any.
const sommaId = ids.reduce((a, b) => a + b, 0); // tipo: number => 6

// ============================================================
// 7) getMany: prendere piu' proprieta' e ottenere un sotto-oggetto
// ============================================================

/**
 * getMany estrae un subset di chiavi e ritorna Pick<T, K>,
 * cioe' un oggetto con SOLO quelle proprieta', tipizzate correttamente.
 */
function getMany<T, K extends keyof T>(oggetto: T, chiavi: K[]): Pick<T, K> {
  const risultato = {} as Pick<T, K>;
  for (const k of chiavi) {
    risultato[k] = oggetto[k];
  }
  return risultato;
}

const sintesi = getMany(dip, ["id", "badge"]);
// tipo: Pick<Dipendente, "id" | "badge"> => { id: number; badge: string }
// sintesi.badge; // OK
// sintesi.ruolo;
// ERRORE TS: Property 'ruolo' does not exist on type 'Pick<Dipendente, "id" | "badge">'.

// ============================================================
// 8) Ordinamento type-safe per chiave
// ============================================================

/**
 * ordinaPer ordina un array in base a una chiave.
 * La chiave e' vincolata alle proprieta' dell'oggetto.
 */
function ordinaPer<T, K extends keyof T>(elenco: T[], chiave: K): T[] {
  return [...elenco].sort((a, b) => {
    const va = a[chiave];
    const vb = b[chiave];
    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  });
}

const perNome = ordinaPer(squadra, "nome"); // tipo: Dipendente[] (Anna, Mario, Nadia)
const perId = ordinaPer(squadra, "id"); // tipo: Dipendente[] (1,2,3)
void perNome;
void perId;

// ============================================================
// 9) Validazione di dominio combinata con keyof
// ============================================================

// Regex di dominio ERP.
const BADGE_RE = /^UP-\d{3}$/;
const ORARIO_RE = /^\d{2}:\d{2}$/;

/**
 * hasKey e' un type guard: verifica a runtime se una chiave esiste,
 * e restringe (narrowing) il tipo dell'oggetto per il compilatore.
 */
function hasKey<T extends object, K extends PropertyKey>(
  oggetto: T,
  chiave: K,
): oggetto is T & Record<K, unknown> {
  return chiave in oggetto;
}

const oggettoIgnoto: object = dip;
if (hasKey(oggettoIgnoto, "badge")) {
  // qui il compilatore sa che esiste la proprieta' "badge"
  const b = String(oggettoIgnoto.badge);
  const badgeOk = BADGE_RE.test(b); // => true per "UP-001"
  void badgeOk;
}

// Esempio d'uso della regex orario con una Timbratura mock.
interface Timbratura {
  dipendenteId: number;
  entrata: string; // "HH:MM" naive-UTC
  uscita: string; // "HH:MM" naive-UTC
}

function orarioValido<T, K extends keyof T>(t: T, chiave: K): boolean {
  const v = t[chiave];
  return typeof v === "string" && ORARIO_RE.test(v);
}

const timb: Timbratura = { dipendenteId: 1, entrata: "08:00", uscita: "17:30" };
const entrataOk = orarioValido(timb, "entrata"); // => true
const uscitaOk = orarioValido(timb, "uscita"); // => true
void entrataOk;
void uscitaOk;

// ============================================================
// 10) Mapping chiave->funzione: keyof come indice tipizzato
// ============================================================

/**
 * Un Record indicizzato per keyof: per ogni proprieta' definiamo
 * una funzione di formattazione. Mancarne una e' errore di compile-time.
 */
type Formatter<T> = {
  [K in keyof T]: (valore: T[K]) => string;
};

const formatDipendente: Formatter<Dipendente> = {
  id: (v) => `#${v}`, // v: number
  nome: (v) => v.trim(), // v: string
  badge: (v) => v.toUpperCase(), // v: string
  ruolo: (v) => `ruolo:${v}`, // v: Ruolo
  turno: (v) => `turno:${v}`, // v: Turno
  attivo: (v) => (v ? "ON" : "OFF"), // v: boolean
};

// Se dimenticassimo "attivo" avremmo:
// ERRORE TS: Property 'attivo' is missing in type '...'.

/**
 * formatta usa il Formatter per stampare una proprieta' con il tipo corretto.
 */
function formatta<K extends keyof Dipendente>(d: Dipendente, chiave: K): string {
  const fn = formatDipendente[chiave]; // tipo: (valore: Dipendente[K]) => string
  return fn(d[chiave]);
}

const idFmt = formatta(dip, "id"); // => "#1"
const attivoFmt = formatta(dip, "attivo"); // => "ON" oppure "OFF"
void idFmt;
void attivoFmt;

// ============================================================
// 11) Esempio browser (NON eseguito): keyof su dataset di un elemento
// ============================================================

// Esempio browser: leggere un attributo data-* in modo tipizzato.
// Non viene chiamato: serve solo a mostrare il pattern con la lib DOM.
function esempioBrowser(el: HTMLElement): void {
  interface Dataset {
    badge: string;
    turno: string;
  }
  const leggi = <K extends keyof Dataset>(chiave: K): string | undefined =>
    el.dataset[chiave as string];
  const badge = leggi("badge"); // tipo: string | undefined
  void badge;
}
void esempioBrowser;

// ============================================================
// 12) Esporti locali (solo simboli definiti in questo file)
// ============================================================

export { get, setProperty, pluck, getMany, ordinaPer, updateEntita, hasKey };
export type { Dipendente, Ruolo, Turno, Timbratura, ChiaviDipendente, Formatter };

/*
============================================================
RIEPILOGO COMANDI / CONCETTI
============================================================
- keyof T                     -> union delle chiavi di T ("id" | "nome" | ...).
- T[K]                        -> indexed access type: il tipo della proprieta' K.
- K extends keyof T           -> vincola il generic alle sole chiavi valide di T.
- get<T,K>(o, k): T[K]        -> lettura type-safe, ritorno inferito per chiave.
- setProperty<T,K>(o,k,v)     -> scrittura type-safe, v deve essere T[K].
- pluck<T,K>(arr, k): T[K][]  -> estrae una "colonna", array tipizzato.
- getMany -> Pick<T,K>        -> subset di proprieta' tipizzato.
- ordinaPer<T,K>(arr, k)      -> sort per chiave, K vincolata a keyof T.
- updateEntita(o, Partial<T>) -> patch parziale, valori vincolati a T[K].
- Formatter<T> (mapped type)  -> [K in keyof T]: (v: T[K]) => string.
- hasKey (type guard)         -> "chiave in oggetto" restringe il tipo.
- Perche' K extends keyof T:  evita "unknown"/"any" e cast, tipo esatto.
- Con --strict tutti gli errori voluti sono commentati (// ERRORE TS: ...).
============================================================
*/
