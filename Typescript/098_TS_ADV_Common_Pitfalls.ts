/**
 * 098_TS_ADV_Common_Pitfalls.ts
 * File 98 - ADV Common pitfalls & anti-pattern
 *
 * Rassegna dei principali anti-pattern del type system TypeScript:
 * any dilagante, abuso di 'as', enum vs union, tipi troppo larghi (widening),
 * non-null assertion '!' rischioso, object vs {} vs Record.
 * Ogni trappola e' mostrata con la versione SBAGLIATA (commentata) e quella CORRETTA,
 * con spiegazione del "perche" a livello di meccanismo interno (inference, control flow).
 * Dominio ERP Polyuretech (Dipendente, Timbratura, Reparto, ruoli).
 */

// ---------------------------------------------------------------------------
// Helper di test a livello di tipo (type-level testing).
// Equal usa il trucco delle funzioni condizionali generiche: due tipi sono
// "veramente" uguali solo se le due funzioni condizionali hanno lo stesso tipo.
// Questo distingue any da unknown, cosa che un semplice extends non farebbe.
// ---------------------------------------------------------------------------
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

type Expect<T extends true> = T;

// Esempi d'uso dell'helper:
type _t01 = Expect<Equal<string, string>>;   // ok
// type _t02 = Expect<Equal<any, string>>;    // ERRORE TS: any e string non sono uguali
type _t03 = Expect<Equal<{ a: 1 }, { a: 1 }>>; // ok

// ===========================================================================
// SEZIONE 1 - 'any' DILAGANTE (any contamina, unknown protegge)
// ===========================================================================

// 'any' disattiva completamente il type checker: ogni operazione e' permessa
// e il tipo si "propaga" contaminando tutto cio' che tocca.
function parseBadge_any(raw: any) {
  // Nessun errore qui, ma nessuna garanzia: any accetta tutto.
  return raw.toUpperCase().trim().length; // tipo del ritorno: any
}
const lenBad = parseBadge_any(123); // runtime CRASH: 123.toUpperCase non esiste
// lenBad ha tipo any -> contaminazione a valle
const propagato: number = lenBad; // nessun errore TS, ma e' una bugia

// CORRETTO: usare 'unknown' e restringere (narrowing) prima di usare.
function parseBadge_unknown(raw: unknown): number {
  if (typeof raw !== "string") {
    throw new Error("badge non valido");
  }
  // qui raw e' string grazie al control flow narrowing
  return raw.toUpperCase().trim().length; // tipo: number
}

// Perche' unknown e' meglio: unknown e' il "top type" sicuro. Puoi assegnare
// qualsiasi cosa A unknown, ma NON puoi usarlo finche' non lo restringi.
const u: unknown = parseBadge_unknown("UP-001");
// const x: number = u;               // ERRORE TS: unknown non assegnabile a number
if (typeof u === "number") {
  const x: number = u; // ok dopo narrowing
  void x;
}

// ===========================================================================
// SEZIONE 2 - ABUSO DI 'as' (type assertion mente al compilatore)
// ===========================================================================

interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
}

// SBAGLIATO: 'as' forza un tipo che a runtime potrebbe non esistere.
const rispostaApi: unknown = { id: 1, nome: "Rossi" }; // manca badge e ruolo!
const depFinto = rispostaApi as Dipendente;
// depFinto.badge e' typed string ma a runtime e' undefined -> bug silenzioso
// depFinto.badge.toUpperCase();      // runtime CRASH, zero warning TS

// 'as' fa "double assertion" per bypassare anche controlli sensati:
const n = 42;
// const s: string = n as string;     // ERRORE TS: number e string non si sovrappongono
const s = n as unknown as string;     // 'as unknown as' e' il classico escape hatch abusato

// CORRETTO: type guard che VALIDA a runtime e restringe a livello di tipo.
// La firma 'raw is Dipendente' e' una user-defined type guard.
function isDipendente(raw: unknown): raw is Dipendente {
  if (typeof raw !== "object" || raw === null) return false;
  const o = raw as Record<string, unknown>; // qui 'as' e' lecito: stiamo validando
  return (
    typeof o.id === "number" &&
    typeof o.nome === "string" &&
    typeof o.badge === "string" &&
    typeof o.ruolo === "string"
  );
}

function usaRisposta(raw: unknown): string {
  if (!isDipendente(raw)) throw new Error("payload non valido");
  return raw.badge; // tipo: string, garantito anche a runtime
}
void usaRisposta;
void depFinto;
void s;

// ===========================================================================
// SEZIONE 3 - ENUM vs UNION DI STRING LITERAL
// ===========================================================================

