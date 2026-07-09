/**
 * 081 - ADV Discriminated Unions avanzate
 * ---------------------------------------
 * Le "discriminated union" (o tagged union) usano una proprieta' letterale
 * comune (il "discriminante"/tag) per distinguere in modo sicuro varianti diverse.
 * Qui andiamo OLTRE le basi: piu' discriminanti, union annidate (nested),
 * mapped type sopra una union (distributivita'), pattern matching esaustivo,
 * type-level programming e una macchina a stati per la timbratura ERP Polyuretech.
 * Tutti gli esempi compilano con: tsc --noEmit --strict --target ES2022 --lib ES2022,DOM
 */

// ============================================================
// 0. HELPER DI TYPE-TESTING (Equal / Expect / assertNever)
// ============================================================

// Equal<A, B>: true SOLO se A e B sono identici. Il doppio wrapping in funzione
// generica sfrutta il fatto che due tipi condizionali sono equivalenti solo se
// hanno lo stesso comportamento di assegnabilita' in ENTRAMBE le direzioni.
// E' l'idioma classico usato dalle librerie di type-testing.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Expect<T> compila solo se T e' esattamente `true`: lo usiamo come "assert di tipo".
type Expect<T extends true> = T;

// assertNever: guardia runtime + compile-time per l'exhaustiveness (vedi sotto).
function assertNever(x: never, contesto = "valore"): never {
  throw new Error(`${contesto} non gestito: ${JSON.stringify(x)}`);
}

// Mini self-test dell'helper (nessun runtime, solo tipi).
type _t0a = Expect<Equal<"P4", "P4">>; // ok
type _t0b = Expect<Equal<1 | 2, 2 | 1>>; // ok: l'ordine dell'union non conta
// ERRORE TS: Type 'false' does not satisfy the constraint 'true'.
// type _t0c = Expect<Equal<string, "P4">>;
void 0 as unknown as [_t0a, _t0b];

// ============================================================
// 1. DOMINIO ERP: entita' di base riusate in tutto il file
// ============================================================

// Ruoli utente ERP (literal union chiusa).
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
// Acronimo turno di produzione.
type AcronimoTurno = "P4" | "P2" | "STD";
// Sigle reparto.
type SiglaReparto = "UP" | "UI" | "CO";
// Badge formato UP-001 (template literal type).
type Badge = `${SiglaReparto}-${number}`;

interface Dipendente {
  id: number;
  nome: string;
  badge: Badge; // es. "UP-001"
  ruolo: Ruolo;
}

const mario: Dipendente = { id: 1, nome: "Mario", badge: "UP-001", ruolo: "Operatore" };
void mario;

// ============================================================
// 2. Ripasso: discriminated union con UN solo tag
// ============================================================

// Ogni variante ha lo STESSO campo letterale `kind` con valore diverso.
// Questo e' cio' che permette il narrowing per uguaglianza.
type EventoTimbratura =
  | { kind: "entrata"; ora: string } // "HH:MM"
  | { kind: "uscita"; ora: string }
  | { kind: "pausa"; durataMin: number };

// Il narrowing sul tag rende ogni ramo type-safe: nel ramo "pausa" NON esiste `ora`.
function descriviEvento(e: EventoTimbratura): string {
  switch (e.kind) {
    case "entrata":
      return `Entrata alle ${e.ora}`; // e: { kind: "entrata"; ora: string }
    case "uscita":
      return `Uscita alle ${e.ora}`; // e: { kind: "uscita"; ora: string }
    case "pausa":
      return `Pausa di ${e.durataMin} min`; // e: { kind: "pausa"; durataMin: number }
    default:
      return assertNever(e, "EventoTimbratura"); // e: never
  }
}
const ev1 = descriviEvento({ kind: "entrata", ora: "08:00" }); // => "Entrata alle 08:00"
const ev2 = descriviEvento({ kind: "pausa", durataMin: 30 }); // => "Pausa di 30 min"
void ev1;
void ev2;

