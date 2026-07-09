/**
 * 091_TS_ADV_Dependency_Injection.ts
 * File 91 - ADV Dependency Injection (DI)
 *
 * Dependency Injection (DI) manuale e TYPE-SAFE in TypeScript, senza decorator
 * ne' librerie (experimentalDecorators=FALSE). Costruiamo: interface+impl,
 * token tipizzati, un container semplice ma tipizzato, e iniettiamo i Repository
 * dentro i Service del dominio ERP Polyuretech (Dipendente, Timbratura, Reparto).
 * Focus type-system: inferenza dei generics, mapping token->tipo, distributivita',
 * literal narrowing dei ruoli, e i tranelli (pitfalls) tipici del pattern.
 */

export {}; // isola lo scope del modulo (evita collisioni di nomi globali)

/* =========================================================================
   0) DOMINIO ERP - tipi base (tutti definiti QUI, nessun import esterno)
   ========================================================================= */

// Ruoli come union di literal: il narrowing tiene traccia del valore esatto.
export type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
export type Turno = "P4" | "P2" | "STD";

// Badge e orario sono string a runtime; i "branded pattern" (UP-001, HH:MM)
// non sono validabili SOLO col type system, quindi validiamo a runtime piu' sotto.
export interface Dipendente {
  readonly id: number;
  nome: string;
  badge: string; // atteso /^UP-\d{3}$/  es. "UP-001"
  ruolo: Ruolo;
  repartoId: number;
}

export interface Timbratura {
  readonly id: number;
  dipendenteId: number;
  entrata: string; // "HH:MM" naive-UTC, es. "08:00"
  uscita: string | null; // null = ancora dentro
  turno: Turno;
}

export interface Reparto {
  readonly id: number;
  nome: string;
}

/* =========================================================================
   1) INTERFACE + IMPL - la base della DI
   Dipendiamo da ASTRAZIONI (interface), non da implementazioni concrete.
   ========================================================================= */

// Un Repository generico: contratto minimo CRUD-read tipizzato su T.
export interface Repository<T extends { id: number }> {
  getById(id: number): T | undefined;
  getAll(): readonly T[];
}

// Impl concreta in-memory per i Dipendenti.
export class InMemoryDipendenteRepo implements Repository<Dipendente> {
  // seed minimale coerente coi pattern del dominio
  private readonly data: Dipendente[] = [
    { id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Operatore", repartoId: 10 },
    { id: 2, nome: "Bianchi", badge: "UP-002", ruolo: "Admin", repartoId: 10 },
  ];
  getById(id: number): Dipendente | undefined {
    return this.data.find((d) => d.id === id);
  }
  getAll(): readonly Dipendente[] {
    return this.data;
  }
}

// Impl in-memory per le Timbrature (aggiunge un metodo specifico oltre al contratto).
export class InMemoryTimbraturaRepo implements Repository<Timbratura> {
  private readonly data: Timbratura[] = [
    { id: 1, dipendenteId: 1, entrata: "08:00", uscita: "17:00", turno: "STD" },
    { id: 2, dipendenteId: 1, entrata: "22:00", uscita: null, turno: "P4" },
  ];
  getById(id: number): Timbratura | undefined {
    return this.data.find((t) => t.id === id);
  }
  getAll(): readonly Timbratura[] {
    return this.data;
  }
  // metodo extra: non fa parte di Repository<T>, ma esiste sull'impl concreta.
  byDipendente(depId: number): readonly Timbratura[] {
    return this.data.filter((t) => t.dipendenteId === depId);
  }
}

/* =========================================================================
   2) TOKEN TIPIZZATI - il cuore della type-safety del container
   Problema: una Map<string, unknown> perde il tipo. Vogliamo che il token
   "sappia" quale tipo restituira' la resolve(). Usiamo un phantom type.
   ========================================================================= */

// Il campo __type non esiste a runtime (lo assegniamo con un cast): serve SOLO
// a "trasportare" T dentro il tipo del token. Questo si chiama PHANTOM TYPE.
export interface Token<T> {
  readonly key: symbol;
  readonly desc: string;
  readonly __type?: T; // phantom: mai valorizzato davvero
}

// Factory di token: cattura T e crea un symbol univoco (chiave stabile e unica).
export function createToken<T>(desc: string): Token<T> {
  return { key: Symbol(desc), desc };
}

// Token del dominio. Il tipo generico e' l'ASTRAZIONE (interface), non l'impl.
export const TOKENS = {
  DipendenteRepo: createToken<Repository<Dipendente>>("DipendenteRepo"),
  TimbraturaRepo: createToken<InMemoryTimbraturaRepo>("TimbraturaRepo"),
  RepartoRepo: createToken<Repository<Reparto>>("RepartoRepo"),
} as const;

// Estrarre il tipo trasportato da un Token<T>: helper type-level.
export type Resolved<Tk> = Tk extends Token<infer T> ? T : never;
// perche' funziona: `infer T` cattura l'argomento del Token nel ramo condizionale.
type _R1 = Resolved<typeof TOKENS.DipendenteRepo>; // = Repository<Dipendente>
type _R2 = Resolved<typeof TOKENS.TimbraturaRepo>; // = InMemoryTimbraturaRepo

/* =========================================================================
   3) CONTAINER SEMPLICE ma TIPIZZATO
   register(token, factory) -> resolve(token) restituisce il tipo giusto.
   ========================================================================= */

// Una factory riceve il container (per risolvere dipendenze) e ritorna T.
export type Provider<T> = (c: Container) => T;

export class Container {
  // Registri interni: chiave = symbol del token. I valori sono "unknown" a runtime,
  // ma i METODI pubblici sono generici e ricostruiscono il tipo T dal Token<T>.
  private readonly providers = new Map<symbol, Provider<unknown>>();
  private readonly singletons = new Map<symbol, unknown>();

