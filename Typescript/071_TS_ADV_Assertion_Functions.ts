/**
 * File 071 - ADV: Assertion Functions (asserts)
 * Corso TypeScript avanzato - Polyuretech ERP.
 * Le assertion functions usano la firma di ritorno "asserts ..." per informare
 * il control flow analysis del compiler: se la funzione ritorna (non lancia),
 * allora una certa condizione e' garantita da quel punto in poi (narrowing).
 * Vediamo: "asserts x is T", "assert(condition)", assertIsDefined, assertNever,
 * e l'uso reale nella validazione di input ERP (badge, orari, ruoli, turni).
 */

// ============================================================================
// 0. HELPER DI TIPO (test a compile-time, niente librerie esterne)
// ============================================================================

// Equal confronta due type in modo esatto (trucco delle funzioni condizionali:
// due tipi sono uguali se ogni funzione condizionale li tratta identicamente).
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
    ? true
    : false;

// Expect obbliga il parametro a essere true a livello di type: se il test
// fallisce, il file NON compila. Ottimo per "congelare" un comportamento.
type Expect<T extends true> = T;

// ============================================================================
// 1. ASSERTION FUNCTION DI BASE: assert(condition)
// ============================================================================

/**
 * La firma "asserts condition" NON ha valore di ritorno a runtime: comunica al
 * compiler che, se la funzione ritorna, l'espressione passata e' truthy.
 * Serve la firma esplicita: TS non la inferisce da solo dal corpo.
 */
function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message ?? "Assertion fallita");
  }
}

// Esempio: partiamo da un valore "largo" e lo restringiamo (narrowing).
function esempioAssertBase(input: string | null): string {
  assert(input !== null, "input non puo' essere null");
  // Da qui in poi il compiler sa che input e' string, non piu' string | null.
  return input.toUpperCase(); // tipo di input qui: string
}

// Nota mentale sul "perche": dopo la chiamata, il control flow analysis applica
// il predicato alla variabile coinvolta nella condizione. E' lo stesso
// meccanismo di un "if (input !== null) { ... }", ma spostato dentro la funzione.

// ============================================================================
// 2. ASSERTION CON PREDICATO: asserts x is T
// ============================================================================

/**
 * "asserts x is T" restringe direttamente il TIPO del parametro x a T.
 * Differenza chiave rispetto a un type guard "x is T" (che ritorna boolean):
 * qui la funzione NON ritorna un boolean, ma agisce come un check che, se
 * passa, promette il tipo. Se il check fallisce, deve LANCIARE.
 */
function assertIsString(x: unknown): asserts x is string {
  if (typeof x !== "string") {
    throw new TypeError(`Atteso string, ricevuto ${typeof x}`);
  }
}

function usaAssertIsString(valore: unknown): number {
  assertIsString(valore);
  // valore e' ora string per il compiler.
  return valore.length; // tipo: number  (accesso a .length lecito)
}

// Confronto: la versione type guard (ritorna boolean) va usata con un if,
// la versione asserts si mette in linea e "sporca" il flow da quel punto.
function isString(x: unknown): x is string {
  return typeof x === "string";
}
function confrontoGuardVsAssert(x: unknown): string {
  // Type guard: serve il ramo esplicito.
  if (isString(x)) {
    return x; // tipo: string
  }
  // asserts: nessun ramo, prosegue lineare.
  assertIsString(x);
  return x; // tipo: string
}

// ============================================================================
// 3. assertIsDefined: eliminare null | undefined
// ============================================================================

// NonNullable<T> e' una utility built-in: rimuove null e undefined da T.
// La replichiamo mentalmente: NonNullable<string | null> => string.

/**
 * assertIsDefined e' il pattern piu' usato: trasforma "T | null | undefined"
 * in "T". Il generic <T> cattura il tipo del valore e "asserts val is NonNullable<T>"
 * lo ripulisce.
 */
function assertIsDefined<T>(
  val: T,
  name = "valore",
): asserts val is NonNullable<T> {
  if (val === undefined || val === null) {
    throw new Error(`${name} deve essere definito, trovato ${String(val)}`);
  }
}

function esempioIsDefined(x: number | undefined): number {
  assertIsDefined(x, "x");
  return x + 1; // tipo di x: number  (undefined rimosso)
}

// Funziona anche con oggetti opzionali di una lookup (es. Map.get -> T | undefined).
function primoCarattere(mappa: Map<string, string>, chiave: string): string {
  const v = mappa.get(chiave); // tipo: string | undefined
  assertIsDefined(v, `voce '${chiave}'`);
  return v[0]; // tipo di v: string
}