// ============================================================
// 3. Union con PIU' discriminanti (product discrimination)
// ============================================================

// TS puo' discriminare anche combinando PIU' campi letterali. Qui `livello` e
// `canale` restringono insieme: certe combinazioni hanno campi extra.
type Notifica =
  | { livello: "info"; canale: "ui"; testo: string }
  | { livello: "info"; canale: "email"; testo: string; a: string }
  | { livello: "errore"; canale: "ui"; testo: string; codice: number }
  | { livello: "errore"; canale: "email"; testo: string; a: string; codice: number };

// Narrowing "a strati": prima su livello, poi su canale. Ogni combinazione
// espone SOLO i campi giusti (control flow analysis a piu' dimensioni).
function inoltra(n: Notifica): string {
  if (n.livello === "errore") {
    // n: le due varianti "errore" -> `codice` e' comune a entrambe
    const base = `[ERR ${n.codice}] ${n.testo}`;
    return n.canale === "email" ? `${base} -> ${n.a}` : base; // qui narrowing su canale
  }
  // n: le due varianti "info"
  return n.canale === "email" ? `${n.testo} -> ${n.a}` : n.testo;
}
const nf1 = inoltra({ livello: "errore", canale: "email", testo: "Timbratura KO", a: "hr@x.it", codice: 42 });
// => "[ERR 42] Timbratura KO -> hr@x.it"
void nf1;

// Selezione di UNA variante estraendo per DUE tag con Extract (type-level).
type NotificaErroreEmail = Extract<Notifica, { livello: "errore"; canale: "email" }>;
// tipo: { livello: "errore"; canale: "email"; testo: string; a: string; codice: number }
type _t3 = Expect<Equal<keyof NotificaErroreEmail, "livello" | "canale" | "testo" | "a" | "codice">>;
void 0 as unknown as _t3;

// ============================================================
// 4. Union ANNIDATE (nested discriminated unions)
// ============================================================

// Il "payload" di una variante puo' essere a sua volta una discriminated union.
// Modelliamo il risultato di una validazione dove l'errore ha un suo sotto-tag.
type ErroreValidazione =
  | { tipo: "formatoOrario"; valore: string } // atteso "HH:MM"
  | { tipo: "formatoBadge"; valore: string } // atteso "UP-NNN"
  | { tipo: "fuoriTurno"; ora: string; turno: AcronimoTurno };

type Risultato<T> =
  | { esito: "ok"; dato: T }
  | { esito: "ko"; errore: ErroreValidazione }; // <- errore e' una union annidata

// Narrowing a due livelli: prima `esito`, poi `errore.tipo`.
function messaggioErrore(r: Risultato<string>): string {
  if (r.esito === "ok") return `Valido: ${r.dato}`; // r.dato: string
  // r: { esito: "ko"; errore: ErroreValidazione }
  const e = r.errore;
  switch (e.tipo) {
    case "formatoOrario":
      return `Orario non valido: "${e.valore}" (atteso HH:MM)`;
    case "formatoBadge":
      return `Badge non valido: "${e.valore}" (atteso UP-NNN)`;
    case "fuoriTurno":
      return `Ora ${e.ora} fuori dal turno ${e.turno}`;
    default:
      return assertNever(e, "ErroreValidazione");
  }
}
const me1 = messaggioErrore({ esito: "ko", errore: { tipo: "formatoOrario", valore: "8:0" } });
// => 'Orario non valido: "8:0" (atteso HH:MM)'
void me1;

// Costruttori (smart constructors): incapsulano la creazione delle varianti.
const ok = <T>(dato: T): Risultato<T> => ({ esito: "ok", dato });
const ko = (errore: ErroreValidazione): Risultato<never> => ({ esito: "ko", errore });

