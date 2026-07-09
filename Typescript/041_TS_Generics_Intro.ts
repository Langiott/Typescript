/**
 * File 041 - Generics intro
 * Corso TypeScript - livello INTERMEDIATE.
 * Perche' i generics: scrivere codice riutilizzabile SENZA perdere le
 * informazioni di type (a differenza di 'any'). Vediamo identity<T>,
 * box<T>, l'inferenza automatica del type parameter T e la motivazione
 * type-safety confrontata con 'any'. Dominio ERP Polyuretech dove utile.
 */

// ============================================================
// 1. IL PROBLEMA: 'any' butta via i tipi
// ============================================================

// Una funzione "identita'" che ritorna cio' che riceve.
// Con 'any' funziona a runtime ma perdiamo ogni informazione di type.
function identityAny(value: any): any {
  return value;
}

const a1 = identityAny("UP-001"); // tipo: any (NON string!)
const a2 = identityAny(42);       // tipo: any
// Nessun errore qui sotto, ma e' un bug silenzioso: 'any' disabilita i controlli.
const wrong = a1.toFixed(2); // NESSUN ERRORE TS, ma a1 e' una string -> crash a runtime

// ============================================================
// 2. LA SOLUZIONE: identity<T>
// ============================================================

// <T> e' un type parameter (un "type variabile"). T viene deciso
// al momento della chiamata e collega input e output.
function identity<T>(value: T): T {
  return value;
}

const s1 = identity<string>("UP-001"); // tipo: string (esplicito)
const n1 = identity<number>(42);       // tipo: number

// L'inferenza di T: spesso non serve scrivere <string>, TS lo deduce
// dall'argomento passato.
const s2 = identity("Mario Rossi"); // T inferito = string -> tipo: string
const n2 = identity(2026);          // T inferito = number -> tipo: number
const b2 = identity(true);          // T inferito = boolean -> tipo: boolean

// Ora i controlli funzionano davvero:
const upper = s2.toUpperCase(); // OK: s2 e' string
// ERRORE TS: Property 'toFixed' does not exist on type 'string'.
// const bug = s2.toFixed(2);

// ============================================================
// 3. INFERENZA: il tipo letterale vs allargato (widening)
// ============================================================

// Con un valore letterale, T viene inferito al tipo "allargato" (widened).
const t1 = identity("P4"); // T = string -> tipo: string (non "P4")

// Se vogliamo mantenere il literal type, usiamo 'as const' oppure
// passiamo esplicitamente il type argument.
const t2 = identity("P4" as const); // T = "P4" -> tipo: "P4"
const t3 = identity<"P4" | "P2" | "STD">("P4"); // tipo: "P4" | "P2" | "STD"

// ============================================================
// 4. box<T>: un contenitore generico
// ============================================================

// Un Box "avvolge" un valore di tipo T mantenendone il type.
interface Box<T> {
  readonly value: T;
}

// Factory function che costruisce un Box<T> con T inferito.
function box<T>(value: T): Box<T> {
  return { value };
}

const badgeBox = box("UP-007");     // tipo: Box<string>
const annoBox = box(2026);          // tipo: Box<number>
const flagBox = box(false);         // tipo: Box<boolean>

// Accedendo a .value riotteniamo il type corretto, non 'any'.
const badge = badgeBox.value;       // tipo: string
const anno = annoBox.value;         // tipo: number
// ERRORE TS: Property 'push' does not exist on type 'string'.
// badge.push("x");

// unbox: estrae il contenuto di un Box<T> preservando T.
function unbox<T>(b: Box<T>): T {
  return b.value;
}
const estratto = unbox(badgeBox);   // tipo: string

// ============================================================
// 5. Perche' i generics battono 'any': confronto diretto
// ============================================================

// Versione con 'any': accetta tutto ma NON collega i due parametri.
function pairAny(first: any, second: any): any[] {
  return [first, second];
}
const pAny = pairAny(1, "due"); // tipo: any[] -> [1, "due"], ma nessun controllo

// Versione generic: due type parameter distinti, tutto tracciato.
function pair<A, B>(first: A, second: B): [A, B] {
  return [first, second];
}
const p1 = pair(1, "due"); // tipo: [number, string]
const primo = p1[0];       // tipo: number
const secondo = p1[1];     // tipo: string

// ============================================================
// 6. Generics con array e dominio ERP
// ============================================================

// firstOrNull: ritorna il primo elemento di un array o null.
// T viene inferito dall'array passato: niente 'any', niente cast.
function firstOrNull<T>(items: T[]): T | null {
  return items.length > 0 ? items[0] : null;
}

const orari = ["08:00", "12:30", "17:00"];
const primoOrario = firstOrNull(orari); // tipo: string | null

const badges = [1, 2, 3];
const primoBadge = firstOrNull(badges); // tipo: number | null

