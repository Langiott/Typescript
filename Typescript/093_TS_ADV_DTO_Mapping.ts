/**
 * 093_TS_ADV_DTO_Mapping.ts
 * File 093 - ADV: DTO mapping typed (spunto ERP Polyuretech)
 * Argomento: separazione Entity vs DTO, mapper tipizzati toDTO/fromDTO,
 * Pick/Omit per CreateDTO e UpdateDTO, conversione date naive-UTC "HH:MM" -> string.
 * Mostriamo il PATTERN (repository -> mapper -> DTO), non un framework specifico.
 * Tutto compila con: tsc --strict --target ES2022 --lib ES2022,DOM --noEmit
 */

// ============================================================================
// 0) HELPER DI TEST DI TIPO (Equal / Expect) - livello type-level
// ============================================================================
// Equal<A, B> usa il trucco dei "conditional type identici": due funzioni
// generiche sono assegnabili solo se A e B sono lo STESSO tipo (invarianza).
// Serve per asserire a compile-time che un mapper produca il tipo atteso.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect accetta solo il literal 'true': se Equal fallisce -> errore di tipo.
type Expect<T extends true> = T;

// Prettify: forza il compiler a "srotolare" un tipo intersezione/mapped in un
// oggetto piatto, cosi' negli hover si vedono le proprieta' invece di Pick<...>.
type Prettify<T> = { [K in keyof T]: T[K] } & {};

// ============================================================================
// 1) ENTITY: il modello "di dominio / persistenza"
// ============================================================================
// L'Entity rappresenta la riga cosi' come vive nel layer dati (DB/Prisma).
// Contiene campi tecnici (id numerico, timestamp Date, flag interni) che
// NON vogliamo esporre grezzi verso l'esterno (API/frontend).

// Union chiuse di dominio: ruoli e turni Polyuretech.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

// Nota: nella Entity le date sono oggetti Date (naive-UTC lato server UTC).
interface DipendenteEntity {
  id: number;                 // PK tecnica, mai esposta come tale al client
  badge: string;              // formato "UP-001"
  nome: string;
  cognome: string;
  ruolo: Ruolo;
  turno: Turno;
  repartoId: number;          // FK verso Reparto
  attivo: boolean;            // flag interno soft-delete
  createdAt: Date;            // timestamp tecnico
  updatedAt: Date;            // timestamp tecnico
  passwordHash: string;       // MAI esporre nel DTO
}

// ============================================================================
// 2) DTO: il modello "di trasporto" verso il client
// ============================================================================
// Il DTO (Data Transfer Object) e' la forma che attraversa il confine
// di rete: niente segreti, date serializzate come string, nomi "friendly".
interface DipendenteDTO {
  id: number;
  badge: string;              // "UP-001"
  nomeCompleto: string;       // derivato: nome + cognome (non esiste nell'Entity)
  ruolo: Ruolo;
  turno: Turno;
  repartoId: number;
  // Nessun passwordHash, nessun createdAt/updatedAt grezzi, nessun 'attivo'.
}

// ============================================================================
// 3) MAPPER toDTO: Entity -> DTO (tipizzato, totale)
// ============================================================================
// Il mapper e' una funzione pura: Entity in, DTO out. La firma esplicita
// garantisce che se cambia il DTO il compiler ci obbliga ad aggiornare qui.
function toDTO(e: DipendenteEntity): DipendenteDTO {
  return {
    id: e.id,
    badge: e.badge,
    nomeCompleto: `${e.nome} ${e.cognome}`, // campo derivato
    ruolo: e.ruolo,
    turno: e.turno,
    repartoId: e.repartoId,
    // passwordHash NON copiato -> excess property check impedisce di aggiungerlo
  };
}

