/**
 * File 078 - ADV Declaration Merging
 * ====================================
 * Il "declaration merging" e' il meccanismo per cui TypeScript FONDE piu' dichiarazioni
 * con lo stesso nome in un unico simbolo. Vale per interface, namespace, enum e per la
 * combinazione namespace + function/class/enum. NON vale per 'type' alias (che NON si fonde).
 * In questo file vediamo interface merging, namespace merging, module augmentation,
 * i meccanismi interni (merge di membri, overload, ordine), esempi ERP e i pitfall tipici.
 */

// ============================================================================
// SEZIONE 0 - HELPER DI TYPE-TESTING (usati in tutto il file)
// ============================================================================

// Equal<A, B>: true solo se A e B sono lo STESSO tipo (bidirezionale, strict).
// Il trucco con le due funzioni generiche e' il modo canonico: due tipi sono
// uguali sse e solo se una funzione che ritorna un condizionale su A e' assegnabile
// a quella su B. E' piu' preciso di 'A extends B ? B extends A' perche' distingue
// anche 'any' da 'unknown'.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Expect<T>: compila solo se T e' esattamente 'true'. Serve per "asserire" un test di tipo.
type Expect<T extends true> = T;

// Esempio d'uso: questi due alias compilano => il test passa.
type _t0 = Expect<Equal<string, string>>; // ok
// type _tBad = Expect<Equal<string, number>>; // ERRORE TS: Type 'false' does not satisfy 'true'

// ============================================================================
// SEZIONE 1 - INTERFACE MERGING (le basi)
// ============================================================================

// Due (o piu') interface con lo STESSO nome nello stesso scope si fondono:
// il tipo risultante ha l'UNIONE di tutti i membri. Non serve 'extends'.
interface Dipendente {
  id: number;
  nome: string;
}

interface Dipendente {
  badge: string; // formato "UP-001"
  ruolo: string;
}

// Da qui in poi 'Dipendente' ha TUTTI e quattro i membri.
const dip1: Dipendente = {
  id: 1,
  nome: "Rossi",
  badge: "UP-001",
  ruolo: "Operatore",
};

// Test di tipo: le chiavi risultanti sono l'unione delle chiavi dichiarate.
type ChiaviDip = keyof Dipendente; // "id" | "nome" | "badge" | "ruolo"
type _t1 = Expect<Equal<ChiaviDip, "id" | "nome" | "badge" | "ruolo">>; // ok

// GOTCHA: se due dichiarazioni definiscono la STESSA proprieta' con tipo diverso,
// e' un errore (le proprieta' non-funzione devono avere tipo identico).
interface Conflitto {
  x: string;
}
// interface Conflitto {
//   x: number; // ERRORE TS: Subsequent property declarations must have the same type. 'x' must be 'string'.
// }

// ============================================================================
// SEZIONE 2 - MECCANISMO INTERNO: ORDINE DEI MEMBRI E OVERLOAD DI METODI
// ============================================================================

// Per le proprieta' NON-funzione l'ordine non conta (sono un set). Ma per i METODI
// con firme diverse, il merging crea OVERLOAD: le firme dei blocchi che vengono DOPO
// nel file hanno priorita' piu' alta (vengono provate prima). Eccezione: le firme con
// tipi letterali (single specialized) sono ordinate prima di tutte.
interface Logger {
  log(msg: string): void;
}
interface Logger {
  log(code: number): void;
  log(err: Error): void;
}

// L'overload risultante prova: number, Error (blocco successivo), poi string.
declare const logger: Logger;
logger.log(42); // ok (number)
logger.log(new Error("x")); // ok (Error)
logger.log("ciao"); // ok (string)

// Overload con firma letterale: il set piu' specializzato viene testato per primo.
// (Utile per pattern "evento": il nome letterale seleziona il payload.)
interface Bus {
  emit(evento: string, payload: unknown): void;
}
interface Bus {
  emit(evento: "timbratura", payload: { badge: string; ora: string }): void;
}
declare const bus: Bus;
bus.emit("timbratura", { badge: "UP-001", ora: "08:00" }); // ok: seleziona la firma specializzata
// bus.emit("timbratura", { badge: "UP-001" }); // ERRORE TS: manca 'ora'

