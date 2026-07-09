/**
 * File 097 - ADV Performance & Type Complexity (livello ADVANCED)
 * Costo dei tipi complessi per il compiler TypeScript: ricorsione e limiti
 * di profondita, union esplosive e distributivita, tail-recursion sui
 * conditional types con accumulatore, interface vs type alias e caching,
 * quando preferire tipi semplici. Misurazione con --extendedDiagnostics e
 * --generateTrace. Dominio ERP Polyuretech. Solo ASCII, no decorator.
 */

// ============================================================================
// SEZIONE 0 - Perche' i tipi "costano"
// ============================================================================
//
// Il type checker di TypeScript e' un interprete: ogni tipo complesso
// (conditional, mapped, template literal, ricorsione) viene "istanziato" e
// valutato a compile-time. Piu' istanziazioni => compilazione piu' lenta,
// editor meno reattivo, e in casi limite errori TS2589 (Type instantiation
// is excessively deep and possibly infinite) o TS2321.
//
// Regole pratiche che sviluppiamo in questo file:
//  - preferire tipi "shallow" quando bastano;
//  - evitare union che si moltiplicano tra loro (esplosione combinatoria);
//  - usare accumulatori (tail recursion) nei conditional ricorsivi;
//  - usare interface per gli oggetti pubblici (caching e messaggi migliori).

// ---- Mock dominio ERP (nessun import npm) ----------------------------------

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  id: number;
  nome: string;
  badge: `UP-${number}`; // pattern /^UP-\d{3}$/ (il regex vero e' runtime)
  ruolo: Ruolo;
}

interface Timbratura {
  dipendenteId: number;
  entrata: `${number}:${number}`; // "HH:MM" naive-UTC
  uscita: `${number}:${number}`;
}

interface Reparto {
  codice: string;
  nome: string;
  turno: Turno;
}

// ============================================================================
// SEZIONE 1 - Ricorsione dei tipi e limite di profondita
// ============================================================================
//
// TypeScript limita la profondita' della ricorsione dei tipi. I numeri
// "magici" da ricordare:
//  - ~50 livelli di ricorsione "normale" prima di TS2589 in molti pattern;
//  - ~1000 di limite hard interno per le istanziazioni concatenate;
//  - le tuple/array ricorsivi (tail) arrivano fino a ~1000 elementi.
//
// Esempio: costruire una tupla di lunghezza N in modo NAIVE (non-tail).

// Versione naive: ricorsione che "cresce" annidando il risultato.
type BuildTupleNaive<N extends number, R extends unknown[] = []> =
  R["length"] extends N ? R : [unknown, ...BuildTupleNaive<N, [unknown, ...R]>];
// Questa versione NON e' tail: il risultato [unknown, ...BuildTupleNaive<...>]
// mantiene "aperto" ogni frame ricorsivo. Funziona per N piccoli.

type T3 = BuildTupleNaive<3>;
// tipo: [unknown, unknown, unknown]
// => lunghezza 3, ok

// type TooDeep = BuildTupleNaive<1200>;
// ERRORE TS: TS2589 Type instantiation is excessively deep and possibly
// infinite. La ricorsione naive supera il limite molto prima di 1200.

// ============================================================================
// SEZIONE 2 - Tail recursion con accumulatore (il pattern chiave)
// ============================================================================
//
// TypeScript 4.5+ ottimizza la "tail recursion" nei conditional types: se la
// chiamata ricorsiva e' l'ULTIMA cosa valutata (nessun lavoro dopo di essa),
// il compiler non impila i frame e puo' arrivare fino a ~1000 iterazioni.
// Il trucco: portare avanti il risultato in un ACCUMULATORE (parametro R).

// Versione tail: la ricorsione e' in coda, R accumula il risultato.
type BuildTuple<N extends number, R extends unknown[] = []> =
  R["length"] extends N ? R : BuildTuple<N, [unknown, ...R]>;
//                                       ^ ultima espressione = tail call

type T5 = BuildTuple<5>;
// tipo: [unknown, unknown, unknown, unknown, unknown]

type Big = BuildTuple<900>["length"];
// tipo: 900  (funziona: la tail recursion regge fino a ~1000)

// Somma type-level via lunghezza tuple (uso tipico: aritmetica compile-time).
type Add<A extends number, B extends number> =
  [...BuildTuple<A>, ...BuildTuple<B>]["length"];

type Somma = Add<40, 2>;
// tipo: 42

// ---- Applicazione ERP: contare timbrature accumulando ----------------------

// Filtra le entrate valide accumulando in un array (tail su tuple di input).
type SoloEntrate<
  T extends readonly Timbratura[],
  Acc extends string[] = []
