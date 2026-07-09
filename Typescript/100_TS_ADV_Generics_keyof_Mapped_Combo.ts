/**
 * File 100 - ADV Generics + keyof + mapped combinati
 *
 * Combinare generics, keyof, mapped types e conditional types per costruire
 * trasformazioni di tipo riutilizzabili: rinominare chiavi (key remapping),
 * pick per tipo del valore, DTO builder avanzato e Getters<T> in stile ERP.
 * Focus sui meccanismi interni: distributivita', inferenza con infer,
 * key remapping via clausola "as", ricorsione dei mapped types.
 */

// ============================================================================
// SEZIONE 0 - Helper di test a livello di tipo (Equal / Expect)
// ============================================================================

// Equal<X, Y> confronta due tipi in modo esatto usando il trucco delle due
// funzioni generiche: TS considera uguali due condizionali solo se X e Y sono
// assegnabili in modo *identico*, quindi distingue anche any da unknown.
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
    ? true
    : false;

// Expect<T> compila solo se T e' esattamente true: usato per "asserzioni" di tipo.
type Expect<T extends true> = T;

// Helper 'MutualAssign': A e B sono MUTUAMENTE assegnabili (A<:B e B<:A).
// E' piu' permissivo di Equal (che e' invariante e coglie differenze strutturali
// come i branded type): utile quando due tipi sono equivalenti "all'uso" ma non
// identici bit-a-bit. [X] extends [Y] evita la distributivita' sulle union.
type MutualAssign<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// Esempio di uso: se l'uguaglianza fosse falsa, il file NON compilerebbe.
type _t0 = Expect<Equal<string, string>>; // ok
// type _tErr = Expect<Equal<string, number>>;
// ERRORE TS: Type 'false' does not satisfy the constraint 'true'.

// ============================================================================
// SEZIONE 1 - Modello di dominio ERP Polyuretech
// ============================================================================

// Tipi letterali del dominio: ruoli, turni, formati orario/badge.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

// Nota: i pattern regex /^\d{2}:\d{2}$/ e /^UP-\d{3}$/ sono validati a runtime;
// a livello di tipo usiamo template literal types come approssimazione.
type OrarioHHMM = `${number}:${number}`; // es: "08:30"
type Badge = `UP-${number}`; // es: "UP-001"

// Entita' principale: Dipendente.
interface Dipendente {
  id: number;
  nome: string;
  badge: Badge;
  ruolo: Ruolo;
  attivo: boolean;
  turno: Turno;
}

// Timbratura con orari naive-UTC in formato "HH:MM".
interface Timbratura {
  id: number;
  dipendenteId: number;
  entrata: OrarioHHMM;
  uscita: OrarioHHMM | null;
  reparto: string;
}

// ============================================================================
// SEZIONE 2 - Ripasso lampo: keyof + indexed access + mapped di base
// ============================================================================

// keyof estrae l'unione delle chiavi di un tipo oggetto.
type ChiaviDipendente = keyof Dipendente;
// tipo: "id" | "nome" | "badge" | "ruolo" | "attivo" | "turno"

// Indexed access: T[K] estrae il tipo del valore alla chiave K.
type TipoRuolo = Dipendente["ruolo"]; // tipo: Ruolo
type TipoIdONome = Dipendente["id" | "nome"]; // tipo: string | number

// Mapped type basilare: itera su ogni chiave e mantiene il valore.
// Il perche': [K in keyof T] genera una property per ciascuna chiave di T.
type Clone<T> = { [K in keyof T]: T[K] };
type DipClone = Clone<Dipendente>; // strutturalmente identico a Dipendente

// Mapped con modificatori: -? rende tutte le property required, -readonly le rende mutabili.
type Concreto<T> = { -readonly [K in keyof T]-?: T[K] };

// ============================================================================
// SEZIONE 3 - Distributivita' dei conditional types (il "perche'")
// ============================================================================

// Un conditional type "naked" (T come parametro nudo a sinistra di extends)
// distribuisce sulle unioni: applica il ramo a OGNI membro e ne fa l'unione.
type SoloStringhe<T> = T extends string ? T : never;
type D1 = SoloStringhe<"a" | 42 | "b" | true>; // tipo: "a" | "b"
// Meccanismo: SoloStringhe distribuisce -> ("a"?)|(42?)|("b"?)|(true?) = "a"|never|"b"|never.

