/**
 * File 062 - ADV Conditional Types
 * ---------------------------------
 * Argomento: i Conditional Types di TypeScript, ovvero i type che "decidono"
 * in base a una condizione: T extends U ? X : Y. Sono il cuore della type-level
 * programming: permettono di calcolare type a partire da altri type.
 * In questo file: forma base, distributivita' sulle union, condizionali annidati,
 * utility fatte a mano (IsString, If, NonNullable), pattern ERP realistici,
 * GOTCHA comuni e test di tipo con helper Equal/Expect. Tutto ASCII, tutto --strict.
 */

// ============================================================================
// 0. HELPER DI TEST DI TIPO (Equal / Expect)
// ============================================================================
// Questi due type servono a "testare" i type a compile-time: se un type non e'
// quello atteso, il file NON compila. Sono un pattern classico della community.
// Equal usa un trucco: due funzioni generiche sono assegnabili solo se i type
// sono identici (stessa identita' strutturale, non solo assegnabili).

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect accetta solo il literal `true`: passargli `false` e' un errore di tipo.
type Expect<T extends true> = T;

// Esempio d'uso: questi type-test compilano solo se l'uguaglianza regge.
type _t0 = Expect<Equal<string, string>>; // ok
// type _tBad = Expect<Equal<string, number>>; // ERRORE TS: false non soddisfa `extends true`

// ============================================================================
// 1. FORMA BASE: T extends U ? X : Y
// ============================================================================
// Un conditional type sceglie tra due type (X e Y) in base a "T e' assegnabile
// a U?". Si legge come un ternario, ma opera sui TYPE, non sui valori.

// True se T e' (assegnabile a) string, altrimenti false.
type IsAssignableToString<T> = T extends string ? true : false;

type A1 = IsAssignableToString<string>;        // => true
type A2 = IsAssignableToString<"UP-001">;      // => true (literal e' assegnabile a string)
type A3 = IsAssignableToString<number>;        // => false
type A4 = IsAssignableToString<string | null>; // => vedi sezione distributivita'!

type _t1 = Expect<Equal<A1, true>>;
type _t2 = Expect<Equal<A3, false>>;

// Il "ramo" scelto puo' essere un type qualsiasi, non solo boolean.
// Qui restituiamo un type diverso a seconda dell'input.
type Etichetta<T> = T extends number ? "numerico" : "non-numerico";
type L1 = Etichetta<42>;     // => "numerico"
type L2 = Etichetta<"P4">;   // => "non-numerico"

// ============================================================================
// 2. IsString / IsNumber / IsBoolean: mattoncini riutilizzabili
// ============================================================================
// Attenzione all'ordine: mettiamo prima i casi piu' specifici. `boolean` in TS
// e' internamente `true | false`, cosa che avra' effetti nella distributivita'.

type IsString<T>  = [T] extends [string]  ? true : false;
type IsNumber<T>  = [T] extends [number]  ? true : false;
type IsBoolean<T> = [T] extends [boolean] ? true : false;
type IsNever<T>   = [T] extends [never]   ? true : false;

// Perche' le parentesi quadre [T]? Impediscono la distributivita' (vedi sez. 4).
// Cosi' IsString<string | number> risponde su TUTTA la union, non ramo per ramo.
type S1 = IsString<string>;          // => true
type S2 = IsString<string | number>; // => false (la union nel suo insieme non e' string)
type S3 = IsNever<never>;            // => true

type _t3 = Expect<Equal<S2, false>>;
type _t4 = Expect<Equal<S3, true>>;

// ============================================================================
// 3. If<C, Then, Else>: un ternario type-level
// ============================================================================
// Vincoliamo C a boolean cosi' l'uso e' pulito. Poi controlliamo se e' true.

type If<C extends boolean, Then, Else> = C extends true ? Then : Else;

type If1 = If<true, "si", "no">;   // => "si"
type If2 = If<false, "si", "no">;  // => "no"

