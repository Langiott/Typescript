/**
 * 088_TS_ADV_Async_Patterns.ts
 * Argomento: ADV Async patterns typed (async patterns tipizzati).
 * Copriamo: Promise.all/allSettled/race tipizzati, Awaited<T> e la sua
 * ricorsione, concorrenza limitata (pool), retry tipizzato con backoff,
 * fetch multiplo mock. Focus sui meccanismi del type system: inferenza
 * su tuple, distributivita', unwrap ricorsivo delle Promise, control flow.
 * Dominio: ERP Polyuretech (Dipendente, Timbratura, Reparto, Repository).
 */

// =============================================================
// 0) HELPER DI TEST DI TIPO (type-level)
// =============================================================

// Equal<A,B>: true solo se A e B sono lo STESSO tipo. Il trucco dei due
// generici condizionali confrontati forza TS a valutare l'identita' esatta
// (piu' stretto di A extends B), perche' due funzioni condizionali sono
// assegnabili solo se i loro rami coincidono per ogni input.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect<T>: compila solo se T e' esattamente true -> asserzione di tipo.
type Expect<T extends true> = T;

// Esempio d'uso: se cambiassimo il tipo a destra il file NON compilerebbe.
type _t0 = Expect<Equal<number, number>>; // ok
// ERRORE TS: Type 'false' does not satisfy the constraint 'true'.
// type _tErr = Expect<Equal<number, string>>;

// =============================================================
// 1) MODELLO ERP (mock, definito localmente)
// =============================================================

// Nessuna libreria esterna: questi tipi imitano le entita' del gestionale.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";
type Badge = `UP-${number}`; // template literal, es. "UP-001"
type OrarioHHMM = `${number}:${number}`; // es. "08:30" (naive-UTC)

interface Dipendente {
  readonly id: number;
  nome: string;
  badge: Badge;
  ruolo: Ruolo;
  reparto: string;
}

interface Timbratura {
  dipendenteId: number;
  entrata: OrarioHHMM;
  uscita: OrarioHHMM | null;
  turno: Turno;
}

interface Reparto {
  codice: string;
  nome: string;
  capienza: number;
}

// =============================================================
// 2) Awaited<T>: UNWRAP RICORSIVO DELLE PROMISE
// =============================================================

// Awaited<T> "srotola" una Promise, anche annidata. Internamente e' un tipo
// ricorsivo built-in: se T e' thenable, prende il tipo risolto e ripete.

type A1 = Awaited<Promise<number>>; // number
type A2 = Awaited<Promise<Promise<string>>>; // string (ricorsione)
type A3 = Awaited<Promise<Promise<Promise<Dipendente>>>>; // Dipendente
type A4 = Awaited<number>; // number (non-Promise passa invariato)

// Awaited distribuisce su union: Awaited<Promise<A> | Promise<B>> = A | B.
type A5 = Awaited<Promise<number> | Promise<string>>; // number | string

type _t1 = Expect<Equal<A2, string>>;
type _t2 = Expect<Equal<A5, number | string>>;

// Perche' e' utile: il tipo di ritorno di una funzione async e' Promise<X>,
// ma spesso vogliamo X. Awaited<ReturnType<F>> estrae il valore risolto.
async function caricaDipendente(id: number): Promise<Dipendente> {
  return { id, nome: "Rossi", badge: "UP-001", ruolo: "Operatore", reparto: "P4" };
}

type RisolvedDip = Awaited<ReturnType<typeof caricaDipendente>>; // Dipendente
type _t3 = Expect<Equal<RisolvedDip, Dipendente>>;

// =============================================================
// 3) Promise.all TIPIZZATO: INFERENZA SU TUPLA
// =============================================================

// Con un array-literal "as const"-like (tupla), Promise.all mappa ogni
// elemento sul suo Awaited, preservando la POSIZIONE. La firma lib usa
// { -readonly [P in keyof T]: Awaited<T[P]> } su una tupla.

