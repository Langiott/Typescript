/**
 * File 043 - Generic constraints (extends)
 * Corso TypeScript - livello INTERMEDIATE
 * In questo file vediamo come vincolare (constraint) un generic con "extends":
 * limitiamo i tipi accettabili da un type parameter cosi' da poter accedere
 * in sicurezza a proprieta' e chiavi. Coprono T extends X, keyof, il pattern
 * T extends { id: number } e un getById realistico su entita' ERP Polyuretech.
 */

// ============================================================
// 1. Il problema: un generic senza constraint e' "troppo libero"
// ============================================================

// Senza constraint, T puo' essere QUALSIASI cosa: non possiamo assumere nulla.
function lunghezzaLibera<T>(x: T): number {
  // ERRORE TS: Property 'length' does not exist on type 'T'.
  // return x.length;
  return 0; // costretti a non usare x, perche' non sappiamo cosa sia
}

// Con un constraint diciamo: "T deve avere almeno una proprieta' length: number".
interface ConLength {
  length: number;
}
function lunghezza<T extends ConLength>(x: T): number {
  return x.length; // OK: il constraint garantisce length
}

// tipi accettati: tutto cio' che ha length
const l1 = lunghezza("badge UP-001"); // => 12  (string ha length)
const l2 = lunghezza([1, 2, 3]); // => 3   (array ha length)
const l3 = lunghezza({ length: 7, nome: "x" }); // => 7
// ERRORE TS: number non ha length ->
// const l4 = lunghezza(42);
void l1;
void l2;
void l3;

// ============================================================
// 2. T extends X: il generic viene inferito, ma resta preciso
// ============================================================

// Nota: T extends ConLength NON collassa a ConLength: T resta il tipo specifico.
function identitaConLength<T extends ConLength>(x: T): T {
  return x;
}
const arr = identitaConLength([10, 20, 30]);
// tipo di arr: number[]  (non ConLength) -> conserviamo le info
arr.push(40); // OK: sappiamo che e' un array
void arr;

// ============================================================
// 3. Dominio ERP: entita' e union di base
// ============================================================

// Union dei ruoli applicativi Polyuretech.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
}

interface Reparto {
  id: number;
  nome: string;
  turnoDefault: Turno;
}

interface Timbratura {
  id: number;
  dipendenteId: number;
  entrata: string; // orario naive-UTC "HH:MM"
  uscita: string; // orario naive-UTC "HH:MM"
}

// ============================================================
// 4. Constraint con keyof: leggere una proprieta' in modo type-safe
// ============================================================

// K extends keyof T garantisce che chiave sia una chiave REALE di T.
// Il tipo di ritorno T[K] e' il tipo della proprieta' selezionata (indexed access).
function getProp<T, K extends keyof T>(oggetto: T, chiave: K): T[K] {
  return oggetto[chiave];
}

