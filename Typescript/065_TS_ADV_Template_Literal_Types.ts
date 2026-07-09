/**
 * File 065 - ADV Template Literal Types
 * Corso TypeScript Advanced - Polyuretech ERP.
 *
 * Questo modulo esplora i Template Literal Types: tipi stringa costruiti
 * per interpolazione, come "UP-001" o "onClick". Vediamo Uppercase/Lowercase/
 * Capitalize/Uncapitalize, la generazione di badge "${Sigla}-${number}",
 * i nomi evento "on${Capitalize}", i path types e i meccanismi interni
 * (distributivita' sulle union, inferenza con `infer`, control flow al type-level).
 */

// =============================================================================
// SEZIONE 0 - HELPER DI TEST AL TYPE-LEVEL
// =============================================================================
// Definiamo un helper Equal/Expect per "testare i tipi": se il tipo calcolato
// non e' quello atteso, il file NON compila. E' il modo standard per fare
// type-level testing senza librerie esterne.

// Equal confronta due tipi in modo esatto (anche readonly, optional, ecc.).
// Il trucco dei due conditional identici e' il pattern canonico usato da tsd/expect-type.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect accetta SOLO il literal type `true`: se gli passiamo `false` -> errore.
type Expect<T extends true> = T;

// Esempio d'uso dell'helper (se cambiassimo string in number sotto, non compila).
type _TestHelper = Expect<Equal<string, string>>; // ok
// type _Fail = Expect<Equal<string, number>>; // ERRORE TS: 'false' non soddisfa 'true'

// =============================================================================
// SEZIONE 1 - BASI DEL TEMPLATE LITERAL TYPE
// =============================================================================
// La sintassi e' identica ai template string JS, ma vive nel mondo dei TYPE:
// si usano backtick e ${...} dove dentro le graffe metti un TYPE, non un valore.

// Concatenazione di due literal type.
type Saluto = `Ciao ${"mondo"}`; // tipo: "Ciao mondo"

// Interpolare un placeholder primitivo (string) genera un template "aperto":
// qualsiasi stringa che inizia con "ID-" e' assegnabile.
type IdGenerico = `ID-${string}`; // tipo: `ID-${string}`
const id1: IdGenerico = "ID-qualsiasi"; // ok
const id2: IdGenerico = "ID-42";        // ok
// const id3: IdGenerico = "X-42";      // ERRORE TS: non inizia con "ID-"

// Interpolare `number` accetta solo forme numeriche (anche negativi/decimali).
type Riga = `riga-${number}`; // tipo: `riga-${number}`
const r1: Riga = "riga-10";   // ok
const r2: Riga = "riga-3";    // ok
// const r3: Riga = "riga-abc"; // ERRORE TS: "abc" non e' un number

// Anche `bigint` e `boolean` sono interpolabili.
type Flag = `attivo:${boolean}`; // tipo: "attivo:true" | "attivo:false"
const f1: Flag = "attivo:true";  // ok

// =============================================================================
// SEZIONE 2 - DISTRIBUTIVITA' SULLE UNION (meccanismo interno)
// =============================================================================
// Quando in un template metti una UNION, TS distribuisce: fa il prodotto
// cartesiano fra tutti i membri di tutte le union presenti. E' la stessa
// logica combinatoria che rende potentissimi questi tipi.

type Colore = "rosso" | "verde";
type Taglia = "S" | "M";

// Prodotto cartesiano: 2 x 2 = 4 combinazioni.
type Variante = `${Colore}-${Taglia}`;
// tipo: "rosso-S" | "rosso-M" | "verde-S" | "verde-M"
type _TestVariante = Expect<
  Equal<Variante, "rosso-S" | "rosso-M" | "verde-S" | "verde-M">
>; // ok

// Con tre union esplode combinatoriamente (attenzione ai tipi enormi!).
type Turno = "P4" | "P2" | "STD";
type EsitoTurno = "ok" | "ko";
type ReportTurno = `${Turno}/${EsitoTurno}`;
// tipo: "P4/ok" | "P4/ko" | "P2/ok" | "P2/ko" | "STD/ok" | "STD/ko"

