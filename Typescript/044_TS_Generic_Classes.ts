/**
 * File 044 - Generic Classes (Classi generiche)
 * Corso TypeScript - livello INTERMEDIATE.
 * In questo file vediamo come rendere generica una class: Box<T>, Stack<T>,
 * Repository<T>, i vincoli (constraint) sui type parameter di classe, e la
 * combinazione tra generics di classe e generics di metodo.
 * Dominio di esempio: ERP Polyuretech (Dipendente, Timbratura, Reparto).
 * Tutto ASCII, niente accenti: si scrive "puo'", "e'", "citta'".
 */

// ============================================================
// 1) Box<T>: il contenitore generico piu' semplice
// ============================================================

// Una class Box<T> incapsula un valore di tipo T.
// Il type parameter T e' dichiarato dopo il nome della classe.
class Box<T> {
  private value: T;

  constructor(value: T) {
    this.value = value;
  }

  get(): T {
    return this.value;
  }

  set(value: T): void {
    this.value = value;
  }
}

// T viene inferito dal costruttore.
const boxNum = new Box(42); // Box<number>
const n = boxNum.get(); // tipo: number  // => 42

const boxStr = new Box("UP-001"); // Box<string>
const badge = boxStr.get(); // tipo: string

// Si puo' anche annotare esplicitamente il type argument.
const boxTurno = new Box<"P4" | "P2" | "STD">("P4"); // Box<"P4"|"P2"|"STD">
boxTurno.set("STD"); // ok
// ERRORE TS: "P9" non e' assegnabile al type parameter unione.
// boxTurno.set("P9");

// ============================================================
// 2) Piu' type parameter su una classe: Pair<K, V>
// ============================================================

// Una classe puo' avere piu' type parameter indipendenti.
class Pair<K, V> {
  constructor(
    public readonly key: K,
    public readonly value: V,
  ) {}

  swap(): Pair<V, K> {
    // Ritorna una nuova coppia con i tipi invertiti.
    return new Pair(this.value, this.key);
  }
}

const p = new Pair("badge", "UP-007"); // Pair<string, string>
const p2 = new Pair<number, string>(3, "Reparto Stampaggio"); // Pair<number, string>
const swapped = p2.swap(); // tipo: Pair<string, number>

// ============================================================
// 3) Stack<T>: struttura dati generica LIFO
// ============================================================

// Stack generico: push/pop tipizzati, peek e size.
class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  // pop puo' restituire undefined se lo stack e' vuoto.
  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  get size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

const orari = new Stack<string>();
orari.push("08:00");
orari.push("12:30");
const ultimo = orari.pop(); // tipo: string | undefined  // => "12:30"
const quanti = orari.size; // tipo: number  // => 1

// ============================================================
// 4) Vincoli (constraint) sul type parameter di classe
// ============================================================

// Con 'extends' vincoliamo T ad avere almeno una certa forma.
// Qui pretendiamo che ogni entita' abbia un campo id: number.
interface HasId {
  id: number;
}

// La classe Registry<T> funziona solo con tipi che hanno un id.
class Registry<T extends HasId> {
  private byId = new Map<number, T>();

  add(item: T): void {
    // Possiamo leggere item.id perche' il constraint lo garantisce.
    this.byId.set(item.id, item);
  }

  find(id: number): T | undefined {
    return this.byId.get(id);
  }

  all(): T[] {
    return Array.from(this.byId.values());
  }
}

// Tipi di dominio ERP (mock, definiti qui nel file).
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
}

interface Reparto {
  id: number;
  nome: string;
}

const dipendenti = new Registry<Dipendente>();
dipendenti.add({ id: 1, nome: "Anna", badge: "UP-001", ruolo: "Operatore" });
const anna = dipendenti.find(1); // tipo: Dipendente | undefined

// ERRORE TS: { nome: string } non soddisfa il constraint HasId (manca id).
// const rotto = new Registry<{ nome: string }>();

// ============================================================
// 5) Repository<T>: pattern CRUD generico
// ============================================================