  // register: lega un token alla sua factory. Il generic <T> allinea token e provider,
  // quindi passare una factory che ritorna un tipo incompatibile e' un ERRORE TS.
  register<T>(token: Token<T>, provider: Provider<T>): this {
    this.providers.set(token.key, provider as Provider<unknown>);
    return this; // ritorna this per il chaining fluente
  }

  // value: helper per registrare un'istanza gia' pronta (constant provider).
  value<T>(token: Token<T>, instance: T): this {
    return this.register(token, () => instance);
  }

  // resolve: crea (o riusa) l'istanza. Il ritorno e' T grazie a Token<T>.
  // Singleton: la prima resolve costruisce, le successive riusano la cache.
  resolve<T>(token: Token<T>): T {
    const cached = this.singletons.get(token.key);
    if (cached !== undefined) return cached as T;

    const provider = this.providers.get(token.key);
    if (!provider) {
      // fail-fast: dipendenza non registrata. Il messaggio usa la desc leggibile.
      throw new Error(`Provider non registrato per token: ${token.desc}`);
    }
    const instance = provider(this) as T;
    this.singletons.set(token.key, instance);
    return instance;
  }

  // has: utile per test / fallback condizionali.
  has<T>(token: Token<T>): boolean {
    return this.providers.has(token.key);
  }
}

/* =========================================================================
   4) SERVICE ERP con dipendenze INIETTATE via costruttore
   La constructor injection e' la forma piu' testabile: il service non sa
   COME nascono i repo, riceve solo le astrazioni.
   ========================================================================= */

// Service che dipende SOLO dall'astrazione Repository<Dipendente>.
export class DipendenteService {
  // dependency injection "manuale": il repo arriva dal costruttore.
  constructor(private readonly repo: Repository<Dipendente>) {}

  trovaPerBadge(badge: string): Dipendente | undefined {
    return this.repo.getAll().find((d) => d.badge === badge);
  }

  // narrowing sul literal ruolo: TS restringe il tipo del confronto.
  soloAdmin(): readonly Dipendente[] {
    return this.repo
      .getAll()
      .filter((d) => d.ruolo === "Admin" || d.ruolo === "SuperAdmin");
  }
}

// Service timbrature: dipende dall'IMPL concreta perche' usa byDipendente().
// (Scelta di design: se volessimo l'astrazione, byDipendente andrebbe nel contratto.)
export class TimbraturaService {
  constructor(
    private readonly timbrature: InMemoryTimbraturaRepo,
    private readonly dipendenti: Repository<Dipendente>,
  ) {}

