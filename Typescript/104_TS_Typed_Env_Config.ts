/**
 * 104 - Typed Environment & Config
 * Come tipizzare process.env (che di base e' Record<string, string | undefined>),
 * definire uno schema di config, fare parse + validazione delle env var e
 * costruire una config ERP fortemente tipizzata (PORT, DB_URL, JWT, ecc.).
 * Il problema centrale: le env arrivano sempre come stringhe (o undefined),
 * quindi servono coercion (string -> number/bool) e validazione a runtime che
 * "restringe" i tipi verso una AppConfig type-safe usata nel resto dell'app.
 * Livello: ECOSYSTEM/EXTRA. Nessuna libreria esterna: tutti i mock sono locali.
 */

// ---------------------------------------------------------------------------
// 1. Il tipo reale di process.env
// ---------------------------------------------------------------------------
// In Node, process.env e' dichiarato (in @types/node) come NodeJS.ProcessEnv,
// che estende Record<string, string | undefined>. Qui NON importiamo @types/node:
// definiamo un mock locale con la stessa forma per lavorare in modo isolato.

// Mock del process.env di Node (ogni valore e' string oppure undefined).
type ProcessEnv = Record<string, string | undefined>;

// Env di esempio "raw": tutto stringhe, come se venisse da un file .env.
const rawEnv: ProcessEnv = {
  NODE_ENV: "production",
  PORT: "9000",
  DATABASE_URL: "postgres://user:pass@192.168.2.98:5432/polyuretech",
  JWT_SECRET: "super-secret-key-abcdef",
  JWT_EXPIRES_IN: "3600",
  ENABLE_QR_DISPLAY: "true",
  DEFAULT_TURNO: "P4",
  ADMIN_BADGE: "UP-001",
  OPENING_TIME: "06:00",
};

// Accesso "grezzo": il tipo e' sempre string | undefined, mai number/boolean.
const rawPort = rawEnv.PORT; // tipo: string | undefined
// ERRORE TS: Type 'string | undefined' is not assignable to type 'number'.
// const portNumberWrong: number = rawEnv.PORT;

// ---------------------------------------------------------------------------
// 2. Perche' serve validazione: le env "mentono" sul tipo
// ---------------------------------------------------------------------------
// process.env.PORT e' "9000" (stringa), non 9000. E puo' anche mancare.
// Il compilatore non sa se una chiave esiste: tutte danno string | undefined.

const missing = rawEnv.NON_ESISTE; // tipo: string | undefined => a runtime undefined

// ---------------------------------------------------------------------------
// 3. Literal types e union per i valori ammessi
// ---------------------------------------------------------------------------

// Ambiente applicativo (union di literal string).
type NodeEnv = "development" | "test" | "production";

// Ruoli ERP Polyuretech.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Turni ERP.
type Turno = "P4" | "P2" | "STD";

// ---------------------------------------------------------------------------
// 4. Lo schema della config: come DEVE essere alla fine (tipizzato bene)
// ---------------------------------------------------------------------------

// AppConfig e' la forma "pulita" che il resto dell'app consuma.
// Nota: qui i tipi sono quelli veri (number, boolean, union), non string.
interface AppConfig {
  readonly nodeEnv: NodeEnv;
  readonly port: number;
  readonly databaseUrl: string;
  readonly jwt: {
    readonly secret: string;
    readonly expiresInSec: number;
  };
  readonly enableQrDisplay: boolean;
  readonly defaultTurno: Turno;
  readonly adminBadge: string; // formato UP-\d{3}
  readonly openingTime: string; // formato HH:MM naive-UTC
}

// ---------------------------------------------------------------------------
// 5. Coercizione: helper string -> tipo, con errori chiari
// ---------------------------------------------------------------------------

// Errore custom per problemi di configurazione (fail-fast all'avvio).
class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

// Legge una env obbligatoria come stringa non vuota.
function requireString(env: ProcessEnv, key: string): string {
  const value = env[key];
  if (value === undefined || value === "") {
    throw new ConfigError(`Env mancante o vuota: ${key}`);
  }
  return value; // tipo: string (narrowing dopo il check)
}

// Legge una env opzionale con default.
function optionalString(env: ProcessEnv, key: string, fallback: string): string {
  const value = env[key];
  return value === undefined || value === "" ? fallback : value;
}

// Converte una stringa in number intero, validando.
function parseIntEnv(env: ProcessEnv, key: string): number {
  const raw = requireString(env, key);
  const n = Number(raw);
  if (!Number.isInteger(n)) {
    throw new ConfigError(`Env ${key} deve essere un intero, ricevuto: "${raw}"`);
  }
  return n; // tipo: number
}

