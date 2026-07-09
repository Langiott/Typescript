/**
 * File 045 - Generic Interfaces (interface generiche)
 * Corso TypeScript - livello INTERMEDIATE.
 * Le generic interfaces permettono di parametrizzare una interface con uno o
 * piu' type parameter (<T>, <K, V>), riusando la stessa "forma" per tipi diversi.
 * Qui vediamo ApiResponse<T>, Comparatore<T>, Collection<T> e i default type parameter,
 * con esempi ispirati al dominio ERP Polyuretech (Dipendente, Timbratura, Reparto).
 */

// ============================================================
// 0) Entita' di dominio ERP usate negli esempi
// ============================================================

// Ruoli come union di string literal.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Turno tipico dei reparti produttivi.
type Turno = "P4" | "P2" | "STD";

// Entita' Dipendente: badge nel formato "UP-001".
interface Dipendente {
  id: number;
  nome: string;
  badge: `UP-${string}`; // template literal type, es: "UP-001"
  ruolo: Ruolo;
}

// Timbratura: orari come stringhe naive-UTC "HH:MM".
interface Timbratura {
  dipendenteId: number;
  entrata: string; // "08:00"
  uscita: string;  // "17:00"
}

// Reparto produttivo.
interface Reparto {
  codice: string;
  descrizione: string;
  turno: Turno;
}

// ============================================================
// 1) La generic interface piu' semplice: un "box" tipizzato
// ============================================================

// Box<T> incapsula un valore di tipo T. Il type parameter T e' scelto
// da chi usa la interface, non da chi la definisce.
interface Box<T> {
  value: T;
}

const boxNumero: Box<number> = { value: 42 };
const boxNome: Box<string> = { value: "Polyuretech" };
const boxDip: Box<Dipendente> = {
  value: { id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Operatore" },
};
// boxNumero.value ha tipo: number
// boxNome.value ha tipo: string

// ERRORE TS: il tipo di value deve combaciare con l'argomento T.
// const sbagliato: Box<number> = { value: "no" };
// ERRORE TS: Type 'string' is not assignable to type 'number'.

// ============================================================
// 2) ApiResponse<T>: il pattern classico delle risposte HTTP
// ============================================================

// ApiResponse<T> descrive una risposta con esito, dati e messaggio.
// T e' il tipo del payload "data": cambia per ogni endpoint.
interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T;
  message?: string; // opzionale
}

// Risposta con un singolo Dipendente.
const respDip: ApiResponse<Dipendente> = {
  ok: true,
  status: 200,
  data: { id: 2, nome: "Bianchi", badge: "UP-002", ruolo: "Admin" },
};
// respDip.data ha tipo: Dipendente
// respDip.data.badge ha tipo: `UP-${string}`

// Risposta con una lista di Timbratura: T = Timbratura[].
const respTimbr: ApiResponse<Timbratura[]> = {
  ok: true,
  status: 200,
  data: [
    { dipendenteId: 2, entrata: "08:00", uscita: "17:00" },
    { dipendenteId: 2, entrata: "08:05", uscita: "16:55" },
  ],
};
// respTimbr.data ha tipo: Timbratura[]

// Risposta di errore: nessun payload utile -> T = null.
const respErrore: ApiResponse<null> = {
  ok: false,
  status: 404,
  data: null,
  message: "Dipendente non trovato",
};

// Funzione generica che costruisce una risposta di successo.
// Il type parameter T viene INFERITO dal valore passato.
function ok<T>(data: T, status = 200): ApiResponse<T> {
  return { ok: true, status, data };
}

const r1 = ok({ id: 3, nome: "Verdi", badge: "UP-003", ruolo: "Operatore" } as Dipendente);
// r1 ha tipo: ApiResponse<Dipendente>
const r2 = ok(["P4", "P2", "STD"] as Turno[]);
// r2 ha tipo: ApiResponse<Turno[]>

// ============================================================
// 3) Comparatore<T>: interface con method signature generica
// ============================================================

// Comparatore<T> definisce come confrontare due valori di tipo T.
// Ritorna < 0, 0, > 0 come la classica compare function.
interface Comparatore<T> {
  compara(a: T, b: T): number;
}

// Comparatore di Dipendente per id crescente.
const perId: Comparatore<Dipendente> = {
  compara: (a, b) => a.id - b.id,
};

// Comparatore di Dipendente per nome alfabetico.
const perNome: Comparatore<Dipendente> = {
  compara: (a, b) => a.nome.localeCompare(b.nome),
};
// perNome.compara(x, y) ha tipo: number