// enum numerico: genera codice runtime, ha reverse mapping, valori impliciti
// che possono "scivolare" se qualcuno inserisce un membro in mezzo.
enum RuoloEnum {
  SuperAdmin, // 0
  Admin,      // 1
  Operatore,  // 2
  QrDisplay,  // 3
}
// PITFALL: un enum numerico accetta QUALSIASI number in assegnazione ampia.
// Nota: in TS 6.x l'assegnazione diretta di un number fuori range a un enum E' un errore.
// ERRORE TS 2322: Type '99' is not assignable to type 'RuoloEnum'.
// const brutto: RuoloEnum = 99;
const brutto: RuoloEnum = 99 as RuoloEnum; // il cast aggira il check: 99 non e' un ruolo valido a runtime!
void brutto;

// PREFERITO: union di string literal. Zero runtime, esaustivita' garantita,
// nessun valore fantasma, ottimo per DTO e JSON.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
// const r: Ruolo = "Guest";          // ERRORE TS: "Guest" non e' assegnabile a Ruolo

// Se serve un "oggetto costante" senza i difetti dell'enum, usa 'as const'.
const RUOLI = ["SuperAdmin", "Admin", "Operatore", "QrDisplay"] as const;
type RuoloDaConst = typeof RUOLI[number]; // "SuperAdmin" | "Admin" | ...
type _t04 = Expect<Equal<RuoloDaConst, Ruolo>>; // ok, coincidono

// Esaustivita' con never: se aggiungi un ruolo e dimentichi un case, TS grida.
function descriviRuolo(r: Ruolo): string {
  switch (r) {
    case "SuperAdmin": return "accesso totale";
    case "Admin": return "gestione reparto";
    case "Operatore": return "timbratura";
    case "QrDisplay": return "solo visualizzazione";
    default: {
      // Se 'r' non e' stato ridotto a never, questa riga NON compila:
      // e' un controllo di esaustivita' a compile-time.
      const _exhaustive: never = r;
      return _exhaustive;
    }
  }
}
void descriviRuolo;

// ===========================================================================
// SEZIONE 4 - TIPI TROPPO LARGHI (widening) e literal widening
// ===========================================================================

// PITFALL: 'let' allarga (widens) i literal al loro tipo base.
let turno1 = "P4"; // tipo inferito: string (non "P4"!)
// turno1 puo' ora diventare qualsiasi stringa -> tipo troppo largo
turno1 = "qualsiasi cosa"; // nessun errore

// CORRETTO: 'const' mantiene il literal type, oppure annota il tipo stretto.
const turno2 = "P4"; // tipo: "P4"
type Turno = "P4" | "P2" | "STD";
let turno3: Turno = "P4"; // tipo: Turno, ma ristretto ai 3 valori
// turno3 = "P9";                     // ERRORE TS: "P9" non e' un Turno
void turno1; void turno2; void turno3;

// PITFALL: oggetti literal widenizzano le property se non usi 'as const'.
const config1 = { turno: "P4", attivo: true }; // turno: string, attivo: boolean
// config1.turno non e' assegnabile dove serve un Turno stretto:
// const need: Turno = config1.turno; // ERRORE TS: string non assegnabile a Turno

const config2 = { turno: "P4", attivo: true } as const;
// ora turno: "P4", attivo: true (readonly, literal)
const need2: Turno = config2.turno; // ok
void config1; void need2;

// PITFALL: array di literal widenizza a string[] senza 'as const'.
const badges1 = ["UP-001", "UP-002"]; // string[]
const badges2 = ["UP-001", "UP-002"] as const; // readonly ["UP-001", "UP-002"]
void badges1; void badges2;

// ===========================================================================
// SEZIONE 5 - NON-NULL ASSERTION '!' RISCHIOSO
// ===========================================================================

interface Reparto {
  id: number;
  nome: string;
  responsabile?: Dipendente; // opzionale: puo' essere undefined
}

const reparto: Reparto = { id: 1, nome: "Stampaggio" };

// SBAGLIATO: '!' promette al compilatore "non e' null/undefined", ma mente.
// const capo = reparto.responsabile!.nome; // runtime CRASH: undefined.nome
// Il compilatore si fida ciecamente: nessun errore TS, bug a runtime.

// CORRETTO: narrowing esplicito o optional chaining + fallback.
const capoNome = reparto.responsabile?.nome ?? "(nessun responsabile)";
// tipo: string, nessun crash possibile
void capoNome;

// PITFALL sottile: '!' su risultato di find/get. find puo' restituire undefined.
const dipendenti: Dipendente[] = [];
// const primo = dipendenti.find(d => d.ruolo === "Admin")!; // pericoloso
const primo = dipendenti.find((d) => d.ruolo === "Admin");
if (primo) {
  // qui primo e' Dipendente grazie al narrowing, senza '!'
  void primo.nome;
}