// Entita' di dominio (mock locali, nessun import esterno).
interface Dipendente {
  readonly id: number;
  readonly nome: string;
  readonly badge: `UP-${string}`; // template literal type per badge "UP-001"
  readonly ruolo: Ruolo;
}
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

const staff: Dipendente[] = [
  { id: 1, nome: "Mario Rossi", badge: "UP-001", ruolo: "Admin" },
  { id: 2, nome: "Lucia Bianchi", badge: "UP-002", ruolo: "Operatore" },
];

const primoDip = firstOrNull(staff); // tipo: Dipendente | null
// Grazie ai generics abbiamo autocomplete e controllo su primoDip.nome ecc.
const nomePrimo = primoDip?.nome;    // tipo: string | undefined

// ============================================================
// 7. wrapInArray e identity applicati insieme
// ============================================================

// Avvolge un singolo valore in un array tipizzato.
function wrapInArray<T>(value: T): T[] {
  return [value];
}
const arrTurno = wrapInArray<"P4" | "P2" | "STD">("P4"); // tipo: ("P4" | "P2" | "STD")[]
const arrNum = wrapInArray(99); // tipo: number[]

// Componiamo box + identity mantenendo il type fino in fondo.
const composto = unbox(box(identity("UP-042"))); // tipo: string

// ============================================================
// 8. Generic su Box con oggetti di dominio
// ============================================================

// Box puo' contenere qualsiasi cosa, anche una entita' ERP.
const dipBox = box<Dipendente>({
  id: 3,
  nome: "Anna Verdi",
  badge: "UP-003",
  ruolo: "SuperAdmin",
});
// tipo di dipBox: Box<Dipendente>
const ruoloDip = dipBox.value.ruolo; // tipo: Ruolo

// ERRORE TS: property 'ruolo' missing / badge non e' assegnabile.
// const cattivo = box<Dipendente>({ id: 4, nome: "X" });

// ============================================================
// 9. Un mini esempio: mapBox (trasforma il contenuto di un Box)
// ============================================================

// Prende un Box<T> e una funzione T->U, restituisce Box<U>.
// Mostra come piu' type parameter collaborano nell'inferenza.
function mapBox<T, U>(b: Box<T>, fn: (v: T) => U): Box<U> {
  return box(fn(b.value));
}

const lunghezzaBadge = mapBox(box("UP-099"), (s) => s.length); // tipo: Box<number>
const len = lunghezzaBadge.value; // tipo: number -> // => 6

const ruoloDaDip = mapBox(dipBox, (d) => d.ruolo); // tipo: Box<Ruolo>

// ============================================================
// 10. Validazione tipizzata (pattern ERP) con generics
// ============================================================

// Un validatore generico: prende un valore grezzo e ritorna T oppure null.
// Qui NON usiamo generics per il regex, ma per il risultato tipizzato.
const orarioRegex = /^\d{2}:\d{2}$/;
const badgeRegex = /^UP-\d{3}$/;

// asOrario "restringe" una string generica al literal type Orario.
type Orario = `${number}${number}:${number}${number}`;

function parseWith<T extends string>(raw: string, re: RegExp): T | null {
  return re.test(raw) ? (raw as T) : null;
}

const okOrario = parseWith<Orario>("08:30", orarioRegex); // tipo: Orario | null
const okBadge = parseWith<`UP-${string}`>("UP-010", badgeRegex); // tipo: `UP-${string}` | null
const koOrario = parseWith<Orario>("8:3", orarioRegex);   // => null a runtime

// ============================================================
// 11. Export dei simboli locali (solo roba definita qui)
// ============================================================

export { identity, box, unbox, pair, firstOrNull, wrapInArray, mapBox, parseWith };
export type { Box, Dipendente, Ruolo, Orario };

/*
============================================================
RIEPILOGO COMANDI / CONCETTI
============================================================
- 'any' compila ma DISATTIVA i controlli di type -> bug silenziosi.
- Generic = type parametrico: function nome<T>(...) usa T come segnaposto.
- identity<T>(v: T): T collega input e output allo stesso type.
- Inferenza: TS deduce T dall'argomento -> spesso <T> e' opzionale.
- Widening: un literal ("P4") viene inferito come string; usa 'as const'
  o passa <"P4"> per mantenere il literal type.
- Box<T> = interface contenitore generico; box()/unbox() factory/estrattore.
- Piu' type parameter: pair<A,B>, mapBox<T,U> tracciano tipi distinti.
- Generic su array: firstOrNull<T>(T[]): T | null, wrapInArray<T>(T): T[].
- Constraint: <T extends string> limita T ai type assegnabili a string.
- Vantaggio vs 'any': autocomplete, refactor sicuri, errori a compile-time.
============================================================
*/