// Componibile con i mattoncini della sezione 2:
type DescriviTipo<T> = If<IsString<T>, "stringa", If<IsNumber<T>, "numero", "altro">>;
type D1 = DescriviTipo<string>;  // => "stringa"
type D2 = DescriviTipo<number>;  // => "numero"
type D3 = DescriviTipo<boolean>; // => "altro"

// ============================================================================
// 4. DISTRIBUTIVE CONDITIONAL TYPES (il meccanismo piu' importante)
// ============================================================================
// REGOLA: quando il type controllato e' un "naked type parameter" (cioe' T da
// solo, non [T], non {x:T}) e T e' una UNION, il conditional si DISTRIBUISCE su
// ogni membro della union e poi RIUNISCE i risultati.
//
//   T extends U ? X : Y   con T = A | B  diventa
//   (A extends U ? X : Y) | (B extends U ? X : Y)

// Versione "naked": distribuisce.
type ToArrayNaked<T> = T extends unknown ? T[] : never;
type Arr1 = ToArrayNaked<string | number>; // => string[] | number[]  (NON (string|number)[])

// Versione "boxed" con tuple: NON distribuisce.
type ToArrayBoxed<T> = [T] extends [unknown] ? T[] : never;
type Arr2 = ToArrayBoxed<string | number>;  // => (string | number)[]

type _t5 = Expect<Equal<Arr1, string[] | number[]>>;
type _t6 = Expect<Equal<Arr2, (string | number)[]>>;

// Torniamo ad A4 della sezione 1, ora si spiega:
// IsAssignableToString<string | null> distribuisce:
//   (string extends string ? true:false) | (null extends string ? true:false)
//   => true | false => boolean
type A4bis = IsAssignableToString<string | null>; // => boolean
type _t7 = Expect<Equal<A4bis, boolean>>;

// Caso particolare: `never` e' la UNION VUOTA. Distribuire su zero membri da'
// zero risultati => never. Questo e' spesso una sorpresa (vedi GOTCHA).
type MaiDistribuito = ToArrayNaked<never>; // => never (non never[]!)
type _t8 = Expect<Equal<MaiDistribuito, never>>;

// ============================================================================
// 5. Filtrare una union con la distributivita'
// ============================================================================
// Filtrando ramo per ramo e mappando a `never` gli scarti, `never` sparisce
// dalla union finale (X | never === X). Cosi' costruiamo un "filtro" type-level.

// Tiene solo i membri assegnabili a U.
type KeepAssignable<T, U> = T extends U ? T : never;
// Rimuove i membri assegnabili a U.
type RemoveAssignable<T, U> = T extends U ? never : T;

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Solo i ruoli "amministrativi" (qui simulato: quelli che finiscono per "Admin").
type SoloAdmin = KeepAssignable<Ruolo, `${string}Admin`>; // => "SuperAdmin" | "Admin"
// Tutti tranne il display.
type RuoliUmani = RemoveAssignable<Ruolo, "QrDisplay">;    // => "SuperAdmin" | "Admin" | "Operatore"

type _t9  = Expect<Equal<SoloAdmin, "SuperAdmin" | "Admin">>;
type _t10 = Expect<Equal<RuoliUmani, "SuperAdmin" | "Admin" | "Operatore">>;

// Queste sono esattamente Extract<T,U> ed Exclude<T,U> della standard library,
// che sotto il cofano SONO conditional types distributivi.

// ============================================================================
// 6. NonNullable fatto a mano
// ============================================================================
// NonNullable rimuove null e undefined da una union. Grazie alla distributivita'
// basta mandare a `never` i due casi indesiderati.

type MyNonNullable<T> = T extends null | undefined ? never : T;

type NN1 = MyNonNullable<string | null>;               // => string
type NN2 = MyNonNullable<number | undefined | null>;   // => number
type NN3 = MyNonNullable<"P4" | "P2" | null>;          // => "P4" | "P2"

