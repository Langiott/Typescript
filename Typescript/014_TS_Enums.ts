/**
 * 014_TS_Enums.ts
 * File 14 del corso TypeScript - Argomento: Enums
 * Gli enum permettono di dare un nome ad un insieme di costanti correlate.
 * TS supporta numeric enum, string enum e const enum, con comportamenti diversi.
 * Vediamo pro e contro, il reverse mapping, l'uso come tipo e l'alternativa
 * moderna spesso preferita: le union di literal type. Dominio ERP Polyuretech.
 */

// ============================================================
// 1. NUMERIC ENUM
// ============================================================

// Enum numerico: se non assegni valori, parte da 0 e incrementa di 1.
enum Direzione {
  Su,     // 0
  Giu,    // 1
  Sinistra, // 2
  Destra, // 3
}

const d: Direzione = Direzione.Su;
// console.log(d); // => 0  (a runtime e' un numero)

// Puoi impostare il valore iniziale: gli altri seguono incrementando.
enum CodiceErrore {
  Sconosciuto = 100,
  NonTrovato,     // 101
  NonAutorizzato, // 102
  Timeout,        // 103
}

const err = CodiceErrore.NonTrovato;
// tipo: CodiceErrore  =>  101

// Puoi anche assegnare valori espliciti a ciascun membro.
enum PrioritaTask {
  Bassa = 1,
  Media = 5,
  Alta = 10,
}

// I membri "auto" dopo un valore esplicito riprendono l'incremento.
enum Misto {
  A = 3,
  B,      // 4
  C = 10,
  D,      // 11
}

// ============================================================
// 2. REVERSE MAPPING (solo NUMERIC enum)
// ============================================================

// Gli enum numerici generano una mappa bidirezionale:
// nome -> valore  e  valore -> nome.
enum Livello {
  Info,     // 0
  Warning,  // 1
  Error,    // 2
}

const nomeLivello = Livello[1];    // tipo: string   => "Warning"
const valLivello = Livello.Error;  // tipo: Livello  => 2
const rev = Livello[valLivello];   // => "Error"

// A runtime l'oggetto e' circa cosi':
// { 0: "Info", 1: "Warning", 2: "Error",
//   Info: 0, Warning: 1, Error: 2 }

// ATTENZIONE: il reverse mapping esiste SOLO per enum numerici.
// Gli string enum NON generano la mappa inversa (vedi sotto).

// ============================================================
// 3. STRING ENUM
// ============================================================

// Ogni membro deve avere un valore stringa esplicito (niente auto-incremento).
// Vantaggio: a runtime i valori sono leggibili (utili in log, DB, JSON).
enum Ruolo {
  SuperAdmin = "SuperAdmin",
  Admin = "Admin",
  Operatore = "Operatore",
  QrDisplay = "QrDisplay",
}

const r: Ruolo = Ruolo.Operatore;
// tipo: Ruolo  =>  "Operatore"  (stringa leggibile a runtime)

// Gli string enum NON hanno reverse mapping:
// ERRORE TS: Property '"Operatore"' does not exist on type 'typeof Ruolo'.
// const inverso = Ruolo["Operatore"]; // funziona come lookup nome->valore, ma...
// il lookup valore->nome NON esiste:
// ERRORE TS: nessun membro numerico da usare come indice inverso.

// StatoRichiesta ERP come string enum: valori pronti per il DB.
enum StatoRichiesta {
  Bozza = "BOZZA",
  Inviata = "INVIATA",
  Approvata = "APPROVATA",
  Rifiutata = "RIFIUTATA",
}

const statoDb: string = StatoRichiesta.Approvata; // => "APPROVATA"

// Reparto ERP come string enum.
enum Reparto {
  Produzione = "PRODUZIONE",
  Magazzino = "MAGAZZINO",
  Qualita = "QUALITA",
  Uffici = "UFFICI",
}

// ============================================================
// 4. ENUM COME TIPO
// ============================================================

// Il nome dell'enum funziona sia come valore (namespace) sia come TIPO.
interface Dipendente {
  id: number;
  nome: string;
  badge: string;   // formato "UP-001", regola /^UP-\d{3}$/
  ruolo: Ruolo;    // il tipo e' l'enum stesso
  reparto: Reparto;
}

const mario: Dipendente = {
  id: 1,
  nome: "Mario Rossi",
  badge: "UP-001",
  ruolo: Ruolo.Operatore,
  reparto: Reparto.Produzione,
};