// ============================================================================
// SEZIONE 3 - PERCHE' 'type' NON SI FONDE (differenza chiave da interface)
// ============================================================================

// Un 'type' alias e' un NOME per un tipo, non un'entita' aperta come interface.
// Dichiararne due con lo stesso nome e' un errore di identificatore duplicato.
type Reparto = { id: number; nome: string };
// type Reparto = { capo: string }; // ERRORE TS: Duplicate identifier 'Reparto'.

// Quindi per "estendere" un type si usa l'intersezione '&', che pero' e' ALTRA cosa:
// crea un NUOVO tipo, non modifica quello esistente ne' e' aperto ad augmentation esterna.
type RepartoConCapo = Reparto & { capo: string };
const rep: RepartoConCapo = { id: 3, nome: "Stampaggio", capo: "Bianchi" };

// Conseguenza pratica: un'interface e' "aperta" (chiunque, anche un altro modulo,
// puo' aggiungere membri via merging/augmentation), un type e' "chiuso".
// Regola: usa interface per API pubbliche estendibili, type per unioni/mapped/calcoli.

// Nota sull'intersezione con proprieta' in conflitto: NON e' un errore come nel merging,
// ma il tipo del membro diventa l'intersezione dei due -> spesso 'never', quindi inusabile.
type A1 = { v: string };
type B1 = { v: number };
type AB = A1 & B1; // v: string & number => never
type VDiAB = AB["v"]; // never
type _t3 = Expect<Equal<VDiAB, never>>; // ok
// const impossibile: AB = { v: ??? }; // ERRORE TS: nessun valore e' insieme string e number

// ============================================================================
// SEZIONE 4 - NAMESPACE + INTERFACE/TYPE: NAMESPACE COME "CONTENITORE"
// ============================================================================

// Un namespace puo' fondersi con una interface omonima: e' il pattern classico
// "tipo + valori/tipi annidati sotto lo stesso nome" (come Date/Array in lib.d.ts).
interface Timbratura {
  entrata: string; // "HH:MM" naive-UTC
  uscita: string;
}

// Il namespace omonimo aggiunge tipi/valori accessibili come Timbratura.Qualcosa.
namespace Timbratura {
  export const REGEX_ORA = /^\d{2}:\d{2}$/;
  export type Stato = "aperta" | "chiusa";
  export function isValida(t: Timbratura): boolean {
    return REGEX_ORA.test(t.entrata) && REGEX_ORA.test(t.uscita);
  }
}

// Ora 'Timbratura' e' sia un TIPO sia un VALORE (il namespace) con membri annidati.
const t1: Timbratura = { entrata: "08:00", uscita: "17:00" };
const okT: boolean = Timbratura.isValida(t1); // => true
const statoDefault: Timbratura.Stato = "aperta"; // tipo annidato
type _t4 = Expect<Equal<Timbratura.Stato, "aperta" | "chiusa">>; // ok

// ============================================================================
// SEZIONE 5 - NAMESPACE + FUNCTION MERGING (funzione con "proprieta' statiche")
// ============================================================================

// Una function e' anche un valore-oggetto: fondendola con un namespace omonimo le si
// attaccano "proprieta' statiche". Il namespace deve venire DOPO la function nel codice.
function creaBadge(n: number): string {
  // Costruisce "UP-001" da un numero.
  return `UP-${String(n).padStart(3, "0")}`;
}
namespace creaBadge {
  export const PREFISSO = "UP-";
  export const REGEX = /^UP-\d{3}$/;
  export function isValido(b: string): boolean {
    return REGEX.test(b);
  }
}

const b1: string = creaBadge(1); // => "UP-001"
const prefisso: string = creaBadge.PREFISSO; // => "UP-"
const badgeOk: boolean = creaBadge.isValido("UP-007"); // => true
const badgeKo: boolean = creaBadge.isValido("X-1"); // => false

