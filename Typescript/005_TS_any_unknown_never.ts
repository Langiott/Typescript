/**
 * 005 - any, unknown, never: differenze e quando usarli (Fundamentals)
 *
 * In questo file vediamo i tre "top/bottom type" di TypeScript:
 *  - `any`     -> spegne il type checker (usalo il meno possibile);
 *  - `unknown` -> alternativa sicura ad any: prima di usarlo devi fare narrowing;
 *  - `never`   -> il tipo "impossibile": nessun valore, usato per exhaustiveness.
 * Esempi basati sul dominio ERP Polyuretech (badge UP-001, turni P4/P2, Timbratura).
 */

// ===========================================================================
// 0) Tipi di dominio condivisi (riusati negli esempi sotto)
// ===========================================================================

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type StatoRichiesta = "In attesa" | "Approvato" | "Rifiutato";

type Dipendente = {
  id: number;
  codiceBadge: string; // "UP-001"
  nome: string;
  cognome: string;
  ruolo: Ruolo;
};

const mario: Dipendente = {
  id: 1,
  codiceBadge: "UP-001",
  nome: "Mario",
  cognome: "Rossi",
  ruolo: "Operatore",
};

// ===========================================================================
// 1) any: il tipo che "disattiva" i controlli
// ===========================================================================
namespace EsempiAny {
  // Con `any` puoi fare qualsiasi cosa: TS non ti protegge piu.
  let qualsiasi: any = "UP-001";
  qualsiasi = 42; // ok
  qualsiasi = { turno: "P4" }; // ok
  qualsiasi.metodoInesistente(); // nessun errore in compilazione (ma crasha a runtime!)

  // any si "propaga" e contagia: il risultato resta any.
  const lunghezza = qualsiasi.length; // tipo: any (nessun controllo)

  // Assegnare any a un tipo preciso NON da errore -> pericoloso.
  const badge: string = qualsiasi; // ok per TS, ma potrebbe essere un numero!

  // Un parametro senza tipo, sotto "strict", NON e any implicito: da errore.
  // ERRORE TS: Parameter 'x' implicitly has an 'any' type.
  // function stampa(x) { return x; }

  void lunghezza;
  void badge;
}

// ===========================================================================
// 2) unknown: come any ma SICURO (devi restringere prima di usare)
// ===========================================================================
namespace EsempiUnknown {
  // Puoi assegnare QUALSIASI valore a unknown (come any).
  let valore: unknown = "12:30";
  valore = 750;
  valore = { ingresso: "08:00" };

  // MA non puoi usarlo direttamente senza narrowing.
  // ERRORE TS: 'valore' is of type 'unknown'.
  // const lung = valore.length;

  // ERRORE TS: Type 'unknown' is not assignable to type 'string'.
  // const orario: string = valore;

  // Per usarlo devi RESTRINGERE il tipo (narrowing) con typeof / instanceof / guard.
  function lunghezzaSicura(v: unknown): number {
    if (typeof v === "string") {
      // qui v e string
      return v.length; // tipo: number
    }
    return 0;
  }

  // => 5  (dopo il narrowing v e trattato come string)
  const esito = lunghezzaSicura("UP-001");
  void esito;
}

// ===========================================================================
// 3) never: il tipo "impossibile" (nessun valore lo abita)
// ===========================================================================
namespace EsempiNever {
  // Una funzione che non ritorna MAI (lancia sempre) ha ritorno `never`.
  function erroreFatale(msg: string): never {
    throw new Error(msg);
  }

  // Anche un loop infinito ha tipo never.
  function ciclaPerSempre(): never {
    while (true) {
      /* ... */
    }
  }

  // never e sottotipo di TUTTO: assegnabile a qualsiasi cosa.
  const orario: string = erroreFatale("mai raggiunto"); // ok (never -> string)

  // NIENTE e assegnabile a never (tranne never stesso).
  // ERRORE TS: Type 'string' is not assignable to type 'never'.
  // const x: never = "UP-001";

