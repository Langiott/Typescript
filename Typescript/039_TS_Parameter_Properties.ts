/**
 * File 039 - Parameter Properties (TypeScript)
 * ---------------------------------------------
 * Le parameter properties sono una shorthand di TypeScript per dichiarare
 * e inizializzare un class field direttamente nel constructor, applicando
 * un modifier (public/private/protected/readonly) al parametro.
 * In questo file vediamo: come riducono il boilerplate, il mix con readonly,
 * la differenza con la scrittura classica e un esempio dominio ERP (Timbratura).
 * Livello: INTERMEDIATE.
 */

// ============================================================
// 1) IL PROBLEMA: boilerplate classico senza parameter properties
// ============================================================

// Senza parameter properties dobbiamo: dichiarare il field, dichiarare il
// parametro nel constructor, e assegnare manualmente this.field = param.
class DipendenteVerbose {
  // 1. dichiarazione dei field
  public id: number;
  public nome: string;
  public badge: string;

  constructor(id: number, nome: string, badge: string) {
    // 2. assegnazione manuale (boilerplate ripetitivo)
    this.id = id;
    this.nome = nome;
    this.badge = badge;
  }
}

const dv = new DipendenteVerbose(1, "Anna", "UP-001");
// dv.nome -> tipo: string
// => "Anna"

// ============================================================
// 2) LA SOLUZIONE: parameter properties (shorthand)
// ============================================================

// Mettendo un access modifier davanti al parametro del constructor,
// TS crea AUTOMATICAMENTE il field e fa l'assegnazione this.x = x.
class Dipendente {
  // Nessuna dichiarazione di field, nessun this.x = x: tutto implicito.
  constructor(
    public id: number,
    public nome: string,
    public badge: string,
  ) {}
}

const d = new Dipendente(1, "Anna", "UP-001");
// d.id    -> tipo: number  => 1
// d.nome  -> tipo: string  => "Anna"
// d.badge -> tipo: string  => "UP-001"

// Le due classi (DipendenteVerbose e Dipendente) sono equivalenti a runtime.

// ============================================================
// 3) I QUATTRO MODIFIER AMMESSI
// ============================================================

// Un parametro diventa parameter property SOLO se ha almeno uno tra:
//   public | private | protected | readonly
// (anche readonly da solo basta a creare il field).
class Reparto {
  constructor(
    public readonly codice: string, // pubblico ma non riassegnabile
    private nome: string, // visibile solo dentro la classe
    protected capienza: number, // visibile in classe e sottoclassi
    readonly attivo: boolean, // implicitamente public + readonly
  ) {}

  descrizione(): string {
    // nome e' private ma accessibile QUI dentro
    return `${this.codice}: ${this.nome} (cap. ${this.capienza})`;
  }
}

const rep = new Reparto("R-01", "Verniciatura", 12, true);
// rep.codice -> tipo: string  => "R-01"
// rep.attivo -> tipo: boolean => true
// rep.nome
// ERRORE TS: Property 'nome' is private and only accessible within class 'Reparto'.
// rep.codice = "R-99";
// ERRORE TS: Cannot assign to 'codice' because it is a read-only property.

// ============================================================
// 4) SENZA MODIFIER = parametro normale (NON diventa field)
// ============================================================

// Se ometti il modifier, il parametro resta un semplice argomento locale
// del constructor: NON viene creato alcun field.
class Turno {
  public etichetta: string;

  // 'sigla' NON ha modifier -> non e' un field, e' solo un parametro locale.
  constructor(sigla: string, prefisso: string) {
    this.etichetta = `${prefisso}-${sigla}`;
  }
}

const t = new Turno("P4", "TURNO");
// t.etichetta -> tipo: string => "TURNO-P4"
// t.sigla
// ERRORE TS: Property 'sigla' does not exist on type 'Turno'.

// ============================================================
// 5) MIX di parameter properties e parametri normali
// ============================================================

// Puoi mescolare parametri con modifier (diventano field) e senza (locali).
class RegistroAccessi {
  private accessi: string[] = []; // field dichiarato normalmente (default)

  constructor(
    public readonly reparto: string, // parameter property (field)
    iniziali: string[], // parametro normale (locale)
  ) {
    // usiamo 'iniziali' solo per popolare il field 'accessi'
    this.accessi = [...iniziali];
  }

  lista(): readonly string[] {
    return this.accessi;
  }
}

const ra = new RegistroAccessi("R-01", ["UP-001", "UP-002"]);
// ra.reparto -> tipo: string => "R-01"
// ra.lista() -> tipo: readonly string[] => ["UP-001", "UP-002"]

