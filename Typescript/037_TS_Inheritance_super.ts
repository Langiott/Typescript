/**
 * File 037 - Class inheritance & super
 * Corso TypeScript (livello INTERMEDIATE).
 * Argomento: ereditarieta' tra classi con "extends", chiamata a "super()" nel
 * constructor, override di metodi con la keyword "override", modificatore
 * "protected" e costruzione di una gerarchia di dominio Utente -> Admin.
 * Contesto ERP Polyuretech: Dipendente, ruoli, badge "UP-001", turni.
 */

// ---------------------------------------------------------------------------
// 1) extends: la classe figlia eredita membri della classe base
// ---------------------------------------------------------------------------

// Classe base: rappresenta un utente generico dell'ERP.
class Utente {
  // "protected" -> visibile nella classe e nelle sottoclassi, NON dall'esterno.
  protected readonly id: number;
  public nome: string;

  constructor(id: number, nome: string) {
    this.id = id;
    this.nome = nome;
  }

  // Metodo che le sottoclassi potranno riusare o overridare.
  descrivi(): string {
    return `Utente #${this.id}: ${this.nome}`;
  }

  // Metodo che usa un membro protected: le sottoclassi lo ereditano.
  getEtichetta(): string {
    return `[${this.id}] ${this.nome}`;
  }
}

// La classe figlia "extends" la base: eredita id, nome, descrivi, getEtichetta.
class Admin extends Utente {
  // Nuovo campo specifico della sottoclasse.
  public livello: number;

  constructor(id: number, nome: string, livello: number) {
    // super() DEVE essere chiamato prima di usare "this" nel constructor.
    super(id, nome);
    this.livello = livello;
  }
}

const a1 = new Admin(1, "Francesco", 3);
// tipo: string  => "Utente #1: Francesco" (descrivi ereditato dalla base)
const d1 = a1.descrivi();
// tipo: string  => "[1] Francesco"
const e1 = a1.getEtichetta();

// ERRORE TS: 'id' e' protected, non accessibile dall'esterno della gerarchia.
// const idFuori = a1.id;

// ---------------------------------------------------------------------------
// 2) super() nel constructor: obbligatorio, e prima di "this"
// ---------------------------------------------------------------------------

class Dipendente {
  constructor(
    public badge: string, // "UP-001"
    protected reparto: string,
  ) {}

  scheda(): string {
    return `${this.badge} (${this.reparto})`;
  }
}

class Responsabile extends Dipendente {
  constructor(
    badge: string,
    reparto: string,
    public numSottoposti: number,
  ) {
    // Se la base ha un constructor con parametri, super(...) e' obbligatorio.
    super(badge, reparto);
    // this puo' essere usato SOLO dopo super().
    // ERRORE TS: 'super' must be called before accessing 'this'.
    // this.numSottoposti = numSottoposti; // (se posto prima di super)
  }
}

const r1 = new Responsabile("UP-007", "Stampaggio", 4);
// tipo: string  => "UP-007 (Stampaggio)"
const s1 = r1.scheda();

// ---------------------------------------------------------------------------
// 3) override di metodi + keyword "override"
// ---------------------------------------------------------------------------

// La keyword "override" documenta che stiamo ridefinendo un metodo della base.
// Con "noImplicitOverride" attivo diventa obbligatoria; qui e' comunque buona
// pratica perche' se il metodo base sparisce/rinomina, TS segnala l'errore.
class AdminV2 extends Utente {
  constructor(
    id: number,
    nome: string,
    public livello: number,
  ) {
    super(id, nome);
  }

  // override: ridefinisce descrivi() aggiungendo info specifiche.
  override descrivi(): string {
    // super.metodo() chiama l'implementazione della classe base.
    return `${super.descrivi()} - Admin livello ${this.livello}`;
  }
}

const a2 = new AdminV2(2, "Anna", 5);
// tipo: string  => "Utente #2: Anna - Admin livello 5"
const d2 = a2.descrivi();

// ERRORE TS: 'metodoInesistente' non esiste sulla base -> override illegale.
// class Rotto extends Utente { override metodoInesistente() {} }

// ---------------------------------------------------------------------------
// 4) super.metodo(): estendere il comportamento senza riscriverlo
// ---------------------------------------------------------------------------

class Base {
  saluta(): string {
    return "ciao";
  }
}

class Estesa extends Base {
  override saluta(): string {
    // Riusa il risultato della base e lo arricchisce.
    return super.saluta().toUpperCase() + "!"; // => "CIAO!"
  }
}

