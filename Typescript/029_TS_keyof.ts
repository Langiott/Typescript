/**
 * File 029 - keyof: l'operatore che estrae le chiavi di un type
 *
 * L'operatore keyof prende un type oggetto e produce la union delle sue
 * chiavi (come literal type). E' la base per scrivere codice generico e
 * type-safe che accede alle proprieta' senza perdere l'informazione di tipo.
 * In questo file: keyof su interface, union di chiavi, getProperty generico,
 * keyof typeof, ed esempi sul dominio ERP (Dipendente, Timbratura).
 */

// ---------------------------------------------------------------------------
// 1. keyof su una interface: produce la union delle chiavi
// ---------------------------------------------------------------------------

interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: string;
}

// keyof Dipendente e' la union dei nomi delle proprieta' come string literal.
type ChiaviDipendente = keyof Dipendente;
// tipo: "id" | "nome" | "badge" | "ruolo"

// Posso usare la union per vincolare una variabile a essere UNA chiave valida.
const campoValido: ChiaviDipendente = "badge"; // OK
// const campoErrato: ChiaviDipendente = "stipendio";
// ERRORE TS: '"stipendio"' non e' assegnabile a '"id" | "nome" | "badge" | "ruolo"'

// ---------------------------------------------------------------------------
// 2. keyof e' una vera union: si puo' iterare e comporre
// ---------------------------------------------------------------------------

// Un array di sole chiavi valide. TS controlla ogni elemento.
const campiDaMostrare: (keyof Dipendente)[] = ["nome", "badge", "ruolo"];
// se aggiungessi "foo" -> ERRORE TS: non e' una chiave di Dipendente

// Union manuale confrontata con keyof: sono lo stesso type.
type SoloAlcune = "id" | "nome";
type Verifica = SoloAlcune extends keyof Dipendente ? true : false;
// tipo: true  (id e nome sono davvero chiavi di Dipendente)

// ---------------------------------------------------------------------------
// 3. getProperty generico: keyof + indexed access type T[K]
// ---------------------------------------------------------------------------

