/**
 * File 064 - ADV Mapped Types
 * Corso TypeScript Advanced - Polyuretech ERP.
 *
 * I mapped type sono uno dei meccanismi piu' potenti del type system: permettono
 * di generare un nuovo type iterando sulle chiavi (keys) di un altro type con la
 * sintassi { [K in keyof T]: ... }. In questo file vediamo: modificatori
 * +/-readonly e +/-?, key remapping con la clause "as", la ricostruzione manuale
 * di Partial/Readonly/Required, e applicazioni reali sulle entita' ERP (Dipendente,
 * Timbratura, Reparto). Tutto compila con tsc --strict (target ES2022).
 */

// ============================================================================
// SEZIONE 0 - Helper di tipo per i "type test" (definiti qui, no librerie)
// ============================================================================

// Equal<A, B> restituisce true SOLO se A e B sono esattamente lo stesso type.
// Trucco classico: due funzioni condizionali identiche sono assegnabili tra loro
// solo se i type coincidono davvero (confronto strutturale profondo, anche readonly).
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect accetta solo il literal true: se un test fallisce, il file NON compila.
type Expect<T extends true> = T;

// NotEqual utile per i test negativi.
type NotEqual<A, B> = Equal<A, B> extends true ? false : true;

// ============================================================================
// SEZIONE 1 - Il dominio ERP: entita' di base (mock, definite qui nel file)
// ============================================================================

// Union dei ruoli applicativi (usata anche altrove nel corso).
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Codice turno: "P4" (4 giorni), "P2" (2 giorni), "STD" (standard).
type Turno = "P4" | "P2" | "STD";

// Entita' Dipendente: e' l'esempio guida di quasi tutto il file.
interface Dipendente {
  id: number;
  nome: string;
  badge: string;   // formato "UP-001"
  ruolo: Ruolo;
  turno: Turno;
  attivo: boolean;
}

// Entita' Timbratura: orari come stringhe naive-UTC "HH:MM".
interface Timbratura {
  id: number;
  dipendenteId: number;
  entrata: string; // "08:00"
  uscita: string;  // "17:00"
}

// Entita' Reparto.
interface Reparto {
  id: number;
  nome: string;
  responsabileId: number;
}

// ============================================================================
// SEZIONE 2 - La sintassi base: { [K in keyof T]: T[K] }
// ============================================================================

// Identity<T> ricopia T chiave per chiave. keyof T e' la union delle sue keys,
// K in keyof T le itera una alla volta, T[K] e' il tipo di quella property
// (indexed access). Il risultato e' strutturalmente identico a T.
type Identity<T> = { [K in keyof T]: T[K] };

type DipCopia = Identity<Dipendente>;
// DipCopia ha esattamente le stesse property di Dipendente.
type _t1 = Expect<Equal<DipCopia, Dipendente>>; // => true

// Possiamo TRASFORMARE il valore mentre mappiamo. Qui rendiamo ogni property
// una funzione getter che ritorna il tipo originale (pattern "lazy record").
type Getters<T> = { [K in keyof T]: () => T[K] };

type DipGetters = Getters<Dipendente>;
// {
//   id: () => number;
//   nome: () => string;
//   badge: () => string;
//   ruolo: () => Ruolo;
//   turno: () => Turno;
//   attivo: () => boolean;
// }
const badgeGetter: DipGetters["badge"] = () => "UP-001";
// badgeGetter e' () => string  =>  ritorna "UP-001"

// Nota: la property "value" di K e' accessibile come T[K]. keyof T include
// number keys e symbol keys, non solo stringhe: i mapped type le preservano tutte.

// ============================================================================
// SEZIONE 3 - Modificatori di property: readonly e ?
// ============================================================================

// I mapped type possono AGGIUNGERE o RIMUOVERE i modificatori readonly e "?".
// Aggiungere: si scrive "readonly" e "?" davanti / dopo la key.
// Rimuovere: si prefissa con "-" (es. "-readonly", "-?").

