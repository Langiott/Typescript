/**
 * File 069 - ADV Branded / Nominal Types
 * ---------------------------------------
 * TypeScript e' strutturale: due tipi con la stessa "forma" sono intercambiabili.
 * Il branding (o nominal typing simulato) serve a rendere DISTINTI tipi che
 * strutturalmente sarebbero uguali (es. due string), cosi' il compiler impedisce
 * di scambiare un BadgeId con un RepartoId o di passare euro dove servono cent.
 * Vedremo: brand con intersection & { __brand }, costruttori validati (smart
 * constructor), unwrap, EuroCents, e casi reali ERP Polyuretech.
 * NOTA: nessuna libreria esterna; i tipi "mock" (Repository, DTO) sono definiti qui.
 */

// ============================================================================
// 0) HELPER DI TYPE-TESTING (usati in tutto il file per "provare" i tipi)
// ============================================================================

// Equal<A, B>: true solo se A e B sono lo STESSO tipo (invariante).
// Il trucco delle due funzioni condizionali confronta A e B in entrambi i versi:
// e' il modo canonico per un uguaglianza di tipo esatta in TS.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect<T>: compila solo se T e' esattamente true. Serve come assert di tipo.
type Expect<T extends true> = T;

// Helper 'MutualAssign': A e B sono MUTUAMENTE assegnabili (A<:B e B<:A).
// E' piu' permissivo di Equal (che e' invariante e coglie differenze strutturali
// come i branded type): utile quando due tipi sono equivalenti "all'uso" ma non
// identici bit-a-bit. [X] extends [Y] evita la distributivita' sulle union.
type MutualAssign<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// Esempi di test di tipo (se falliscono, il file NON compila).
type _t0 = Expect<Equal<string, string>>; // ok
type _t1 = Expect<Equal<1 | 2, 2 | 1>>;   // ok, le union sono uguali a meno di ordine
// type _bad = Expect<Equal<string, number>>; // ERRORE TS: number non e' assegnabile a true

// ============================================================================
// 1) IL PROBLEMA: il typing STRUTTURALE non protegge gli id
// ============================================================================

// Senza brand, ogni id e' solo string: sono tutti interscambiabili.
type PlainBadgeId = string;
type PlainRepartoId = string;

function caricaRepartoPlain(_id: PlainRepartoId): void {
  /* ... */
}

const badgePlain: PlainBadgeId = "UP-001";
caricaRepartoPlain(badgePlain);
// ^ Nessun errore! Ho passato un badge dove serviva un id reparto.
// Questo e' il bug che il branding elimina.

// ============================================================================
// 2) IL BRAND: intersection con una proprieta' "fantasma"
// ============================================================================

// Brand<T, B>: prende un tipo base T e gli aggiunge un tag B unico.
// La proprieta' __brand NON esiste a runtime: e' solo un marker per il compiler.
// Usiamo un unique symbol come chiave cosi' due brand non collidono mai.
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

// Ora definiamo id nominali distinti, tutti basati su string ma NON compatibili.
type BadgeId = Brand<string, "BadgeId">;
type RepartoId = Brand<string, "RepartoId">;
type DipendenteId = Brand<string, "DipendenteId">;

// A runtime un BadgeId E' una string (tipo base preservato)...
type _isString = Expect<Equal<BadgeId extends string ? true : false, true>>; // true

// ...ma i due brand sono tipi diversi tra loro.
type _distinct = Expect<Equal<Equal<BadgeId, RepartoId>, false>>; // sono diversi => Equal=false

// ============================================================================
// 3) PERCHE' FUNZIONA: control flow e assegnabilita'
// ============================================================================

// Una string "nuda" NON e' assegnabile a un Brand: manca la proprieta' __brand.
// const b1: BadgeId = "UP-001";
// ^ ERRORE TS: Property [__brand] is missing in type 'string' but required in 'BadgeId'.

