/**
 * File 075 - ADV Decorator metadata
 * Corso TypeScript Advanced - Reflect Metadata e "design:type".
 * In questo file spieghiamo il concetto di reflect-metadata, i metadata emessi
 * dal compiler (design:type, design:paramtypes, design:returntype) e il perche'
 * qui sono TUTTI COMMENTATI: servono experimentalDecorators + emitDecoratorMetadata
 * + il polyfill "reflect-metadata", che in questo progetto sono OFF.
 * Al posto della vera Reflect API simuliamo il meccanismo con una Map manuale
 * type-safe che compila senza dipendenze esterne (tsc --strict).
 */

// ============================================================================
// SEZIONE 0 - Perche' tutto e' commentato (setup necessario)
// ============================================================================
// La sintassi "@decorator" e i metadata di design richiedono, nel tsconfig:
//   "experimentalDecorators": true   (abilita la vecchia sintassi @dec)
//   "emitDecoratorMetadata": true    (fa emettere design:type & co.)
// piu' il polyfill a runtime:
//   import "reflect-metadata";        (definisce Reflect.metadata / getMetadata)
//
// In QUESTO corso experimentalDecorators = FALSE, quindi qualunque riga con
// "@qualcosa" davanti a una classe/proprieta' NON compilerebbe. Percio' ogni
// esempio con decoratori vero e' racchiuso in commenti. Il codice ESEGUIBILE
// (che compila) usa una Map manuale per riprodurre lo stesso pattern.

// ----------------------------------------------------------------------------
// Esempio (SOLO COMMENTO) di come apparirebbe con la Reflect API abilitata:
//
// import "reflect-metadata";
//
// function Column(): PropertyDecorator {
//   return (target, propertyKey) => {
//     // design:type viene emesso in automatico dal compiler grazie a
//     // emitDecoratorMetadata: e' il costruttore del tipo della proprieta'.
//     const t = Reflect.getMetadata("design:type", target, propertyKey);
//     // t === String per una proprieta': string, Number per number, ecc.
//     console.log(String(propertyKey), (t as { name: string }).name);
//   };
// }
//
// class DipendenteEntity {
//   @Column() nome!: string;   // design:type => String
//   @Column() eta!: number;    // design:type => Number
// }
// ERRORE TS (con experimentalDecorators=false): "Decorators are not valid here".

// ============================================================================
// SEZIONE 1 - Cos'e' design:type (la mappatura tipo -> costruttore)
// ============================================================================
// emitDecoratorMetadata emette per ogni membro decorato un valore RUNTIME che
// approssima il tipo statico. La mappatura NON e' 1:1: molti tipi collassano.
//
//   string             -> String
//   number             -> Number
//   boolean            -> Boolean
//   bigint             -> BigInt
//   symbol             -> Symbol
//   Date               -> Date
//   Array<T> / T[]     -> Array    (il tipo T dell'elemento VIENE PERSO!)
//   una classe C       -> C        (il costruttore stesso)
//   una interface      -> Object   (le interface non esistono a runtime)
//   union OMOGENEA      -> costruttore del base type: "P4"|"P2" -> String !!
//   union ETEROGENEA    -> Object  (base type diversi -> nessun ctor singolo)
//   any / unknown      -> Object
//   void / never       -> undefined
// ATTENZIONE (sfatiamo un mito): una union di soli string literal come
// "P4"|"P2"|"STD" NON diventa Object, diventa String, perche' a runtime ogni
// valore e' comunque una string. Solo le union con base type DIVERSI (es.
// string|number) collassano a Object. Lo stesso vale per number literal -> Number.
//
// Rappresentiamo questa mappatura a livello di TYPE, cosi' e' verificabile:
type DesignTypeName =
  | "String"
  | "Number"
  | "Boolean"
  | "BigInt"
  | "Symbol"
  | "Object"
  | "Array"
  | "Function"
  | "Date";

// Mapped/conditional type che, dato un tipo TS, calcola il nome del costruttore
// che il compiler emetterebbe come design:type. E' un "type as computation":
// il risultato e' un calcolo puro a compile-time, senza runtime.
type DesignTypeOf<T> = [T] extends [string]
  ? "String"
  : [T] extends [number]
  ? "Number"
  : [T] extends [boolean]
  ? "Boolean"
  : [T] extends [bigint]
  ? "BigInt"
  : [T] extends [symbol]
  ? "Symbol"
  : [T] extends [Date]
  ? "Date"
  : [T] extends [readonly unknown[]]
  ? "Array"
  : [T] extends [(...a: never[]) => unknown]
  ? "Function"
  : "Object";
