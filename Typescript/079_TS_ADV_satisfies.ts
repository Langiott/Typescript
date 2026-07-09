/**
 * File 79 - ADV: satisfies operator
 *
 * L'operatore `satisfies` (TS 4.9+) valida che un valore sia ASSEGNABILE a un
 * tipo target SENZA allargarne (widening) il tipo inferito: ottieni sia il
 * controllo del type-checker sia il tipo piu' stretto (literal/narrow) del valore.
 * In questo file confrontiamo `satisfies` vs `as` vs annotazione esplicita, con
 * config REPARTI (Record<...>), palette di colori, esempi ERP Polyuretech,
 * meccanismi interni (widening, inferenza, control flow) e GOTCHA finali.
 * Tutto compila con `tsc --strict` (target ES2022). Decorator solo nei commenti.
 */

// ============================================================================
// 0) HELPER DI TIPO PER I "TEST DI TIPO" (usati in tutto il file)
// ============================================================================

// Equal<A, B>: true solo se A e B sono lo STESSO tipo (identita' strutturale).
// Il doppio condizionale con funzioni generiche e' il trucco classico: due tipi
// sono uguali sse le due funzioni "identity conditional" sono mutuamente assegnabili.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect<T>: accetta solo T = true. Usato come asserzione di tipo a compile-time.
type Expect<T extends true> = T;

// Esempio d'uso: se il tipo non e' true, `tsc` segnala errore.
type _t0 = Expect<Equal<1, 1>>; // ok
// type _t0bad = Expect<Equal<1, 2>>; // ERRORE TS: '2' non e' 'true' (i tipi differiscono)

// ============================================================================
// 1) IL PROBLEMA CHE satisfies RISOLVE: WIDENING vs VALIDAZIONE
// ============================================================================

// (a) Solo let/const: senza aiuti, il compilatore INFERISCE tipi larghi per gli
//     oggetti. Nessuna validazione contro un tipo target.
const senzaNulla = { host: "localhost", port: 5432 };
// tipo: { host: string; port: number }  <-- 'string'/'number', NON literal

// (b) Annotazione esplicita: VALIDA contro il tipo, ma il tipo statico diventa
//     il tipo DICHIARATO -> perdi le info piu' strette (literal, chiavi note).
type Config = { host: string; port: number };
const conAnnotazione: Config = { host: "localhost", port: 5432 };
// tipo: Config  <-- non sai piu' che host e' esattamente "localhost"

// (c) `as` (type assertion): NON valida davvero (fidati-di-me), e puo' mentire.
const conAs = { host: "localhost", port: 5432 } as Config;
// tipo: Config  <-- come sopra, e in piu' 'as' puo' nascondere errori (vedi sotto)

// (d) `satisfies`: VALIDA che il valore sia un Config, ma MANTIENE il tipo
//     stretto inferito dal valore. Il meglio dei due mondi.
const conSatisfies = { host: "localhost", port: 5432 } satisfies Config;
// tipo: { host: string; port: number }  (l'oggetto letterale, non allargato a Config)
// Nota: qui host resta 'string' perche' il valore e' un const-binding di un oggetto
// mutabile; per ottenere literal servono `as const` o proprieta' readonly (vedi 3).

// La differenza chiave: `satisfies` controlla l'ASSEGNABILITA' ma NON cambia il
// tipo statico dell'espressione. `annotazione`/`as` SOSTITUISCONO il tipo.

// ============================================================================
// 2) PERCHE' `as` E' PERICOLOSO E `satisfies` NO
// ============================================================================

type Punto = { x: number; y: number };

// Con `as` puoi asserire un tipo SBAGLIATO su un oggetto incompleto: il compilatore
// si fida e ti lascia passare -> bug a runtime (y e' undefined ma il tipo dice number).
const bugPunto = { x: 10 } as Punto; // (compila ma e' UNSAFE: manca y)
// bugPunto.y e' 'number' a livello di tipo, ma undefined a runtime.

// Con `satisfies` lo STESSO errore viene CATTURATO subito:
// const okPunto = { x: 10 } satisfies Punto;
// ERRORE TS: Property 'y' is missing in type '{ x: number; }' but required in type 'Punto'.