type _t11 = Expect<Equal<NN1, string>>;
type _t12 = Expect<Equal<NN2, number>>;

// Verifica che coincida con quello della lib standard:
type _t13 = Expect<Equal<MyNonNullable<string | null | undefined>, NonNullable<string | null | undefined>>>;

// ============================================================================
// 7. CONDIZIONALI ANNIDATI (a cascata, come uno switch)
// ============================================================================
// Si possono impilare piu' conditional per creare una "scala" di decisioni.
// Qui mappiamo un type primitivo al suo "nome" in stile typeof.

type NomeTipo<T> =
  T extends string    ? "string"    :
  T extends number    ? "number"    :
  T extends boolean   ? "boolean"   :
  T extends undefined ? "undefined" :
  T extends null      ? "null"      :
  T extends (...args: never[]) => unknown ? "function" :
  "object";

type NT1 = NomeTipo<"UP-001">;          // => "string"
type NT2 = NomeTipo<number>;            // => "number"
type NT3 = NomeTipo<() => void>;        // => "function"
type NT4 = NomeTipo<{ id: number }>;    // => "object"

// ============================================================================
// 8. CONTROL FLOW: narrowing a runtime, conditional a compile-time
// ============================================================================
// I conditional type collaborano con le funzioni: una funzione generica puo'
// dichiarare un return type condizionale. Il compilatore lo risolve dopo che T
// e' noto al call site. Nel corpo pero' spesso serve `as` perche' il narrowing
// runtime e quello type-level non sono la stessa cosa.

// Se T e' string ritorna la sua length (number), altrimenti ritorna T immutato.
type LenOppure<T> = T extends string ? number : T;

function lunghezzaOppure<T>(val: T): LenOppure<T> {
  if (typeof val === "string") {
    // Nel ramo runtime `val` e' string, ma il return type e' generico (LenOppure<T>):
    // il compilatore non collega automaticamente i due, quindi serve il cast.
    return val.length as LenOppure<T>;
  }
  return val as LenOppure<T>;
}

const lo1 = lunghezzaOppure("UP-001"); // valore: 6,   tipo statico: number
const lo2 = lunghezzaOppure(42);       // valore: 42,  tipo statico: number (42 extends string? no => T=42... ma T e' 42)
// Nota: con literal 42, T=42 e "42 extends string" e' false => LenOppure<42> = 42.

// ============================================================================
// 9. DOMINIO ERP: entita' e DTO di base (mock, nessuna libreria)
// ============================================================================
// Interfacce mock del dominio Polyuretech. Nessun import esterno: definiamo tutto qui.

type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  id: number;
  nome: string;
  badge: `UP-${number}`; // template literal type: es. "UP-001"
  ruolo: Ruolo;
  turno: Turno;
}

interface Timbratura {
  dipendenteId: number;
  entrata: string; // formato "HH:MM", validato a runtime con /^\d{2}:\d{2}$/
  uscita: string;  // formato "HH:MM"
}

interface Reparto {
  codice: string;
  nome: string;
}

// ============================================================================
// 10. ERP - Utility DTO: rendere opzionali le date server-generated
// ============================================================================
// In creazione (Create DTO) alcuni campi li mette il server: li togliamo.
// Combiniamo un mapped type con conditional per selezionare le chiavi.

// KeysMatching: tiene solo le chiavi di T il cui valore e' assegnabile a V.
// `[K in keyof T]` con conditional produce un mapped type "as filter": le chiavi
// scartate diventano never e vengono rimosse tramite l'indexing finale [keyof T].
type KeysMatching<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

// Nel Dipendente, quali chiavi hanno valore number?
type ChiaviNumeriche = KeysMatching<Dipendente, number>; // => "id"
type _t14 = Expect<Equal<ChiaviNumeriche, "id">>;

