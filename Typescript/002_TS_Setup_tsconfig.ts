/**
 * 002 - Setup progetto e tsconfig.json: opzioni principali (Fundamentals)
 *
 * In questa lezione vediamo come si imposta un progetto TypeScript e quali sono
 * le opzioni piu importanti del file "tsconfig.json" (target, lib, module,
 * strict, moduleResolution, ecc.). Gli esempi usano il dominio ERP Polyuretech
 * (Dipendente, Timbratura, badge UP-001, turni P4/P2, orari "HH:MM").
 * Il file compila da solo con "tsc --noEmit" sotto strict:true, target ES2022.
 */

// =============================================================================
// 1. COS'E' tsconfig.json E COME SI CREA
// =============================================================================
//
// Il file "tsconfig.json" sta nella root del progetto e dice al compilatore
// (tsc) COME compilare. Si genera con:
//
//   tsc --init
//
// Struttura minima di un tsconfig.json (questo e' JSON, mostrato come commento):
//
//   {
//     "compilerOptions": {
//       "target": "ES2022",
//       "module": "ESNext",
//       "moduleResolution": "Bundler",
//       "lib": ["ES2022", "DOM"],
//       "strict": true,
//       "esModuleInterop": true,
//       "skipLibCheck": true,
//       "forceConsistentCasingInFileNames": true,
//       "noEmit": true,
//       "outDir": "./dist",
//       "rootDir": "./src"
//     },
//     "include": ["src/**/*.ts"],
//     "exclude": ["node_modules", "dist"]
//   }
//
// "include"/"exclude" scelgono QUALI file compilare; "compilerOptions" dice COME.

// =============================================================================
// 2. target: quale versione JavaScript viene emessa
// =============================================================================
namespace TargetDemo {
  // target: ES2022 significa che il JS generato puo' usare feature ES2022
  // (es. class fields, "at()", Error.cause). Esempio: class field nativo.
  class Dipendente1 {
    // Class field (ES2022): niente "this.codiceBadge =" nel costruttore.
    codiceBadge = "UP-001";
    archiviato = false;
  }
  const d = new Dipendente1();
  const badge = d.codiceBadge; // tipo: string, => "UP-001"
  void badge;

  // "at()" e' disponibile con target/lib ES2022:
  const badges = ["UP-001", "UI-001", "CO-003"];
  const ultimo = badges.at(-1); // tipo: string | undefined, => "CO-003"
  void ultimo;
}

// =============================================================================
// 3. lib: quali API sono disponibili (ES2022, DOM, ...)
// =============================================================================
namespace LibDemo {
  // Con lib ["ES2022"] hai i tipi del linguaggio. Esempio: Object.hasOwn (ES2022).
  const turno = { acronimo: "P4", ingresso: "08:00" };
  const haAcronimo = Object.hasOwn(turno, "acronimo"); // tipo: boolean, => true
  void haAcronimo;

  // Con lib ["DOM"] hai i tipi del browser (document, window, HTMLElement...).
  // Esempio browser: funzione NON chiamata, serve solo a mostrare i tipi DOM.
  function mostraBadgeInPagina(badge: string): void {
    // "document" esiste come tipo grazie a lib "DOM".
    const el = document.getElementById("badge"); // tipo: HTMLElement | null
    if (el) el.textContent = badge; // narrowing: qui el e' HTMLElement
  }
  void mostraBadgeInPagina;

  // Se togli "DOM" dalla lib, "document" darebbe:
  // ERRORE TS: Cannot find name 'document'.
}

// =============================================================================
// 4. strict: true - il gruppo di opzioni piu importante
// =============================================================================
//
// "strict": true attiva in blocco: noImplicitAny, strictNullChecks,
// strictFunctionTypes, strictBindCallApply, strictPropertyInitialization,
// noImplicitThis, useUnknownInCatchVariables, alwaysStrict.

namespace StrictDemo {
  // --- noImplicitAny ---
  // Senza tipo, un parametro sarebbe "any" implicito: vietato in strict.
  // ERRORE TS: Parameter 'v' implicitly has an 'any' type.
  //   function siglaDa(v) { return v.toUpperCase(); }
  // Corretto: annota il tipo.
  function siglaDa(v: string): string {
    return v.toUpperCase();
  }
  const sigla = siglaDa("up"); // tipo: string, => "UP"
  void sigla;