// Solo i membri dell'enum sono ammessi come valore del tipo.
// ERRORE TS: Type '"CapoReparto"' is not assignable to type 'Ruolo'.
// const x: Ruolo = "CapoReparto";

// Funzione che accetta e restituisce un enum come tipo.
function puoApprovare(ruolo: Ruolo): boolean {
  return ruolo === Ruolo.Admin || ruolo === Ruolo.SuperAdmin;
}

// puoApprovare(Ruolo.Operatore); // => false
// puoApprovare(Ruolo.SuperAdmin); // => true

// Enum numerico come tipo in una richiesta di ferie.
interface RichiestaFerie {
  dipendenteId: number;
  priorita: PrioritaTask;
  stato: StatoRichiesta;
}

const richiesta: RichiestaFerie = {
  dipendenteId: 1,
  priorita: PrioritaTask.Media,
  stato: StatoRichiesta.Inviata,
};

// ============================================================
// 5. ITERARE SUGLI ENUM
// ============================================================

// String enum: Object.values da' direttamente i valori stringa.
const tuttiIRuoli: string[] = Object.values(Ruolo);
// => ["SuperAdmin", "Admin", "Operatore", "QrDisplay"]

const tuttiGliStati = Object.values(StatoRichiesta);
// => ["BOZZA", "INVIATA", "APPROVATA", "RIFIUTATA"]

// Numeric enum: Object.values contiene SIA nomi SIA numeri (per il reverse map).
// Va filtrato se vuoi solo i numeri.
const rawLivelli = Object.values(Livello);
// => ["Info", "Warning", "Error", 0, 1, 2]
const soloNumeri = Object.values(Livello).filter(
  (v): v is number => typeof v === "number"
);
// => [0, 1, 2]

// I nomi (chiavi) di un numeric enum:
const nomiLivelli = Object.keys(Livello).filter((k) => isNaN(Number(k)));
// => ["Info", "Warning", "Error"]

// ============================================================
// 6. CONST ENUM (e perche' e' problematico)
// ============================================================

// Un const enum viene "inlined" dal compiler: a runtime NON esiste
// nessun oggetto, ogni riferimento e' sostituito col valore letterale.
const enum Turno {
  Standard = "STD",
  P2 = "P2",
  P4 = "P4",
}

const turnoCorrente = Turno.P4;
// Dopo la compilazione diventa letteralmente: const turnoCorrente = "P4";

// VANTAGGIO: zero overhead, nessun codice generato.
// PROBLEMI del const enum:
//  1) NON esiste a runtime: non puoi fare Object.values(Turno) / iterarlo.
//     ERRORE TS: 'const' enums can only be used in property or index access...
//     // const listaTurni = Object.values(Turno);
//  2) Con isolatedModules (usato da Babel/esbuild/Vite/ts-node) i const enum
//     NON sono supportati o si comportano male: l'inlining cross-file salta.
//  3) Il codice che li importa da altri moduli si rompe se il .d.ts cambia:
//     l'inlining "cementa" i valori nei consumer gia' compilati.
//  4) Difficile da debuggare: nei sorgenti compilati sparisce il nome simbolico.
// Per questi motivi in molti progetti (e nelle linee guida TS moderne) i
// const enum sono SCONSIGLIATI. Preferire string enum normali o union di literal.

// ============================================================
// 7. ENUM CON MEMBRI COMPUTED e CONST
// ============================================================

// I membri di un enum possono essere "constant" (calcolabili a compile-time)
// oppure "computed" (calcolati a runtime).
enum FileAccess {
  None = 0,
  Read = 1 << 1,   // 2  (constant: espressione bit-a-bit)
  Write = 1 << 2,  // 4
  ReadWrite = Read | Write, // 6
}

// Membro computed: usa una chiamata a funzione (valutata a runtime).
function lunghezza(s: string): number {
  return s.length;
}

enum Computed {
  A = 1,
  B = lunghezza("badge"), // 5  (computed member)
}

// Regola: dopo un membro computed, i successivi NON possono usare auto-increment.
// ERRORE TS: Enum member must have initializer (se mettessi un membro "auto" dopo B).

// ============================================================
// 8. ALTERNATIVA: UNION DI LITERAL TYPE (spesso preferita)
// ============================================================

// Invece di un enum si puo' usare una union di string literal.
// Vantaggi: zero codice generato a runtime, tree-shaking perfetto,
// nessun oggetto extra, e i valori sono gia' delle semplici stringhe.
type RuoloUnion = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