// Validatori reali del dominio ERP che restituiscono la union annidata.
function validaOrario(v: string): Risultato<string> {
  return /^\d{2}:\d{2}$/.test(v) ? ok(v) : ko({ tipo: "formatoOrario", valore: v });
}
function validaBadge(v: string): Risultato<string> {
  return /^UP-\d{3}$/.test(v) ? ok(v) : ko({ tipo: "formatoBadge", valore: v });
}
const vo1 = validaOrario("08:30"); // => { esito: "ok", dato: "08:30" }
const vb1 = validaBadge("XX-1"); // => { esito: "ko", errore: { tipo: "formatoBadge", valore: "XX-1" } }
void vo1;
void vb1;

// ============================================================
// 5. MAPPED TYPE sopra una union + DISTRIBUTIVITA'
// ============================================================

// Un conditional type "nudo" (naked) sul parametro DISTRIBUISCE sui membri
// dell'union: `T extends any ? ... : ...` viene applicato a ciascun membro
// e poi ricombinato. Questo e' il cuore di molte utility avanzate.
type TagDi<T> = T extends { kind: infer K } ? K : never;
type TagEvento = TagDi<EventoTimbratura>; // "entrata" | "uscita" | "pausa"
type _t5a = Expect<Equal<TagEvento, "entrata" | "uscita" | "pausa">>;
void 0 as unknown as _t5a;

// Distributivita' in azione: mappiamo OGNI variante mantenendola separata.
// `NonNullable<T>` non serve qui; usiamo un conditional identita' per distribuire.
type SoloConOra<T> = T extends { ora: string } ? T : never;
type EventiConOra = SoloConOra<EventoTimbratura>;
// tipo: { kind: "entrata"; ora: string } | { kind: "uscita"; ora: string }
type _t5b = Expect<Equal<TagDi<EventiConOra>, "entrata" | "uscita">>;
void 0 as unknown as _t5b;

// GOTCHA della distributivita': avvolgere in tuple la DISABILITA (no-distribute).
// [T] extends [any] tratta l'union come un blocco unico.
type EDistribuito<T> = T extends string ? `k:${T}` : never; // distribuisce
type ENonDistribuito<T> = [T] extends [string] ? "tutte-string" : "no"; // NON distribuisce
type _d1 = Expect<Equal<EDistribuito<"a" | "b">, "k:a" | "k:b">>; // union di risultati
type _d2 = Expect<Equal<ENonDistribuito<"a" | "b">, "tutte-string">>; // singolo risultato
void 0 as unknown as [_d1, _d2];

// Mapped type che costruisce una LOOKUP TABLE per-tag: da una union a un
// oggetto { tag: variante }. Passo 1: estrai la variante dato il tag.
type VariantePerTag<U extends { kind: string }, K extends U["kind"]> = Extract<U, { kind: K }>;
type SoloEntrata = VariantePerTag<EventoTimbratura, "entrata">;
// tipo: { kind: "entrata"; ora: string }
type _t5c = Expect<Equal<SoloEntrata, { kind: "entrata"; ora: string }>>;
void 0 as unknown as _t5c;

// Passo 2: mapped type sui TAG (K in ...) che indicizza la union -> mappa tag->variante.
type MappaVarianti<U extends { kind: string }> = {
  [K in U["kind"]]: Extract<U, { kind: K }>;
};
type MappaEventi = MappaVarianti<EventoTimbratura>;
// tipo: {
//   entrata: { kind: "entrata"; ora: string };
//   uscita:  { kind: "uscita"; ora: string };
//   pausa:   { kind: "pausa"; durataMin: number };
// }
type _t5d = Expect<Equal<MappaEventi["pausa"], { kind: "pausa"; durataMin: number }>>;
void 0 as unknown as _t5d;

// ============================================================
// 6. PATTERN MATCHING type-safe (matcher esaustivo con handler object)
// ============================================================