// 3a) Readonly manuale: aggiunge readonly a ogni property.
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };

type DipRO = MyReadonly<Dipendente>;
type _t2 = Expect<Equal<DipRO, Readonly<Dipendente>>>; // => true (uguale al built-in)

// const dip: DipRO = { id: 1, nome: "Anna", badge: "UP-001", ruolo: "Operatore", turno: "STD", attivo: true };
// dip.attivo = false;
// ERRORE TS: Cannot assign to 'attivo' because it is a read-only property.

// 3b) Partial manuale: aggiunge "?" a ogni property (tutte opzionali).
type MyPartial<T> = { [K in keyof T]?: T[K] };

type DipPatch = MyPartial<Dipendente>;
type _t3 = Expect<Equal<DipPatch, Partial<Dipendente>>>; // => true

const patch: DipPatch = { attivo: false }; // OK: tutte le property sono opzionali

// 3c) Required manuale: RIMUOVE "?" con il modificatore "-?".
interface FiltroDipendenti {
  ruolo?: Ruolo;
  turno?: Turno;
  attivo?: boolean;
}
type MyRequired<T> = { [K in keyof T]-?: T[K] };

type FiltroPieno = MyRequired<FiltroDipendenti>;
// { ruolo: Ruolo; turno: Turno; attivo: boolean }  -> niente piu' "?"
type _t4 = Expect<Equal<FiltroPieno, Required<FiltroDipendenti>>>; // => true

// 3d) Mutable manuale: RIMUOVE readonly con "-readonly".
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

type DipMut = Mutable<DipRO>;
type _t5 = Expect<Equal<DipMut, Dipendente>>; // => true (siamo tornati all'originale)

// 3e) Si possono combinare: Deepish "tutto readonly + tutto opzionale".
type ReadonlyPartial<T> = { readonly [K in keyof T]?: T[K] };
type DipConfig = ReadonlyPartial<Dipendente>;
// tutte le property sono readonly E opzionali insieme.

// 3f) Rimozione simultanea di entrambi: dato un type "blindato", lo sblocca.
type Concrete<T> = { -readonly [K in keyof T]-?: T[K] };
type DipConfigSbloccato = Concrete<DipConfig>;
type _t6 = Expect<Equal<DipConfigSbloccato, Dipendente>>; // => true

// ============================================================================
// SEZIONE 4 - Meccanismo interno: homomorphic mapped types
// ============================================================================

// PERCHE' MyReadonly<Dipendente> preserva la struttura esatta? Perche' la forma
// "{ [K in keyof T]: ... }" e' un mapped type HOMOMORPHIC: TS riconosce il pattern
// "keyof T" e mantiene i modificatori originali di T, oltre a distribuire su
// array e tuple. Con "K in (union scritta a mano)" questa magia si perde.

// Esempio: mapped type NON homomorphic (chiavi esplicite). Perde readonly/? di T.
type SoloAlcune = { [K in "id" | "badge"]: string };
// { id: string; badge: string }  -> costruito da zero, nessun legame con T.

// Su array/tuple, homomorphic significa che readonly si applica agli elementi:
type ROArray = MyReadonly<number[]>;
// number[] mappato -> readonly number[]  (il caso array e' gestito specialmente)
const arr: ROArray = [1, 2, 3];
// arr.push(4);
// ERRORE TS: Property 'push' does not exist on type 'readonly number[]'.

// Le tuple mantengono la loro forma (length fissa) sotto mapped type homomorphic:
type Coppia = [numero: number, testo: string];
type CoppiaRO = MyReadonly<Coppia>;
// readonly [numero: number, testo: string]  (label ed elementi preservati)

// ============================================================================
// SEZIONE 5 - Key remapping con "as" (TS 4.1+)
// ============================================================================

// La clause "as" rinomina la key di destinazione: { [K in keyof T as NuovaKey]: ... }.
// NuovaKey deve essere assegnabile a string | number | symbol.

