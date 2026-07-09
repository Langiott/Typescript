/**
 * File 082 - ADV Exhaustiveness check (never)
 *
 * Argomento: garantire a COMPILE-TIME di avere gestito tutti i casi di una
 * union (ruoli, stati, turni). Il trucco e' il type "never": quando un
 * switch/if e' esaustivo, nel ramo "impossibile" la variabile ha tipo never,
 * e assegnarla a una funzione assertNever(x: never) fa fallire la build se
 * un domani si aggiunge un nuovo membro dimenticato. Control flow analysis,
 * narrowing e distributivita' spiegati dal caso semplice all'ERP Polyuretech.
 */

// ============================================================================
// 1) IL TIPO never: cos'e' e perche' e' il "bottom type"
// ============================================================================

// never e' il tipo dei valori che NON possono esistere. E' il sottotipo di
// TUTTO (bottom type): assegnabile a qualunque tipo, ma nulla (tranne never)
// e' assegnabile a never. Questo lo rende perfetto come "sentinella".

// Una funzione che non ritorna mai (throw o loop infinito) ha return type never.
function boom(msg: string): never {
  throw new Error(msg);
}
// tipo di ritorno: never  (il control flow non prosegue oltre la chiamata)

// never in una union viene ASSORBITO: non aggiunge nulla.
type A1 = string | never; // tipo: string
type A2 = never | never; // tipo: never

// Un array di never si "svuota": utile per capire che il ramo e' impossibile.
type OnlyImpossible = never[]; // nessun elemento valido puo' entrarci

// ============================================================================
// 2) L'HELPER assertNever: il cuore dell'exhaustiveness check
// ============================================================================

// Riceve un parametro di tipo never: se il chiamante gli passa qualcosa che
// NON e' stato ridotto a never dal narrowing, la build fallisce. A runtime
// lancia, cosi' se un valore inatteso arriva (dati sporchi dal DB) esplode
// subito invece di corrompere lo stato in silenzio.
function assertNever(value: never, context = "valore non gestito"): never {
  throw new Error(`${context}: ${JSON.stringify(value)}`);
}

// ============================================================================
// 3) SWITCH ESAUSTIVO sui ruoli ERP (union di literal string)
// ============================================================================

// Union di ruoli reale del dominio Polyuretech.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Mappa ogni ruolo a un livello di permesso. Il default: assertNever(r)
// garantisce che se aggiungo "Manutentore" alla union e dimentico un case,
// tsc segnala errore proprio su assertNever.
function livelloPermesso(r: Ruolo): number {
  switch (r) {
    case "SuperAdmin":
      return 100;
    case "Admin":
      return 80;
    case "Operatore":
      return 40;
    case "QrDisplay":
      return 10;
    default:
      // Qui r ha tipo never PERCHE' i 4 case sopra hanno esaurito la union.
      // Control flow analysis: TS sottrae i literal gia' gestiti da Ruolo.
      return assertNever(r, "ruolo sconosciuto");
  }
}
// livelloPermesso("Admin") // => 80

// Dimostrazione del meccanismo: se scommentassimo il case "QrDisplay",
// nel default r avrebbe tipo "QrDisplay" (non never) e la chiamata sarebbe:
// ERRORE TS: Argument of type '"QrDisplay"' is not assignable to parameter of type 'never'.
// E' esattamente il segnale che manca un case.

// ============================================================================
// 4) LA VARIANTE "const _: never" nel default
// ============================================================================

// Alcuni team preferiscono NON chiamare una funzione ma dichiarare una const
// tipizzata never: l'assegnazione stessa e' il check a compile-time. A runtime
// e' inerte (nessun throw), utile quando ci si fida dei dati o si logga soltanto.
type StatoTimbratura = "aperta" | "chiusa" | "annullata";