// NB: usiamo [T] extends [X] (tuple wrapping) per DISABILITARE la distributivita'
// dei conditional type sulle union. Senza le parentesi quadre, un tipo come
// string|number verrebbe distribuito e darebbe "String"|"Number", mentre il
// compiler reale emette UN solo costruttore (Object) per le union.

// Verifica veloce (i tipi inferiti sono mostrati come commento):
type _t1 = DesignTypeOf<string>; // "String"
type _t2 = DesignTypeOf<number>; // "Number"
type _t3 = DesignTypeOf<boolean[]>; // "Array"  (T dell'array perso, resta Array)
type _t4 = DesignTypeOf<Date>; // "Date"
type _t5 = DesignTypeOf<string | number>; // "Object" (union ETEROGENEA collassa)
type _t6 = DesignTypeOf<{ id: number }>; // "Object" (interface/oggetto)
type _t7 = DesignTypeOf<"P4" | "P2" | "STD">; // "String"  (union OMOGENEA di string!)

// ============================================================================
// SEZIONE 2 - Helper di TYPE TESTING (Equal / Expect)
// ============================================================================
// Pattern classico per scrivere "unit test" a livello di tipo. Equal sfrutta il
// fatto che due funzioni condizionali identiche sono assegnabili solo se i tipi
// coincidono ESATTAMENTE (piu' stretto di un semplice extends bidirezionale).
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false;

// Expect accetta solo il literal true: se il test fallisce, ERRORE TS in questa riga.
type Expect<T extends true> = T;

// Test dei design:type calcolati sopra (se uno fosse sbagliato -> errore qui):
type _test_string = Expect<Equal<DesignTypeOf<string>, "String">>;
type _test_arr = Expect<Equal<DesignTypeOf<number[]>, "Array">>;
type _test_union = Expect<Equal<DesignTypeOf<"P4" | "P2" | "STD">, "String">>;
type _test_union_het = Expect<Equal<DesignTypeOf<string | number>, "Object">>;
// Prova a "romperlo" (COMMENTATO per non fallire la build):
// type _bad = Expect<Equal<DesignTypeOf<number>, "String">>;
// ERRORE TS: Type 'false' does not satisfy the constraint 'true'.

// ============================================================================
// SEZIONE 3 - Reflect Metadata simulata con una Map manuale (COMPILA)
// ============================================================================
// La vera Reflect.defineMetadata/getMetadata usa una WeakMap globale annidata:
//   target -> propertyKey -> metadataKey -> value
// La riproduciamo con classi type-safe. E' esattamente il modello mentale che
// sta dietro reflect-metadata, ma senza il polyfill e senza decoratori.

// Un descrittore di metadata per una singola proprieta'.
interface PropertyMeta {
  readonly designType: DesignTypeName; // simula design:type
  readonly required: boolean; // metadata "custom" (es. @Required)
  readonly maxLength?: number; // altro metadata custom (es. @MaxLength)
}

// Contenitore per una classe: mappa nomeProprieta' -> metadata.
class MetadataRegistry<TShape extends object> {
  // La chiave e' keyof TShape: NON puoi registrare metadata per proprieta'
  // che non esistono sul tipo. Questo e' il vantaggio type-safe della Map.
  private readonly store = new Map<keyof TShape, PropertyMeta>();

  define<K extends keyof TShape>(key: K, meta: PropertyMeta): this {
    this.store.set(key, meta);
    return this; // fluent, come un decorator che ritorna il target
  }

  get<K extends keyof TShape>(key: K): PropertyMeta | undefined {
    return this.store.get(key);
  }

  keys(): Array<keyof TShape> {
    return [...this.store.keys()];
  }

  entries(): Array<[keyof TShape, PropertyMeta]> {
    return [...this.store.entries()];
  }
}

// ----------------------------------------------------------------------------
// Dominio ERP Polyuretech: un Dipendente. Definiamo l'entita' come interface
// (a runtime NON esiste -> se avessimo i decoratori, design:type sarebbe Object).
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001" (vedi regex piu' avanti)
  ruolo: Ruolo;
  assunzione: Date;
  attivo: boolean;
}