// =============================================================================
// SEZIONE 3 - INTRINSIC STRING TYPES (Uppercase/Lowercase/Capitalize/Uncapitalize)
// =============================================================================
// TS fornisce 4 utility "intrinsic" (implementate nel compiler, non in .d.ts):
//   Uppercase<S>, Lowercase<S>, Capitalize<S>, Uncapitalize<S>.
// Trasformano i literal type carattere per carattere.

type Su = Uppercase<"operatore">;   // tipo: "OPERATORE"
type Giu = Lowercase<"ADMIN">;      // tipo: "admin"
type Cap = Capitalize<"reparto">;   // tipo: "Reparto"
type Uncap = Uncapitalize<"Turno">; // tipo: "turno"

// Si distribuiscono anch'esse sulle union.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type RuoloUpper = Uppercase<Ruolo>;
// tipo: "SUPERADMIN" | "ADMIN" | "OPERATORE" | "QRDISPLAY"

// Si combinano con i template: prima interpolo, poi trasformo.
type Chiave = Uppercase<`cfg_${"host" | "port"}`>;
// tipo: "CFG_HOST" | "CFG_PORT"

// GOTCHA: Capitalize opera solo sul PRIMO carattere della stringa risultante,
// non su ogni parola.
type Frase = Capitalize<"turno di notte">; // tipo: "Turno di notte" (non "Turno Di Notte")

// =============================================================================
// SEZIONE 4 - BADGE POLYURETECH: `${Sigla}-${number}` (dominio ERP)
// =============================================================================
// I badge dei dipendenti hanno forma "UP-001". A runtime validiamo con
// /^UP-\d{3}$/. Al type-level possiamo avvicinarci molto con i template.

// Sigla dei plant Polyuretech (esempio): union di prefissi ammessi.
type Sigla = "UP" | "PU" | "QR";

// Badge "aperto": accetta qualsiasi numero dopo il trattino.
// NB: `${number}` NON impone le 3 cifre (accetta "UP-1", "UP-12345"): il
// vincolo esatto delle 3 cifre va fatto a runtime con la regex.
type Badge = `${Sigla}-${number}`; // tipo: "UP-${number}" | "PU-${number}" | "QR-${number}"
const b1: Badge = "UP-001"; // ok
const b2: Badge = "QR-7";   // ok (type-level ok, ma la regex a runtime lo scarterebbe)
// const b3: Badge = "XX-001"; // ERRORE TS: "XX" non e' una Sigla

// Se vogliamo il vincolo ESATTO delle 3 cifre al type-level, dobbiamo
// enumerare le cifre. Costruiamo un tipo Cifra e poi le tre posizioni.
type Cifra = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

// Badge stretto: esattamente 3 cifre. Distribuisce Sigla x Cifra^3 (30.000 letterali!).
// Utile a scopo didattico; in pratica meglio validare a runtime per non gonfiare il tipo.
type BadgeStretto = `${Sigla}-${Cifra}${Cifra}${Cifra}`;
const bs1: BadgeStretto = "UP-001"; // ok
// const bs2: BadgeStretto = "UP-1"; // ERRORE TS: mancano cifre (non e' 3-digit)

// =============================================================================
// SEZIONE 5 - EVENT NAMES: `on${Capitalize<...>}` (pattern React/DOM)
// =============================================================================
// Pattern classico: da un nome evento "click" ricavare l'handler "onClick".
// Combiniamo template + Capitalize; con un mapped type generiamo l'intero
// oggetto di handler.

type EventoDom = "click" | "focus" | "blur" | "input";

// Da "click" a "onClick".
type NomeHandler = `on${Capitalize<EventoDom>}`;
// tipo: "onClick" | "onFocus" | "onBlur" | "onInput"

// Mapped type con "key remapping" (clausola `as`) per generare l'oggetto handler.
// Definiamo un tipo evento mock (niente librerie esterne: e' un mock locale).
interface EventoMock {
  readonly type: string;
  readonly timeStamp: number;
}

// Per ogni evento E, creo la chiave `on${Capitalize<E>}` con valore un handler.
type Handlers = {
  [E in EventoDom as `on${Capitalize<E>}`]?: (ev: EventoMock) => void;
};
// tipo: { onClick?: ...; onFocus?: ...; onBlur?: ...; onInput?: ... }

