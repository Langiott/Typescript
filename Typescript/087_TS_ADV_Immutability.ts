/**
 * 087_TS_ADV_Immutability.ts
 * File 87 - ADV Immutability (Readonly deep)
 *
 * Immutabilita' a livello di tipo in TypeScript: dal readonly superficiale
 * a un DeepReadonly ricorsivo, Object.freeze tipizzato, update immutabile
 * strutturale e configurazione ERP congelata. Spieghiamo i meccanismi
 * interni (ricorsione dei tipi, distributivita', inferenza, control flow).
 */

// ============================================================================
// 0) HELPER TYPE-LEVEL DI TEST (Equal / Expect)
// ============================================================================
// Definiamo qui gli helper per verificare l'uguaglianza tra tipi a compile-time.
// Equal usa il trucco delle funzioni condizionali: due tipi sono uguali solo se
// entrambe le direzioni del condizionale coincidono (invarianza forzata).
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? true : false;

// Expect accetta solo true: se un test fallisce, il tipo passato e' false
// e la riga non compila. Cosi' i test di tipo sono "eseguiti" da tsc.
type Expect<T extends true> = T;

// Esempio d'uso: queste righe compilano solo se l'uguaglianza regge.
type _t0 = Expect<Equal<string, string>>; // ok
// type _tErr = Expect<Equal<string, number>>; // ERRORE TS: false non e' true

export type { Equal, Expect };

// ============================================================================
// 1) READONLY SUPERFICIALE (built-in) E I SUOI LIMITI
// ============================================================================
// La utility Readonly<T> rende readonly SOLO le proprieta' di primo livello.
// Non e' ricorsiva: gli oggetti annidati restano mutabili.
interface ConfigNida {
  soglia: number;
  nested: { valore: number };
}
type ConfigShallow = Readonly<ConfigNida>;
// tipo: { readonly soglia: number; readonly nested: { valore: number } }

declare const cfgS: ConfigShallow;
// cfgS.soglia = 10;          // ERRORE TS: soglia e' readonly
cfgS.nested.valore = 99;      // OK ma indesiderato: nested NON e' readonly!
// Questo e' il limite che DeepReadonly risolve.

// readonly su array/tuple: ReadonlyArray blocca push/pop e assegnamento indici.
const badges: readonly string[] = ["UP-001", "UP-002"];
// badges.push("UP-003");     // ERRORE TS: push non esiste su readonly string[]
// badges[0] = "UP-999";      // ERRORE TS: indice readonly

// ============================================================================
// 2) DEEPREADONLY RICORSIVO
// ============================================================================
// Idea: mappiamo ogni proprieta' come readonly E riapplichiamo DeepReadonly
// al tipo della proprieta'. La ricorsione termina sui tipi primitivi
// (string/number/boolean/...), dove non c'e' piu' nulla da mappare.
//
// Attenzione: dobbiamo gestire in modo speciale array, tuple e function,
// altrimenti il mapped type li tratterebbe come oggetti generici perdendone
// la forma. Ecco perche' introduciamo Primitive e i rami dedicati.

type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

// Funzioni: le lasciamo intatte (non ha senso "congelare" una signature).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

type DeepReadonly<T> =
  T extends Primitive ? T :
  T extends AnyFunction ? T :
  T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepReadonly<U>> :
  T extends Map<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> :
  T extends Set<infer M> ? ReadonlySet<DeepReadonly<M>> :
  { readonly [K in keyof T]: DeepReadonly<T[K]> };

export type { DeepReadonly, Primitive };

// Verifica sul caso annidato: ora anche nested e' readonly.
type ConfigDeep = DeepReadonly<ConfigNida>;
// tipo: { readonly soglia: number; readonly nested: { readonly valore: number } }
declare const cfgD: ConfigDeep;
// cfgD.nested.valore = 99;   // ERRORE TS: valore e' readonly (fix del punto 1)
type _t1 = Expect<Equal<
  ConfigDeep,
  { readonly soglia: number; readonly nested: { readonly valore: number } }
