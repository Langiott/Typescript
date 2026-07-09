/**
 * File 036 - Abstract Classes (Classi astratte)
 * Corso TypeScript - livello INTERMEDIATE.
 * Questo file spiega: abstract class e abstract method, il fatto che
 * una classe astratta NON e' istanziabile, il pattern Template Method,
 * e un esempio di dominio ERP con EntitaBase astratta estesa da
 * Dipendente e Reparto. Tutti gli esempi compilano con tsc --strict.
 */

// ---------------------------------------------------------------------------
// 1. Cos'e' una abstract class
// ---------------------------------------------------------------------------
// Una abstract class e' una classe che NON puo' essere istanziata direttamente
// con "new". Serve come base comune (blueprint) da cui derivano classi concrete.
// Puo' contenere sia membri implementati sia membri "astratti" (senza corpo)
// che le sottoclassi DEVONO implementare.

abstract class Forma {
  // Metodo astratto: nessun corpo, solo la firma. Ogni sottoclasse lo implementa.
  abstract area(): number;

  // Metodo concreto: gia' implementato, ereditato da tutte le sottoclassi.
  descrivi(): string {
    // "this.area()" chiama l'implementazione della sottoclasse (polymorphism).
    return `Area = ${this.area().toFixed(2)}`;
  }
}

// ERRORE TS: non si puo' istanziare una classe astratta.
// const f = new Forma(); // Cannot create an instance of an abstract class.

class Cerchio extends Forma {
  constructor(private raggio: number) {
    super();
  }
  // Implementazione obbligatoria del metodo astratto.
  area(): number {
    return Math.PI * this.raggio ** 2;
  }
}

const c = new Cerchio(2);
// c.descrivi() usa area() concreto della sottoclasse.
console.log(c.descrivi()); // => "Area = 12.57"

// ---------------------------------------------------------------------------
// 2. Metodi astratti con parametri e getter astratti
// ---------------------------------------------------------------------------
abstract class Documento {
  // getter astratto: la sottoclasse deve fornirlo.
  abstract get titolo(): string;

  // metodo astratto con parametro.
  abstract esporta(formato: "pdf" | "txt"): string;
}

class Nota extends Documento {
  constructor(private testo: string) {
    super();
  }
  get titolo(): string {
    return this.testo.slice(0, 10);
  }
  esporta(formato: "pdf" | "txt"): string {
    return `[${formato}] ${this.testo}`;
  }
}

const nota = new Nota("Promemoria turni P4");
console.log(nota.titolo); // => "Promemoria"
console.log(nota.esporta("txt")); // => "[txt] Promemoria turni P4"

// ---------------------------------------------------------------------------
// 3. abstract vs interface
// ---------------------------------------------------------------------------
// interface: solo forma, nessuna implementazione, nessuno stato.
// abstract class: puo' contenere codice condiviso, campi, costruttore, private.
// Regola pratica: usa interface per un contratto puro; usa abstract class
// quando vuoi condividere logica/stato tra piu' sottoclassi.

interface Stampabile {
  stampa(): string;
}

abstract class BaseStampabile implements Stampabile {
  // logica condivisa
  protected prefisso = ">> ";
  // resta astratto cio' che varia
  abstract stampa(): string;
}

class Riga extends BaseStampabile {
  constructor(private contenuto: string) {
    super();
  }
  stampa(): string {
    return this.prefisso + this.contenuto;
  }
}
console.log(new Riga("ciao").stampa()); // => ">> ciao"

// ---------------------------------------------------------------------------
// 4. Modificatori: abstract protected / abstract con override
// ---------------------------------------------------------------------------
// Un membro astratto puo' essere protected: visibile alle sottoclassi ma non
// dall'esterno. Utile per gli "hook" del Template Method (vedi sezione 6).

abstract class Report {
  // hook protetto e astratto: dettaglio interno lasciato alle sottoclassi.
  protected abstract corpo(): string;

  // API pubblica concreta che usa l'hook.
  render(): string {
    return `--- REPORT ---\n${this.corpo()}\n--------------`;
  }
}

class ReportSemplice extends Report {
  constructor(private righe: string[]) {
    super();
  }
  protected corpo(): string {
    return this.righe.join("\n");
  }
}
console.log(new ReportSemplice(["a", "b"]).render());
// => "--- REPORT ---\na\nb\n--------------"

// ---------------------------------------------------------------------------
// 5. Tipi ERP di supporto (definiti qui, nessun import esterno)
// ---------------------------------------------------------------------------
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

const REGEX_BADGE = /^UP-\d{3}$/; // es. "UP-001"
const REGEX_ORARIO = /^\d{2}:\d{2}$/; // es. "08:30" naive-UTC