  // --- strictNullChecks ---
  // "string | null" NON e' assegnabile a "string" senza controllo.
  function leggiEmailPersonale(): string | null {
    return null; // in un caso reale arriverebbe dal DB (puo' essere null)
  }
  const emailPersonale = leggiEmailPersonale(); // tipo: string | null
  // ERRORE TS: 'emailPersonale' is possibly 'null'.
  //   const dominio = emailPersonale.split("@")[1];
  // Corretto: gestisci il null (narrowing).
  const dominio = emailPersonale ? emailPersonale.split("@")[1] : "-";
  void dominio; // tipo: string

  // --- strictPropertyInitialization ---
  // Ogni property deve essere inizializzata (o marcata come opzionale / "!").
  class Reparto1 {
    nome: string;
    attivo: boolean;
    constructor(nome: string) {
      this.nome = nome; // inizializzata: ok
      this.attivo = true;
    }
    // ERRORE TS: Property 'x' has no initializer... se dichiarassimo "x: number;"
  }
  void new Reparto1("Colatura");
}

// =============================================================================
// 5. module e moduleResolution: come si risolvono gli import
// =============================================================================
//
// "module": "ESNext" -> usa import/export nativi (ES Modules).
// "moduleResolution": "Bundler" -> risoluzione moderna (Vite/esbuild).
// In questo file gli export si riferiscono a simboli definiti QUI (file autonomo).

// Esempio di export locale (module):
export type StatoRichiesta = "In attesa" | "Approvato" | "Rifiutato";

export function prossimoBadge(sigla: string, max: number): string {
  const progressivo = String(max + 1).padStart(3, "0");
  return `${sigla.toUpperCase()}-${progressivo}`;
}
// Uso interno: prossimoBadge("UP", 0) => "UP-001"
const primoBadge = prossimoBadge("UP", 0); // => "UP-001"
void primoBadge;

// Con esModuleInterop:true puoi usare "import x from '...'" anche con moduli
// CommonJS. Serve tipicamente quando importi librerie npm (qui NON usate).

// =============================================================================
// 6. outDir / rootDir / noEmit
// =============================================================================
//
// rootDir: cartella dei sorgenti (es. "./src").
// outDir : dove finisce il JS compilato (es. "./dist").
// noEmit : se true, tsc controlla i tipi ma NON scrive file .js
//          (usato quando la build vera la fa un bundler come Vite/esbuild).
//
// Comando tipico di solo type-check:  tsc --noEmit

// =============================================================================
// 7. Un tipo di dominio completo per fissare le idee
// =============================================================================
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

interface Dipendente2 {
  id: number;
  codiceBadge: string;        // "UP-001"
  nome: string;
  cognome: string;
  email: string;
  emailPersonale: string | null;
  archiviato: boolean;
  ruolo: Ruolo;
  tipologia: string;          // reparto, es. "Colatura"
}

const mario: Dipendente2 = {
  id: 1,
  codiceBadge: "UP-001",
  nome: "Mario",
  cognome: "Rossi",
  email: "mario.rossi@polyuretech.com",
  emailPersonale: null,
  archiviato: false,
  ruolo: "Operatore",
  tipologia: "Colatura",
};
// mario.ruolo e' vincolato: solo i 4 valori di Ruolo sono ammessi.
// ERRORE TS: Type '"Ospite"' is not assignable to type 'Ruolo'.
//   const r: Ruolo = "Ospite";

// =============================================================================
// 8. Opzioni utili aggiuntive (spiegate a parole)
// =============================================================================
//
// - "skipLibCheck": true      -> non type-checka i .d.ts delle dipendenze (build piu' veloce).
// - "forceConsistentCasingInFileNames": true -> import case-sensitive (utile su Linux/prod).
// - "resolveJsonModule": true -> permette import di file .json come moduli tipizzati.
// - "sourceMap": true         -> genera .map per il debug del TS originale.
// - "noUnusedLocals"/"noUnusedParameters": segnalano variabili/parametri non usati.
// - "declaration": true       -> emette i file .d.ts (per pubblicare una libreria).
// - "paths"/"baseUrl"         -> alias di import (es. "@/utils" -> "src/utils").