// 5a) Prefissare le key: da "badge" a "dipBadge" ecc. Usiamo i template literal type.
type Prefissa<T, P extends string> = {
  [K in keyof T as `${P}${Capitalize<string & K>}`]: T[K];
};
type DipPrefix = Prefissa<Dipendente, "dip">;
// {
//   dipId: number;
//   dipNome: string;
//   dipBadge: string;
//   dipRuolo: Ruolo;
//   dipTurno: Turno;
//   dipAttivo: boolean;
// }
// Nota: "string & K" serve perche' keyof puo' includere number/symbol e
// Capitalize richiede string; l'intersezione filtra al ramo string.

// 5b) Generare getter tipizzati con nomi "getX" (pattern DTO/ORM molto comune).
type GetterNames<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
type DipAccessors = GetterNames<Dipendente>;
// { getId: () => number; getNome: () => string; getBadge: () => string; ... }
const accessors: Pick<DipAccessors, "getBadge"> = { getBadge: () => "UP-042" };
// accessors.getBadge()  => string

// 5c) FILTRARE le key: se "as" produce "never", quella property viene ELIMINATA.
// Qui teniamo solo le property di tipo string.
type SoloString<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};
type DipStringOnly = SoloString<Dipendente>;
// { nome: string; badge: string; ruolo: Ruolo; turno: Turno }
// (id e attivo scompaiono: number e boolean non estendono string;
//  Ruolo e Turno sono union di string literal quindi restano)
type _t7 = Expect<Equal<keyof DipStringOnly, "nome" | "badge" | "ruolo" | "turno">>; // => true

// 5d) Rimuovere una key specifica (Omit "fatto a mano" con as).
type SenzaKey<T, X extends keyof T> = {
  [K in keyof T as K extends X ? never : K]: T[K];
};
type DipSenzaId = SenzaKey<Dipendente, "id">;
type _t8 = Expect<Equal<DipSenzaId, Omit<Dipendente, "id">>>; // => true

// ============================================================================
// SEZIONE 6 - keyof, indexed access e mapped type insieme
// ============================================================================

// 6a) Estrarre le key i cui valori sono di un certo tipo (pattern "select by type").
type KeysDiTipo<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];
// Come funziona: mappiamo ogni property a K oppure never, poi con [keyof T]
// facciamo l'"indexed access lookup" su tutte le key -> otteniamo la union
// dei valori, cioe' la union delle key che passano il filtro.
type ChiaviBooleane = KeysDiTipo<Dipendente, boolean>;
// "attivo"
type ChiaviNumeriche = KeysDiTipo<Dipendente, number>;
// "id"
type _t9 = Expect<Equal<ChiaviBooleane, "attivo">>; // => true

// 6b) PickByValue: costruisce un type con SOLO le property di un dato tipo.
type PickByValue<T, V> = Pick<T, KeysDiTipo<T, V>>;
type SoloStringhe2 = PickByValue<Dipendente, string>;
// { nome: string; badge: string; ruolo: Ruolo; turno: Turno }
type _t10 = Expect<Equal<keyof SoloStringhe2, "nome" | "badge" | "ruolo" | "turno">>; // => true

// ============================================================================
// SEZIONE 7 - ESEMPIO ERP 1: Repository generico via mapped type
// ============================================================================

// Da un'entita' generiamo l'interfaccia di un repository CRUD. Ogni entita'
// deve avere una key "id". Usiamo mapped type + key remapping per i metodi.
interface HaId {
  id: number;
}

// EntityMethods genera i nomi metodo a partire dal nome entita'.
// Qui NON mappiamo su keyof di un'entita' ma costruiamo un type "a mano":
// utile per vedere che i mapped type lavorano su qualsiasi union di key.
type Repository<T extends HaId> = {
  readonly findById: (id: T["id"]) => T | undefined;
  readonly findAll: () => readonly T[];
  readonly create: (data: Omit<T, "id">) => T;
  readonly update: (id: T["id"], patch: Partial<Omit<T, "id">>) => T;
  readonly remove: (id: T["id"]) => boolean;
};