// Repository generico con constraint HasId: astrae la persistenza in memoria.
class Repository<T extends HasId> {
  protected store: T[] = [];

  create(entity: T): T {
    this.store.push(entity);
    return entity;
  }

  getById(id: number): T | undefined {
    return this.store.find((e) => e.id === id);
  }

  update(id: number, patch: Partial<T>): T | undefined {
    const found = this.store.find((e) => e.id === id);
    if (!found) return undefined;
    // Object.assign fonde il patch parziale sull'entita' esistente.
    Object.assign(found, patch);
    return found;
  }

  delete(id: number): boolean {
    const before = this.store.length;
    this.store = this.store.filter((e) => e.id !== id);
    return this.store.length < before;
  }

  list(): readonly T[] {
    return this.store;
  }
}

const repoReparti = new Repository<Reparto>();
repoReparti.create({ id: 10, nome: "Stampaggio" });
repoReparti.create({ id: 11, nome: "Assemblaggio" });
const rep = repoReparti.getById(10); // tipo: Reparto | undefined
repoReparti.update(11, { nome: "Assemblaggio 2" }); // Partial<Reparto>: solo nome
// ERRORE TS: 'colore' non esiste in Partial<Reparto>.
// repoReparti.update(11, { colore: "rosso" });

// ============================================================
// 6) Estendere una classe generica (subclass specializzata)
// ============================================================

// Una sottoclasse puo' fissare (specializzare) il type parameter del padre.
// DipendenteRepository e' un Repository<Dipendente> con metodi in piu'.
class DipendenteRepository extends Repository<Dipendente> {
  // Metodo di dominio: filtra per ruolo. Usa 'this.store' (protected).
  byRuolo(ruolo: Ruolo): Dipendente[] {
    return this.store.filter((d) => d.ruolo === ruolo);
  }

  byBadge(badge: string): Dipendente | undefined {
    return this.store.find((d) => d.badge === badge);
  }
}

const repoDip = new DipendenteRepository();
repoDip.create({ id: 1, nome: "Anna", badge: "UP-001", ruolo: "Operatore" });
repoDip.create({ id: 2, nome: "Bruno", badge: "UP-002", ruolo: "Admin" });
const operatori = repoDip.byRuolo("Operatore"); // tipo: Dipendente[]
const found = repoDip.getById(2); // ereditato: Dipendente | undefined

// ============================================================
// 7) Generics di classe + generics di metodo
// ============================================================

// Il type parameter di classe (T) vale per tutta l'istanza; un type
// parameter di metodo (U) e' locale alla singola chiamata.
class Collection<T> {
  constructor(private items: T[]) {}

  // map introduce un NUOVO type parameter U, indipendente da T.
  map<U>(fn: (item: T) => U): Collection<U> {
    return new Collection(this.items.map(fn));
  }

  toArray(): T[] {
    return this.items;
  }

  // U constrained a keyof T: estrae il valore di una property.
  pluck<K extends keyof T>(key: K): T[K][] {
    return this.items.map((item) => item[key]);
  }
}

const coll = new Collection<Dipendente>([
  { id: 1, nome: "Anna", badge: "UP-001", ruolo: "Operatore" },
  { id: 2, nome: "Bruno", badge: "UP-002", ruolo: "Admin" },
]);

const nomi = coll.pluck("nome"); // tipo: string[]  // => ["Anna","Bruno"]
const ids = coll.pluck("id"); // tipo: number[]  // => [1, 2]
const badges = coll.map((d) => d.badge); // tipo: Collection<string>
// ERRORE TS: "cognome" non e' una key di Dipendente.
// coll.pluck("cognome");

// ============================================================
// 8) Default type parameter e factory generica
// ============================================================

// Un type parameter puo' avere un valore di default (qui = string).
class Cache<T = string> {
  private map = new Map<string, T>();

  put(key: string, value: T): void {
    this.map.set(key, value);
  }

  get(key: string): T | undefined {
    return this.map.get(key);
  }
}

