/**
 * 092 - ADV Repository pattern (spunto ERP)
 * Il Repository pattern astrae l'accesso ai dati dietro un'interfaccia tipizzata.
 * Qui costruiamo IRepository<T, ID> generico con constraint {id}, una implementazione
 * InMemoryRepository e CRUD type-safe per Dipendente e Timbratura (dominio ERP Polyuretech).
 * Focus type system: generics con constraint, inferenza di ID, keyof per query, distributivita
 * dei conditional types, mapped types per DTO/patch, e helper Equal/Expect a livello di tipo.
 * File autonomo: nessun import esterno, tutti i tipi mock sono definiti qui.
 */

// ============================================================================
// SEZIONE 0 - Helper di test a livello di tipo (type-level testing)
// ============================================================================

// Equal<A, B>: true solo se A e B sono lo STESSO tipo (bidirezionale).
// Il trucco dei due generic wrapper <T>() => T extends ... confronta i tipi
// in modo "invariante", cosi' che (string | number) != (number | string) sia
// distinto da tipi realmente uguali. E' l'idioma piu' robusto per l'uguaglianza.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect<T>: compila solo se T e' esattamente true. Usato come "assertion" statica.
type Expect<T extends true> = T;

// Esempio: queste righe compilano => le uguaglianze sono corrette.
type _t0 = Expect<Equal<string, string>>; // => true
// ERRORE TS: type '_tBad' does not satisfy the constraint 'true'
// type _tBad = Expect<Equal<string, number>>;

// ============================================================================
// SEZIONE 1 - Il contratto IRepository<T, ID>
// ============================================================================

// Constraint fondamentale: ogni entita' gestita da un repository DEVE avere un id.
// HasId<ID> impone la forma { id: ID }. Il repository e' generico sull'entita' T
// e sul tipo della chiave ID (di default number, ma potrebbe essere string/uuid).
interface HasId<ID> {
  readonly id: ID;
}

// IRepository: contratto CRUD + query. T extends HasId<ID> garantisce che T.id
// sia sempre presente e del tipo ID dichiarato. I metodi sono async (Promise) per
// aderire al pattern reale (DB/HTTP) anche se l'implementazione in-memory e' sincrona.
interface IRepository<T extends HasId<ID>, ID = number> {
  // Ritorna tutte le entita'. Copia difensiva a carico dell'implementazione.
  findAll(): Promise<T[]>;
  // Ritorna una entita' per id, oppure null se assente. Il null e' esplicito nel tipo.
  findById(id: ID): Promise<T | null>;
  // Crea da un DTO senza id (l'id lo assegna il repository). Vedi CreateDTO sotto.
  create(data: CreateDTO<T, ID>): Promise<T>;
  // Aggiornamento parziale: solo i campi presenti in patch vengono modificati.
  update(id: ID, patch: UpdateDTO<T, ID>): Promise<T | null>;
  // Cancella per id; ritorna true se qualcosa e' stato rimosso.
  delete(id: ID): Promise<boolean>;
  // Query per uguaglianza esatta su un campo qualsiasi dell'entita'.
  findBy<K extends keyof T>(key: K, value: T[K]): Promise<T[]>;
  // Query generica con predicato tipizzato (l'elemento e' T, non any).
  query(predicate: (entity: T) => boolean): Promise<T[]>;
  // Conteggio totale.
  count(): Promise<number>;
}

// CreateDTO: entita' senza il campo id (che genera il repository).
// Omit<T, "id"> rimuove la chiave "id"; qui usiamo la chiave letterale della PK.
type CreateDTO<T extends HasId<ID>, ID = number> = Omit<T, "id">;

// UpdateDTO: patch parziale, ma NON si puo' toccare l'id (immutabile).
// Partial<Omit<...>> => tutti i campi opzionali tranne id che e' escluso.
type UpdateDTO<T extends HasId<ID>, ID = number> = Partial<Omit<T, "id">>;

// ============================================================================
// SEZIONE 2 - Dominio ERP: Dipendente, Timbratura, tipi di supporto
// ============================================================================

// Union letterale dei ruoli: type-safe, autocompletamento, niente stringhe libere.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Turni possibili. STD = standard. P4/P2 = turni produzione Polyuretech.
type Turno = "P4" | "P2" | "STD";

// Template literal type per il badge: forma "UP-" + 3 cifre. TS non conta le cifre
// nativamente, ma `UP-${number}` restringe almeno il prefisso e il segmento numerico.
// La validazione esatta /^UP-\d{3}$/ resta a runtime (vedi guard piu' avanti).
type Badge = `UP-${number}`;