// Esempio d'uso del mapper:
const _entitySample: DipendenteEntity = {
  id: 1,
  badge: "UP-001",
  nome: "Mario",
  cognome: "Rossi",
  ruolo: "Operatore",
  turno: "P4",
  repartoId: 3,
  attivo: true,
  createdAt: new Date("2026-01-01T08:00:00Z"),
  updatedAt: new Date("2026-01-02T08:00:00Z"),
  passwordHash: "argon2id$....",
};
const _dtoSample = toDTO(_entitySample);
// _dtoSample.nomeCompleto === "Mario Rossi"
// _dtoSample.passwordHash  -> // ERRORE TS: Property 'passwordHash' does not exist on type 'DipendenteDTO'.

// ============================================================================
// 4) CreateDTO con Omit: cosa il client PUO' inviare in creazione
// ============================================================================
// In creazione il client NON manda id/timestamp/flag interni: li genera il
// server. Modelliamo questo con Omit sui campi "server-owned".
// Omit<T, K> = Pick<T, Exclude<keyof T, K>>: rimuove le chiavi in K.
type CreateDipendenteDTO = Prettify<
  Omit<DipendenteEntity, "id" | "createdAt" | "updatedAt" | "attivo" | "passwordHash">
>;
// Risultato: { badge; nome; cognome; ruolo; turno; repartoId } + password ??? no.
// Il client manda la password in chiaro come campo separato, non l'hash:
type CreateDipendenteInput = Prettify<CreateDipendenteDTO & { password: string }>;

// Verifica type-level: CreateDipendenteDTO ha esattamente 6 chiavi attese.
type _KeysCreate = keyof CreateDipendenteDTO;
type _CheckCreate = Expect<
  Equal<_KeysCreate, "badge" | "nome" | "cognome" | "ruolo" | "turno" | "repartoId">
>;

// ============================================================================
// 5) UpdateDTO con Partial<Omit<...>>: tutti i campi opzionali (PATCH)
// ============================================================================
// In update (PATCH) il client puo' mandare un sottoinsieme dei campi
// modificabili. Partial<T> rende ogni proprieta' opzionale (aggiunge '?').
// Escludiamo id (nella URL) e i campi immutabili/server-owned.
type UpdateDipendenteDTO = Prettify<
  Partial<Omit<DipendenteEntity, "id" | "createdAt" | "updatedAt" | "passwordHash">>
>;
// tipo: { badge?; nome?; cognome?; ruolo?; turno?; repartoId?; attivo? }

// Perche' Partial<Omit<...>> e non Omit<Partial<...>>? Sono equivalenti in
// output qui, ma l'ordine conta per la leggibilita': prima decidi QUALI campi
// (Omit), poi rendili opzionali (Partial). L'inversione funziona lo stesso.
type _UpdOrderA = Partial<Omit<DipendenteEntity, "passwordHash">>;
type _UpdOrderB = Omit<Partial<DipendenteEntity>, "passwordHash">;
type _CheckOrder = Expect<Equal<_UpdOrderA, _UpdOrderB>>; // true

// ============================================================================
// 6) fromDTO: CreateDipendenteInput -> Entity (parziale, server completa)
// ============================================================================
// fromDTO fa il verso opposto: prende input del client e produce i campi
// dell'Entity che il server salvera'. I campi generati dal server (id auto,
// timestamp) NON sono responsabilita' del mapper: qui restituiamo la parte
// "insertabile". Usiamo Omit<...,"id"> perche' l'id lo assegna il DB.
type DipendenteInsert = Omit<DipendenteEntity, "id">;

// Mock di un hasher: in reale sarebbe argon2/bcrypt. Definito qui, no libs.
function hashPasswordMock(plain: string): string {
  return `argon2id$mock$${plain.length}`;
}

function fromDTO(input: CreateDipendenteInput, now: Date): DipendenteInsert {
  return {
    badge: input.badge,
    nome: input.nome,
    cognome: input.cognome,
    ruolo: input.ruolo,
    turno: input.turno,
    repartoId: input.repartoId,
    attivo: true,                       // default lato server
    createdAt: now,
    updatedAt: now,
    passwordHash: hashPasswordMock(input.password), // hash, mai il plain
  };
}