// tipo: string  => "CIAO!"
const g1 = new Estesa().saluta();

// ---------------------------------------------------------------------------
// 5) protected: accessibile nelle sottoclassi, non dall'esterno
// ---------------------------------------------------------------------------

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

class AccountBase {
  // protected: le sottoclassi leggono/scrivono, il codice esterno no.
  protected ruolo: Ruolo;

  constructor(protected badge: string, ruolo: Ruolo) {
    this.ruolo = ruolo;
  }

  // Metodo pubblico che espone in modo controllato lo stato protected.
  descrizioneRuolo(): string {
    return `${this.badge}: ${this.ruolo}`;
  }
}

class AccountAdmin extends AccountBase {
  constructor(badge: string) {
    super(badge, "Admin");
  }

  // Puo' leggere e modificare "ruolo" perche' e' protected, non private.
  promuovi(): void {
    this.ruolo = "SuperAdmin";
  }
}

const acc = new AccountAdmin("UP-010");
acc.promuovi();
// tipo: string  => "UP-010: SuperAdmin"
const dr1 = acc.descrizioneRuolo();

// ERRORE TS: 'ruolo' e' protected -> non accessibile qui fuori.
// acc.ruolo = "Operatore";

// Differenza protected vs private: private NON e' visibile nemmeno ai figli.
class ConPrivate {
  private segreto = 42;
  leggi(): number {
    return this.segreto;
  }
}
class FiglioPrivate extends ConPrivate {
  // ERRORE TS: Property 'segreto' is private and only accessible within 'ConPrivate'.
  // usa(): number { return this.segreto; }
}

// ---------------------------------------------------------------------------
// 6) Gerarchia di dominio ERP: Utente -> Operatore / Admin -> SuperAdmin
// ---------------------------------------------------------------------------

const RE_BADGE = /^UP-\d{3}$/;
const RE_ORARIO = /^\d{2}:\d{2}$/;

// Base della gerarchia: ogni utente ha badge e ruolo.
class UtenteErp {
  constructor(
    public readonly badge: string,
    protected ruolo: Ruolo,
  ) {
    if (!RE_BADGE.test(badge)) {
      throw new Error(`Badge non valido: ${badge}`);
    }
  }

  // permessi() e' pensato per essere overridato dalle sottoclassi.
  permessi(): string[] {
    return ["timbra"];
  }

  riepilogo(): string {
    return `${this.badge} [${this.ruolo}] permessi: ${this.permessi().join(", ")}`;
  }
}

// Operatore: solo permessi base, aggiunge la logica di timbratura.
class OperatoreErp extends UtenteErp {
  constructor(badge: string) {
    super(badge, "Operatore");
  }

  // Orari in formato naive-UTC come stringhe "HH:MM".
  timbra(orario: string): string {
    if (!RE_ORARIO.test(orario)) {
      throw new Error(`Orario non valido: ${orario}`);
    }
    return `${this.badge} timbra alle ${orario}`;
  }
}

// AdminErp: estende i permessi dell'Operatore riusando super.permessi().
class AdminErp extends OperatoreErp {
  override permessi(): string[] {
    // Concatena i permessi ereditati con quelli aggiuntivi.
    return [...super.permessi(), "gestione-turni", "modifica-timbrature"];
  }
}

// SuperAdminErp: in cima alla gerarchia, aggiunge ancora permessi.
class SuperAdminErp extends AdminErp {
  override permessi(): string[] {
    return [...super.permessi(), "gestione-utenti", "config-sistema"];
  }

  // Puo' cambiare il ruolo protected ereditato da UtenteErp.
  forzaRuolo(nuovo: Ruolo): void {
    this.ruolo = nuovo;
  }
}

const op = new OperatoreErp("UP-001");
const ad = new AdminErp("UP-002");
const sa = new SuperAdminErp("UP-003");

// tipo: string[]  => ["timbra"]
const pOp = op.permessi();
// tipo: string[]  => ["timbra", "gestione-turni", "modifica-timbrature"]
const pAd = ad.permessi();
// tipo: string[]  => ["timbra", "gestione-turni", "modifica-timbrature", "gestione-utenti", "config-sistema"]
const pSa = sa.permessi();

// tipo: string  => "UP-003 timbra alle 08:00" (timbra ereditato da OperatoreErp)
const t1 = sa.timbra("08:00");

// ---------------------------------------------------------------------------
// 7) Polimorfismo: trattare i figli tramite il tipo della base
// ---------------------------------------------------------------------------

