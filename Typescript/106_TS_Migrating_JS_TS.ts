/**
 * 106_TS_Migrating_JS_TS.ts
 * Argomento (file 106): Migrating JS -> TS (migrazione incrementale).
 * Come portare un progetto JavaScript esistente a TypeScript senza fermare
 * lo sviluppo: allowJs/checkJs, // @ts-check, any temporanei come "debito
 * di tipo", strategia file-per-file, e tipizzazione graduale con esempi
 * prima/dopo nel dominio ERP Polyuretech (Dipendente, Timbratura, Reparto).
 */

// ============================================================================
// 0. IL PROBLEMA: perche' migrare gradualmente e non "big bang"
// ============================================================================
// Un rewrite totale (big bang) di un codebase JS in TS congela le feature,
// introduce regressioni e demoralizza il team. La strategia raccomandata da
// TypeScript e' INCREMENTALE: TS e' un superset di JS, quindi ogni file .js
// valido e' gia' "quasi" TS. Si accende il compilatore su tutto, si permette
// il JS misto (allowJs), e si converte un file alla volta .js -> .ts.

// Fasi tipiche:
//   1. tsc compila anche i .js       -> "allowJs": true
//   2. tsc controlla i tipi nei .js  -> "checkJs": true  (o // @ts-check per-file)
//   3. rinomina .js -> .ts, aggiungi tipi, elimina gli any temporanei
//   4. alza lo "strict" quando la superficie tipizzata e' abbastanza grande

export {}; // rende questo file un module (isola gli scope degli esempi)

// ============================================================================
// 1. tsconfig.json per la migrazione (mostrato come commento, non e' codice TS)
// ============================================================================
// Config iniziale PERMISSIVA: fa girare il progetto misto senza bloccare tutto.
/*
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "lib": ["ES2022", "DOM"],
    "allowJs": true,        // <- compila anche i file .js
    "checkJs": false,       // <- NON type-checka i .js (fase 1: solo emit)
    "outDir": "./dist",
    "strict": false,        // <- si parte morbidi, si alza dopo
    "noImplicitAny": false, // <- gli any impliciti sono tollerati all'inizio
    "skipLibCheck": true    // <- ignora errori nei .d.ts di terze parti
  },
  "include": ["src"]
}
*/
// Config "fase avanzata": quasi tutto e' .ts, si accende lo strict.
/*
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,        // ora anche i .js rimasti vengono controllati
    "strict": true,
    "noImplicitAny": true
  }
}
*/

// ============================================================================
// 2. // @ts-check : type-checking di UN SINGOLO file .js senza toccare il tsconfig
// ============================================================================
// Se checkJs e' false a livello globale, si puo' abilitare il controllo su un
// singolo file .js aggiungendo // @ts-check come PRIMA riga di quel file.
// Direttiva opposta: // @ts-nocheck disattiva il controllo su un file.
// Riga singola: // @ts-ignore o // @ts-expect-error sopra la riga incriminata.
//
// Esempio (contenuto di un ipotetico src/legacy/paghe.js):
/*
  // @ts-check
  function calcolaOre(entrata, uscita) {
    // TS ora inferisce i tipi dall'uso e segnala gli errori anche in .js
    return uscita - entrata;
  }
  calcolaOre("08:00", "17:00"); // ERRORE TS: string non e' assegnabile a number-op
*/

// ============================================================================
// 3. JSDoc: tipizzare JS SENZA sintassi TS (utile prima del rename .ts)
// ============================================================================
// In un file .js con // @ts-check si annotano i tipi con commenti JSDoc.
// TS li legge come tipi veri. E' il ponte per aggiungere tipi restando in .js.
/*
  // @ts-check

  // @param {string} entrata  orario "HH:MM"
  // @param {string} uscita   orario "HH:MM"
  // @returns {number} minuti lavorati
  function minutiLavorati(entrata, uscita) { ... }

  // @typedef {Object} DipendenteJS
  // @property {number} id
  // @property {string} nome
*/
// Qui sotto la versione TS equivalente della stessa JSDoc (@typedef -> interface):
interface DipendenteJS {
  id: number;
  nome: string;
}

// ============================================================================
// 4. any TEMPORANEO come "debito di tipo" tracciabile
// ============================================================================
// Durante la migrazione va bene usare any per NON bloccarsi: e' un debito da
// ripagare. Il trucco e' renderlo VISIBILE e cercabile, non nasconderlo.