// Implementazione mock del repository dipendenti (in-memory).
function creaRepositoryDipendenti(): Repository<Dipendente> {
  const store = new Map<number, Dipendente>();
  let seq = 0;
  return {
    findById: (id) => store.get(id),
    findAll: () => Array.from(store.values()),
    create: (data) => {
      // data e' Omit<Dipendente,"id"> quindi NON contiene id: lo generiamo noi.
      const nuovo: Dipendente = { id: ++seq, ...data };
      store.set(nuovo.id, nuovo);
      return nuovo;
    },
    update: (id, patch) => {
      const esistente = store.get(id);
      if (!esistente) throw new Error("Dipendente non trovato");
      const aggiornato: Dipendente = { ...esistente, ...patch };
      store.set(id, aggiornato);
      return aggiornato;
    },
    remove: (id) => store.delete(id),
  };
}

const repoDip = creaRepositoryDipendenti();
const creato = repoDip.create({
  nome: "Marco",
  badge: "UP-007",
  ruolo: "Operatore",
  turno: "P4",
  attivo: true,
});
// creato: Dipendente  =>  { id: 1, nome: "Marco", badge: "UP-007", ... }

// repoDip.create({ id: 99, nome: "X", badge: "UP-001", ruolo: "Admin", turno: "STD", attivo: true });
// ERRORE TS: Object literal may only specify known properties, and 'id' does not
// exist in type 'Omit<Dipendente, "id">'.  (id e' generato dal repository)

// ============================================================================
// SEZIONE 8 - ESEMPIO ERP 2: DTO e "patch" con mapped type combinati
// ============================================================================

// Un DTO in ingresso spesso e' "tutto opzionale tranne alcune key obbligatorie".
// Costruiamo un'utility SetOptional / SetRequired componendo mapped type.

// SetOptional<T, K>: rende opzionali SOLO le key in K, lascia intatte le altre.
type SetOptional<T, K extends keyof T> =
  Identity<Omit<T, K> & Partial<Pick<T, K>>>;
// Identity<...> "appiattisce" l'intersezione in un unico oggetto leggibile.

type NuovaTimbraturaDTO = SetOptional<Timbratura, "id" | "uscita">;
// { dipendenteId: number; entrata: string; id?: number; uscita?: string }
const dto: NuovaTimbraturaDTO = { dipendenteId: 3, entrata: "08:00" };
// uscita e id sono opzionali: la timbratura d'entrata non ha ancora l'uscita.

// SetRequired<T, K>: rende obbligatorie SOLO le key in K.
type SetRequired<T, K extends keyof T> =
  Identity<Omit<T, K> & Required<Pick<T, K>>>;

interface RepartoDraft {
  id?: number;
  nome?: string;
  responsabileId?: number;
}
type RepartoSalvabile = SetRequired<RepartoDraft, "nome">;
// { id?: number; responsabileId?: number; nome: string }  -> nome ora obbligatorio.
// const r: RepartoSalvabile = { responsabileId: 1 };
// ERRORE TS: Property 'nome' is missing in type ... (nome e' diventato required)

// ============================================================================
// SEZIONE 9 - ESEMPIO ERP 3: validatori derivati dalle entita'
// ============================================================================

// Un pattern potente: da un'entita' derivare la "forma" di un oggetto di
// validatori, una funzione per property che dice se il valore e' valido.
type Validatori<T> = {
  [K in keyof T]: (valore: T[K]) => boolean;
};

// Regex del dominio ERP.
const RE_ORARIO = /^\d{2}:\d{2}$/;   // "HH:MM"
const RE_BADGE = /^UP-\d{3}$/;       // "UP-001"

