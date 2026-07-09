/**
 * File 102 - TS with Node/Express typing (livello ECOSYSTEM/EXTRA)
 * Come tipizzare handler, middleware, params/body/query in stile Express
 * SENZA installare express: definiamo interfacce mock (Request, Response,
 * NextFunction, Router) e ricostruiamo il PATTERN di tipizzazione end-to-end.
 * Dominio ERP Polyuretech: Dipendente, Timbratura, Reparto, ruoli e badge.
 * Obiettivo: capire generics su Request<Params, ResBody, ReqBody, Query>.
 */

// NOTA: nel progetto reale i tipi arriverebbero da "@types/express".
// Qui li DEFINIAMO a mano (interfacce mock) per restare autonomi e strict-safe.

// ---------------------------------------------------------------------------
// 1) Tipi di dominio ERP
// ---------------------------------------------------------------------------

// Ruoli applicativi come union di string literal (niente enum runtime).
export type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Turni ammessi.
export type Turno = "P4" | "P2" | "STD";

// Badge nel formato "UP-001": a livello di tipo resta string (i regex
// validano a runtime, non nel type system). Usiamo un branded type piu' sotto.
export interface Dipendente {
  id: number;
  nome: string;
  badge: string; // pattern /^UP-\d{3}$/
  ruolo: Ruolo;
  repartoId: number;
}

export interface Reparto {
  id: number;
  nome: string;
  turnoDefault: Turno;
}

// Orari in formato naive-UTC "HH:MM" (pattern /^\d{2}:\d{2}$/).
export interface Timbratura {
  id: number;
  dipendenteId: number;
  entrata: string; // "08:00"
  uscita: string | null; // null se ancora dentro
}

// ---------------------------------------------------------------------------
// 2) Interfacce MOCK di Express (Request/Response/Next)
// ---------------------------------------------------------------------------
// Il vero Express usa: Request<P, ResBody, ReqBody, ReqQuery>.
// Ricostruiamo la stessa forma con 4 type parameter e default {}.

// ParamsDictionary: chiavi stringa -> valori stringa (i params URL sono sempre string).
export type ParamsDictionary = Record<string, string>;
// Query: valori string oppure array di string (es. ?tag=a&tag=b).
export type QueryDictionary = Record<string, string | string[] | undefined>;

// Request generico. I default {} imitano express: se non specifichi nulla
// ottieni una Request "vuota" ma tipata.
export interface Req<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = QueryDictionary,
> {
  params: P;
  body: ReqBody;
  query: ReqQuery;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  headers: Record<string, string | undefined>;
  // proprieta' aggiunta dai middleware (auth): opzionale finche' non popolata.
  utente?: Dipendente;
  // ResBody serve solo per collegare la Request al tipo di risposta atteso.
  // Lo teniamo come phantom field per non lasciarlo inutilizzato.
  _resBody?: ResBody;
}

// Response generico: res.json(...) accetta SOLO il ResBody dichiarato.
// I metodi ritornano this per permettere il chaining res.status(200).json(...).
export interface Res<ResBody = unknown> {
  status(code: number): this;
  json(body: ResBody): this;
  send(body: string): this;
  // header setter, ritorna this per chaining.
  set(name: string, value: string): this;
  statusCode: number;
}

// NextFunction: la chiami senza argomenti per proseguire, con un errore per
// dirottare verso l'error handler.
export type NextFunction = (err?: unknown) => void;

// ---------------------------------------------------------------------------
// 3) Handler tipizzato
// ---------------------------------------------------------------------------
// Un RequestHandler lega Params/ResBody/ReqBody/Query fra Req e Res.

export type RequestHandler<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = QueryDictionary,
> = (
  req: Req<P, ResBody, ReqBody, ReqQuery>,
  res: Res<ResBody>,
  next: NextFunction,
) => void | Promise<void>;

// Esempio 3.1 - handler minimale: nessun generic, tutto ai default.
const ping: RequestHandler = (_req, res) => {
  res.status(200).send("pong");
};
void ping;

// Esempio 3.2 - handler che risponde con un Dipendente.
// ResBody = Dipendente => res.json vuole ESATTAMENTE un Dipendente.
const getMe: RequestHandler<ParamsDictionary, Dipendente> = (req, res) => {
  if (!req.utente) {
    // ERRORE TS: res.json({ error: "..." }); // { error: string } non e' Dipendente
    return;
  }
  res.status(200).json(req.utente); // OK: utente e' Dipendente
};
void getMe;

