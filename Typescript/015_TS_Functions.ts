/**
 * File 015 - Functions (param/return types)
 * Corso TypeScript - livello FUNDAMENTALS.
 * Argomento: annotazione dei parametri e del return type, inferenza automatica
 * del return, funzioni come espressioni (function expression), arrow function,
 * ed esempio pratico ERP calcolaMinutiTurno(). Contesto dominio: ERP Polyuretech
 * (Dipendente, Timbratura, Turno). Nota: tutti gli esempi compilano con tsc --strict.
 */

// ---------------------------------------------------------------------------
// 1) ANNOTAZIONE DEI PARAMETRI E DEL RETURN TYPE
// ---------------------------------------------------------------------------

// Function declaration classica: ogni parametro ha un type, dopo la ")" c'e' il return type.
function saluta(nome: string): string {
  return "Ciao " + nome;
}
const s1 = saluta("Anna"); // tipo: string  => "Ciao Anna"

// Piu' parametri con type diversi.
function somma(a: number, b: number): number {
  return a + b;
}
const tot = somma(3, 4); // tipo: number  => 7

// Return type "void": la funzione non restituisce un valore utile.
function log(messaggio: string): void {
  // in un ERP reale qui scriveresti su un logger; usiamo un no-op didattico
  const _ = messaggio.length; // usiamo il parametro per non lasciarlo inerte
  void _;
}

// ERRORE TS: passare un type sbagliato viene bloccato in compilazione.
// somma("3", 4); // ERRORE TS: Argument of type 'string' is not assignable to parameter of type 'number'.

// ERRORE TS: se dichiari return string ma torni number, tsc protesta.
// function rotta(): string { return 42; } // ERRORE TS: Type 'number' is not assignable to type 'string'.

// ---------------------------------------------------------------------------
// 2) INFERENZA AUTOMATICA DEL RETURN TYPE
// ---------------------------------------------------------------------------

// Se NON annoti il return, TS lo inferisce dal corpo della funzione.
function raddoppia(n: number) {
  return n * 2;
} // return type inferito: number

const d = raddoppia(21); // tipo: number  => 42

// L'inferenza funziona anche con union: qui il return e' string | number.
function normalizzaBadge(input: string | number) {
  if (typeof input === "number") {
    return input; // ramo number
  }
  return input.toUpperCase(); // ramo string
} // return type inferito: string | number

// Consiglio: per le API pubbliche conviene ANNOTARE il return type esplicito,
// cosi' un errore nel corpo viene segnalato sulla funzione e non sul chiamante.
function areaRettangolo(base: number, altezza: number): number {
  return base * altezza; // se scrivessi base + altezza compila comunque, ma il type ci fa da guardia
}
void areaRettangolo;

// ---------------------------------------------------------------------------
// 3) PARAMETRI OPZIONALI, DEFAULT E REST
// ---------------------------------------------------------------------------

// Parametro opzionale con "?": all'interno il type diventa string | undefined.
function nomeCompleto(nome: string, cognome?: string): string {
  return cognome ? nome + " " + cognome : nome;
}
nomeCompleto("Mario");            // => "Mario"
nomeCompleto("Mario", "Rossi");   // => "Mario Rossi"

// Parametro con valore di default: il type si infersce dal default (qui number).
function incrementa(valore: number, passo: number = 1): number {
  return valore + passo;
}
incrementa(10);    // => 11
incrementa(10, 5); // => 15

// Rest parameter: raccoglie N argomenti in un array tipizzato.
function sommaTutti(...numeri: number[]): number {
  return numeri.reduce((acc, n) => acc + n, 0);
}
const s = sommaTutti(1, 2, 3, 4); // tipo: number  => 10
void [s1, tot, d, s, normalizzaBadge, log];

// ---------------------------------------------------------------------------
// 4) FUNZIONI COME ESPRESSIONI (FUNCTION EXPRESSION)
// ---------------------------------------------------------------------------

// Una function expression e' una funzione assegnata a una const/variabile.
const moltiplica = function (a: number, b: number): number {
  return a * b;
};
moltiplica(6, 7); // => 42

