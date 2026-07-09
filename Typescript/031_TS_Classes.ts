/**
 * 031_TS_Classes.ts
 * File 31 del corso TypeScript - Argomento: "Classes"
 * Introduzione alle class in TypeScript: fields, constructor, methods, istanze,
 * la keyword this e le annotazioni di tipo su membri e ritorni.
 * Livello: INTERMEDIATE. Contesto dominio ERP Polyuretech (Dipendente, Timbratura, Reparto).
 * Tutte le spiegazioni sono in italiano con termini tecnici in inglese; solo caratteri ASCII.
 */

// ---------------------------------------------------------------------------
// 1) CLASS BASE: la piu' semplice possibile
// ---------------------------------------------------------------------------

// Una class definisce un blueprint (stampo) da cui creare oggetti (instances).
// I fields vanno dichiarati con il loro type; il constructor li inizializza.
class Contatore {
  // field di istanza con type esplicito e valore iniziale
  valore: number = 0;

  // method: incrementa e ritorna il nuovo valore
  incrementa(): number {
    this.valore = this.valore + 1;
    return this.valore;
  }
}

const c = new Contatore(); // tipo: Contatore
console.log(c.incrementa()); // => 1
console.log(c.incrementa()); // => 2

// ---------------------------------------------------------------------------
// 2) CONSTRUCTOR con parametri: inizializzare i fields
// ---------------------------------------------------------------------------

// Ruoli come union type (pattern dell'ERP)
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

class Reparto {
  // fields dichiarati esplicitamente...
  nome: string;
  codice: string;

  // ...e assegnati dentro il constructor tramite this
  constructor(nome: string, codice: string) {
    this.nome = nome;
    this.codice = codice;
  }

  // method che usa i fields di istanza
  descrizione(): string {
    return `${this.codice} - ${this.nome}`;
  }
}

const stampaggio = new Reparto("Stampaggio", "REP-STMP");
console.log(stampaggio.descrizione()); // => "REP-STMP - Stampaggio"

// ---------------------------------------------------------------------------
// 3) PARAMETER PROPERTIES: scorciatoia per field + assegnazione
// ---------------------------------------------------------------------------

// Mettendo un modifier (public/private/readonly) sul parametro del constructor,
// TS crea automaticamente il field e lo assegna: meno boilerplate.
class Turno {
  constructor(
    public readonly codice: "P4" | "P2" | "STD",
    public oreGiornaliere: number,
  ) {}
  // equivalente a: dichiarare i field + this.codice = codice; ecc.

  isFullTime(): boolean {
    return this.oreGiornaliere >= 8;
  }
}

const t = new Turno("P4", 8);
console.log(t.codice); // => "P4"  (tipo: "P4" | "P2" | "STD")
console.log(t.isFullTime()); // => true
// t.codice = "STD"; // ERRORE TS: Cannot assign to 'codice' because it is a read-only property.

// ---------------------------------------------------------------------------
// 4) ESEMPIO PRINCIPALE: class Dipendente con calcoli
// ---------------------------------------------------------------------------

// Regex di dominio (pattern ERP): badge "UP-001", orario "HH:MM"
const BADGE_REGEX = /^UP-\d{3}$/;
const ORARIO_REGEX = /^\d{2}:\d{2}$/;

// Una Timbratura ha entrata e uscita come stringhe naive-UTC "HH:MM".
// La modelliamo come una piccola class con logica di calcolo.
class Timbratura {
  constructor(
    public entrata: string, // "HH:MM"
    public uscita: string,  // "HH:MM"
  ) {}

  // converte "HH:MM" nei minuti dall'inizio giornata; this non serve, ma
  // usiamo un private method per non esporre un helper interno.
  private toMinuti(orario: string): number {
    // narrowing difensivo sul formato
    if (!ORARIO_REGEX.test(orario)) {
      throw new Error(`Orario non valido: ${orario}`);
    }
    const [h, m] = orario.split(":").map(Number); // tipo: number[]
    return h * 60 + m;
  }

  // minuti lavorati in questa timbratura
  durataMinuti(): number {
    return this.toMinuti(this.uscita) - this.toMinuti(this.entrata);
  }