async function esempioAll(): Promise<void> {
  const dip = caricaDipendente(1); // Promise<Dipendente>
  const conteggio = Promise.resolve(42); // Promise<number>
  const attivo = Promise.resolve(true); // Promise<boolean>

  const risultati = await Promise.all([dip, conteggio, attivo]);
  // tipo inferito: [Dipendente, number, boolean] (tupla posizionale)
  const [d, n, ok] = risultati;
  void d.badge; // ok: d e' Dipendente
  void n.toFixed(); // ok: n e' number
  void ok; // boolean

  // Se passi un array (non tupla), il risultato e' un array unione:
  const lista: Promise<number>[] = [Promise.resolve(1), Promise.resolve(2)];
  const numeri = await Promise.all(lista); // number[]
  void numeri;
}
void esempioAll;

// Utility custom: All<T> che replica la trasformazione a livello di tipo.
type All<T extends readonly unknown[]> = {
  -readonly [P in keyof T]: Awaited<T[P]>;
};

type EsAll = All<[Promise<number>, Promise<string>, boolean]>;
// => [number, string, boolean]
type _t4 = Expect<Equal<EsAll, [number, string, boolean]>>;

// =============================================================
// 4) Promise.allSettled TIPIZZATO
// =============================================================

// allSettled non rigetta mai: ritorna PromiseSettledResult<T>, una union
// discriminata su 'status'. Il discriminant permette il narrowing.

async function esempioAllSettled(): Promise<void> {
  const esiti = await Promise.allSettled([
    caricaDipendente(1), // Promise<Dipendente>
    Promise.reject<never>(new Error("timbratura mancante")),
  ]);
  // tipo: [PromiseSettledResult<Dipendente>, PromiseSettledResult<never>]

  for (const esito of esiti) {
    if (esito.status === "fulfilled") {
      // narrowing: qui esito.value esiste
      void esito.value;
    } else {
      // ramo 'rejected': esiste esito.reason (unknown-ish, tipizzato any)
      void esito.reason;
    }
  }
}
void esempioAllSettled;

// Helper: estrae solo i value dei fulfilled, tipizzati.
function soloRiusciti<T>(esiti: PromiseSettledResult<T>[]): T[] {
  // Type guard inline: filtra e restringe il tipo dell'array risultante.
  return esiti
    .filter((e): e is PromiseFulfilledResult<T> => e.status === "fulfilled")
    .map((e) => e.value);
}

// =============================================================
// 5) Promise.race / Promise.any TIPIZZATI
// =============================================================

// race: risolve/rigetta col PRIMO che si stabilizza. Il tipo e' l'unione
// degli Awaited di tutti gli elementi (non una tupla: non sai chi vince).

async function esempioRace(): Promise<Dipendente | number> {
  const vincitore = await Promise.race([
    caricaDipendente(7), // Promise<Dipendente>
    Promise.resolve(0), // Promise<number>
  ]);
  // tipo: Dipendente | number
  return vincitore;
}
void esempioRace;

// Pattern timeout tipizzato con race: la promise perde se scade il timer.
function conTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`timeout dopo ${ms}ms`)), ms)
  );
  // race<[Promise<T>, Promise<never>]> -> T | never = T
  return Promise.race([p, timer]);
}

// any: risolve col primo FULFILLED; se tutti rigettano lancia AggregateError.
async function esempioAny(): Promise<number> {
  return Promise.any([Promise.reject<number>(1), Promise.resolve(2)]); // number
}
void esempioAny;

// =============================================================
// 6) FETCH MULTIPLO MOCK (repository ERP)
// =============================================================

// Simuliamo un layer di accesso dati senza rete: ritorna Promise risolte
// dopo un micro-delay. Il tipo di ritorno guida tutto il resto.

function delay<T>(valore: T, ms = 0): Promise<T> {
  return new Promise((res) => setTimeout(() => res(valore), ms));
}