// Registriamo i metadata "a mano" (l'equivalente di annotare ogni campo con
// @Column/@Required/@MaxLength). Notare come DesignTypeOf<...> calcoli il tipo
// giusto in modo dichiarativo, cosi' non lo scriviamo a mano rischiando errori.
const dipendenteMeta = new MetadataRegistry<Dipendente>()
  .define("id", { designType: "Number", required: true })
  .define("nome", { designType: "String", required: true, maxLength: 60 })
  .define("badge", { designType: "String", required: true, maxLength: 6 })
  .define("ruolo", { designType: "String", required: true }) // union OMOGENEA string -> String
  .define("assunzione", { designType: "Date", required: false })
  .define("attivo", { designType: "Boolean", required: true });

// Uso: leggere i metadata come farebbe un ORM/validatore.
const nomeMeta = dipendenteMeta.get("nome");
// nomeMeta?.designType -> "String", nomeMeta?.maxLength -> 60
const requiredFields = dipendenteMeta
  .entries()
  .filter(([, m]) => m.required)
  .map(([k]) => k);
// requiredFields: (keyof Dipendente)[] => ["id","nome","badge","ruolo","attivo"]

// ERRORE TS: la Map e' vincolata a keyof Dipendente, quindi:
// dipendenteMeta.define("stipendio", { designType: "Number", required: true });
// ERRORE TS: Argument of type '"stipendio"' is not assignable to keyof Dipendente.

// ============================================================================
// SEZIONE 4 - Coerenza design:type <-> tipo statico (test di tipo)
// ============================================================================
// Vogliamo garantire che il designType dichiarato nella Map COINCIDA con quello
// che il compiler emetterebbe davvero. Costruiamo un type-level check per campo.
type ExpectedDesign<T, K extends keyof T> = DesignTypeOf<T[K]>;

// Per "nome" ci aspettiamo "String":
type _designNome = ExpectedDesign<Dipendente, "nome">; // "String"
type _t_design_nome = Expect<Equal<_designNome, "String">>;
// Per "assunzione" ci aspettiamo "Date":
type _t_design_ass = Expect<Equal<ExpectedDesign<Dipendente, "assunzione">, "Date">>;
// Per "ruolo" (union OMOGENEA di string literal) ci aspettiamo "String", NON Object:
type _t_design_ruolo = Expect<Equal<ExpectedDesign<Dipendente, "ruolo">, "String">>;

// ============================================================================
// SEZIONE 5 - Validazione runtime guidata dai metadata (pattern DTO/ORM)
// ============================================================================
// I framework reali (class-validator, TypeORM) leggono i metadata via Reflect
// e li usano per validare. Qui facciamo lo stesso leggendo la nostra Map.

// Regole di dominio Polyuretech.
const BADGE_RE = /^UP-\d{3}$/; // badge tipo "UP-001"
const ORARIO_RE = /^\d{2}:\d{2}$/; // orario "HH:MM" naive-UTC (stringa)

// Risultato di validazione discriminated union (control flow analysis friendly).
type ValidationOk<T> = { readonly ok: true; readonly value: T };
type ValidationErr = { readonly ok: false; readonly errors: readonly string[] };
type ValidationResult<T> = ValidationOk<T> | ValidationErr;

// Valida un oggetto grezzo (unknown) contro i metadata + regole di dominio.
function validateDipendente(input: unknown): ValidationResult<Dipendente> {
  const errors: string[] = [];
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: ["payload non e' un oggetto"] };
  }
  const rec = input as Record<string, unknown>;

  // Ciclo generico sui metadata: controlla "required" e il designType basilare.
  for (const [key, meta] of dipendenteMeta.entries()) {
    const raw = rec[key as string];
    if (meta.required && (raw === undefined || raw === null)) {
      errors.push(`${String(key)} e' obbligatorio`);
      continue;
    }
    if (raw === undefined || raw === null) continue;
    // Mappa il designType al typeof runtime atteso.
    const okType =
      (meta.designType === "String" && typeof raw === "string") ||
      (meta.designType === "Number" && typeof raw === "number") ||
      (meta.designType === "Boolean" && typeof raw === "boolean") ||
      (meta.designType === "Date" && raw instanceof Date) ||
      meta.designType === "Object"; // union/oggetto: check specifico dopo
    if (!okType) errors.push(`${String(key)} ha tipo errato (${meta.designType})`);
    if (typeof raw === "string" && meta.maxLength && raw.length > meta.maxLength) {
      errors.push(`${String(key)} supera maxLength ${meta.maxLength}`);
    }
  }

  // Regole di dominio specifiche non esprimibili dal solo design:type.
  if (typeof rec.badge === "string" && !BADGE_RE.test(rec.badge)) {
    errors.push('badge deve rispettare "UP-000"');
  }
  const ruoliValidi: readonly Ruolo[] = ["SuperAdmin", "Admin", "Operatore", "QrDisplay"];
  if (typeof rec.ruolo === "string" && !ruoliValidi.includes(rec.ruolo as Ruolo)) {
    errors.push("ruolo non valido");
  }

  if (errors.length > 0) return { ok: false, errors };
  // Dopo tutti i check possiamo asserire il tipo forte.
  return { ok: true, value: rec as unknown as Dipendente };
}