  // ore lavorate come number decimale
  durataOre(): number {
    return this.durataMinuti() / 60;
  }
}

const tb = new Timbratura("08:00", "12:30");
console.log(tb.durataMinuti()); // => 270
console.log(tb.durataOre()); // => 4.5

class Dipendente {
  // field pubblici (accessibili dall'esterno)
  id: number;
  nome: string;
  badge: string;
  ruolo: Ruolo;

  // field privato: la lista di timbrature e' incapsulata
  private timbrature: Timbratura[] = [];

  // tariffa oraria in euro, con default
  constructor(id: number, nome: string, badge: string, ruolo: Ruolo, private tariffaOraria: number = 15) {
    // validazione del badge nel constructor
    if (!BADGE_REGEX.test(badge)) {
      throw new Error(`Badge non valido: ${badge} (atteso formato UP-000)`);
    }
    this.id = id;
    this.nome = nome;
    this.badge = badge;
    this.ruolo = ruolo;
  }

  // aggiunge una timbratura (mutazione controllata dello stato interno)
  registra(t: Timbratura): void {
    this.timbrature.push(t);
  }

  // somma le ore di tutte le timbrature usando reduce
  oreTotali(): number {
    return this.timbrature.reduce((acc, t) => acc + t.durataOre(), 0);
  }

  // calcolo della paga: ore totali * tariffa oraria
  paga(): number {
    return this.oreTotali() * this.tariffaOraria;
  }

  // un getter espone dati derivati come se fossero un field (senza parentesi)
  get numeroTimbrature(): number {
    return this.timbrature.length;
  }

  // method che ritorna una descrizione formattata
  scheda(): string {
    return `#${this.id} ${this.nome} [${this.badge}] ${this.ruolo} - ${this.oreTotali()}h`;
  }
}

const dip = new Dipendente(1, "Mario Rossi", "UP-001", "Operatore", 18);
dip.registra(new Timbratura("08:00", "12:00")); // 4h
dip.registra(new Timbratura("13:00", "17:30")); // 4.5h

console.log(dip.oreTotali()); // => 8.5
console.log(dip.paga()); // => 153  (8.5 * 18)
console.log(dip.numeroTimbrature); // => 2  (getter, niente parentesi)
console.log(dip.scheda()); // => "#1 Mario Rossi [UP-001] Operatore - 8.5h"

// dip.timbrature; // ERRORE TS: Property 'timbrature' is private and only accessible within class 'Dipendente'.
// const bad = new Dipendente(2, "X", "001", "Admin"); // runtime throw: Badge non valido

// ---------------------------------------------------------------------------
// 5) this: a cosa punta e come si perde
// ---------------------------------------------------------------------------

// Dentro un method, this e' l'istanza corrente. Ma se estrai il method in una
// variabile, this puo' perdersi (dipende da come viene chiamato).
class Orologio {
  constructor(public etichetta: string) {}

  // arrow function come field: "lega" this all'istanza in modo permanente
  suonaArrow = (): string => `${this.etichetta}: DRIIN`;

  // method normale: this dipende dal call-site
  suonaMethod(): string {
    return `${this.etichetta}: BEEP`;
  }
}

const o = new Orologio("Sveglia");
const arrowRef = o.suonaArrow;
console.log(arrowRef()); // => "Sveglia: DRIIN"  (this resta legato)

// const methodRef = o.suonaMethod;
// methodRef(); // ERRORE a runtime: this e' undefined (in strict mode)
// Soluzione classica: bind
const methodRef = o.suonaMethod.bind(o);
console.log(methodRef()); // => "Sveglia: BEEP"

// ---------------------------------------------------------------------------
// 6) STATIC members: appartengono alla class, non all'istanza
// ---------------------------------------------------------------------------

class BadgeFactory {
  // field static condiviso da tutte le istanze / chiamate
  static prefisso: string = "UP-";
  private static contatore: number = 0;

  // method static: si chiama sulla class, non su un'istanza
  static prossimo(): string {
    BadgeFactory.contatore = BadgeFactory.contatore + 1;
    // padStart per avere 3 cifre: 1 => "001"
    return `${BadgeFactory.prefisso}${String(BadgeFactory.contatore).padStart(3, "0")}`;
  }
}

