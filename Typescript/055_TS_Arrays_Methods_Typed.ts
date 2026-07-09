/**
 * File 055 - TS Arrays Methods Typed
 * Argomento: metodi degli array tipizzati (map/filter/reduce, find, some/every).
 * Vediamo come TypeScript inferisce i tipi di ritorno dei metodi funzionali,
 * come usare type guard dentro filter per fare narrowing dell'array risultante
 * e come tipizzare l'accumulatore di reduce. Esempi sul dominio ERP Polyuretech
 * (Dipendente, Timbratura, Reparto, Turno). Livello: INTERMEDIATE.
 */

// -------------------------------------------------------------------------
// Modello di dominio ERP (definito qui, nessuna libreria esterna)
// -------------------------------------------------------------------------

// Union type dei ruoli applicativi.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Turni possibili.
type Turno = "P4" | "P2" | "STD";

// Entita' principale: il dipendente.
interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
  turno: Turno;
  repartoId: number;
  attivo: boolean;
}

// Timbratura con orari in formato naive-UTC come stringa "HH:MM".
interface Timbratura {
  dipendenteId: number;
  entrata: string; // "08:00"
  uscita: string | null; // null se ancora dentro
}

interface Reparto {
  id: number;
  nome: string;
}

// Dataset di esempio riutilizzato dagli esempi seguenti.
const dipendenti: Dipendente[] = [
  { id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Operatore", turno: "P4", repartoId: 10, attivo: true },
  { id: 2, nome: "Bianchi", badge: "UP-002", ruolo: "Admin", turno: "STD", repartoId: 10, attivo: true },
  { id: 3, nome: "Verdi", badge: "UP-003", ruolo: "Operatore", turno: "P2", repartoId: 20, attivo: false },
  { id: 4, nome: "Neri", badge: "UP-004", ruolo: "SuperAdmin", turno: "STD", repartoId: 20, attivo: true },
  { id: 5, nome: "Gialli", badge: "UP-005", ruolo: "QrDisplay", turno: "P4", repartoId: 30, attivo: true },
];

// -------------------------------------------------------------------------
// 1) map: trasformazione tipizzata elemento -> elemento
// -------------------------------------------------------------------------

// map inferisce il tipo di ritorno dalla callback.
const nomi = dipendenti.map((d) => d.nome);
// tipo: string[]  => ["Rossi","Bianchi","Verdi","Neri","Gialli"]

// La callback riceve anche indice e array completo.
const nomiConIndice = dipendenti.map((d, i) => `${i}: ${d.nome}`);
// tipo: string[]

// map verso un tipo oggetto diverso (proiezione / DTO).
interface BadgeView {
  badge: string;
  ruolo: Ruolo;
}
const viste: BadgeView[] = dipendenti.map((d) => ({ badge: d.badge, ruolo: d.ruolo }));
// tipo esplicito: BadgeView[]

// Se annoto il return della callback, TS controlla la forma.
const idsNumerici = dipendenti.map((d): number => d.id);
// tipo: number[]

// ERRORE TS: la callback deve restituire number ma restituisce string
// const sbagliato = dipendenti.map((d): number => d.nome);
// ERRORE TS: Type 'string' is not assignable to type 'number'.

// -------------------------------------------------------------------------
// 2) filter: stesso tipo elemento, array eventualmente piu' corto
// -------------------------------------------------------------------------

// filter senza type guard mantiene il tipo dell'elemento.
const attivi = dipendenti.filter((d) => d.attivo);
// tipo: Dipendente[]  (5 - 1 = 4 elementi)

const operatori = dipendenti.filter((d) => d.ruolo === "Operatore");
// tipo: Dipendente[]

// -------------------------------------------------------------------------
// 3) type guard dentro filter: narrowing dell'array risultante
// -------------------------------------------------------------------------

// Una user-defined type guard (predicate x is T) permette a filter di
// restringere il tipo dell'array in output. Utile con array eterogenei
// o con valori null da scartare.

// Esempio: array con possibili null, filtriamo i null e otteniamo string[].
const orari: (string | null)[] = ["08:00", null, "12:30", null, "17:00"];

// Senza type guard il tipo resterebbe (string | null)[].
const orariRimasti = orari.filter((o) => o !== null);
// In TS 5.5+ questo e' gia' narrowed a string[]. Per essere espliciti:

// Type guard esplicita: garantisce che il tipo diventi string[].
function nonNullo<T>(v: T | null): v is T {
  return v !== null;
}
const orariPuliti = orari.filter(nonNullo);
// tipo: string[]  => ["08:00","12:30","17:00"]

// Type guard su union di ruoli: teniamo solo chi puo' amministrare.
type RuoloAdmin = "SuperAdmin" | "Admin";
function isAdminRole(r: Ruolo): r is RuoloAdmin {
  return r === "SuperAdmin" || r === "Admin";
}
const ruoli: Ruolo[] = dipendenti.map((d) => d.ruolo);
const soloAdmin = ruoli.filter(isAdminRole);
// tipo: RuoloAdmin[]  => ["Admin","SuperAdmin"]

// Type guard che restringe l'oggetto: filtrare i dipendenti amministratori.
function isDipendenteAdmin(d: Dipendente): d is Dipendente & { ruolo: RuoloAdmin } {
  return isAdminRole(d.ruolo);
}
const dipAdmin = dipendenti.filter(isDipendenteAdmin);
// tipo: (Dipendente & { ruolo: RuoloAdmin })[]
// Ora d.ruolo e' ristretto: TS sa che non e' "Operatore" ne' "QrDisplay".

// -------------------------------------------------------------------------
// 4) find e findIndex: primo elemento che soddisfa il predicato
// -------------------------------------------------------------------------

// find restituisce T | undefined: va gestito il caso "non trovato".
const trovato = dipendenti.find((d) => d.badge === "UP-003");
// tipo: Dipendente | undefined

if (trovato) {
  // Qui trovato e' Dipendente (narrowed, undefined escluso).
  const _nome: string = trovato.nome; // ok
  void _nome;
}

// find con type guard restringe anche il tipo del risultato.
const primoAdmin = dipendenti.find(isDipendenteAdmin);
// tipo: (Dipendente & { ruolo: RuoloAdmin }) | undefined

// findIndex restituisce number (-1 se non trovato).
const idx = dipendenti.findIndex((d) => d.turno === "P2");
// tipo: number  => 2

// Nota: in ES2023 esistono findLast/findLastIndex (ultimo che soddisfa il
// predicato, tipo T | undefined); qui il target e' ES2022 quindi non li usiamo.

// -------------------------------------------------------------------------
// 5) some / every: predicati che restituiscono boolean
// -------------------------------------------------------------------------

// some: almeno un elemento soddisfa il predicato.
const esisteInattivo = dipendenti.some((d) => !d.attivo);
// tipo: boolean  => true

// every: tutti gli elementi soddisfano il predicato.
const tuttiHannoBadge = dipendenti.every((d) => /^UP-\d{3}$/.test(d.badge));
// tipo: boolean  => true

// every con type guard: se true, TS puo' restringere l'intero array.
function tuttiAttivi(list: Dipendente[]): list is (Dipendente & { attivo: true })[] {
  return list.every((d) => d.attivo);
}
if (tuttiAttivi(dipendenti)) {
  // In questo branch ogni elemento ha attivo: true.
  const _b: true = dipendenti[0].attivo;
  void _b;
}

// -------------------------------------------------------------------------
// 6) reduce: accumulatore tipizzato
// -------------------------------------------------------------------------

// reduce senza tipo esplicito: TS inferisce dall'accumulatore iniziale.
const totaleId = dipendenti.reduce((acc, d) => acc + d.id, 0);
// tipo: number  => 15

// ATTENZIONE: se l'accumulatore iniziale ha un tipo troppo stretto, serve
// annotare il generic <T> di reduce per evitare errori.

// Esempio: raggruppare i dipendenti per reparto (Record<number, Dipendente[]>).
const perReparto = dipendenti.reduce<Record<number, Dipendente[]>>((acc, d) => {
  // Inizializziamo l'array del reparto se assente.
  (acc[d.repartoId] ??= []).push(d);
  return acc;
}, {});
// tipo: Record<number, Dipendente[]>
// => { 10: [Rossi,Bianchi], 20: [Verdi,Neri], 30: [Gialli] }

// Contare i dipendenti per ruolo con accumulatore Record tipizzato.
type ContaRuoli = Partial<Record<Ruolo, number>>;
const contaRuoli = dipendenti.reduce<ContaRuoli>((acc, d) => {
  acc[d.ruolo] = (acc[d.ruolo] ?? 0) + 1;
  return acc;
}, {});
// tipo: Partial<Record<Ruolo, number>>
// => { Operatore: 2, Admin: 1, SuperAdmin: 1, QrDisplay: 1 }

// reduce che costruisce un tipo diverso dagli elementi (aggregazione ricca).
interface StatReparto {
  repartoId: number;
  totale: number;
  attivi: number;
}
const statByReparto = dipendenti.reduce<Map<number, StatReparto>>((acc, d) => {
  const corrente = acc.get(d.repartoId) ?? { repartoId: d.repartoId, totale: 0, attivi: 0 };
  corrente.totale += 1;
  if (d.attivo) corrente.attivi += 1;
  acc.set(d.repartoId, corrente);
  return acc;
}, new Map());
// tipo: Map<number, StatReparto>

// ERRORE TS: senza il generic, l'accumulatore {} sarebbe inferito come {}
// e l'accesso indicizzato fallirebbe.
// const bad = dipendenti.reduce((acc, d) => { acc[d.ruolo] = 1; return acc; }, {});
// ERRORE TS: Element implicitly has an 'any' type / property does not exist on '{}'.

// -------------------------------------------------------------------------
// 7) Esempio realistico: pipeline map -> filter -> reduce su timbrature
// -------------------------------------------------------------------------

const timbrature: Timbratura[] = [
  { dipendenteId: 1, entrata: "08:00", uscita: "17:00" },
  { dipendenteId: 2, entrata: "09:00", uscita: null },
  { dipendenteId: 3, entrata: "07:30", uscita: "15:30" },
  { dipendenteId: 5, entrata: "08:15", uscita: "12:15" },
];

// Converte "HH:MM" in minuti totali. Ritorna null se il formato non e' valido.
function orarioInMinuti(hhmm: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Interfaccia di appoggio per il calcolo delle ore lavorate.
interface OreLavorate {
  dipendenteId: number;
  minuti: number;
}

// Pipeline:
// 1) filter: solo timbrature complete (uscita non null) -> narrowing via guard
// 2) map: calcolo minuti lavorati
// 3) filter: scarto eventuali calcoli non validi (null)
// 4) reduce: somma dei minuti in un accumulatore number
function isTimbraturaCompleta(t: Timbratura): t is Timbratura & { uscita: string } {
  return t.uscita !== null;
}

const complete = timbrature.filter(isTimbraturaCompleta);
// tipo: (Timbratura & { uscita: string })[]  (la timbratura di Bianchi e' esclusa)

const oreCalcolate: (OreLavorate | null)[] = complete.map((t) => {
  const inizio = orarioInMinuti(t.entrata);
  const fine = orarioInMinuti(t.uscita); // t.uscita e' string grazie al narrowing
  if (inizio === null || fine === null) return null;
  return { dipendenteId: t.dipendenteId, minuti: fine - inizio };
});

const oreValide = oreCalcolate.filter(nonNullo);
// tipo: OreLavorate[]

const minutiTotali = oreValide.reduce<number>((acc, o) => acc + o.minuti, 0);
// tipo: number  => 540 + 480 + 240 = 1260

// -------------------------------------------------------------------------
// 8) flatMap: map + appiattimento di un livello
// -------------------------------------------------------------------------

// flatMap e' utile quando la callback restituisce array (o [] per scartare).
const badgesDegliAttivi = dipendenti.flatMap((d) => (d.attivo ? [d.badge] : []));
// tipo: string[]  => ["UP-001","UP-002","UP-004","UP-005"]
// Pattern "filter + map" in un solo passaggio, mantenendo il tipo string[].

// -------------------------------------------------------------------------
// Export dei simboli locali (solo roba definita in questo file)
// -------------------------------------------------------------------------

export {
  nonNullo,
  isAdminRole,
  isDipendenteAdmin,
  isTimbraturaCompleta,
  orarioInMinuti,
  perReparto,
  contaRuoli,
  statByReparto,
  minutiTotali,
};
export type { Dipendente, Timbratura, Reparto, Ruolo, Turno, RuoloAdmin, StatReparto, OreLavorate };

/*
 * RIEPILOGO COMANDI / CONCETTI
 * ---------------------------------------------------------------
 * - map(cb): trasforma T[] -> U[]; il tipo U si inferisce dal return della cb.
 * - filter(cb): T[] -> T[]; con type guard (x is T) restringe il tipo output.
 * - filter(nonNullo): rimuove null/undefined e produce array del tipo base.
 * - find(cb): T | undefined; gestire sempre il caso undefined.
 * - findIndex(cb): number (-1 se assente); findLast/ findLastIndex (ES2023).
 * - some(cb): boolean, almeno uno vero.
 * - every(cb): boolean, tutti veri; con type guard puo' restringere l'array.
 * - reduce<T>(cb, init): accumulatore tipizzato; annota il generic per Record/Map.
 * - reduce per raggruppare: Record<K, T[]> con (acc[k] ??= []).push(x).
 * - flatMap(cb): map + flatten di un livello; [] scarta, [x] tiene.
 * - user-defined type guard: funzione con firma "(x): x is T" per il narrowing.
 * - pipeline tipica ERP: filter(guard) -> map(DTO) -> filter(nonNullo) -> reduce(somma).
 */