// Regola pratica: usa `satisfies` per "voglio essere sicuro che questo valore sia
// un T"; usa `as` solo quando SAI qualcosa che il compilatore non puo' sapere
// (es. narrowing di unknown proveniente da JSON.parse), consapevole del rischio.

// ============================================================================
// 3) satisfies + as const: PRESERVARE I LITERAL E VALIDARE INSIEME
// ============================================================================

// `as const` congela l'oggetto in un tipo profondamente readonly con literal.
// `satisfies` aggiunge la validazione strutturale. Ordine: `... as const satisfies T`.
const rotta = {
  metodo: "GET",
  path: "/api/dipendenti",
} as const satisfies { metodo: "GET" | "POST"; path: string };
// tipo: { readonly metodo: "GET"; readonly path: "/api/dipendenti" }
// Validato (metodo deve essere "GET"|"POST"), ma i literal esatti sono preservati.

type _t1 = Expect<Equal<typeof rotta.metodo, "GET">>; // ok: literal, non 'string'

// Se sbagliassi il literal, `satisfies` lo intercetta anche con `as const`:
// const rottaBad = { metodo: "PATCH", path: "/x" } as const
//   satisfies { metodo: "GET" | "POST"; path: string };
// ERRORE TS: Type '"PATCH"' is not assignable to type '"GET" | "POST"'.

// ============================================================================
// 4) CASO CENTRALE: config REPARTI come Record<...> con satisfies
// ============================================================================

// Dominio ERP Polyuretech. Definiamo i reparti come un oggetto config.
// Vogliamo due garanzie contemporaneamente:
//  - OGNI valore rispetta la forma RepartoConfig (validazione via Record).
//  - Le CHIAVI restano note come literal (per autocompletamento e key typing).
// L'annotazione `: Record<string, RepartoConfig>` darebbe la forma ma cancellerebbe
// le chiavi specifiche (diventerebbe indicizzabile con qualunque string).
// `satisfies` invece valida e conserva le chiavi esatte.

type Turno = "P4" | "P2" | "STD";

interface RepartoConfig {
  readonly nome: string;
  readonly turnoDefault: Turno;
  readonly capienza: number;
  readonly attivo: boolean;
}

const REPARTI = {
  produzione: { nome: "Produzione", turnoDefault: "P4", capienza: 40, attivo: true },
  magazzino:  { nome: "Magazzino",  turnoDefault: "STD", capienza: 12, attivo: true },
  qualita:    { nome: "Qualita'",   turnoDefault: "P2", capienza: 8,  attivo: true },
  uffici:     { nome: "Uffici",     turnoDefault: "STD", capienza: 20, attivo: false },
} satisfies Record<string, RepartoConfig>;
// tipo: { produzione: {...}; magazzino: {...}; qualita: {...}; uffici: {...} }
// -> le chiavi sono i literal esatti, i valori sono validati come RepartoConfig.

// Chiavi note = union esatta (derivata dal tipo di REPARTI, non da 'string'):
type RepartoId = keyof typeof REPARTI;
// tipo: "produzione" | "magazzino" | "qualita" | "uffici"
type _t2 = Expect<Equal<RepartoId, "produzione" | "magazzino" | "qualita" | "uffici">>; // ok

// Accesso type-safe: TS conosce la chiave, quindi niente 'possibly undefined'.
const capMag = REPARTI.magazzino.capienza; // tipo: number  => 12

// Errore intercettato se un valore non e' conforme:
// const REPARTI_BAD = {
//   x: { nome: "X", turnoDefault: "P9", capienza: 1, attivo: true },
// } satisfies Record<string, RepartoConfig>;
// ERRORE TS: Type '"P9"' is not assignable to type 'Turno'.

// Errore intercettato anche su chiave assente a valore (record parziale):
// const REPARTI_BAD2 = {
//   y: { nome: "Y", turnoDefault: "STD", attivo: true },
// } satisfies Record<string, RepartoConfig>;
// ERRORE TS: Property 'capienza' is missing ...