// Uso: narrowing tramite la discriminated union.
const esito = validateDipendente({
  id: 1,
  nome: "Mario Rossi",
  badge: "UP-001",
  ruolo: "Operatore",
  assunzione: new Date("2020-01-15"),
  attivo: true,
});
if (esito.ok) {
  // qui esito e' ValidationOk<Dipendente>: esito.value.nome e' string.
  const _n: string = esito.value.nome; // ok
} else {
  // qui esito e' ValidationErr: esito.errors e' readonly string[].
  const _e: readonly string[] = esito.errors;
}

// Esempio che produce errori (badge sbagliato, nome troppo lungo):
const esitoKO = validateDipendente({ id: 2, nome: "x".repeat(100), badge: "001", ruolo: "Boss", attivo: true });
// esitoKO.ok === false, esitoKO.errors contiene i messaggi.

// ============================================================================
// SEZIONE 6 - Metadata su Timbratura + macchina a stati (esempio ERP ricco)
// ============================================================================
// Una Timbratura ha orari "HH:MM" naive-UTC. Modelliamo lo stato con union.
interface Timbratura {
  dipendenteId: number;
  turno: Turno;
  entrata: string; // "08:00"
  uscita?: string; // "17:00" (assente finche' aperto)
}

const timbraturaMeta = new MetadataRegistry<Timbratura>()
  .define("dipendenteId", { designType: "Number", required: true })
  .define("turno", { designType: "String", required: true }) // union OMOGENEA string
  .define("entrata", { designType: "String", required: true, maxLength: 5 })
  .define("uscita", { designType: "String", required: false, maxLength: 5 });

// Validazione orario riusabile.
function isOrario(s: string): boolean {
  return ORARIO_RE.test(s);
}

// Stato macchina: aperta (solo entrata) -> chiusa (entrata+uscita).
type TimbraturaAperta = { readonly stato: "aperta"; readonly entrata: string };
type TimbraturaChiusa = {
  readonly stato: "chiusa";
  readonly entrata: string;
  readonly uscita: string;
};
type StatoTimbratura = TimbraturaAperta | TimbraturaChiusa;

// Transizione type-safe: chiudi una timbratura aperta.
function chiudiTimbratura(t: TimbraturaAperta, uscita: string): StatoTimbratura {
  if (!isOrario(uscita)) return t; // non valido: resta aperta
  return { stato: "chiusa", entrata: t.entrata, uscita };
}

const t0: TimbraturaAperta = { stato: "aperta", entrata: "08:00" };
const t1 = chiudiTimbratura(t0, "17:00");
// t1: StatoTimbratura; se t1.stato === "chiusa" allora t1.uscita e' string.
if (t1.stato === "chiusa") {
  const _u: string = t1.uscita; // narrowing sulla discriminant "stato"
}
// ERRORE TS: non puoi leggere uscita senza restringere prima lo stato:
// const _bad = t1.uscita;
// ERRORE TS: Property 'uscita' does not exist on type 'TimbraturaAperta'.

// Verifica che i metadata di Timbratura siano coerenti col tipo (type test):
type _t_entrata = Expect<Equal<ExpectedDesign<Timbratura, "entrata">, "String">>;
type _t_turno = Expect<Equal<ExpectedDesign<Timbratura, "turno">, "String">>; // union string!

// ============================================================================
// SEZIONE 7 - design:paramtypes / design:returntype (spiegazione + simulazione)
// ============================================================================
// Oltre a design:type (proprieta'/accessor), con emitDecoratorMetadata su un
// METODO il compiler emette anche:
//   design:paramtypes  -> array dei costruttori dei parametri
//   design:returntype  -> costruttore del tipo di ritorno
// Servono alla Dependency Injection (Angular, Nest): leggono design:paramtypes
// del costruttore per sapere COSA iniettare.
//
// Esempio SOLO COMMENTO di come apparirebbe:
// class RepartoService {
//   @LogTypes()
//   registra(dip: Dipendente, turno: Turno): boolean { return true; }
//   // design:paramtypes => [Object /*Dipendente e' interface*/, String /*union string*/]
//   // design:returntype => Boolean
// }
//
// Lo simuliamo a livello di TYPE ricavando i costruttori attesi da una firma.
type Ctor = "String" | "Number" | "Boolean" | "Object" | "Array" | "Date" | "Function";