// Converte "true"/"false"/"1"/"0" in boolean.
function parseBoolEnv(env: ProcessEnv, key: string, fallback: boolean): boolean {
  const raw = env[key];
  if (raw === undefined) return fallback;
  switch (raw.toLowerCase()) {
    case "true":
    case "1":
    case "yes":
      return true;
    case "false":
    case "0":
    case "no":
      return false;
    default:
      throw new ConfigError(`Env ${key} non e' un boolean valido: "${raw}"`);
  }
}

// ---------------------------------------------------------------------------
// 6. Type guard su union di literal (validazione + narrowing)
// ---------------------------------------------------------------------------

// Guard generico: verifica che value appartenga a un insieme di literal ammessi.
// La firma "value is T" fa il narrowing per il chiamante.
function isOneOf<const T extends readonly string[]>(
  value: string,
  allowed: T
): value is T[number] {
  return (allowed as readonly string[]).includes(value);
}

const NODE_ENVS = ["development", "test", "production"] as const;
const TURNI = ["P4", "P2", "STD"] as const;

// Parse di una env verso una union di literal, con errore se fuori range.
function parseEnum<const T extends readonly string[]>(
  env: ProcessEnv,
  key: string,
  allowed: T,
  fallback?: T[number]
): T[number] {
  const raw = env[key];
  if (raw === undefined || raw === "") {
    if (fallback !== undefined) return fallback;
    throw new ConfigError(`Env mancante: ${key} (attesi: ${allowed.join("|")})`);
  }
  if (!isOneOf(raw, allowed)) {
    throw new ConfigError(
      `Env ${key}="${raw}" non valida. Ammessi: ${allowed.join("|")}`
    );
  }
  return raw; // tipo: T[number], cioe' la union stretta
}

// ---------------------------------------------------------------------------
// 7. Validazione con regex ERP (badge e orario naive-UTC)
// ---------------------------------------------------------------------------

const BADGE_RE = /^UP-\d{3}$/; // es: UP-001
const ORARIO_RE = /^\d{2}:\d{2}$/; // es: 06:00

// Legge una env che deve matchare un pattern.
function parsePattern(env: ProcessEnv, key: string, re: RegExp): string {
  const raw = requireString(env, key);
  if (!re.test(raw)) {
    throw new ConfigError(`Env ${key}="${raw}" non rispetta il pattern ${re}`);
  }
  return raw;
}

// ---------------------------------------------------------------------------
// 8. Il "loader": da ProcessEnv grezzo a AppConfig tipizzata
// ---------------------------------------------------------------------------

// Questa e' la funzione centrale: prende env "sporca" e restituisce config pulita.
// Se qualcosa non va, lancia ConfigError (fail-fast all'avvio dell'ERP).
function loadConfig(env: ProcessEnv): AppConfig {
  return {
    nodeEnv: parseEnum(env, "NODE_ENV", NODE_ENVS, "development"),
    port: parseIntEnv(env, "PORT"),
    databaseUrl: requireString(env, "DATABASE_URL"),
    jwt: {
      secret: requireString(env, "JWT_SECRET"),
      expiresInSec: parseIntEnv(env, "JWT_EXPIRES_IN"),
    },
    enableQrDisplay: parseBoolEnv(env, "ENABLE_QR_DISPLAY", false),
    defaultTurno: parseEnum(env, "DEFAULT_TURNO", TURNI, "STD"),
    adminBadge: parsePattern(env, "ADMIN_BADGE", BADGE_RE),
    openingTime: parsePattern(env, "OPENING_TIME", ORARIO_RE),
  };
}

// Uso: config diventa fortemente tipizzata.
const config = loadConfig(rawEnv);
// config.port    -> tipo: number   (=> 9000)
// config.nodeEnv -> tipo: NodeEnv  (=> "production")
// config.enableQrDisplay -> tipo: boolean (=> true)
// config.defaultTurno -> tipo: Turno (=> "P4")

// ERRORE TS: 'port' e' readonly, non si puo' riassegnare.
// config.port = 8080;

// ERRORE TS: nodeEnv accetta solo la union NodeEnv.
// const badEnv: NodeEnv = "staging";

// ---------------------------------------------------------------------------
// 9. Result type: validazione senza throw (per test / UI di setup)
// ---------------------------------------------------------------------------

// A volte non si vuole lanciare: si preferisce un Result discriminato.
type ConfigResult =
  | { readonly ok: true; readonly config: AppConfig }
  | { readonly ok: false; readonly errors: readonly string[] };

// Wrapper che raccoglie l'errore invece di propagarlo.
function tryLoadConfig(env: ProcessEnv): ConfigResult {
  try {
    return { ok: true, config: loadConfig(env) };
  } catch (e) {
    const msg = e instanceof ConfigError ? e.message : String(e);
    return { ok: false, errors: [msg] };
  }
}

