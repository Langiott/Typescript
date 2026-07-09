/**
 * 095 - ADV Type-safe API client (fetch)
 * Costruiamo un client HTTP generico e completamente tipizzato sopra fetch:
 * endpoint map (mappa path -> request/response), funzione request<T>,
 * gestione errori tipizzata (Result/discriminated union), e DTO ERP Polyuretech.
 * Obiettivo: far derivare a TypeScript il tipo della risposta dal path scelto,
 * cosi' il compilatore controlla body, query e shape di ritorno end-to-end.
 * Tutte le fetch reali sono mock/commentate: il file compila con tsc --strict, noEmit.
 */

export {}; // isola lo scope del modulo (evita collisioni di nomi globali)

// ============================================================================
// 0) HELPER DI TEST A LIVELLO DI TIPO (Equal / Expect)
// ----------------------------------------------------------------------------
// Equal usa il trucco delle funzioni condizionali: due tipi sono "uguali"
// se una funzione che ritorna un condizionale su A e' assegnabile a quella su B.
// Questo distingue anche casi che un semplice `extends` bidirezionale sbaglia.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect accetta solo true: se passiamo false abbiamo un ERRORE TS a compile time.
type Expect<T extends true> = T;

type _t0 = Expect<Equal<string, string>>; // ok
// type _t0bad = Expect<Equal<string, number>>; // ERRORE TS: false non e' assegnabile a true

// ============================================================================
// 1) DOMINIO ERP: tipi base e brand
// ----------------------------------------------------------------------------
// Usiamo template literal types per modellare badge e orari naive-UTC.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";
type Badge = `UP-${number}`;          // pattern /^UP-\d{3}$/ (approx a livello di tipo)
type OrarioHHMM = `${number}:${number}`; // pattern /^\d{2}:\d{2}$/ (approx)

interface Dipendente {
  id: number;
  nome: string;
  badge: Badge;      // es: "UP-001"
  ruolo: Ruolo;
  repartoId: number;
}

interface Reparto {
  id: number;
  nome: string;      // es: "Poliuretano", "Taglio"
  turno: Turno;
}

interface Timbratura {
  id: number;
  dipendenteId: number;
  tipo: "entrata" | "uscita";
  orario: OrarioHHMM; // naive-UTC "HH:MM", niente Date lato client
  data: string;       // "YYYY-MM-DD"
}

const badgeDemo: Badge = "UP-001"; // ok
// const badgeBad: Badge = "XX-1"; // ERRORE TS: non combacia con `UP-${number}`
void badgeDemo;

// ============================================================================
// 2) METODI HTTP E RESULT TIPIZZATO
// ----------------------------------------------------------------------------
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// Errore applicativo come discriminated union: il campo `kind` e' il discriminante.
// Il control flow analysis restringe il tipo dentro ai rami switch/if.
type ApiError =
  | { kind: "network"; message: string }
  | { kind: "http"; status: number; body: unknown }
  | { kind: "parse"; message: string }
  | { kind: "validation"; issues: string[] };

// Result: al posto di throw, ritorniamo un valore che il chiamante DEVE discriminare.
// Vantaggio: gli errori diventano parte del tipo, non un canale invisibile.
type Ok<T> = { ok: true; value: T };
type Err = { ok: false; error: ApiError };
type Result<T> = Ok<T> | Err;

function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}
function err(error: ApiError): Err {
  return { ok: false, error };
}

// ============================================================================
// 3) ENDPOINT MAP: il cuore del client
// ----------------------------------------------------------------------------
// Ogni endpoint dichiara: method, il tipo del body di request e il tipo di response.
// `never` come request significa "nessun body" (tipico delle GET/DELETE).
interface EndpointSpec {
  method: HttpMethod;
  request: unknown;
  response: unknown;
}

// La mappa associa un path (string literal) al suo EndpointSpec.
// Nota: i path sono chiavi literal, quindi keyof Api = union dei path.
interface Api {
  "GET /dipendenti": {
    method: "GET";
    request: never;
    response: Dipendente[];
  };
  "GET /dipendenti/:id": {
    method: "GET";
    request: never;
    response: Dipendente;
  };
  "POST /dipendenti": {
    method: "POST";
    request: Omit<Dipendente, "id">; // creazione: id assegnato dal server
    response: Dipendente;
  };
  "PATCH /dipendenti/:id": {
    method: "PATCH";
    request: Partial<Omit<Dipendente, "id">>;
    response: Dipendente;
  };
  "GET /reparti": {
    method: "GET";
    request: never;
    response: Reparto[];
  };
  "POST /timbrature": {
    method: "POST";
    request: Omit<Timbratura, "id">;
    response: Timbratura;
  };
  "GET /timbrature": {
    method: "GET";
    request: never;
    response: Timbratura[];
  };
}