// ============================================================================
// 4. assertNever: exhaustiveness checking (controllo esaustivo)
// ============================================================================

// Ruoli dell'ERP come union di string literal.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

/**
 * assertNever riceve un valore di tipo "never": se il compiler riesce a passargli
 * qualcosa che NON e' never, significa che un caso della union non e' stato gestito.
 * Il tipo del parametro "never" e' il cuore del trucco: dentro un default di uno
 * switch esaustivo, la variabile e' gia' stata ridotta a never.
 */
function assertNever(x: never, contesto = "switch"): never {
  throw new Error(`Caso non gestito in ${contesto}: ${JSON.stringify(x)}`);
}

function etichettaRuolo(r: Ruolo): string {
  switch (r) {
    case "SuperAdmin":
      return "Super Amministratore";
    case "Admin":
      return "Amministratore";
    case "Operatore":
      return "Operatore di reparto";
    case "QrDisplay":
      return "Monitor QR";
    default:
      // Se aggiungi un nuovo ruolo alla union e dimentichi il case,
      // qui r NON sara' piu' never e il compiler segnala l'errore.
      return assertNever(r, "etichettaRuolo");
  }
}

// Dimostrazione del meccanismo: se commentassimo un case, il default riceverebbe
// un tipo diverso da never.
// case "Operatore": ...            <- se rimosso:
// return assertNever(r);           // ERRORE TS: Argument of type '"Operatore"'
//                                  // is not assignable to parameter of type 'never'.

// ============================================================================
// 5. MOCK DEI TIPI DI DOMINIO ERP (nessun Prisma reale: interfacce mock locali)
// ============================================================================

// Turno possibile: P4 / P2 / STD.
type Turno = "P4" | "P2" | "STD";

// Un orario naive-UTC come stringa "HH:MM". Usiamo un branded type piu' avanti.
interface Timbratura {
  entrata: string; // "HH:MM"
  uscita: string;  // "HH:MM"
}

// Dipendente come arriva "grezzo" da un input non fidato (tutto unknown/opzionale).
interface DipendenteRawInput {
  id?: unknown;
  nome?: unknown;
  badge?: unknown;
  ruolo?: unknown;
  turno?: unknown;
}

// Dipendente validato: forma pulita e tipata che il resto dell'app puo' fidarsi.
interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
  turno: Turno;
}

// ============================================================================
// 6. ASSERTION FUNCTIONS DI VALIDAZIONE FORMATO (regex ERP)
// ============================================================================

const BADGE_RE = /^UP-\d{3}$/;
const ORARIO_RE = /^\d{2}:\d{2}$/;

// Assert che una stringa rispetti il formato badge "UP-###".
function assertBadgeValido(x: unknown): asserts x is string {
  assertIsString(x);
  if (!BADGE_RE.test(x)) {
    throw new Error(`Badge non valido: '${x}' (atteso UP-\\d{3})`);
  }
}

// Assert che una stringa sia un orario "HH:MM" (validazione base di formato).
function assertOrarioValido(x: unknown): asserts x is string {
  assertIsString(x);
  if (!ORARIO_RE.test(x)) {
    throw new Error(`Orario non valido: '${x}' (atteso HH:MM)`);
  }
}

// Assert che un valore appartenga alla union Ruolo. Usiamo un array readonly come
// runtime source of truth e "includes" per il check.
const RUOLI: readonly Ruolo[] = ["SuperAdmin", "Admin", "Operatore", "QrDisplay"];
function assertRuolo(x: unknown): asserts x is Ruolo {
  // includes vuole un argomento del tipo dell'array; castiamo a Ruolo solo per
  // interrogare l'array, il vero controllo avviene a runtime.
  if (typeof x !== "string" || !RUOLI.includes(x as Ruolo)) {
    throw new Error(`Ruolo non valido: '${String(x)}'`);
  }
}

const TURNI: readonly Turno[] = ["P4", "P2", "STD"];
function assertTurno(x: unknown): asserts x is Turno {
  if (typeof x !== "string" || !TURNI.includes(x as Turno)) {
    throw new Error(`Turno non valido: '${String(x)}'`);
  }
}

// ============================================================================
// 7. ESEMPIO ERP REALISTICO 1: parsing e validazione di un DipendenteRawInput
// ============================================================================