// E un BadgeId NON e' assegnabile a un RepartoId: i brand differiscono.
declare const someBadge: BadgeId;
// const r1: RepartoId = someBadge;
// ^ ERRORE TS: Type 'BadgeId' is not assignable to type 'RepartoId' (brand incompatibile).

// Al contrario, un Brand E' usabile dove serve il tipo base (string), perche'
// l'intersection contiene string: BadgeId <: string.
function lunghezza(s: string): number {
  return s.length;
}
declare const bb: BadgeId;
const _len: number = lunghezza(bb); // ok: BadgeId e' anche una string

// ============================================================================
// 4) COSTRUTTORI VALIDATI (smart constructor)
// ============================================================================

// L'unico modo "lecito" per creare un branded value e' un costruttore che valida
// e poi fa il cast. Il cast e' l'UNICO punto in cui usiamo "as": centralizzato,
// testato, controllato. Fuori di qui non si dovrebbe mai castare.

const BADGE_RE = /^UP-\d{3}$/; // regola ERP: badge tipo "UP-001"

// Costruttore che lancia se invalido: ritorna direttamente BadgeId.
function toBadgeId(raw: string): BadgeId {
  if (!BADGE_RE.test(raw)) {
    throw new Error(`Badge non valido: ${raw}`);
  }
  return raw as BadgeId; // unico cast permesso, dopo la validazione
}

const badge1 = toBadgeId("UP-042"); // tipo: BadgeId
// toBadgeId("XX-1");               // a runtime lancia: "Badge non valido: XX-1"

// Variante SENZA eccezioni: ritorna BadgeId | null (piu' funzionale, testabile).
function parseBadgeId(raw: string): BadgeId | null {
  return BADGE_RE.test(raw) ? (raw as BadgeId) : null;
}

const maybeBadge = parseBadgeId("UP-999"); // tipo: BadgeId | null
if (maybeBadge !== null) {
  // narrowing: qui maybeBadge e' BadgeId
  const _ok: BadgeId = maybeBadge;
}

// Costruttore per RepartoId: qui accettiamo qualunque stringa non vuota.
function toRepartoId(raw: string): RepartoId {
  if (raw.trim() === "") throw new Error("RepartoId vuoto");
  return raw as RepartoId;
}

// ============================================================================
// 5) UNWRAP: tornare al tipo base in modo esplicito
// ============================================================================

// A volte serve la string "grezza" (log, serializzazione). Meglio una funzione
// esplicita che un cast sparso: rende leggibile "sto uscendo dal branded world".
function unBrand<T, B extends string>(v: Brand<T, B>): T {
  return v as T;
}

const rawBadge: string = unBrand(badge1); // tipo: string  => "UP-042"

// ============================================================================
// 6) NON MESCOLARE GLI ID: la protezione in azione
// ============================================================================

function caricaReparto(_id: RepartoId): void {
  /* SELECT * FROM reparti WHERE id = _id */
}

const rep = toRepartoId("saldatura"); // tipo: RepartoId
caricaReparto(rep); // ok

// caricaReparto(badge1);
// ^ ERRORE TS: Argument of type 'BadgeId' is not assignable to parameter of type 'RepartoId'.
//   Ecco il bug del paragrafo 1, ora BLOCCATO in compilazione.

// Anche una string letterale valida come badge viene rifiutata: si DEVE passare
// dal costruttore, garantendo che il valore sia stato validato.
// caricaReparto("saldatura");
// ^ ERRORE TS: string non e' un RepartoId (manca il brand).

// ============================================================================
// 7) EUROCENTS: brand su number per non confondere unita' di misura
// ============================================================================

// Errore classico: sommare euro e centesimi, o passare float dove servono int.
// Brandiamo i cent come intero, cosi' il "tipo denaro" e' esplicito.
type EuroCents = Brand<number, "EuroCents">;

// Costruttore: accetta cent interi (nessun decimale, evita errori float).
function cents(n: number): EuroCents {
  if (!Number.isInteger(n)) throw new Error(`Cent non interi: ${n}`);
  return n as EuroCents;
}