// Uso concreto dell'oggetto handler (funzione non chiamata: nessun DOM reale).
function collegaHandler(h: Handlers): void {
  // Esempio browser: qui in un componente reale assegneresti gli handler.
  h.onClick?.({ type: "click", timeStamp: 0 });
}

// Il percorso inverso (da "onClick" a "click") usa `infer` -> vedi Sezione 7.

// =============================================================================
// SEZIONE 6 - PATH TYPES: chiavi annidate come stringhe "a.b.c"
// =============================================================================
// I template literal type brillano nel modellare i "path" di oggetti annidati,
// stile lodash get("dipendente.reparto.nome"). Costruiamo Paths<T> ricorsivo.

// Oggetto di dominio annidato: un Dipendente con reparto e turno.
interface RepartoNested {
  readonly id: number;
  readonly nome: string;
}
interface DipendenteNested {
  readonly id: number;
  readonly nome: string;
  readonly badge: `${Sigla}-${number}`;
  readonly reparto: RepartoNested;
}

// Paths<T> produce l'union di tutti i path "puntati" fino alle foglie.
// Meccanismo: per ogni chiave K, se il valore e' un oggetto, ricorro
// prependendo `${K}.`; altrimenti restituisco `${K}`.
// `& string` serve perche' le chiavi possono essere string|number|symbol e
// il template accetta solo string/number/bigint/boolean.
type Paths<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${K}` | `${K}.${Paths<T[K]>}`
        : `${K}`;
    }[keyof T & string]
  : never;

type PathDipendente = Paths<DipendenteNested>;
// tipo: "id" | "nome" | "badge" | "reparto" | "reparto.id" | "reparto.nome"
type _TestPath = Expect<
  Equal<
    PathDipendente,
    "id" | "nome" | "badge" | "reparto" | "reparto.id" | "reparto.nome"
  >
>; // ok

// PathValue<T, P>: dato un path, ne ricava il TIPO del valore.
// Usa `infer` per spezzare "reparto.nome" in Head="reparto" e Rest="nome".
type PathValue<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? PathValue<T[Head], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

type TipoNomeReparto = PathValue<DipendenteNested, "reparto.nome">; // tipo: string
type TipoIdReparto = PathValue<DipendenteNested, "reparto.id">;     // tipo: number

// getPath: funzione type-safe che accetta SOLO path validi e ne infersce il ritorno.
function getPath<T, P extends Paths<T> & string>(obj: T, path: P): PathValue<T, P> {
  // Runtime: split e riduzione lungo il path (cast interno inevitabile:
  // il type system non "vede" la riduzione dinamica).
  return path
    .split(".")
    .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], obj) as PathValue<T, P>;
}

// Uso: l'IDE autocompletamenta i path e il ritorno e' tipizzato.
const dipDemo: DipendenteNested = {
  id: 1,
  nome: "Mario",
  badge: "UP-001",
  reparto: { id: 3, nome: "Stampaggio" },
};
const nomeRep = getPath(dipDemo, "reparto.nome"); // tipo: string  => "Stampaggio"
// const bad = getPath(dipDemo, "reparto.xxx");    // ERRORE TS: "reparto.xxx" non e' un path valido

// =============================================================================
// SEZIONE 7 - INFERENZA CON `infer` NEI TEMPLATE (parsing al type-level)
// =============================================================================
// Dentro un conditional type, un template literal puo' usare `infer` per
// "catturare" pezzi di stringa: e' un vero parser a livello di tipi.

// Da "onClick" torno a "click": estraggo la parte dopo "on" e la Uncapitalize.
type EstraiEvento<S extends string> = S extends `on${infer Rest}`
  ? Uncapitalize<Rest>
  : never;
type EventoOrig = EstraiEvento<"onClick">; // tipo: "click"

// Split di un badge "UP-001" nelle sue parti.
type SpezzaBadge<S extends string> = S extends `${infer P}-${infer N}`
  ? { readonly prefisso: P; readonly numero: N }
  : never;
type BadgeParti = SpezzaBadge<"UP-001">;
// tipo: { prefisso: "UP"; numero: "001" }

// Trim al type-level: rimuove spazi iniziali/finali ricorsivamente.
// Utile per normalizzare input tipo orari o codici incollati con spazi.
type TrimLeft<S extends string> = S extends ` ${infer R}` ? TrimLeft<R> : S;
type TrimRight<S extends string> = S extends `${infer R} ` ? TrimRight<R> : S;
type Trim<S extends string> = TrimLeft<TrimRight<S>>;
type Pulito = Trim<"   P4   ">; // tipo: "P4"

// Replace al type-level: sostituisce la prima occorrenza di From con To.
type Replace<
  S extends string,
  From extends string,
  To extends string,
> = S extends `${infer A}${From}${infer B}` ? `${A}${To}${B}` : S;
type Slashed = Replace<"reparto.nome", ".", "/">; // tipo: "reparto/nome"

// Split ricorsivo: da "a,b,c" a ["a","b","c"] al type-level.
type Split<S extends string, D extends string> = S extends `${infer Head}${D}${infer Tail}`
  ? [Head, ...Split<Tail, D>]
  : [S];
type Parti = Split<"UP-001-STD", "-">; // tipo: ["UP", "001", "STD"]

// =============================================================================
// SEZIONE 8 - ORARIO TIMBRATURA "HH:MM" (dominio ERP)
// =============================================================================
// Gli orari sono stringhe naive-UTC "HH:MM" validate con /^\d{2}:\d{2}$/.
// Al type-level possiamo modellare la forma "due cifre : due cifre".

// Orario "aperto" via `${number}`: comodo ma lasco (accetta "9:5").
type OrarioLasco = `${number}:${number}`; // tipo: `${number}:${number}`
const oL: OrarioLasco = "08:30"; // ok
// const oL2: OrarioLasco = "0830"; // ERRORE TS: manca il ":"

// Orario "stretto": esattamente HH:MM con Cifra (riusa Cifra della Sezione 4).
type Orario = `${Cifra}${Cifra}:${Cifra}${Cifra}`;
const o1: Orario = "08:30"; // ok
const o2: Orario = "23:59"; // ok
// const o3: Orario = "8:30";  // ERRORE TS: l'ora ha una sola cifra

// DTO Timbratura con orari tipizzati come Orario (forma garantita a compile-time).
interface TimbraturaDTO {
  readonly dipendenteId: number;
  readonly badge: `${Sigla}-${number}`;
  readonly entrata: Orario; // "HH:MM"
  readonly uscita: Orario;  // "HH:MM"
}
const t1: TimbraturaDTO = {
  dipendenteId: 1,
  badge: "UP-001",
  entrata: "08:00",
  uscita: "17:30",
}; // ok
// NB: il type NON valida che HH<24 o MM<60 (troppo costoso enumerarlo):
// quel controllo semantico resta a runtime con la regex + range check.

// =============================================================================
// SEZIONE 9 - ESEMPIO ERP: REPOSITORY & QUERY KEYS TIPIZZATE
// =============================================================================
// Pattern realistico: generare le chiavi dei metodi di un repository e le
// "cache key" a partire dai nomi entita', usando template + Capitalize.

// Entita' del dominio ERP.
type Entita = "dipendente" | "reparto" | "timbratura" | "turno";

// Genero i nomi dei metodi CRUD: "getDipendente", "createReparto", ...
type Azione = "get" | "create" | "update" | "delete";
type MetodoRepo = `${Azione}${Capitalize<Entita>}`;
// tipo: "getDipendente" | "createDipendente" | ... | "deleteTurno" (16 combinazioni)

// Un repository mock che ESPONE tutti quei metodi via mapped type.
// (Interfaccia mock locale: nessuna dipendenza da Prisma/ORM reali.)
type RepoMock = {
  [M in MetodoRepo]: (arg: unknown) => Promise<unknown>;
};
// Verifica che "getDipendente" sia effettivamente una chiave attesa.
type _TestRepo = Expect<
  Equal<Extract<keyof RepoMock, "getDipendente">, "getDipendente">
>; // ok

// Cache key tipizzate: "dipendente:by-id:UP-001".
type CacheKey<E extends Entita> = `${E}:by-id:${Badge}`;
const ck: CacheKey<"dipendente"> = "dipendente:by-id:UP-001"; // ok
// const ckBad: CacheKey<"dipendente"> = "reparto:by-id:UP-001"; // ERRORE TS: prefisso errato

// Da MetodoRepo posso RIESTRARRE azione ed entita' con infer (parsing inverso).
type EstraiAzione<M extends string> = M extends `${infer A}${Capitalize<Entita>}`
  ? A
  : never;
type SoloAzioni = EstraiAzione<MetodoRepo>; // tipo: "get" | "create" | "update" | "delete"

// =============================================================================
// SEZIONE 10 - ESEMPIO ERP: STATE MACHINE DELLE TRANSIZIONI (stringhe evento)
// =============================================================================
// Modelliamo le transizioni di una timbratura come literal "from->to" e
// deriviamo i nomi evento. Mostra template + union + Capitalize insieme.

type StatoTimbratura = "assente" | "presente" | "pausa";

// Nome transizione "presente->pausa": prodotto cartesiano degli stati.
type Transizione = `${StatoTimbratura}->${StatoTimbratura}`;
// 9 combinazioni (incluse quelle "inutili" tipo "assente->assente").

// Filtriamo via le auto-transizioni con un conditional distributivo.
// Meccanismo: T extends `${infer A}->${infer B}` cattura i due lati;
// se A e B coincidono, la scartiamo (never), altrimenti la teniamo.
type NoSelf<T extends string> = T extends `${infer A}->${infer B}`
  ? A extends B
    ? never
    : T
  : never;
type TransizioneValida = NoSelf<Transizione>;
// esclude "assente->assente", "presente->presente", "pausa->pausa"

// Nomi evento per ogni transizione valida: "onAssenteToPresente".
// Serve prima Capitalize su entrambi i lati: componiamo con un helper.
type NomeEvento<T extends string> = T extends `${infer A}->${infer B}`
  ? `on${Capitalize<A>}To${Capitalize<B>}`
  : never;
type EventiTimbratura = NomeEvento<TransizioneValida>;
// tipo: "onAssenteToPresente" | "onAssenteToPausa" | "onPresenteToAssente" | ...

// Tabella handler della state machine (mapped type sui nomi evento).
type MacchinaTimbratura = {
  [K in EventiTimbratura]?: () => void;
};
const macchina: MacchinaTimbratura = {
  onAssenteToPresente: () => {
    /* Esempio: registra ingresso */
  },
}; // ok

// =============================================================================
// SEZIONE 11 - GOTCHA / PITFALLS (trappole comuni + soluzione)
// =============================================================================

// --- PITFALL 1: `${number}` non e' "cifre esatte" ---------------------------
// Errore mentale comune: pensare che `${number}` imponga N cifre. Non e' cosi'.
type CapEsempio = `cap-${number}`;
const capOk: CapEsempio = "cap-20100"; // ok
const capStrano: CapEsempio = "cap-7";  // ok (una cifra sola: accettato!)
const capNeg: CapEsempio = "cap--3";    // ok (i negativi sono number validi)
// SOLUZIONE: se ti servono cifre esatte, enumera con Cifra (vedi BadgeStretto)
// oppure valida a runtime con regex /^cap-\d{5}$/.

// --- PITFALL 2: esplosione combinatoria (union troppo grande) ---------------
// Moltiplicare piu' union di cifre genera tipi enormi e rallenta/blocca tsc.
// Es: `${Cifra}${Cifra}${Cifra}${Cifra}${Cifra}` = 100.000 letterali.
// TS ha un limite (~100k) oltre il quale da' errore.
// type Cap5 = `${Cifra}${Cifra}${Cifra}${Cifra}${Cifra}${Cifra}`; // ERRORE TS: union troppo complessa
// SOLUZIONE: non enumerare le cifre oltre il necessario; usa `${number}` +
// validazione runtime per i formati lunghi.

// --- PITFALL 3: chiavi symbol/number nei mapped template --------------------
// Nel modellare i path, keyof da' string|number|symbol; il template accetta
// solo string/number/bigint/boolean. Interpolare direttamente `keyof T` rompe.
interface ConSymbol {
  readonly nome: string;
  readonly [Symbol.iterator]: () => Iterator<number>;
}
// type ChiaviRotte = `k_${keyof ConSymbol}`; // ERRORE TS: symbol non interpolabile
// SOLUZIONE: intersecare con string -> `keyof T & string` scarta symbol/number.
type ChiaviOk = `k_${keyof ConSymbol & string}`; // tipo: "k_nome"

// --- PITFALL 4: distributivita' indesiderata ---------------------------------
// Un template con union distribuisce SEMPRE. Se NON vuoi il prodotto cartesiano
// (vuoi trattare la union come un tutt'uno), il template non fa al caso tuo.
type AB = "a" | "b";
type Distribuito = `x-${AB}`; // tipo: "x-a" | "x-b"  (NON "x-a|b")
// SOLUZIONE: se serve la union "intera" come segmento, ripensa il design:
// i template literal type sono per definizione distributivi sui membri.

// =============================================================================
// SEZIONE 12 - PATTERN AVANZATO: PARSER DI QUERY STRING (tipi come calcolo)
// =============================================================================
// Uniamo tutto: da "id=1&badge=UP-001" ricaviamo un oggetto tipizzato.
// E' "type-level programming": il tipo esegue un calcolo sulla stringa.

// Spezza una coppia "chiave=valore" in { chiave: valore }.
type CoppiaToObj<S extends string> = S extends `${infer K}=${infer V}`
  ? { readonly [P in K]: V }
  : {};

// Ricorsione sulle coppie separate da "&", accumulando con intersezione.
type ParseQuery<S extends string> = S extends `${infer Pair}&${infer Rest}`
  ? CoppiaToObj<Pair> & ParseQuery<Rest>
  : CoppiaToObj<S>;

type QueryParsed = ParseQuery<"id=1&badge=UP-001&turno=P4">;
// tipo: { id: "1" } & { badge: "UP-001" } & { turno: "P4" }
// (l'intersezione di record a chiave singola equivale a un oggetto con 3 campi)

// Verifica: leggendo una chiave otteniamo il literal del valore.
type ValoreTurno = QueryParsed["turno"]; // tipo: "P4"

// =============================================================================
// SEZIONE 13 - EXPORT (solo simboli locali di questo file)
// =============================================================================
// Esportiamo alcune utility e tipi di dominio per riuso didattico.
// (Tutti definiti QUI: nessun import esterno, come da regole del corso.)
export { getPath, collegaHandler };
export type {
  Equal,
  Expect,
  Sigla,
  Badge,
  BadgeStretto,
  Cifra,
  Orario,
  TimbraturaDTO,
  Paths,
  PathValue,
  MetodoRepo,
  Transizione,
  TransizioneValida,
  EventiTimbratura,
  Trim,
  Replace,
  Split,
  ParseQuery,
};

// =============================================================================
// RIEPILOGO COMANDI / CONCETTI (ripasso veloce)
// =============================================================================
// - Template literal type: `${TYPE}` con backtick, interpola string/number/bigint/boolean.
// - `${string}` / `${number}`: placeholder "aperti" (number NON impone cifre esatte).
// - Distributivita': una union in un template -> prodotto cartesiano fra i membri.
// - Intrinsic: Uppercase / Lowercase / Capitalize / Uncapitalize (solo 1o carattere).
// - Badge ERP: `${Sigla}-${number}` (lasco) vs `${Sigla}-${Cifra}${Cifra}${Cifra}` (stretto).
// - Event names: `on${Capitalize<E>}` + mapped type con key remapping `as`.
// - Path types: Paths<T> ricorsivo, PathValue<T,P> con `infer Head.Rest`, `& string` obbligatorio.
// - `infer` nei template: parsing stringhe (EstraiEvento, SpezzaBadge, Trim, Replace, Split).
// - Orario ERP "HH:MM": `${Cifra}${Cifra}:${Cifra}${Cifra}` (forma, non range: 25:99 passa).
// - Repository/cache key: `${Azione}${Capitalize<Entita>}`, `${E}:by-id:${Badge}`.
// - State machine: `${Stato}->${Stato}`, NoSelf per scartare auto-transizioni, NomeEvento.
// - Type-level testing: Equal<A,B> + Expect<T extends true>.
// - PITFALLS: number != cifre esatte; esplosione combinatoria (limite ~100k); symbol non
//   interpolabile (usa `& string`); distributivita' sempre attiva.
// - Type-level programming: ParseQuery come esempio di "tipo che calcola".