const _insert = fromDTO(
  {
    badge: "UP-002",
    nome: "Luigi",
    cognome: "Verdi",
    ruolo: "Admin",
    turno: "STD",
    repartoId: 1,
    password: "s3gr3t0",
  },
  new Date("2026-07-08T06:00:00Z"),
);
// _insert.passwordHash === "argon2id$mock$7"
// _insert non ha 'id' -> lo mette il DB in fase di insert.

// ============================================================================
// 7) DATE naive-UTC "HH:MM" -> string: il caso Timbratura
// ============================================================================
// Regola Polyuretech (dalla memoria progetto): gli orari sono naive-UTC,
// formato "HH:MM". Nel layer dati puo' arrivare come Date; nel DTO va SEMPRE
// serializzato in string "HH:MM" per evitare ambiguita' di fuso lato client.

// Branded type per l'orario: string nominale che dichiara "questa e' HH:MM".
// Il brand (& { __brand }) impedisce di passare una string qualsiasi dove
// serve un OrarioHHMM, senza costo a runtime (e' solo type-level).
type OrarioHHMM = string & { readonly __brand: "OrarioHHMM" };

const ORARIO_RE = /^\d{2}:\d{2}$/;

// Type guard: verifica il pattern e restringe (narrowing) a OrarioHHMM.
function isOrarioHHMM(s: string): s is OrarioHHMM {
  return ORARIO_RE.test(s);
}

// Costruttore validante: unico modo "lecito" di creare un OrarioHHMM.
function toOrarioHHMM(s: string): OrarioHHMM {
  if (!isOrarioHHMM(s)) {
    throw new Error(`Orario non valido (atteso HH:MM): ${s}`);
  }
  return s; // qui s e' gia' ristretto a OrarioHHMM dal guard
}

// Conversione Date naive-UTC -> "HH:MM". Usiamo getUTC* perche' il server e'
// UTC e gli orari sono naive: NON usare getHours() (userebbe il fuso locale).
function dateToOrarioHHMM(d: Date): OrarioHHMM {
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return toOrarioHHMM(`${hh}:${mm}`);
}
// dateToOrarioHHMM(new Date("2026-07-08T06:05:00Z")) === "06:05"

// Entity e DTO della Timbratura:
interface TimbraturaEntity {
  id: number;
  dipendenteId: number;
  entrata: Date;              // naive-UTC lato server
  uscita: Date | null;        // null = timbratura ancora aperta
}

interface TimbraturaDTO {
  id: number;
  dipendenteId: number;
  entrata: OrarioHHMM;        // "HH:MM"
  uscita: OrarioHHMM | null;  // null resta null nel trasporto
}

// Mapper Timbratura: nota la gestione di 'uscita' nullable con ternario.
function timbraturaToDTO(e: TimbraturaEntity): TimbraturaDTO {
  return {
    id: e.id,
    dipendenteId: e.dipendenteId,
    entrata: dateToOrarioHHMM(e.entrata),
    uscita: e.uscita === null ? null : dateToOrarioHHMM(e.uscita),
  };
}

const _timbEntity: TimbraturaEntity = {
  id: 10,
  dipendenteId: 1,
  entrata: new Date("2026-07-08T06:00:00Z"),
  uscita: null,
};
const _timbDTO = timbraturaToDTO(_timbEntity);
// _timbDTO.entrata === "06:00", _timbDTO.uscita === null

// ============================================================================
// 8) MAPPER GENERICO type-level: Mapper<E, D> e mapArray
// ============================================================================
// Un Mapper e' semplicemente (e: E) => D. Tipizzarlo cosi' rende i mapper
// componibili e testabili. mapArray applica un mapper a una lista, preservando
// i tipi: input E[] -> output D[] (nessun any di mezzo).
type Mapper<E, D> = (entity: E) => D;