// Per DISABILITARE la distributivita' si avvolge in tuple [T] extends [U].
type NonDistrib<T> = [T] extends [string] ? "si" : "no";
type D2 = NonDistrib<"a" | 42>; // tipo: "no" (perche' l'unione intera non e' string)
type D3 = SoloStringhe<"a" | 42>; // tipo: "a" (distribuito)

// ============================================================================
// SEZIONE 4 - Pick per tipo del VALORE (non per nome della chiave)
// ============================================================================

// Obiettivo: estrarre solo le chiavi il cui valore e' assegnabile a V.
// Passo 1: mappare ogni chiave o al suo nome (K) o a never, poi indicizzare
// con [keyof T] per collassare l'unione ("never" sparisce dalle unioni).
type KeysByValue<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never;
}[keyof T];

// Esempio: quali chiavi di Dipendente sono string?
type ChiaviStringa = KeysByValue<Dipendente, string>;
// tipo: "nome" | "badge" | "ruolo" | "turno"
// Nota: badge, ruolo e turno sono sottotipi di string (template/letterali) quindi passano.

type _t1 = Expect<Equal<ChiaviStringa, "nome" | "badge" | "ruolo" | "turno">>;

// Passo 2: Pick per valore = Pick standard ristretto alle chiavi selezionate.
type PickByValue<T, V> = Pick<T, KeysByValue<T, V>>;

type SoloBooleani = PickByValue<Dipendente, boolean>;
// tipo: { attivo: boolean }

// Il complementare: rimuovere le chiavi con valore V.
type OmitByValue<T, V> = Omit<T, KeysByValue<T, V>>;
type SenzaBooleani = OmitByValue<Dipendente, boolean>;
// tipo: { id; nome; badge; ruolo; turno } (attivo escluso)

// GOTCHA valore: usare 'unknown' come V matcha TUTTO (tutto extends unknown);
// usare 'never' come V matcha SOLO property di tipo never.
type TutteLeChiavi = KeysByValue<Dipendente, unknown>; // tipo: keyof Dipendente

// ============================================================================
// SEZIONE 5 - Key remapping: rinominare le chiavi con "as"
// ============================================================================

// La clausola "as" in un mapped type rimappa il NOME della chiave prodotta.
// Combinata con template literal types permette prefissi/suffissi/camelCase.

// 5a - Prefisso costante su tutte le chiavi.
type Prefixed<T, P extends string> = {
  [K in keyof T as `${P}${string & K}`]: T[K];
};
type DipPrefissato = Prefixed<Dipendente, "dip_">;
// tipo: { dip_id: number; dip_nome: string; dip_badge: Badge; ... }

// 5b - Getters<T>: trasforma "nome" -> "getNome" con valore () => T[K].
// Capitalize<...> e' un intrinsic string type di TS (ES2022 lib non serve, e' built-in).
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
type DipGetters = Getters<Dipendente>;
// tipo: {
//   getId: () => number;
//   getNome: () => string;
//   getBadge: () => Badge;
//   getRuolo: () => Ruolo;
//   getAttivo: () => boolean;
//   getTurno: () => Turno;
// }

// Verifica a livello di tipo che getBadge abbia il tipo di ritorno giusto.
type _t2 = Expect<Equal<ReturnType<DipGetters["getBadge"]>, Badge>>;

// 5c - Setters<T> complementare: "nome" -> "setNome(v: string): void".
type Setters<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (valore: T[K]) => void;
};

// 5d - Filtrare via chiavi durante il remap: "as never" scarta la property.
// Qui teniamo solo le chiavi il cui valore e' string, rinominandole comunque.
type OnlyStringGetters<T> = {
  [K in keyof T as T[K] extends string ? `get${Capitalize<string & K>}` : never]: () => T[K];
};
type DipStringGetters = OnlyStringGetters<Dipendente>;
// tipo: { getNome: () => string; getBadge: () => Badge; getRuolo: () => Ruolo; getTurno: () => Turno }
// Meccanismo: quando "as" risolve a never, quella property viene rimossa del tutto.