// Quando '!' e' accettabile: solo se hai una GARANZIA esterna al type system
// (es. inizializzazione in un ciclo di vita noto). Documentalo sempre.
class RepositoryTimbrature {
  // definite assignment assertion: prometti a TS che verra' inizializzato
  private cache!: Map<number, Timbratura[]>;
  init(): void {
    this.cache = new Map();
  }
  get(id: number): Timbratura[] {
    return this.cache.get(id) ?? []; // '!' evitato con ?? []
  }
}
void RepositoryTimbrature;

// ===========================================================================
// SEZIONE 6 - object vs {} vs Record<K, V>
// ===========================================================================

// '{}' NON significa "oggetto vuoto": significa "qualsiasi valore non null/undefined".
// E' uno dei tipi piu' fraintesi di TS.
const a1: {} = 42;        // ok! number e' assegnabile a {}
const a2: {} = "ciao";    // ok! string e' assegnabile a {}
// const a3: {} = null;   // ERRORE TS: null non e' assegnabile a {}
void a1; void a2;

// 'object' significa "qualsiasi tipo NON primitivo" (no number/string/boolean...).
// const o1: object = 42;  // ERRORE TS: number e' primitivo
const o2: object = { x: 1 }; // ok
const o3: object = [1, 2];   // ok, gli array sono oggetti
void o2; void o3;
// Problema di 'object': non conosci le chiavi, non puoi accedere alle property.
// o2.x;                    // ERRORE TS: property 'x' non esiste su 'object'

// Record<K, V>: la scelta giusta per "mappa/dizionario" con chiavi e valori tipati.
type ContoOre = Record<string, number>; // chiave = badge, valore = ore
const ore: ContoOre = { "UP-001": 8, "UP-002": 7.5 };
const oreUno = ore["UP-001"]; // tipo: number
void oreUno;

// Record con chiavi ristrette da una union: mappa esaustiva e sicura.
type PermessiPerRuolo = Record<Ruolo, boolean>;
const permessi: PermessiPerRuolo = {
  SuperAdmin: true,
  Admin: true,
  Operatore: false,
  QrDisplay: false,
  // se ometti un ruolo -> ERRORE TS: property mancante (esaustivita' forzata)
};
void permessi;

// GOTCHA su Record<string, V>: TS assume che ogni chiave esista, ma a runtime no.
// Attiva 'noUncheckedIndexedAccess' per rendere il tipo 'V | undefined'.
// Con quel flag: const forse = ore["UP-999"]; // tipo: number | undefined (piu' sicuro)

// ===========================================================================
// SEZIONE 7 - ESEMPI ERP REALISTICI
// ===========================================================================

// Timbratura con orari in formato naive-UTC "HH:MM".
interface Timbratura {
  dipendenteId: number;
  entrata: string; // "HH:MM"
  uscita: string;  // "HH:MM"
}

// Anti-pattern DTO: usare 'any' per il payload di rete contamina il repository.
// function salvaTimbratura_bad(dto: any) { ... } // any -> zero validazione

// Pattern corretto: DTO stretto + validazione runtime + branded-ish narrowing.
const RE_ORARIO = /^\d{2}:\d{2}$/;
const RE_BADGE = /^UP-\d{3}$/;

function isOrario(v: unknown): v is string {
  return typeof v === "string" && RE_ORARIO.test(v);
}
function isBadge(v: unknown): v is string {
  return typeof v === "string" && RE_BADGE.test(v);
}

function creaTimbratura(dto: unknown): Timbratura {
  if (typeof dto !== "object" || dto === null) throw new Error("dto invalido");
  const o = dto as Record<string, unknown>;
  if (typeof o.dipendenteId !== "number") throw new Error("id invalido");
  if (!isOrario(o.entrata) || !isOrario(o.uscita)) throw new Error("orari invalidi");
  // dopo le guard, i campi sono 'string' ristretti dal control flow
  return {
    dipendenteId: o.dipendenteId,
    entrata: o.entrata,
    uscita: o.uscita,
  };
}
void creaTimbratura; void isBadge;

// Repository generico: NON tipizzare con 'any' l'entita'; usa un generic vincolato.
interface HasId {
  id: number;
}
class Repository<T extends HasId> {
  private store = new Map<number, T>();
  save(entity: T): void {
    this.store.set(entity.id, entity);
  }
  // Ritorna T | undefined (onesto), NON T con '!' interno.
  findById(id: number): T | undefined {
    return this.store.get(id);
  }
}
const repoDip = new Repository<Dipendente>();
const trovato = repoDip.findById(1); // tipo: Dipendente | undefined
// trovato.nome;                       // ERRORE TS: possibilmente undefined
if (trovato) void trovato.nome;         // corretto: narrowing

