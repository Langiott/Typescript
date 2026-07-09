/**
 * File 056 - Iterators & Generators typed
 * Corso TypeScript - argomento: iterator e generator tipizzati.
 * In questo file vediamo il protocollo Iterator<T> / Iterable<T>, le generator
 * function (function*), il type Generator<T, TReturn, TNext>, lo yield tipizzato,
 * il ciclo for..of e alcuni esempi pratici sul dominio ERP (range, turni, badge).
 * Tutto in strict mode, target ES2022, senza librerie esterne.
 */

// ============================================================================
// 1. IL PROTOCOLLO ITERATOR: cosa significa "iterabile"
// ============================================================================

// Un Iterator<T> e' un oggetto con un metodo next() che restituisce
// { value: T, done: boolean }. Definiamolo a mano per capire il contratto.

// Iterator che conta da 0 a 2 (esempio manuale, senza generator).
function creaContatore(): Iterator<number> {
  let i = 0;
  return {
    next(): IteratorResult<number> {
      // IteratorResult<T> = { done: false, value: T } | { done: true, value: any }
      if (i < 3) {
        return { done: false, value: i++ }; // value tipo: number
      }
      return { done: true, value: undefined };
    },
  };
}

const cont = creaContatore();
// console output atteso:
// cont.next() => { done: false, value: 0 }
// cont.next() => { done: false, value: 1 }
// cont.next() => { done: false, value: 2 }
// cont.next() => { done: true,  value: undefined }

// Un Iterable<T> e' un oggetto che possiede il metodo [Symbol.iterator]()
// che restituisce un Iterator<T>. Solo gli Iterable si usano nel for..of.

// Range iterabile fatto a mano (senza generator) per mostrare il protocollo pieno.
const rangeManuale: Iterable<number> = {
  [Symbol.iterator](): Iterator<number> {
    let n = 0;
    return {
      next(): IteratorResult<number> {
        return n < 3
          ? { done: false, value: n++ }
          : { done: true, value: undefined };
      },
    };
  },
};

for (const x of rangeManuale) {
  // x tipo: number
  void x; // 0, 1, 2
}

// ============================================================================
// 2. GENERATOR FUNCTION: function* e yield
// ============================================================================

// Una generator function (function*) crea automaticamente un oggetto che e'
// SIA Iterator SIA Iterable. Ogni yield sospende l'esecuzione e produce un value.
// Il return type inferito e': Generator<number, void, unknown>.

function* contaFinoATre() {
  yield 0;
  yield 1;
  yield 2;
}
// tipo inferito: () => Generator<number, void, unknown>

const g = contaFinoATre();
// g.next() => { value: 0, done: false }
// g.next() => { value: 1, done: false }
// g.next() => { value: 2, done: false }
// g.next() => { value: undefined, done: true }

for (const n of contaFinoATre()) {
  void n; // tipo: number  => 0, 1, 2
}

// Generator infinito: lecito perche' il consumatore decide quando fermarsi.
function* idInfiniti(): Generator<number, never, unknown> {
  let id = 1;
  while (true) {
    yield id++;
  }
}
const gen = idInfiniti();
// gen.next().value tipo: number  => 1, poi 2, poi 3 ...

// ============================================================================
// 3. IL TYPE Generator<T, TReturn, TNext> IN DETTAGLIO
// ============================================================================

// I tre parametri:
//   T       = tipo dei value prodotti da yield
//   TReturn = tipo del value finale (return dentro il generator)
//   TNext   = tipo del value che arriva DENTRO al generator da next(arg)

// Generator che yield stringhe e alla fine RITORNA un number (conteggio).
function* elencaEConta(parole: string[]): Generator<string, number, unknown> {
  for (const p of parole) {
    yield p; // yield deve essere di tipo string (T)
  }
  return parole.length; // return deve essere number (TReturn)
}