// Perche' non usare direttamente l'annotazione? Confronto:
const REPARTI_ANNOT: Record<string, RepartoConfig> = REPARTI;
type ChiaviAnnot = keyof typeof REPARTI_ANNOT; // tipo: string  <-- chiavi PERSE
// REPARTI_ANNOT.nonEsiste -> compila (tipo RepartoConfig) ma e' undefined a runtime!
// Con `satisfies`, REPARTI.nonEsiste NON compilerebbe (ERRORE TS: property inesistente).

// ============================================================================
// 5) PALETTE DI COLORI: il caso "manuale" della doc TS, esteso all'ERP
// ============================================================================

// Vogliamo una palette dove i valori sono colori esadecimali OPPURE tuple RGB.
// Con `satisfies` validiamo la forma ma conserviamo il tipo per chiave, cosi'
// possiamo chiamare metodi specifici (string vs tuple) senza narrowing manuale.

type Colore = string | readonly [number, number, number];

const palette = {
  primario:   "#0B5FFF",
  errore:     "#D7263D",
  successo:   [22, 163, 74],   // RGB
  warning:    [234, 179, 8],   // RGB
  neutro:     "#6B7280",
} satisfies Record<string, Colore>;

// Grazie a satisfies, il tipo PER CHIAVE e' preservato:
palette.primario.toUpperCase();     // ok: primario e' string
palette.successo[0].toFixed(0);     // ok: successo e' number-tuple => "22"
// palette.primario[0].toFixed();   // ERRORE TS: string non ha elemento tupla number
// palette.successo.toUpperCase();  // ERRORE TS: la tupla non ha toUpperCase

// Se avessimo annotato `: Record<string, Colore>`, ogni valore sarebbe
// `string | readonly [number,number,number]` e servirebbe narrowing manuale.

// Semaforo ERP: mappiamo lo stato macchina a un colore della palette.
type StatoMacchina = "ok" | "manutenzione" | "guasto";
const coloreStato = {
  ok: palette.successo,
  manutenzione: palette.warning,
  guasto: palette.errore,
} satisfies Record<StatoMacchina, Colore>;
// tipo: { ok: readonly [number,number,number]; manutenzione: readonly [...]; guasto: string }
// Nota: `Record<StatoMacchina, Colore>` come TARGET impone anche l'EXHAUSTIVENESS:
// devi coprire tutte le chiavi di StatoMacchina, altrimenti errore.

// Dimenticare una chiave viene segnalato:
// const coloreStatoBad = { ok: palette.successo, guasto: palette.errore }
//   satisfies Record<StatoMacchina, Colore>;
// ERRORE TS: Property 'manutenzione' is missing ...

// ============================================================================
// 6) MECCANISMO INTERNO: perche' satisfies NON allarga (widening) il tipo
// ============================================================================

// Il "literal widening" e' il processo per cui TS, in contesti mutabili, allarga
// "GET" -> string, 42 -> number, true -> boolean. Un'ANNOTAZIONE forza il tipo
// dichiarato (contextual typing) e puo' allargare/sostituire. `satisfies` invece
// e' un semplice CHECK: prende il tipo che il valore avrebbe AVUTO comunque e ne
// verifica l'assegnabilita' al target, senza reinserirsi nel contextual typing.

// Confronto diretto sui literal:
const conAnnot2: Turno = "P4";           // tipo: Turno (union larga)
const conSat2 = "P4" satisfies Turno;    // tipo: "P4"   <-- literal preservato!
type _t3 = Expect<Equal<typeof conSat2, "P4">>; // ok

// Dettaglio fine (spesso frainteso): quando il TARGET tipizza una proprieta' con
// un tipo che AMMETTE quel literal, il contextual typing fa si' che TS conservi il
// literal anche in un oggetto mutabile. Quindi qui 'turno' resta "P4", NON diventa
// Turno. Il tipo dell'oggetto pero' e' MUTABILE (non readonly): puoi riassegnare
// obj.turno = "STD". Serve `as const` se vuoi anche l'immutabilita' (readonly).
const obj = { turno: "P4" } satisfies { turno: Turno };
type _t4 = Expect<Equal<typeof obj.turno, "P4">>; // "P4" preservato (contextual typing)
const objConst = { turno: "P4" } as const satisfies { turno: Turno };
type _t5 = Expect<Equal<typeof objConst.turno, "P4">>; // "P4" MA readonly (as const)
// La vera differenza obj vs objConst non e' il literal, e' la mutabilita':
// type _mut = Expect<Equal<typeof obj, { turno: "P4" }>>;                 // mutabile
// type _ro  = Expect<Equal<typeof objConst, { readonly turno: "P4" }>>;  // readonly