// Funzione di sort che accetta un Comparatore<T> generico.
function ordina<T>(lista: T[], cmp: Comparatore<T>): T[] {
  return [...lista].sort(cmp.compara);
}

const dipendenti: Dipendente[] = [
  { id: 3, nome: "Verdi", badge: "UP-003", ruolo: "Operatore" },
  { id: 1, nome: "Anselmi", badge: "UP-001", ruolo: "Admin" },
  { id: 2, nome: "Bianchi", badge: "UP-002", ruolo: "Operatore" },
];

const ordinatiPerId = ordina(dipendenti, perId);
// ordinatiPerId[0].id => 1
const ordinatiPerNome = ordina(dipendenti, perNome);
// ordinatiPerNome[0].nome => "Anselmi"

// La stessa interface Comparatore<T> funziona anche per i Turno (stringhe).
const perTurno: Comparatore<Turno> = {
  compara: (a, b) => a.localeCompare(b),
};
const turniOrdinati = ordina(["STD", "P2", "P4"], perTurno);
// turniOrdinati => ["P2", "P4", "STD"]

// ============================================================
// 4) Interface generica con method signature "call signature"
// ============================================================

// Una interface puo' descrivere direttamente una funzione generica.
// Validatore<T> e' un tipo chiamabile: prende T e ritorna boolean.
interface Validatore<T> {
  (valore: T): boolean;
}

// Validatore di orario "HH:MM".
const orarioValido: Validatore<string> = (v) => /^\d{2}:\d{2}$/.test(v);
// orarioValido("08:30") => true
// orarioValido("8:30")  => false  (mancano le due cifre)

// Validatore di badge "UP-001".
const badgeValido: Validatore<string> = (v) => /^UP-\d{3}$/.test(v);
// badgeValido("UP-001") => true
// badgeValido("UP-1")   => false

// ============================================================
// 5) Collection<T>: interface generica con piu' metodi
// ============================================================

// Collection<T> descrive un contenitore ordinato con operazioni base.
interface Collection<T> {
  readonly items: readonly T[];
  add(item: T): void;
  get(index: number): T | undefined;
  size(): number;
  find(predicate: (item: T) => boolean): T | undefined;
}

// Implementazione concreta con una class che rispetta Collection<T>.
class Lista<T> implements Collection<T> {
  private _items: T[] = [];

  get items(): readonly T[] {
    return this._items;
  }

  add(item: T): void {
    this._items.push(item);
  }

  get(index: number): T | undefined {
    return this._items[index];
  }

  size(): number {
    return this._items.length;
  }

  find(predicate: (item: T) => boolean): T | undefined {
    return this._items.find(predicate);
  }
}

// Uso della Collection con Dipendente.
const rubrica: Collection<Dipendente> = new Lista<Dipendente>();
rubrica.add({ id: 1, nome: "Anselmi", badge: "UP-001", ruolo: "Admin" });
rubrica.add({ id: 2, nome: "Bianchi", badge: "UP-002", ruolo: "Operatore" });
// rubrica.size() => 2
const admin = rubrica.find((d) => d.ruolo === "Admin");
// admin?.nome => "Anselmi"
// admin ha tipo: Dipendente | undefined

// La stessa Collection<T> per Timbratura.
const timbrature: Collection<Timbratura> = new Lista<Timbratura>();
timbrature.add({ dipendenteId: 1, entrata: "08:00", uscita: "17:00" });
// timbrature.get(0)?.entrata => "08:00"

// ============================================================
// 6) Interface generica con piu' type parameter <K, V>
// ============================================================

// Dizionario<K, V> mappa chiavi di tipo K su valori di tipo V.
// Vincoliamo K a string | number con "extends" (constraint).
interface Dizionario<K extends string | number, V> {
  set(key: K, value: V): void;
  get(key: K): V | undefined;
}

// Implementazione basata su Map.
class MappaSemplice<K extends string | number, V> implements Dizionario<K, V> {
  private m = new Map<K, V>();
  set(key: K, value: V): void {
    this.m.set(key, value);
  }
  get(key: K): V | undefined {
    return this.m.get(key);
  }
}

// Mappa badge (string) -> Reparto.
const badgeReparto = new MappaSemplice<string, Reparto>();
badgeReparto.set("UP-001", { codice: "R1", descrizione: "Stampaggio", turno: "P4" });
// badgeReparto.get("UP-001")?.turno => "P4"
// badgeReparto.get("UP-999") => undefined