// Stato macchina di una timbratura: union discriminata invece di flag booleani.
// Anti-pattern: { aperta: boolean; uscita?: string } permette stati impossibili
// (es. aperta=true ma uscita valorizzata). Meglio una discriminated union.
type StatoTimbratura =
  | { tipo: "aperta"; entrata: string }
  | { tipo: "chiusa"; entrata: string; uscita: string };

function chiudi(t: StatoTimbratura, uscita: string): StatoTimbratura {
  if (t.tipo === "chiusa") return t; // gia' chiusa
  // qui t e' ristretto al ramo "aperta": t.uscita non esiste, coerenza garantita
  return { tipo: "chiusa", entrata: t.entrata, uscita };
}
void chiudi;

// ===========================================================================
// SEZIONE 8 - GOTCHA / PITFALLS FINALI
// ===========================================================================

// GOTCHA 1: 'as const' su return per preservare i literal in un factory.
function ruoloDefault() {
  return "Operatore"; // tipo di ritorno inferito: string (widened!)
}
function ruoloDefaultOk() {
  return "Operatore" as const; // tipo: "Operatore"
}
type _t05 = Expect<Equal<ReturnType<typeof ruoloDefault>, string>>;      // ok
type _t06 = Expect<Equal<ReturnType<typeof ruoloDefaultOk>, "Operatore">>; // ok

// GOTCHA 2: array.includes su union stretta rifiuta valori esterni.
// const ok = RUOLI.includes("Guest"); // ERRORE TS: "Guest" non e' nel tuple type
// Soluzione: helper che accetta string e restringe con predicate.
function isRuolo(v: string): v is Ruolo {
  return (RUOLI as readonly string[]).includes(v);
}
void isRuolo;

// GOTCHA 3: '!' e optional chaining insieme = falsa sicurezza.
// reparto.responsabile?.nome!  -> il '!' e' inutile e maschera l'intento.
// Regola: se usi '?.', NON aggiungere '!' dopo. Scegli fallback con '??'.

// GOTCHA 4: catch(e) ha tipo 'unknown' (con useUnknownInCatchVariables).
// Non assumere che 'e' sia Error: restringi prima di leggere .message.
function messaggioErrore(e: unknown): string {
  if (e instanceof Error) return e.message; // narrowing corretto
  return String(e);
}
void messaggioErrore;

// GOTCHA 5: Record<string, T> + accesso indicizzato mente senza noUncheckedIndexedAccess.
// const v = ore["chiave-inesistente"]; // tipo: number, ma a runtime undefined!
// Abilita noUncheckedIndexedAccess per ottenere 'number | undefined'.

// ---------------------------------------------------------------------------
// Export locali (solo simboli definiti in questo file).
// ---------------------------------------------------------------------------
export {
  parseBadge_unknown,
  isDipendente,
  descriviRuolo,
  creaTimbratura,
  Repository,
  chiudi,
  isRuolo,
  messaggioErrore,
};
export type {
  Dipendente,
  Ruolo,
  Turno,
  Timbratura,
  Reparto,
  StatoTimbratura,
  ContoOre,
  Equal,
  Expect,
};

/*
 * ===========================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ===========================================================================
 * - any: disattiva il checker e CONTAMINA a valle -> preferisci unknown + narrowing.
 * - unknown: top type sicuro; assegnabile da tutto, usabile solo dopo restringimento.
 * - as: type assertion, MENTE al compilatore; usalo solo dentro type guard di validazione.
 * - 'as unknown as X': double assertion, escape hatch da evitare salvo casi estremi.
 * - user-defined type guard: 'v is T' valida a runtime e restringe a compile-time.
 * - enum numerico: genera runtime, reverse mapping, accetta number arbitrari -> evita.
 * - union di string literal: zero runtime, esaustiva, ideale per DTO/JSON.
 * - 'as const': preserva literal type, rende readonly, base per typeof[number].
 * - controllo esaustivita': 'const _x: never = r' nel default dello switch.
 * - widening: 'let' allarga i literal; 'const' li preserva; annota per restringere.
 * - non-null '!': promessa non verificata -> preferisci ?., ?? o narrowing esplicito.
 * - definite assignment 'prop!:': lecito solo con garanzia di init nel lifecycle.
 * - '{}': "qualsiasi non-null/undefined", NON oggetto vuoto.
 * - 'object': "qualsiasi non-primitivo", ma senza chiavi accessibili.
 * - Record<K,V>: mappa tipata; Record<Ruolo,V> forza esaustivita' delle chiavi.
 * - noUncheckedIndexedAccess: rende l'accesso indicizzato 'V | undefined' (piu' sicuro).
 * - discriminated union: elimina stati impossibili meglio dei flag booleani.
 * - catch(e): e' 'unknown' -> usa 'e instanceof Error' prima di leggere .message.
 * - Equal/Expect: helper type-level per testare l'uguaglianza esatta dei tipi.
 * ===========================================================================
 */