// 5e - Rimuovere un prefisso con infer (unwrap del nome).
// RemovePrefix rinomina "dip_id" -> "id" usando template literal + infer Rest.
type RemovePrefix<T, P extends string> = {
  [K in keyof T as K extends `${P}${infer Rest}` ? Rest : K]: T[K];
};
type DipRipulito = RemovePrefix<DipPrefissato, "dip_">;
// tipo: identico a Dipendente (chiavi senza prefisso)
type _t3 = Expect<Equal<keyof DipRipulito, keyof Dipendente>>;

// ============================================================================
// SEZIONE 6 - Combinare tutto: DTO builder avanzato
// ============================================================================

// Un DTO builder che, dato un tipo entita', permette di:
//  - scegliere quali chiavi esporre,
//  - rendere alcune opzionali,
//  - rinominare via mappa chiave->chiave.
// Mostriamo i pezzi type-level e poi li componiamo.

// 6a - PartialBy<T, K>: rende opzionali SOLO le chiavi in K, resto invariato.
// Meccanismo: intersezione tra (Omit delle chiavi K) e (Partial del Pick di K).
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type DipDraft = PartialBy<Dipendente, "id" | "attivo">;
// tipo: { nome; badge; ruolo; turno; id?; attivo? }

// 6b - RequiredBy<T, K>: rende required SOLO le chiavi in K.
type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// 6c - RenameKeys<T, M> dove M mappa nome-vecchio -> nome-nuovo.
// M e' un tipo tipo { badge: "codiceBadge" }. Per ogni K: se K e' in M usiamo M[K].
type RenameKeys<T, M extends Partial<Record<keyof T, string>>> = {
  [K in keyof T as K extends keyof M
    ? M[K] extends string
      ? M[K]
      : K
    : K]: T[K];
};
type DipApi = RenameKeys<Dipendente, { badge: "codiceBadge"; nome: "fullName" }>;
// tipo: { id; fullName: string; codiceBadge: Badge; ruolo; attivo; turno }
type _t4 = Expect<Equal<DipApi["codiceBadge"], Badge>>;

// 6d - DTO builder composto: rinomina + rende opzionali id, applicato a Dipendente.
type DipCreateDTO = PartialBy<
  RenameKeys<Dipendente, { nome: "fullName" }>,
  "id"
>;
// tipo: { fullName: string; badge; ruolo; attivo; turno; id? }

// Costruzione di un valore concreto conforme al DTO (verifica pratica).
const nuovoDip: DipCreateDTO = {
  fullName: "Mario Rossi",
  badge: "UP-042",
  ruolo: "Operatore",
  attivo: true,
  turno: "P4",
  // id omesso: e' opzionale
};

// ============================================================================
// SEZIONE 7 - Getters/Setters concreti su un repository ERP
// ============================================================================

// Implementiamo un wrapper che, dato un Dipendente, genera getX() e setX().
// La firma del wrapper usa i mapped types definiti sopra: type-safe end to end.
type Accessors<T> = Getters<T> & Setters<T>;

function makeAccessors<T extends object>(source: T): Accessors<T> {
  const out: Record<string, unknown> = {};
  // Object.keys perde il tipo letterale: castiamo a (keyof T)[] consapevolmente.
  for (const key of Object.keys(source) as (keyof T)[]) {
    const cap = (key as string).charAt(0).toUpperCase() + (key as string).slice(1);
    out[`get${cap}`] = () => source[key];
    out[`set${cap}`] = (v: unknown) => {
      source[key] = v as T[typeof key];
    };
  }
  // Il valore runtime e' costruito dinamicamente: assicuriamo il tipo con un cast.
  return out as Accessors<T>;
}

const dip: Dipendente = {
  id: 1,
  nome: "Luca Bianchi",
  badge: "UP-001",
  ruolo: "Admin",
  attivo: true,
  turno: "STD",
};

const acc = makeAccessors(dip);
const nomeCorrente = acc.getNome(); // tipo: string => "Luca Bianchi"
acc.setTurno("P2"); // ok: accetta solo Turno
// acc.setTurno("XX");
// ERRORE TS: Argument of type '"XX"' is not assignable to parameter of type 'Turno'.
// const _bad = acc.getInesistente();
// ERRORE TS: Property 'getInesistente' does not exist on type Accessors<Dipendente>.

// ============================================================================
// SEZIONE 8 - Repository generico ERP con selezione per tipo valore
// ============================================================================