>>; // ok

// DeepReadonly su primitivo: identita' (ramo T extends Primitive ? T).
type _t2 = Expect<Equal<DeepReadonly<number>, number>>; // ok

// DeepReadonly su array di oggetti: readonly a ogni livello.
type Elenco = { id: number; note: { testo: string } }[];
type ElencoRO = DeepReadonly<Elenco>;
// tipo: ReadonlyArray<{ readonly id: number; readonly note: { readonly testo: string } }>
declare const el: ElencoRO;
// el.push({ id: 1, note: { testo: "x" } }); // ERRORE TS: push non esiste
// el[0].note.testo = "y";                    // ERRORE TS: testo readonly

// ============================================================================
// 3) PERCHE' L'ORDINE DEI RAMI CONTA (meccanica interna)
// ============================================================================
// Un array E' anche un oggetto: se il ramo mapped-type venisse PRIMA del ramo
// ReadonlyArray, TS proverebbe a mappare le chiavi numeriche + i metodi
// dell'array, producendo un tipo malformato. Mettendo i rami piu' specifici
// (Array/Map/Set) prima del ramo oggetto generico, la ricorsione resta corretta.
//
// Nota control-flow-of-types: i conditional types vengono valutati in ordine,
// come una catena di if/else. Il primo match vince.

// ============================================================================
// 4) DeepMutable: l'inverso (togliere readonly ricorsivamente)
// ============================================================================
// Utile per DTO in ingresso che poi si congelano. Il modificatore -readonly
// rimuove readonly. Va applicato ricorsivamente come per DeepReadonly.
type DeepMutable<T> =
  T extends Primitive ? T :
  T extends AnyFunction ? T :
  T extends ReadonlyArray<infer U> ? Array<DeepMutable<U>> :
  { -readonly [K in keyof T]: DeepMutable<T[K]> };

export type { DeepMutable };

type _t3 = Expect<Equal<
  DeepMutable<ConfigDeep>,
  { soglia: number; nested: { valore: number } }
>>; // ok: readonly rimosso a ogni livello

// ============================================================================
// 5) MODELLO ERP: entita' di dominio
// ============================================================================
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";
type OrarioHHMM = string; // vincolato a runtime da /^\d{2}:\d{2}$/
type Badge = string;      // vincolato a runtime da /^UP-\d{3}$/

interface Reparto {
  id: number;
  nome: string;
  turno: Turno;
}

interface Timbratura {
  entrata: OrarioHHMM; // naive-UTC "HH:MM"
  uscita: OrarioHHMM | null;
}

interface Dipendente {
  id: number;
  nome: string;
  badge: Badge;        // "UP-001"
  ruolo: Ruolo;
  reparto: Reparto;
  timbrature: Timbratura[];
}

export type { Ruolo, Turno, Reparto, Timbratura, Dipendente };

// ============================================================================
// 6) OBJECT.FREEZE TIPIZZATO
// ============================================================================
// Il lib standard tipizza Object.freeze<T>(o: T): Readonly<T>, cioe' SHALLOW.
// Definiamo un helper deepFreeze che a runtime congela ricorsivamente e a
// compile-time restituisce DeepReadonly<T>: allineamento tra runtime e tipo.

function deepFreeze<T>(obj: T): DeepReadonly<T> {
  // A runtime: freeze ricorsivo su oggetti e array (i primitivi si ignorano).
  if (obj !== null && typeof obj === "object") {
    // Object.getOwnPropertyNames per includere anche chiavi non enumerabili.
    for (const key of Object.getOwnPropertyNames(obj)) {
      const value = (obj as Record<string, unknown>)[key];
      if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
        deepFreeze(value);
      }
    }
    Object.freeze(obj);
  }
  // Il cast e' inevitabile: TS non sa che abbiamo congelato tutto in profondita'.
  return obj as DeepReadonly<T>;
}