// Estraiamo per ciascun path i tipi di request e response con lookup indicizzato.
// P extends keyof Api vincola P ai soli path validi -> autocompletion + errore su typo.
type ReqOf<P extends keyof Api> = Api[P]["request"];
type ResOf<P extends keyof Api> = Api[P]["response"];
type MethodOf<P extends keyof Api> = Api[P]["method"];

type _t1 = Expect<Equal<ResOf<"GET /dipendenti">, Dipendente[]>>; // ok
type _t2 = Expect<Equal<ReqOf<"POST /timbrature">, Omit<Timbratura, "id">>>; // ok
type _t3 = Expect<Equal<MethodOf<"PATCH /dipendenti/:id">, "PATCH">>; // ok

// ============================================================================
// 4) HasBody: distinguere endpoint con e senza body
// ----------------------------------------------------------------------------
// Se request e' `never`, non vogliamo chiedere un body al chiamante.
// [ReqOf<P>] extends [never] usa una tupla per DISABILITARE la distributivita':
// `never extends X` da solo distribuisce sull'unione vuota e da sempre never/true
// in modo controintuitivo. Avvolgere in tupla forza il confronto non distributivo.
type HasBody<P extends keyof Api> = [ReqOf<P>] extends [never] ? false : true;

type _t4 = Expect<Equal<HasBody<"GET /dipendenti">, false>>;  // never -> false
type _t5 = Expect<Equal<HasBody<"POST /dipendenti">, true>>;  // ha body -> true

// Costruiamo il tipo delle opzioni: body richiesto SOLO se HasBody e' true.
// Intersezione condizionale: se non c'e' body, aggiungiamo `{ body?: never }`.
type RequestOptions<P extends keyof Api> = {
  query?: Record<string, string | number | boolean>;
  signal?: AbortSignal;
} & (HasBody<P> extends true ? { body: ReqOf<P> } : { body?: never });

// ============================================================================
// 5) VALIDATORI RUNTIME (type guards) per la response
// ----------------------------------------------------------------------------
// A runtime fetch ritorna `unknown`: dobbiamo restringere con type guard prima
// di fidarci dei tipi statici. I guard collegano runtime e compile time.
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isDipendente(x: unknown): x is Dipendente {
  return (
    isRecord(x) &&
    typeof x.id === "number" &&
    typeof x.nome === "string" &&
    typeof x.badge === "string" &&
    /^UP-\d{3}$/.test(x.badge as string) &&
    typeof x.repartoId === "number"
  );
}

function isTimbratura(x: unknown): x is Timbratura {
  return (
    isRecord(x) &&
    typeof x.id === "number" &&
    typeof x.dipendenteId === "number" &&
    (x.tipo === "entrata" || x.tipo === "uscita") &&
    typeof x.orario === "string" &&
    /^\d{2}:\d{2}$/.test(x.orario as string)
  );
}

// ============================================================================
// 6) IL CLIENT: request<P> con inferenza guidata dalla endpoint map
// ----------------------------------------------------------------------------
// Il generic P e' il path: da esso derivano method, body e response.
// Overload di firma implicito tramite RequestOptions condizionale:
// se l'endpoint richiede body, ometterlo e' ERRORE TS.
interface ApiClientConfig {
  baseUrl: string;
  token?: string;
}

// parsePath: separa "POST /timbrature" in method + url (helper interno).
function splitPath(p: string): { method: HttpMethod; url: string } {
  const spaceIdx = p.indexOf(" ");
  const method = p.slice(0, spaceIdx) as HttpMethod;
  const url = p.slice(spaceIdx + 1);
  return { method, url };
}

// buildQuery: serializza la query string (solo valori primitivi).
function buildQuery(q?: Record<string, string | number | boolean>): string {
  if (!q) return "";
  const parts = Object.entries(q).map(
    ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
  );
  return parts.length ? `?${parts.join("&")}` : "";
}