// Validatori per la Timbratura: ogni funzione riceve il tipo esatto della property.
const validatoriTimbratura: Validatori<Timbratura> = {
  id: (v) => Number.isInteger(v) && v > 0,          // v: number
  dipendenteId: (v) => Number.isInteger(v) && v > 0, // v: number
  entrata: (v) => RE_ORARIO.test(v),                 // v: string
  uscita: (v) => RE_ORARIO.test(v),                  // v: string
};

// Validatori per il Dipendente (mostra il narrowing sui literal union).
const validatoriDipendente: Validatori<Dipendente> = {
  id: (v) => v > 0,
  nome: (v) => v.trim().length > 0,
  badge: (v) => RE_BADGE.test(v),
  ruolo: (v) => v === "SuperAdmin" || v === "Admin" || v === "Operatore" || v === "QrDisplay",
  turno: (v) => v === "P4" || v === "P2" || v === "STD",
  attivo: (v) => typeof v === "boolean",
};

// Runner generico: applica ogni validatore alla property corrispondente.
function valida<T>(entita: T, regole: Validatori<T>): boolean {
  // (Object.keys perde il tipo delle key: e' un limite noto dell'API JS,
  //  quindi facciamo un cast controllato a (keyof T)[].)
  return (Object.keys(regole) as (keyof T)[]).every((k) => regole[k](entita[k]));
}

const okTimb = valida({ id: 1, dipendenteId: 2, entrata: "08:00", uscita: "17:00" }, validatoriTimbratura);
// okTimb: boolean  =>  true
const okDip = valida(creato, validatoriDipendente);
// okDip: boolean  =>  true

// ============================================================================
// SEZIONE 10 - ESEMPIO ERP 4: eventi da una state machine (mapped + as)
// ============================================================================

// Stato di una macchina di reparto e transizioni. Vogliamo, da una mappa
// stato->stati-raggiungibili, generare il type degli event handler "onEnterX".
type StatoMacchina = "ferma" | "avvio" | "produzione" | "manutenzione";

// Da ogni stato generiamo un handler "onEnter<Stato>": key remapping + Capitalize.
type MacchinaHandlers = {
  [S in StatoMacchina as `onEnter${Capitalize<S>}`]: (precedente: StatoMacchina) => void;
};
// {
//   onEnterFerma: (precedente: StatoMacchina) => void;
//   onEnterAvvio: (precedente: StatoMacchina) => void;
//   onEnterProduzione: (precedente: StatoMacchina) => void;
//   onEnterManutenzione: (precedente: StatoMacchina) => void;
// }
const handlers: Pick<MacchinaHandlers, "onEnterProduzione"> = {
  onEnterProduzione: (prec) => {
    // prec: StatoMacchina  -> possiamo fare narrowing sugli stati.
    if (prec === "manutenzione") {
      // ...log ripartenza dopo manutenzione...
    }
  },
};
void handlers;

// ============================================================================
// SEZIONE 11 - Pattern type-level: DeepReadonly ricorsivo
// ============================================================================

// I mapped type possono ricorsere per "affondare" nei type annidati.
// DeepReadonly rende readonly tutto, a ogni livello. Le funzioni restano intatte.
type Primitivo = string | number | boolean | bigint | symbol | null | undefined;

type DeepReadonly<T> =
  T extends Primitivo
    ? T
    : T extends (...args: never[]) => unknown
      ? T // le funzioni non si "readonlyzzano"
      : T extends ReadonlyArray<infer U>
        ? ReadonlyArray<DeepReadonly<U>>
        : { readonly [K in keyof T]: DeepReadonly<T[K]> };

interface Organizzazione {
  reparto: Reparto;
  dipendenti: Dipendente[];
  meta: { creatoDa: string; versione: number };
}
type OrgBloccata = DeepReadonly<Organizzazione>;
// const o: OrgBloccata = ...;
// o.meta.versione = 2;
// ERRORE TS: Cannot assign to 'versione' because it is a read-only property.
// o.dipendenti.push(creato);
// ERRORE TS: Property 'push' does not exist on type 'readonly Dipendente[]'.