// Meccanismo interno: 'creaBadge' e' un singolo simbolo che porta sia la call-signature
// (dalla function) sia le proprieta' (dal namespace). typeof lo cattura tutto:
type TipoCreaBadge = typeof creaBadge;
type _t5 = Expect<Equal<Parameters<TipoCreaBadge>, [n: number]>>; // ok: e' ancora chiamabile
// PREFISSO e' dichiarato "const PREFISSO = 'UP-'": il suo tipo e' il LETTERALE "UP-",
// non "string" (servirebbe "as string" o annotazione esplicita per allargarlo).
type _t5b = Expect<Equal<TipoCreaBadge["PREFISSO"], "UP-">>;

// ============================================================================
// SEZIONE 6 - NAMESPACE + CLASS MERGING (membri "statici" e tipi annidati)
// ============================================================================

// Fondere un namespace con una class (namespace DOPO la class) aggiunge membri
// statici e permette di annidare TIPI dentro il nome della classe. Utile per
// pattern factory/DTO annidati vicino alla classe che li usa.
class Turno {
  constructor(public readonly codice: "P4" | "P2" | "STD") {}
  descrizione(): string {
    return `Turno ${this.codice}`;
  }
}
namespace Turno {
  // Tipo annidato: Turno.Config
  export interface Config {
    inizio: string; // "HH:MM"
    fine: string;
  }
  // "Statico" aggiunto via merging (equivalente a un metodo static).
  export function standard(): Turno {
    return new Turno("STD");
  }
  export const DEFAULT_CONFIG: Config = { inizio: "08:00", fine: "17:00" };
}

const turno1 = new Turno("P4");
const desc: string = turno1.descrizione(); // => "Turno P4"
const turnoStd: Turno = Turno.standard(); // "statico" via merging
const cfg: Turno.Config = Turno.DEFAULT_CONFIG; // tipo annidato usato come annotazione
// Nota: 'Turno' e' contemporaneamente una class (istanziabile) e un namespace (tipi/valori annidati).

// GOTCHA: la class deve precedere il namespace. L'ordine inverso non compila come merging.
// namespace Prima { export const x = 1 }
// class Prima {}                // ERRORE TS: 'Prima' merge non valido se il namespace ha valori prima della class

// ============================================================================
// SEZIONE 7 - ENUM MERGING E NAMESPACE + ENUM
// ============================================================================

// Anche gli enum si fondono (utile per spezzarli o aggiungere membri calcolati).
// Regola: se il primo blocco ha un membro senza inizializzatore, i blocchi successivi
// DEVONO inizializzare i loro membri (il compilatore non puo' continuare l'auto-increment).
enum StatoMacchina {
  Ferma, // 0
  InMarcia, // 1
}
enum StatoMacchina {
  Manutenzione = 2, // richiede valore esplicito
  Guasto = 3,
}
const s: StatoMacchina = StatoMacchina.Manutenzione; // => 2
// NB: 'typeof StatoMacchina.Guasto' e' il TIPO LITERAL del singolo membro
// (StatoMacchina.Guasto), NON l'intero enum 'StatoMacchina' (che e' l'union di tutti
// i membri). Percio' l'uguaglianza corretta e' col literal del membro stesso.
type _t7 = Expect<Equal<typeof StatoMacchina.Guasto, StatoMacchina.Guasto>>; // ok

// namespace + enum: aggiunge helper "statici" al nome dell'enum.
enum Ruolo {
  SuperAdmin = "SuperAdmin",
  Admin = "Admin",
  Operatore = "Operatore",
  QrDisplay = "QrDisplay",
}
namespace Ruolo {
  export function isAdminOrHigher(r: Ruolo): boolean {
    return r === Ruolo.Admin || r === Ruolo.SuperAdmin;
  }
}
const canManage: boolean = Ruolo.isAdminOrHigher(Ruolo.Admin); // => true

// ============================================================================
// SEZIONE 8 - MODULE AUGMENTATION E GLOBAL AUGMENTATION (il merging "a distanza")
// ============================================================================