export { deepFreeze };

// Uso ERP: configurazione applicativa congelata all'avvio.
interface AppConfig {
  db: { host: string; port: number };
  turniAbilitati: Turno[];
  soglie: { ritardoMin: number; straordinarioMin: number };
}

const CONFIG = deepFreeze<AppConfig>({
  db: { host: "192.168.2.98", port: 9000 },
  turniAbilitati: ["P4", "P2", "STD"],
  soglie: { ritardoMin: 5, straordinarioMin: 30 },
});
// tipo di CONFIG: DeepReadonly<AppConfig>

// CONFIG.db.port = 5432;                 // ERRORE TS: port e' readonly (deep)
// CONFIG.turniAbilitati.push("P4");      // ERRORE TS: push non esiste su readonly
// CONFIG.soglie.ritardoMin = 10;         // ERRORE TS: readonly annidato
const host: string = CONFIG.db.host;      // lettura: OK => "192.168.2.98"

// Confronto con freeze built-in (shallow): resta il buco sul nested.
const shallowCfg = Object.freeze<AppConfig>({
  db: { host: "h", port: 1 },
  turniAbilitati: ["STD"],
  soglie: { ritardoMin: 1, straordinarioMin: 1 },
});
shallowCfg.db.port = 2; // OK per il type checker: Object.freeze e' shallow!

// ============================================================================
// 7) UPDATE IMMUTABILE (structural sharing)
// ============================================================================
// Regola: non mutare mai; produrre un nuovo oggetto con spread, condividendo
// i sotto-oggetti non toccati (structural sharing => efficienza + purezza).
// Il tipo di ritorno resta immutabile: aggiorniamo su copie mutabili interne.

// Helper generico: aggiorna una singola proprieta' di primo livello.
function withProp<T, K extends keyof T>(
  obj: DeepReadonly<T>,
  key: K,
  value: T[K],
): DeepReadonly<T> {
  // Spread produce una copia shallow; ricongeliamo per mantenere l'invariante.
  const copia = { ...(obj as object), [key]: value } as T;
  return deepFreeze(copia);
}

export { withProp };

// Esempio ERP: aggiornare la soglia ritardo senza mutare CONFIG.
const cfgAgg = withProp(
  { ...CONFIG, soglie: { ...CONFIG.soglie } } as unknown as DeepReadonly<AppConfig>,
  "turniAbilitati",
  ["P4", "STD"],
);
// cfgAgg e' un nuovo oggetto congelato; CONFIG resta invariato.

// Update annidato immutabile: nuova timbratura di uscita su un Dipendente.
function chiudiTurno(
  dip: DeepReadonly<Dipendente>,
  indice: number,
  uscita: OrarioHHMM,
): DeepReadonly<Dipendente> {
  // Copiamo l'array (mutabile) e sostituiamo l'elemento all'indice dato.
  const timbrature = dip.timbrature.map((t, i) =>
    i === indice ? { entrata: t.entrata, uscita } : { entrata: t.entrata, uscita: t.uscita },
  );
  // Ricostruiamo il dipendente condividendo id/nome/badge/reparto invariati.
  return deepFreeze<Dipendente>({
    id: dip.id,
    nome: dip.nome,
    badge: dip.badge,
    ruolo: dip.ruolo,
    reparto: { ...dip.reparto },
    timbrature,
  });
}

// ============================================================================
// 8) REPOSITORY ERP: espone solo viste immutabili
// ============================================================================
// Pattern: lo stato interno e' mutabile, ma verso l'esterno si restituisce
// SOLO DeepReadonly. Cosi' i chiamanti non possono corrompere lo stato.
class DipendenteRepository {
  private readonly store = new Map<number, Dipendente>();

  save(d: Dipendente): void {
    // internamente lavoriamo su dati mutabili
    this.store.set(d.id, d);
  }