// ============================================================
// 6) readonly + parameter property: immutabilita' concisa
// ============================================================

// Ottima combinazione per value object immutabili: un solo posto per
// dichiarare, tipizzare e proteggere il dato.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

class Account {
  constructor(
    public readonly badge: string,
    public readonly ruolo: Ruolo,
  ) {}

  // metodo che restituisce una COPIA modificata (pattern immutabile)
  conRuolo(nuovo: Ruolo): Account {
    return new Account(this.badge, nuovo);
  }
}

const acc = new Account("UP-007", "Operatore");
const accAdmin = acc.conRuolo("Admin");
// acc.ruolo      -> tipo: Ruolo => "Operatore" (originale invariato)
// accAdmin.ruolo -> tipo: Ruolo => "Admin"
// acc.ruolo = "Admin";
// ERRORE TS: Cannot assign to 'ruolo' because it is a read-only property.

// ============================================================
// 7) VALIDAZIONE nel constructor + parameter properties
// ============================================================

// I field creati dalle parameter properties sono gia' assegnati PRIMA che
// il corpo del constructor giri: puoi validarli subito nel corpo.
const RE_BADGE = /^UP-\d{3}$/; // es: "UP-001"
const RE_ORARIO = /^\d{2}:\d{2}$/; // es: "07:30" (naive-UTC, "HH:MM")

class Cartellino {
  constructor(
    public readonly badge: string,
    public readonly orario: string,
  ) {
    // this.badge e this.orario esistono gia' qui: possiamo validarli.
    if (!RE_BADGE.test(this.badge)) {
      throw new Error(`Badge non valido: ${this.badge}`);
    }
    if (!RE_ORARIO.test(this.orario)) {
      throw new Error(`Orario non valido: ${this.orario}`);
    }
  }
}

const c = new Cartellino("UP-003", "08:15");
// c.badge  -> tipo: string => "UP-003"
// c.orario -> tipo: string => "08:15"
// new Cartellino("X-1", "08:15"); // a runtime lancia: Badge non valido: X-1

// ============================================================
// 8) EREDITARIETA': parameter properties nella sottoclasse
// ============================================================

// La superclasse usa parameter properties; la sottoclasse chiama super()
// e puo' aggiungere le proprie parameter properties.
class Persona {
  constructor(
    public readonly nome: string,
    protected eta: number,
  ) {}
}

class DipendenteFull extends Persona {
  constructor(
    nome: string, // passato a super (NON e' un field qui)
    eta: number, // passato a super (NON e' un field qui)
    public readonly badge: string, // QUESTO invece e' un field nuovo
  ) {
    super(nome, eta); // super() obbligatorio prima di usare 'this'
  }

  saluta(): string {
    // 'eta' e' protected della superclasse: accessibile qui
    return `${this.nome}, ${this.eta} anni, badge ${this.badge}`;
  }
}

const df = new DipendenteFull("Marco", 40, "UP-010");
// df.nome  -> tipo: string => "Marco"
// df.badge -> tipo: string => "UP-010"
// df.saluta() => "Marco, 40 anni, badge UP-010"

// ============================================================
// 9) ATTENZIONE: le parameter properties NON funzionano su metodi
// ============================================================

// I modifier come parameter property valgono SOLO nei parametri del
// constructor. In un metodo normale sono errore di sintassi.
class Esempio {
  // valido: nel constructor
  constructor(public valore: number) {}

  // metodo(public x: number): void {}
  // ERRORE TS: A parameter property is only allowed in a constructor implementation.
}

const e = new Esempio(42);
// e.valore -> tipo: number => 42

// ============================================================
// 10) INTERAZIONE con interface (contratto pubblico)
// ============================================================

// Una interface descrive la forma; le parameter properties public la
// implementano automaticamente creando i field richiesti.
interface HaBadge {
  readonly badge: string;
}

class Timbratore implements HaBadge {
  // 'badge' public readonly soddisfa il contratto HaBadge
  constructor(public readonly badge: string) {}
}

const tim: HaBadge = new Timbratore("UP-020");
// tim.badge -> tipo: string => "UP-020"

// ============================================================
// 11) ESEMPIO DOMINIO COMPLETO: class Timbratura
// ============================================================

// Tipo di verso della timbratura.
type Verso = "entrata" | "uscita";