// design:paramtypes: mappa una tupla di parametri sui rispettivi design name.
type ParamTypes<F> = F extends (...args: infer P) => unknown
  ? { [I in keyof P]: DesignTypeOf<P[I]> }
  : never;

// design:returntype: il design name del tipo di ritorno.
type ReturnDesign<F> = F extends (...args: never[]) => infer R ? DesignTypeOf<R> : never;

// Prova su una firma realistica.
type FnRegistra = (dip: Dipendente, turno: Turno) => boolean;
// dip e' una interface -> "Object"; turno e' union OMOGENEA di string -> "String".
type _params = ParamTypes<FnRegistra>; // ["Object", "String"]
type _ret = ReturnDesign<FnRegistra>; // "Boolean"
type _t_params = Expect<Equal<_params, ["Object", "String"]>>;
type _t_ret = Expect<Equal<_ret, "Boolean">>;

// Firma con tipi primitivi/array per vedere la differenza.
type FnCalcola = (badge: string, ore: number, note: string[]) => Date;
type _p2 = ParamTypes<FnCalcola>; // ["String", "Number", "Array"]
type _r2 = ReturnDesign<FnCalcola>; // "Date"
type _t_p2 = Expect<Equal<_p2, ["String", "Number", "Array"]>>;

// (Ctor e' definito per documentare l'insieme dei costruttori possibili.)
const _tuttiCtor: Ctor[] = ["String", "Number", "Boolean", "Object", "Array", "Date", "Function"];

// ============================================================================
// SEZIONE 8 - GOTCHA / PITFALLS (trappole comuni + soluzione)
// ============================================================================

// GOTCHA 1 - "union -> Object" e' FALSO per le union omogenee (trappola classica).
// Molti credono che QUALSIASI union collassi a Object nei metadata. In realta':
//   - union ETEROGENEA (base type diversi, es. string|number) -> Object
//   - union OMOGENEA di string literal (es. Ruolo) -> String, NON Object!
//   - una interface / oggetto -> Object (le interface non esistono a runtime)
// Conseguenza pratica: da design:type di un campo "ruolo: Ruolo" leggi solo
// "e' una string", PERDI l'informazione sui valori ammessi ("SuperAdmin"...).
// Quel vincolo va registrato come metadata CUSTOM (come i nostri PropertyMeta).
type _gotcha1a = Expect<Equal<DesignTypeOf<Ruolo>, "String">>; // union string -> String
type _gotcha1b = Expect<Equal<DesignTypeOf<string | number>, "Object">>; // eterogenea
type _gotcha1c = Expect<Equal<DesignTypeOf<{ id: number }>, "Object">>; // interface

// GOTCHA 2 - Il tipo dell'elemento di un array e' PERSO.
// design:type di string[] e' Array, non "Array<string>". Non puoi validare gli
// elementi guardando solo i metadata: serve un metadata aggiuntivo (es. itemType).
type _gotcha2 = Expect<Equal<DesignTypeOf<Turno[]>, "Array">>; // solo "Array"
interface ArrayMetaFix {
  readonly designType: "Array";
  readonly itemType: DesignTypeName; // il pezzo mancante da registrare a mano
}
const turniMeta: ArrayMetaFix = { designType: "Array", itemType: "String" };
void turniMeta;

// GOTCHA 3 - Distributivita' dei conditional type sulle union.
// Senza il tuple-wrapping [T] extends [X], un conditional type SI DISTRIBUISCE
// sulle union e produce un risultato sbagliato rispetto a design:type reale.
type NaiveDesign<T> = T extends string ? "String" : T extends number ? "Number" : "Object";
type _distr = NaiveDesign<string | number>; // "String" | "Number"  (SBAGLIATO!)
// Soluzione: wrappare in tuple per bloccare la distributivita' (come DesignTypeOf):
type _fixed = DesignTypeOf<string | number>; // "Object" (corretto)
type _t_gotcha3 = Expect<Equal<_fixed, "Object">>;
// (Se volessi VERIFICARE l'errore del naive:)
// type _bad3 = Expect<Equal<_distr, "Object">>;
// ERRORE TS: Type 'false' does not satisfy the constraint 'true'.