  // La vista pubblica e' immutabile in profondita'.
  findById(id: number): DeepReadonly<Dipendente> | undefined {
    const d = this.store.get(id);
    return d === undefined ? undefined : deepFreeze(structuredClone(d));
  }

  // Elenco immutabile: array readonly di viste readonly.
  all(): DeepReadonly<Dipendente[]> {
    const copia = [...this.store.values()].map((d) => structuredClone(d));
    return deepFreeze(copia);
  }
}

export { DipendenteRepository, chiudiTurno };

// Esempio d'uso del repository.
const repo = new DipendenteRepository();
repo.save({
  id: 1,
  nome: "Mario",
  badge: "UP-001",
  ruolo: "Operatore",
  reparto: { id: 10, nome: "Stampaggio", turno: "P4" },
  timbrature: [{ entrata: "08:00", uscita: null }],
});
const trovato = repo.findById(1);
// trovato?.timbrature[0].uscita = "17:00"; // ERRORE TS: uscita readonly (deep)
const nome = trovato?.nome; // lettura OK => "Mario"

// ============================================================================
// 9) as const: immutabilita' a compile-time per LITERALS
// ============================================================================
// as const congela un literal: proprieta' readonly, array come tuple readonly,
// e mantiene i tipi letterali (non widening). E' complementare a deepFreeze:
// as const agisce sul tipo, deepFreeze anche a runtime.
const RUOLI = ["SuperAdmin", "Admin", "Operatore", "QrDisplay"] as const;
// tipo: readonly ["SuperAdmin", "Admin", "Operatore", "QrDisplay"]
type RuoloDaConst = (typeof RUOLI)[number];
// tipo: "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay"
type _t4 = Expect<Equal<RuoloDaConst, Ruolo>>; // ok: coincidono

const DEFAULT_TURNO = {
  codice: "STD",
  descrizione: "Turno standard",
} as const;
// DEFAULT_TURNO.codice = "P4"; // ERRORE TS: codice e' readonly (as const)

// Differenza chiave: as const NON e' ricorsivo a RUNTIME. Congela solo i tipi.
// Se serve immutabilita' effettiva a runtime, serve comunque deepFreeze.

// ============================================================================
// 10) GOTCHA / PITFALLS
// ============================================================================

// GOTCHA 1 - Readonly e' shallow: falso senso di sicurezza sul nested.
// Vedi punto 1: cfgS.nested.valore era mutabile. Soluzione: DeepReadonly.

// GOTCHA 2 - Assegnare un readonly a un tipo mutabile NON e' consentito,
// ma il contrario (mutabile -> readonly) si', per covarianza dei readonly.
function usaRO(_x: readonly number[]): void { /* ... */ }
const mut: number[] = [1, 2, 3];
usaRO(mut); // OK: number[] e' assegnabile a readonly number[]
declare const ro: readonly number[];
// const backMut: number[] = ro; // ERRORE TS: readonly number[] non assegnabile a number[]

// GOTCHA 3 - DeepReadonly su tipi con index signature: il mapped type
// preserva l'index signature ma la rende readonly. Attenzione ai record.
type Dizionario = { [badge: string]: Dipendente };
type DizionarioRO = DeepReadonly<Dizionario>;
declare const diz: DizionarioRO;
// diz["UP-001"] = trovato!; // ERRORE TS: index signature readonly
const uno = diz["UP-001"]; // lettura OK, valore e' DeepReadonly<Dipendente>

// GOTCHA 4 - Object.freeze non impedisce la mutazione se NON in strict mode
// a runtime, e NON congela i figli. In piu' un cast "as any" bypassa i tipi:
const frozen = deepFreeze({ a: { b: 1 } });
// (frozen as any).a.b = 2; // A runtime lancia in strict mode (frozen), ma
//                          // il cast as any spegne il type checker: evitarlo.
const letturaFrozen = frozen.a.b; // OK => 1