// K e' vincolato a essere una chiave di T. Il valore di ritorno e' T[K],
// cioe' il type ESATTO di quella proprieta' (indexed access type).
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const dip: Dipendente = { id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Admin" };

const n = getProperty(dip, "id"); // tipo inferito: number
const s = getProperty(dip, "nome"); // tipo inferito: string
const b = getProperty(dip, "badge"); // tipo inferito: string
// const x = getProperty(dip, "eta");
// ERRORE TS: '"eta"' non e' assegnabile al parametro di tipo 'keyof Dipendente'

// Il vantaggio: il tipo di ritorno cambia in base alla chiave passata,
// senza cast e senza 'any'. n e' number, non un generico unknown.

// ---------------------------------------------------------------------------
// 4. setProperty: scrivere in modo type-safe con T[K]
// ---------------------------------------------------------------------------

// Il valore deve avere ESATTAMENTE il type della proprieta' indicata.
function setProperty<T, K extends keyof T>(obj: T, key: K, value: T[K]): void {
  obj[key] = value;
}

setProperty(dip, "nome", "Bianchi"); // OK: string
setProperty(dip, "id", 42); // OK: number
// setProperty(dip, "id", "quarantadue");
// ERRORE TS: 'string' non e' assegnabile a 'number' (T[K] per "id" e' number)

// ---------------------------------------------------------------------------
// 5. pick su piu' chiavi: array di keyof e oggetto ridotto
// ---------------------------------------------------------------------------

// Estrae un sottoinsieme di proprieta'. Il risultato e' un Pick<T, K>.
function estrai<T, K extends keyof T>(obj: T, chiavi: K[]): Pick<T, K> {
  const risultato = {} as Pick<T, K>;
  for (const k of chiavi) {
    risultato[k] = obj[k];
  }
  return risultato;
}

const ridotto = estrai(dip, ["nome", "badge"]);
// tipo: { nome: string; badge: string }
// ridotto.id -> ERRORE TS: la proprieta' 'id' non esiste su Pick<...>

// ---------------------------------------------------------------------------
// 6. keyof typeof: chiavi di un valore/oggetto concreto
// ---------------------------------------------------------------------------

// Spesso non ho una interface ma un oggetto costante. 'typeof oggetto' ne
// ricava il type, poi keyof ne estrae le chiavi.
const turniDurata = {
  P4: 8,
  P2: 6,
  STD: 8,
} as const;

type CodiceTurno = keyof typeof turniDurata;
// tipo: "P4" | "P2" | "STD"

function durataTurno(codice: CodiceTurno): number {
  return turniDurata[codice];
}

const d1 = durataTurno("P4"); // => 8
// durataTurno("P9");
// ERRORE TS: '"P9"' non e' assegnabile a '"P4" | "P2" | "STD"'

// ---------------------------------------------------------------------------
// 7. keyof typeof su un enum-like di ruoli ERP
// ---------------------------------------------------------------------------

// Mappa dei ruoli con relativo livello di permesso.
const livelloRuolo = {
  SuperAdmin: 100,
  Admin: 80,
  Operatore: 40,
  QrDisplay: 10,
} as const;

// La union dei ruoli deriva direttamente dall'oggetto: una sola fonte di verita'.
type Ruolo = keyof typeof livelloRuolo;
// tipo: "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay"

function puoAmministrare(ruolo: Ruolo): boolean {
  return livelloRuolo[ruolo] >= 80;
}

// puoAmministrare("Admin") => true, puoAmministrare("Operatore") => false

// ---------------------------------------------------------------------------
// 8. keyof su type con index signature
// ---------------------------------------------------------------------------

// Se un type ha una index signature string, keyof produce string | number.
// (number perche' le chiavi numeriche sono accettate e convertite a stringa).
interface DizionarioReparti {
  [codice: string]: string;
}
type ChiaviDizionario = keyof DizionarioReparti;
// tipo: string | number

// Con index signature esplicitamente numerica keyof produce number.
interface OrariPerId {
  [id: number]: string;
}
type ChiaviOrari = keyof OrariPerId;
// tipo: number

// ---------------------------------------------------------------------------
// 9. Esempio ERP: rendere una riga tabella di un Dipendente
// ---------------------------------------------------------------------------

// Definisco quali colonne mostrare come array di chiavi type-safe.
// Se rinomino una proprieta' in Dipendente, questo array segnala l'errore.
const colonneDipendente: (keyof Dipendente)[] = ["id", "nome", "badge", "ruolo"];

// Funzione che formatta ogni campo in stringa per una UI (senza toccare il DOM).
function formattaRiga(d: Dipendente): string[] {
  return colonneDipendente.map((c) => String(getProperty(d, c)));
}

const riga = formattaRiga(dip);
// => ["42", "Bianchi", "UP-001", "Admin"]  (dopo le set precedenti)

// ---------------------------------------------------------------------------
// 10. keyof combinato con validazione di dominio (badge / orario)
// ---------------------------------------------------------------------------

interface Timbratura {
  dipendenteId: number;
  entrata: string; // "HH:MM" naive-UTC
  uscita: string; // "HH:MM" naive-UTC
  reparto: string;
}

// Mappa "chiave -> regex" tipizzata: le chiavi devono essere di Timbratura.
// Uso Partial perche' non tutti i campi hanno una regola.
const regoleTimbratura: Partial<Record<keyof Timbratura, RegExp>> = {
  entrata: /^\d{2}:\d{2}$/,
  uscita: /^\d{2}:\d{2}$/,
};

// Valida un singolo campo stringa se esiste una regola per quella chiave.
function validaCampo<K extends keyof Timbratura>(
  chiave: K,
  valore: Timbratura[K],
): boolean {
  const regola = regoleTimbratura[chiave];
  if (!regola) return true; // nessuna regola: considerato valido
  return regola.test(String(valore));
}

// validaCampo("entrata", "08:30") => true
// validaCampo("entrata", "8:3")   => false
// validaCampo("reparto", "P4")    => true (nessuna regola definita)

// Regola sui badge riusata come esempio autonomo.
const badgeRegex = /^UP-\d{3}$/;
function badgeValido(valore: string): boolean {
  return badgeRegex.test(valore);
}
// badgeValido("UP-001") => true ; badgeValido("UP-1") => false

// ---------------------------------------------------------------------------
// 11. keyof per garantire coerenza tra due type (guardia a compile-time)
// ---------------------------------------------------------------------------

// Voglio un'etichetta leggibile per OGNI campo di Dipendente. Usando
// Record<keyof Dipendente, string> il compiler pretende tutte le chiavi:
// se ne dimentico una, e' ERRORE.
const etichette: Record<keyof Dipendente, string> = {
  id: "Identificativo",
  nome: "Nome e cognome",
  badge: "Codice badge",
  ruolo: "Ruolo aziendale",
};
// Se togliessi 'ruolo' -> ERRORE TS: proprieta' 'ruolo' mancante.

function etichettaDi(campo: keyof Dipendente): string {
  return etichette[campo];
}
// etichettaDi("badge") => "Codice badge"

// ---------------------------------------------------------------------------
// 12. keyof con generic factory: costruire un accessor per una chiave fissa
// ---------------------------------------------------------------------------

// Ritorna una funzione che legge sempre la stessa proprieta'.
// Il type del valore letto resta preciso grazie a T[K].
function creaAccessor<T, K extends keyof T>(chiave: K): (obj: T) => T[K] {
  return (obj: T) => obj[chiave];
}

const leggiBadge = creaAccessor<Dipendente, "badge">("badge");
const valBadge = leggiBadge(dip); // tipo: string
// => "UP-001"

// ---------------------------------------------------------------------------
// Export locali (solo simboli definiti in questo file)
// ---------------------------------------------------------------------------

export { getProperty, setProperty, estrai, durataTurno, puoAmministrare, validaCampo };
export type { Dipendente, Timbratura, Ruolo, CodiceTurno, ChiaviDipendente };

// ---------------------------------------------------------------------------
// RIEPILOGO COMANDI / CONCETTI
// ---------------------------------------------------------------------------
// - keyof T           : union dei nomi delle proprieta' di T come literal type
// - keyof Interfaccia : "id" | "nome" | ... (una string-literal union)
// - T[K]              : indexed access type, il type della proprieta' K
// - K extends keyof T : vincolo per generic type-safe (getProperty/setProperty)
// - keyof typeof obj  : chiavi di un oggetto/costante concreto (as const utile)
// - keyof con index signature string -> string | number ; numerica -> number
// - Record<keyof T, V>: forza a coprire TUTTE le chiavi di T (guardia compile-time)
// - Pick<T, K>        : sotto-type con solo le chiavi K
// - Partial<Record<keyof T, V>> : mappa parziale chiave->valore
// - Pattern ERP: colonne tabella, etichette, regole di validazione per chiave