// ============================================================
// 7) Default type parameter (cenno)
// ============================================================

// Una generic interface puo' avere un DEFAULT per il type parameter:
// se non lo specifichi, TS usa quello dopo "=". Utile per API generiche.
interface Paginato<T = Dipendente> {
  pagina: number;
  totale: number;
  righe: T[];
}

// Senza argomento esplicito: T vale il default Dipendente.
const paginaDefault: Paginato = {
  pagina: 1,
  totale: 3,
  righe: dipendenti,
};
// paginaDefault.righe ha tipo: Dipendente[]

// Con argomento esplicito: T = Timbratura, il default viene ignorato.
const paginaTimbr: Paginato<Timbratura> = {
  pagina: 1,
  totale: 1,
  righe: [{ dipendenteId: 1, entrata: "08:00", uscita: "17:00" }],
};
// paginaTimbr.righe ha tipo: Timbratura[]

// Default combinato con constraint: T deve estendere { id: number }.
interface ConId<T extends { id: number } = Dipendente> {
  primoId: T;
}
const c1: ConId = { primoId: { id: 1, nome: "Anselmi", badge: "UP-001", ruolo: "Admin" } };
// c1.primoId ha tipo: Dipendente

// ERRORE TS: il default deve rispettare il constraint.
// interface Rotta<T extends { id: number } = string> { x: T; }
// ERRORE TS: Type 'string' does not satisfy the constraint '{ id: number; }'.

// ============================================================
// 8) Interface generica che ne estende un'altra
// ============================================================

// ApiResponsePaginata<T> riusa ApiResponse<T> e aggiunge la paginazione.
// Nota: data qui e' un Paginato<T>, non un T "nudo".
interface ApiResponsePaginata<T> extends ApiResponse<Paginato<T>> {
  cached: boolean;
}

const respPag: ApiResponsePaginata<Dipendente> = {
  ok: true,
  status: 200,
  cached: false,
  data: { pagina: 1, totale: 3, righe: dipendenti },
};
// respPag.data.righe ha tipo: Dipendente[]
// respPag.cached ha tipo: boolean

// ============================================================
// 9) Riuso reale: funzione generica che combina piu' interface
// ============================================================

// Cerca in una Collection<T> il primo elemento valido secondo un Validatore,
// dopo aver mappato ogni item a stringa. Mostra come i generics compongono.
function primoValido<T>(
  coll: Collection<T>,
  aStringa: (item: T) => string,
  valida: Validatore<string>
): T | undefined {
  return coll.find((item) => valida(aStringa(item)));
}

const conBadgeOk = primoValido(rubrica, (d) => d.badge, badgeValido);
// conBadgeOk?.badge => "UP-001"
// conBadgeOk ha tipo: Dipendente | undefined

// ============================================================
// Export dei simboli locali (solo roba definita in questo file)
// ============================================================

export { Lista, MappaSemplice, ok, ordina, orarioValido, badgeValido, primoValido };
export type {
  Box,
  ApiResponse,
  Comparatore,
  Validatore,
  Collection,
  Dizionario,
  Paginato,
  ApiResponsePaginata,
  Dipendente,
  Timbratura,
  Reparto,
  Ruolo,
  Turno,
};

/*
============================================================
RIEPILOGO COMANDI / CONCETTI
============================================================
- interface Nome<T> { ... }           -> generic interface, T scelto dall'utente.
- Box<T>, ApiResponse<T>              -> "forma" riusabile per tipi diversi.
- ok<T>(data): ApiResponse<T>         -> T inferito dall'argomento.
- interface Comparatore<T> { compara(a,b): number } -> method signature generica.
- interface Validatore<T> { (v: T): boolean } -> call signature (tipo chiamabile).
- Collection<T> con class Lista<T> implements Collection<T> -> contratto + implementazione.
- interface Dizionario<K extends string|number, V> -> piu' type parameter + constraint.
- Default type parameter: interface Paginato<T = Dipendente> -> T facoltativo.
- Default + constraint: <T extends {id:number} = Dipendente> -> il default deve rispettare il constraint.
- extends: interface B<T> extends A<Paginato<T>> -> generic interface che ne estende un'altra.
- I generics COMPONGONO: Collection<T> + Validatore<string> nella stessa funzione.
- export { ... } / export type { ... } -> esportare solo simboli locali.
- Ricorda: readonly items, item | undefined per get/find (accessi non garantiti).
============================================================
*/