// Costruiamo un `match` che, data una union su `kind`, richiede un handler
// PER OGNI variante e ne inferisce il tipo di ritorno. L'esaustivita' e'
// garantita dal tipo: manca un tag -> errore a compile-time.
type Handlers<U extends { kind: string }, R> = {
  [K in U["kind"]]: (v: Extract<U, { kind: K }>) => R;
};

function match<U extends { kind: string }, R>(value: U, handlers: Handlers<U, R>): R {
  // Index access sicuro: handlers[value.kind] e' la funzione giusta per la variante.
  const h = handlers[value.kind as U["kind"]] as (v: U) => R;
  return h(value);
}

// Uso: ogni ramo riceve la variante gia' ristretta (v e' tipizzata correttamente).
const testoEvento = (e: EventoTimbratura): string =>
  match(e, {
    entrata: (v) => `IN ${v.ora}`, // v: { kind: "entrata"; ora: string }
    uscita: (v) => `OUT ${v.ora}`, // v: { kind: "uscita"; ora: string }
    pausa: (v) => `PAUSA ${v.durataMin}m`, // v: { kind: "pausa"; durataMin: number }
  });
const pm1 = testoEvento({ kind: "uscita", ora: "17:00" }); // => "OUT 17:00"
const pm2 = testoEvento({ kind: "pausa", durataMin: 15 }); // => "PAUSA 15m"
void pm1;
void pm2;

// ERRORE TS: Property 'pausa' is missing -> il matcher costringe a coprire TUTTI i casi.
// const parziale = (e: EventoTimbratura): string =>
//   match(e, { entrata: (v) => v.ora, uscita: (v) => v.ora });

// ============================================================
// 7. STATO MACCHINA: timbratura come state machine tipizzata
// ============================================================

// Stati possibili di una giornata di timbratura (discriminated union su `stato`).
type StatoTimbratura =
  | { stato: "fuori" } // non ancora entrato
  | { stato: "dentro"; entrata: string } // "HH:MM"
  | { stato: "inPausa"; entrata: string; inizioPausa: string }
  | { stato: "uscito"; entrata: string; uscita: string; minutiPausa: number };

// Azioni ammesse (a loro volta una discriminated union su `type`).
type Azione =
  | { type: "TIMBRA_ENTRATA"; ora: string }
  | { type: "INIZIA_PAUSA"; ora: string }
  | { type: "FINE_PAUSA"; ora: string }
  | { type: "TIMBRA_USCITA"; ora: string };