// Una funzione che accetta la base funziona con qualsiasi sottoclasse.
function stampaRiepilogo(u: UtenteErp): string {
  // permessi() e' risolto a runtime sulla classe concreta (dynamic dispatch).
  return u.riepilogo();
}

// Tutti e tre accettati perche' sono UtenteErp.
const arr: UtenteErp[] = [op, ad, sa];
// tipo: string[]
const righe = arr.map(stampaRiepilogo);
// righe[0] => "UP-001 [Operatore] permessi: timbra"
// righe[1] => "UP-002 [Operatore] permessi: timbra, gestione-turni, modifica-timbrature"
// righe[2] => "UP-003 [Operatore] permessi: timbra, gestione-turni, modifica-timbrature, gestione-utenti, config-sistema"

// ---------------------------------------------------------------------------
// 8) super e le proprieta': accessor override + campo protected condiviso
// ---------------------------------------------------------------------------

class Turno {
  // Campo protected che i figli possono leggere.
  constructor(protected codice: "P4" | "P2" | "STD") {}

  get descrizione(): string {
    return `Turno ${this.codice}`;
  }
}

class TurnoDettagliato extends Turno {
  // override anche di un getter: la firma deve restare compatibile.
  override get descrizione(): string {
    const suffisso =
      this.codice === "STD" ? "standard" : "produzione continua";
    // super.descrizione legge il getter della base.
    return `${super.descrizione} (${suffisso})`;
  }
}

// tipo: string  => "Turno P4 (produzione continua)"
const td = new TurnoDettagliato("P4").descrizione;

// ---------------------------------------------------------------------------
// 9) Classe astratta come radice della gerarchia (accenno utile)
// ---------------------------------------------------------------------------

// abstract: non istanziabile, obbliga i figli a implementare i metodi astratti.
abstract class EntitaErp {
  constructor(protected readonly badge: string) {}

  // Metodo astratto: nessun corpo, i figli DEVONO fornirlo.
  abstract tipo(): string;

  // Metodo concreto che usa quello astratto (template method pattern).
  intestazione(): string {
    return `${this.tipo()} ${this.badge}`;
  }
}

class Consulente extends EntitaErp {
  override tipo(): string {
    return "Consulente";
  }
}

// ERRORE TS: Cannot create an instance of an abstract class.
// const ent = new EntitaErp("UP-099");

const cons = new Consulente("UP-050");
// tipo: string  => "Consulente UP-050"
const int1 = cons.intestazione();

// ---------------------------------------------------------------------------
// 10) export dei simboli locali (solo di questo file)
// ---------------------------------------------------------------------------

export {
  Utente,
  Admin,
  AdminV2,
  UtenteErp,
  OperatoreErp,
  AdminErp,
  SuperAdminErp,
  Turno,
  TurnoDettagliato,
  EntitaErp,
  Consulente,
  stampaRiepilogo,
};
export type { Ruolo };

// Uso "void" sui binding di esempio per chiarire l'intento didattico e per
// evitare warning se in futuro si attivasse noUnusedLocals.
void d1;
void e1;
void s1;
void d2;
void g1;
void dr1;
void pOp;
void pAd;
void pSa;
void t1;
void righe;
void td;
void int1;

/*
 * ==========================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ==========================================================================
 * - class Figlio extends Base {}   -> eredita campi e metodi della base.
 * - super(args)                    -> chiama il constructor della base;
 *                                     OBBLIGATORIO e PRIMA di usare "this".
 * - super.metodo() / super.get     -> invoca l'implementazione della base.
 * - override metodo()              -> ridefinisce un metodo ereditato;
 *                                     TS verifica che esista nella base.
 * - noImplicitOverride             -> rende "override" obbligatoria.
 * - public                         -> accessibile ovunque (default).
 * - protected                      -> visibile in classe + sottoclassi.
 * - private                        -> visibile solo nella classe (nemmeno ai figli).
 * - readonly                       -> assegnabile solo nel constructor.
 * - parametri con modificatore     -> constructor(public x) crea+assegna il campo.
 * - abstract class / abstract m()  -> radice non istanziabile, obbliga i figli.
 * - polimorfismo                   -> un figlio e' usabile dove serve la base;
 *                                     il metodo overridato e' scelto a runtime.
 * - gerarchia ERP                  -> Utente -> Operatore -> Admin -> SuperAdmin,
 *                                     permessi() estesi via [...super.permessi()].
 * ==========================================================================
 */