> = T extends readonly [infer H, ...infer Rest]
  ? H extends Timbratura
    ? Rest extends readonly Timbratura[]
      ? SoloEntrate<Rest, [...Acc, H["entrata"]]> // tail: Acc porta il risultato
      : Acc
    : Acc
  : Acc;

type Esempio = SoloEntrate<[
  { dipendenteId: 1; entrata: "08:00"; uscita: "17:00" },
  { dipendenteId: 2; entrata: "09:15"; uscita: "18:00" }
]>;
// tipo: ["08:00", "09:15"]

// ============================================================================
// SEZIONE 3 - Union esplosive e distributivita'
// ============================================================================
//
// I conditional types sono DISTRIBUTIVI sulle union nude (naked type param):
// "T extends U ? X : Y" con T=A|B diventa (A ext U?..) | (B ext U?..).
// Comodo, ma se combini piu' union il numero di membri si MOLTIPLICA.

// Esempio innocuo: mappa ogni ruolo a un flag.
type IsAdmin<R extends Ruolo> = R extends "SuperAdmin" | "Admin" ? true : false;
type Flags = IsAdmin<Ruolo>;
// tipo: true | true | false | false  => normalizzato a  boolean
// (4 membri distribuiti, poi collassati)

// Esplosione combinatoria: il prodotto cartesiano di due union.
type Combina<A extends string, B extends string> = `${A}-${B}`;
type ChiaviBadgeTurno = Combina<Ruolo, Turno>;
// tipo: "SuperAdmin-P4" | "SuperAdmin-P2" | "SuperAdmin-STD" | ... (4 x 3 = 12)
// => 12 membri. Con 3-4 union grandi si arriva a migliaia: lento e pesante.

// PITFALL: template literal su union di `${number}` o `${string}` e' quasi
// infinita e va evitata.
// type Assurdo = `${Ruolo}-${number}`;
// non produce errore, ma `${number}` e' un dominio enorme: se poi la incroci
// in un mapped/conditional, l'istanziazione esplode. Meglio un tipo nominale.

// Come DISATTIVARE la distributivita' quando NON la vuoi: avvolgi in tupla
// entrambi i lati ([T] extends [U]).
type IsExactlyRuolo<T> = [T] extends [Ruolo] ? "si" : "no";
type Q1 = IsExactlyRuolo<Ruolo>;
// tipo: "si"  (valutato UNA volta, non distribuito su 4 membri)
type Q2 = IsExactlyRuolo<"SuperAdmin" | "Sconosciuto">;
// tipo: "no"

// Differenza pratica: distribuita vs non-distribuita su union vuote.
type Distrib<T> = T extends unknown ? T[] : never;
type NonDistrib<T> = [T] extends [unknown] ? T[] : never;
type D1 = Distrib<never>;
// tipo: never   (never distribuito = never, il ramo non gira mai)
type D2 = NonDistrib<never>;
// tipo: never[] (never NON distribuito: [never] extends [unknown] e' true)

// ============================================================================
// SEZIONE 4 - Interface vs type alias: performance e caching
// ============================================================================
//
// Regola di ottimizzazione dal team TS:
//  - INTERFACE per gli oggetti "nominali" pubblici: il compiler puo' fare
//    caching della relazione di assegnabilita' per nome (identita' stabile) e
//    i messaggi di errore mostrano il NOME invece di espandere la struttura.
//  - TYPE ALIAS per union, tuple, mapped, conditional, primitivi: cose che
//    l'interface non puo' esprimere.
//
// Un type alias che e' un grande "&" (intersection) di molti oggetti forza il
// compiler a ricalcolare la struttura ad ogni confronto (nessun caching per
// nome), ed espande tutto nei messaggi di errore.

// LENTO / rumoroso: intersection di alias -> struttura ricalcolata ed espansa.
type DipBaseAlias = { id: number; nome: string };
type DipConBadgeAlias = DipBaseAlias & { badge: `UP-${number}` };
type DipCompletoAlias = DipConBadgeAlias & { ruolo: Ruolo; reparto: Reparto };
// In errore, DipCompletoAlias viene "spalmato" in tutte le sue proprieta'.

// VELOCE / leggibile: interface extends -> identita' nominale, caching,
// messaggi che citano il nome dell'interface.
interface DipBase {
  id: number;
  nome: string;
}
interface DipConBadge extends DipBase {
  badge: `UP-${number}`;
}
interface DipCompleto extends DipConBadge {
  ruolo: Ruolo;
  reparto: Reparto;
}

const d: DipCompleto = {
  id: 1,
  nome: "Rossi",
  badge: "UP-001",
  ruolo: "Operatore",
  reparto: { codice: "R1", nome: "Stampaggio", turno: "P4" },
};
// tipo di d: DipCompleto  (in hover si vede il NOME, non l'espansione)

