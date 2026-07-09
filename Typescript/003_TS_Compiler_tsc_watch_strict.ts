/**
 * 003 - Il compilatore tsc: watch, strict, noEmit, target/module (Fundamentals)
 *
 * Il compilatore ufficiale di TypeScript si chiama `tsc`. Trasforma i file .ts in
 * JavaScript (transpiling) e controlla i tipi (type-checking). In questa lezione
 * vediamo i flag/opzioni piu importanti: `--watch` (ricompila in automatico),
 * `strict` (controlli rigorosi), `--noEmit` (solo check senza generare .js),
 * `target` (versione JS in output) e `module` (sistema di moduli).
 * Tutti gli esempi usano il dominio ERP Polyuretech (badge UP-001, turni P4/P2, ecc.).
 */

// =============================================================================
// 1) tsc BASE: cosa fa il compilatore
// =============================================================================

// tsc legge il codice tipizzato e produce JS. Qui un tipo di dominio e una funzione.
// Compilando con `tsc` genereremmo il file .js corrispondente.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Funzione semplice: TS INFERISCE il tipo di ritorno.
function saluta(nome: string) {
  return `Ciao ${nome}`; // tipo di ritorno inferito: string
}
const messaggio = saluta("Polyuretech"); // tipo: string

// Comando concettuale (in un terminale, NON qui):
//   tsc 003_TS_Compiler_tsc_watch_strict.ts    // genera il .js
//   tsc --noEmit 003_TS_Compiler_tsc_watch_strict.ts  // solo controllo tipi

// =============================================================================
// 2) --noEmit: controlla i tipi SENZA generare output
// =============================================================================

// `--noEmit` e utilissimo in CI/CD e negli hook pre-commit: verifica che il codice
// sia type-safe ma non scrive nessun .js. Spesso abbinato a un bundler (esbuild/vite)
// che si occupa della traspilazione vera e propria.
namespace EsempioNoEmit {
  // Questo compila: tipi coerenti.
  const badge: string = "UP-001";
  const attivo: boolean = true;
  void badge;
  void attivo;

  // Con --noEmit un errore di tipo BLOCCA comunque la build (exit code != 0).
  // ERRORE TS: Type 'number' is not assignable to type 'string'.
  //   const badgeErrato: string = 42;
}

// =============================================================================
// 3) "strict": true - l'insieme di controlli rigorosi
// =============================================================================

// Il flag `"strict": true` nel tsconfig.json attiva in blocco piu opzioni:
//   - strictNullChecks     -> null/undefined sono tipi distinti da gestire
//   - noImplicitAny        -> vietato any implicito
//   - strictFunctionTypes  -> parametri contro-varianti controllati
//   - strictBindCallApply, alwaysStrict, ecc.
// Tutti gli esempi di questo file devono passare con strict:true.

// --- 3a) noImplicitAny -------------------------------------------------------
// Senza tipo esplicito e senza inferenza, un parametro sarebbe `any` implicito.
// ERRORE TS (con noImplicitAny): Parameter 'x' implicitly has an 'any' type.
//   function raddoppia(x) { return x * 2; }

// Corretto: tipo esplicito.
function calcolaOreDoppie(ore: number): number {
  return ore * 2;
}
void calcolaOreDoppie(8); // => 16

// --- 3b) strictNullChecks ----------------------------------------------------
// Un campo `string | null` NON e usabile come string finche non lo controlli.
type Dipendente1 = {
  id: number;
  codiceBadge: string;
  nome: string;
  emailPersonale: string | null; // puo essere null
};

function lunghezzaEmail(d: Dipendente1): number {
  // ERRORE TS: 'd.emailPersonale' is possibly 'null'.
  //   return d.emailPersonale.length;

  // Corretto: narrowing con guardia.
  if (d.emailPersonale === null) return 0;
  return d.emailPersonale.length; // qui il tipo e ristretto a: string
}
void lunghezzaEmail({ id: 1, codiceBadge: "UP-001", nome: "Mario", emailPersonale: null }); // => 0

// --- 3c) optional (?) vs nullable (| null) ----------------------------------
// `emailPersonale?: string` significa "puo mancare" (string | undefined),
// diverso da `| null`. Con strict vanno gestiti entrambi i casi.
type Turno1 = {
  nome: string;
  acronimo?: "P4" | "P2" | "STD"; // opzionale: puo essere undefined
  ingresso: string; // "08:00"
};
function etichettaTurno(t: Turno1): string {
  // `t.acronimo` e "P4" | "P2" | "STD" | undefined -> uso il fallback.
  return t.acronimo ?? "N/D"; // nullish coalescing
}
void etichettaTurno({ nome: "Giornaliero", ingresso: "08:00" }); // => "N/D"