const ru: RuoloUnion = "Admin";
// ERRORE TS: Type '"Guest"' is not assignable to type 'RuoloUnion'.
// const ru2: RuoloUnion = "Guest";

// Pattern idiomatico: oggetto "as const" + type derivato.
// Ottieni sia i valori a runtime SIA il tipo, senza le stranezze degli enum.
const STATO_RICHIESTA = {
  Bozza: "BOZZA",
  Inviata: "INVIATA",
  Approvata: "APPROVATA",
  Rifiutata: "RIFIUTATA",
} as const;

// Tipo derivato dai valori dell'oggetto: "BOZZA" | "INVIATA" | "APPROVATA" | "RIFIUTATA"
type StatoRichiestaUnion =
  (typeof STATO_RICHIESTA)[keyof typeof STATO_RICHIESTA];

const s2: StatoRichiestaUnion = "APPROVATA";
// Iterazione naturale sui valori:
const statiUnion = Object.values(STATO_RICHIESTA);
// => ["BOZZA", "INVIATA", "APPROVATA", "RIFIUTATA"]

// Union di literal per i turni ERP (niente const enum problematico).
type TurnoUnion = "STD" | "P2" | "P4";

function descriviTurno(t: TurnoUnion): string {
  switch (t) {
    case "STD":
      return "Turno standard";
    case "P2":
      return "Turno P2";
    case "P4":
      return "Turno P4";
    // Il compiler garantisce l'esaustivita': se aggiungi un turno alla union
    // e dimentichi il case, scatta un errore su questo default (exhaustiveness).
    default: {
      const _exhaustive: never = t;
      return _exhaustive;
    }
  }
}

// descriviTurno("P4"); // => "Turno P4"

// ============================================================
// 9. QUANDO USARE COSA (regola pratica)
// ============================================================

// - String enum:    quando vuoi un namespace + valori leggibili nel DB/log
//                   e ti fa comodo scrivere Ruolo.Admin.
// - Numeric enum:   raramente; utile se serve reverse mapping o flag bit-a-bit.
// - const enum:     tendenzialmente EVITARE (problemi con bundler/isolatedModules).
// - Union literal:  default moderno per set chiusi di stringhe, zero overhead.
// - as const + type: quando vuoi ANCHE i valori iterabili a runtime.

// Esempio comparativo: stessa funzione, tre firme diverse.
function saluta1(rr: Ruolo): string {
  return `Ciao ${rr}`;
}
function saluta2(rr: RuoloUnion): string {
  return `Ciao ${rr}`;
}
// saluta1(Ruolo.Admin);  // enum
// saluta2("Admin");      // union: piu' leggero, nessun import di simbolo runtime

// ============================================================
// 10. EXPORT DEI SIMBOLI DI QUESTO FILE
// ============================================================

export {
  Direzione,
  CodiceErrore,
  PrioritaTask,
  Livello,
  Ruolo,
  StatoRichiesta,
  Reparto,
  FileAccess,
  puoApprovare,
  descriviTurno,
  STATO_RICHIESTA,
  saluta1,
  saluta2,
};

export type {
  Dipendente,
  RichiestaFerie,
  RuoloUnion,
  StatoRichiestaUnion,
  TurnoUnion,
};

/*
 * ============================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================
 * - enum numerico: valori auto da 0, +1; puoi fissare l'inizio o ogni membro.
 * - reverse mapping: SOLO numeric enum -> Enum[valore] restituisce il nome.
 * - string enum: valori stringa espliciti, leggibili a runtime, NO reverse map.
 * - enum come tipo: il nome dell'enum e' sia namespace sia type annotation.
 * - Object.values(stringEnum) -> valori; Object.values(numEnum) -> nomi+numeri.
 * - filtra con typeof v === "number" per i soli valori numerici.
 * - const enum: inlined, zero runtime, MA problemi con isolatedModules/bundler -> evitare.
 * - membri constant vs computed: dopo un computed niente auto-increment.
 * - flag bit-a-bit: enum numerico con 1<<n e operatori | & .
 * - ALTERNATIVA: union di string literal ("A" | "B") -> zero overhead.
 * - pattern as const: oggetto + type (typeof O)[keyof typeof O] = valori + tipo.
 * - exhaustiveness check con never nel default dello switch.
 * - regola: preferire union literal / as const; string enum se serve namespace.
 */