function etichettaStato(s: StatoTimbratura): string {
  switch (s) {
    case "aperta":
      return "In corso";
    case "chiusa":
      return "Completata";
    case "annullata":
      return "Annullata";
    default: {
      // Se un domani aggiungo "sospesa" a StatoTimbratura senza un case,
      // questa riga diventa: ERRORE TS: Type 'string' is not assignable to type 'never'.
      const _exhaustive: never = s;
      return _exhaustive; // never e' assegnabile a string (bottom type)
    }
  }
}
// etichettaStato("aperta") // => "In corso"

// ============================================================================
// 5) DISCRIMINATED UNION: exhaustiveness su tag "kind"
// ============================================================================

// Le union di literal sono comode, ma il pattern piu' potente e' la
// discriminated union: ogni variante ha un campo discriminante (qui "kind").
// TS usa quel campo per fare narrowing dentro lo switch.
interface EventoEntrata {
  kind: "entrata";
  ora: string; // formato "HH:MM" naive-UTC
}
interface EventoUscita {
  kind: "uscita";
  ora: string;
}
interface EventoPausa {
  kind: "pausa";
  minuti: number;
}
type EventoTimbratura = EventoEntrata | EventoUscita | EventoPausa;

// Ritorna un delta minuti "firmato" a seconda del tipo di evento.
function descriviEvento(e: EventoTimbratura): string {
  switch (e.kind) {
    case "entrata":
      // Dentro questo case e ha tipo EventoEntrata: e.ora e' string, niente e.minuti.
      return `Entrata alle ${e.ora}`;
    case "uscita":
      return `Uscita alle ${e.ora}`;
    case "pausa":
      return `Pausa di ${e.minuti} min`;
    default:
      // e ridotto a never: tutte e 3 le varianti sono coperte.
      return assertNever(e, "evento timbratura non gestito");
  }
}
// descriviEvento({ kind: "pausa", minuti: 15 }) // => "Pausa di 15 min"

// ============================================================================
// 6) MECCANISMO INTERNO: distributivita' su union e never
// ============================================================================

// I conditional type distribuiscono sui membri di una union nude (naked).
// never come "argomento" della union e' l'ELEMENTO NEUTRO: una union che
// distribuisce su never produce never (nessun ramo da valutare).
type ScartaQrDisplay<T> = T extends "QrDisplay" ? never : T;
type RuoliOperativi = ScartaQrDisplay<Ruolo>;
// tipo: "SuperAdmin" | "Admin" | "Operatore"   (il ramo "QrDisplay" -> never sparisce)

// ATTENZIONE alla differenza: [T] extends [...] NON distribuisce (tuple wrap).
type IsNever<T> = [T] extends [never] ? true : false;
type T1 = IsNever<never>; // tipo: true
type T2 = IsNever<Ruolo>; // tipo: false
// Se avessimo scritto T extends never ? ... la distribuzione su never darebbe
// SEMPRE never, non true: per questo si usa il wrap in tupla [T].

// ============================================================================
// 7) HELPER type-level: Equal / Expect per TESTARE i tipi
// ============================================================================

// Equal confronta due tipi in modo esatto (anche readonly/optional). Trucco
// classico basato sull'identita' delle funzioni condizionali.
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
    ? true
    : false;

// Expect accetta solo true: se il test fallisce, e' ERRORE TS in fase di build.
type Expect<T extends true> = T;

// Test di tipo sulle utility definite sopra (nessun runtime, pura verifica).
type _Check1 = Expect<Equal<RuoliOperativi, "SuperAdmin" | "Admin" | "Operatore">>;
type _Check2 = Expect<Equal<IsNever<never>, true>>;
type _Check3 = Expect<Equal<A1, string>>;
// Se un domani ScartaQrDisplay cambiasse comportamento, _Check1 diventerebbe:
// ERRORE TS: Type 'false' does not satisfy the constraint 'true'.

// ============================================================================
// 8) EXHAUSTIVENESS su union NUMERICHE / miste
// ============================================================================

// Non solo string: funziona con literal number, boolean, enum-like.
type Priorita = 1 | 2 | 3;