// Un repository che indicizza per una chiave "chiave-numerica" scelta dall'utente,
// vincolata a essere una chiave il cui valore e' number (via KeysByValue).
type NumericKey<T> = KeysByValue<T, number>;

class RepositoryById<T, K extends NumericKey<T>> {
  private store = new Map<number, T>();

  constructor(private readonly keyField: K) {}

  add(entity: T): void {
    // entity[keyField] e' garantito number dal vincolo K extends NumericKey<T>.
    const id = entity[this.keyField] as number;
    this.store.set(id, entity);
  }

  get(id: number): T | undefined {
    return this.store.get(id);
  }
}

const repoDip = new RepositoryById<Dipendente, "id">("id");
repoDip.add(dip);
const trovato = repoDip.get(1); // tipo: Dipendente | undefined
// const repoBad = new RepositoryById<Dipendente, "nome">("nome");
// ERRORE TS: "nome" non e' NumericKey<Dipendente> (nome e' string), vincolo violato.

// ============================================================================
// SEZIONE 9 - Esempio ERP: DTO di risposta timbrature (rename + pick)
// ============================================================================

// Vogliamo esporre solo entrata/uscita di una Timbratura, rinominate per la API.
type TimbraturaPublic = RenameKeys<
  Pick<Timbratura, "entrata" | "uscita">,
  { entrata: "checkIn"; uscita: "checkOut" }
>;
// tipo: { checkIn: OrarioHHMM; checkOut: OrarioHHMM | null }

const risposta: TimbraturaPublic = {
  checkIn: "08:00",
  checkOut: "17:30",
};
void risposta;

// Getters ridotti solo alle chiavi orario (string): utile per formattazione UI.
type TimbraturaOrarioGetters = OnlyStringGetters<Timbratura>;
// tipo: { getEntrata: () => OrarioHHMM } (uscita e' OrarioHHMM|null, non pura string -> esclusa)

// ============================================================================
// SEZIONE 10 - DeepReadonly ricorsivo (ricorsione dei mapped types)
// ============================================================================

// Ricorsione: il mapped type richiama se stesso sul tipo del valore.
// Il perche' della guardia: applichiamo DeepReadonly solo su object, non su primitivi
// (altrimenti string diventerebbe un mapped su indici, indesiderato).
type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

interface StatoTurno {
  turno: Turno;
  membri: Dipendente[];
  meta: { creatoDa: Ruolo };
}

type StatoTurnoRO = DeepReadonly<StatoTurno>;
// tipo: tutto readonly in profondita', membri e' ReadonlyArray<readonly Dipendente>.

const stato: StatoTurnoRO = {
  turno: "P4",
  membri: [dip],
  meta: { creatoDa: "SuperAdmin" },
};
// stato.turno = "P2";
// ERRORE TS: Cannot assign to 'turno' because it is a read-only property.
// stato.meta.creatoDa = "Admin";
// ERRORE TS: Cannot assign to 'creatoDa' because it is a read-only property (nested!).
void stato;

// ============================================================================
// SEZIONE 11 - GOTCHA / PITFALLS
// ============================================================================

// GOTCHA 1 - Chiavi non-string nel remap richiedono string & K.
// keyof T puo' includere number | symbol; i template literal accettano solo
// string-like. Senza "string & K" la Capitalize/template fallisce.
// type Rotto<T> = { [K in keyof T as `get${Capitalize<K>}`]: T[K] };
// ERRORE TS: Type 'K' does not satisfy the constraint 'string'.
// Soluzione: usare `get${Capitalize<string & K>}` come nelle sezioni sopra.

// GOTCHA 2 - Dimenticare -? in KeysByValue fa passare 'undefined' dalle opzionali.
// Se T ha property opzionali, il loro tipo include undefined; senza rimuovere la
// modalita' opzionale con -? la property mappata puo' diventare never inatteso.
interface ConOpz {
  nome: string;
  note?: string; // tipo effettivo: string | undefined
}
type ChiaviStrOpz = KeysByValue<ConOpz, string>;
// GOTCHA: il tipo reale e' SOLO "nome". Con "note?: string" il tipo del valore
// e' "string | undefined", e "string | undefined extends string" e' FALSE:
// quindi "note" NON viene selezionato (il -? rende la property required ma NON
// rimuove undefined dal TIPO del valore).
type _t5 = Expect<Equal<ChiaviStrOpz, "nome">>;

