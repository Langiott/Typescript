/**
 * File 067 - ADV Utility Types 2
 * ================================
 * Approfondimento sulle utility types "avanzate" del type system TypeScript:
 * Record, Readonly, Exclude, Extract, NonNullable, ReturnType, Parameters,
 * InstanceType. Vediamo non solo l'uso pratico ma anche il MECCANISMO interno
 * (distributivita' delle conditional types, inferenza con 'infer', mapped types)
 * con esempi ispirati all'ERP Polyuretech (Dipendente, Timbratura, Reparto).
 * Tutto compilabile con: tsc --strict --target ES2022 --lib ES2022,DOM --noEmit
 */

// ============================================================================
// SEZIONE 0 - HELPER DI TIPO (test a livello di tipo)
// ============================================================================
// Definiamo un helper Equal/Expect per "testare" i tipi a compile-time.
// Non e' una libreria: e' un trucco basato sulla comparazione di funzioni
// generiche, usato da molte librerie di type-testing (es. tsd, type-fest).

// Equal<A, B> vale true solo se A e B sono ESATTAMENTE lo stesso type.
// Il trucco: due funzioni generiche identiche sono assegnabili tra loro
// solo se i loro parametri condizionali collassano allo stesso type.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect accetta solo il literal 'true': se un test fallisce, e' errore di tipo.
type Expect<T extends true> = T;

// Esempi d'uso dell'helper (se il tipo non coincide -> ERRORE TS in compilazione)
type _t0 = Expect<Equal<string, string>>;   // ok
type _t1 = Expect<Equal<1 | 2, 2 | 1>>;     // ok, gli union sono insensibili all'ordine
// type _tBad = Expect<Equal<string, number>>; // ERRORE TS: 'false' non soddisfa 'true'

// Entita' di dominio ERP riusate in tutto il file.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  id: number;
  nome: string;
  badge: string;       // formato "UP-001"
  ruolo: Ruolo;
  reparto?: string;    // opzionale
}

interface Timbratura {
  dipendenteId: number;
  entrata: string;     // "HH:MM" naive-UTC
  uscita: string | null;
}

// ============================================================================
// SEZIONE 1 - Record<K, V>: mappa da chiavi a valori
// ============================================================================
// Record<K, V> costruisce un object type con TUTTE le chiavi K, ognuna di tipo V.
// Definizione interna: type Record<K extends keyof any, V> = { [P in K]: V }
// keyof any = string | number | symbol, quindi K puo' essere qualunque key type.

// Mappa ruolo -> etichetta leggibile. TUTTI i ruoli DEVONO essere presenti:
// se ne dimentichi uno, e' errore di tipo (esaustivita' garantita).
const etichettaRuolo: Record<Ruolo, string> = {
  SuperAdmin: "Super Amministratore",
  Admin: "Amministratore",
  Operatore: "Operatore di reparto",
  QrDisplay: "Display QR",
};
// etichettaRuolo["Admin"] // tipo: string  => "Amministratore"

// ERRORE TS: manca la chiave "QrDisplay" -> Property 'QrDisplay' is missing
// const parziale: Record<Ruolo, string> = { SuperAdmin: "x", Admin: "y", Operatore: "z" };

// Record con chiavi number: utile come indice per id.
const dipPerId: Record<number, Dipendente> = {};
dipPerId[1] = { id: 1, nome: "Mario", badge: "UP-001", ruolo: "Operatore" };
// dipPerId[1].nome // tipo: string

// GOTCHA: Record<string, V> NON aggiunge 'undefined' all'accesso, anche se la
// chiave potrebbe non esistere a runtime. Con --strict resta comunque V.
const cache: Record<string, number> = {};
const forse = cache["chiave-inesistente"]; // tipo: number (ma a runtime e' undefined!)
// Soluzione robusta: attiva 'noUncheckedIndexedAccess' oppure usa Map / il check esplicito.
void forse;

// Record + union di chiavi calcolate: mappa Turno -> ore previste.
const oreTurno: Record<Turno, number> = { P4: 8, P2: 6, STD: 8 };
// Object.keys(oreTurno) e' string[], NON Turno[] (limite noto di TS, vedi GOTCHA).