function coloreBadgePriorita(p: Priorita): string {
  switch (p) {
    case 1:
      return "verde";
    case 2:
      return "giallo";
    case 3:
      return "rosso";
    default:
      return assertNever(p);
  }
}
// coloreBadgePriorita(2) // => "giallo"

// Con i turni (union di string) l'idea e' identica ma usiamo un pattern
// diverso: una LOOKUP TABLE tipizzata Record che il compilatore forza a
// essere completa. Manca una chiave => ERRORE TS. E' l'exhaustiveness
// "dichiarativa" alternativa allo switch.
type Turno = "P4" | "P2" | "STD";

const oreTurno: Record<Turno, number> = {
  P4: 4,
  P2: 2,
  STD: 8,
  // Se aggiungo "P6" a Turno e non lo metto qui:
  // ERRORE TS: Property 'P6' is missing in type '{...}' but required in type 'Record<Turno, number>'.
};

function durataTurno(t: Turno): number {
  return oreTurno[t]; // tipo: number, accesso totale garantito dal Record
}
// durataTurno("P4") // => 4

// ============================================================================
// 9) ESEMPIO ERP: state machine di una Timbratura con transizioni valide
// ============================================================================

// Modelliamo le transizioni ammesse. La funzione applica un'azione allo stato
// corrente; l'exhaustiveness check protegge sia l'insieme degli stati sia
// quello delle azioni quando la union crescera'.
type StatoMacchina = "idle" | "in_corso" | "in_pausa" | "chiusa";
type Azione =
  | { tipo: "avvia" }
  | { tipo: "pausa" }
  | { tipo: "riprendi" }
  | { tipo: "chiudi" };

function transita(stato: StatoMacchina, azione: Azione): StatoMacchina {
  switch (azione.tipo) {
    case "avvia":
      return stato === "idle" ? "in_corso" : stato;
    case "pausa":
      return stato === "in_corso" ? "in_pausa" : stato;
    case "riprendi":
      return stato === "in_pausa" ? "in_corso" : stato;
    case "chiudi":
      return stato === "chiusa" ? "chiusa" : "chiusa";
    default:
      // azione ridotta a never: coperti tutti i "tipo". Se aggiungo
      // { tipo: "annulla" } senza case, qui scatta l'errore.
      return assertNever(azione, "azione state machine non gestita");
  }
}
// transita("idle", { tipo: "avvia" }) // => "in_corso"

// ============================================================================
// 10) ESEMPIO ERP: DTO -> entita' con validazione e ramo impossibile
// ============================================================================

// Regex di dominio (badge "UP-001", orario "HH:MM").
const RE_BADGE = /^UP-\d{3}$/;
const RE_ORARIO = /^\d{2}:\d{2}$/;

interface Dipendente {
  id: number;
  nome: string;
  badge: string; // vincolo runtime: RE_BADGE
  ruolo: Ruolo;
}

// Risultato discriminato: successo o errore. Lo consumatore DEVE gestire
// entrambi i rami, e l'exhaustiveness check lo garantisce.
type Risultato<T> =
  | { ok: true; value: T }
  | { ok: false; errore: string };

function parseDipendente(raw: unknown): Risultato<Dipendente> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errore: "payload non oggetto" };
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.badge !== "string" || !RE_BADGE.test(o.badge)) {
    return { ok: false, errore: "badge non valido" };
  }
  if (typeof o.nome !== "string" || typeof o.id !== "number") {
    return { ok: false, errore: "campi base mancanti" };
  }
  const ruoliValidi: Ruolo[] = ["SuperAdmin", "Admin", "Operatore", "QrDisplay"];
  if (typeof o.ruolo !== "string" || !ruoliValidi.includes(o.ruolo as Ruolo)) {
    return { ok: false, errore: "ruolo non valido" };
  }
  return {
    ok: true,
    value: { id: o.id, nome: o.nome, badge: o.badge, ruolo: o.ruolo as Ruolo },
  };
}