// ---------------------------------------------------------------------------
// 4) Params tipizzati (route /dipendenti/:id)
// ---------------------------------------------------------------------------
// I params URL sono SEMPRE string: qui tipizziamo le chiavi attese.

interface ParamsId {
  id: string; // "42" -> va convertito con Number()
}

interface DipendenteResBody {
  ok: true;
  dato: Dipendente;
}

const getDipendente: RequestHandler<ParamsId, DipendenteResBody> = (
  req,
  res,
) => {
  const id = Number(req.params.id); // tipo: number (params.id e' string)
  // req.params.id      // tipo: string
  // ERRORE TS: const x: number = req.params.id; // string non e' number
  const dato: Dipendente = {
    id,
    nome: "Rossi",
    badge: "UP-001",
    ruolo: "Operatore",
    repartoId: 1,
  };
  res.status(200).json({ ok: true, dato });
};
void getDipendente;

// ---------------------------------------------------------------------------
// 5) Body tipizzato (POST /timbrature)
// ---------------------------------------------------------------------------
// ReqBody e' il 3o generic: descrive il JSON in ingresso.

interface CreaTimbraturaBody {
  dipendenteId: number;
  entrata: string; // "08:00"
}

interface TimbraturaResBody {
  ok: true;
  timbratura: Timbratura;
}

// Ordine dei generic: <Params, ResBody, ReqBody, Query>.
// Non ci servono params, quindi mettiamo ParamsDictionary come default esplicito.
const creaTimbratura: RequestHandler<
  ParamsDictionary,
  TimbraturaResBody,
  CreaTimbraturaBody
> = (req, res) => {
  const { dipendenteId, entrata } = req.body; // dipendenteId: number, entrata: string
  // ERRORE TS: req.body.uscita; // 'uscita' non esiste su CreaTimbraturaBody
  const timbratura: Timbratura = {
    id: 1,
    dipendenteId,
    entrata,
    uscita: null,
  };
  res.status(201).json({ ok: true, timbratura });
};
void creaTimbratura;

// ---------------------------------------------------------------------------
// 6) Query tipizzata (GET /timbrature?reparto=1&turno=P4)
// ---------------------------------------------------------------------------
// La query e' il 4o generic. Attenzione: i valori restano string a runtime.

interface TimbratureQuery {
  reparto?: string; // "1"
  turno?: Turno; // "P4" | "P2" | "STD"
  // Nota: a runtime turno e' comunque una string qualsiasi; il tipo e' una
  // PROMESSA che va validata (vedi middleware di validazione piu' avanti).
  [key: string]: string | string[] | undefined;
}

const listaTimbrature: RequestHandler<
  ParamsDictionary,
  Timbratura[],
  unknown,
  TimbratureQuery
> = (req, res) => {
  const reparto = req.query.reparto; // tipo: string | string[] | undefined
  const turno = req.query.turno; // tipo: string | string[] | undefined
  void reparto;
  void turno;
  res.status(200).json([]); // ResBody = Timbratura[]
};
void listaTimbrature;

// ---------------------------------------------------------------------------
// 7) Middleware tipizzato
// ---------------------------------------------------------------------------
// Un middleware ha la stessa firma di un handler: la differenza e' che
// tipicamente chiama next() invece di rispondere.

// Esempio 7.1 - logger: non tocca i tipi, li lascia generici.
const logger: RequestHandler = (req, _res, next) => {
  // console.log(`${req.method} ${req.path}`);
  void req.method;
  next(); // prosegue
};
void logger;

// Esempio 7.2 - auth middleware: POPOLA req.utente e poi chiama next().
const requireAuth: RequestHandler = (req, res, next) => {
  const token = req.headers["authorization"]; // string | undefined
  if (!token) {
    res.status(401).json({ error: "no token" });
    return; // importante: NON chiamare next() dopo aver risposto
  }
  req.utente = {
    id: 1,
    nome: "Bianchi",
    badge: "UP-002",
    ruolo: "Admin",
    repartoId: 1,
  };
  next();
};
void requireAuth;