// ============================================================================
// SEZIONE 12 - Pattern type-level: rename via mappa (Record di rinomina)
// ============================================================================

// RenameKeys<T, M>: rinomina le key di T secondo una mappa M (key vecchia -> nuova).
// Le key non presenti in M restano invariate. Usa "as" con lookup condizionale.
type RenameKeys<T, M extends Partial<Record<keyof T, string>>> = {
  [K in keyof T as K extends keyof M
    ? M[K] extends string
      ? M[K]
      : K
    : K]: T[K];
};

type DipApi = RenameKeys<Dipendente, { badge: "codiceBadge"; attivo: "isActive" }>;
// {
//   id: number;
//   nome: string;
//   codiceBadge: string;   // badge -> codiceBadge
//   ruolo: Ruolo;
//   turno: Turno;
//   isActive: boolean;     // attivo -> isActive
// }
type _t11 = Expect<Equal<DipApi["codiceBadge"], string>>; // => true
type _t12 = Expect<Equal<DipApi["isActive"], boolean>>;   // => true

// ============================================================================
// SEZIONE 13 - GOTCHA / PITFALLS (trappole comuni e soluzioni)
// ============================================================================

// GOTCHA 1: perdere i modificatori usando una union scritta a mano.
// Se scrivi le key esplicitamente invece di "keyof T", il mapped type NON e'
// homomorphic e i modificatori readonly/? di T NON vengono preservati.
interface ConOpzionali {
  readonly id: number;
  nota?: string;
}
type SbagliatoCopia = { [K in "id" | "nota"]: ConOpzionali[K] };
// { id: number; nota: string | undefined }  -> ha PERSO readonly e "?".
type GiustoCopia = { [K in keyof ConOpzionali]: ConOpzionali[K] };
// { readonly id: number; nota?: string }  -> preserva tutto.
type _t13 = Expect<NotEqual<SbagliatoCopia, GiustoCopia>>; // => true (sono diversi)

// GOTCHA 2: "as never" elimina la property, ma se TUTTE diventano never
// ottieni {} (oggetto vuoto), non un errore. Attento ai filtri troppo aggressivi.
type SoloFunzioni<T> = {
  [K in keyof T as T[K] extends (...a: never[]) => unknown ? K : never]: T[K];
};
type NienteFunzioni = SoloFunzioni<Dipendente>;
// {}  -> Dipendente non ha property funzione: risultato vuoto, non un errore.
type _t14 = Expect<Equal<NienteFunzioni, {}>>; // => true

// GOTCHA 3: mappare su un type UNION distribuisce (spesso NON e' cio' che vuoi).
// { [K in keyof T]: ... } applicato a "A | B" opera su keyof (A|B), cioe' SOLO
// le key COMUNI. Per operare su ciascun membro serve un conditional distributivo.
type Comune = keyof (Dipendente | Timbratura);
// "id"  -> unica key presente in ENTRAMBE le interfacce.
type _t15 = Expect<Equal<Comune, "id">>; // => true
// Soluzione: distribuire con un conditional type generico su ogni membro.
type ChiaviDiOgnuno<T> = T extends unknown ? keyof T : never;
type TutteLeChiavi = ChiaviDiOgnuno<Dipendente | Timbratura>;
// keyof Dipendente | keyof Timbratura  (unione di tutte le key dei due rami)

// GOTCHA 4: Object.keys/entries non restituiscono (keyof T)[] ma string[].
// I mapped type tipizzano bene le "forme", ma runtime + JS API richiedono un
// cast esplicito e consapevole (vedi funzione "valida" in Sezione 9).
function chiaviTipizzate<T extends object>(o: T): (keyof T)[] {
  return Object.keys(o) as (keyof T)[]; // cast necessario e voluto
}
const ks = chiaviTipizzate(creato);
// ks: (keyof Dipendente)[]  =>  ["id","nome","badge","ruolo","turno","attivo"]
void ks;