// Consumo esaustivo del Risultato.
function messaggioParse(r: Risultato<Dipendente>): string {
  if (r.ok) {
    return `OK: ${r.value.nome} (${r.value.badge})`;
  }
  return `KO: ${r.errore}`;
}
// messaggioParse(parseDipendente({ id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Admin" }))
// => "OK: Rossi (UP-001)"

// ============================================================================
// 11) ESEMPIO ERP: repository con dispatch esaustivo per ruolo
// ============================================================================

// Mock di un repository (nessuna dipendenza reale a Prisma/DB: interfacce
// definite qui). Il metodo puo' filtrare i risultati in base al ruolo del
// chiamante; il default protegge da ruoli futuri non autorizzati.
interface TimbraturaRow {
  dipendenteId: number;
  entrata: string; // "HH:MM"
  uscita: string | null;
}

interface RepoTimbrature {
  tutte(): TimbraturaRow[];
}

function timbratureVisibili(repo: RepoTimbrature, ruolo: Ruolo): TimbraturaRow[] {
  switch (ruolo) {
    case "SuperAdmin":
    case "Admin":
      return repo.tutte(); // fall-through: due ruoli, stesso comportamento
    case "Operatore":
      // vede solo le proprie timbrature aperte (esempio: uscita null)
      return repo.tutte().filter((t) => t.uscita === null);
    case "QrDisplay":
      return []; // un display non ha diritto ai dati grezzi
    default:
      return assertNever(ruolo, "ruolo non autorizzato");
  }
}
// I "case" impilati (SuperAdmin/Admin) NON rompono l'exhaustiveness: TS li
// considera comunque gestiti e nel default il tipo resta never.

// ============================================================================
// 12) EXHAUSTIVENESS con if/else (non solo switch)
// ============================================================================

// Il control flow analysis funziona anche con catene if/else basate su
// discriminante. Al termine, nel ramo finale il tipo e' never.
function areaEvento(e: EventoTimbratura): string {
  if (e.kind === "entrata") return "IN";
  else if (e.kind === "uscita") return "OUT";
  else if (e.kind === "pausa") return "BREAK";
  else return assertNever(e); // e: never
}
// areaEvento({ kind: "uscita", ora: "17:30" }) // => "OUT"

// ============================================================================
// 13) GOTCHA / PITFALLS (trappole comuni)
// ============================================================================

// --- PITFALL 1: annotare la variabile con un tipo piu' largo rompe il check.
// Se il parametro fosse (r: string) invece di (r: Ruolo), nel default r
// sarebbe ancora "string", NON never: assertNever(r) darebbe errore SEMPRE,
// anche con tutti i case presenti. Regola: la union deve essere il tipo del
// discriminante, non una versione allargata.
function _pitfall1(r: string): number {
  switch (r) {
    case "SuperAdmin":
      return 100;
    default:
      // r qui e' string, non never.
      // ERRORE TS (se scommentato): Argument of type 'string' is not assignable to parameter of type 'never'.
      // return assertNever(r as never); // <- il "as never" nasconderebbe il bug: NON farlo
      return 0;
  }
}

// --- PITFALL 2: dimenticare "return" prima di assertNever.
// assertNever ha tipo never, quindi TS capisce che il codice dopo e'
// irraggiungibile; ma se il ramo deve produrre un valore, senza return la
// funzione potrebbe risultare senza valore in quel path a seconda del codice.
// Best practice: sempre "return assertNever(...)".

// --- PITFALL 3: union che si allarga silenziosamente per widening.
// Costruire l'array come let r = "Admin" gli darebbe tipo string (widening),
// perdendo la union. Usare "as const" o annotare esplicitamente il tipo Ruolo.
const ruoliOk = ["SuperAdmin", "Admin"] as const;
// tipo: readonly ["SuperAdmin", "Admin"]  (literal preservati)
type RuoliOkUnion = (typeof ruoliOk)[number]; // "SuperAdmin" | "Admin"