const result = tryLoadConfig(rawEnv);
if (result.ok) {
  // Qui result.config e' AppConfig (narrowing via discriminante ok).
  const p: number = result.config.port; // ok
  void p;
} else {
  // Qui result.errors e' readonly string[].
  const errs: readonly string[] = result.errors;
  void errs;
}

// Esempio di fallimento: PORT non intero.
const bad = tryLoadConfig({ ...rawEnv, PORT: "non-un-numero" });
// bad.ok => false; bad.errors => ['Env PORT deve essere un intero, ...']

// ---------------------------------------------------------------------------
// 10. Deriving types dallo schema: keyof e mapping
// ---------------------------------------------------------------------------

// Le chiavi top-level della config (utile per logging/redaction).
type ConfigKey = keyof AppConfig;
// tipo: "nodeEnv" | "port" | "databaseUrl" | "jwt" | "enableQrDisplay" | ...

// Elenco delle chiavi sensibili da NON stampare nei log.
const SECRET_KEYS = ["databaseUrl", "jwt"] as const satisfies readonly ConfigKey[];

// Config "safe" per log: sostituisce i valori sensibili con "***".
type SafeConfig = {
  readonly [K in keyof AppConfig]: K extends (typeof SECRET_KEYS)[number]
    ? "***"
    : AppConfig[K];
};

function redact(cfg: AppConfig): SafeConfig {
  return {
    nodeEnv: cfg.nodeEnv,
    port: cfg.port,
    databaseUrl: "***",
    jwt: "***",
    enableQrDisplay: cfg.enableQrDisplay,
    defaultTurno: cfg.defaultTurno,
    adminBadge: cfg.adminBadge,
    openingTime: cfg.openingTime,
  };
}

const safe = redact(config);
// safe.databaseUrl -> tipo: "***"
// safe.port        -> tipo: number

// ---------------------------------------------------------------------------
// 11. Schema dichiarativo: descrivere le env come dati, non come codice
// ---------------------------------------------------------------------------
// Pattern alternativo (stile zod/envalid) senza librerie: uno schema come
// oggetto di "field descriptor", ognuno con parser e obbligatorieta'.

// Descrittore di un singolo campo env: sa come trasformare string|undefined -> T.
interface FieldSpec<T> {
  readonly parse: (raw: string | undefined) => T;
}

// Factory di spec riutilizzabili.
const spec = {
  str(required: boolean, fallback = ""): FieldSpec<string> {
    return {
      parse: (raw) => {
        if (raw === undefined || raw === "") {
          if (required) throw new ConfigError("campo stringa obbligatorio mancante");
          return fallback;
        }
        return raw;
      },
    };
  },
  int(): FieldSpec<number> {
    return {
      parse: (raw) => {
        const n = Number(raw);
        if (raw === undefined || !Number.isInteger(n)) {
          throw new ConfigError(`intero non valido: "${raw}"`);
        }
        return n;
      },
    };
  },
  bool(fallback: boolean): FieldSpec<boolean> {
    return { parse: (raw) => (raw === undefined ? fallback : raw === "true") };
  },
} as const;

// Uno "schema" e' un oggetto di FieldSpec. Da qui deriviamo il tipo output.
type SchemaShape = Record<string, FieldSpec<unknown>>;

// InferSchema: dato lo schema, calcola il tipo dell'oggetto risultante.
type InferSchema<S extends SchemaShape> = {
  readonly [K in keyof S]: S[K] extends FieldSpec<infer T> ? T : never;
};

// Runner generico: applica ogni spec alla env corrispondente.
function parseSchema<S extends SchemaShape>(env: ProcessEnv, schema: S): InferSchema<S> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(schema) as (keyof S)[]) {
    out[key as string] = schema[key].parse(env[key as string]);
  }
  return out as InferSchema<S>;
}

// Definiamo lo schema ERP in modo dichiarativo.
const erpSchema = {
  PORT: spec.int(),
  DATABASE_URL: spec.str(true),
  JWT_SECRET: spec.str(true),
  ENABLE_QR_DISPLAY: spec.bool(false),
} as const;

const parsed = parseSchema(rawEnv, erpSchema);
// tipo inferito di parsed:
// { readonly PORT: number; readonly DATABASE_URL: string;
//   readonly JWT_SECRET: string; readonly ENABLE_QR_DISPLAY: boolean }
const parsedPort: number = parsed.PORT; // ok, => 9000
void parsedPort;

// ---------------------------------------------------------------------------
// 12. Config per-ambiente (override development / test / production)
// ---------------------------------------------------------------------------

// Valori di default che dipendono dall'ambiente.
type EnvDefaults = Readonly<Record<NodeEnv, { port: number; logQueries: boolean }>>;