// ============================================================================
// SEZIONE 14 - Ricostruzione delle utility standard (per fissare i concetti)
// ============================================================================

// Ricostruiamo Record, Pick e Omit con mapped type, per vedere come sono fatte.
type MyRecord<K extends PropertyKey, V> = { [P in K]: V };
type OrariPerTurno = MyRecord<Turno, string>;
// { P4: string; P2: string; STD: string }
type _t16 = Expect<Equal<OrariPerTurno, Record<Turno, string>>>; // => true

type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
type MiniDip = MyPick<Dipendente, "id" | "badge">;
// { id: number; badge: string }
type _t17 = Expect<Equal<MiniDip, Pick<Dipendente, "id" | "badge">>>; // => true

type MyOmit<T, K extends keyof T> = { [P in keyof T as P extends K ? never : P]: T[P] };
type DipSenzaBadge = MyOmit<Dipendente, "badge">;
type _t18 = Expect<Equal<DipSenzaBadge, Omit<Dipendente, "badge">>>; // => true

// ============================================================================
// SEZIONE 15 - Export dei simboli locali (solo simboli definiti qui)
// ============================================================================

export type {
  Dipendente,
  Timbratura,
  Reparto,
  Ruolo,
  Turno,
  MyReadonly,
  MyPartial,
  MyRequired,
  Mutable,
  Getters,
  GetterNames,
  KeysDiTipo,
  PickByValue,
  Repository,
  Validatori,
  SetOptional,
  SetRequired,
  DeepReadonly,
  RenameKeys,
  Equal,
  Expect,
};

export {
  creaRepositoryDipendenti,
  valida,
  validatoriDipendente,
  validatoriTimbratura,
  chiaviTipizzate,
  RE_ORARIO,
  RE_BADGE,
};

/*
============================================================================
RIEPILOGO COMANDI / CONCETTI
============================================================================
- Sintassi base mapped type: { [K in keyof T]: T[K] } (itera le key di T).
- keyof T = union delle key; T[K] = indexed access (tipo della property).
- Trasformare i valori: { [K in keyof T]: () => T[K] } (getter, wrapper, ecc.).
- Modificatori AGGIUNTI: "readonly [K in keyof T]" e "[K in keyof T]?".
- Modificatori RIMOSSI: "-readonly [K in keyof T]" e "[K in keyof T]-?".
- Combinabili: "readonly [K in keyof T]?" oppure "-readonly [K in keyof T]-?".
- Homomorphic (keyof T): preserva readonly/?, distribuisce su array/tuple.
- Con union esplicita di key: NON homomorphic -> perde i modificatori.
- Key remapping: { [K in keyof T as NuovaKey]: ... } (rinomina la key).
- "as `${...}`": template literal type + Capitalize/Uppercase per nomi metodo.
- "as (... ? K : never)": filtra/elimina property (never = property rimossa).
- Se tutte diventano never -> risultato {} (non un errore).
- Pattern "select by value": { [K in keyof T]: T[K] extends V ? K : never }[keyof T].
- Ricostruzioni: Partial, Required, Readonly, Mutable, Record, Pick, Omit.
- Utility composte: SetOptional, SetRequired, RenameKeys, DeepReadonly (ricorsivo).
- Type test: Equal<A,B> + Expect<true> (fallisce la compilazione se A != B).
- Union mapping distribuisce su keyof (solo key comuni); per membro serve
  un conditional distributivo: T extends unknown ? ... : never.
- Object.keys resta string[]: serve cast esplicito a (keyof T)[].
- Esempi ERP: Repository<T>, Validatori<T>, DTO (SetOptional su Timbratura),
  handlers state machine (onEnter<Stato>), DipApi (RenameKeys).
============================================================================
*/