// =============================================================================
// 4) target - quale versione di JavaScript viene generata
// =============================================================================

// `target` decide la sintassi JS emessa (es. ES2015, ES2020, ES2022...).
// Con target basso, feature moderne vengono "trascritte" (down-leveled).
// Con target alto, restano native (output piu piccolo/leggibile).
namespace EsempioTarget {
  // Optional chaining e nullish: nativi da ES2020 in su.
  type Reparto1 = { sigla: string; label: string | null };
  function siglaReparto(r: Reparto1 | undefined): string {
    return r?.sigla ?? "??"; // con target vecchio verrebbe espanso in if annidati
  }
  void siglaReparto(undefined); // => "??"

  // `Object.hasOwn` richiede lib/target ES2022: qui siamo su ES2022, quindi OK.
  const conf: Record<string, number> = { P4: 4, P2: 2 };
  const haP4 = Object.hasOwn(conf, "P4"); // tipo: boolean
  void haP4; // => true
}

// =============================================================================
// 5) lib - quali API di runtime sono disponibili per il type-checker
// =============================================================================

// `lib` elenca le librerie di tipi disponibili (es. ES2022, DOM).
// Qui compiliamo con lib: ["ES2022", "DOM"].

// --- 5a) API ES2022 (ambiente qualsiasi) ------------------------------------
// `.at()` sugli array richiede ES2022.
const orari = ["08:00", "12:00", "13:00", "17:00"];
const ultimoOrario = orari.at(-1); // tipo: string | undefined
void ultimoOrario; // => "17:00"

// --- 5b) API DOM (solo browser) ---------------------------------------------
// Esempio browser: `document`/`window` esistono solo grazie a lib "DOM".
// La funzione NON viene chiamata qui: serve solo a mostrare che i tipi esistono.
function evidenziaBadgeNelDom(badge: string): void {
  // Esempio browser
  const el = document.getElementById("badge"); // tipo: HTMLElement | null
  if (el) {
    el.textContent = badge; // ok: el ristretto a HTMLElement
  }
}
void evidenziaBadgeNelDom; // referenziata ma non eseguita

// =============================================================================
// 6) module - il sistema di moduli dell'output
// =============================================================================

// `module` (es. ESNext, CommonJS, NodeNext) decide come vengono emessi
// import/export. IMPORTANTE: importa/esporta SOLO simboli di QUESTO file.

// Un export locale valido (nessun altro file coinvolto):
export const VERSIONE_MODULO = "1.0.0"; // tipo: string
export type BadgeFormato = `${string}-${string}`; // template literal type

// Un badge tipizzato come template literal:
const badgeEsempio: BadgeFormato = "UP-001"; // ok
void badgeEsempio;

// ERRORE TS: import da un ALTRO file del corso NON e permesso in questi esempi.
//   import { qualcosa } from "./002_TS_Types";  // vietato per file autonomi

// =============================================================================
// 7) tsconfig.json - dove vivono queste opzioni (esempio commentato)
// =============================================================================

// In un progetto reale i flag stanno nel tsconfig.json, non sulla riga di comando:
/*
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noEmit": true,
    "experimentalDecorators": false,
    "skipLibCheck": true
  },
  "include": ["**\/*.ts"]
}
*/
// Poi basta lanciare `tsc` (senza argomenti) e legge il tsconfig automaticamente,
// oppure `tsc --watch` per la ricompilazione continua.

// =============================================================================
// 8) --watch - ricompilazione automatica ad ogni salvataggio
// =============================================================================

// `tsc --watch` (o `-w`) resta in ascolto: ad ogni salvataggio di un .ts
// ricompila SOLO cio che serve e ristampa gli errori. Ideale in sviluppo.
//   tsc --watch --noEmit    // controllo continuo dei tipi, senza generare .js
//
// Esempio: se salvassimo questa funzione con un errore, il watcher lo segnalerebbe
// subito nel terminale, senza rilanciare il comando a mano.
function timeStringToMinutes(value: string): number | null {
  const text = String(value ?? "").trim();
  if (!/^\d{2}:\d{2}$/.test(text)) return null; // regex reale HH:MM
  const [h, m] = text.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m; // "08:00" => 480
}
void timeStringToMinutes("08:00"); // => 480
void timeStringToMinutes("99:99"); // => null