// La firma chiave: request restituisce Promise<Result<ResOf<P>>>.
// TS infersce ResOf<P> dal literal passato come primo argomento.
async function request<P extends keyof Api>(
  config: ApiClientConfig,
  path: P,
  options: RequestOptions<P>,
): Promise<Result<ResOf<P>>> {
  const { method, url } = splitPath(path);
  const query = buildQuery(options.query);
  const fullUrl = `${config.baseUrl}${url}${query}`;

  // --- FETCH REALE (commentata: qui non gira, e' un file didattico) ---
  // Esempio browser / node fetch:
  // let raw: unknown;
  // try {
  //   const res = await fetch(fullUrl, {
  //     method,
  //     signal: options.signal,
  //     headers: {
  //       "Content-Type": "application/json",
  //       ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
  //     },
  //     body:
  //       "body" in options && options.body !== undefined
  //         ? JSON.stringify(options.body)
  //         : undefined,
  //   });
  //   if (!res.ok) {
  //     return err({ kind: "http", status: res.status, body: await res.text() });
  //   }
  //   raw = await res.json();
  // } catch (e) {
  //   return err({ kind: "network", message: (e as Error).message });
  // }

  // --- MOCK: simuliamo la risposta per far compilare/ragionare senza rete ---
  void method;
  void fullUrl;
  const raw: unknown = mockResponse(path);

  // Il cast e' l'unico punto "unsafe": lo isoliamo qui e lo copriamo coi guard
  // ai bordi (vedi getDipendenti/creaTimbratura sotto).
  return ok(raw as ResOf<P>);
}