// Il merging piu' potente: aggiungere membri a tipi dichiarati ALTROVE. Poiche' non
// importiamo pacchetti esterni, definiamo un finto "modulo" con un namespace e lo
// aumentiamo. Questo replica il pattern 'declare module "express"' che aggiunge campi
// a Request, senza dipendenze esterne.

// Finto modulo "core" (MOCK: qui simulato con un namespace, in un progetto reale sarebbe un pacchetto npm).
namespace CoreLib {
  export interface Request {
    url: string;
  }
}

// Augmentation: aggiungiamo 'utente' alla Request del "modulo" tramite una nuova
// dichiarazione dell'interface omonima nello stesso namespace. Il merging le fonde.
namespace CoreLib {
  export interface Request {
    // Campo iniettato da un "middleware auth" (pattern tipico).
    utente?: { id: number; ruolo: Ruolo };
  }
}

function handler(req: CoreLib.Request): number | undefined {
  // 'utente' esiste grazie all'augmentation, anche se il tipo base non lo aveva.
  return req.utente?.id;
}
const idUtente = handler({ url: "/x", utente: { id: 7, ruolo: Ruolo.Operatore } }); // => 7

// GLOBAL AUGMENTATION (solo mostrata a commento perche' 'declare global' richiede un
// contesto di modulo, e questo file usa export solo in fondo):
// declare global {
//   interface Window {
//     erpVersion: string; // ora window.erpVersion e' tipizzato ovunque
//   }
//   interface Array<T> {
//     ultimo(): T | undefined; // aggiunge un metodo a tutti gli array (dichiarazione, non impl.)
//   }
// }
// Esempio browser: const v = window.erpVersion; // tipizzato dopo l'augmentation sopra

// ============================================================================
// SEZIONE 9 - ESEMPIO ERP #1: REPOSITORY GENERICO ESTESO VIA INTERFACE MERGING
// ============================================================================

// Un'interface generica puo' essere fusa: definiamo il CRUD base, poi un secondo
// blocco aggiunge query specifiche del dominio. Cosi il "contratto" cresce senza
// toccare la definizione originale (open/closed principle a livello di tipi).
interface Repository<T> {
  findById(id: number): T | undefined;
  save(entita: T): void;
}
interface Repository<T> {
  // Estensione dominio: paginazione e conteggio, uniti al contratto base.
  findAll(): readonly T[];
  count(): number;
}

// Repository specializzato per Dipendente: ulteriore merging su una interface
// piu' specifica che eredita e aggiunge query per badge.
interface DipendenteRepository extends Repository<Dipendente> {
  findByBadge(badge: string): Dipendente | undefined;
}
interface DipendenteRepository {
  // Blocco separato fuso: aggiunge una query per ruolo.
  findByRuolo(ruolo: string): readonly Dipendente[];
}

// Implementazione mock che soddisfa TUTTI i membri fusi.
const dipRepo: DipendenteRepository = {
  findById: (id) => (id === 1 ? dip1 : undefined),
  save: () => {},
  findAll: () => [dip1],
  count: () => 1,
  findByBadge: (badge) => (badge === "UP-001" ? dip1 : undefined),
  findByRuolo: (ruolo) => (ruolo === "Operatore" ? [dip1] : []),
};
const trovato = dipRepo.findByBadge("UP-001")?.nome; // => "Rossi"

// Test di tipo: tutte le chiavi del contratto finale sono presenti.
type ChiaviDipRepo = keyof DipendenteRepository;
type _t9 = Expect<
  Equal<ChiaviDipRepo, "findById" | "save" | "findAll" | "count" | "findByBadge" | "findByRuolo">
>; // ok

// ============================================================================
// SEZIONE 10 - ESEMPIO ERP #2: DTO + FACTORY + VALIDATORI SOTTO UN UNICO NOME
// ============================================================================

// Pattern "namespace companion": un tipo DTO e, sotto lo stesso nome, i suoi
// costruttori/validatori. Il chiamante usa un solo identificatore per tutto.
interface TimbraturaDTO {
  badge: string;
  entrata: string;
  uscita: string;
  turno: "P4" | "P2" | "STD";
}
namespace TimbraturaDTO {
  const REGEX_ORA = /^\d{2}:\d{2}$/;
  const REGEX_BADGE = /^UP-\d{3}$/;