// DTO di creazione: senza id (lo genera il DB). Usa Omit, che internamente e'
// costruito su conditional/mapped type.
type CreateDipendenteDTO = Omit<Dipendente, "id">;
// tipo: { nome: string; badge: `UP-${number}`; ruolo: Ruolo; turno: Turno }

const nuovo: CreateDipendenteDTO = {
  nome: "Rossi",
  badge: "UP-042",
  ruolo: "Operatore",
  turno: "P4",
};

// ============================================================================
// 11. ERP - unwrap del risultato di un Repository (infer + conditional)
// ============================================================================
// `infer` introduce una variabile di type dentro il ramo "vero" di un conditional:
// e' cosi' che si "estrae" un type interno (es. il payload di una Promise).

// Estrae il type risolto da una Promise (equivalente ad Awaited per il caso base).
type Risolto<T> = T extends Promise<infer R> ? R : T;

// Simuliamo la firma di un repository che ritorna Promise.
interface DipendenteRepository {
  findById(id: number): Promise<Dipendente | null>;
  list(): Promise<Dipendente[]>;
}

// ReturnType(nativo) + Risolto per ottenere il payload effettivo del metodo.
type PayloadFindById = Risolto<ReturnType<DipendenteRepository["findById"]>>; // => Dipendente | null
type PayloadList     = Risolto<ReturnType<DipendenteRepository["list"]>>;     // => Dipendente[]

type _t15 = Expect<Equal<PayloadFindById, Dipendente | null>>;
type _t16 = Expect<Equal<PayloadList, Dipendente[]>>;

// infer si puo' annidare: estrai l'elemento dell'array dentro la Promise.
type ElementoRisolto<T> = T extends Promise<Array<infer E>> ? E : never;
type ElemLista = ElementoRisolto<ReturnType<DipendenteRepository["list"]>>; // => Dipendente
type _t17 = Expect<Equal<ElemLista, Dipendente>>;

// ============================================================================
// 12. ERP - validazione formato con template literal + conditional
// ============================================================================
// I conditional lavorano bene con i template literal type per validare formati
// a livello di TYPE (oltre alla validazione runtime con regex).

// Un badge valido e' esattamente "UP-" seguito da cifre (approssimazione type-level).
type IsBadge<T extends string> = T extends `UP-${number}` ? true : false;
type B1 = IsBadge<"UP-001">; // => true
type B2 = IsBadge<"XX-001">; // => false
type B3 = IsBadge<"UP-abc">; // => false ("abc" non e' number)

// Orario "HH:MM": type-level lo modelliamo come due gruppi di cifre.
// (Non e' una validazione perfetta come la regex /^\d{2}:\d{2}$/, ma cattura la forma.)
type Cifra = "0"|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9";
type IsOrario<T extends string> =
  T extends `${Cifra}${Cifra}:${Cifra}${Cifra}` ? true : false;

type O1 = IsOrario<"08:30">; // => true
type O2 = IsOrario<"8:30">;  // => false (manca una cifra nell'ora)
type O3 = IsOrario<"08-30">; // => false (separatore errato)

type _t18 = Expect<Equal<O1, true>>;
type _t19 = Expect<Equal<O2, false>>;

// Uso pratico: una funzione che accetta SOLO literal orario ben formati.
// Il vincolo generico blocca a compile-time le stringhe malformate (se literal).
function timbra<T extends string>(orario: T & (IsOrario<T> extends true ? T : never)): T {
  // Validazione runtime di rinforzo (i type non esistono a runtime):
  if (!/^\d{2}:\d{2}$/.test(orario)) {
    throw new Error("orario non valido");
  }
  return orario;
}
const ok = timbra("08:30"); // ok, tipo: "08:30"
// const ko = timbra("8:30"); // ERRORE TS: argomento "8:30" -> `never`, non assegnabile