// ---------------------------------------------------------------------------
// 6. Template Method pattern con EntitaBase astratta
// ---------------------------------------------------------------------------
// Idea: la classe base definisce lo SCHELETRO di un algoritmo (qui: validate)
// in un metodo concreto, delegando i passi variabili a metodi astratti che le
// sottoclassi implementano. Il flusso resta fisso, i dettagli cambiano.

// Risultato di validazione riutilizzabile.
interface EsitoValidazione {
  ok: boolean;
  errori: string[];
}

abstract class EntitaBase {
  constructor(public readonly id: number) {}

  // ----- Template Method (concreto, NON si sovrascrive) -----
  // Definisce i passi: prima controlli comuni, poi controlli specifici.
  validate(): EsitoValidazione {
    const errori: string[] = [];
    // passo comune a tutte le entita'
    if (this.id <= 0) {
      errori.push("id deve essere positivo");
    }
    // passo variabile: delegato alla sottoclasse (hook astratto)
    errori.push(...this.regoleSpecifiche());
    return { ok: errori.length === 0, errori };
  }

  // ----- Hook astratti: ogni entita' definisce i propri -----
  protected abstract regoleSpecifiche(): string[];

  // etichetta leggibile: astratta perche' varia per entita'.
  abstract etichetta(): string;

  // metodo concreto condiviso che usa etichetta() polimorfico.
  descrizioneBreve(): string {
    return `#${this.id} ${this.etichetta()}`;
  }
}

// Sottoclasse concreta: Dipendente
class Dipendente extends EntitaBase {
  constructor(
    id: number,
    public nome: string,
    public badge: string, // formato "UP-001"
    public ruolo: Ruolo,
  ) {
    super(id);
  }

  // Implementa l'hook: regole di validazione proprie del Dipendente.
  protected regoleSpecifiche(): string[] {
    const err: string[] = [];
    if (this.nome.trim() === "") {
      err.push("nome mancante");
    }
    if (!REGEX_BADGE.test(this.badge)) {
      err.push(`badge non valido: ${this.badge}`);
    }
    return err;
  }

  etichetta(): string {
    return `${this.nome} (${this.badge})`;
  }
}

// Sottoclasse concreta: Reparto
class Reparto extends EntitaBase {
  constructor(
    id: number,
    public nome: string,
    public turno: Turno,
  ) {
    super(id);
  }

  protected regoleSpecifiche(): string[] {
    const err: string[] = [];
    if (this.nome.trim() === "") {
      err.push("nome reparto mancante");
    }
    // turno gia' vincolato dal type Turno, ma mostriamo un controllo esplicito.
    if (!["P4", "P2", "STD"].includes(this.turno)) {
      err.push("turno sconosciuto");
    }
    return err;
  }

  etichetta(): string {
    return `Reparto ${this.nome} [${this.turno}]`;
  }
}

// Uso polimorfico: stesso Template Method, esiti diversi.
const dip = new Dipendente(1, "Mario Rossi", "UP-001", "Operatore");
console.log(dip.validate()); // => { ok: true, errori: [] }
console.log(dip.descrizioneBreve()); // => "#1 Mario Rossi (UP-001)"

const dipKo = new Dipendente(0, "", "X-9", "Admin");
console.log(dipKo.validate());
// => { ok: false, errori: ["id deve essere positivo","nome mancante","badge non valido: X-9"] }

const rep = new Reparto(5, "Stampaggio", "P4");
console.log(rep.descrizioneBreve()); // => "#5 Reparto Stampaggio [P4]"

// ---------------------------------------------------------------------------
// 7. Trattare le sottoclassi in modo uniforme tramite il tipo base
// ---------------------------------------------------------------------------
// Il type EntitaBase e' un valido tipo di variabile: non si puo' istanziare,
// ma puo' contenere qualsiasi sottoclasse concreta (upcasting).
const entita: EntitaBase[] = [dip, rep];
for (const e of entita) {
  // chiamata polimorfica: ognuno risponde con la sua etichetta().
  console.log(e.descrizioneBreve());
}
// => "#1 Mario Rossi (UP-001)"
// => "#5 Reparto Stampaggio [P4]"

// ---------------------------------------------------------------------------
// 8. Abstract construct signature: tipo "costruttore di sottoclasse concreta"
// ---------------------------------------------------------------------------
// Un abstract constructor type descrive un costruttore che NON puo' essere
// chiamato con new (perche' potrebbe essere astratto). Un normale
// "new (...) => T" richiede invece una classe concreta e istanziabile.

// factory che accetta SOLO classi concrete (new () => T).
function creaZero<T extends EntitaBase>(Ctor: new (id: number) => T): T {
  return new Ctor(0);
}