// ============================================================================
// SEZIONE 2 - Readonly<T>: rendere immutabili le proprieta'
// ============================================================================
// Readonly<T> = { readonly [P in keyof T]: T[P] }
// E' un mapped type che aggiunge il modifier 'readonly' a ogni proprieta'.

type DipReadonly = Readonly<Dipendente>;
// Equivale a: { readonly id: number; readonly nome: string; ... }

const dipImmutabile: DipReadonly = {
  id: 10, nome: "Anna", badge: "UP-010", ruolo: "Admin",
};
// ERRORE TS: Cannot assign to 'nome' because it is a read-only property.
// dipImmutabile.nome = "Cambio";

// GOTCHA: Readonly e' SHALLOW (superficiale). Gli oggetti annidati restano mutabili.
interface Reparto {
  nome: string;
  membri: Dipendente[];
}
const rep: Readonly<Reparto> = { nome: "Produzione", membri: [] };
// rep.nome = "x";        // ERRORE TS: read-only
rep.membri.push(dipImmutabile); // OK a runtime! l'array interno NON e' readonly
// Per immutabilita' profonda serve una DeepReadonly ricorsiva (vedi sotto).

// DeepReadonly: applica readonly ricorsivamente. Mostra il pattern "tipo come calcolo".
type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>                 // caso array
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> } // caso object (ricorsione)
    : T;                                            // caso primitivo: si ferma

type RepDeep = DeepReadonly<Reparto>;
const repDeep: RepDeep = { nome: "Produzione", membri: [] };
// ERRORE TS: push non esiste su ReadonlyArray
// repDeep.membri.push(...);
void repDeep;

// Test di tipo: verifichiamo che DeepReadonly renda readonly la prop annidata.
type _tDeep = Expect<Equal<RepDeep["nome"], string>>; // il tipo del valore resta string
void ({} as _tDeep);

// ============================================================================
// SEZIONE 3 - Exclude<T, U> ed Extract<T, U>: filtrare gli union
// ============================================================================
// Sono conditional types DISTRIBUTIVE sugli union.
// Exclude<T, U> = T extends U ? never : T   -> tiene i membri NON in U
// Extract<T, U> = T extends U ? T : never   -> tiene i membri IN U
//
// "Distributiva" significa: se T e' un naked type parameter e riceve un union,
// la conditional si applica a OGNI membro separatamente e poi si ri-unisce.

// Ruoli con privilegi amministrativi: escludiamo Operatore e QrDisplay.
type RuoloAdmin = Exclude<Ruolo, "Operatore" | "QrDisplay">;
// tipo: "SuperAdmin" | "Admin"
type _tExcl = Expect<Equal<RuoloAdmin, "SuperAdmin" | "Admin">>;
void ({} as _tExcl);

// Extract fa il contrario: teniamo SOLO i ruoli "operativi".
type RuoloOperativo = Extract<Ruolo, "Operatore" | "QrDisplay">;
// tipo: "Operatore" | "QrDisplay"
type _tExtr = Expect<Equal<RuoloOperativo, "Operatore" | "QrDisplay">>;
void ({} as _tExtr);

// Uso tipico: filtrare per struttura, non solo per literal.
// Da un union di forme, estrai solo quelle che hanno un campo discriminante.
type EventoTimbratura =
  | { kind: "entrata"; ora: string }
  | { kind: "uscita"; ora: string }
  | { kind: "errore"; messaggio: string };

// Extract per discriminant: prende solo i membri il cui 'kind' e' "entrata"|"uscita".
type EventoConOra = Extract<EventoTimbratura, { kind: "entrata" | "uscita" }>;
// tipo: { kind: "entrata"; ora: string } | { kind: "uscita"; ora: string }
type _tEvt = Expect<Equal<EventoConOra["ora"], string>>;
void ({} as _tEvt);

// MECCANISMO: perche' funziona la distributivita'?
// Exclude<A | B | C, U> viene valutato come:
//   (A extends U ? never : A) | (B extends U ? never : B) | (C extends U ? never : C)
// I 'never' scompaiono dall'union (never e' l'elemento neutro dell'unione).