// Esempio 7.3 - middleware di autorizzazione per ruolo (factory tipizzata).
// Ritorna un RequestHandler: pattern comune per parametrizzare i middleware.
function requireRuolo(...ammessi: Ruolo[]): RequestHandler {
  return (req, res, next) => {
    const u = req.utente;
    if (!u || !ammessi.includes(u.ruolo)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    next();
  };
}
// Uso: requireRuolo("SuperAdmin", "Admin")
void requireRuolo;

// Esempio 7.4 - error handler: firma a 4 argomenti (err in prima posizione).
// Express distingue l'error handler dal numero di parametri (4 vs 3).
export type ErrorRequestHandler = (
  err: unknown,
  req: Req,
  res: Res,
  next: NextFunction,
) => void;

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const message = err instanceof Error ? err.message : "errore sconosciuto";
  res.status(500).json({ error: message });
};
void errorHandler;

// ---------------------------------------------------------------------------
// 8) Type guard di validazione (colmano il gap tipo<->runtime)
// ---------------------------------------------------------------------------
// I generic sono PROMESSE: req.body ha il tipo che dichiari, ma il JSON reale
// potrebbe non rispettarlo. Serve validazione runtime con type predicate.

const RE_ORARIO = /^\d{2}:\d{2}$/;
const RE_BADGE = /^UP-\d{3}$/;

function isCreaTimbraturaBody(x: unknown): x is CreaTimbraturaBody {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["dipendenteId"] === "number" &&
    typeof o["entrata"] === "string" &&
    RE_ORARIO.test(o["entrata"])
  );
}

function isBadge(x: unknown): x is string {
  return typeof x === "string" && RE_BADGE.test(x);
}

// Handler che valida il body prima di fidarsi del tipo.
const creaTimbraturaSicura: RequestHandler<
  ParamsDictionary,
  TimbraturaResBody | { error: string },
  unknown
> = (req, res) => {
  if (!isCreaTimbraturaBody(req.body)) {
    res.status(400).json({ error: "body non valido" });
    return;
  }
  // Da qui req.body e' RISTRETTO a CreaTimbraturaBody dal type guard.
  const timbratura: Timbratura = {
    id: 1,
    dipendenteId: req.body.dipendenteId,
    entrata: req.body.entrata,
    uscita: null,
  };
  res.status(201).json({ ok: true, timbratura });
};
void creaTimbraturaSicura;
void isBadge;

// ---------------------------------------------------------------------------
// 9) Router mock con overload tipizzati
// ---------------------------------------------------------------------------
// app.get<Params, ResBody, ReqBody, Query>(path, ...handlers) e' generico.
// Ricostruiamo un mini Router che accetta catene di handler tipizzati.

export interface Router {
  get<P = ParamsDictionary, ResBody = unknown, ReqBody = unknown, Q = QueryDictionary>(
    path: string,
    ...handlers: RequestHandler<P, ResBody, ReqBody, Q>[]
  ): this;
  post<P = ParamsDictionary, ResBody = unknown, ReqBody = unknown, Q = QueryDictionary>(
    path: string,
    ...handlers: RequestHandler<P, ResBody, ReqBody, Q>[]
  ): this;
  use(...handlers: RequestHandler[]): this;
}

// Implementazione mock: registra soltanto, non esegue HTTP reale.
function createRouter(): Router {
  const router: Router = {
    get(_path, ..._handlers) {
      return router;
    },
    post(_path, ..._handlers) {
      return router;
    },
    use(..._handlers) {
      return router;
    },
  };
  return router;
}

// Esempio 9.1 - registrazione con generic espliciti e chaining.
const api = createRouter();
api
  .use(logger, requireAuth)
  .get<ParamsId, DipendenteResBody>("/dipendenti/:id", getDipendente)
  .post<ParamsDictionary, TimbraturaResBody, CreaTimbraturaBody>(
    "/timbrature",
    creaTimbratura,
  );
void api;

// ---------------------------------------------------------------------------
// 10) Branded type per Badge (typing avanzato del dominio)
// ---------------------------------------------------------------------------
// Un branded type distingue una string "qualsiasi" da una gia' validata.

declare const badgeBrand: unique symbol;
export type Badge = string & { readonly [badgeBrand]: true };

// L'unico modo per ottenere un Badge e' passare dalla validazione.
function parseBadge(x: string): Badge | null {
  return RE_BADGE.test(x) ? (x as Badge) : null;
}