/**
 * parseDipendente prende input non fidato (DipendenteRawInput) e, attraverso una
 * sequenza di assertion, produce un Dipendente pienamente tipato.
 * Ogni assert restringe un campo; alla fine costruiamo l'oggetto sapendo che
 * tutti i tipi sono garantiti. Se una qualsiasi assert fallisce, si lancia.
 */
function parseDipendente(raw: DipendenteRawInput): Dipendente {
  assertIsDefined(raw.id, "id");
  assert(typeof raw.id === "number", "id deve essere number");
  // raw.id qui: number

  assertIsDefined(raw.nome, "nome");
  assertIsString(raw.nome);
  // raw.nome qui: string

  assertBadgeValido(raw.badge);
  // raw.badge qui: string (e a runtime rispetta UP-\d{3})

  assertRuolo(raw.ruolo);
  // raw.ruolo qui: Ruolo

  assertTurno(raw.turno);
  // raw.turno qui: Turno

  // Nessun cast "as" nella costruzione finale: i tipi sono gia' corretti.
  return {
    id: raw.id,
    nome: raw.nome,
    badge: raw.badge,
    ruolo: raw.ruolo,
    turno: raw.turno,
  };
}

// Uso: il chiamante riceve un Dipendente tipato o un'eccezione.
const dip1 = parseDipendente({
  id: 1,
  nome: "Rossi",
  badge: "UP-001",
  ruolo: "Operatore",
  turno: "P4",
});
// dip1.ruolo tipo: Ruolo   => es. "Operatore"

// ============================================================================
// 8. ESEMPIO ERP REALISTICO 2: repository con findOrThrow
// ============================================================================

// Repository mock: simula una lookup che puo' non trovare il record.
class DipendenteRepository {
  private readonly store = new Map<number, Dipendente>();

  seed(d: Dipendente): void {
    this.store.set(d.id, d);
  }

  // find "morbido": ritorna Dipendente | undefined.
  find(id: number): Dipendente | undefined {
    return this.store.get(id);
  }

  // findOrThrow "duro": usa assertIsDefined per restringere il tipo di ritorno.
  findOrThrow(id: number): Dipendente {
    const found = this.find(id); // tipo: Dipendente | undefined
    assertIsDefined(found, `Dipendente id=${id}`);
    return found; // tipo: Dipendente
  }
}

const repo = new DipendenteRepository();
repo.seed(dip1);
const trovato = repo.findOrThrow(1); // tipo: Dipendente (mai undefined qui)

// ============================================================================
// 9. ESEMPIO ERP REALISTICO 3: validazione di una Timbratura + regola oraria
// ============================================================================

/**
 * assertTimbraturaValida controlla che entrata e uscita siano "HH:MM" e che
 * l'uscita sia dopo l'entrata (confronto lessicografico, valido per orari
 * naive-UTC a lunghezza fissa "HH:MM").
 */
function assertTimbraturaValida(t: {
  entrata: unknown;
  uscita: unknown;
}): asserts t is Timbratura {
  assertOrarioValido(t.entrata);
  assertOrarioValido(t.uscita);
  // Con "HH:MM" a larghezza fissa, "08:00" < "17:30" come stringhe funziona.
  assert(t.entrata < t.uscita, `Uscita ${t.uscita} <= entrata ${t.entrata}`);
}

function durataMinuti(t: { entrata: unknown; uscita: unknown }): number {
  assertTimbraturaValida(t);
  // t ora e' Timbratura: possiamo accedere a .entrata / .uscita come string.
  const [he, me] = t.entrata.split(":").map(Number); // number, number
  const [hu, mu] = t.uscita.split(":").map(Number);
  return hu * 60 + mu - (he * 60 + me);
}

const minuti = durataMinuti({ entrata: "08:00", uscita: "17:30" }); // => 570

// ============================================================================
// 10. ESEMPIO ERP 4: STATE MACHINE con assertNever nel dispatch
// ============================================================================

// Eventi discriminati (discriminated union) per lo stato di un turno lavorativo.
type EventoTurno =
  | { tipo: "ENTRATA"; ora: string }
  | { tipo: "PAUSA_INIZIO"; ora: string }
  | { tipo: "PAUSA_FINE"; ora: string }
  | { tipo: "USCITA"; ora: string };

type StatoTurno = "ASSENTE" | "PRESENTE" | "IN_PAUSA" | "USCITO";