// ============================================================================
// 7) satisfies E FUNZIONI: firma nota + inferenza dei parametri
// ============================================================================

// Applicando satisfies a una funzione, i parametri ottengono il TIPO CONTESTUALE
// dalla firma target (niente 'implicit any'), ma il tipo dell'espressione resta
// la funzione stessa (utile se vuoi ancora il tipo di ritorno inferito preciso).
type Validator = (v: string) => boolean;

const isBadge = ((v) => /^UP-\d{3}$/.test(v)) satisfies Validator;
// v e' inferito 'string' dal target Validator (no any). tipo espressione: (v: string) => boolean
const okBadge = isBadge("UP-001"); // tipo: boolean  => true
const koBadge = isBadge("X-1");    // => false

// Mappa di validatori del dominio ERP, validata come Record ma con chiavi note:
const validators = {
  badge: (v: string) => /^UP-\d{3}$/.test(v),
  orario: (v: string) => /^\d{2}:\d{2}$/.test(v),
  nonVuoto: (v: string) => v.trim().length > 0,
} satisfies Record<string, Validator>;
type CampoValidabile = keyof typeof validators; // "badge" | "orario" | "nonVuoto"
validators.orario("08:30"); // => true
// validators.email("x");   // ERRORE TS: 'email' non esiste (chiavi preservate)

// ============================================================================
// 8) ESEMPIO ERP #1 - DTO / SEED DIPENDENTI: forma valida + literal utili
// ============================================================================

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

interface Dipendente {
  readonly id: number;
  readonly nome: string;
  readonly badge: `UP-${number}`; // template literal type
  readonly ruolo: Ruolo;
  readonly repartoId: RepartoId;  // riusa le chiavi derivate da REPARTI!
}

// Seed iniziale: array di Dipendente validato con satisfies. Manteniamo i literal
// (utile per test e per derivare tipi dai dati) ma garantiamo la conformita'.
const SEED_DIPENDENTI = [
  { id: 1, nome: "Rossi",  badge: "UP-001", ruolo: "SuperAdmin", repartoId: "produzione" },
  { id: 2, nome: "Bianchi", badge: "UP-002", ruolo: "Operatore",  repartoId: "magazzino" },
  { id: 3, nome: "Verdi",  badge: "UP-003", ruolo: "Admin",      repartoId: "qualita" },
] as const satisfies readonly Dipendente[];
// Validato (ruolo/repartoId devono appartenere alle union), literal preservati.

// Deriviamo una union dei nomi presenti nel seed, GRATIS, dai dati:
type NomeSeed = (typeof SEED_DIPENDENTI)[number]["nome"];
// tipo: "Rossi" | "Bianchi" | "Verdi"
type _t6 = Expect<Equal<NomeSeed, "Rossi" | "Bianchi" | "Verdi">>; // ok

// Errore di dominio intercettato (repartoId inesistente):
// const SEED_BAD = [
//   { id: 9, nome: "X", badge: "UP-009", ruolo: "Operatore", repartoId: "cucina" },
// ] as const satisfies readonly Dipendente[];
// ERRORE TS: Type '"cucina"' is not assignable to type 'RepartoId'.

// ============================================================================
// 9) ESEMPIO ERP #2 - MAPPA ROTTE/HANDLER (mock, nessun Express reale)
// ============================================================================

// NOTA: definiamo interfacce MOCK (Req/Res) nel file; nessun import da 'express'.
interface Req { readonly params: Record<string, string>; }
interface Res { json(body: unknown): void; }
type Handler = (req: Req, res: Res) => void;