// Esempio: una entita' concreta minimale.
class Segnaposto extends EntitaBase {
  protected regoleSpecifiche(): string[] {
    return [];
  }
  etichetta(): string {
    return "segnaposto";
  }
}
console.log(creaZero(Segnaposto).etichetta()); // => "segnaposto"

// ERRORE TS: non si puo' passare EntitaBase (astratta) dove serve new-able.
// creaZero(EntitaBase);
// Cannot assign an abstract constructor type to a non-abstract constructor type.

// Tipo che accetta anche costruttori astratti (abstract new ...):
type QualsiasiEntitaCtor = abstract new (id: number) => EntitaBase;
// Utile per type-level; NON puoi comunque fare "new" su un abstract ctor.
const riferimentoBase: QualsiasiEntitaCtor = EntitaBase; // ok: solo riferimento
console.log(typeof riferimentoBase); // => "function"

// ---------------------------------------------------------------------------
// 9. Template Method piu' ricco: pipeline di elaborazione timbratura
// ---------------------------------------------------------------------------
// Mostriamo hook multipli: normalizzazione (astratto) + validazione (concreto).
interface Timbratura {
  entrata: string; // "HH:MM" naive-UTC
  uscita: string; // "HH:MM" naive-UTC
}

abstract class ProcessoreTimbratura {
  // Template Method: sequenza fissa di passi.
  elabora(t: Timbratura): EsitoValidazione {
    const norm = this.normalizza(t); // hook astratto
    const errori: string[] = [];
    if (!REGEX_ORARIO.test(norm.entrata)) errori.push("entrata non valida");
    if (!REGEX_ORARIO.test(norm.uscita)) errori.push("uscita non valida");
    if (errori.length === 0 && norm.uscita < norm.entrata) {
      errori.push("uscita prima dell'entrata");
    }
    return { ok: errori.length === 0, errori };
  }
  // passo variabile
  protected abstract normalizza(t: Timbratura): Timbratura;
}

// Variante che fa trim degli spazi.
class ProcessoreTrim extends ProcessoreTimbratura {
  protected normalizza(t: Timbratura): Timbratura {
    return { entrata: t.entrata.trim(), uscita: t.uscita.trim() };
  }
}
console.log(new ProcessoreTrim().elabora({ entrata: " 08:00 ", uscita: "17:00" }));
// => { ok: true, errori: [] }
console.log(new ProcessoreTrim().elabora({ entrata: "18:00", uscita: "09:00" }));
// => { ok: false, errori: ["uscita prima dell'entrata"] }

// ---------------------------------------------------------------------------
// 10. Note su costruttori e campi in classi astratte
// ---------------------------------------------------------------------------
// - Una abstract class PUO' avere un constructor: viene invocato dalle
//   sottoclassi tramite super(). Serve a inizializzare stato condiviso.
// - I campi dichiarati nella base sono ereditati normalmente.
// - Un metodo astratto NON puo' avere corpo; un campo astratto (abstract prop)
//   e' consentito ma non puo' avere valore iniziale.

abstract class ConChiave {
  // abstract property: nessun valore iniziale, la sottoclasse la fornisce.
  abstract readonly chiave: string;
  // ERRORE TS: abstract non ammette inizializzatore.
  // abstract readonly chiave2: string = "x";
  mostra(): string {
    return `chiave=${this.chiave}`;
  }
}
class ItemUP extends ConChiave {
  readonly chiave = "UP-001";
}
console.log(new ItemUP().mostra()); // => "chiave=UP-001"

// ---------------------------------------------------------------------------
// Export di simboli locali (solo definiti in questo file)
// ---------------------------------------------------------------------------
export { EntitaBase, Dipendente, Reparto, ProcessoreTimbratura };
export type { Ruolo, Turno, EsitoValidazione, Timbratura };

/*
 * RIEPILOGO COMANDI / CONCETTI
 * - abstract class: classe base NON istanziabile (new -> errore).
 * - abstract method/getter: firma senza corpo; la sottoclasse DEVE implementarlo.
 * - abstract property: consentita, senza valore iniziale.
 * - modificatori: abstract puo' essere protected (hook interni).
 * - Template Method: metodo concreto = scheletro algoritmo; hook astratti = passi variabili.
 * - polymorphism: this.metodoAstratto() chiama l'implementazione della sottoclasse.
 * - abstract vs interface: interface = contratto puro; abstract class = contratto + stato/logica condivisa.
 * - implements + abstract: una abstract class puo' implementare una interface e lasciare astratto cio' che varia.
 * - upcasting: variabile di tipo base contiene sottoclassi concrete (EntitaBase[]).
 * - constructor: le abstract class possono avere un constructor chiamato via super().
 * - new (...) => T: accetta SOLO classi concrete; abstract new (...) => T: anche astratte (non new-abili).
 * - Esempio ERP: EntitaBase -> Dipendente / Reparto con validate() Template Method.
 */