// Orario naive-UTC in formato "HH:MM". Anche qui il template type dice "due gruppi
// separati da :"; il vincolo /^\d{2}:\d{2}$/ e' garantito a runtime dalla guard.
type OrarioHHMM = `${number}:${number}`;

// Entita' Dipendente: id numerico, badge, ruolo, reparto e turno.
interface Dipendente {
  readonly id: number;
  nome: string;
  badge: Badge;
  ruolo: Ruolo;
  reparto: string;
  turno: Turno;
}

// Entita' Timbratura: chiave stringa (uuid-like), riferimento al dipendente,
// orari di entrata/uscita naive-UTC. uscita puo' essere null (timbratura aperta).
interface Timbratura {
  readonly id: string;
  dipendenteId: number;
  data: string; // "YYYY-MM-DD"
  entrata: OrarioHHMM;
  uscita: OrarioHHMM | null;
}

// Verifica type-level: CreateDTO<Dipendente> NON deve avere "id".
type _CreateDip = CreateDTO<Dipendente>;
type _t1 = Expect<Equal<keyof _CreateDip, "nome" | "badge" | "ruolo" | "reparto" | "turno">>;

// Verifica: UpdateDTO<Dipendente> ha gli stessi campi ma tutti opzionali e senza id.
type _UpdDip = UpdateDTO<Dipendente>;
type _t2 = Expect<Equal<_UpdDip, {
  nome?: string;
  badge?: Badge;
  ruolo?: Ruolo;
  reparto?: string;
  turno?: Turno;
}>>;

// ============================================================================
// SEZIONE 3 - Type guard a runtime per i vincoli che i tipi non catturano
// ============================================================================

// I template literal type non validano il NUMERO di cifre: "UP-9999" passa il tipo.
// Servono guard runtime con le regex del dominio ERP.
const RE_BADGE = /^UP-\d{3}$/;
const RE_ORARIO = /^\d{2}:\d{2}$/;

// User-defined type guard: restringe string -> Badge quando la regex passa.
function isBadge(s: string): s is Badge {
  return RE_BADGE.test(s);
}

// Idem per l'orario "HH:MM".
function isOrario(s: string): s is OrarioHHMM {
  return RE_ORARIO.test(s);
}

// Esempio d'uso delle guard (control flow narrowing):
function normalizzaBadge(input: string): Badge {
  if (!isBadge(input)) {
    throw new Error(`Badge non valido: ${input}`); // atteso "UP-001"
  }
  return input; // qui input: Badge (narrowed dalla guard)
}

// ============================================================================
// SEZIONE 4 - InMemoryRepository: implementazione generica del contratto
// ============================================================================

// InMemoryRepository<T, ID> implementa IRepository con una Map<ID, T> interna.
// Riceve nel costruttore una funzione idGen che produce il prossimo id: cosi' la
// stessa classe serve sia per id numerici auto-incrementali sia per id stringa/uuid.
class InMemoryRepository<T extends HasId<ID>, ID = number>
  implements IRepository<T, ID>
{
  // La store e' privata: nessun accesso esterno diretto ai dati.
  private readonly store = new Map<ID, T>();

  // idGen: strategia di generazione della chiave. Non deve dipendere da T.id
  // (che ancora non esiste in fase di create).
  constructor(private readonly idGen: () => ID) {}

  async findAll(): Promise<T[]> {
    // Copia difensiva: restituiamo un nuovo array, non i riferimenti interni.
    return Array.from(this.store.values());
  }

  async findById(id: ID): Promise<T | null> {
    return this.store.get(id) ?? null;
  }

  async create(data: CreateDTO<T, ID>): Promise<T> {
    const id = this.idGen();
    // Ricostruiamo l'entita' completa: spread del DTO + id generato.
    // Il cast e' necessario perche' TS non sa che {...CreateDTO, id} == T:
    // Omit<T,"id"> + {id: ID} e' strutturalmente T, ma il compilatore non lo prova da solo.
    const entity = { ...(data as object), id } as T;
    this.store.set(id, entity);
    return entity;
  }

  async update(id: ID, patch: UpdateDTO<T, ID>): Promise<T | null> {
    const existing = this.store.get(id);
    if (existing === undefined) return null;
    // Merge: i campi presenti in patch sovrascrivono; id resta immutato.
    const updated = { ...existing, ...patch, id } as T;
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: ID): Promise<boolean> {
    return this.store.delete(id);
  }

  async findBy<K extends keyof T>(key: K, value: T[K]): Promise<T[]> {
    // Filtro per uguaglianza. entity[key] ha tipo T[K], value ha tipo T[K]: coerente.
    return Array.from(this.store.values()).filter((e) => e[key] === value);
  }

  async query(predicate: (entity: T) => boolean): Promise<T[]> {
    return Array.from(this.store.values()).filter(predicate);
  }

  async count(): Promise<number> {
    return this.store.size;
  }
}