// Costruttore da euro (number) -> cent, arrotondando a intero.
function eurosToCents(euro: number): EuroCents {
  return cents(Math.round(euro * 100));
}

const prezzo = eurosToCents(19.99); // tipo: EuroCents  => 1999
const spedizione = cents(500);      // tipo: EuroCents  => 500

// Somma type-safe: input EuroCents, output EuroCents. Nessun numero "nudo" entra.
function sommaCents(a: EuroCents, b: EuroCents): EuroCents {
  return (a + b) as EuroCents; // a+b e' number: re-brand esplicito del risultato
}

const totale = sommaCents(prezzo, spedizione); // tipo: EuroCents  => 2499

// sommaCents(prezzo, 500);
// ^ ERRORE TS: '500' (number) non e' EuroCents. Devi usare cents(500).

// Formattazione: qui esco dal brand per mostrare euro leggibili.
function formatEuro(c: EuroCents): string {
  const n = unBrand(c);
  return `${(n / 100).toFixed(2)} EUR`;
}
const _etichetta = formatEuro(totale); // tipo: string  => "24.99 EUR"

// GOTCHA (numeri): dopo un operazione aritmetica il tipo "decade" a number.
// const t2: EuroCents = prezzo + spedizione;
// ^ ERRORE TS: number non e' EuroCents. L'aritmetica NON preserva il brand:
//   e' voluto, ti costringe a passare dai costruttori/utility come sommaCents.

// ============================================================================
// 8) BRAND MULTIPLI E RAFFINAMENTI (intersection di piu' tag)
// ============================================================================

// I brand si possono comporre: un valore puo' portare piu' tag contemporaneamente.
// Esempio: una string che e' sia "validata" sia "trimmata".
type Validated<T> = T & { readonly __validated: true };
type Trimmed<T> = T & { readonly __trimmed: true };

// Una NoteValide e' una string validata E trimmata (doppio raffinamento).
type NotaPulita = Validated<Trimmed<string>>;

function pulisci(raw: string): NotaPulita {
  const t = raw.trim();
  // Nessun check ulteriore in questo esempio: entrambi i tag insieme.
  return t as NotaPulita;
}

const nota = pulisci("  ciao  "); // tipo: NotaPulita  => "ciao"
// NotaPulita e' assegnabile a string (contiene string), ma non viceversa.
const _s: string = nota; // ok

// ============================================================================
// 9) ESEMPIO ERP: entita' Dipendente con id branded
// ============================================================================

// Union dei ruoli del dominio ERP.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

// L'entita' usa id branded: impossibile costruirla con id "a caso".
interface Dipendente {
  readonly id: DipendenteId;
  readonly badge: BadgeId;
  nome: string;
  ruolo: Ruolo;
  repartoId: RepartoId;
}

// Factory che valida tutti gli input e produce un Dipendente ben tipato.
function creaDipendente(input: {
  id: string;
  badge: string;
  nome: string;
  ruolo: Ruolo;
  repartoId: string;
}): Dipendente {
  return {
    id: input.id as DipendenteId, // in pratica: validare formato uuid, qui semplificato
    badge: toBadgeId(input.badge), // valida "UP-###"
    nome: input.nome,
    ruolo: input.ruolo,
    repartoId: toRepartoId(input.repartoId),
  };
}

const dip = creaDipendente({
  id: "d-1",
  badge: "UP-001",
  nome: "Mario Rossi",
  ruolo: "Operatore",
  repartoId: "saldatura",
});
// dip.badge ha tipo BadgeId, dip.repartoId ha tipo RepartoId: non confondibili.

// caricaReparto(dip.badge);
// ^ ERRORE TS: BadgeId non e' RepartoId. Devi usare dip.repartoId.
caricaReparto(dip.repartoId); // ok

// ============================================================================
// 10) ESEMPIO ERP: orari naive-UTC come stringhe "HH:MM" branded
// ============================================================================

// Nel dominio le timbrature sono orari "HH:MM" (naive-UTC, salvati come stringa).
// Brandiamo l'orario cosi' non passa una string qualsiasi come orario valido.
type OrarioHHMM = Brand<string, "OrarioHHMM">;
const ORARIO_RE = /^\d{2}:\d{2}$/;