const defaultsByEnv: EnvDefaults = {
  development: { port: 3000, logQueries: true },
  test: { port: 9000, logQueries: false },
  production: { port: 8080, logQueries: false },
};

// Merge: parte dai default d'ambiente, poi applica override espliciti.
function resolvePort(env: ProcessEnv): number {
  const nodeEnv = parseEnum(env, "NODE_ENV", NODE_ENVS, "development");
  const fallback = defaultsByEnv[nodeEnv].port;
  const raw = env.PORT;
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isInteger(n) ? n : fallback;
}

const devPort = resolvePort({ NODE_ENV: "development" }); // => 3000
const prodPort = resolvePort({ NODE_ENV: "production", PORT: "9000" }); // => 9000
void devPort;
void prodPort;

// ---------------------------------------------------------------------------
// 13. Augmentation di NodeJS.ProcessEnv (solo commento: qui non c'e' @types/node)
// ---------------------------------------------------------------------------
// In un vero progetto Node si tipizza process.env con declaration merging:
//
//   declare global {
//     namespace NodeJS {
//       interface ProcessEnv {
//         PORT: string;            // resta string! Node non fa coercion
//         DATABASE_URL: string;
//         NODE_ENV: "development" | "test" | "production";
//       }
//     }
//   }
//   export {};
//
// Attenzione: anche cosi' i valori restano STRING a runtime. La augmentation
// aiuta l'autocomplete ma NON sostituisce la validazione/coercion di sopra.
// (Qui non lo compiliamo perche' richiederebbe i tipi globali di Node.)

// ---------------------------------------------------------------------------
// 14. Esempio d'uso finale nell'ERP: un mini-bootstrap tipizzato
// ---------------------------------------------------------------------------

// Mock di un "server" ERP che riceve la config gia' validata.
interface ErpServer {
  readonly listenOn: number;
  readonly db: string;
  start(): string;
}

function createServer(cfg: AppConfig): ErpServer {
  return {
    listenOn: cfg.port,
    db: cfg.databaseUrl,
    start(): string {
      return `ERP avviato su :${cfg.port} (env=${cfg.nodeEnv}, turno=${cfg.defaultTurno})`;
    },
  };
}

// Bootstrap: se la config e' invalida, non si parte proprio.
function bootstrap(env: ProcessEnv): ErpServer {
  const cfg = loadConfig(env); // fail-fast se env non valida
  return createServer(cfg);
}

const server = bootstrap(rawEnv);
const banner = server.start();
// banner => "ERP avviato su :9000 (env=production, turno=P4)"
void banner;

// ---------------------------------------------------------------------------
// 15. Export locali (solo simboli di questo file)
// ---------------------------------------------------------------------------

export {
  loadConfig,
  tryLoadConfig,
  parseSchema,
  spec,
  redact,
  createServer,
  bootstrap,
  ConfigError,
};

export type {
  AppConfig,
  SafeConfig,
  ConfigResult,
  NodeEnv,
  Turno,
  Ruolo,
  ProcessEnv,
  FieldSpec,
  InferSchema,
  ConfigKey,
};

/*
 * ===========================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ===========================================================================
 * - process.env: tipo Record<string, string | undefined> (mai number/bool).
 * - Ogni env e' string | undefined: serve sempre coercion + validazione.
 * - requireString / optionalString: obbligatorie vs con default.
 * - parseIntEnv / parseBoolEnv: coercion string -> number / boolean con errore.
 * - Literal union (NodeEnv, Turno, Ruolo) per valori ammessi.
 * - Type guard "value is T[number]" con isOneOf per narrowing sicuro.
 * - parseEnum: env -> union di literal, fallisce se fuori range.
 * - Regex ERP: BADGE_RE /^UP-\d{3}$/, ORARIO_RE /^\d{2}:\d{2}$/.
 * - loadConfig: ProcessEnv grezzo -> AppConfig tipizzata (fail-fast).
 * - ConfigError: errore dedicato per fallire all'avvio.
 * - ConfigResult (discriminated union ok:true/false) per validare senza throw.
 * - keyof AppConfig -> ConfigKey; mapped type SafeConfig per redaction segreti.
 * - satisfies: SECRET_KEYS validato come readonly ConfigKey[].
 * - Schema dichiarativo: FieldSpec<T> + InferSchema<S> (stile zod, no librerie).
 * - parseSchema: runner generico che infersce il tipo output dallo schema.
 * - Config per-ambiente: defaultsByEnv + override PORT.
 * - declare global namespace NodeJS.ProcessEnv: augmentation (solo commento).
 * - Regola: la augmentation NON fa coercion; validare sempre a runtime.
 * ===========================================================================
 */