function stampaBadge(b: Badge): void {
  void b; // qui sei SICURO che rispetta /^UP-\d{3}$/
}

const forse = parseBadge("UP-003"); // tipo: Badge | null
if (forse) stampaBadge(forse); // OK dopo il narrowing
// ERRORE TS: stampaBadge("UP-004"); // string grezza non e' assegnabile a Badge
void parseBadge;

// ---------------------------------------------------------------------------
// 11) Handler async e utility type di ritorno
// ---------------------------------------------------------------------------
// RequestHandler ammette Promise<void>: gli handler async sono validi.

async function findDipendente(id: number): Promise<Dipendente | null> {
  return id > 0
    ? { id, nome: "Verdi", badge: "UP-005", ruolo: "Operatore", repartoId: 2 }
    : null;
}

const getDipendenteAsync: RequestHandler<
  ParamsId,
  Dipendente | { error: string }
> = async (req, res) => {
  const d = await findDipendente(Number(req.params.id)); // Dipendente | null
  if (!d) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.status(200).json(d);
};
void getDipendenteAsync;

// Utility: estrarre il tipo di ResBody da un RequestHandler con infer.
export type ResBodyOf<H> =
  H extends RequestHandler<infer _P, infer R, infer _B, infer _Q> ? R : never;

// Esempio: type X = ResBodyOf<typeof getDipendente>;
type _X = ResBodyOf<typeof getDipendente>; // tipo: DipendenteResBody
const _campione: _X = { ok: true, dato: { id: 1, nome: "R", badge: "UP-001", ruolo: "Admin", repartoId: 1 } };
void _campione;

// ---------------------------------------------------------------------------
// 12) Esempio di composizione: pipeline di middleware+handler per una route
// ---------------------------------------------------------------------------
// Simuliamo l'esecuzione della catena per mostrare i tipi in gioco (non e'
// un vero server: e' un driver didattico chiamabile).

function eseguiCatena<P, ResBody, ReqBody, Q>(
  req: Req<P, ResBody, ReqBody, Q>,
  res: Res<ResBody>,
  catena: RequestHandler<P, ResBody, ReqBody, Q>[],
): void {
  let i = 0;
  const next: NextFunction = (err) => {
    if (err) return; // in reale: salterebbe all'error handler
    const h = catena[i++];
    if (h) void h(req, res, next);
  };
  next();
}
void eseguiCatena;

// ---------------------------------------------------------------------------
// 13) Export pubblici del modulo
// ---------------------------------------------------------------------------
export {
  ping,
  getMe,
  getDipendente,
  creaTimbratura,
  listaTimbrature,
  requireAuth,
  requireRuolo,
  errorHandler,
  creaTimbraturaSicura,
  isCreaTimbraturaBody,
  parseBadge,
  createRouter,
  eseguiCatena,
};

/*
 * RIEPILOGO COMANDI / CONCETTI
 * - Interfacce mock: sostituiscono @types/express restando autonomi.
 * - Req<P, ResBody, ReqBody, Query>: 4 generic, stesso ordine di Express.
 * - Res<ResBody>: res.json accetta SOLO il ResBody dichiarato; metodi -> this (chaining).
 * - RequestHandler<P, ResBody, ReqBody, Q>: firma (req, res, next) => void | Promise<void>.
 * - params: sempre Record<string,string> -> convertire con Number().
 * - body: 3o generic, tipizza il JSON in ingresso (ma va VALIDATO a runtime).
 * - query: 4o generic, valori string | string[] | undefined.
 * - Middleware = handler che chiama next(); factory ritorna RequestHandler.
 * - Dopo res.json/res.send NON chiamare next() (doppia risposta).
 * - ErrorRequestHandler: 4 argomenti (err, req, res, next).
 * - Type guard (x is T) + regex: colmano il gap tipo<->runtime su body/query.
 * - Branded type (string & { [brand]: true }): distingue Badge validato da string grezza.
 * - Router mock con metodi generici e chaining (return this).
 * - Handler async: Promise<void> e' ammesso dalla firma.
 * - infer in conditional type: ResBodyOf<H> estrae il ResBody da un handler.
 * - RE_ORARIO /^\d{2}:\d{2}$/, RE_BADGE /^UP-\d{3}$/: validazione dominio ERP.
 * - Compila con: tsc --strict --target ES2022 --lib ES2022,DOM --noEmit
 */
