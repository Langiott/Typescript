/**
 * 083_TS_ADV_Generic_Factories.ts
 * File 83 - ADV Generic factories (factory generiche)
 *
 * Argomento: pattern di factory generiche in TypeScript. Vediamo come scrivere
 * createEntity<T>, factory con constraint (extends), factory che ritornano una
 * CLASSE (class expression / mixin-like), preservando l'inferenza dei tipi.
 * Esempi dal dominio ERP Polyuretech: repository, entita' Dipendente/Timbratura,
 * DTO e validazione. Compila con: tsc --strict --target ES2022 --lib ES2022,DOM --noEmit
 */

// =============================================================================
// SEZIONE 0 - Helper di test type-level (Equal / Expect)
// =============================================================================
// Trucco classico: due tipi sono "uguali" se una funzione condizionale che li
// confronta e' assegnabile in entrambe le direzioni. Usa il fatto che i tipi
// condizionali sono valutati in modo lazy e distinguono anche 'any' da 'unknown'.
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;

// Expect accetta solo 'true': se il test type-level fallisce, e' un errore di compilazione.
type Expect<T extends true> = T;

// Esempio d'uso: nessun errore -> il tipo e' quello atteso.
type _t0 = Expect<Equal<string, string>>; // ok
// type _tBad = Expect<Equal<string, number>>; // ERRORE TS: 'false' non soddisfa 'true'

// =============================================================================
// SEZIONE 1 - Dominio ERP (tipi base condivisi)
// =============================================================================
export type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
export type Turno = "P4" | "P2" | "STD";

// Badge nel formato "UP-001", orario naive-UTC "HH:MM".
type Badge = `UP-${number}`;      // template literal type: approssima /^UP-\d{3}$/
type OrarioHHMM = `${number}:${number}`; // approssima /^\d{2}:\d{2}$/

export interface Dipendente {
  id: number;
  nome: string;
  badge: Badge;      // es: "UP-001"
  ruolo: Ruolo;
}

export interface Timbratura {
  id: number;
  dipendenteId: number;
  entrata: OrarioHHMM; // "08:00"
  uscita: OrarioHHMM;  // "17:00"
  turno: Turno;
}

export interface Reparto {
  id: number;
  nome: string;
}

// =============================================================================
// SEZIONE 2 - createEntity<T>: la factory generica di base
// =============================================================================
// Idea: una factory che costruisce un oggetto di tipo T a partire dai suoi campi.
// Il generico T e' vincolato a 'object' e viene INFERITO dal chiamante.

function createEntity<T extends object>(data: T): T {
  // In un ERP reale qui aggiungeresti validazione/normalizzazione.
  return { ...data };
}

const d1 = createEntity<Dipendente>({
  id: 1,
  nome: "Rossi",
  badge: "UP-001",
  ruolo: "Operatore",
});
// tipo di d1: Dipendente

// Se ometti il type argument, T viene INFERITO dalla forma del literal.
const d2 = createEntity({ id: 2, nome: "Bianchi", badge: "UP-002" as Badge, ruolo: "Admin" as Ruolo });
// tipo di d2: { id: number; nome: string; badge: Badge; ruolo: Ruolo }
type _t1 = Expect<Equal<typeof d1, Dipendente>>; // ok

// Variante che genera l'id: 'id' viene omesso dall'input e aggiunto dalla factory.
// Usiamo Omit<T, "id"> per l'input, e restituiamo T completo.
let _seq = 0;
function createWithId<T extends { id: number }>(data: Omit<T, "id">): T {
  // Cast necessario: TS non sa che { ...data, id } "completa" T. E' un limite
  // dell'inferenza strutturale: l'unione di Omit<T,"id"> + {id} non e' vista come T.
  return { ...data, id: ++_seq } as T;
}

const d3 = createWithId<Dipendente>({ nome: "Verdi", badge: "UP-003", ruolo: "QrDisplay" });
// tipo di d3: Dipendente, d3.id === 1 (generato)

// =============================================================================
// SEZIONE 3 - Factory con constraint (extends) e default type parameter
// =============================================================================
// Constraint 'extends { badge: Badge }' garantisce che T abbia sempre un badge.
// Il chiamante puo' passare qualunque entita' che soddisfi il constraint.

function conBadge<T extends { badge: Badge }>(entita: T): T & { badgeNumerico: number } {
  const num = Number(entita.badge.split("-")[1]); // "UP-007" -> 7
  return { ...entita, badgeNumerico: num };
}

const arricchito = conBadge(d1);
// tipo: Dipendente & { badgeNumerico: number }
type _t2 = Expect<Equal<typeof arricchito, Dipendente & { badgeNumerico: number }>>; // ok