const ge = elencaEConta(["a", "b", "c"]);
let passo = ge.next();
while (!passo.done) {
  // passo.value tipo: string (quando done === false)
  void passo.value;
  passo = ge.next();
}
// Quando done === true, passo.value tipo: number => 3

// ERRORE TS: yield di tipo sbagliato non compila.
// function* soloStringhe(): Generator<string> {
//   yield 42; // ERRORE TS: Type 'number' is not assignable to type 'string'.
// }

// ============================================================================
// 4. TNext: passare valori DENTRO al generator con next(arg)
// ============================================================================

// Il valore restituito da un'espressione yield e' cio' che si passa a next().
// Qui TNext = number: ogni next(n) inietta un number che yield "riceve".
function* accumulatore(): Generator<number, void, number> {
  let totale = 0;
  while (true) {
    const aggiunta: number = yield totale; // aggiunta ha tipo TNext = number
    totale += aggiunta;
  }
}
const acc = accumulatore();
acc.next(); // primo next avvia il generator (l'arg qui viene ignorato) => value 0
// acc.next(10).value => 10
// acc.next(5).value  => 15
// acc.next(100).value => 115

// ERRORE TS: passare il tipo sbagliato a next viene segnalato.
// acc.next("x"); // ERRORE TS: Argument of type 'string' is not assignable to 'number'.

// ============================================================================
// 5. ESEMPIO RANGE TIPIZZATO (utility generica)
// ============================================================================

// range(start, end, step) come generator: lazy, non alloca array.
function* range(start: number, end: number, step = 1): Generator<number, void, unknown> {
  if (step === 0) throw new Error("step non puo' essere 0");
  if (step > 0) {
    for (let i = start; i < end; i += step) yield i;
  } else {
    for (let i = start; i > end; i += step) yield i;
  }
}

for (const i of range(0, 5)) {
  void i; // => 0, 1, 2, 3, 4
}
for (const i of range(10, 0, -2)) {
  void i; // => 10, 8, 6, 4, 2
}

// Spread di un generator in un array (consuma tutto l'iterator).
const primiTre: number[] = [...range(1, 4)]; // => [1, 2, 3]
void primiTre;

// ============================================================================
// 6. DOMINIO ERP: entita e union di riferimento
// ============================================================================

// Union dei ruoli applicativi (come nell'ERP Polyuretech).
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Union dei turni di produzione.
type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  id: number;
  nome: string;
  badge: `UP-${number}` | string; // badge tipo "UP-001"
  ruolo: Ruolo;
}

interface Timbratura {
  dipendenteId: number;
  entrata: string; // orario naive-UTC "HH:MM"
  uscita: string;  // orario naive-UTC "HH:MM"
}

const RE_BADGE = /^UP-\d{3}$/;
const RE_ORARIO = /^\d{2}:\d{2}$/;

// ============================================================================
// 7. GENERATOR SU ENTITA ERP: filtrare dipendenti in modo lazy
// ============================================================================

// Generator che produce solo i dipendenti con un dato ruolo, senza array intermedi.
function* dipendentiPerRuolo(
  lista: readonly Dipendente[],
  ruolo: Ruolo,
): Generator<Dipendente, void, unknown> {
  for (const d of lista) {
    if (d.ruolo === ruolo) yield d;
  }
}

const staff: Dipendente[] = [
  { id: 1, nome: "Anna", badge: "UP-001", ruolo: "Admin" },
  { id: 2, nome: "Bruno", badge: "UP-002", ruolo: "Operatore" },
  { id: 3, nome: "Carla", badge: "UP-003", ruolo: "Operatore" },
];

for (const op of dipendentiPerRuolo(staff, "Operatore")) {
  // op tipo: Dipendente => Bruno, poi Carla
  void op.nome;
}

// ============================================================================
// 8. ESEMPIO TURNI: generator che cicla i turni in modo infinito
// ============================================================================