/**
 * transizione: dato uno stato e un evento, calcola il nuovo stato.
 * Il default con assertNever garantisce di gestire OGNI variante di EventoTurno:
 * aggiungendo un nuovo "tipo" senza case, il file smette di compilare.
 */
function transizione(stato: StatoTurno, ev: EventoTurno): StatoTurno {
  switch (ev.tipo) {
    case "ENTRATA":
      return "PRESENTE";
    case "PAUSA_INIZIO":
      return "IN_PAUSA";
    case "PAUSA_FINE":
      return "PRESENTE";
    case "USCITA":
      return "USCITO";
    default:
      // ev qui e' narrowed a never: tutte le varianti sono coperte.
      return assertNever(ev, "transizione");
  }
}

const st1 = transizione("ASSENTE", { tipo: "ENTRATA", ora: "08:00" }); // "PRESENTE"

// ============================================================================
// 11. PATTERN AVANZATO: branded type + assertion di validazione
// ============================================================================

// Un branded type marca una string "gia' validata" a livello di type, cosi' non
// puoi passare una string qualsiasi dove serve un badge validato.
declare const brandBadge: unique symbol;
type BadgeValido = string & { readonly [brandBadge]: "BadgeValido" };

/**
 * assertBadgeBranded promuove una string generica a BadgeValido: dopo la chiamata,
 * il compiler tratta la variabile come BadgeValido, non piu' string.
 * Questo impedisce di dimenticare la validazione a valle.
 */
function assertBadgeBranded(x: unknown): asserts x is BadgeValido {
  assertBadgeValido(x); // riusa il check di formato
  // Nessuna trasformazione a runtime: il brand esiste solo nel type system.
}

function inviaNotificaBadge(b: BadgeValido): string {
  return `Notifica al ${b}`;
}

function usoBrand(input: unknown): string {
  // inviaNotificaBadge(input);         // ERRORE TS: 'unknown' non e' BadgeValido
  assertBadgeBranded(input);
  return inviaNotificaBadge(input); // ok: input e' BadgeValido
}
// Nota: "UP-001" da solo non e' BadgeValido, DEVE passare per l'assertion.
// inviaNotificaBadge("UP-001");        // ERRORE TS: string non e' BadgeValido

// ============================================================================
// 12. VERIFICA DEI PREDICATI CON I TYPE-LEVEL TEST (Equal / Expect)
// ============================================================================

// Controlliamo che NonNullable si comporti come ci aspettiamo dopo assertIsDefined.
type _t1 = Expect<Equal<NonNullable<string | null | undefined>, string>>;
type _t2 = Expect<Equal<NonNullable<number | undefined>, number>>;

// Controlliamo che la union Ruolo sia esattamente quella prevista.
type _t3 = Expect<
  Equal<Ruolo, "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay">
>;

// Se cambiassi la union e questi test non tornano, il file NON compila:
// type _bad = Expect<Equal<Ruolo, "Admin">>;  // ERRORE TS: Type 'false' does
//                                             // not satisfy the constraint 'true'.

// ============================================================================
// 13. GOTCHA / PITFALLS (trappole comuni e soluzioni)
// ============================================================================

// --- GOTCHA 1: dimenticare la firma "asserts" ------------------------------
// Se scrivi solo "function check(c: unknown): void { if(!c) throw ... }" il
// compiler NON restringe nulla: dopo la chiamata il tipo resta invariato.
function checkVoid(c: unknown): void {
  if (!c) throw new Error("no");
}
function gotcha1(x: string | null): void {
  checkVoid(x !== null);
  // x qui e' ANCORA string | null perche' checkVoid non ha "asserts".
  // x.toUpperCase();                 // ERRORE TS: 'x' is possibly 'null'.
  void x;
}

// --- GOTCHA 2: control flow analysis e const/let ---------------------------
// L'assertion restringe la VARIABILE passata, non un'espressione ricalcolata.
function gotcha2(raw: DipendenteRawInput): void {
  assertIsDefined(raw.badge, "badge");
  assertBadgeValido(raw.badge);
  // raw.badge e' string qui. Ma se rileggessi da una FONTE diversa, non vale.
  const copia = raw.badge; // tipo: string (ok, narrowing copiato al momento)
  void copia;
}