// Config rotte: satisfies Record<string, Handler> valida ogni handler ma conserva
// le chiavi (i path) come literal -> puoi indicizzare in modo type-safe altrove.
const ROTTE = {
  "GET /timbrature":      (_req, res) => res.json([]),
  "POST /timbrature":     (req, res) => res.json({ ok: true, id: req.params.id }),
  "GET /dipendenti":      (_req, res) => res.json(SEED_DIPENDENTI),
} satisfies Record<string, Handler>;
type PathRotta = keyof typeof ROTTE; // "GET /timbrature" | "POST /timbrature" | "GET /dipendenti"

// I parametri req/res sono tipati dal target Handler (no implicit any):
const _handlersOk: Record<PathRotta, Handler> = ROTTE; // assegnabile: la forma e' garantita

// ============================================================================
// 10) ESEMPIO ERP #3 - STATO MACCHINA (state machine) tipata con satisfies
// ============================================================================

// Transizioni di una timbratura: da uno stato a quali stati puoi andare.
// Usiamo satisfies per garantire che le chiavi/valori siano stati validi E per
// preservare le tuple di transizioni come literal (cosi' possiamo derivarne tipi).
type StatoTimbratura = "aperta" | "chiusa" | "annullata";

const TRANSIZIONI = {
  aperta:    ["chiusa", "annullata"],
  chiusa:    [],
  annullata: [],
} as const satisfies Record<StatoTimbratura, readonly StatoTimbratura[]>;
// Validato: chiavi = tutti gli stati; valori = array di stati validi. Literal preservati.

// Type-level: da uno stato ottieni la union delle transizioni ammesse.
type TransizioniDa<S extends StatoTimbratura> = (typeof TRANSIZIONI)[S][number];
type DaAperta = TransizioniDa<"aperta">;    // "chiusa" | "annullata"
type DaChiusa = TransizioniDa<"chiusa">;    // never (array vuoto -> nessun elemento)
type _t7 = Expect<Equal<DaAperta, "chiusa" | "annullata">>; // ok
type _t8 = Expect<Equal<DaChiusa, never>>;                  // ok

// Funzione di transizione type-safe che rifiuta salti illegali a compile-time:
function transita<S extends StatoTimbratura>(da: S, a: TransizioniDa<S>): TransizioniDa<S> {
  return a;
}
const t1 = transita("aperta", "chiusa"); // ok  => "chiusa"
// const tBad = transita("aperta", "aperta"); // ERRORE TS: "aperta" non e' "chiusa"|"annullata"
// const tBad2 = transita("chiusa", "aperta"); // ERRORE TS: da 'chiusa' non parte nulla (never)

// ============================================================================
// 11) satisfies IN CATENA (builder passo-passo): costruire e validare insieme
// ============================================================================

// Costruiamo una config di validazione orari naive-UTC "HH:MM" per turno, un pezzo
// alla volta, validando ogni step. Mostra il ragionamento incrementale.

// Step A: definiamo i vincoli per turno.
interface VincoloTurno {
  readonly ingressoMin: `${number}:${number}`; // "HH:MM"
  readonly ingressoMax: `${number}:${number}`;
  readonly pausaMin: number; // minuti
}

// Step B: la config, validata come Record<Turno, VincoloTurno> (exhaustive sui Turni).
const VINCOLI = {
  P4:  { ingressoMin: "06:00", ingressoMax: "06:30", pausaMin: 30 },
  P2:  { ingressoMin: "14:00", ingressoMax: "14:30", pausaMin: 20 },
  STD: { ingressoMin: "08:30", ingressoMax: "09:15", pausaMin: 60 },
} as const satisfies Record<Turno, VincoloTurno>;

// Step C: derivo un tipo dai dati (tutti i "min" usati), gratis:
type IngressiMin = (typeof VINCOLI)[Turno]["ingressoMin"];
// tipo: "06:00" | "14:00" | "08:30"
type _t9 = Expect<Equal<IngressiMin, "06:00" | "14:00" | "08:30">>; // ok