// ============================================================================
// SEZIONE 5 - Generatori di id e istanziazione dei repository ERP
// ============================================================================

// Auto-increment numerico: closure che incapsula il contatore.
function autoIncrement(start = 0): () => number {
  let n = start;
  return () => ++n; // primo id = 1
}

// Generatore di id stringa pseudo-uuid (sufficiente per l'esempio in-memory).
function uuidLike(): string {
  return "t_" + Math.random().toString(36).slice(2, 10);
}

// Repository dei dipendenti: ID inferito come number dal secondo argomento del tipo.
const dipendentiRepo = new InMemoryRepository<Dipendente>(autoIncrement());
// Repository delle timbrature: ID = string (esplicito, override del default number).
const timbratureRepo = new InMemoryRepository<Timbratura, string>(uuidLike);

// ============================================================================
// SEZIONE 6 - CRUD tipizzato in azione (async)
// ============================================================================

// demoCrud: mostra il ciclo completo create/read/update/delete con inferenza.
async function demoCrud(): Promise<void> {
  // create accetta un CreateDTO<Dipendente> => NON deve avere "id".
  const mario = await dipendentiRepo.create({
    nome: "Mario Rossi",
    badge: normalizzaBadge("UP-001"), // Badge validato a runtime
    ruolo: "Operatore",
    reparto: "Produzione",
    turno: "P4",
  });
  // mario: Dipendente => mario.id ora esiste (assegnato dal repo). tipo: number
  console.log(mario.id); // => 1

  // ERRORE TS: 'id' does not exist in type 'CreateDTO<Dipendente>'
  // await dipendentiRepo.create({ id: 99, nome: "X", badge: "UP-002", ruolo: "Admin", reparto: "IT", turno: "STD" });

  // ERRORE TS: '"Capo"' is not assignable to type 'Ruolo'
  // await dipendentiRepo.create({ nome: "Y", badge: "UP-003", ruolo: "Capo", reparto: "IT", turno: "STD" });

  // findById ritorna Dipendente | null => obbligo di gestire il null.
  const forse = await dipendentiRepo.findById(1);
  if (forse) {
    console.log(forse.nome); // qui forse: Dipendente (narrowed)
  }

  // update parziale: cambio solo il turno; gli altri campi restano invariati.
  const aggiornato = await dipendentiRepo.update(1, { turno: "P2" });
  console.log(aggiornato?.turno); // => "P2"

  // ERRORE TS: 'id' does not exist in type 'UpdateDTO<Dipendente>'
  // await dipendentiRepo.update(1, { id: 5 });

  await dipendentiRepo.delete(1); // => true
}

// ============================================================================
// SEZIONE 7 - Query type-safe con findBy e query
// ============================================================================

async function demoQuery(): Promise<void> {
  // findBy vincola il valore al tipo del campo scelto.
  const operatori = await dipendentiRepo.findBy("ruolo", "Operatore");
  // operatori: Dipendente[]

  // ERRORE TS: '"Nope"' is not assignable to parameter of type 'Ruolo'
  // await dipendentiRepo.findBy("ruolo", "Nope");

  // ERRORE TS: '"eta"' is not assignable to parameter of type 'keyof Dipendente'
  // await dipendentiRepo.findBy("eta", 30);

  // query con predicato: e' fortemente tipizzato (d: Dipendente).
  const p4 = await dipendentiRepo.query((d) => d.turno === "P4");
  console.log(p4.length);

  // Query sulle timbrature aperte (uscita === null).
  const aperte = await timbratureRepo.query((t) => t.uscita === null);
  console.log(aperte.length);

  void operatori;
}

// ============================================================================
// SEZIONE 8 - Estendere il repository: TimbraturaRepository specializzato
// ============================================================================

// Il pattern permette repository specializzati che aggiungono query di dominio
// mantenendo il contratto base. Qui estendiamo la classe generica.
class TimbraturaRepository extends InMemoryRepository<Timbratura, string> {
  constructor() {
    super(uuidLike);
  }

  // Query di dominio: tutte le timbrature ancora aperte di un dipendente.
  async apertePerDipendente(dipendenteId: number): Promise<Timbratura[]> {
    // Riuso query() del padre: DRY e type-safe.
    return this.query((t) => t.dipendenteId === dipendenteId && t.uscita === null);
  }