// ============================================================================
// 13. ERP - macchina a stati della Timbratura (union discriminata + conditional)
// ============================================================================
// Modelliamo lo stato di una timbratura come union discriminata; poi un
// conditional che, dato lo stato corrente, calcola il type dello stato successivo.

type StatoTimbratura =
  | { kind: "vuota" }
  | { kind: "aperta"; entrata: string }
  | { kind: "chiusa"; entrata: string; uscita: string };

// Dato lo stato corrente, qual e' il type dello stato dopo la prossima azione?
// vuota -> aperta, aperta -> chiusa, chiusa -> chiusa (terminale).
type ProssimoStato<S extends StatoTimbratura> =
  S extends { kind: "vuota" }  ? Extract<StatoTimbratura, { kind: "aperta" }> :
  S extends { kind: "aperta" } ? Extract<StatoTimbratura, { kind: "chiusa" }> :
  S; // chiusa resta chiusa

type Dopo1 = ProssimoStato<{ kind: "vuota" }>;                              // => { kind:"aperta"; entrata:string }
type Dopo2 = ProssimoStato<{ kind: "aperta"; entrata: string }>;           // => { kind:"chiusa"; entrata:string; uscita:string }
type Dopo3 = ProssimoStato<{ kind: "chiusa"; entrata: string; uscita: string }>; // => se stesso (terminale)

type _t20 = Expect<Equal<Dopo1["kind"], "aperta">>;
type _t21 = Expect<Equal<Dopo2["kind"], "chiusa">>;

// ============================================================================
// 14. GOTCHA / PITFALLS (trappole comuni sui conditional types)
// ============================================================================

// --- GOTCHA 1: distributivita' indesiderata su union ---
// Volevi chiedere "l'INTERA union e' string?" ma con T nudo si distribuisce.
type EstringaSbagliato<T> = T extends string ? true : false;
type G1 = EstringaSbagliato<string | number>; // => boolean (distribuito!) NON quello che volevi
// SOLUZIONE: "boxare" con tuple per bloccare la distribuzione.
type EstringaGiusto<T> = [T] extends [string] ? true : false;
type G1fix = EstringaGiusto<string | number>; // => false (corretto)
type _t22 = Expect<Equal<G1fix, false>>;

// --- GOTCHA 2: `never` in ingresso "svanisce" ---
// Un conditional distributivo su `never` (union vuota) da' `never`, non il ramo.
type WrapNaked<T> = T extends unknown ? { valore: T } : never;
type G2 = WrapNaked<never>; // => never (non { valore: never }!)
// SOLUZIONE: se ti serve gestire never, boxalo o intercettalo prima con IsNever.
type WrapSafe<T> = IsNever<T> extends true ? { valore: never } : ([T] extends [unknown] ? { valore: T } : never);
type G2fix = WrapSafe<never>; // => { valore: never }
type _t23 = Expect<Equal<G2["valore" & keyof G2], never>>; // G2 e' never: l'accesso resta never

// --- GOTCHA 3: `boolean` distribuisce come `true | false` ---
// boolean internamente e' l'union true|false: un conditional nudo lo spezza.
type ChiediBool<T> = T extends true ? "e-vero" : "non-vero";
type G3 = ChiediBool<boolean>; // => "e-vero" | "non-vero" (distribuito su true|false)
// SOLUZIONE: se vuoi trattare boolean come un tutto, boxalo.
type ChiediBoolBox<T> = [T] extends [true] ? "e-vero" : "non-vero";
type G3fix = ChiediBoolBox<boolean>; // => "non-vero"
type _t24 = Expect<Equal<G3fix, "non-vero">>;

// --- GOTCHA 4: `any` fa collassare il conditional in ENTRAMBI i rami ---
// Con T = any, "any extends U" e' contemporaneamente vero e falso: il risultato
// e' l'union dei due rami. Fonte di bug silenziosi.
type Ramo<T> = T extends string ? "si" : "no";
type G4 = Ramo<any>; // => "si" | "no"  (any "buca" il conditional)
// SOLUZIONE: evita `any`; usa `unknown` e restringi esplicitamente.
type G4unknown = Ramo<unknown>; // => "no" (unknown non e' assegnabile a string)
type _t25 = Expect<Equal<G4unknown, "no">>;