// GOTCHA distributivita': avvolgere in tupla DISATTIVA la distribuzione.
// [T] extends [U] confronta l'INTERO union come blocco unico.
type IsMaiOperatore<T> = [T] extends ["Operatore"] ? true : false;
type _a = IsMaiOperatore<"Operatore">;          // true
type _b = IsMaiOperatore<"Operatore" | "Admin">; // false (il blocco non e' esattamente ["Operatore"])
type _cA = Expect<Equal<_a, true>>;
type _cB = Expect<Equal<_b, false>>;
void ({} as _cA); void ({} as _cB);

// ============================================================================
// SEZIONE 4 - NonNullable<T>: togliere null e undefined
// ============================================================================
// NonNullable<T> = T & {} (nelle versioni moderne) oppure Exclude<T, null|undefined>.
// Rimuove sia 'null' sia 'undefined' dallo union.

type UscitaGrezza = string | null | undefined;
type UscitaSicura = NonNullable<UscitaGrezza>;
// tipo: string
type _tNN = Expect<Equal<UscitaSicura, string>>;
void ({} as _tNN);

// Uso pratico: dopo un filtro, "restringere" il tipo degli elementi.
const uscite: (string | null)[] = ["18:00", null, "17:30"];
const usciteValide: string[] = uscite.filter(
  (u): u is NonNullable<typeof u> => u !== null
);
// usciteValide // tipo: string[]  => ["18:00", "17:30"]

// NonNullable si compone con l'indexed access per pulire i campi opzionali.
type RepartoDip = NonNullable<Dipendente["reparto"]>;
// Dipendente["reparto"] e' string | undefined -> NonNullable -> string
type _tRep = Expect<Equal<RepartoDip, string>>;
void ({} as _tRep);

// ============================================================================
// SEZIONE 5 - ReturnType<T> e Parameters<T>: introspezione delle funzioni
// ============================================================================
// Entrambe usano 'infer' dentro una conditional type per "catturare" parti
// della signature di una funzione.
// ReturnType<F> = F extends (...a: any) => infer R ? R : any
// Parameters<F> = F extends (...a: infer P) => any ? P : never  (P e' una tupla)

// Funzione factory realistica: crea un DTO di timbratura validato.
function creaTimbratura(dipendenteId: number, entrata: string) {
  return {
    dipendenteId,
    entrata,
    uscita: null as string | null,
    creataAlle: Date.now(),
  };
}

// Cattura il tipo di RITORNO senza doverlo riscrivere a mano.
type TimbraturaDTO = ReturnType<typeof creaTimbratura>;
// tipo: { dipendenteId: number; entrata: string; uscita: string | null; creataAlle: number }
// Vantaggio: se cambia la factory, il DTO si aggiorna da solo (single source of truth).

// Cattura i PARAMETRI come tupla.
type ParamCrea = Parameters<typeof creaTimbratura>;
// tipo: [dipendenteId: number, entrata: string]
type _tParam = Expect<Equal<ParamCrea, [dipendenteId: number, entrata: string]>>;
void ({} as _tParam);

// Prendere un singolo parametro per indice (tuple index access).
type PrimoParam = Parameters<typeof creaTimbratura>[0]; // tipo: number

// Pattern "wrapper con logging": riusa i parametri della funzione originale.
// Cosi' il wrapper resta sincronizzato con la firma anche se cambia.
function conLog<F extends (...args: any[]) => any>(fn: F, etichetta: string) {
  return (...args: Parameters<F>): ReturnType<F> => {
    // console.log(etichetta, args); // Esempio browser/console: non lo eseguiamo
    void etichetta;
    return fn(...args);
  };
}
const creaLoggata = conLog(creaTimbratura, "creaTimbratura");
const dto = creaLoggata(1, "08:00");
// dto.entrata // tipo: string  => "08:00"
void dto;

// ThisParameterType/OmitThisParameter esistono ma qui restiamo su ReturnType/Parameters.