// Step D: uso runtime coerente col tipo statico.
function ingressoConsentito(turno: Turno, orario: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(orario)) return false;
  const v = VINCOLI[turno]; // tipo: VincoloTurno (chiave nota, niente undefined)
  return orario >= v.ingressoMin && orario <= v.ingressoMax; // confronto lessicografico "HH:MM"
}
const _c1 = ingressoConsentito("P4", "06:15"); // => true
const _c2 = ingressoConsentito("P4", "07:00"); // => false

// ============================================================================
// 12) GOTCHA / PITFALLS (trappole comuni e soluzioni)
// ============================================================================

// GOTCHA 1 - satisfies NON congela e NON garantisce literal quando il TARGET e'
// largo. Se la proprieta' target e' `string`/`number` (non un literal/union stretta),
// il valore viene ALLARGATO. Qui `nome: string` -> "Rossi" diventa string.
const g1 = { nome: "Rossi", n: 42 } satisfies { nome: string; n: number };
type _g1a = Expect<Equal<typeof g1.nome, string>>; // ALLARGATO a string (target largo)
type _g1b = Expect<Equal<typeof g1.n, number>>;    // ALLARGATO a number
// Se ti servono i LITERAL ("Rossi", 42), aggiungi `as const`:
const g1c = { nome: "Rossi", n: 42 } as const satisfies { nome: string; n: number };
type _g1c = Expect<Equal<typeof g1c.nome, "Rossi">>; // literal preservato
// Regola: satisfies preserva il literal solo se il TARGET lo ammette come literal;
// contro un target largo (string/number) subentra il widening. `as const` risolve.

// GOTCHA 2 - `satisfies` NON restringe l'unione a runtime: verifica solo il tipo.
// Con valori union (string | tuple) devi comunque fare narrowing per usarli.
const c: Colore = palette.primario;
// c.toUpperCase(); // ERRORE TS: 'toUpperCase' non esiste su string | readonly [number,...]
if (typeof c === "string") {
  c.toUpperCase(); // ok dopo narrowing con typeof
}
// (Dentro `palette.primario` il tipo e' stretto perche' viene DAL literal; ma se lo
//  copi in una variabile annotata `: Colore` torni all'unione larga.)

// GOTCHA 3 - excess property check: `satisfies` con un tipo "chiuso" segnala le
// proprieta' in ECCESSO (a differenza di un semplice sottotipaggio strutturale).
// const g3 = { host: "h", port: 1, extra: true } satisfies Config;
// ERRORE TS: Object literal may only specify known properties, 'extra' does not exist in type 'Config'.
// Soluzione: se l'extra e' voluto, usa un tipo con index signature o una interfaccia estesa.

// GOTCHA 4 - ordine con `as const`: la forma corretta e' `valore as const satisfies T`.
// Scrivere `valore satisfies T as const` prima valuta satisfies e poi `as const`
// sull'ESPRESSIONE (associativita' diversa) -> risultato spesso non voluto/errore.
// Regola mnemonica: prima congela (as const), poi valida (satisfies).
const g4 = ["a", "b"] as const satisfies readonly string[]; // ok: readonly ["a","b"]
type _g4 = Expect<Equal<typeof g4, readonly ["a", "b"]>>;    // ok

// GOTCHA 5 (bonus) - satisfies vs annotazione per DEFAULT/parziali: se vuoi che
// mancanze siano un errore, usa satisfies/annotazione con tipo completo. Se vuoi
// permettere assenze, usa Partial<T> come target.
const parziale = { host: "h" } satisfies Partial<Config>; // ok: port opzionale
// const completo = { host: "h" } satisfies Config;       // ERRORE TS: manca 'port'

// ============================================================================
// 13) PATTERN AVANZATO: satisfies per "chiudere" un Record e derivare tabelle
// ============================================================================

// Vogliamo una tabella prezzi/priorita' per ruolo che sia ESAUSTIVA (tutti i ruoli)
// e da cui poter DERIVARE tipi. `satisfies Record<Ruolo, number>` forza l'exhaustive
// check ma preserva i valori literal per eventuali derivazioni.
const PRIORITA_RUOLO = {
  SuperAdmin: 100,
  Admin: 70,
  Operatore: 40,
  QrDisplay: 10,
} as const satisfies Record<Ruolo, number>;
type PrioritaValori = (typeof PRIORITA_RUOLO)[Ruolo]; // 100 | 70 | 40 | 10
type _t10 = Expect<Equal<PrioritaValori, 100 | 70 | 40 | 10>>; // ok