// --- GOTCHA 3: le assertion functions richiedono annotazione esplicita ------
// Una arrow function assegnata a variabile NON puo' avere firma asserts inferita
// e va tipata a mano; spesso e' piu' semplice usare una function declaration.
const assertPositivo: (n: number) => asserts n is number = (n) => {
  // La firma "asserts n is number" e' banale (n e' gia' number) ed e' solo
  // dimostrativa: il punto e' che DEVI dichiarare il tipo della const.
  if (n <= 0) throw new Error("deve essere > 0");
};
function gotcha3(n: number): number {
  assertPositivo(n);
  return n;
}

// --- GOTCHA 4: assertNever come "TODO" a runtime ---------------------------
// assertNever compila solo se il caso e' davvero irraggiungibile a livello type.
// Se lo usi dove il tipo NON e' never (es. dopo un cast), passi il type-check ma
// puoi comunque lanciare a runtime: NON e' una garanzia contro dati sporchi.
function gotcha4(r: Ruolo): string {
  if (r === "SuperAdmin") return "root";
  // return assertNever(r);           // ERRORE TS: r e' ancora "Admin" | ...
  return etichettaRuolo(r);           // gestione corretta e completa
}

// ============================================================================
// 14. USO COMBINATO: pipeline di validazione input ERP end-to-end
// ============================================================================

// Simula il payload JSON.parse (tipizzato unknown, il caso reale piu' onesto).
function importaDipendenteDaJson(json: unknown): Dipendente {
  // 1) deve essere un oggetto non-null.
  assert(typeof json === "object" && json !== null, "payload non e' un oggetto");
  // json qui: object

  // 2) trattiamo come record indicizzabile per leggere i campi.
  const rec = json as Record<string, unknown>;

  // 3) riusiamo il parser gia' costruito, che a sua volta usa le assertion.
  return parseDipendente({
    id: rec.id,
    nome: rec.nome,
    badge: rec.badge,
    ruolo: rec.ruolo,
    turno: rec.turno,
  });
}

// JSON.parse ritorna 'any': lo passiamo dove e' atteso 'unknown' (piu' sicuro).
const payloadJson = '{"id":2,"nome":"Bianchi","badge":"UP-002","ruolo":"Admin","turno":"STD"}';
const importato = importaDipendenteDaJson(JSON.parse(payloadJson) as unknown);
// importato tipo: Dipendente

// ============================================================================
// EXPORT (solo simboli locali di questo file)
// ============================================================================

export {
  assert,
  assertIsString,
  assertIsDefined,
  assertNever,
  assertBadgeValido,
  assertOrarioValido,
  assertRuolo,
  assertTurno,
  assertTimbraturaValida,
  assertBadgeBranded,
  parseDipendente,
  importaDipendenteDaJson,
  transizione,
  durataMinuti,
  DipendenteRepository,
  etichettaRuolo,
  dip1,
  minuti,
  st1,
  trovato,
  importato,
};

export type {
  Ruolo,
  Turno,
  Timbratura,
  Dipendente,
  DipendenteRawInput,
  EventoTurno,
  StatoTurno,
  BadgeValido,
  Equal,
  Expect,
};

/*
 * ============================================================================
 * RIEPILOGO COMANDI / CONCETTI (ripasso veloce)
 * ============================================================================
 * - asserts condition        -> se la funzione ritorna, condition e' truthy.
 * - asserts x is T           -> se ritorna, x ha tipo T (altrimenti lancia).
 * - assert(cond, msg)        -> guardia generica, restringe via condition.
 * - assertIsString(x)        -> x diventa string.
 * - assertIsDefined<T>(v)    -> v diventa NonNullable<T> (rimuove null|undefined).
 * - assertNever(x: never)    -> exhaustiveness: dimenticare un case = errore TS.
 * - firma OBBLIGATORIA       -> senza "asserts" nella firma non c'e' narrowing.
 * - arrow function           -> serve annotare a mano il type (asserts non inferito).
 * - vs type guard (x is T)   -> guard ritorna boolean e usa if; asserts lancia e prosegue.
 * - branded type + assert    -> promuovi string a "tipo validato" senza cast a valle.
 * - discriminated union      -> switch sul campo "tipo" + assertNever nel default.
 * - Equal<X,Y> / Expect<T>   -> test di tipo a compile-time (congelano il comportamento).
 * - regex ERP                -> badge /^UP-\d{3}$/ , orario /^\d{2}:\d{2}$/.
 * - pipeline unknown->tipo   -> JSON.parse => unknown => assert a catena => tipo pulito.
 * - GOTCHA: void non narrows; CFA sulla variabile; assertNever non protegge il runtime.
 * ============================================================================
 */