// Ciclo di turni: STD -> P2 -> P4 -> STD -> ...  (rotazione settimanale).
function* rotazioneTurni(): Generator<Turno, never, unknown> {
  const sequenza: readonly Turno[] = ["STD", "P2", "P4"];
  let i = 0;
  while (true) {
    yield sequenza[i % sequenza.length]!; // il "!" perche' i%len e' sempre in range
    i++;
  }
}

// Assegna un turno a ciascun dipendente ruotando la sequenza.
function assegnaTurni(dips: readonly Dipendente[]): Map<number, Turno> {
  const rot = rotazioneTurni();
  const out = new Map<number, Turno>();
  for (const d of dips) {
    const t = rot.next().value; // t tipo: Turno (mai done perche' never)
    out.set(d.id, t);
  }
  return out;
}
const turni = assegnaTurni(staff);
// turni.get(1) => "STD", turni.get(2) => "P2", turni.get(3) => "P4"
void turni;

// ============================================================================
// 9. GENERATOR CHE VALIDA ORARI E PRODUCE SOLO TIMBRATURE VALIDE
// ============================================================================

// Filtra le timbrature il cui formato orario rispetta /^\d{2}:\d{2}$/.
function* timbratureValide(
  righe: readonly Timbratura[],
): Generator<Timbratura, void, unknown> {
  for (const t of righe) {
    if (RE_ORARIO.test(t.entrata) && RE_ORARIO.test(t.uscita)) {
      yield t;
    }
  }
}

const righeGrezze: Timbratura[] = [
  { dipendenteId: 1, entrata: "08:00", uscita: "17:00" }, // valida
  { dipendenteId: 2, entrata: "8:0", uscita: "17:00" },   // scartata (formato)
  { dipendenteId: 3, entrata: "09:15", uscita: "18:30" }, // valida
];
const valide = [...timbratureValide(righeGrezze)]; // => 2 elementi
void valide;

// ============================================================================
// 10. yield* DELEGATION: comporre generator
// ============================================================================

// yield* delega ad un altro iterable, "srotolando" i suoi value nel chiamante.
function* pari(fino: number): Generator<number, void, unknown> {
  yield* range(0, fino, 2); // delega al generator range
}
const listaPari = [...pari(10)]; // => [0, 2, 4, 6, 8]
void listaPari;

// Delegation combinando piu' sorgenti.
function* tuttiIBadge(dips: readonly Dipendente[]): Generator<string, void, unknown> {
  for (const d of dips) yield d.badge;
}
function* badgeConHeader(dips: readonly Dipendente[]): Generator<string, void, unknown> {
  yield "== BADGE LIST ==";
  yield* tuttiIBadge(dips); // srotola tutti i badge
}
const righeBadge = [...badgeConHeader(staff)];
// => ["== BADGE LIST ==", "UP-001", "UP-002", "UP-003"]
void righeBadge;

// ============================================================================
// 11. IMPLEMENTARE Iterable<T> IN UNA CLASSE
// ============================================================================

// Una classe diventa iterabile implementando [Symbol.iterator] con un generator.
// Qui una collezione di dipendenti che si puo' usare nel for..of.
class RepartoIterabile implements Iterable<Dipendente> {
  private membri: Dipendente[] = [];

  aggiungi(d: Dipendente): void {
    this.membri.push(d);
  }

  // Il metodo generator rende la classe un Iterable<Dipendente>.
  *[Symbol.iterator](): Iterator<Dipendente> {
    for (const m of this.membri) {
      yield m;
    }
  }

  // Metodo che restituisce un iterator SOLO dei badge validi.
  *badgeValidi(): Generator<string, void, unknown> {
    for (const m of this.membri) {
      if (RE_BADGE.test(m.badge)) yield m.badge;
    }
  }
}

const reparto = new RepartoIterabile();
reparto.aggiungi(staff[0]!);
reparto.aggiungi(staff[1]!);
for (const d of reparto) {
  // d tipo: Dipendente => Anna, Bruno
  void d.nome;
}
const badges = [...reparto.badgeValidi()]; // => ["UP-001", "UP-002"]
void badges;