  // timbrature "aperte" (uscita === null) di un badge dato.
  aperteDelBadge(badge: string): readonly Timbratura[] {
    const dip = this.dipendenti.getAll().find((d) => d.badge === badge);
    if (!dip) return [];
    return this.timbrature.byDipendente(dip.id).filter((t) => t.uscita === null);
  }
}

/* =========================================================================
   5) WIRING - montare il grafo delle dipendenze nel container
   ========================================================================= */

// Token dei SERVICE (dipendono dai token dei repo).
export const SERVICE_TOKENS = {
  DipendenteService: createToken<DipendenteService>("DipendenteService"),
  TimbraturaService: createToken<TimbraturaService>("TimbraturaService"),
} as const;

export function buildContainer(): Container {
  const c = new Container();

  // Repo: registriamo le impl concrete sotto i token delle astrazioni.
  c.register(TOKENS.DipendenteRepo, () => new InMemoryDipendenteRepo());
  c.register(TOKENS.TimbraturaRepo, () => new InMemoryTimbraturaRepo());

  // Service: la factory RISOLVE le dipendenze dal container -> grafo esplicito.
  c.register(
    SERVICE_TOKENS.DipendenteService,
    (cc) => new DipendenteService(cc.resolve(TOKENS.DipendenteRepo)),
  );
  c.register(
    SERVICE_TOKENS.TimbraturaService,
    (cc) =>
      new TimbraturaService(
        cc.resolve(TOKENS.TimbraturaRepo), // InMemoryTimbraturaRepo (impl concreta)
        cc.resolve(TOKENS.DipendenteRepo), // Repository<Dipendente> (astrazione)
      ),
  );

  return c;
}

// Uso: il tipo di ritorno di resolve e' inferito dal token, niente cast lato client.
const container = buildContainer();
const depSvc = container.resolve(SERVICE_TOKENS.DipendenteService); // : DipendenteService
const timSvc = container.resolve(SERVICE_TOKENS.TimbraturaService); // : TimbraturaService

const rossi = depSvc.trovaPerBadge("UP-001"); // : Dipendente | undefined
const aperte = timSvc.aperteDelBadge("UP-001"); // : readonly Timbratura[]
// => aperte contiene la timbratura id:2 (turno P4, uscita null)

/* =========================================================================
   6) TEST DI TIPO - Equal / Expect (pattern type-level classico)
   Verifica a compile-time che il container preservi i tipi.
   ========================================================================= */

// Equal usa la trickery delle funzioni generiche: due condizionali identici
// sono uguali SOLO se X e Y sono lo stesso tipo (invarianza sui parametri).
export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
    ? true
    : false;

// Expect accetta SOLO true: se la condizione e' false -> ERRORE TS in questa riga.
export type Expect<T extends true> = T;

// I tipi risolti devono corrispondere ai token registrati:
type _t1 = Expect<Equal<ReturnType<Container["resolve"]>, unknown>>;
// nota: resolve senza argomento concreto -> T non vincolato collassa a unknown.

type _t2 = Expect<
  Equal<Resolved<typeof TOKENS.DipendenteRepo>, Repository<Dipendente>>
>; // true
type _t3 = Expect<
  Equal<Resolved<typeof SERVICE_TOKENS.TimbraturaService>, TimbraturaService>
>; // true

// Verifica che il ruolo dopo filtro resti Ruolo (non si allarga a string):
type _t4 = Expect<Equal<Dipendente["ruolo"], Ruolo>>; // true

/* =========================================================================
   7) DI FUNZIONALE - alternativa senza classi (higher-order factory)
   A volte non serve un container: basta iniettare dipendenze come argomenti.
   ========================================================================= */

// Factory che "chiude" (closure) sulle dipendenze e ritorna un oggetto-service.
export function makeReportService(deps: {
  dipendenti: Repository<Dipendente>;
  timbrature: InMemoryTimbraturaRepo;
}) {
  return {
    // ore totali "grezze" per badge (semplificato: differenza HH:MM in minuti)
    minutiLavoratiBadge(badge: string): number {
      const dip = deps.dipendenti.getAll().find((d) => d.badge === badge);
      if (!dip) return 0;
      return deps.timbrature
        .byDipendente(dip.id)
        .filter((t): t is Timbratura & { uscita: string } => t.uscita !== null)
        .reduce((acc, t) => acc + diffMinuti(t.entrata, t.uscita), 0);
    },
  };
}

// helper puro: "HH:MM" -> minuti; poi differenza. Nessuna dipendenza da iniettare.
function toMinuti(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function diffMinuti(entrata: string, uscita: string): number {
  return toMinuti(uscita) - toMinuti(entrata);
}

const reportSvc = makeReportService({
  dipendenti: new InMemoryDipendenteRepo(),
  timbrature: new InMemoryTimbraturaRepo(),
});
const minuti = reportSvc.minutiLavoratiBadge("UP-001"); // : number => 540 (08:00->17:00)

/* =========================================================================
   8) GOTCHA / PITFALLS - trappole comuni della DI tipizzata
   ========================================================================= */

// --- PITFALL 1: token senza generic esplicito -> T collassa a unknown ---
// const t = createToken("Qualcosa");            // Token<unknown>
// const x = container.resolve(t);               // x: unknown -> inutilizzabile
// SOLUZIONE: SEMPRE createToken<TipoAtteso>("...") per fissare T.

// --- PITFALL 2: registrare una factory che ritorna il tipo sbagliato ---
// c.register(TOKENS.DipendenteRepo, () => new InMemoryTimbraturaRepo());
// ERRORE TS: InMemoryTimbraturaRepo non e' assegnabile a Repository<Dipendente>
//   (mancano/differiscono i membri: getById ritorna Timbratura, non Dipendente).
// Il generic <T> di register allinea token e provider: e' la rete di sicurezza.

// --- PITFALL 3: dipendenza circolare a runtime ---
// Se A dipende da B e B dipende da A, la resolve() ricorsiva va in loop / stack.
// Il type system NON lo previene (i tipi sono ok). SOLUZIONE: spezzare il ciclo
// con lazy injection: passare "() => c.resolve(TOKEN_B)" invece dell'istanza.
export type Lazy<T> = () => T; // token risolto pigramente per rompere i cicli

// --- PITFALL 4: usare `any` per il container -> perdi TUTTA la type-safety ---
// function bad(c: any) { return c.resolve(TOKENS.DipendenteRepo); } // ritorna any
// SOLUZIONE: tipizzare sempre il parametro come Container.

// --- PITFALL 5: confondere impl e astrazione nei token ---
// Se il token e' Repository<Dipendente>, il metodo extra byDipendente() NON e'
// visibile anche se l'impl ce l'ha:
// const repoAstratto = container.resolve(TOKENS.DipendenteRepo);
// repoAstratto.byDipendente(1);
// ERRORE TS: Property 'byDipendente' does not exist on type 'Repository<Dipendente>'.
// SOLUZIONE: se ti serve il metodo, tipizza il token sull'impl concreta
// (come TimbraturaRepo) oppure aggiungi il metodo al contratto Repository.

/* =========================================================================
   9) ESEMPIO: OVERRIDE per i TEST (perche' la DI e' cosi' potente)
   In test iniettiamo un fake repo: il service non cambia di una riga.
   ========================================================================= */

// Fake repo che implementa l'astrazione con dati controllati dal test.
export class FakeDipendenteRepo implements Repository<Dipendente> {
  constructor(private readonly rows: Dipendente[]) {}
  getById(id: number): Dipendente | undefined {
    return this.rows.find((d) => d.id === id);
  }
  getAll(): readonly Dipendente[] {
    return this.rows;
  }
}

export function buildTestContainer(): Container {
  const c = buildContainer();
  // override: ri-registro lo stesso token con la fake. Nota: se la singleton fosse
  // gia' stata risolta, la cache la conserverebbe -> qui il container e' "fresco".
  c.register(
    TOKENS.DipendenteRepo,
    () =>
      new FakeDipendenteRepo([
        { id: 99, nome: "TEST", badge: "UP-999", ruolo: "SuperAdmin", repartoId: 1 },
      ]),
  );
  return c;
}

const testC = buildTestContainer();
const testSvc = new DipendenteService(testC.resolve(TOKENS.DipendenteRepo));
const testDip = testSvc.trovaPerBadge("UP-999"); // : Dipendente | undefined => {id:99,...}

/* =========================================================================
   10) VALIDAZIONE runtime dei pattern di dominio (i tipi non bastano)
   badge /^UP-\d{3}$/ e orario /^\d{2}:\d{2}$/ sono vincoli RUNTIME.
   ========================================================================= */

const RE_BADGE = /^UP-\d{3}$/;
const RE_ORARIO = /^\d{2}:\d{2}$/;

// type guard: restringe string -> string valido come badge (branded via guard).
export function isBadge(s: string): boolean {
  return RE_BADGE.test(s);
}
export function isOrario(s: string): boolean {
  return RE_ORARIO.test(s);
}
// esempio: isBadge("UP-001") => true ; isBadge("X-1") => false
// esempio: isOrario("08:00") => true ; isOrario("8:0") => false

/* =========================================================================
   RIEPILOGO COMANDI / CONCETTI
   - interface Repository<T>: dipendere da ASTRAZIONI, non da impl concrete.
   - createToken<T>(desc): Token<T> con symbol univoco + phantom type __type.
   - Resolved<Tk>: estrae T da Token<T> con `infer` in un conditional type.
   - Container: register(token, provider) / value / resolve / has, singleton cache.
   - Provider<T> = (c: Container) => T: factory che risolve le dipendenze.
   - constructor injection: il service riceve le astrazioni, massima testabilita'.
   - wiring: buildContainer() monta il grafo; resolve() infersce il tipo dal token.
   - DI funzionale: higher-order factory con closure sulle deps (senza classi).
   - Equal<X,Y> / Expect<T extends true>: test di tipo a compile-time.
   - Override in test: ri-registra lo stesso token con una Fake impl.
   - Lazy<T> = () => T: rompe le dipendenze circolari (lazy injection).
   - PITFALLS: token senza generic (unknown), factory tipo errato, cicli runtime,
     `any` che azzera la type-safety, confondere impl vs astrazione nel token.
   - Validazione runtime: /^UP-\d{3}$/ e /^\d{2}:\d{2}$/ NON sono esprimibili nei tipi.
   ========================================================================= */