// ============================================================================
// SEZIONE 6 - InstanceType<T> e ConstructorParameters<T>: dal costruttore all'istanza
// ============================================================================
// InstanceType<C> = C extends new (...a: any) => infer R ? R : any
// Serve a ottenere il TIPO DELL'ISTANZA a partire dal tipo del COSTRUTTORE
// (la classe come valore). Utile con pattern factory/dependency injection.

class RepositoryTimbrature {
  private dati: Timbratura[] = [];
  aggiungi(t: Timbratura): void {
    this.dati.push(t);
  }
  perDipendente(id: number): Timbratura[] {
    return this.dati.filter((t) => t.dipendenteId === id);
  }
  get totale(): number {
    return this.dati.length;
  }
}

// 'typeof RepositoryTimbrature' e' il tipo del COSTRUTTORE (il valore classe).
// InstanceType lo trasforma nel tipo dell'oggetto costruito.
type RepoIstanza = InstanceType<typeof RepositoryTimbrature>;
// tipo: RepositoryTimbrature (con metodi aggiungi/perDipendente e getter totale)

// Verifica: un'istanza reale e' assegnabile a RepoIstanza.
const repo: RepoIstanza = new RepositoryTimbrature();
repo.aggiungi({ dipendenteId: 1, entrata: "08:00", uscita: null });
// repo.totale // tipo: number  => 1

// Factory generica che costruisce QUALSIASI classe senza argomenti e ne
// tipizza correttamente l'istanza tramite InstanceType.
function creaVuoto<C extends new () => any>(Classe: C): InstanceType<C> {
  return new Classe();
}
const repo2 = creaVuoto(RepositoryTimbrature);
// repo2 // tipo: RepositoryTimbrature
void repo2;

// ConstructorParameters cattura gli argomenti del costruttore come tupla.
class Orario {
  constructor(public ore: number, public minuti: number) {}
}
type ArgsOrario = ConstructorParameters<typeof Orario>;
// tipo: [ore: number, minuti: number]
type _tCtor = Expect<Equal<ArgsOrario, [ore: number, minuti: number]>>;
void ({} as _tCtor);

// ============================================================================
// SEZIONE 7 - Esempio ERP integrato: repository type-safe con utility combinate
// ============================================================================
// Mettiamo insieme piu' utility per un mini-layer di persistenza generico.

interface Entita {
  id: number;
}

// DTO di creazione: la stessa entita' SENZA id (l'id lo assegna il DB).
// Usiamo Omit (utility base) + Readonly per un input immutabile.
type CreateDTO<T extends Entita> = Readonly<Omit<T, "id">>;

// Mappa "tabella" -> Record da id a entita'. Record modella l'indice primario.
class InMemoryRepo<T extends Entita> {
  private tabella: Record<number, T> = {};
  private nextId = 1;

  crea(dto: CreateDTO<T>): T {
    const id = this.nextId++;
    // Ricostruiamo l'entita' completa aggiungendo l'id.
    const entita = { ...dto, id } as unknown as T;
    this.tabella[id] = entita;
    return entita;
  }

  trova(id: number): T | undefined {
    return this.tabella[id];
  }

  tutti(): ReadonlyArray<T> {
    // ReadonlyArray impedisce mutazioni accidentali del risultato.
    return Object.values(this.tabella);
  }
}

// Uso con l'entita' Dipendente (che estende Entita tramite 'id: number').
const repoDip = new InMemoryRepo<Dipendente>();
const nuovo = repoDip.crea({
  nome: "Luca",
  badge: "UP-042",
  ruolo: "Operatore",
});
// ERRORE TS: 'id' non e' ammesso in CreateDTO (Object literal may only specify known properties)
// const conId = repoDip.crea({ id: 99, nome: "X", badge: "UP-099", ruolo: "Admin" });
// nuovo.id // tipo: number  (assegnato dal repo)
void nuovo;

// ============================================================================
// SEZIONE 8 - Pattern type-level: validazione badge e stato macchina
// ============================================================================
// Costruiamo passo dopo passo una utility che, a livello di tipo, associa
// gli eventi ammessi allo stato corrente di una timbratura (state machine).

type StatoTimbratura = "aperta" | "chiusa";
type AzioneTimbratura = "apri" | "chiudi";