// Default type parameter: se il chiamante non specifica K, cade su "id".
// Utile per factory di "selettori" di chiave.
function estraiChiave<T, K extends keyof T = keyof T & "id">(obj: T, chiave: K): T[K] {
  return obj[chiave];
}
const idDip = estraiChiave(d1, "id");     // tipo: number
const nomeDip = estraiChiave(d1, "nome"); // tipo: string

// =============================================================================
// SEZIONE 4 - Factory che ritorna una CLASSE (class factory / mixin pattern)
// =============================================================================
// Una funzione generica puo' restituire una class expression. Il tipo di ritorno
// e' il CONSTRUCTOR TYPE, quindi 'new' funziona e 'instanceof' e' preservato.

// Alias per un "qualunque costruttore" (utile nei mixin).
type Constructor<T = object> = new (...args: any[]) => T;

// createModel<T>: fabbrica una classe che avvolge dati di forma T e offre toJSON().
function createModel<T extends object>() {
  // La classe interna e' generica sul tipo T catturato dalla factory.
  return class Model {
    constructor(public readonly data: T) {}
    toJSON(): string {
      return JSON.stringify(this.data);
    }
    get<K extends keyof T>(k: K): T[K] {
      return this.data[k];
    }
  };
}

// Istanzio la classe generata per Dipendente.
const DipendenteModel = createModel<Dipendente>();
const modelloDip = new DipendenteModel(d1);
const nomeDaModello = modelloDip.get("nome"); // tipo: string
// modelloDip e' un'istanza -> instanceof funziona:
const _isModel = modelloDip instanceof DipendenteModel; // true

// Mixin: prende una base-class e la estende. La factory e' generica sul
// Constructor della base, cosi' preserva metodi/campi esistenti.
function ConTimestamp<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    creatoIl: string = "2026-07-08T00:00:00"; // naive-UTC
    tocca(): void {
      this.creatoIl = "2026-07-08T12:00:00";
    }
  };
}

class Base {
  constructor(public etichetta: string) {}
}
const BaseConTs = ConTimestamp(Base);
const conTs = new BaseConTs("reparto-stampaggio");
// conTs ha 'etichetta' (dalla base) E 'creatoIl' (dal mixin):
const _et = conTs.etichetta;   // tipo: string
const _cr = conTs.creatoIl;    // tipo: string

// =============================================================================
// SEZIONE 5 - ERP: Repository generico via factory
// =============================================================================
// Repository<T> generico costruito da una factory. Vincoliamo T ad avere 'id'
// per poter fare lookup/aggiornamenti per chiave primaria.

export interface Repository<T extends { id: number }> {
  add(entity: T): T;
  byId(id: number): T | undefined;
  all(): readonly T[];
  update(id: number, patch: Partial<Omit<T, "id">>): T | undefined;
  remove(id: number): boolean;
}

// createRepository<T>(): la factory. In-memory, ma la firma e' la stessa di
// un repo su DB (es. Prisma). Definiamo tutto in-file: nessuna libreria esterna.
function createRepository<T extends { id: number }>(): Repository<T> {
  const store = new Map<number, T>();
  return {
    add(entity) {
      store.set(entity.id, entity);
      return entity;
    },
    byId(id) {
      return store.get(id);
    },
    all() {
      return Array.from(store.values());
    },
    update(id, patch) {
      const prev = store.get(id);
      if (!prev) return undefined;
      // patch e' Partial<Omit<T,"id">>: non puo' cambiare l'id -> primary key safe.
      const next = { ...prev, ...patch } as T;
      store.set(id, next);
      return next;
    },
    remove(id) {
      return store.delete(id);
    },
  };
}

// Uso concreto: repo di Dipendenti e repo di Timbrature dallo STESSO factory.
const dipRepo = createRepository<Dipendente>();
const timRepo = createRepository<Timbratura>();

dipRepo.add(d1);
const trovato = dipRepo.byId(1);       // tipo: Dipendente | undefined
const aggiornato = dipRepo.update(1, { nome: "Rossi F." }); // ok: 'nome' e' patchabile
// dipRepo.update(1, { id: 99 }); // ERRORE TS: 'id' non e' assegnabile in Partial<Omit<T,"id">>

timRepo.add({ id: 10, dipendenteId: 1, entrata: "08:00", uscita: "17:00", turno: "P4" });
const t = timRepo.byId(10);            // tipo: Timbratura | undefined

// Il constraint impedisce di creare repo su tipi senza 'id':
// const bad = createRepository<{ nome: string }>(); // ERRORE TS: manca 'id: number'