  // Type guard che restringe 'unknown' a TimbraturaDTO (control flow analysis).
  export function is(v: unknown): v is TimbraturaDTO {
    if (typeof v !== "object" || v === null) return false;
    const o = v as Record<string, unknown>;
    return (
      typeof o.badge === "string" &&
      REGEX_BADGE.test(o.badge) &&
      typeof o.entrata === "string" &&
      REGEX_ORA.test(o.entrata) &&
      typeof o.uscita === "string" &&
      REGEX_ORA.test(o.uscita) &&
      (o.turno === "P4" || o.turno === "P2" || o.turno === "STD")
    );
  }

  // Factory con default di dominio.
  export function crea(badge: string, entrata: string, uscita: string): TimbraturaDTO {
    return { badge, entrata, uscita, turno: "STD" };
  }
}

function processa(v: unknown): string {
  if (TimbraturaDTO.is(v)) {
    // Qui 'v' e' ristretto a TimbraturaDTO grazie al type guard fuso nel namespace.
    return `${v.badge} ${v.entrata}-${v.uscita} [${v.turno}]`;
  }
  return "input non valido";
}
const dto = TimbraturaDTO.crea("UP-002", "08:00", "17:00");
const riga = processa(dto); // => "UP-002 08:00-17:00 [STD]"
const rigaKo = processa({ badge: "X" }); // => "input non valido"

// ============================================================================
// SEZIONE 11 - ESEMPIO ERP #3: STATO MACCHINA TIPO-LIVELLO + COMPANION RUNTIME
// ============================================================================

// Costruiamo passo-passo una mappa di transizioni valida a livello di tipo, poi
// esponiamo un helper runtime sotto lo stesso nome via merging.

// 1) Union degli stati (riuso dell'enum StatoMacchina come union di stringhe-simboliche).
type StatoM = "Ferma" | "InMarcia" | "Manutenzione" | "Guasto";

// 2) Interface delle transizioni ammesse (chiave = stato, valore = stati raggiungibili).
interface Transizioni {
  Ferma: "InMarcia" | "Manutenzione";
  InMarcia: "Ferma" | "Guasto";
}
// 3) Merging: completiamo la mappa in un secondo blocco (mostra la crescita incrementale).
interface Transizioni {
  Manutenzione: "Ferma";
  Guasto: "Manutenzione";
}

// Companion runtime con lo stesso nome: valida una transizione usando il tipo sopra.
namespace Transizioni {
  const MAPPA: { [K in StatoM]: readonly StatoM[] } = {
    Ferma: ["InMarcia", "Manutenzione"],
    InMarcia: ["Ferma", "Guasto"],
    Manutenzione: ["Ferma"],
    Guasto: ["Manutenzione"],
  };
  export function puo(da: StatoM, a: StatoM): boolean {
    return MAPPA[da].includes(a);
  }
}

// Test di tipo: da "Ferma" i target ammessi sono esattamente due.
type TargetDaFerma = Transizioni["Ferma"];
type _t11 = Expect<Equal<TargetDaFerma, "InMarcia" | "Manutenzione">>; // ok
const okTr: boolean = Transizioni.puo("Ferma", "InMarcia"); // => true
const koTr: boolean = Transizioni.puo("Ferma", "Guasto"); // => false

// Utility type-level che, dato uno stato, estrae i target dal tipo Transizioni
// (mostra "tipi come calcolo": la validita' e' verificabile a compile-time).
type ProssimiStati<S extends keyof Transizioni> = Transizioni[S];
type DopoInMarcia = ProssimiStati<"InMarcia">; // "Ferma" | "Guasto"
type _t11b = Expect<Equal<DopoInMarcia, "Ferma" | "Guasto">>; // ok

// ============================================================================
// SEZIONE 12 - GOTCHA / PITFALLS
// ============================================================================

// PITFALL 1: credere che 'type' si fonda come interface.
// type Punto = { x: number };
// type Punto = { y: number }; // ERRORE TS: Duplicate identifier 'Punto'.
// Soluzione: usa interface (se vuoi merging) oppure intersezione '&' per un nuovo type.