const dbDipendenti: Dipendente[] = [
  { id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Operatore", reparto: "P4" },
  { id: 2, nome: "Bianchi", badge: "UP-002", ruolo: "Admin", reparto: "STD" },
  { id: 3, nome: "Verdi", badge: "UP-003", ruolo: "QrDisplay", reparto: "P2" },
];

interface DipendenteRepository {
  findById(id: number): Promise<Dipendente | undefined>;
  findAll(): Promise<Dipendente[]>;
}

const repo: DipendenteRepository = {
  findById: (id) => delay(dbDipendenti.find((d) => d.id === id), 5),
  findAll: () => delay(dbDipendenti.slice(), 5),
};

// Fetch multiplo: carica in parallelo N dipendenti per id. Il risultato e'
// (Dipendente | undefined)[] perche' findById puo' non trovarli.
async function caricaMolti(ids: number[]): Promise<(Dipendente | undefined)[]> {
  return Promise.all(ids.map((id) => repo.findById(id)));
  // ids.map(...) => Promise<Dipendente|undefined>[] -> all -> (Dip|undef)[]
}
void caricaMolti;

// =============================================================
// 7) CONCORRENZA LIMITATA (pool / mapLimit tipizzato)
// =============================================================

// Problema: Promise.all lancia TUTTE le task insieme. Con 10k timbrature
// saturi il DB. Vogliamo al massimo 'limit' task in volo, preservando
// l'ordine dei risultati e la tipizzazione input->output.

async function mapLimit<In, Out>(
  items: readonly In[],
  limit: number,
  worker: (item: In, index: number) => Promise<Out>
): Promise<Out[]> {
  const risultati: Out[] = new Array(items.length);
  let cursore = 0;

  // Ogni "runner" pesca sequenzialmente il prossimo indice libero.
  async function runner(): Promise<void> {
    while (cursore < items.length) {
      const i = cursore++;
      risultati[i] = await worker(items[i]!, i);
    }
  }

  // Avvia min(limit, N) runner in parallelo e aspetta che finiscano tutti.
  const n = Math.min(Math.max(1, limit), items.length);
  const runners = Array.from({ length: n }, () => runner());
  await Promise.all(runners);
  return risultati;
}

// Uso ERP: valida in parallelo (max 2 alla volta) una lista di badge.
async function esempioPool(): Promise<boolean[]> {
  const badges = ["UP-001", "UP-002", "UP-003", "UP-999"];
  const esiti = await mapLimit(badges, 2, async (b) => {
    const found = await repo.findAll();
    return found.some((d) => d.badge === b);
  });
  // tipo: boolean[] (In=string, Out=boolean, inferiti dal worker)
  return esiti;
}
void esempioPool;

type _t5 = Expect<
  Equal<Awaited<ReturnType<typeof esempioPool>>, boolean[]>
>;

// =============================================================
// 8) RETRY TIPIZZATO CON BACKOFF
// =============================================================

// Firma generica: T e' preservato lungo tutta la catena. Le opzioni sono
// tipizzate; onRetry riceve l'errore come unknown (best practice: mai any
// implicito sugli errori catturati).
interface RetryOptions {
  retries: number;
  delayMs: number;
  factor?: number; // backoff esponenziale (default 1 = costante)
  onRetry?: (err: unknown, tentativo: number) => void;
}

async function retry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions
): Promise<T> {
  const { retries, delayMs, factor = 1, onRetry } = opts;
  let ultimoErrore: unknown;

  for (let tentativo = 0; tentativo <= retries; tentativo++) {
    try {
      return await fn(); // successo: T
    } catch (err: unknown) {
      ultimoErrore = err;
      if (tentativo === retries) break; // esauriti i tentativi
      onRetry?.(err, tentativo + 1);
      const attesa = delayMs * Math.pow(factor, tentativo);
      await new Promise((r) => setTimeout(r, attesa));
    }
  }
  // Rilancio con contesto: throw non restringe T, la firma resta Promise<T>.
  throw ultimoErrore;
}