// Transizioni ammesse come Record: da stato -> azioni possibili.
const transizioni: Record<StatoTimbratura, ReadonlyArray<AzioneTimbratura>> = {
  aperta: ["chiudi"],
  chiusa: ["apri"],
};
// transizioni.aperta // tipo: readonly ("apri" | "chiudi")[]  => ["chiudi"]

// Estrai a livello di tipo lo stato risultante di un'azione: qui via conditional.
type ProssimoStato<A extends AzioneTimbratura> =
  A extends "apri" ? "aperta" :
  A extends "chiudi" ? "chiusa" :
  never;
type _tSm1 = Expect<Equal<ProssimoStato<"apri">, "aperta">>;
type _tSm2 = Expect<Equal<ProssimoStato<"chiudi">, "chiusa">>;
void ({} as _tSm1); void ({} as _tSm2);

// Guardia runtime che sfrutta i tipi per accettare solo azioni valide.
function puoEseguire(stato: StatoTimbratura, azione: AzioneTimbratura): boolean {
  return transizioni[stato].includes(azione);
}
// puoEseguire("aperta", "chiudi") // => true
// puoEseguire("aperta", "apri")   // => false

// Validazione badge "UP-\d{3}" a livello di TIPO con template literal type.
// Mostra come i literal type possano modellare (in modo limitato) i formati.
type Cifra = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type BadgeValido = `UP-${Cifra}${Cifra}${Cifra}`;
const b1: BadgeValido = "UP-001"; // ok
// ERRORE TS: "AB-001" non corrisponde al pattern del template literal type
// const b2: BadgeValido = "AB-001";
// ERRORE TS: "UP-1" ha troppe poche cifre
// const b3: BadgeValido = "UP-1";
void b1;
// NOTA: a runtime resta comunque buona pratica il regex /^UP-\d{3}$/;
// il template literal type e' un controllo statico complementare.

// ============================================================================
// SEZIONE 9 - GOTCHA / PITFALLS (trappole comuni)
// ============================================================================

// --- Pitfall 1: Object.keys perde il tipo delle chiavi ---
// Object.keys(oreTurno) e' string[], NON (keyof typeof oreTurno)[].
// Motivo: un object puo' avere piu' chiavi di quelle dichiarate (structural typing),
// quindi TS non puo' garantire che le chiavi siano solo quelle del type.
const chiavi = Object.keys(oreTurno); // tipo: string[]
// ERRORE TS: 'string' non e' assegnabile a 'Turno'
// const t: Turno = chiavi[0];
// Soluzione: cast controllato -> Object.keys(oreTurno) as Turno[] (se sei sicuro del dato).
void chiavi;

// --- Pitfall 2: Exclude su un union "largo" non ristretto ---
// Exclude confronta per assegnabilita', non per uguaglianza stretta.
type SoloStringLiteral = Exclude<"a" | "b" | string, "a">;
// tipo: string  (perche' "a"|"b" sono assorbiti da 'string': l'union collassa a string)
type _tP2 = Expect<Equal<SoloStringLiteral, string>>;
void ({} as _tP2);
// Lezione: se nell'union c'e' 'string', i literal string spariscono ancora prima di Exclude.

// --- Pitfall 3: ReturnType su funzione overloadata prende l'ULTIMA overload ---
// Definiamo due firme; ReturnType considera solo l'ultima nella lista.
interface Parser {
  (input: string): number;
  (input: string, base: number): string;
}
type RetParser = ReturnType<Parser>;
// tipo: string  (l'ultima overload), NON number
// Attenzione quando introspezioni funzioni con overload multiple.
void ({} as RetParser);

// --- Pitfall 4: Readonly non protegge da JSON.parse / cast ---
// Un cast 'as' o dati esterni bypassano readonly a runtime.
const grezzo = JSON.parse('{"id":1,"nome":"X"}') as Readonly<{ id: number; nome: string }>;
// grezzo.id = 2; // ERRORE TS a compile-time...
(grezzo as { id: number }).id = 2; // ...ma il cast lo aggira. readonly e' solo compile-time.
void grezzo;