function toOrario(raw: string): OrarioHHMM {
  if (!ORARIO_RE.test(raw)) throw new Error(`Orario non valido: ${raw}`);
  const [hh, mm] = raw.split(":").map(Number);
  if (hh > 23 || mm > 59) throw new Error(`Orario fuori range: ${raw}`);
  return raw as OrarioHHMM;
}

const entrata = toOrario("08:30"); // tipo: OrarioHHMM
const uscita = toOrario("17:00");  // tipo: OrarioHHMM
// toOrario("8:30");   // lancia: pattern non rispettato (serve "08:30")
// toOrario("25:00");  // lancia: fuori range

interface Timbratura {
  readonly badge: BadgeId;
  entrata: OrarioHHMM;
  uscita: OrarioHHMM | null; // null se non ancora uscito
  turno: Turno;
}

// Calcolo minuti lavorati: accetta SOLO OrarioHHMM validati (niente "HH:MM" a caso).
function minutiLavorati(t: Timbratura): number {
  if (t.uscita === null) return 0; // narrowing su null
  const [h1, m1] = unBrand(t.entrata).split(":").map(Number);
  const [h2, m2] = unBrand(t.uscita).split(":").map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

const timb: Timbratura = {
  badge: badge1,
  entrata,
  uscita,
  turno: "P4",
};
const _minuti = minutiLavorati(timb); // tipo: number  => 510 (08:30 -> 17:00)

// ============================================================================
// 11) ESEMPIO ERP: Repository generico type-safe con id branded
// ============================================================================

// Mock (nessuna libreria): un Repository in-memory che indicizza per id branded.
// La chiave e' branded, quindi non posso interrogare col brand sbagliato.
interface Repository<Id extends string, Entita> {
  get(id: Id): Entita | undefined;
  set(id: Id, e: Entita): void;
}

class MemRepo<Id extends string, Entita> implements Repository<Id, Entita> {
  // A runtime la Map usa string; il branding vive solo a compile-time.
  private readonly store = new Map<string, Entita>();
  get(id: Id): Entita | undefined {
    return this.store.get(id);
  }
  set(id: Id, e: Entita): void {
    this.store.set(id, e);
  }
}

// Repository di dipendenti indicizzati per DipendenteId.
const dipRepo = new MemRepo<DipendenteId, Dipendente>();
dipRepo.set(dip.id, dip);
const trovato = dipRepo.get(dip.id); // tipo: Dipendente | undefined

// dipRepo.get(dip.badge);
// ^ ERRORE TS: BadgeId non e' DipendenteId. Il repo rifiuta la chiave sbagliata.

// dipRepo.get("d-1");
// ^ ERRORE TS: string non e' DipendenteId. Serve un id branded.

// ============================================================================
// 12) ESEMPIO ERP: DTO <-> dominio (boundary di validazione)
// ============================================================================

// I DTO arrivano dalla rete: campi "grezzi" (string/number nudi, non branded).
// Il boundary li valida e li converte in tipi di dominio branded.
interface DipendenteDTO {
  id: string;
  badge: string;
  nome: string;
  ruolo: string; // arriva come string qualsiasi: va validato in Ruolo
  repartoId: string;
}

const RUOLI: readonly Ruolo[] = ["SuperAdmin", "Admin", "Operatore", "QrDisplay"];

// Type guard: string -> Ruolo (narrowing di una string generica su una union).
function isRuolo(s: string): s is Ruolo {
  return (RUOLI as readonly string[]).includes(s);
}

// Mapper DTO -> Dipendente: unico punto in cui si "entra" nel dominio branded.
function fromDTO(dto: DipendenteDTO): Dipendente {
  if (!isRuolo(dto.ruolo)) throw new Error(`Ruolo non valido: ${dto.ruolo}`);
  return creaDipendente({
    id: dto.id,
    badge: dto.badge,
    nome: dto.nome,
    ruolo: dto.ruolo, // qui dto.ruolo e' gia' narrowed a Ruolo
    repartoId: dto.repartoId,
  });
}

const dip2 = fromDTO({
  id: "d-2",
  badge: "UP-002",
  nome: "Anna Bianchi",
  ruolo: "Admin",
  repartoId: "verniciatura",
}); // tipo: Dipendente

// Serializzazione dominio -> DTO: qui si "esce" dal branded (unBrand esplicito).
function toDTO(d: Dipendente): DipendenteDTO {
  return {
    id: unBrand(d.id),
    badge: unBrand(d.badge),
    nome: d.nome,
    ruolo: d.ruolo,
    repartoId: unBrand(d.repartoId),
  };
}
const _json = JSON.stringify(toDTO(dip2)); // string JSON pronta per la rete

// ============================================================================
// 13) PATTERN TYPE-LEVEL: estrarre il brand e il tipo base
// ============================================================================

// GOTCHA (versione ingenua): "UnBrandType<T>" con infer sull'intersection NON
// rimuove davvero il tag. Con "T & {[__brand]:B}", il match cattura in Base
// l'INTERO branded type, quindi UnBrandType<BadgeId> resta
// "string & {[__brand]:'BadgeId'}", non "string".
type UnBrandType<T> = T extends Brand<infer Base, infer _B> ? Base : T;
type _bNaive = Expect<Equal<UnBrandType<BadgeId>, BadgeId>>; // resta branded!

// Per ottenere DAVVERO il tipo primitivo di base si mappa il branded type sul
// primitivo corrispondente (string/number/boolean), altrimenti si tiene Base.
type UnBrand<T> = T extends Brand<infer Base, infer _B>
  ? (T extends string
      ? string
      : T extends number
        ? number
        : T extends boolean
          ? boolean
          : Base)
  : T;
type _b1 = Expect<Equal<UnBrand<BadgeId>, string>>;   // ora davvero string
type _b2 = Expect<Equal<UnBrand<EuroCents>, number>>; // ora davvero number
type _b3 = Expect<Equal<UnBrand<number>, number>>;    // non branded: resta number

// BrandOf<T>: estrae il TAG (la stringa letterale del brand).
type BrandOf<T> = T extends { readonly [__brand]: infer B } ? B : never;

type _bo1 = Expect<Equal<BrandOf<BadgeId>, "BadgeId">>;   // "BadgeId"
type _bo2 = Expect<Equal<BrandOf<RepartoId>, "RepartoId">>; // "RepartoId"
type _bo3 = Expect<Equal<BrandOf<string>, never>>;        // non branded => never

// ============================================================================
// 14) GOTCHA / PITFALLS (trappole comuni e soluzioni)
// ============================================================================

// PITFALL 1 - Il cast "as" bypassa la validazione: mai castare fuori dal costruttore.
// const fake = "banana" as BadgeId; // compila ma e' un badge FINTO (non validato)!
//   Soluzione: vietare "as BadgeId" nel codice e usare SEMPRE toBadgeId/parseBadgeId.
//   Il branding protegge dagli scambi, NON dai cast forzati: la disciplina la metti tu.

// PITFALL 2 - object literal come brand: ricreare {__brand:...} a runtime e' inutile
// e pericoloso (aggiunge una proprieta' reale all'oggetto). Il brand deve restare
// SOLO a livello di tipo (unique symbol + as), senza toccare il valore a runtime.

// PITFALL 3 - due brand con la STESSA stringa tag collidono (diventano lo stesso tipo).
type A_ = Brand<string, "Id">;
type B_ = Brand<string, "Id">; // stesso tag "Id"
type _collide = Expect<Equal<A_, B_>>; // sono UGUALI: tag identico => nessuna protezione!
//   Soluzione: usa tag UNIVOCI e descrittivi (es. "BadgeId", non "Id").

// PITFALL 4 - branded non e' assegnabile "in giu'" da string, quindi le API pubbliche
// che accettano input utente devono prendere `string` e validare, NON pretendere gia'
// il branded (l'utente non puo' costruirlo). Prendi string al boundary, brand internamente.
function apiPubblica(rawBadge: string): Dipendente | null {
  const b = parseBadgeId(rawBadge);
  if (b === null) return null; // input invalido gestito, niente throw verso l'esterno
  return dipRepo.get(dip.id) ?? null; // (lookup semplificato per l'esempio)
}
const _res = apiPubblica("UP-777"); // tipo: Dipendente | null

// ============================================================================
// 15) BONUS: brand con costruttore "opaque" (nasconde totalmente il tipo base)
// ============================================================================

// A volte non vuoi nemmeno che il branded sia trattato come string all'esterno.
// Con un tag su un tipo mai istanziabile ottieni un "opaque type": puoi solo
// passarlo in giro, non ispezionarlo, finche' non usi l'unwrap dedicato.
declare const __token: unique symbol;
type SessionToken = { readonly [__token]: "SessionToken" } & string;

function nuovoToken(raw: string): SessionToken {
  return raw as SessionToken;
}
function usaToken(t: SessionToken): void {
  // qui dentro potresti fare unBrand se serve la string
  void t;
}
const tok = nuovoToken("abc123"); // tipo: SessionToken
usaToken(tok); // ok
// usaToken("abc123"); // ERRORE TS: string non e' SessionToken

// ============================================================================
// 16) EXPORT (solo simboli locali di questo file)
// ============================================================================

export {
  toBadgeId,
  parseBadgeId,
  toRepartoId,
  cents,
  eurosToCents,
  sommaCents,
  formatEuro,
  unBrand,
  creaDipendente,
  fromDTO,
  toDTO,
  toOrario,
  minutiLavorati,
  MemRepo,
};

export type {
  Brand,
  BadgeId,
  RepartoId,
  DipendenteId,
  EuroCents,
  OrarioHHMM,
  Ruolo,
  Turno,
  Dipendente,
  Timbratura,
  DipendenteDTO,
  Repository,
  UnBrandType,
  BrandOf,
  Equal,
  Expect,
};

/*
 * ============================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================================
 * - TS e' STRUTTURALE: stessa forma => stesso tipo. Il brand aggiunge nominalita'.
 * - Brand<T,B> = T & { readonly [unique symbol]: B }  -> tag "fantasma", solo compile-time.
 * - Il brand NON esiste a runtime: e' pura informazione per il type checker.
 * - Branded <: tipo base (BadgeId e' una string), ma tipo base NON <: branded.
 * - Due brand con tag DIVERSI sono incompatibili tra loro (id non mescolabili).
 * - Smart constructor: valida + `as Brand` in UN solo punto centralizzato/testato.
 *     * throw (toBadgeId) oppure Branded|null (parseBadgeId) per stile funzionale.
 * - unBrand<T,B>(v): torna esplicitamente al tipo base (serve per log/serializza).
 * - EuroCents = Brand<number,"EuroCents">: unita' di misura esplicite, no euro vs cent.
 *     * l'aritmetica DECADE a number: re-branda con utility (sommaCents), voluto.
 * - Brand componibili: Validated<Trimmed<string>> = piu' tag insieme.
 * - Type-level: UnBrandType<T> (base via infer), BrandOf<T> (estrae il tag letterale).
 * - Boundary pattern ERP: DTO (string/number nudi) -> valida -> dominio branded.
 *     * API pubblica prende `string` e valida; l'utente non puo' costruire un branded.
 * - Repository<Id extends string, E>: chiave branded => query con id sbagliato = errore.
 * - Helper di test: Equal<A,B>, Expect<T extends true> per assert di tipo.
 * - GOTCHA: `as Branded` bypassa la validazione (disciplina!); tag UNIVOCI (no "Id"
 *     duplicati); non materializzare {__brand} a runtime; valida al boundary, non prima.
 * - Opaque type: brand che nasconde anche il tipo base (SessionToken) fino all'unwrap.
 * ============================================================================
 */