// Puoi tipizzare la variabile con un function type e lasciare inferire i parametri.
// Sintassi del function type: (param: T) => Return
type OperazioneBinaria = (a: number, b: number) => number;

const sottrai: OperazioneBinaria = (a, b) => a - b; // a e b sono number per inferenza contestuale
sottrai(10, 3); // => 7

// Le function expression sono comode da passare come callback ad altri metodi.
const badge = ["UP-001", "UP-002", "UP-010"];
const soloNumeri = badge.map(function (b: string): number {
  return Number(b.slice(3)); // "UP-010" -> 10
}); // tipo: number[]  => [1, 2, 10]
void [moltiplica, sottrai, soloNumeri];

// ---------------------------------------------------------------------------
// 5) ARROW FUNCTION
// ---------------------------------------------------------------------------

// Sintassi compatta: parametri => espressione (return implicito senza graffe).
const quadrato = (n: number): number => n * n;
quadrato(9); // => 81

// Con corpo a graffe serve il "return" esplicito.
const cubo = (n: number): number => {
  const q = n * n;
  return q * n;
};
cubo(3); // => 27

// Arrow senza parametri: le parentesi vuote sono obbligatorie.
const pi: () => number = () => 3.14159;
pi(); // => 3.14159

// ATTENZIONE: per restituire un OBJECT literal con return implicito, avvolgi in ().
const creaPunto = (x: number, y: number): { x: number; y: number } => ({ x, y });
creaPunto(1, 2); // => { x: 1, y: 2 }

// Arrow come predicate per filter: il return type inferito e' boolean.
const numeri = [1, 2, 3, 4, 5, 6];
const pari = numeri.filter((n) => n % 2 === 0); // tipo: number[]  => [2, 4, 6]
void [quadrato, cubo, pi, creaPunto, pari];

// ---------------------------------------------------------------------------
// 6) TIPI DEL DOMINIO ERP (mock locali, nessuna libreria esterna)
// ---------------------------------------------------------------------------
// NOTA: queste interface sono mock didattici definiti QUI dentro; nel progetto
// reale arriverebbero da Prisma o da un modulo di dominio.

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
}

interface Timbratura {
  entrata: string; // orario naive-UTC "HH:MM"
  uscita: string;  // orario naive-UTC "HH:MM"
  turno: Turno;
}

// Regex di validazione tipiche del dominio.
const RE_ORARIO = /^\d{2}:\d{2}$/; // "08:30"
const RE_BADGE = /^UP-\d{3}$/;     // "UP-001"

// Type guard: annota il return come "input is string" (type predicate).
// Se torna true, TS restringe (narrowing) il type nel ramo chiamante.
function isOrarioValido(input: string): input is string {
  return RE_ORARIO.test(input);
}

// Funzione di validazione badge con return boolean inferito.
const isBadgeValido = (badge: string): boolean => RE_BADGE.test(badge);
isBadgeValido("UP-001"); // => true
isBadgeValido("X1");     // => false

// ---------------------------------------------------------------------------
// 7) ESEMPIO ERP: calcolaMinutiTurno()
// ---------------------------------------------------------------------------

// Helper: converte "HH:MM" naive-UTC nei minuti totali dalla mezzanotte.
// Parametro string, return number annotato esplicitamente.
function orarioInMinuti(orario: string): number {
  const [ore, minuti] = orario.split(":").map((p) => Number(p));
  return ore * 60 + minuti; // "08:30" => 510
}
orarioInMinuti("00:00"); // => 0
orarioInMinuti("08:30"); // => 510

// Funzione principale: dati entrata e uscita "HH:MM" calcola i minuti lavorati.
// - parametri: due string
// - return: number (minuti); annotato per chiarezza e sicurezza
// - gestisce il turno che scavalca la mezzanotte (uscita < entrata)
function calcolaMinutiTurno(entrata: string, uscita: string): number {
  // Validazione input: se il formato e' errato lanciamo un errore.
  if (!isOrarioValido(entrata) || !isOrarioValido(uscita)) {
    throw new Error("Orario non valido, atteso formato HH:MM");
  }
  const inizio = orarioInMinuti(entrata);
  let fine = orarioInMinuti(uscita);
  // Turno notturno: se la fine e' <= inizio, aggiungiamo 24h (1440 min).
  if (fine <= inizio) {
    fine += 24 * 60;
  }
  return fine - inizio;
}