const dip: Dipendente = { id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Operatore" };

const n = getProp(dip, "nome"); // tipo: string
const idDip = getProp(dip, "id"); // tipo: number
const r = getProp(dip, "ruolo"); // tipo: Ruolo
// ERRORE TS: "email" non e' keyof Dipendente ->
// const e = getProp(dip, "email");
void n;
void idDip;
void r;

// Aggiornare una proprieta' mantenendo il tipo corretto del valore.
function setProp<T, K extends keyof T>(oggetto: T, chiave: K, valore: T[K]): void {
  oggetto[chiave] = valore;
}
setProp(dip, "ruolo", "Admin"); // OK: "Admin" e' un Ruolo valido
// ERRORE TS: 123 non e' assegnabile a Ruolo ->
// setProp(dip, "ruolo", 123);

// Prendere solo alcune chiavi (pick manuale) con constraint su keyof.
function pick<T, K extends keyof T>(oggetto: T, chiavi: K[]): Pick<T, K> {
  const risultato = {} as Pick<T, K>;
  for (const k of chiavi) {
    risultato[k] = oggetto[k];
  }
  return risultato;
}
const ridotto = pick(dip, ["id", "badge"]);
// tipo: { id: number; badge: string }
void ridotto;

// ============================================================
// 5. Il pattern T extends { id: number }
// ============================================================

// Vincoliamo T ad avere ALMENO un campo id numerico.
// Utile per funzioni generiche su qualsiasi entita' ERP con id.
interface HasId {
  id: number;
}

// Estrae gli id da una lista di entita' qualsiasi che abbiano id.
function estraiIds<T extends HasId>(entita: T[]): number[] {
  return entita.map((e) => e.id);
}

const reparti: Reparto[] = [
  { id: 10, nome: "Stampaggio", turnoDefault: "P4" },
  { id: 20, nome: "Assemblaggio", turnoDefault: "STD" },
];
const ids = estraiIds(reparti); // => [10, 20]  tipo: number[]
const idsDip = estraiIds([dip]); // => [1]
void ids;
void idsDip;

// ERRORE TS: { nome: string } non ha 'id' -> il constraint fallisce
// estraiIds([{ nome: "senza id" }]);

// Confronto per id: funziona su qualsiasi entita' con id.
function stessoId<T extends HasId>(a: T, b: T): boolean {
  return a.id === b.id;
}
void stessoId(reparti[0], reparti[1]); // => false

// ============================================================
// 6. getById: il caso realistico su entita' ERP
// ============================================================

// Cerca un elemento per id in una collezione di entita' con id.
// T extends HasId garantisce che ogni elemento abbia .id da confrontare.
// Il ritorno T | undefined modella la ricerca che puo' fallire.
function getById<T extends HasId>(lista: T[], id: number): T | undefined {
  return lista.find((e) => e.id === id);
}

const trovato = getById(reparti, 10);
// tipo: Reparto | undefined
if (trovato) {
  // dentro il narrowing, trovato e' Reparto (non undefined)
  void trovato.turnoDefault; // OK: proprieta' specifica di Reparto
}

const timbrature: Timbratura[] = [
  { id: 100, dipendenteId: 1, entrata: "08:00", uscita: "17:00" },
  { id: 101, dipendenteId: 2, entrata: "06:00", uscita: "14:00" },
];
const t = getById(timbrature, 101);
// tipo: Timbratura | undefined  (T e' inferito come Timbratura)
void t;

// Variante che LANCIA se non trova: ritorno T "pieno", niente undefined.
function getByIdOrThrow<T extends HasId>(lista: T[], id: number): T {
  const found = lista.find((e) => e.id === id);
  if (!found) {
    throw new Error(`Entita' con id ${id} non trovata`);
  }
  return found; // tipo: T
}
const dipSicuro = getByIdOrThrow([dip], 1); // tipo: Dipendente
void dipSicuro;

// ============================================================
// 7. Constraint combinato: id numerico + campo generico da confrontare
// ============================================================

// Doppio constraint: T ha id, e K deve essere una chiave di T.
// Cerca la prima entita' la cui proprieta' K vale il valore atteso.
function getByField<T extends HasId, K extends keyof T>(
  lista: T[],
  campo: K,
  valore: T[K]
): T | undefined {
  return lista.find((e) => e[campo] === valore);
}

const perBadge = getByField([dip], "badge", "UP-001");
// tipo: Dipendente | undefined
const perRuolo = getByField([dip], "ruolo", "Admin");
// ERRORE TS: "P4" non e' un Ruolo -> il tipo del valore e' vincolato a T[K]
// const errato = getByField([dip], "ruolo", "P4");
void perBadge;
void perRuolo;

// ============================================================
// 8. Constraint con default type parameter
// ============================================================

// Possiamo dare un DEFAULT al type parameter, mantenendo il constraint.
// Se non specificato, T diventa HasId.
function conta<T extends HasId = HasId>(lista: T[]): number {
  return lista.length;
}
void conta(reparti); // => 2  (T = Reparto)
void conta([{ id: 1 }]); // => 1  (T = HasId, default)

// ============================================================
// 9. Constraint su string literal: validazione formati ERP
// ============================================================

// Constraint T extends string per lavorare con literal type precisi.
// Restituiamo il literal stesso, non un generico string.
function normalizzaBadge<T extends string>(badge: T): T {
  return badge;
}
const b = normalizzaBadge("UP-007");
// tipo: "UP-007"  (literal preservato grazie a T extends string)
void b;

// Regex di dominio (solo come costanti, nessun uso a runtime necessario).
const RE_ORARIO = /^\d{2}:\d{2}$/; // "HH:MM"
const RE_BADGE = /^UP-\d{3}$/; // "UP-001"
void RE_ORARIO;
void RE_BADGE;

// Type guard generico vincolato: verifica che una entita' abbia una chiave.
function haChiave<T extends object, K extends PropertyKey>(
  oggetto: T,
  chiave: K
): oggetto is T & Record<K, unknown> {
  return chiave in oggetto;
}
if (haChiave(dip, "badge")) {
  void dip.badge; // OK
}

// ============================================================
// 10. Constraint ricorsivo / annidato su entita' correlate
// ============================================================

// Un'entita' che referenzia un'altra entita' con id.
interface ConRiferimento<R extends HasId> {
  id: number;
  riferimento: R;
}

// Timbratura legata al suo Dipendente (join in memoria).
const legame: ConRiferimento<Dipendente> = {
  id: 100,
  riferimento: dip,
};
// tipo di legame.riferimento: Dipendente
void legame.riferimento.ruolo; // OK

// Funzione che estrae l'id dell'entita' referenziata.
function idRiferimento<R extends HasId>(x: ConRiferimento<R>): number {
  return x.riferimento.id;
}
void idRiferimento(legame); // => 1

// ============================================================
// 11. Export dei simboli locali (solo cose definite in questo file)
// ============================================================

export {
  lunghezza,
  getProp,
  setProp,
  pick,
  estraiIds,
  getById,
  getByIdOrThrow,
  getByField,
  idRiferimento,
};
export type {
  Ruolo,
  Turno,
  Dipendente,
  Reparto,
  Timbratura,
  HasId,
  ConRiferimento,
};

/*
 * ============================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================
 * - <T extends X>: vincola T; dentro la funzione puoi usare i membri di X.
 * - Il constraint NON collassa T a X: T resta il tipo specifico inferito.
 * - keyof T: union delle chiavi di T (string | number | symbol literal).
 * - <K extends keyof T>: K e' una chiave reale di T -> accesso sicuro.
 * - T[K]: indexed access type = tipo della proprieta' K di T.
 * - T extends { id: number } (HasId): pattern per funzioni su entita' con id.
 * - getById<T extends HasId>(lista, id): T | undefined -> ricerca fallibile.
 * - getByIdOrThrow: ritorna T (niente undefined) lanciando se assente.
 * - getByField<T extends HasId, K extends keyof T>: cerca per campo tipizzato.
 * - <T extends HasId = HasId>: constraint + default type parameter.
 * - <T extends string>: preserva i literal type (es. "UP-007").
 * - Type guard generico: oggetto is T & Record<K, unknown> con "in".
 * - Errori comuni: chiave inesistente, valore di tipo sbagliato per T[K],
 *   entita' senza id passata a una funzione vincolata a HasId.
 */