// ============================================================================
// 12. GENERIC GENERATOR: utility riusabili e tipizzate
// ============================================================================

// take: prende i primi n elementi da qualsiasi Iterable<T> (lazy).
function* take<T>(it: Iterable<T>, n: number): Generator<T, void, unknown> {
  let i = 0;
  for (const x of it) {
    if (i++ >= n) return;
    yield x;
  }
}
const primi3Id = [...take(idInfiniti(), 3)]; // => [1, 2, 3] su generator infinito
void primi3Id;

// map generico su iterable: trasforma T -> U mantenendo la lazyness.
function* mapIter<T, U>(it: Iterable<T>, fn: (x: T) => U): Generator<U, void, unknown> {
  for (const x of it) yield fn(x);
}
const nomi = [...mapIter(staff, (d) => d.nome)]; // tipo: string[] => ["Anna","Bruno","Carla"]
void nomi;

// filter generico su iterable con type guard per fare narrowing.
function* filterIter<T>(it: Iterable<T>, pred: (x: T) => boolean): Generator<T, void, unknown> {
  for (const x of it) if (pred(x)) yield x;
}
const soloAdmin = [...filterIter(staff, (d) => d.ruolo === "Admin")]; // => [Anna]
void soloAdmin;

// ============================================================================
// 13. IterableIterator<T>: il type restituito da [Symbol.iterator]() nativo
// ============================================================================

// Gli iterator nativi (Array, Map, Set) restituiscono IterableIterator<T>,
// che e' Iterator<T> + Iterable<T> insieme (puo' essere riusato nel for..of).
function primoElemento<T>(it: IterableIterator<T>): T | undefined {
  const r = it.next();
  return r.done ? undefined : r.value;
}
const primoNome = primoElemento(staff.values()); // staff.values(): IterableIterator<Dipendente>
// primoNome tipo: Dipendente | undefined
void primoNome;

// entries() su Map produce IterableIterator<[K, V]> destrutturabile nel for..of.
const mappaTurni = assegnaTurni(staff);
for (const [id, turno] of mappaTurni) {
  // id tipo: number, turno tipo: Turno
  void id;
  void turno;
}

// ============================================================================
// 14. EXPORT dei simboli locali (solo simboli definiti in questo file)
// ============================================================================

export {
  creaContatore,
  contaFinoATre,
  idInfiniti,
  range,
  dipendentiPerRuolo,
  rotazioneTurni,
  assegnaTurni,
  timbratureValide,
  take,
  mapIter,
  filterIter,
  RepartoIterabile,
};
export type { Ruolo, Turno, Dipendente, Timbratura };

/*
 * ============================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================================
 * - Iterator<T>            : oggetto con next() => IteratorResult<T> ({value, done}).
 * - Iterable<T>            : oggetto con [Symbol.iterator]() => Iterator<T>.
 * - IteratorResult<T>      : { done:false, value:T } | { done:true, value:any }.
 * - IterableIterator<T>    : Iterator<T> + Iterable<T> (Array/Map/Set .values()...).
 * - function*              : dichiara una generator function.
 * - yield x                : sospende ed emette x (tipo T del Generator).
 * - yield* iterable        : delega/srotola i value di un altro iterable.
 * - return v (in gen)      : produce il value finale (tipo TReturn).
 * - const a = yield ...    : a ha tipo TNext, cio' che passi a next(arg).
 * - Generator<T,TReturn,TNext> : T=yield, TReturn=return finale, TNext=next(arg).
 * - for..of                : consuma un Iterable, ferma quando done === true.
 * - [...iterable]          : spread, consuma TUTTO l'iterator in un array.
 * - Symbol.iterator        : chiave del metodo che rende iterabile una classe.
 * - generator lazy         : produce valori on-demand, ok anche infiniti (con take).
 * - implements Iterable<T> : classe usabile nel for..of via *[Symbol.iterator]().
 * ============================================================================
 */