  void orario;
  void ciclaPerSempre;
}

// ===========================================================================
// 4) unknown al posto di any: parsing di dati esterni (fetch/API)
// ===========================================================================
namespace ParsingSicuro {
  // Simuliamo una risposta API non tipizzata: il modo GIUSTO e usare unknown.
  declare function leggiJsonDalServer(): unknown;

  // Type guard: verifica a runtime che l'oggetto sia un Dipendente valido.
  function isDipendente(v: unknown): v is Dipendente {
    return (
      typeof v === "object" &&
      v !== null &&
      "codiceBadge" in v &&
      typeof (v as { codiceBadge: unknown }).codiceBadge === "string"
    );
  }

  function caricaDipendente(): Dipendente | null {
    const dati = leggiJsonDalServer(); // tipo: unknown
    if (isDipendente(dati)) {
      return dati; // tipo: Dipendente (narrowing riuscito)
    }
    return null;
  }

  void caricaDipendente;
}

// ===========================================================================
// 5) never per l'EXHAUSTIVENESS CHECK (union coperte al 100%)
// ===========================================================================
namespace Exhaustiveness {
  // Helper classico: se arriva un caso non gestito, TS lo segnala a compile-time.
  function assertMai(x: never): never {
    throw new Error(`Caso non gestito: ${String(x)}`);
  }

  function etichettaStato(stato: StatoRichiesta): string {
    switch (stato) {
      case "In attesa":
        return "In attesa di approvazione";
      case "Approvato":
        return "Richiesta approvata";
      case "Rifiutato":
        return "Richiesta rifiutata";
      default:
        // Se aggiungi un nuovo StatoRichiesta e non lo gestisci, qui va errore.
        return assertMai(stato); // stato ha tipo: never
    }
  }

  // => "Richiesta approvata"
  const testo = etichettaStato("Approvato");
  void testo;
}

// ===========================================================================
// 6) never come risultato di narrowing "impossibile"
// ===========================================================================
namespace NeverDaNarrowing {
  function descriviRuolo(r: Ruolo): string {
    if (r === "SuperAdmin" || r === "Admin") return "amministratore";
    if (r === "Operatore") return "operatore di reparto";
    if (r === "QrDisplay") return "display QR";
    // Qui TS ha escluso tutti i casi: r e ristretto a `never`.
    const rimasto: never = r;
    return rimasto;
  }

  void descriviRuolo;
}

// ===========================================================================
// 7) never nei conditional/mapped type (filtrare membri di una union)
// ===========================================================================
namespace NeverNeiTipi {
  // In una union, `never` viene "assorbito": T | never === T.
  type SoloStringhe<T> = T extends string ? T : never;

  // Filtriamo una union tenendo solo le stringhe.
  type Mista = "UP-001" | 42 | "P4" | boolean;
  type Filtrata = SoloStringhe<Mista>; // tipo: "UP-001" | "P4"

  const badge: Filtrata = "UP-001";
  // ERRORE TS: Type 'true' is not assignable to type '"UP-001" | "P4"'.
  // const errato: Filtrata = true;

  void badge;
}

// ===========================================================================
// 8) unknown vs any nelle firme di funzione (validazione HH:MM)
// ===========================================================================
namespace ValidazioneOrario {
  const REGEX_ORARIO = /^\d{2}:\d{2}$/;

  // Accettiamo unknown (input "sporco" da form/API) e lo validiamo internamente.
  function timeStringToMinutes(value: unknown): number | null {
    const testo = String(value ?? "").trim();
    if (!REGEX_ORARIO.test(testo)) return null;
    const [h, m] = testo.split(":").map(Number);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  const a = timeStringToMinutes("08:30"); // => 510
  const b = timeStringToMinutes("25:00"); // => null (ora non valida)
  const c = timeStringToMinutes(null); // => null (unknown gestito senza crash)
  void a;
  void b;
  void c;
}

// ===========================================================================
// 9) any -> unknown: migliorare vecchio codice "stringly/anyly typed"
// ===========================================================================
namespace RefactorAnyToUnknown {
  // PRIMA (anti-pattern): tutto any, nessuna sicurezza.
  function leggiCampoPrima(obj: any, chiave: string): any {
    return obj[chiave]; // tipo: any -> si propaga ovunque
  }