// const bad: DipCompleto = { id: 1, nome: "Rossi", badge: "UP-002" };
// ERRORE TS: TS2739 Type '{...}' is missing the following properties from
// type 'DipCompleto': ruolo, reparto  -> nota: cita il NOME dell'interface.

// ============================================================================
// SEZIONE 5 - Quando usare tipi piu' semplici (ridurre il costo)
// ============================================================================
//
// Non tutto merita un tipo type-level "smart". Spesso un tipo piu' semplice
// e' piu' veloce da compilare, piu' facile da leggere e da debuggare.

// COSTOSO: validare il formato "HH:MM" con un template literal ricorsivo che
// controlla ogni cifra. Bello ma pesante e fragile.
type Cifra = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type OrarioStretto = `${Cifra}${Cifra}:${Cifra}${Cifra}`;
// tipo: enorme union (10*10*10*10 = 10000 membri!). Compila, ma e' un macigno
// se poi lo usi in mapped/conditional. => evita di incrociarlo con altre union.

// SEMPLICE e sufficiente nella pratica: alias "documentale" + check runtime.
type Orario = string; // validato a runtime con /^\d{2}:\d{2}$/
function isOrario(s: string): s is Orario {
  return /^\d{2}:\d{2}$/.test(s);
}
const ora = "08:30";
// tipo: string; il vincolo forte lo garantisce isOrario() a runtime.
if (isOrario(ora)) {
  // qui ora e' Orario (string) validato
}

// COSTOSO: DeepReadonly ricorsivo applicato a un oggetto molto annidato.
type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
type ROTimbratura = DeepReadonly<Timbratura>;
// tipo: { readonly dipendenteId: number; readonly entrata: ...; ... }
// Va bene per tipi piccoli come Timbratura; su strutture profonde (es. l'intero
// stato ERP) ogni proprieta' rigenera il mapped => costo alto. Usalo mirato.

// SEMPLICE: se ti serve solo il livello 1, un Readonly<T> nativo basta ed e'
// praticamente gratis.
type ROShallow = Readonly<Timbratura>;
// tipo: { readonly dipendenteId: number; readonly entrata: `${number}:${number}`; ... }

// ============================================================================
// SEZIONE 6 - Esempio pesante VS ottimizzato (stesso risultato)
// ============================================================================
//
// Obiettivo: dato un array di Dipendente, ottenere la union dei loro badge.

// --- Versione PESANTE: ricorsione naive che ri-annida ad ogni passo. --------
type BadgesNaive<T extends readonly Dipendente[]> =
  T extends readonly [infer H, ...infer Rest]
    ? H extends Dipendente
      ? Rest extends readonly Dipendente[]
        ? H["badge"] | BadgesNaive<Rest> // union costruita "aprendo" ogni frame
        : never
      : never
    : never;
// Ogni frame lascia "H["badge"] | ..." in sospeso: non e' tail, quindi su liste
// lunghe impila frame e rischia TS2589.

// --- Versione OTTIMIZZATA: accumulatore in coda (tail). ---------------------
type BadgesFast<
  T extends readonly Dipendente[],
  Acc = never
> = T extends readonly [infer H, ...infer Rest]
  ? H extends Dipendente
    ? Rest extends readonly Dipendente[]
      ? BadgesFast<Rest, Acc | H["badge"]> // tail: Acc porta la union
      : Acc
    : Acc
  : Acc;

type Lista = [
  { id: 1; nome: "A"; badge: "UP-001"; ruolo: "Admin" },
  { id: 2; nome: "B"; badge: "UP-002"; ruolo: "Operatore" }
];
type BN = BadgesNaive<Lista>;
// tipo: "UP-001" | "UP-002"
type BF = BadgesFast<Lista>;
// tipo: "UP-001" | "UP-002"  (stesso risultato, ma piu' scalabile)

// Nota: per union e' spesso PIU' semplice e veloce evitare la ricorsione del
// tutto usando un indexed access, se hai un array/tupla.
type BadgesIndexed = Lista[number]["badge"];
// tipo: "UP-001" | "UP-002"  (nessuna ricorsione: il piu' economico dei tre)