  // Timbra l'uscita: valida l'orario e chiude la timbratura aperta.
  async chiudiUscita(id: string, uscita: string): Promise<Timbratura | null> {
    if (!isOrario(uscita)) {
      throw new Error(`Orario non valido: ${uscita}`); // atteso "HH:MM"
    }
    // update accetta UpdateDTO<Timbratura>: { uscita?: OrarioHHMM | null }
    return this.update(id, { uscita });
  }
}

async function demoTimbrature(): Promise<void> {
  const repo = new TimbraturaRepository();
  const t = await repo.create({
    dipendenteId: 1,
    data: "2026-07-08",
    entrata: "08:00", // OrarioHHMM validato dal template type per i literal
    uscita: null,
  });
  console.log(t.id); // => "t_xxxxxxxx"

  const aperte = await repo.apertePerDipendente(1);
  console.log(aperte.length); // => 1

  const chiusa = await repo.chiudiUscita(t.id, "17:00");
  console.log(chiusa?.uscita); // => "17:00"
}

// ============================================================================
// SEZIONE 9 - Pattern type-level: derivare tipi dal repository
// ============================================================================

// EntityOf<R>: estrae il tipo entita' T da un IRepository. Usa infer nel conditional.
// Perche' funziona: il compilatore "cattura" T dalla posizione in cui appare in
// IRepository<T, any> e lo espone tramite infer.
type EntityOf<R> = R extends IRepository<infer T, infer _ID> ? T : never;

// IdOf<R>: estrae il tipo della chiave ID nello stesso modo.
type IdOf<R> = R extends IRepository<infer _T, infer ID> ? ID : never;

// Verifiche statiche: dal tipo del repo ricaviamo entita' e id corretti.
type _E = EntityOf<IRepository<Dipendente, number>>;
type _t3 = Expect<Equal<_E, Dipendente>>;
type _t4 = Expect<Equal<IdOf<IRepository<Timbratura, string>>, string>>;

// ReadonlyEntity<T>: rende immutabili tutti i campi (utile per proiezioni "view").
// Mapped type con modificatore readonly applicato a ogni chiave K di T.
type ReadonlyEntity<T> = { readonly [K in keyof T]: T[K] };

type _RODip = ReadonlyEntity<Dipendente>;
// _RODip.nome e' ora readonly: assegnarlo darebbe errore.

// KeysByType<T, V>: seleziona le chiavi di T il cui valore e' assegnabile a V.
// Meccanismo: [K in keyof T] as (T[K] extends V ? K : never) rimappa a mai le chiavi
// non corrispondenti, poi keyof scarta i never. Utile per query su campi omogenei.
type KeysByType<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

// Solo i campi stringa di Dipendente:
type _StrFields = keyof KeysByType<Dipendente, string>;
// nome | badge | reparto sono string/subtype-di-string; ruolo e turno sono union
// letterali (sottotipi di string) quindi anch'essi inclusi; id e' number => escluso.
type _t5 = Expect<Equal<_StrFields, "nome" | "badge" | "ruolo" | "reparto" | "turno">>;

// ============================================================================
// SEZIONE 10 - GOTCHA / PITFALLS
// ============================================================================

// GOTCHA 1: Partial<Omit<T,"id">> ammette anche { } (patch vuoto). E' voluto per
// update, ma se vuoi almeno un campo servirebbe un tipo "at least one". Attenzione:
// un update con patch {} non modifica nulla e ritorna l'entita' invariata.

// GOTCHA 2: il template literal `UP-${number}` NON valida il numero di cifre.
// ERRORE TS: NON e' errore! Il tipo lo accetta, ma la regex a runtime lo rifiuta.
const _fintoOk: Badge = "UP-99999"; // compila, ma isBadge("UP-99999") === false
void _fintoOk;

// GOTCHA 3: distributivita dei conditional types. Se ID e' una union (raro ma
// possibile), IdOf/conditional distribuiscono su ciascun membro. Per bloccare la
// distribuzione si racchiude in tupla: [T] extends [U]. Esempio didattico:
type IsNever<T> = [T] extends [never] ? true : false; // [T] evita la distribuzione
type _t6 = Expect<Equal<IsNever<never>, true>>;
// Senza le tuple, (never extends ... ) distribuirebbe su zero membri => sempre never/true
// in modo controintuitivo. Le parentesi quadre "spengono" la distributivita.