// Esempio "resolveJsonModule" (concettuale, mostrato come commento):
//   import config from "./config.json"; // tipizzato in automatico

// =============================================================================
// 9. Verifica pratica: una funzione di dominio type-safe
// =============================================================================
// Converte un orario "HH:MM" in minuti; ritorna null se non valido.
// Sotto strict:true il "| null" ci obbliga a gestire il caso non valido.
function timeStringToMinutes(value: string): number | null {
  const text = String(value ?? "").trim();
  if (!/^\d{2}:\d{2}$/.test(text)) return null;
  const [h, m] = text.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

const minutiIngresso = timeStringToMinutes("08:00"); // tipo: number | null, => 480
// strictNullChecks ci costringe a controllare:
if (minutiIngresso !== null) {
  const ore = Math.floor(minutiIngresso / 60); // => 8
  void ore;
}
const minutiErrato = timeStringToMinutes("25:99"); // => null
void minutiErrato;

// =============================================================================
// 10. useUnknownInCatchVariables (parte di strict)
// =============================================================================
namespace CatchDemo {
  function parsaTurno(raw: string): string {
    try {
      if (!raw) throw new Error("acronimo turno mancante");
      return raw.toUpperCase(); // "P4"
    } catch (err) {
      // Con strict, "err" e' di tipo "unknown" (non "any"): va ristretto.
      // ERRORE TS: 'err' is of type 'unknown'.  -> se facessi err.message diretto
      const messaggio = err instanceof Error ? err.message : String(err);
      return `Errore: ${messaggio}`;
    }
  }
  void parsaTurno("p4");
}

// =============================================================================
// 11. Nota su Node/process e sui decorator
// =============================================================================
//
// I tipi di Node (process, Buffer, ...) NON sono inclusi da lib. Se ti servono
// va installato "@types/node". Qui li simuliamo con un declare per non dipendere
// da pacchetti esterni:
declare const process: { env: Record<string, string | undefined> };
const dbUrl = process.env["DATABASE_URL"] ?? "sqlite://locale.db";
void dbUrl; // tipo: string

// Decorator: da TS 5.x i decorator standard (stage-3) funzionano SENZA
// "experimentalDecorators". Esempio mostrato come commento per sicurezza:
//
//   function log<T>(_v: T, ctx: ClassMethodDecoratorContext) {
//     return _v; // un decorator di metodo riceve valore + context
//   }
//   class ServizioTimbrature {
//     @log timbra(badge: string) { return `timbrato ${badge}`; }
//   }
//
// Con "experimentalDecorators": false si usa questa forma; con true si usa la
// vecchia sintassi (reflect-metadata). Per un progetto nuovo: stage-3 (false).

// =============================================================================
// RIEPILOGO COMANDI / CONCETTI (ripasso veloce)
// =============================================================================
//  - tsc --init            : genera un tsconfig.json di base.
//  - tsc --noEmit          : type-check senza emettere JS (build fatta dal bundler).
//  - target                : versione JS emessa (es. ES2022 -> class fields, at()).
//  - lib                   : API disponibili (ES2022 = linguaggio, DOM = browser).
//  - module / moduleResolution : ESNext + Bundler per progetti moderni.
//  - strict: true          : attiva noImplicitAny, strictNullChecks, ecc.
//  - strictNullChecks      : null/undefined vanno gestiti (narrowing).
//  - strictPropertyInitialization : ogni property va inizializzata.
//  - useUnknownInCatchVariables   : "catch (err)" -> err e' unknown.
//  - rootDir / outDir      : sorgenti vs output compilato.
//  - skipLibCheck          : salta il check dei .d.ts (piu' veloce).
//  - forceConsistentCasingInFileNames : import case-sensitive (safe su Linux).
//  - resolveJsonModule     : import di .json tipizzati.
//  - paths / baseUrl       : alias di import (@/...).
//  - @types/node           : serve per process/Buffer (qui simulati con declare).
//  - decorator             : da TS 5.x stage-3, experimentalDecorators:false.