// GOTCHA 5 - structuredClone rompe la referenza: dopo il clone i sotto-oggetti
// non sono piu' condivisi. Va bene per snapshot immutabili (vedi repository),
// ma perde lo structural sharing (piu' costoso su strutture grandi).

// ============================================================================
// 11) PATTERN TYPE-LEVEL: rendere readonly solo ALCUNE chiavi in profondita'
// ============================================================================
// A volte non vogliamo congelare tutto. DeepReadonlyKeys applica DeepReadonly
// solo alle chiavi selezionate, lasciando mutabili le altre.
type DeepReadonlyKeys<T, K extends keyof T> =
  Omit<T, K> & { readonly [P in K]: DeepReadonly<T[P]> };

export type { DeepReadonlyKeys };

type DipParziale = DeepReadonlyKeys<Dipendente, "reparto">;
declare const dp: DipParziale;
dp.nome = "Luigi";              // OK: nome resta mutabile
// dp.reparto.turno = "P2";     // ERRORE TS: reparto congelato in profondita'
const t: Turno = dp.reparto.turno; // lettura OK

// ============================================================================
// 12) STATO MACCHINA IMMUTABILE (transizioni pure)
// ============================================================================
// Ogni transizione restituisce un NUOVO stato congelato: niente mutazioni.
type StatoTimbratura = "aperta" | "chiusa" | "annullata";

interface StatoTurno {
  stato: StatoTimbratura;
  timbratura: Timbratura;
}

function apri(entrata: OrarioHHMM): DeepReadonly<StatoTurno> {
  return deepFreeze<StatoTurno>({
    stato: "aperta",
    timbratura: { entrata, uscita: null },
  });
}

function chiudi(
  s: DeepReadonly<StatoTurno>,
  uscita: OrarioHHMM,
): DeepReadonly<StatoTurno> {
  if (s.stato !== "aperta") return s; // transizione no-op se non aperta
  return deepFreeze<StatoTurno>({
    stato: "chiusa",
    timbratura: { entrata: s.timbratura.entrata, uscita },
  });
}

const s0 = apri("08:00");
const s1 = chiudi(s0, "17:00");
// s0.stato === "aperta" ancora vero: s0 non e' stato mutato (purezza).
// s1.timbratura.uscita = "18:00"; // ERRORE TS: readonly (deep)

export { apri, chiudi };
export type { StatoTurno, StatoTimbratura };

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
// - Readonly<T>: readonly SHALLOW (solo primo livello).
// - ReadonlyArray<T> / readonly T[]: array immutabile (niente push/pop/indici).
// - DeepReadonly<T>: mapped type RICORSIVO; rami dedicati per Array/Map/Set/Function.
// - Ordine dei conditional types: il primo match vince (rami specifici prima).
// - Terminazione ricorsione: sui Primitive (string/number/.../null/undefined).
// - DeepMutable<T>: inverso, usa modificatore -readonly ricorsivo.
// - Object.freeze<T>: tipizzato come Readonly<T> (SHALLOW) e freeze shallow a runtime.
// - deepFreeze<T>: freeze RICORSIVO a runtime + tipo DeepReadonly<T>.
// - Update immutabile: spread + structural sharing, mai mutare in place.
// - structuredClone: snapshot profondo (rompe sharing) per viste immutabili.
// - Repository pattern: stato interno mutabile, viste esterne DeepReadonly.
// - as const: immutabilita' a compile-time per literals (readonly + no widening).
// - as const NON congela a runtime; deepFreeze si'.
// - (typeof X)[number]: estrae union dai valori di una tuple as const.
// - Covarianza readonly: mutabile -> readonly OK; readonly -> mutabile NO.
// - Equal/Expect: test di tipo a compile-time (fallire = non compila).
// - DeepReadonlyKeys<T,K>: congela in profondita' solo chiavi selezionate.
// - Stato macchina immutabile: transizioni pure che ritornano stato congelato.