// PITFALL 2: conflitto di tipo sulla stessa proprieta' nel merging di interface.
interface Cfg {
  timeout: number;
}
// interface Cfg {
//   timeout: string; // ERRORE TS: Subsequent property declarations must have the same type.
// }
// Soluzione: mantieni il tipo coerente, oppure usa un'altra proprieta'/union.

// PITFALL 3: ordine namespace/function|class errato.
// namespace Utile { export const x = 1 }
// function Utile() {}   // ERRORE TS: merge non valido; la function/class va PRIMA del namespace-con-valori.
// Soluzione: dichiara prima function/class, poi il namespace companion.

// PITFALL 4: enum merging senza inizializzatori nei blocchi successivi.
// enum E { A }          // A = 0
// enum E { B }          // ERRORE TS: Enum member must have initializer ('B' non puo' auto-incrementare qui)
// Soluzione: dai un valore esplicito ai membri dei blocchi successivi (B = 1).

// PITFALL 5 (sottile): l'augmentation richiede che il nome originale sia una interface/namespace
// (entita' "apribile"). Non puoi "aumentare" un type alias esterno via merging.
// type Esterno = { a: number };
// interface Esterno { b: number } // ERRORE TS: interface/type con lo stesso nome non si fondono.
// Soluzione: se controlli la sorgente, esponila come interface; altrimenti usa un nuovo type con '&'.

// ============================================================================
// SEZIONE 13 - EXPORT (solo simboli definiti in questo file)
// ============================================================================

export type { Equal, Expect, StatoM, ProssimiStati, ChiaviDip };
export {
  creaBadge,
  Turno,
  Ruolo,
  StatoMacchina,
  Transizioni,
  TimbraturaDTO,
  dipRepo,
  processa,
};

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
/*
  DECLARATION MERGING - cosa si fonde:
    - interface + interface        -> unione dei membri (proprieta' non-fn: tipo IDENTICO obbligatorio)
    - interface (metodi)           -> gli overload dei blocchi successivi hanno priorita' piu' alta
    - namespace + interface        -> tipo + tipi/valori annidati (Nome.Membro)
    - namespace + function         -> "proprieta' statiche" su una funzione (function PRIMA)
    - namespace + class            -> membri statici + tipi annidati (class PRIMA)
    - namespace + enum             -> helper statici sull'enum
    - enum + enum                  -> unione dei membri (blocchi successivi: init esplicito)
    - module/global augmentation   -> aggiungere membri a tipi dichiarati altrove

  NON si fonde:
    - type + type                  -> Duplicate identifier (i type sono CHIUSI)
    - type + interface omonimi     -> errore; per estendere un type usa '&' (crea un tipo NUOVO)

  MECCANISMI INTERNI:
    - proprieta' non-funzione = set (ordine irrilevante), ma tipi devono coincidere
    - metodi = overload; ordine: blocchi successivi prima; firme letterali/specializzate per prime
    - typeof su function+namespace cattura call-signature + proprieta'
    - il nome fuso puo' essere insieme tipo e valore (namespace/class/enum)

  QUANDO USARE COSA:
    - interface -> contratti pubblici estendibili, repository, DTO, augmentation
    - type      -> union, mapped, tuple, calcoli type-level (non estendibili dall'esterno)
    - namespace companion -> raggruppare tipo + factory/validatori/costanti sotto un nome

  HELPER DI TEST DI TIPO:
    - Equal<A,B> (doppia funzione generica) + Expect<T extends true>
    - asserisci con: type _ = Expect<Equal<X, Atteso>>;

  PITFALLS:
    - type non si fonde                 -> usa interface o '&'
    - proprieta' con tipo diverso        -> vietato nel merging (uguale nell'intersezione ma da' 'never')
    - ordine function/class vs namespace -> dichiarazione "di valore" PRIMA del namespace
    - enum merging                       -> init esplicito nei blocchi dopo il primo
    - augmentation di un type esterno    -> impossibile; serve un'interface apribile
*/