// =============================================================================
// 9) Combinare i flag: pipeline tipica ERP
// =============================================================================

// In produzione (VM Polyuretech) una pipeline comune e:
//   1. tsc --noEmit          -> type-check severo (blocca il deploy se fallisce)
//   2. bundler (vite/esbuild) -> traspila e ottimizza il JS finale
// Cosi TS fa da "guardia dei tipi" e il bundler fa da compilatore veloce.

// Esempio di funzione che il type-check protegge: generazione badge SIGLA-NNN.
function generaBadge(sigla: string, progressivoAttuale: number): BadgeFormato {
  const progressivo = String(progressivoAttuale + 1).padStart(3, "0"); // "001"
  return `${sigla.toUpperCase()}-${progressivo}`; // "UP-001"
}
const nuovoBadge = generaBadge("up", 0); // tipo: BadgeFormato => "UP-001"
void nuovoBadge;

// =============================================================================
// 10) Decorator stage-3 (nativi, senza experimentalDecorators)
// =============================================================================

// TS 5.x supporta i decorator standard (stage-3) SENZA experimentalDecorators.
// Usano un secondo parametro `context` tipizzato. Esempio COMMENTATO per sicurezza
// (il target/emit dei decorator dipende dalla configurazione dell'ambiente):
/*
function logChiamata(
  metodo: (this: unknown, ...args: unknown[]) => unknown,
  context: ClassMethodDecoratorContext
) {
  return function (this: unknown, ...args: unknown[]) {
    console.log(`chiamato ${String(context.name)}`);
    return metodo.apply(this, args);
  };
}

class GestioneTurni {
  @logChiamata
  assegna(acronimo: "P4" | "P2" | "STD") {
    return acronimo;
  }
}
*/
// Nota: con `experimentalDecorators: false` NON si usa la vecchia sintassi
// `context: any` / reflect-metadata: si usa la firma stage-3 mostrata sopra.

// =============================================================================
// 11) strict e i tipi "allargati" (anti-pattern da evitare)
// =============================================================================

// Con strict scopriamo subito le union "allargate" che vanificano il type-check.
type StatoRichiesta = "In attesa" | "Approvato" | "Rifiutato";

// Anti-pattern: `StatoRichiesta | string` collassa tutto su `string`.
// ERRORE concettuale (non di compilazione): l'autocompletamento e i check si perdono.
type StatoAllargato = StatoRichiesta | string; // == string (union assorbita)
const statoLibero: StatoAllargato = "qualsiasi cosa"; // compila, ma nessun controllo
void statoLibero;

// Meglio: mantenere l'union stretta, cosi strict segnala i valori errati.
function descriviStato(s: StatoRichiesta): string {
  switch (s) {
    case "In attesa": return "In lavorazione";
    case "Approvato": return "OK";
    case "Rifiutato": return "Negato";
    // niente default: TS verifica l'esaustivita dei casi
  }
}
void descriviStato("Approvato"); // => "OK"

// =============================================================================
// RIEPILOGO COMANDI / CONCETTI
// =============================================================================
/*
  tsc file.ts              -> compila un file in JS
  tsc                      -> compila usando tsconfig.json
  tsc --watch (-w)         -> ricompila automaticamente ad ogni salvataggio
  tsc --noEmit             -> controlla i tipi SENZA generare .js (CI, pre-commit)
  tsc --init               -> crea un tsconfig.json di partenza

  tsconfig -> compilerOptions:
    "strict": true         -> attiva strictNullChecks + noImplicitAny + ...
    "target": "ES2022"     -> versione JS emessa (feature moderne native se alto)
    "module": "ESNext"     -> sistema di moduli (import/export) in output
    "lib": ["ES2022","DOM"]-> quali API sono note al type-checker
    "noEmit": true         -> nessun output, solo type-check
    "experimentalDecorators": false -> usa i decorator stage-3 nativi

  Regole strict ricordate:
    - niente any implicito (tipizza i parametri)
    - null/undefined vanno gestiti con narrowing (if / ?? / ?.)
    - optional (?) = "| undefined", diverso da "| null"
    - union strette > "| string" (che assorbe e disattiva i controlli)

  Pipeline tipica: tsc --noEmit (guardia tipi) + bundler (trasp. veloce).
*/