// Uso ERP: recupero timbratura instabile, riprova 3 volte con backoff x2.
async function esempioRetry(): Promise<Timbratura> {
  let colpi = 0;
  return retry(
    async () => {
      colpi++;
      if (colpi < 3) throw new Error("DB lock");
      const t: Timbratura = {
        dipendenteId: 1,
        entrata: "08:00",
        uscita: "17:00",
        turno: "P4",
      };
      return t; // Promise<Timbratura> -> T = Timbratura
    },
    { retries: 5, delayMs: 10, factor: 2, onRetry: (_e, n) => void n }
  );
}
void esempioRetry;

type _t6 = Expect<
  Equal<Awaited<ReturnType<typeof esempioRetry>>, Timbratura>
>;

// =============================================================
// 9) ESEMPIO ERP COMPLETO: report reparto in parallelo + settled
// =============================================================

// Combina i pattern: carica dipendenti (pool), per ognuno costruisci un DTO,
// usa allSettled cosi' un singolo fallimento non abbatte l'intero report.

interface ReportRigaDTO {
  badge: Badge;
  nome: string;
  reparto: string;
  presente: boolean;
}

async function costruisciRiga(d: Dipendente): Promise<ReportRigaDTO> {
  // Simuliamo un fetch timbratura del giorno; a volte "manca".
  const timbrata = await delay(d.id % 2 === 0, 3); // boolean
  if (!timbrata && d.ruolo === "Operatore") {
    throw new Error(`Timbratura mancante per ${d.badge}`);
  }
  return { badge: d.badge, nome: d.nome, reparto: d.reparto, presente: timbrata };
}

async function reportReparto(): Promise<{
  ok: ReportRigaDTO[];
  errori: string[];
}> {
  const dipendenti = await repo.findAll();
  // pool limitato a 2 per non saturare il "servizio timbrature"
  const promesse = dipendenti.map((d) => costruisciRiga(d));
  const esiti = await Promise.allSettled(promesse);
  // esiti: PromiseSettledResult<ReportRigaDTO>[]

  const ok = soloRiusciti(esiti); // ReportRigaDTO[]
  const errori = esiti
    .filter((e): e is PromiseRejectedResult => e.status === "rejected")
    .map((e) => String((e.reason as Error).message));

  return { ok, errori };
}
void reportReparto;

// =============================================================
// 10) STATO MACCHINA ASINCRONO TIPIZZATO (fetch state)
// =============================================================

// Union discriminata per modellare lo stato di una richiesta. Evita i bug
// "loading true ma ho anche i dati": ogni stato ha SOLO i campi pertinenti.
type AsyncState<T, E = Error> =
  | { readonly stato: "idle" }
  | { readonly stato: "loading" }
  | { readonly stato: "success"; readonly dato: T }
  | { readonly stato: "error"; readonly errore: E };

// Reducer type-safe: il narrowing su 'stato' garantisce l'accesso ai campi.
function renderStato(s: AsyncState<Dipendente>): string {
  switch (s.stato) {
    case "idle":
      return "in attesa";
    case "loading":
      return "caricamento...";
    case "success":
      return `ok: ${s.dato.badge}`; // s.dato tipizzato Dipendente
    case "error":
      return `errore: ${s.errore.message}`;
    default: {
      // exhaustiveness check: se aggiungi uno stato e non lo gestisci, ERRORE.
      const _never: never = s;
      return _never;
    }
  }
}
void renderStato;

// =============================================================
// 11) GOTCHA / PITFALLS
// =============================================================