// ============================================================================
// SEZIONE 10 - Ricostruire le utility "da zero" (per capire il meccanismo)
// ============================================================================
// Reimplementiamo alcune utility per vedere che non sono magia del compilatore
// ma normali mapped/conditional types. (Prefisso 'My' per non collidere.)

type MyRecord<K extends keyof any, V> = { [P in K]: V };
type MyReadonly<T> = { readonly [P in keyof T]: T[P] };
type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;
type MyNonNullable<T> = T & {}; // il trucco moderno: & {} rimuove null|undefined
type MyReturnType<F> = F extends (...a: any[]) => infer R ? R : never;
type MyParameters<F> = F extends (...a: infer P) => any ? P : never;
type MyInstanceType<C> = C extends new (...a: any[]) => infer R ? R : never;

// Verifichiamo che le nostre versioni coincidano con quelle native.
type _v1 = Expect<Equal<MyExclude<Ruolo, "Operatore">, Exclude<Ruolo, "Operatore">>>;
type _v2 = Expect<Equal<MyNonNullable<string | null>, NonNullable<string | null>>>;
type _v3 = Expect<Equal<MyReturnType<typeof creaTimbratura>, ReturnType<typeof creaTimbratura>>>;
type _v4 = Expect<Equal<MyParameters<typeof creaTimbratura>, Parameters<typeof creaTimbratura>>>;
type _v5 = Expect<Equal<MyInstanceType<typeof Orario>, InstanceType<typeof Orario>>>;
void ({} as _v1); void ({} as _v2); void ({} as _v3); void ({} as _v4); void ({} as _v5);

// MyRecord/MyReadonly all'opera su Dipendente.
type MappaRuoli = MyRecord<Ruolo, number>; // { SuperAdmin: number; Admin: number; ... }
type DipRO = MyReadonly<Dipendente>;
void ({} as MappaRuoli); void ({} as DipRO);

// ============================================================================
// SEZIONE 11 - Export (solo simboli locali, come da regole)
// ============================================================================
export {
  etichettaRuolo,
  oreTurno,
  transizioni,
  RepositoryTimbrature,
  InMemoryRepo,
  puoEseguire,
  creaTimbratura,
};
export type {
  Ruolo,
  Turno,
  Dipendente,
  Timbratura,
  DeepReadonly,
  CreateDTO,
  TimbraturaDTO,
  RepoIstanza,
  BadgeValido,
  Equal,
  Expect,
};

/*
 * ============================================================================
 * RIEPILOGO COMANDI / CONCETTI (ripasso veloce)
 * ============================================================================
 * - Record<K, V>          : { [P in K]: V } - mappa esaustiva chiavi->valori.
 * - Readonly<T>           : aggiunge 'readonly' (SHALLOW). DeepReadonly = ricorsivo.
 * - Exclude<T, U>         : T extends U ? never : T - toglie membri dall'union.
 * - Extract<T, U>         : T extends U ? T : never - tiene solo i membri comuni.
 * - NonNullable<T>        : T & {} - rimuove null e undefined.
 * - ReturnType<F>         : cattura il tipo di ritorno via 'infer R'.
 * - Parameters<F>         : cattura i parametri come TUPLA via 'infer P'.
 * - InstanceType<C>       : dal tipo del costruttore al tipo dell'istanza.
 * - ConstructorParameters : argomenti del costruttore come tupla.
 * - Distributivita'       : conditional su naked type parameter si applica per-membro.
 * - [T] extends [U]       : disattiva la distributivita' (confronto a blocco).
 * - 'infer'               : dichiara una type variable dentro una conditional type.
 * - Helper Equal/Expect   : test di tipo a compile-time (Expect<Equal<A,B>>).
 * - GOTCHA: Object.keys -> string[] ; readonly solo a compile-time ; overload -> ultima ;
 *           'string' nell'union assorbe i literal prima di Exclude ;
 *           Record<string,V> non aggiunge undefined (usa noUncheckedIndexedAccess).
 * - Pattern ERP: CreateDTO=Readonly<Omit<T,"id">>, Repo con Record<number,T>,
 *   state machine con Record<Stato, Azioni[]>, BadgeValido via template literal type.
 * ============================================================================
 */