// Se aggiungi un ruolo alla union Ruolo e dimentichi la tabella, `satisfies`
// (grazie a Record<Ruolo, number>) ti costringe ad aggiornarla: manutenibilita'.
// Se togliessi una chiave: ERRORE TS: Property 'QrDisplay' is missing ...

// Utility che usa la tabella in modo type-safe (chiave nota => nessun undefined):
function priorita(r: Ruolo): number {
  return PRIORITA_RUOLO[r]; // tipo del risultato: number literal ristretto
}
const _p = priorita("Admin"); // => 70

// ============================================================================
// 14) satisfies vs as: TABELLA DECISIONALE (in codice)
// ============================================================================

// - Voglio VALIDARE un valore contro un tipo, mantenendo il tipo stretto?  -> satisfies
// - Voglio SOSTITUIRE/allargare il tipo statico al target dichiarato?      -> annotazione
// - So io la verita' (unknown->T, narrowing manuale) e accetto il rischio? -> as
// - Voglio literal + validazione insieme?                                  -> as const satisfies T
// Dimostrazione compatta delle 3 vie sullo stesso valore:
const via_annot: Turno = "P2";        // tipo: Turno
const via_as = "P2" as Turno;         // tipo: Turno (unsafe se il literal fosse errato)
const via_sat = "P2" satisfies Turno; // tipo: "P2"  (validato E stretto)
type _t11 = Expect<Equal<typeof via_sat, "P2">>; // ok
void via_annot; void via_as;          // (evita warning "unused" concettuale)

// ============================================================================
// EXPORTS (solo simboli LOCALI di questo file)
// ============================================================================

export { REPARTI, palette, SEED_DIPENDENTI, VINCOLI, TRANSIZIONI, PRIORITA_RUOLO, transita, ingressoConsentito, priorita };
export type { Equal, Expect, RepartoConfig, RepartoId, Turno, Ruolo, Dipendente, StatoTimbratura, TransizioniDa, Colore };

/* ============================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ----------------------------------------------------------------------------
 * - satisfies (TS 4.9+): valida assegnabilita' a un tipo target SENZA cambiare
 *   il tipo statico dell'espressione (niente widening indotto dall'annotazione).
 * - Tre vie a confronto:
 *     annotazione (: T) -> valida MA sostituisce il tipo col target (perdi literal).
 *     as T              -> NON valida davvero (fidati-di-me), puo' nascondere bug.
 *     satisfies T       -> valida E preserva il tipo stretto inferito dal valore.
 * - as const satisfies T: congela i literal (readonly) E valida la forma. Ordine:
 *   prima `as const`, poi `satisfies`.
 * - satisfies NON congela (l'oggetto resta mutabile) e conserva il literal SOLO se
 *   il target lo ammette come literal; contro un target largo (string/number) allarga.
 *   Per literal garantiti + immutabilita' usa `as const`.
 * - satisfies NON restringe union a runtime: serve comunque narrowing (typeof, in).
 * - Excess property check: satisfies segnala proprieta' in eccesso su tipi chiusi.
 * - Record<Chiavi, V> come target: impone EXHAUSTIVENESS (tutte le chiavi) e valida
 *   i valori, ma con satisfies le CHIAVI restano literal (a differenza dell'annotazione
 *   Record<string, V> che le appiattisce a string).
 * - Pattern ricorrenti: config REPARTI, palette colori, mappa validatori/handler,
 *   seed DTO, state machine (TRANSIZIONI), tabelle per-ruolo -> tutti "valida + deriva".
 * - Derivare tipi dai dati: keyof typeof X, (typeof X)[number], (typeof X)[K]["prop"].
 * - Helper di tipo: Equal<A,B> + Expect<T extends true> per test di tipo a compile-time.
 * - GOTCHA: manca as const per i literal; ordine as const/satisfies; excess props;
 *   union non ristretta; Partial<T> per permettere assenze.
 * ==========================================================================*/