  // DOPO: unknown + narrowing. Il chiamante e costretto a controllare.
  function leggiCampoDopo(obj: Record<string, unknown>, chiave: string): unknown {
    return obj[chiave];
  }

  const grezzo = { codiceBadge: "UI-001", ruolo: "Admin" };
  const v = leggiCampoDopo(grezzo, "codiceBadge"); // tipo: unknown
  const badge = typeof v === "string" ? v : "N/D"; // narrowing obbligatorio
  void leggiCampoPrima;
  void badge;
}

// ===========================================================================
// 10) Casi limite utili da ricordare
// ===========================================================================
namespace CasiLimite {
  // (a) unknown in array: devi restringere ogni elemento.
  const valori: unknown[] = ["08:00", 480, null, "P4"];
  const soloOrari = valori.filter((v): v is string => typeof v === "string");
  // soloOrari: string[]  => ["08:00", "P4"]

  // (b) any dentro unknown resta gestibile; unknown dentro any diventa any.
  const x: unknown = JSON.parse("{}"); // JSON.parse ritorna any -> qui lo "chiudiamo" in unknown

  // (c) void non e never: void = "ritorno ignorato", never = "non ritorna".
  function log(_m: string): void {
    /* non ritorna un valore utile, ma la funzione TERMINA */
  }

  void soloOrari;
  void x;
  void log;
}

// ===========================================================================
// 11) Esempio browser (NON eseguito: solo per illustrare unknown sugli eventi)
// ===========================================================================
namespace EsempioBrowser {
  // Esempio browser
  // `catch (e)` da a `e` tipo unknown sotto strict: devi restringere.
  function gestisciSalvataggio(): void {
    try {
      // ... logica di salvataggio timbratura ...
    } catch (e: unknown) {
      const messaggio = e instanceof Error ? e.message : "Errore sconosciuto";
      // Esempio browser: console/document non vengono chiamati qui.
      void messaggio;
    }
  }
  void gestisciSalvataggio;
}

// ===========================================================================
// 12) Export locale (simboli definiti in QUESTO file, per esempio "moduli")
// ===========================================================================
export type EsitoValidazione = number | null;
export function badgeValido(badge: unknown): badge is string {
  return typeof badge === "string" && /^[A-Z]{2,4}-\d{3}$/.test(badge);
}

// Uso dell'export locale:
const provaBadge: unknown = "CO-003";
const okBadge = badgeValido(provaBadge) ? provaBadge : "N/D"; // => "CO-003"
void okBadge;
void mario;

/* ===========================================================================
   RIEPILOGO COMANDI / CONCETTI
   ---------------------------------------------------------------------------
   - any     : disattiva il type checker; si propaga; usalo il MENO possibile.
   - unknown : "any sicuro"; accetti tutto ma DEVI fare narrowing prima di usarlo.
   - never   : tipo impossibile (nessun valore); ritorno di funzioni che
               lanciano o non terminano; sottotipo di tutto.
   - narrowing: typeof / instanceof / `in` / type guard (v is T) per passare
               da unknown al tipo concreto.
   - exhaustiveness: `function assertMai(x: never): never` nel default dello
               switch -> errore se dimentichi un caso della union.
   - never nei tipi: `T | never === T`; utile nei conditional type per FILTRARE.
   - catch (e): sotto strict `e` e unknown -> usa `e instanceof Error`.
   - void != never: void = ritorno ignorato; never = non ritorna affatto.
   - Regola pratica: input esterni/API -> unknown; casi impossibili -> never;
               any solo come ultima spiaggia (o in migrazioni temporanee).
   =========================================================================== */