function mapArray<E, D>(items: readonly E[], mapper: Mapper<E, D>): D[] {
  return items.map(mapper);
}

const _lista = mapArray([_entitySample], toDTO);
// tipo: DipendenteDTO[] - inferito da toDTO senza annotazioni extra

// Verifica type-level che toDTO sia un Mapper<DipendenteEntity, DipendenteDTO>:
type _CheckMapper = Expect<Equal<typeof toDTO, Mapper<DipendenteEntity, DipendenteDTO>>>;

// ============================================================================
// 9) ESEMPIO ERP realistico: Repository con DTO in/out
// ============================================================================
// Simuliamo un repository (mock, nessuna lib/DB reale) che espone solo DTO
// verso l'esterno ma lavora con Entity all'interno. Questo e' il pattern:
// il confine del repository e' anche il confine Entity<->DTO.
interface DipendenteRepository {
  findById(id: number): DipendenteDTO | null;
  create(input: CreateDipendenteInput): DipendenteDTO;
  patch(id: number, patch: UpdateDipendenteDTO): DipendenteDTO | null;
}

// Implementazione in-memory (solo per illustrare il flusso di mapping).
function makeRepo(seed: DipendenteEntity[]): DipendenteRepository {
  const store = new Map<number, DipendenteEntity>();
  let nextId = 1;
  for (const e of seed) {
    store.set(e.id, e);
    nextId = Math.max(nextId, e.id + 1);
  }

  return {
    findById(id) {
      const e = store.get(id);
      return e ? toDTO(e) : null; // out: sempre DTO
    },
    create(input) {
      const insert = fromDTO(input, new Date()); // in: DTO -> Entity insert
      const entity: DipendenteEntity = { id: nextId++, ...insert };
      store.set(entity.id, entity);
      return toDTO(entity);       // ritorna DTO
    },
    patch(id, patch) {
      const cur = store.get(id);
      if (!cur) return null;
      // Merge tipizzato: le chiavi opzionali del patch sovrascrivono l'Entity.
      // Spread di UpdateDipendenteDTO su Entity: compatibile perche' ogni campo
      // del patch e' un sottoinsieme di campi dell'Entity con lo stesso tipo.
      const updated: DipendenteEntity = { ...cur, ...patch, updatedAt: new Date() };
      store.set(id, updated);
      return toDTO(updated);
    },
  };
}

const _repo = makeRepo([_entitySample]);
const _found = _repo.findById(1);        // DipendenteDTO | null
const _patched = _repo.patch(1, { turno: "P2" }); // patch solo turno

// ============================================================================
// 10) GOTCHA / PITFALLS
// ============================================================================

// --- GOTCHA 1: excess property check NON scatta su variabili gia' tipate ---
// L'object literal diretto viene controllato per proprieta' in eccesso;
// una variabile intermedia no (structural typing "freshness" persa).
const _extraLiteral: DipendenteDTO = {
  id: 1, badge: "UP-001", nomeCompleto: "A B", ruolo: "Admin",
  turno: "STD", repartoId: 1,
  // segreto: "x",  // ERRORE TS: Object literal may only specify known properties.
};
const _dirty = { ...(_extraLiteral as DipendenteDTO), segreto: "x" };
const _leaked: DipendenteDTO = _dirty; // NON errore: 'segreto' passa inosservato!
// Lezione: costruisci i DTO SOLO nel mapper, mai con spread da fonti larghe.