console.log(BadgeFactory.prossimo()); // => "UP-001"
console.log(BadgeFactory.prossimo()); // => "UP-002"
// new BadgeFactory().prossimo(); // ERRORE TS: 'prossimo' is a static member, non accessibile sull'istanza

// ---------------------------------------------------------------------------
// 7) readonly fields e incapsulamento
// ---------------------------------------------------------------------------

class ConfigurazioneReparto {
  // readonly: assegnabile solo in dichiarazione o nel constructor
  readonly nome: string;
  readonly maxDipendenti: number;

  constructor(nome: string, maxDipendenti: number) {
    this.nome = nome;
    this.maxDipendenti = maxDipendenti;
  }
}

const cfg = new ConfigurazioneReparto("Verniciatura", 10);
console.log(cfg.maxDipendenti); // => 10
// cfg.maxDipendenti = 20; // ERRORE TS: Cannot assign to 'maxDipendenti' because it is a read-only property.

// ---------------------------------------------------------------------------
// 8) getter e setter: computed properties con validazione
// ---------------------------------------------------------------------------

class OrarioLavoro {
  // il vero stato e' privato; l'accesso passa da getter/setter
  private _orario: string = "00:00";

  get orario(): string {
    return this._orario;
  }

  // il setter puo' validare prima di assegnare
  set orario(value: string) {
    if (!ORARIO_REGEX.test(value)) {
      throw new Error(`Orario non valido: ${value}`);
    }
    this._orario = value;
  }
}

const ol = new OrarioLavoro();
ol.orario = "09:15"; // usa il setter (niente parentesi)
console.log(ol.orario); // => "09:15"  (usa il getter)
// ol.orario = "9:5"; // runtime throw: Orario non valido

// ---------------------------------------------------------------------------
// 9) class che implementa una interface (contratto strutturale)
// ---------------------------------------------------------------------------

// interface come contratto: la class DEVE fornire questi membri.
interface Identificabile {
  id: number;
  identificativo(): string;
}

class Macchinario implements Identificabile {
  constructor(public id: number, public modello: string) {}

  // se dimenticassimo questo method, TS segnalerebbe che il contratto non e' soddisfatto
  identificativo(): string {
    return `MAC-${this.id}-${this.modello}`;
  }
}

const mac: Identificabile = new Macchinario(7, "Presse-X");
console.log(mac.identificativo()); // => "MAC-7-Presse-X"

// ---------------------------------------------------------------------------
// 10) NOTA sui decorators
// ---------------------------------------------------------------------------

// Con experimentalDecorators=FALSE la sintassi @decorator NON e' mostrata come codice.
// Esempio SOLO in commento (non compilerebbe qui):
//   class Servizio {
//     @log            // <- decorator: intercetta/annota il method
//     esegui() {}
//   }
// Per usarli servono flag di compilazione dedicati; qui li citiamo soltanto.

// ---------------------------------------------------------------------------
// EXPORT dei simboli locali (solo simboli definiti in questo file)
// ---------------------------------------------------------------------------

export { Dipendente, Timbratura, Reparto, Turno, BadgeFactory, Macchinario };
export type { Ruolo, Identificabile };

/**
 * RIEPILOGO COMANDI / CONCETTI
 * - class Nome { ... }          : definisce un blueprint per creare instances
 * - field: type = valore        : proprieta' di istanza con type e default
 * - constructor(...)            : inizializza i fields; validazione qui
 * - parameter properties        : public/private/readonly sul param => field automatico
 * - method(): tipoRitorno       : funzione legata all'istanza, usa this
 * - this                        : riferimento all'istanza corrente (attenzione al call-site)
 * - arrow field = () => {}      : lega this permanentemente all'istanza
 * - .bind(istanza)              : ripristina this per un method estratto
 * - private / public / readonly : modifier di visibilita' e immutabilita'
 * - get / set                   : computed properties, accesso senza parentesi + validazione
 * - static                      : membro della class, si usa su NomeClasse, non sull'istanza
 * - implements Interface        : la class deve soddisfare il contratto strutturale
 * - new NomeClasse(...)         : crea un'instance
 * - @decorator                  : solo in commento (experimentalDecorators=FALSE)
 */