// GOTCHA 4: findBy con value opzionale. Se un campo e' T[K] = X | undefined,
// findBy(key, undefined) matcha solo i record con quel campo davvero undefined.
// Non confondere "campo assente" con "campo === undefined": la Map conserva l'oggetto
// cosi' com'e'. Soluzione: normalizzare i DTO in create (es. uscita: null, non undefined).

// GOTCHA 5: il cast `as T` in create/update. E' un debito di type-safety accettato:
// {...Omit<T,"id">, id} E' strutturalmente T, ma il compilatore non deduce l'equivalenza
// per T generico. Il rischio e' isolato in un solo punto; NON spargere cast nel codice client.

// ============================================================================
// SEZIONE 11 - Mini state-machine sullo stato della timbratura (spunto ERP)
// ============================================================================

// Discriminated union: lo stato "aperta" ha uscita null, "chiusa" ha uscita valorizzata.
// Il campo discriminante e' stato. Il control flow narrowing sfrutta stato per restringere.
type StatoTimbratura =
  | { stato: "aperta"; entrata: OrarioHHMM; uscita: null }
  | { stato: "chiusa"; entrata: OrarioHHMM; uscita: OrarioHHMM };

// Funzione che descrive lo stato. exhaustiveness check con never nel default.
function descriviTimbratura(t: StatoTimbratura): string {
  switch (t.stato) {
    case "aperta":
      return `In corso da ${t.entrata}`;
    case "chiusa":
      return `${t.entrata} - ${t.uscita}`;
    default: {
      // Se aggiungessimo un terzo stato senza gestirlo, _exhaustive darebbe ERRORE TS
      // (never non piu' assegnabile). E' il check di esaustivita' delle union.
      const _exhaustive: never = t;
      return _exhaustive;
    }
  }
}

// ============================================================================
// SEZIONE 12 - Esecuzione demo (non auto-invocata: nessun side-effect all'import)
// ============================================================================

// Raggruppiamo le demo async in una funzione che NON viene chiamata qui.
// Cosi' il file resta puro all'import e i type check restano l'obiettivo.
async function main(): Promise<void> {
  await demoCrud();
  await demoQuery();
  await demoTimbrature();
  console.log(descriviTimbratura({ stato: "aperta", entrata: "08:00", uscita: null }));
}
// void main(); // scommentare per eseguire con ts-node/tsx

// ============================================================================
// SEZIONE 13 - Export locali (solo simboli definiti in questo file)
// ============================================================================

export {
  InMemoryRepository,
  TimbraturaRepository,
  autoIncrement,
  uuidLike,
  isBadge,
  isOrario,
  normalizzaBadge,
  descriviTimbratura,
  main,
};

export type {
  HasId,
  IRepository,
  CreateDTO,
  UpdateDTO,
  Dipendente,
  Timbratura,
  Ruolo,
  Turno,
  Badge,
  OrarioHHMM,
  StatoTimbratura,
  EntityOf,
  IdOf,
  ReadonlyEntity,
  KeysByType,
  Equal,
  Expect,
};

/*
 * RIEPILOGO COMANDI / CONCETTI
 * - IRepository<T extends HasId<ID>, ID = number>: contratto CRUD + query tipizzato.
 * - Constraint {id}: HasId<ID> garantisce entita' sempre con chiave primaria.
 * - CreateDTO = Omit<T,"id">; UpdateDTO = Partial<Omit<T,"id">>: id fuori dai DTO.
 * - InMemoryRepository<T,ID>: Map interna + idGen() iniettato (number o string/uuid).
 * - Generics con default: <T, ID = number> permette override (Timbratura usa string).
 * - findBy<K extends keyof T>(key, value: T[K]): query per campo, valore vincolato.
 * - query(pred: (T)=>boolean): predicato fortemente tipizzato, nessun any.
 * - Type guard runtime (isBadge/isOrario) per cio' che i template type non validano.
 * - Template literal type: `UP-${number}`, `${number}:${number}` (prefisso, non cifre).
 * - EntityOf/IdOf con infer: estraggono T e ID dal tipo del repository.
 * - Mapped types: ReadonlyEntity, KeysByType (rimappa chiavi con `as`).
 * - Discriminated union + exhaustiveness check (const _:never).
 * - Distributivita conditional types e come spegnerla con [T] extends [U].
 * - Equal<A,B>/Expect<T extends true>: assertion a livello di tipo.
 * - GOTCHA: patch vuoto, template non conta cifre, distributivita, undefined vs null, cast as T.
 * - Compila con: tsc --strict --target ES2022 --lib ES2022,DOM --noEmit 092_TS_ADV_Repository_Pattern.ts
 */