// --- GOTCHA 2: Partial nasconde i campi mancanti come 'undefined' ---
// Con exactOptionalPropertyTypes OFF (default), turno?: Turno accetta undefined.
const _badPatch: UpdateDipendenteDTO = { turno: undefined };
// A runtime { ...cur, turno: undefined } SOVRASCRIVE turno con undefined!
// Il tipo Entity.turno e' Turno (non undefined) ma lo spread lo accetta a
// runtime -> bug silenzioso. Soluzione: filtrare le chiavi undefined nel merge:
function applyPatch(cur: DipendenteEntity, patch: UpdateDipendenteDTO): DipendenteEntity {
  const clean: UpdateDipendenteDTO = {};
  for (const k of Object.keys(patch) as (keyof UpdateDipendenteDTO)[]) {
    if (patch[k] !== undefined) {
      // assegnazione per-chiave: serve un cast controllato per l'index write
      (clean as Record<string, unknown>)[k] = patch[k];
    }
  }
  return { ...cur, ...clean, updatedAt: new Date() };
}

// --- GOTCHA 3: Omit non e' distributivo sulle union ---
// Se E fosse una union, Omit<E, K> opera sulle CHIAVI COMUNI, non su ogni
// membro separatamente. Per distribuire serve un helper.
type DistributiveOmit<T, K extends PropertyKey> =
  T extends unknown ? Omit<T, K> : never;
type _UnionEntity =
  | { kind: "a"; id: number; x: string }
  | { kind: "b"; id: number; y: number };
type _NaiveOmit = Omit<_UnionEntity, "id">;        // perde x e y (solo 'kind')
type _DistOmit = DistributiveOmit<_UnionEntity, "id">; // conserva x/y per ramo
// _DistOmit = { kind:"a"; x:string } | { kind:"b"; y:number }

// --- GOTCHA 4: string vs OrarioHHMM (brand) va costruito, non castato ---
// const _wrong: OrarioHHMM = "9:5";  // ERRORE TS: manca __brand, string non e' OrarioHHMM
const _right: OrarioHHMM = toOrarioHHMM("09:05"); // ok, passa dalla validazione
// Non aggirare con "as": const x = "abc" as OrarioHHMM salterebbe il regex.

// ============================================================================
// 11) EXPORT locali (solo simboli definiti in questo file)
// ============================================================================
export {
  toDTO,
  fromDTO,
  timbraturaToDTO,
  dateToOrarioHHMM,
  toOrarioHHMM,
  isOrarioHHMM,
  mapArray,
  makeRepo,
  applyPatch,
  hashPasswordMock,
};
export type {
  Ruolo,
  Turno,
  DipendenteEntity,
  DipendenteDTO,
  CreateDipendenteDTO,
  CreateDipendenteInput,
  UpdateDipendenteDTO,
  DipendenteInsert,
  TimbraturaEntity,
  TimbraturaDTO,
  OrarioHHMM,
  Mapper,
  DistributiveOmit,
  Prettify,
  Equal,
  Expect,
};

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
// - Entity vs DTO: Entity = persistenza/dominio; DTO = trasporto (no segreti).
// - toDTO(Entity)->DTO: mapper puro, campi derivati (nomeCompleto), niente hash.
// - fromDTO(Input)->Insert: verso inverso, server aggiunge default/timestamp.
// - Omit<T,K>: rimuove chiavi (id/timestamp/passwordHash) per CreateDTO.
// - Pick<T,K>: seleziona chiavi (base di Omit).
// - Partial<Omit<...>>: UpdateDTO/PATCH, tutti i campi opzionali.
// - Prettify<T>: srotola mapped/intersection per hover leggibili.
// - Equal/Expect: asserzioni di tipo a compile-time (Expect<Equal<...>>).
// - Mapper<E,D> + mapArray: mapper componibili, tipi preservati sulle liste.
// - Date naive-UTC -> "HH:MM": usa getUTC* (server UTC), MAI getHours().
// - Branded type OrarioHHMM: string nominale + type guard + costruttore validante.
// - Repository pattern: confine Entity<->DTO, dentro Entity, fuori solo DTO.
// - GOTCHA: excess property check solo su literal fresh; Partial+undefined
//   sovrascrive a runtime (filtra le chiavi); Omit non distribuisce sulle union
//   (usa DistributiveOmit); brand va costruito con validazione, non castato.