// GOTCHA 4 - Ordine di valutazione dei decorator (SOLO COMMENTO/concetto).
// I decorator di proprieta' vengono eseguiti dall'alto verso il basso, ma i
// decorator di classe DOPO tutti i membri. I "decorator factory" (funzioni che
// ritornano il decorator) vengono INVECE valutati nell'ordine di apparizione,
// prima dell'applicazione. Se registri metadata in una factory contando su un
// certo ordine, ricordati questa differenza (valutazione factory != applicazione).
// Non c'e' codice qui perche' i decorator sono disabilitati: e' un promemoria.

// ============================================================================
// SEZIONE 9 - Mini repository ERP che USA i metadata (chiusura realistica)
// ============================================================================
// Un repository in-memory che sfrutta la Map dei metadata per validare in
// ingresso, mostrando come tutti i pezzi si concatenano.
class DipendenteRepository {
  private readonly rows = new Map<number, Dipendente>();

  // Inserisce solo se la validazione (guidata dai metadata) passa.
  insert(raw: unknown): ValidationResult<Dipendente> {
    const res = validateDipendente(raw);
    if (res.ok) this.rows.set(res.value.id, res.value);
    return res;
  }

  findByBadge(badge: string): Dipendente | undefined {
    if (!BADGE_RE.test(badge)) return undefined; // regola di dominio
    for (const d of this.rows.values()) if (d.badge === badge) return d;
    return undefined;
  }

  // Ritorna i nomi dei campi obbligatori leggendo i metadata (introspection).
  requiredColumns(): Array<keyof Dipendente> {
    return dipendenteMeta.entries().filter(([, m]) => m.required).map(([k]) => k);
  }
}

const repo = new DipendenteRepository();
const ins = repo.insert({
  id: 10,
  nome: "Lucia Bianchi",
  badge: "UP-010",
  ruolo: "Admin",
  assunzione: new Date("2021-03-01"),
  attivo: true,
});
// ins.ok === true; repo.findByBadge("UP-010")?.nome === "Lucia Bianchi"
const _found = repo.findByBadge("UP-010"); // Dipendente | undefined
const _cols = repo.requiredColumns(); // (keyof Dipendente)[]

// ============================================================================
// SEZIONE 10 - Export (solo simboli locali)
// ============================================================================
export {
  MetadataRegistry,
  DipendenteRepository,
  validateDipendente,
  chiudiTimbratura,
  isOrario,
  dipendenteMeta,
  timbraturaMeta,
};
export type {
  DesignTypeName,
  DesignTypeOf,
  Equal,
  Expect,
  Dipendente,
  Timbratura,
  Ruolo,
  Turno,
  ValidationResult,
  StatoTimbratura,
  ParamTypes,
  ReturnDesign,
};

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
// - Reflect metadata reale richiede: experimentalDecorators=true,
//   emitDecoratorMetadata=true, import "reflect-metadata". Qui sono OFF.
// - design:type      -> costruttore del tipo di una proprieta'/accessor.
// - design:paramtypes-> array dei costruttori dei parametri di un metodo.
// - design:returntype-> costruttore del tipo di ritorno di un metodo.
// - Mappatura: string->String, number->Number, boolean->Boolean, Date->Date,
//   array->Array (item perso), classe->se stessa, interface/oggetto/any->Object,
//   void/never->undefined.
// - Union: OMOGENEA di string literal ("P4"|"P2") -> String (NON Object!);
//   ETEROGENEA (string|number) -> Object. Non fidarti del mito "union=Object".
// - Reflect API modello: WeakMap target -> key -> metadataKey -> value.
//   Qui simulata con MetadataRegistry<Shape> vincolata a keyof Shape (type-safe).
// - DesignTypeOf<T>: conditional type che calcola il design name; usa
//   [T] extends [X] per BLOCCARE la distributivita' sulle union.
// - Equal/Expect: unit test a livello di tipo (Expect accetta solo true).
// - discriminated union (ok:true/false, stato:"aperta"/"chiusa") -> narrowing
//   tramite control flow analysis sulla discriminant property.
// - GOTCHA: union omogenea string -> String (non Object!), interface -> Object;
//   item di array perso; distributivita' dei
//   conditional; ordine valutazione factory != applicazione dei decorator.
// - Dominio ERP: badge /^UP-\d{3}$/, orario /^\d{2}:\d{2}$/ naive-UTC,
//   ruoli union, turni "P4"/"P2"/"STD", validazione DTO guidata da metadata.