// GOTCHA 1: forEach + async NON aspetta. forEach ignora la Promise ritornata,
// quindi il codice "dopo" gira prima che le task finiscano.
// async function bug1(ids: number[]) {
//   ids.forEach(async (id) => { await repo.findById(id); });
//   // ERRORE LOGICO (non di tipo): qui i findById NON sono ancora finiti.
// }
// SOLUZIONE: usa for..of con await (sequenziale) o Promise.all(ids.map(...)).

// GOTCHA 2: Promise.all fallisce fast: il primo reject rigetta TUTTO e gli
// altri risultati vanno persi. Se vuoi TUTTI gli esiti usa allSettled.
// async function bug2() {
//   const [a, b] = await Promise.all([Promise.resolve(1), Promise.reject(2)]);
//   // 'a' non e' mai assegnato: l'await lancia. Usa allSettled se serve 'a'.
//   void a; void b;
// }

// GOTCHA 3: await su non-Promise e' lecito ma il tipo resta il valore stesso
// (Awaited<number> = number). Non "diventa" async: await 5 vale 5.
async function gotcha3(): Promise<number> {
  const x = await 5; // tipo: number, non Promise<number>
  return x;
}
void gotcha3;

// GOTCHA 4: tipizzare male l'errore. In catch la variabile e' 'unknown' in
// strict (o any senza useUnknownInCatchVariables). NON assumere Error.
// ERRORE TS: 'err' is of type 'unknown'.
// async function bug4() {
//   try { await repo.findAll(); }
//   catch (err) { console.log(err.message); }
// }
// SOLUZIONE: restringi prima -> if (err instanceof Error) { err.message }.
function estraiMessaggio(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
void estraiMessaggio;

// GOTCHA 5: Promise.all su tupla vs array. Se annoti la variabile come
// Promise<number>[] perdi la posizione e ottieni number[] invece della tupla.
// Lascia inferire l'array-literal per mantenere la tupla posizionale.

// =============================================================
// 12) EXPORT LOCALI
// =============================================================

export {
  caricaDipendente,
  soloRiusciti,
  conTimeout,
  caricaMolti,
  mapLimit,
  retry,
  reportReparto,
  renderStato,
  estraiMessaggio,
  repo,
  delay,
};

export type {
  Dipendente,
  Timbratura,
  Reparto,
  Ruolo,
  Turno,
  Badge,
  OrarioHHMM,
  DipendenteRepository,
  RetryOptions,
  ReportRigaDTO,
  AsyncState,
  All,
  Equal,
  Expect,
};

/*
 * =============================================================
 * RIEPILOGO COMANDI / CONCETTI
 * =============================================================
 * - Awaited<T>: unwrap ricorsivo delle Promise (anche annidate); distribuisce su union.
 * - Promise.all([...]): su TUPLA -> tupla posizionale [Awaited<T0>, ...]; su array -> T[].
 * - Promise.allSettled: mai reject; PromiseSettledResult<T> union discriminata su 'status'.
 * - Promise.race: unione degli Awaited (primo che si stabilizza, anche reject).
 * - Promise.any: primo fulfilled; se tutti reject -> AggregateError.
 * - conTimeout: race tra Promise<T> e Promise<never> (timer) -> resta T.
 * - mapLimit/pool: concorrenza limitata, N runner condividono un cursore, ordine preservato.
 * - retry<T>: T preservato lungo la catena; catch err: unknown; backoff = delay*factor^tentativo.
 * - Awaited<ReturnType<typeof fn>>: estrae il valore risolto di una funzione async.
 * - AsyncState<T,E>: union discriminata idle|loading|success|error + exhaustiveness (never).
 * - Type test: Equal<A,B> + Expect<T extends true> per asserzioni a compile-time.
 * - GOTCHA: forEach+async non attende; all fallisce-fast (usa allSettled); await su non-Promise;
 *   err e' unknown in catch (restringi con instanceof); tupla vs array in Promise.all.
 * - Best practice: mai lanciare TUTTE le task insieme su risorse scarse; limita la concorrenza.
 */