// ============================================================================
// SEZIONE 7 - GOTCHA / PITFALLS
// ============================================================================
//
// 1) TS2589 "excessively deep": quasi sempre significa ricorsione NON-tail o
//    un limite superato. Fix: sposta il lavoro in un accumulatore e metti la
//    chiamata ricorsiva in coda.
//
// 2) Distributivita' silenziosa: "T extends U ? ..." su una union nuda gira
//    per OGNI membro. Se non lo vuoi, avvolgi in tupla: [T] extends [U].
//
// 3) never scompare nei conditional distribuiti (Distrib<never> = never). Se
//    ti serve trattare never come valore, usa la forma non-distribuita.
//
// 4) Template literal con `${number}` / `${string}` incrociati generano domini
//    enormi: non usarli come sorgente di mapped/conditional pesanti.
//
// 5) Grandi intersection di type alias (A & B & C & ...) non sfruttano il
//    caching per nome e "esplodono" nei messaggi di errore: preferisci
//    interface + extends per gli oggetti.
//
// 6) Un tipo "furbo" che rallenta l'EDITOR e' un costo reale: se l'IntelliSense
//    lagga, semplifica. La correttezza type-level non vale l'inservibilita'.
//
// 7) Ordine dei rami nei conditional: metti prima i casi che "tagliano" la
//    ricorsione (caso base) per ridurre le istanziazioni.
//
// 8) Non abusare di DeepX ricorsivi su interi alberi di stato: applicali al
//    sottoinsieme che serve davvero.

// ============================================================================
// SEZIONE 8 - Misurare: --extendedDiagnostics e --generateTrace
// ============================================================================
//
// Non ottimizzare "a sensazione": MISURA. Due strumenti del compiler:
//
// A) tsc --noEmit --extendedDiagnostics
//    Stampa metriche aggregate, tra cui:
//      Types:                 numero di tipi creati
//      Instantiations:        numero di istanziazioni (il piu' indicativo!)
//      Memory used
//      Check time / Total time
//    Confronta le Instantiations PRIMA e DOPO una modifica: se un tipo "smart"
//    fa salire le istanziazioni da migliaia a milioni, e' il sospetto numero 1.
//
// B) tsc --noEmit --generateTrace out/trace
//    Genera out/trace/trace.json e types.json. Apri trace.json in Chrome su
//    chrome://tracing (o edge://tracing) oppure con @typescript/analyze-trace
//    per vedere QUALI tipi/file costano di piu' ("hot spots"). Cerca i frame
//    "checkExpression"/"structuredTypeRelatedTo" piu' larghi.
//
// C) Editor: "TypeScript: Open TS Server log" per capire se il rallentamento
//    e' nel server di linguaggio (esperienza di digitazione).
//
// Esempi di comandi (da eseguire in shell, qui solo come commento):
//   tsc --strict --target ES2022 --lib ES2022,DOM --noEmit --extendedDiagnostics
//   tsc --noEmit --generateTrace .trace && npx @typescript/analyze-trace .trace
//
// Workflow consigliato:
//   1. Riproduci la lentezza con --extendedDiagnostics (baseline Instantiations).
//   2. Isola con --generateTrace il tipo/file colpevole.
//   3. Applica un fix (tail recursion, tipo piu' semplice, interface).
//   4. Ri-misura: le Instantiations devono scendere. Altrimenti torna al passo 2.

// ---- Export di simboli locali (solo per completezza del modulo) ------------
export type {
  Ruolo,
  Turno,
  Dipendente,
  Timbratura,
  Reparto,
  BuildTuple,
  Add,
  BadgesFast,
  BadgesIndexed,
  DipCompleto,
};
export { isOrario };

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
// - Costo dei tipi: ogni tipo complesso viene istanziato a compile-time.
// - Limiti: ~50 ricorsione naive; ~1000 tail; tuple ricorsive fino a ~1000.
// - TS2589: "excessively deep" = ricorsione non-tail o limite superato.
// - Tail recursion: chiamata ricorsiva in CODA + accumulatore (R/Acc).
// - Distributivita': "T extends U ?" gira per ogni membro di union nuda.
// - Disattivare distributivita': [T] extends [U] (avvolgi in tupla).
// - never distribuito = never; forma non-distribuita per trattarlo.
// - Union esplosive: prodotto cartesiano di union (Ruolo x Turno = 12).
// - Evita `${number}`/`${string}` come sorgente di mapped/conditional pesanti.
// - interface + extends: caching per nome, messaggi col NOME. Preferisci per oggetti.
// - type alias: per union/tuple/mapped/conditional/primitivi.
// - Tipi semplici quando bastano: alias + check runtime vs template ricorsivo.
// - Readonly<T> shallow ~ gratis vs DeepReadonly<T> ricorsivo mirato.
// - Indexed access (Lista[number]["badge"]) batte la ricorsione per union.
// - Misura: tsc --noEmit --extendedDiagnostics (Instantiations = metrica chiave).
// - Traccia: tsc --noEmit --generateTrace .trace + @typescript/analyze-trace.
// - Workflow: baseline -> isola hot spot -> fix -> ri-misura.