// Per includere anche le property opzionali va rimosso undefined dal valore con
// NonNullable prima del confronto:
type KeysByValueOpt<T, V> = {
  [K in keyof T]-?: NonNullable<T[K]> extends V ? K : never;
}[keyof T];
type ChiaviStrOpz2 = KeysByValueOpt<ConOpz, string>;
type _t5b = Expect<Equal<ChiaviStrOpz2, "nome" | "note">>; // ora "note" rientra

// GOTCHA 3 - Distributivita' non voluta su KeysByValue con V unione.
// Se V e' un'unione (es: string | number) il match extends e' comunque corretto,
// ma attenzione: T[K] extends (string|number) e' vero anche per number letterale.
type ChiaviStrONum = KeysByValue<Dipendente, string | number>;
// tipo: "id" | "nome" | "badge" | "ruolo" | "turno" (attivo boolean escluso)
// Nota: turno passa perche' Turno e' sottotipo di string.

// GOTCHA 4 - RenameKeys con collisione di nomi: due chiavi rimappate sullo stesso
// nome si fondono e i valori vengono intersecati (spesso non desiderato).
// type Collisione = RenameKeys<Dipendente, { id: "x"; nome: "x" }>;
// -> { x: number & string; ... } = { x: never; ... }. Evitare mappe non iniettive.

// ============================================================================
// SEZIONE 12 - Type-level test finali (asserzioni di correttezza)
// ============================================================================

type _check1 = Expect<Equal<KeysByValue<Dipendente, boolean>, "attivo">>;
type _check2 = Expect<Equal<keyof DipGetters, "getId" | "getNome" | "getBadge" | "getRuolo" | "getAttivo" | "getTurno">>;
type _check3 = Expect<Equal<DipCreateDTO["fullName"], string>>;
type _check4 = Expect<Equal<TimbraturaPublic["checkOut"], OrarioHHMM | null>>;

// I tipi _tN e _checkN esistono solo a compile-time: nessun costo a runtime.

// ============================================================================
// SEZIONE 13 - Export locali (solo simboli definiti in questo file)
// ============================================================================

export type {
  Dipendente,
  Timbratura,
  Ruolo,
  Turno,
  KeysByValue,
  PickByValue,
  OmitByValue,
  Getters,
  Setters,
  Accessors,
  Prefixed,
  RemovePrefix,
  RenameKeys,
  PartialBy,
  RequiredBy,
  DeepReadonly,
  DipCreateDTO,
  TimbraturaPublic,
  Equal,
  Expect,
};

export { makeAccessors, RepositoryById };

/*
 * ============================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================================
 * - keyof T                -> unione delle chiavi di T
 * - T[K] (indexed access)  -> tipo del valore alla chiave K
 * - { [K in keyof T]: ... } -> mapped type, itera sulle chiavi
 * - modificatori -? / -readonly -> rimuovono optional / readonly
 * - conditional naked T extends U ? .. : .. -> DISTRIBUISCE sulle unioni
 * - [T] extends [U]        -> disabilita la distributivita'
 * - KeysByValue<T,V>       -> chiavi di T il cui valore e' assegnabile a V
 * - PickByValue / OmitByValue -> pick/omit per tipo del valore
 * - as nella mapped        -> KEY REMAPPING (rinominare chiavi)
 * - as never nella mapped  -> scarta la property (filtro)
 * - Capitalize / Uncapitalize / Uppercase / Lowercase -> intrinsic string types
 * - template literal `${P}${string & K}` -> prefissi/suffissi sulle chiavi
 * - infer Rest in template -> estrae parte del nome (RemovePrefix)
 * - Getters<T> / Setters<T> / Accessors<T> -> generatori type-safe di metodi
 * - PartialBy / RequiredBy -> optional/required selettivo su chiavi K
 * - RenameKeys<T,M>        -> rinomina via mappa; attenzione a mappe non iniettive
 * - DeepReadonly<T>        -> ricorsione dei mapped types con guardia object/array
 * - Equal<X,Y> / Expect<T> -> test a livello di tipo (compile-time asserzioni)
 * - string & K             -> restringe le chiavi a string per i template literal
 * ============================================================================
 */