const cacheDefault = new Cache(); // Cache<string> per default
cacheDefault.put("turno", "P4");
const cacheNum = new Cache<number>(); // Cache<number>
cacheNum.put("count", 3);

// Metodo statico generico: introduce il proprio type parameter.
// Nota: i metodi static NON possono usare il T della classe istanza.
class BoxFactory {
  static of<V>(value: V): Box<V> {
    return new Box(value);
  }
}

const b = BoxFactory.of("UP-999"); // tipo: Box<string>

// ============================================================
// 9) Interfaccia generica implementata da una classe generica
// ============================================================

// Una class generica puo' implementare una interface generica.
interface Container<T> {
  add(item: T): void;
  getAll(): readonly T[];
}

// TimbratureBuffer<T> raccoglie orari validati come "HH:MM".
class TimbratureBuffer<T> implements Container<T> {
  private data: T[] = [];

  add(item: T): void {
    this.data.push(item);
  }

  getAll(): readonly T[] {
    return this.data;
  }
}

const orarioRegex = /^\d{2}:\d{2}$/;
const badgeRegex = /^UP-\d{3}$/;

const buffer = new TimbratureBuffer<string>();
if (orarioRegex.test("08:00")) buffer.add("08:00");
if (badgeRegex.test("UP-003")) {
  // badge valido secondo il pattern UP-000
}
const tutte = buffer.getAll(); // tipo: readonly string[]

// ============================================================
// 10) Esempio integrato: Stack<T> di Timbratura
// ============================================================

// Naive-UTC: gli orari sono stringhe "HH:MM", non oggetti Date.
type Turno = "P4" | "P2" | "STD";

interface Timbratura {
  id: number;
  dipendenteId: number;
  tipo: "entrata" | "uscita";
  orario: string; // "HH:MM"
  turno: Turno;
}

// Usiamo lo Stack<T> generico definito sopra, specializzato su Timbratura.
const pila = new Stack<Timbratura>();
pila.push({ id: 1, dipendenteId: 1, tipo: "entrata", orario: "08:00", turno: "P4" });
pila.push({ id: 2, dipendenteId: 1, tipo: "uscita", orario: "17:00", turno: "P4" });
const ultimaTimbratura = pila.peek(); // tipo: Timbratura | undefined
const numTimbrature = pila.size; // tipo: number  // => 2

// ============================================================
// 11) Export dei simboli locali (solo definiti in questo file)
// ============================================================

export {
  Box,
  Pair,
  Stack,
  Registry,
  Repository,
  DipendenteRepository,
  Collection,
  Cache,
  BoxFactory,
  TimbratureBuffer,
};

export type {
  HasId,
  Container,
  Dipendente,
  Reparto,
  Timbratura,
  Ruolo,
  Turno,
};

/*
 * ============================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================
 * - class Box<T> { ... }         : type parameter dichiarato dopo il nome.
 * - new Box(42)                  : T inferito dal costruttore (Box<number>).
 * - new Box<string>(...)         : type argument esplicito.
 * - class Pair<K, V>             : piu' type parameter indipendenti.
 * - swap(): Pair<V, K>           : metodo che ritorna tipi riordinati.
 * - Stack<T> / Repository<T>     : strutture dati e pattern CRUD generici.
 * - <T extends HasId>            : constraint sul type parameter di classe.
 * - Partial<T>                   : patch parziale in update().
 * - class Sub extends Repo<Dip>  : subclass che fissa il type parameter.
 * - protected store             : accessibile dalle sottoclassi.
 * - map<U>(...) / pluck<K ...>   : generics di METODO, locali alla chiamata.
 * - K extends keyof T -> T[K]    : estrarre valori di property tipizzati.
 * - class Cache<T = string>      : default type parameter.
 * - static of<V>(...)            : metodo statico generico (no T di istanza).
 * - implements Container<T>      : classe generica che implementa interface generica.
 * - readonly T[]                 : ritorni immutabili per incapsulamento.
 * ============================================================
 */