// Helper: minuti da "HH:MM" (naive, orari locali dell'ERP come stringhe).
function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((s) => Number.parseInt(s, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

// Il reducer: (stato corrente, azione) -> nuovo stato. Le transizioni ILLEGALI
// (es. uscire mentre sei "fuori") restituiscono lo stato invariato.
// Nota come lo switch annidato sfrutti il narrowing su DUE union insieme.
function transizione(s: StatoTimbratura, a: Azione): StatoTimbratura {
  switch (a.type) {
    case "TIMBRA_ENTRATA":
      // Consentito solo da "fuori".
      return s.stato === "fuori" ? { stato: "dentro", entrata: a.ora } : s;

    case "INIZIA_PAUSA":
      // Consentito solo da "dentro".
      return s.stato === "dentro"
        ? { stato: "inPausa", entrata: s.entrata, inizioPausa: a.ora }
        : s;

    case "FINE_PAUSA":
      // Consentito solo da "inPausa": chiude la pausa e torna "dentro".
      // (i minuti di pausa qui vengono ignorati per semplicita'; nel caso
      //  USCITA sotto invece vengono accumulati in `minutiPausa`.)
      return s.stato === "inPausa" ? { stato: "dentro", entrata: s.entrata } : s;

    case "TIMBRA_USCITA":
      // Consentito da "dentro" (o da "inPausa" chiudendo la pausa).
      if (s.stato === "dentro") {
        return { stato: "uscito", entrata: s.entrata, uscita: a.ora, minutiPausa: 0 };
      }
      if (s.stato === "inPausa") {
        const minutiPausa = toMin(a.ora) - toMin(s.inizioPausa);
        return { stato: "uscito", entrata: s.entrata, uscita: a.ora, minutiPausa };
      }
      return s;

    default:
      return assertNever(a, "Azione");
  }
}

// Simulazione di una giornata: fold delle azioni sullo stato iniziale.
const giornata: Azione[] = [
  { type: "TIMBRA_ENTRATA", ora: "08:00" },
  { type: "INIZIA_PAUSA", ora: "12:00" },
  { type: "FINE_PAUSA", ora: "12:30" },
  { type: "TIMBRA_USCITA", ora: "17:00" },
];
const statoFinale = giornata.reduce<StatoTimbratura>(transizione, { stato: "fuori" });
// => { stato: "uscito", entrata: "08:00", uscita: "17:00", minutiPausa: 0 }
void statoFinale;

// Transizione illegale ignorata: uscita mentre "fuori" lascia lo stato invariato.
const restaFuori = transizione({ stato: "fuori" }, { type: "TIMBRA_USCITA", ora: "17:00" });
// => { stato: "fuori" }
void restaFuori;

// Type-level: tabella delle transizioni ammesse (documenta + verifica intenti).
type StatiValidi = StatoTimbratura["stato"]; // "fuori" | "dentro" | "inPausa" | "uscito"
type _t7 = Expect<Equal<StatiValidi, "fuori" | "dentro" | "inPausa" | "uscito">>;
void 0 as unknown as _t7;

// ============================================================
// 8. Esempio REALE ERP: repository con DTO discriminato
// ============================================================

// Interfacce MOCK (definite QUI, nessun import da Prisma/Express): simulano
// il layer dati. In produzione arriverebbero dal client Prisma generato.
interface TimbraturaRow {
  id: number;
  dipendenteId: number;
  entrata: string | null; // "HH:MM" o null se giornata aperta
  uscita: string | null;
}

// Un DTO discriminato che espone al frontend uno stato calcolato e sicuro.
type TimbraturaDTO =
  | { stato: "aperta"; id: number; entrata: string }
  | { stato: "chiusa"; id: number; entrata: string; uscita: string; oreLavorate: number }
  | { stato: "vuota"; id: number };

// Mapper riga -> DTO: concentra la logica di "quale variante" in un punto solo.
function toDTO(row: TimbraturaRow): TimbraturaDTO {
  if (row.entrata === null) return { stato: "vuota", id: row.id };
  if (row.uscita === null) return { stato: "aperta", id: row.id, entrata: row.entrata };
  const oreLavorate = (toMin(row.uscita) - toMin(row.entrata)) / 60;
  return { stato: "chiusa", id: row.id, entrata: row.entrata, uscita: row.uscita, oreLavorate };
}

// Rendering type-safe del DTO con il matcher del punto 6 (riuso reale del pattern).
function renderRiga(dto: TimbraturaDTO): string {
  return match(
    // rietichetto il tag su `kind` per riusare `match` (richiede kind).
    { ...dto, kind: dto.stato } as
      | { kind: "aperta"; stato: "aperta"; id: number; entrata: string }
      | { kind: "chiusa"; stato: "chiusa"; id: number; entrata: string; uscita: string; oreLavorate: number }
      | { kind: "vuota"; stato: "vuota"; id: number },
    {
      aperta: (v) => `#${v.id} in corso da ${v.entrata}`,
      chiusa: (v) => `#${v.id} ${v.entrata}-${v.uscita} (${v.oreLavorate.toFixed(2)}h)`,
      vuota: (v) => `#${v.id} nessuna timbratura`,
    },
  );
}
const dtoAperta = toDTO({ id: 7, dipendenteId: 1, entrata: "08:00", uscita: null });
const rr1 = renderRiga(dtoAperta); // => "#7 in corso da 08:00"
const rr2 = renderRiga(toDTO({ id: 8, dipendenteId: 1, entrata: "08:00", uscita: "16:30" }));
// => "#8 08:00-16:30 (8.50h)"
void rr1;
void rr2;

// ============================================================
// 9. Discriminated union GENERICA + inferenza (Result<T, E>)
// ============================================================

// Pattern Result generico su DUE parametri: il tag `_tag` discrimina, i payload
// mantengono i generics -> inferenza automatica di T ed E ai call site.
type Result<T, E> =
  | { _tag: "Success"; value: T }
  | { _tag: "Failure"; error: E };

const success = <T>(value: T): Result<T, never> => ({ _tag: "Success", value });
const failure = <E>(error: E): Result<never, E> => ({ _tag: "Failure", error });

// map applica f SOLO al ramo Success, preservando l'errore (funtore).
function mapResult<T, E, U>(r: Result<T, E>, f: (t: T) => U): Result<U, E> {
  return r._tag === "Success" ? success(f(r.value)) : r; // r qui e' Failure -> Result<U, E>
}

const r9a = success(mario); // Result<Dipendente, never>
const r9b = mapResult(r9a, (d) => d.badge); // Result<Badge, never>
// r9b: { _tag: "Success"; value: "UP-001" }
void r9b;

// ============================================================
// 10. GOTCHA / PITFALLS (trappole comuni + soluzione)
// ============================================================

// --- PITFALL 1: il tag NON e' un literal type -> niente discriminazione. ---
// Se il campo tag e' `string` (non una literal union) TS non puo' restringere.
type CattivaUnion =
  | { kind: string; a: number } // <- kind: string = troppo largo
  | { kind: string; b: string };
function usaCattiva(x: CattivaUnion): number {
  // ERRORE TS: Property 'a' does not exist on type '{ kind: string; b: string }'.
  // return x.kind === "A" ? x.a : 0;
  return "a" in x ? x.a : 0; // workaround con `in`, ma la DU e' malformata
}
void usaCattiva;
// SOLUZIONE: usare literal per il tag: { kind: "A"; ... } | { kind: "B"; ... }.

// --- PITFALL 2: tag duplicato con payload incompatibili. ---
// Due varianti con lo STESSO tag ma campi diversi: TS le unisce e i campi
// extra diventano opzionali/assenti nel narrowing.
type TagDoppio =
  | { t: "x"; a: number }
  | { t: "x"; b: number }; // stesso tag "x"
function usaTagDoppio(v: TagDoppio): number {
  if (v.t === "x") {
    // v e' l'UNIONE delle due -> ne' `a` ne' `b` sono garantiti.
    // ERRORE TS: Property 'a' does not exist on type '{ t: "x"; b: number; }'.
    // return v.a;
    return ("a" in v ? v.a : 0) + ("b" in v ? v.b : 0);
  }
  return 0;
}
void usaTagDoppio;
// SOLUZIONE: tag UNIVOCI per variante ("x1" | "x2"), oppure un secondo discriminante.

// --- PITFALL 3: default dimenticato -> nessun exhaustiveness check. ---
// Senza il ramo `default` con `assertNever`, aggiungere una variante NON
// produce errori: il bug passa inosservato a runtime.
function areaSenzaCheck(e: EventoTimbratura): number {
  switch (e.kind) {
    case "entrata":
    case "uscita":
      return 1;
    case "pausa":
      return 0;
    // manca il default: se aggiungi "straordinario" il compilatore TACE.
  }
  return -1; // ramo di fallback silenzioso = pericoloso
}
void areaSenzaCheck;
// SOLUZIONE: default: return assertNever(e) -> l'aggiunta di una variante rompe la build.

// --- PITFALL 4: narrowing PERSO dopo una callback/async. ---
// Dentro una closure che TS non puo' analizzare, il narrowing precedente decade.
function pitfallClosure(e: EventoTimbratura): void {
  if (e.kind === "entrata") {
    const stampa = () => {
      // Qui e' ancora ristretto perche' `e` e' const e non riassegnato:
      console.log(e.ora); // ok in questo caso specifico
    };
    stampa();
  }
  // Ma se `e` fosse un parametro RIASSEGNABILE mutato tra il check e l'uso,
  // il narrowing verrebbe invalidato. SOLUZIONE: estrai in una const locale
  // ristretta prima della callback -> const entrata = e; e usa `entrata`.
}
void pitfallClosure;

// ============================================================
// 11. Bonus: costruttore di union da tabella `as const`
// ============================================================

// Definisci le transizioni come dato `as const` e derivane i tipi.
const TRANSIZIONI = {
  fuori: ["TIMBRA_ENTRATA"],
  dentro: ["INIZIA_PAUSA", "TIMBRA_USCITA"],
  inPausa: ["FINE_PAUSA", "TIMBRA_USCITA"],
  uscito: [],
} as const;

// Deriva: da uno stato, quali azioni sono ammesse (union di literal).
type AzioniAmmesse<S extends keyof typeof TRANSIZIONI> = (typeof TRANSIZIONI)[S][number];
type DaDentro = AzioniAmmesse<"dentro">; // "INIZIA_PAUSA" | "TIMBRA_USCITA"
type _t11 = Expect<Equal<DaDentro, "INIZIA_PAUSA" | "TIMBRA_USCITA">>;
void 0 as unknown as _t11;

// Guardia runtime allineata ai tipi: verifica se un'azione e' lecita in uno stato.
function azioneLecita(stato: keyof typeof TRANSIZIONI, azione: Azione["type"]): boolean {
  return (TRANSIZIONI[stato] as readonly string[]).includes(azione);
}
const al1 = azioneLecita("fuori", "TIMBRA_ENTRATA"); // => true
const al2 = azioneLecita("fuori", "TIMBRA_USCITA"); // => false
void al1;
void al2;

// ============================================================
// 12. Export dei simboli DEFINITI in questo file (moduli autonomi)
// ============================================================

export { descriviEvento, match, transizione, toDTO, mapResult, success, failure, ok, ko };
export type {
  EventoTimbratura,
  Notifica,
  Risultato,
  ErroreValidazione,
  StatoTimbratura,
  Azione,
  TimbraturaDTO,
  Result,
  Equal,
  Expect,
};

/*
============================================================
RIEPILOGO COMANDI / CONCETTI
============================================================
- Discriminated union: varianti con lo STESSO campo letterale (tag) di valore diverso.
- Narrowing sul tag:   switch/if su tag -> ogni ramo espone i campi giusti.
- Piu' discriminanti:  narrowing "a strati" su piu' campi letterali insieme.
- Nested union:        il payload di una variante e' a sua volta una DU (errore.tipo).
- Extract<U, {tag:K}>: seleziona una (o piu') varianti dato il valore del tag.
- Distributivita':     T extends X ? .. : .. su union DISTRIBUISCE membro per membro.
- No-distribute:       [T] extends [X] ? .. : .. tratta l'union come blocco unico.
- Mapped su union:     { [K in U["tag"]]: Extract<U,{tag:K}> } = mappa tag -> variante.
- Pattern matching:    Handlers<U,R> costringe a coprire TUTTE le varianti (esaustivo).
- assertNever(x):      default con `never` -> aggiungere una variante rompe la build.
- State machine:       (stato, azione) -> stato; transizioni illegali = no-op.
- Result<T,E> generico: _tag "Success"|"Failure"; map preserva l'errore (funtore).
- Equal/Expect:        test di tipo a compile-time (idioma <T>()=>T extends A?1:2).
- as const + [number]: deriva union di literal da una tabella dati.
- GOTCHA: tag deve essere LITERAL; tag univoci per variante; sempre il default;
          estrai in const prima delle closure per non perdere il narrowing.
- Compila con: tsc --noEmit --strict --target ES2022 --lib ES2022,DOM
*/