calcolaMinutiTurno("08:00", "17:00"); // => 540 (9 ore)
calcolaMinutiTurno("22:00", "06:00"); // => 480 (turno notturno, 8 ore)

// Overload di calcolaMinutiTurno che accetta direttamente una Timbratura.
// Le arrow/function possono ricevere object del dominio come parametro.
function minutiDaTimbratura(t: Timbratura): number {
  return calcolaMinutiTurno(t.entrata, t.uscita);
}
const tb: Timbratura = { entrata: "06:00", uscita: "14:00", turno: "P4" };
minutiDaTimbratura(tb); // => 480

// Funzione che usa Dipendente e restituisce una stringa descrittiva.
// return type inferito: string.
function descriviDipendente(dip: Dipendente) {
  return `#${dip.id} ${dip.nome} [${dip.badge}] ruolo=${dip.ruolo}`;
}
const mario: Dipendente = { id: 1, nome: "Mario", badge: "UP-001", ruolo: "Operatore" };
descriviDipendente(mario); // => "#1 Mario [UP-001] ruolo=Operatore"

// Higher-order function: prende una funzione come parametro (callback tipizzata)
// e restituisce il totale dei minuti su piu' timbrature.
function totaleMinuti(
  timbrature: Timbratura[],
  calcolo: (t: Timbratura) => number
): number {
  return timbrature.reduce((acc, t) => acc + calcolo(t), 0);
}
const settimana: Timbratura[] = [
  { entrata: "08:00", uscita: "12:00", turno: "STD" },
  { entrata: "13:00", uscita: "17:00", turno: "STD" },
];
totaleMinuti(settimana, minutiDaTimbratura); // => 480

void [descriviDipendente, totaleMinuti, minutiDaTimbratura, isBadgeValido];

// ---------------------------------------------------------------------------
// 8) FUNZIONE CHE RESTITUISCE UNA FUNZIONE (closure)
// ---------------------------------------------------------------------------

// Il return type e' esso stesso una funzione: (n: number) => number.
function creaMoltiplicatore(fattore: number): (n: number) => number {
  return (n) => n * fattore; // n inferito number dal contextual typing
}
const perTre = creaMoltiplicatore(3);
perTre(10); // tipo: number  => 30
void perTre;

// ---------------------------------------------------------------------------
// 9) EXPORT dei simboli locali (SOLO simboli definiti in questo file)
// ---------------------------------------------------------------------------
export {
  saluta,
  somma,
  calcolaMinutiTurno,
  minutiDaTimbratura,
  orarioInMinuti,
  isOrarioValido,
  isBadgeValido,
  totaleMinuti,
  creaMoltiplicatore,
};
export type { Dipendente, Timbratura, Ruolo, Turno, OperazioneBinaria };

// ---------------------------------------------------------------------------
// RIEPILOGO COMANDI / CONCETTI
// ---------------------------------------------------------------------------
// - Parametro tipizzato:            function f(x: number) { ... }
// - Return type esplicito:          function f(): string { ... }
// - Return type inferito:           TS lo deduce dal corpo se non lo annoti
// - void:                           funzione senza valore di ritorno utile
// - Parametro opzionale:            (x?: string) -> type string | undefined
// - Default parameter:              (x: number = 1) -> type inferito dal default
// - Rest parameter:                 (...xs: number[]) -> array tipizzato
// - Function expression:            const f = function (a: T): R { ... }
// - Function type:                  type F = (a: T) => R
// - Arrow function:                 const f = (a: T): R => espressione
// - Arrow return object literal:    (x) => ({ x })  (parentesi obbligatorie)
// - Type predicate (type guard):    function g(v): v is T  -> abilita narrowing
// - Higher-order function:          funzione che prende/restituisce funzioni
// - Closure:                        funzione che cattura variabili dello scope esterno
// - ERP: calcolaMinutiTurno(entrata, uscita) gestisce il turno oltre mezzanotte