// =============================================================================
// SEZIONE 6 - ERP: Factory di DTO tramite mapped types
// =============================================================================
// Una factory di "DTO builder": dato un tipo entita' T, produce una funzione
// che costruisce il DTO di creazione (senza id) e uno di update (tutto opzionale).
// Il potere qui e' che i TIPI dei DTO derivano automaticamente da T.

type CreateDTO<T extends { id: number }> = Omit<T, "id">;
type UpdateDTO<T extends { id: number }> = Partial<Omit<T, "id">>;

interface DtoFactory<T extends { id: number }> {
  create(data: CreateDTO<T>): CreateDTO<T>;
  update(data: UpdateDTO<T>): UpdateDTO<T>;
}

function makeDtoFactory<T extends { id: number }>(): DtoFactory<T> {
  return {
    create: (data) => data,
    update: (data) => data,
  };
}

const dipDto = makeDtoFactory<Dipendente>();
const nuovoDip = dipDto.create({ nome: "Neri", badge: "UP-004", ruolo: "Operatore" });
// tipo di nuovoDip: Omit<Dipendente, "id"> = { nome; badge; ruolo }
const patchDip = dipDto.update({ ruolo: "Admin" }); // tipo: Partial<Omit<Dipendente,"id">>
// dipDto.create({ id: 5, nome: "X", badge: "UP-005", ruolo: "Admin" }); // ERRORE TS: 'id' non esiste in CreateDTO

// Verifica type-level che CreateDTO<Dipendente> NON contenga 'id':
type _t3 = Expect<Equal<keyof CreateDTO<Dipendente>, "nome" | "badge" | "ruolo">>; // ok

// =============================================================================
// SEZIONE 7 - Factory + discriminated union: state machine timbratura
// =============================================================================
// Factory che crea eventi di una macchina a stati per la timbratura.
// Ogni "creator" e' generico sul tag 'kind' cosi' la union rimane discriminata.

type EventoTimbratura =
  | { kind: "entrata"; badge: Badge; ora: OrarioHHMM }
  | { kind: "uscita"; badge: Badge; ora: OrarioHHMM }
  | { kind: "errore"; badge: Badge; motivo: string };

// Factory generica sul literal 'K' (un membro delle chiavi 'kind').
// 'Extract' seleziona il ramo giusto della union in base al tag.
function creaEvento<K extends EventoTimbratura["kind"]>(
  kind: K,
  payload: Omit<Extract<EventoTimbratura, { kind: K }>, "kind">
): Extract<EventoTimbratura, { kind: K }> {
  return { kind, ...payload } as Extract<EventoTimbratura, { kind: K }>;
}

const ev1 = creaEvento("entrata", { badge: "UP-001", ora: "08:00" });
// tipo: { kind: "entrata"; badge: Badge; ora: OrarioHHMM } -- NON l'intera union
const ev2 = creaEvento("errore", { badge: "UP-001", motivo: "badge non riconosciuto" });
// creaEvento("entrata", { badge: "UP-001", motivo: "x" }); // ERRORE TS: 'motivo' non esiste in ramo 'entrata'

// Consumo esaustivo con narrowing sul discriminante:
function descrivi(ev: EventoTimbratura): string {
  switch (ev.kind) {
    case "entrata":
      return `Entrata ${ev.badge} alle ${ev.ora}`;
    case "uscita":
      return `Uscita ${ev.badge} alle ${ev.ora}`;
    case "errore":
      return `Errore ${ev.badge}: ${ev.motivo}`;
    default: {
      // 'never' check: se aggiungi un ramo alla union senza gestirlo, qui e' errore.
      const _exhaustive: never = ev;
      return _exhaustive;
    }
  }
}

// =============================================================================
// SEZIONE 8 - Factory che ritorna funzioni tipizzate (validatori)
// =============================================================================
// createValidator<T>: cattura T e produce un type guard. Il 'predicato' e' un
// user-defined type guard 'x is T', quindi restringe il tipo nel chiamante.

function createValidator<T>(check: (x: unknown) => boolean) {
  return (x: unknown): x is T => check(x);
}

const isDipendente = createValidator<Dipendente>((x) => {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "number" && typeof o.nome === "string" &&
         typeof o.badge === "string" && typeof o.ruolo === "string";
});

const raw: unknown = d1;
if (isDipendente(raw)) {
  // qui 'raw' e' ristretto a Dipendente grazie al type guard generato:
  const _n = raw.nome; // tipo: string
}

// =============================================================================
// SEZIONE 9 - GOTCHA / PITFALLS
// =============================================================================