// Timbratura ERP: orari come stringhe naive-UTC "HH:MM".
// Grazie alle parameter properties, dichiarazione+assegnazione+validazione
// stanno tutte in un blocco compatto.
class Timbratura {
  constructor(
    public readonly badge: string,
    public readonly verso: Verso,
    public readonly orario: string, // "HH:MM" naive-UTC
    private note: string = "", // parameter property con default
  ) {
    if (!RE_BADGE.test(this.badge)) {
      throw new Error(`Badge non valido: ${this.badge}`);
    }
    if (!RE_ORARIO.test(this.orario)) {
      throw new Error(`Orario non valido: ${this.orario}`);
    }
  }

  // converte "HH:MM" in minuti dall'inizio giornata (utile per calcoli)
  private minuti(): number {
    const [h, m] = this.orario.split(":").map(Number);
    return h * 60 + m; // es: "08:30" -> 510
  }

  // e' una timbratura del turno mattina? (prima delle 14:00)
  isMattina(): boolean {
    return this.minuti() < 14 * 60;
  }

  descrivi(): string {
    const suffix = this.note ? ` [${this.note}]` : "";
    return `${this.badge} ${this.verso} @ ${this.orario}${suffix}`;
  }
}

const t1 = new Timbratura("UP-001", "entrata", "08:00");
const t2 = new Timbratura("UP-001", "uscita", "17:12", "uscita anticipata");
// t1.badge      -> tipo: string  => "UP-001"
// t1.verso      -> tipo: Verso   => "entrata"
// t1.isMattina() -> tipo: boolean => true
// t2.isMattina() -> tipo: boolean => false
// t1.descrivi() => "UP-001 entrata @ 08:00"
// t2.descrivi() => "UP-001 uscita @ 17:12 [uscita anticipata]"
// t1.note
// ERRORE TS: Property 'note' is private and only accessible within class 'Timbratura'.
// t1.orario = "09:00";
// ERRORE TS: Cannot assign to 'orario' because it is a read-only property.

// ============================================================
// 12) CONFRONTO diretto: quante righe risparmiate
// ============================================================

// Versione lunga: 3 field + 3 assegnazioni = 6 righe di boilerplate.
class CoppiaLunga {
  public a: number;
  public b: number;
  constructor(a: number, b: number) {
    this.a = a;
    this.b = b;
  }
}

// Versione shorthand: 0 righe di boilerplate, stesso risultato.
class CoppiaBreve {
  constructor(
    public a: number,
    public b: number,
  ) {}
}

const cl = new CoppiaLunga(1, 2);
const cb = new CoppiaBreve(1, 2);
// cl.a => 1 ; cb.a => 1  (identiche a runtime)

// ============================================================
// 13) DECORATORS (solo nota, experimentalDecorators = false)
// ============================================================

// NB: con experimentalDecorators = false la sintassi @decorator NON compila.
// Le parameter properties sono indipendenti dai decorator, ma in framework
// come NestJS spesso le vedi COMBINATE cosi' (mostrato SOLO come commento):
//
//   constructor(private readonly repo: Repository) {}
//   // con @Injectable() sopra la classe (richiederebbe experimentalDecorators)
//
// Nel nostro corso restano solo parameter properties "pure".

// ============================================================
// EXPORT dei simboli locali (solo di questo file)
// ============================================================

export {
  Dipendente,
  Reparto,
  Account,
  Cartellino,
  DipendenteFull,
  Timbratura,
  Timbratore,
};
export type { Ruolo, Verso, HaBadge };

/*
============================================================
RIEPILOGO COMANDI / CONCETTI
============================================================
- Parameter property = parametro del constructor con un access modifier:
  crea il field e fa this.x = x automaticamente.
- Modifier ammessi: public | private | protected | readonly
  (anche readonly da solo basta a creare il field).
- Senza modifier -> parametro locale normale, NESSUN field creato.
- Puoi mescolare parameter properties e parametri normali nello stesso
  constructor.
- readonly + parameter property = value object immutabile conciso.
- I field esistono gia' nel corpo del constructor -> puoi validarli subito
  (RE_BADGE /^UP-\d{3}$/, RE_ORARIO /^\d{2}:\d{2}$/).
- Ereditarieta': i parametri passati a super() NON sono field; aggiungi
  parameter properties nuove nella sottoclasse.
- Le parameter properties valgono SOLO nel constructor, mai nei metodi.
- Le public parameter properties soddisfano automaticamente una interface.
- A runtime versione lunga e versione shorthand sono identiche.
- Con experimentalDecorators = false la sintassi @decorator non compila:
  mostrala solo nei commenti.
============================================================
*/