// --- PITFALL 4: "default" mancante del tutto. Senza default lo switch compila
// ma NON hai la garanzia: aggiungendo un membro alla union nessun errore ti
// avvisa. L'exhaustiveness check ESISTE solo se c'e' il ramo con assertNever.
function _pitfall4(t: Turno): number {
  switch (t) {
    case "P4":
      return 4;
    case "P2":
      return 2;
    case "STD":
      return 8;
    // Nessun default: se aggiungo "P6" a Turno, questa funzione ritorna
    // undefined a runtime per "P6" e TS non protesta. Metti sempre il default.
  }
  return 0; // fallback difensivo, ma inferiore al pattern assertNever
}

// ============================================================================
// 14) UTILITY riusabile: exhaustive() come alias espressivo
// ============================================================================

// Alcuni preferiscono un nome che comunichi l'intento nel default.
function exhaustive(x: never): never {
  throw new Error(`Caso non gestito: ${String(x)}`);
}

// Uso combinato: mappa uno stato macchina a un colore UI in modo totale.
function coloreStato(s: StatoMacchina): string {
  switch (s) {
    case "idle":
      return "grigio";
    case "in_corso":
      return "verde";
    case "in_pausa":
      return "arancio";
    case "chiusa":
      return "blu";
    default:
      return exhaustive(s);
  }
}
// coloreStato("in_pausa") // => "arancio"

// ============================================================================
// 15) TYPE-LEVEL: verificare l'esaustivita' di una lookup a compile-time
// ============================================================================

// Oltre allo switch, possiamo pretendere a livello di TIPO che una mappa
// copra tutte le chiavi, e testarlo con Equal/Expect. Questo sposta la
// garanzia ancora piu' a monte (nella forma del tipo stesso).
type ColoriTurno = { [K in Turno]: string }; // mapped type su tutta la union
const _coloriTurno: ColoriTurno = { P4: "verde", P2: "giallo", STD: "grigio" };

// Test: le chiavi del mapped type sono esattamente la union Turno.
type _CheckKeys = Expect<Equal<keyof ColoriTurno, Turno>>; // true

// Esempio browser (NON eseguito): renderizzare un badge colorato.
// function renderBadge(el: HTMLElement, t: Turno): void {
//   el.style.background = _coloriTurno[t]; // accesso totale, nessun undefined
// }

// ============================================================================
// EXPORT (solo simboli locali definiti in questo file)
// ============================================================================

export { assertNever, exhaustive, livelloPermesso, transita, parseDipendente };
export type { Ruolo, StatoTimbratura, EventoTimbratura, Turno, Risultato, Equal, Expect };

/**
 * RIEPILOGO COMANDI / CONCETTI
 * - never: bottom type, sottotipo di tutto; nessun valore (tranne never) vi si assegna.
 * - assertNever(x: never): fa fallire la build se un case manca; a runtime lancia.
 * - const _: never = x -> variante "dichiarativa" nel default (a runtime inerte).
 * - switch esaustivo: default con assertNever/exhaustive = garanzia a compile-time.
 * - discriminated union: campo "kind"/"tipo" -> narrowing automatico dentro lo switch.
 * - control flow analysis: TS sottrae i literal gia' gestiti finche' resta never.
 * - Record<Union, V>: lookup table che TS forza a coprire tutte le chiavi.
 * - mapped type { [K in Union]: V }: esaustivita' "dichiarativa" nella forma del tipo.
 * - distributivita': conditional type distribuisce su union nuda; never = elemento neutro.
 * - IsNever<T> = [T] extends [never] ? true : false (wrap in tupla per non distribuire).
 * - Equal<X,Y> / Expect<T extends true>: test di tipo a compile-time.
 * - as const: preserva i literal ed evita il widening che romperebbe l'exhaustiveness.
 * - PITFALL: tipo del discriminante allargato (string), default assente, "as never" tappabuchi.
 * - Best practice: sempre "return assertNever(x)" e union stretta come tipo del parametro.
 */