// GOTCHA 1: perdita dell'inferenza literal.
// Senza constraint/annotazione, TS "allarga" (widening) i literal a string.
function crea1<T>(x: T): T { return x; }
const g1 = crea1({ ruolo: "Admin" });
// tipo: { ruolo: string }  <-- "Admin" allargato a string! Perdi la union.
// Soluzione A: constraint verso la union.
function crea2<T extends { ruolo: Ruolo }>(x: T): T { return x; }
// const g2 = crea2({ ruolo: "Admin" }); // ok, ruolo resta assegnabile a Ruolo
// Soluzione B: 'as const' sul literal per bloccare il widening.
const g3 = crea1({ ruolo: "Admin" as const });
// tipo: { ruolo: "Admin" }

// GOTCHA 2: constraint troppo largo -> 'T' diventa il constraint, non l'input.
// Se dichiari il parametro come il constraint invece che come 'T', perdi il tipo esatto.
function repoSbagliato(e: { id: number }): { id: number } { return e; }
const rs = repoSbagliato(d1); // tipo: { id: number } -- hai perso Dipendente!
// Soluzione: rendi la funzione generica cosi' T e' l'input concreto.
function repoGiusto<T extends { id: number }>(e: T): T { return e; }
const rg = repoGiusto(d1); // tipo: Dipendente

// GOTCHA 3: 'new class' generica ha bisogno di catturare T alla creazione.
// Se metti il generico sul metodo invece che sulla factory, l'inferenza si perde
// perche' il metodo non ha argomenti da cui inferire T.
// function badModel() { return class { get<T>(): T { return null as T; } }; } // T non inferibile
// Soluzione: cattura T nella factory (vedi createModel<T>() Sezione 4).

// GOTCHA 4: 'as T' nelle factory di completamento (createWithId) e' spesso
// inevitabile perche' TS non prova che { ...Omit<T,"id">, id } === T.
// E' un cast controllato: assicurati a mano che la forma sia completa.

// =============================================================================
// SEZIONE 10 - Test type-level riepilogativi
// =============================================================================
type _c1 = Expect<Equal<ReturnType<typeof createRepository<Dipendente>>, Repository<Dipendente>>>;
type _c2 = Expect<Equal<CreateDTO<Timbratura>, Omit<Timbratura, "id">>>;
type _c3 = Expect<Equal<Parameters<typeof conBadge<Dipendente>>[0], Dipendente>>;
type _c4 = Expect<Equal<typeof ev1, Extract<EventoTimbratura, { kind: "entrata" }>>>;

// Uso simbolico per evitare warning "unused" su alcuni valori dimostrativi.
export const _demo = {
  d1, d2, d3, arricchito, idDip, nomeDip, modelloDip, nomeDaModello,
  conTs, trovato, aggiornato, t, nuovoDip, patchDip, ev1, ev2,
  descrivi, isDipendente, g1, g3, rs, rg, _isModel, _et, _cr, _n0: 0,
};

export {
  createEntity,
  createWithId,
  conBadge,
  estraiChiave,
  createModel,
  ConTimestamp,
  createRepository,
  makeDtoFactory,
  creaEvento,
  createValidator,
};

export type { Constructor, CreateDTO, UpdateDTO, Equal, Expect, Badge, OrarioHHMM };

/*
 * =============================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * =============================================================================
 * - createEntity<T extends object>(data): factory generica base, T inferito o esplicito.
 * - createWithId<T extends {id:number}>(Omit<T,"id">): completa l'entita' generando id (cast 'as T').
 * - Constraint 'extends': vincola la forma di T (es. { badge: Badge }, { id: number }).
 * - Default type parameter: <K extends keyof T = ...> per fallback dell'argomento di tipo.
 * - Class factory: createModel<T>() ritorna una CLASSE (constructor type) -> 'new'/'instanceof' ok.
 * - Constructor<T> = new (...args:any[]) => T: base dei mixin.
 * - Mixin: ConTimestamp<TBase extends Constructor>(Base) -> class extends Base, preserva membri.
 * - Repository<T extends {id:number}>: factory in-memory con firma DB-like; Partial<Omit<T,"id">> per update.
 * - DTO via mapped types: CreateDTO=Omit<T,"id">, UpdateDTO=Partial<Omit<T,"id">>.
 * - Discriminated union + Extract<U,{kind:K}>: factory che ritorna il ramo esatto, non l'intera union.
 * - Exhaustiveness: 'const _e: never = ev' nel default per catturare rami non gestiti.
 * - createValidator<T>: factory che genera un type guard 'x is T' (narrowing nel chiamante).
 * - Equal<X,Y>/Expect<T extends true>: test type-level; fallimento = errore di compilazione.
 * - GOTCHA: widening dei literal (usa 'as const' o constraint); parametro tipizzato col constraint
 *   invece che con T (perdi il tipo esatto); generico sul metodo vs sulla factory; cast 'as T' controllati.
 * =============================================================================
 */