// mockResponse: ritorna dati finti coerenti col path (solo per demo).
function mockResponse(path: keyof Api): unknown {
  switch (path) {
    case "GET /dipendenti":
      return [
        { id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Operatore", repartoId: 3 },
      ] satisfies Dipendente[];
    case "GET /reparti":
      return [{ id: 3, nome: "Poliuretano", turno: "P4" }] satisfies Reparto[];
    case "POST /timbrature":
      return {
        id: 99,
        dipendenteId: 1,
        tipo: "entrata",
        orario: "08:00",
        data: "2026-07-08",
      } satisfies Timbratura;
    default:
      return {};
  }
}

// ============================================================================
// 7) USO DEL CLIENT: inferenza end-to-end
// ----------------------------------------------------------------------------
const cfg: ApiClientConfig = { baseUrl: "http://192.168.2.98:9000/api", token: "xyz" };

async function demoUso(): Promise<void> {
  // GET senza body: RequestOptions permette body?: never, quindi ometterlo va bene.
  const r1 = await request(cfg, "GET /dipendenti", {});
  // r1: Result<Dipendente[]> -> discriminiamo sul campo ok
  if (r1.ok) {
    const lista = r1.value; // tipo: Dipendente[]
    void lista[0]?.badge;   // badge: Badge
  } else {
    const e = r1.error;     // tipo: ApiError
    void e.kind;
  }

  // POST con body: il body e' Omit<Timbratura,"id"> e viene type-checkato.
  const r2 = await request(cfg, "POST /timbrature", {
    body: {
      dipendenteId: 1,
      tipo: "entrata",
      orario: "08:00",
      data: "2026-07-08",
    },
  });
  if (r2.ok) {
    void r2.value.id; // tipo: number (Timbratura)
  }

  // ERRORE TS: manca il body su un endpoint che lo richiede
  // await request(cfg, "POST /timbrature", {});
  // -> Property 'body' is missing

  // ERRORE TS: body con campo sbagliato (orario deve essere "HH:MM")
  // await request(cfg, "POST /timbrature", { body: { dipendenteId: 1, tipo: "entrata", orario: 800, data: "2026-07-08" } });
  // -> number non assegnabile a `${number}:${number}`

  // ERRORE TS: path inesistente (typo) -> non e' assegnabile a keyof Api
  // await request(cfg, "GET /dipndenti", {});

  // ERRORE TS: passare un body a una GET che ha request: never
  // await request(cfg, "GET /dipendenti", { body: { x: 1 } });
  // -> body: never, quindi { x: 1 } non e' assegnabile
}
void demoUso;

// ============================================================================
// 8) REPOSITORY ERP: incapsulare il client + validazione ai bordi
// ----------------------------------------------------------------------------
// Pattern repository: metodi ad alto livello che nascondono path/HTTP e
// applicano i type guard, restituendo Result gia' validato.
class DipendenteRepository {
  constructor(private readonly config: ApiClientConfig) {}

  async findAll(): Promise<Result<Dipendente[]>> {
    const res = await request(this.config, "GET /dipendenti", {});
    if (!res.ok) return res; // propaga l'errore (tipo Err)
    // validazione difensiva: la response dichiarata potrebbe non combaciare a runtime
    if (!Array.isArray(res.value) || !res.value.every(isDipendente)) {
      return err({ kind: "validation", issues: ["response non e' Dipendente[]"] });
    }
    return ok(res.value);
  }

  async crea(input: Omit<Dipendente, "id">): Promise<Result<Dipendente>> {
    const res = await request(this.config, "POST /dipendenti", { body: input });
    if (!res.ok) return res;
    if (!isDipendente(res.value)) {
      return err({ kind: "validation", issues: ["response non e' Dipendente"] });
    }
    return ok(res.value);
  }
}

async function demoRepo(): Promise<void> {
  const repo = new DipendenteRepository(cfg);
  const r = await repo.findAll();
  if (r.ok) {
    for (const d of r.value) {
      void `${d.badge} - ${d.nome}`; // tutto tipizzato
    }
  } else {
    // narrowing esaustivo sul kind dell'errore
    switch (r.error.kind) {
      case "network":
        void r.error.message;
        break;
      case "http":
        void r.error.status; // tipo: number
        break;
      case "parse":
        void r.error.message;
        break;
      case "validation":
        void r.error.issues; // tipo: string[]
        break;
      default: {
        // exhaustiveness check: se aggiungi un kind e dimentichi un case, ERRORE TS qui
        const _never: never = r.error;
        void _never;
      }
    }
  }
}
void demoRepo;

// ============================================================================
// 9) TIMBRATURA + VALIDAZIONE DOMINIO (naive-UTC, mai new Date lato client)
// ----------------------------------------------------------------------------
// Validiamo l'orario "HH:MM" prima di inviarlo: il tipo template garantisce
// la forma, ma non il RANGE (25:99 combacia con `${number}:${number}`),
// quindi serve anche un check runtime.
function orarioValido(o: string): o is OrarioHHMM {
  const m = /^(\d{2}):(\d{2})$/.exec(o);
  if (!m) return false;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h >= 0 && h < 24 && min >= 0 && min < 60;
}

async function timbra(
  config: ApiClientConfig,
  dipendenteId: number,
  tipo: "entrata" | "uscita",
  orario: string,
): Promise<Result<Timbratura>> {
  if (!orarioValido(orario)) {
    return err({ kind: "validation", issues: [`orario non valido: ${orario}`] });
  }
  // qui `orario` e' ristretto a OrarioHHMM grazie al type guard
  const res = await request(config, "POST /timbrature", {
    body: { dipendenteId, tipo, orario, data: "2026-07-08" },
  });
  if (!res.ok) return res;
  if (!isTimbratura(res.value)) {
    return err({ kind: "validation", issues: ["response non e' Timbratura"] });
  }
  return ok(res.value);
}
void timbra;

// ============================================================================
// 10) HELPER GENERICI DI ALTO LIVELLO (unwrap, map su Result)
// ----------------------------------------------------------------------------
// mapResult: trasforma il value mantenendo l'errore. Utile per comporre pipeline.
function mapResult<T, U>(r: Result<T>, f: (t: T) => U): Result<U> {
  return r.ok ? ok(f(r.value)) : r;
}

// unwrapOr: estrae il value o ritorna un default (nessun throw).
function unwrapOr<T>(r: Result<T>, fallback: T): T {
  return r.ok ? r.value : fallback;
}

async function demoHelpers(): Promise<void> {
  const r = await request(cfg, "GET /dipendenti", {});
  const nomi = mapResult(r, (ds) => ds.map((d) => d.nome)); // Result<string[]>
  const arr = unwrapOr(nomi, []); // string[]
  void arr;
}
void demoHelpers;

// ============================================================================
// 11) GOTCHA / PITFALLS
// ----------------------------------------------------------------------------
// PITFALL 1 - never e la distributivita' con NAKED type parameter.
//   La distributivita' scatta SOLO quando il tipo controllato e' un parametro
//   generico "nudo" (naked). `type Bad<T> = T extends never ? "vuoto" : "pieno"`:
//   se invochi Bad<never>, T e' nudo e distribuisce sull'unione VUOTA ->
//   il risultato e' `never`, NON "vuoto" come ci si aspetterebbe.
type BadNever<T> = T extends never ? "vuoto" : "pieno"; // T e' nudo -> distribuisce
type _t6 = Expect<Equal<BadNever<never>, never>>; // ok: prova il bug (esce never)
// Soluzione: avvolgere in tupla per DISATTIVARE la distributivita'.
type GoodNever<T> = [T] extends [never] ? "vuoto" : "pieno";
type _t7 = Expect<Equal<GoodNever<never>, "vuoto">>; // ok: ora e' corretto
//   E' esattamente il motivo per cui HasBody usa [ReqOf<P>] extends [never]:
//   se un domani ReqOf<P> arrivasse come parametro nudo, la tupla ci protegge.
type _t7b = Expect<Equal<HasBody<"GET /dipendenti">, false>>; // ok

// PITFALL 2 - fidarsi di res.json() come tipo giusto.
//   `const d = (await res.json()) as Dipendente;` e' un cast cieco: se il server
//   cambia shape, TS non se ne accorge e il bug esplode a runtime lontano.
//   Soluzione: type guard ai bordi (isDipendente) come nel repository.

// PITFALL 3 - allargamento del path a string.
//   Se passi una variabile `let p = "GET /dipendenti"` (tipo string), l'inferenza
//   di ResOf<P> collassa. Usa `as const` o passa il literal direttamente.
const pathLarge = "GET /dipendenti"; // const -> tipo literal, ok
// let pathVar: string = "GET /dipendenti";
// await request(cfg, pathVar, {}); // ERRORE TS: string non e' assegnabile a keyof Api
void pathLarge;

// PITFALL 4 - Result ignorato.
//   Se non discrimini `ok`, accedere a `.value` su Err e' ERRORE TS (ottimo):
//   const r = await request(cfg, "GET /dipendenti", {});
//   const bad = r.value; // ERRORE TS: Property 'value' does not exist on type 'Err'
//   Devi prima fare `if (r.ok)`.

// ============================================================================
// 12) TYPE-LEVEL: ricavare la union di tutti i path GET
// ----------------------------------------------------------------------------
// Filtriamo le chiavi della Api il cui method e' "GET" usando conditional +
// key remapping (as). Le chiavi che non passano diventano `never` e spariscono.
// Nota: dopo il remapping le chiavi che non passano SPARISCONO dall'oggetto,
// quindi indicizziamo con il keyof dell'oggetto stesso (non con keyof Api,
// che conterrebbe chiavi ormai rimosse e darebbe ERRORE TS 2536).
type FilterByMethod<M extends HttpMethod> = {
  [P in keyof Api as MethodOf<P> extends M ? P : never]: P;
};
type PathsWithMethod<M extends HttpMethod> = FilterByMethod<M>[keyof FilterByMethod<M>];

type GetPaths = PathsWithMethod<"GET">;
type _t8 = Expect<
  Equal<GetPaths, "GET /dipendenti" | "GET /dipendenti/:id" | "GET /reparti" | "GET /timbrature">
>; // ok

type PostPaths = PathsWithMethod<"POST">;
type _t9 = Expect<Equal<PostPaths, "POST /dipendenti" | "POST /timbrature">>; // ok

// ============================================================================
// 13) EXPORT LOCALI
// ============================================================================
export {
  request,
  ok,
  err,
  mapResult,
  unwrapOr,
  timbra,
  DipendenteRepository,
  isDipendente,
  isTimbratura,
  orarioValido,
};
export type {
  Api,
  EndpointSpec,
  ReqOf,
  ResOf,
  MethodOf,
  HasBody,
  RequestOptions,
  Result,
  ApiError,
  ApiClientConfig,
  Dipendente,
  Reparto,
  Timbratura,
  Badge,
  OrarioHHMM,
  Equal,
  Expect,
  GetPaths,
  PostPaths,
};

// Silenziamo "unused" sui type-test alias (esistono solo per il controllo statico).
export type _TypeTests = [
  _t0, _t1, _t2, _t3, _t4, _t5, _t6, _t7, _t7b, _t8, _t9,
];

/* ============================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ----------------------------------------------------------------------------
 * - Endpoint map: interface Api { "METHOD /path": { method; request; response } }
 * - Lookup indicizzato: Api[P]["response"] -> ResOf<P>, ReqOf<P>, MethodOf<P>
 * - request<P extends keyof Api>(cfg, path, options): Promise<Result<ResOf<P>>>
 * - Inferenza guidata dal literal del path: passa "GET /..." diretto o `as const`
 * - RequestOptions condizionale: body obbligatorio solo se HasBody<P> e' true
 * - HasBody usa [Req] extends [never] (tupla) per disattivare la distributivita'
 * - Result = Ok<T> | Err : errori nel tipo, niente throw invisibili
 * - ApiError discriminated union (kind: network|http|parse|validation)
 * - Type guard ai bordi (isDipendente/isTimbratura) per validare unknown da json()
 * - Repository pattern: incapsula path + validazione, ritorna Result gia' validato
 * - Exhaustiveness check con `const _never: never = x` nello switch
 * - Key remapping `as` per filtrare i path per method (PathsWithMethod)
 * - Equal/Expect: unit test a livello di tipo, falliscono a compile time
 * - GOTCHA: never+distributivita', cast cieco su json, path allargato a string,
 *   Result non discriminato (.value su Err = ERRORE TS)
 * - Verifica: tsc --strict --noEmit --target ES2022 --lib ES2022,DOM
 * ==========================================================================*/