// ============================================================================
// 15. PATTERN AVANZATO: costruzione passo-passo di una utility (DeepReadonly)
// ============================================================================
// Mostriamo il ragionamento "a strati": un conditional ricorsivo che rende
// readonly in profondita' oggetti e array, lasciando intatte le primitive.
// E' type-as-computation: il type si richiama su se stesso finche' scende.

type Primitivo = string | number | boolean | bigint | symbol | null | undefined;

type DeepReadonly<T> =
  T extends Primitivo
    ? T                                             // primitiva: stop, ritorna com'e'
    : T extends ReadonlyArray<infer E>
      ? ReadonlyArray<DeepReadonly<E>>              // array: readonly + ricorsione sull'elemento
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> } // oggetto: readonly su ogni chiave + ricorsione
        : T;

// Applichiamolo a una struttura ERP annidata.
interface OrarioLavoro {
  dipendente: Dipendente;
  timbrature: Timbratura[];
  reparto: Reparto;
}

type OrarioLavoroRO = DeepReadonly<OrarioLavoro>;
// tipo (semplificato):
// {
//   readonly dipendente: { readonly id: number; readonly nome: string; ... };
//   readonly timbrature: ReadonlyArray<{ readonly dipendenteId: number; ... }>;
//   readonly reparto: { readonly codice: string; readonly nome: string };
// }

// Verifica: modificare un campo profondo e' vietato.
declare const ro: OrarioLavoroRO;
// ro.dipendente.nome = "X"; // ERRORE TS: impossibile assegnare a 'nome' (proprieta' di sola lettura)
// ro.timbrature[0].entrata = "09:00"; // ERRORE TS: elemento readonly

type _t26 = Expect<Equal<OrarioLavoroRO["dipendente"]["id"], number>>;

// ============================================================================
// 16. export dei simboli locali (solo roba definita in questo file)
// ============================================================================
export type {
  Equal,
  Expect,
  If,
  IsString,
  IsNumber,
  IsBoolean,
  MyNonNullable,
  KeepAssignable,
  RemoveAssignable,
  KeysMatching,
  Risolto,
  DeepReadonly,
  Dipendente,
  Timbratura,
  Reparto,
  Ruolo,
  Turno,
  StatoTimbratura,
  ProssimoStato,
};
export { lunghezzaOppure, timbra };

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
// - Forma base:            T extends U ? X : Y  (ternario sui TYPE)
// - Distributivita':        T nudo + union  => si distribuisce ramo per ramo, poi riunisce
// - Bloccare distrib.:      [T] extends [U] ? ...  (boxing con tuple)
// - never = union vuota:    conditional distributivo su never => never
// - boolean = true|false:   nudo => distribuisce (usa boxing per trattarlo intero)
// - any buca il conditional: T=any => union di ENTRAMBI i rami (evita any, usa unknown)
// - Filtri union:           Extract = T extends U ? T : never; Exclude = T extends U ? never : T
// - NonNullable a mano:     T extends null|undefined ? never : T
// - infer:                  estrae type interni nel ramo "vero" (Promise<infer R>, Array<infer E>)
// - Nidificati (switch):    catena di ? : per decisioni multiple
// - Mapped-as-filter:       { [K in keyof T]: cond ? K : never }[keyof T]  => seleziona chiavi
// - Ricorsivi:              DeepReadonly, tipi che si richiamano (type-as-computation)
// - Test di tipo:           type Equal / type Expect<T extends true> per asserzioni compile-time
// - ERP:                    Create DTO (Omit), unwrap Repository (infer), validazione badge/orario
//                           (template literal), macchina a stati Timbratura (union discriminata)