// Alias marcatore: si cerca "TODO_ANY" nel repo per trovare tutto il debito.
type TODO_ANY = any; // segnaposto: da sostituire con il tipo reale

// Prima (appena migrato da .js): tutto any, ma il codice compila.
function importaTimbrature(raw: TODO_ANY): TODO_ANY {
  return raw.map((r: TODO_ANY) => ({ badge: r.badge, ora: r.ora }));
}

// Dopo (debito ripagato): tipi precisi, TODO_ANY sparito.
interface TimbraturaRaw {
  badge: string;
  ora: string;
}
interface TimbraturaImportata {
  badge: string;
  ora: string;
}
function importaTimbratureTipizzato(raw: TimbraturaRaw[]): TimbraturaImportata[] {
  return raw.map((r) => ({ badge: r.badge, ora: r.ora }));
}

// unknown e' spesso meglio di any per i confini (boundary) esterni: costringe
// a validare prima di usare, invece di propagare "qualsiasi cosa".
function parseJsonSicuro(testo: string): unknown {
  return JSON.parse(testo); // tipo: unknown -> il chiamante DEVE fare narrowing
}

// ============================================================================
// 5. ESEMPIO PRIMA/DOPO #1 -- una funzione di dominio (calcolo minuti)
// ============================================================================

// --- PRIMA (stile JS, tutto implicito, nessuna garanzia) -------------------
// In .js questa funzione accetta qualunque cosa e puo' esplodere a runtime.
function minutiTraOrariJS(entrata: TODO_ANY, uscita: TODO_ANY): TODO_ANY {
  const [h1, m1] = entrata.split(":").map(Number);
  const [h2, m2] = uscita.split(":").map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

// --- DOPO (TS tipizzato, orari naive-UTC "HH:MM", validazione al confine) ---
type OrarioHHMM = string; // convenzione: /^\d{2}:\d{2}$/ (naive-UTC)

function isOrarioHHMM(v: unknown): v is OrarioHHMM {
  return typeof v === "string" && /^\d{2}:\d{2}$/.test(v);
}

function minutiTraOrari(entrata: OrarioHHMM, uscita: OrarioHHMM): number {
  const [h1, m1] = entrata.split(":").map(Number);
  const [h2, m2] = uscita.split(":").map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

// minutiTraOrari("08:00", "17:30"); // => 570
// minutiTraOrari("8", "17:30");     // compila ma isOrarioHHMM lo scarterebbe
// minutiTraOrari(800, 1730);        // ERRORE TS: number non assegnabile a OrarioHHMM

// ============================================================================
// 6. ESEMPIO PRIMA/DOPO #2 -- un "model" ERP (Dipendente)
// ============================================================================

// --- PRIMA: oggetto JS senza forma, campi liberi, ruolo string qualunque ----
const dipLegacy: TODO_ANY = {
  id: 1,
  nome: "Rossi",
  badge: "UP-001",
  ruolo: "Operatore",
};

// --- DOPO: tipi precisi con union literal e template literal type ------------
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Badge = `UP-${number}`; // vincolo di forma "UP-###" a livello di tipo

interface Dipendente {
  readonly id: number;
  nome: string;
  badge: Badge;
  ruolo: Ruolo;
}

const dip: Dipendente = {
  id: 1,
  nome: "Rossi",
  badge: "UP-001",
  ruolo: "Operatore",
};
// dip.ruolo = "Capo";      // ERRORE TS: "Capo" non e' un Ruolo valido
// dip.badge = "X-001";     // ERRORE TS: non combacia con `UP-${number}`
// dip.id = 2;              // ERRORE TS: id e' readonly

// Validatore runtime al confine (i dati dal DB legacy sono unknown):
function toDipendente(raw: unknown): Dipendente | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const ruoliValidi: Ruolo[] = ["SuperAdmin", "Admin", "Operatore", "QrDisplay"];
  if (
    typeof r.id === "number" &&
    typeof r.nome === "string" &&
    typeof r.badge === "string" &&
    /^UP-\d{3}$/.test(r.badge) &&
    typeof r.ruolo === "string" &&
    (ruoliValidi as string[]).includes(r.ruolo)
  ) {
    return {
      id: r.id,
      nome: r.nome,
      badge: r.badge as Badge,
      ruolo: r.ruolo as Ruolo,
    };
  }
  return null;
}

// ============================================================================
// 7. ESEMPIO PRIMA/DOPO #3 -- callback -> Promise, e i tipi che ne conseguono
// ============================================================================

// --- PRIMA: stile callback JS (nessun tipo sul risultato) -------------------
function caricaRepartoCb(
  id: number,
  cb: (err: TODO_ANY, data: TODO_ANY) => void
): void {
  // simulazione: in JS legacy nessuno sa cosa arriva in "data"
  cb(null, { id, nome: "Stampaggio", turno: "P4" });
}

// --- DOPO: Promise tipizzata + interfaccia esplicita ------------------------
type Turno = "P4" | "P2" | "STD";
interface Reparto {
  id: number;
  nome: string;
  turno: Turno;
}

function caricaReparto(id: number): Promise<Reparto> {
  return Promise.resolve({ id, nome: "Stampaggio", turno: "P4" });
}

async function esempioUso(): Promise<string> {
  const rep = await caricaReparto(3); // tipo: Reparto (niente any)
  return `${rep.nome} - turno ${rep.turno}`;
}
// void esempioUso();

// ============================================================================
// 8. TIPIZZARE LIBRERIE SENZA @types: declare module + shim locali
// ============================================================================
// Se una dipendenza JS non ha tipi, invece di lasciarla any ovunque si crea
// uno "shim" (di solito in un file globals.d.ts). Qui lo mostriamo come mock
// locale: NON e' una vera libreria, e' un'interfaccia inventata nel file.

// NB: mock di Express-like, definito qui dentro (nessun import npm).
interface ReqMock {
  params: Record<string, string>;
}
interface ResMock {
  json(body: unknown): void;
}
type HandlerMock = (req: ReqMock, res: ResMock) => void;

const getDipendente: HandlerMock = (req, res) => {
  const id = Number(req.params.id); // tipo: number
  res.json({ id, nome: "Bianchi" });
};
// getDipendente e' completamente tipizzato pur "usando" una lib finta.

// Sintassi reale del shim (solo commento, si mette in un .d.ts):
/*
  // globals.d.ts
  declare module "vecchia-lib-senza-tipi" {
    export function query(sql: string): Promise<unknown[]>;
  }
*/

// ============================================================================
// 9. STRATEGIA INCREMENTALE PER FILE -- ordine e criteri
// ============================================================================
// Regole pratiche per decidere COSA convertire prima:
//   1. Foglie prima delle radici: converti i moduli SENZA dipendenze interne
//      (utility, costanti, validatori) prima di quelli che li usano.
//   2. Dominio prima dell'IO: tipizza i model (Dipendente, Timbratura) presto:
//      danno il massimo ritorno perche' propagano tipi ovunque.
//   3. Hot path per ultimo o con test: i file critici si convertono con rete
//      di test, non a mano libera.
//   4. Un file per PR: rename .js->.ts + rimozione any, review piccola.

// Metrica di avanzamento: percentuale di file .ts e numero di TODO_ANY residui.
interface StatoMigrazione {
  fileTotali: number;
  fileTs: number;
  debitoAnyResiduo: number; // occorrenze di TODO_ANY
}
function percentualeMigrata(s: StatoMigrazione): number {
  return Math.round((s.fileTs / s.fileTotali) * 100);
}
// percentualeMigrata({ fileTotali: 122, fileTs: 106, debitoAnyResiduo: 14 }); // => 87

// ============================================================================
// 10. LE 3 DIRETTIVE DI SOPPRESSIONE -- quale usare e quando
// ============================================================================
// // @ts-ignore         -> silenzia l'errore sulla riga sotto (NON verifica che
//                          ci sia davvero un errore). Sconsigliato: puo' nascondere
//                          errori nuovi che nascono dopo un refactor.
// // @ts-expect-error   -> silenzia MA fallisce la compilazione se NON c'e' errore.
//                          Preferibile: si "auto-rimuove" quando il bug e' risolto.
// // @ts-nocheck        -> disattiva il check dell'intero file (ultima spiaggia).

// Esempio con @ts-expect-error (il file resta valido perche' l'errore c'e' davvero):
// @ts-expect-error - assegnazione volutamente errata, verra' segnalata da TS
const badgeSbagliato: Badge = 123;
void badgeSbagliato;
// Se un domani "123" diventasse valido, @ts-expect-error stesso darebbe errore
// "Unused '@ts-expect-error' directive": segnala che va rimosso.

// ============================================================================
// 11. any IMPLICITO vs ESPLICITO durante la migrazione
// ============================================================================
// Con noImplicitAny:false gli any impliciti passano (comodo in fase 1).
// Con noImplicitAny:true TS obbliga a tipizzare i parametri: questo e' il
// momento in cui il debito diventa visibile. In --strict qui SIAMO gia' a
// noImplicitAny:true, quindi i parametri devono avere un tipo.

// Implicito (funzionerebbe solo con noImplicitAny:false):
// function somma(a, b) { return a + b; }  // ERRORE TS (strict): 'a','b' any impliciti

// Esplicito (sempre valido): si annota, anche se con any temporaneo.
function sommaTemporanea(a: TODO_ANY, b: TODO_ANY): TODO_ANY {
  return a + b;
}
// Versione ripagata:
function somma(a: number, b: number): number {
  return a + b;
}
void sommaTemporanea;
void somma;

// ============================================================================
// 12. GESTIRE i .json e gli import "misti" durante la transizione
// ============================================================================
// - resolveJsonModule permette import di .json tipizzati automaticamente.
// - esModuleInterop appiana i "default import" da moduli CommonJS legacy.
// Entrambi sono commenti di config: non producono codice qui.
/*
  {
    "compilerOptions": {
      "resolveJsonModule": true,  // import config from "./config.json"
      "esModuleInterop": true     // import express from "express"
    }
  }
*/

// ============================================================================
// 13. MINI FLOW COMPLETO: da .js grezzo a .ts strict (Timbratura)
// ============================================================================

// STEP A (.js originale, concettuale): oggetto libero, nessun tipo.
//   const t = { badge: "UP-001", entrata: "08:00", uscita: "17:00" };

// STEP B (.js con // @ts-check + JSDoc): primi tipi via commento (concettuale).
//   // @typedef {Object} Timbratura ...

// STEP C (.ts con any temporaneo): rename fatto, compila subito.
interface TimbraturaGrezza {
  badge: TODO_ANY;
  entrata: TODO_ANY;
  uscita: TODO_ANY;
}

// STEP D (.ts tipizzato, debito ripagato, invarianti espresse dai tipi):
interface Timbratura {
  badge: Badge;
  entrata: OrarioHHMM; // naive-UTC "HH:MM"
  uscita: OrarioHHMM; // naive-UTC "HH:MM"
}

function durataTurno(t: Timbratura): number {
  return minutiTraOrari(t.entrata, t.uscita);
}

const t1: Timbratura = { badge: "UP-001", entrata: "08:00", uscita: "17:00" };
// durataTurno(t1); // => 540
void durataTurno;
void t1;
void dipLegacy;
void toDipendente;
void parseJsonSicuro;
void importaTimbrature;
void importaTimbratureTipizzato;
void minutiTraOrariJS;
void caricaRepartoCb;
void getDipendente;
void percentualeMigrata;
void isOrarioHHMM;

// ============================================================================
// 14. EXPORT locali (solo simboli definiti in QUESTO file)
// ============================================================================
export {
  minutiTraOrari,
  toDipendente,
  durataTurno,
  percentualeMigrata,
  caricaReparto,
  somma,
};
export type {
  Dipendente,
  Timbratura,
  Reparto,
  Ruolo,
  Turno,
  Badge,
  OrarioHHMM,
  StatoMigrazione,
  DipendenteJS,
  TODO_ANY,
};

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
// - allowJs:true            -> tsc compila anche i .js (progetto misto)
// - checkJs:true            -> tsc type-checka i .js (o // @ts-check per-file)
// - // @ts-check            -> attiva il check su un singolo file .js
// - // @ts-nocheck          -> disattiva il check su un file
// - // @ts-ignore           -> silenzia la riga sotto (rischioso, non verifica)
// - // @ts-expect-error     -> silenzia MA esige che l'errore esista (preferito)
// - JSDoc @param/@typedef   -> tipizzare JS senza sintassi TS, ponte pre-rename
// - noImplicitAny           -> rende visibile il debito (parametri da tipizzare)
// - any temporaneo (TODO_ANY) -> debito di tipo cercabile, da ripagare
// - unknown al confine      -> meglio di any: obbliga al narrowing/validazione
// - declare module          -> shim per librerie JS senza @types
// - resolveJsonModule       -> import .json tipizzati
// - esModuleInterop         -> default import da moduli CommonJS
// - skipLibCheck            -> ignora errori nei .d.ts di terze parti
// - strict off -> on        -> si parte permissivi, si alza a fine migrazione
// - strategia: foglie prima, dominio presto, un file per PR, test sui hot path
// - metrica: % file .ts convertiti + numero di TODO_ANY residui
