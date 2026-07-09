/**
 * File 038 - Implements Interface
 * Corso TypeScript (livello INTERMEDIATE) - Polyuretech ERP.
 * Argomento: la keyword "implements" per far rispettare a una class il
 * "contract" definito da una o piu' interface, con esempi su Repository,
 * Dipendente, Timbratura. Vediamo multiple interface, la differenza tra
 * "extends" ed "implements" e i pattern tipici (class Repo implements IRepository).
 * Tutti i commenti sono in italiano senza lettere accentate (uso l'apostrofo ASCII).
 */

// ---------------------------------------------------------------------------
// 1. Tipi di dominio ERP condivisi in tutto il file
// ---------------------------------------------------------------------------

// Union dei ruoli applicativi.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Turni possibili di un dipendente.
type Turno = "P4" | "P2" | "STD";

// Entita' base del dominio.
interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
}

// Timbratura con orari naive-UTC salvati come stringa "HH:MM".
interface Timbratura {
  dipendenteId: number;
  entrata: string; // "08:00"
  uscita: string; // "17:00"
}

// ---------------------------------------------------------------------------
// 2. "implements": la class promette di rispettare la forma dell'interface
// ---------------------------------------------------------------------------

// Un'interface descrive SOLO la forma; non contiene implementazione.
interface Badge {
  readonly codice: string; // "UP-001"
  valido(): boolean;
}

// La class DEVE fornire tutti i membri richiesti dall'interface, altrimenti errore.
class BadgeDipendente implements Badge {
  // "readonly codice" soddisfa il contract; qui e' un parameter property.
  constructor(public readonly codice: string) {}

  valido(): boolean {
    return /^UP-\d{3}$/.test(this.codice);
  }
}

const b1 = new BadgeDipendente("UP-007");
// b1.valido() => true
// b1.codice tipo: string (readonly)

// Se dimentico un membro, TS segnala l'errore al momento della dichiarazione.
// ERRORE TS: Class 'Rotto' incorrectly implements interface 'Badge'.
//   Property 'valido' is missing in type 'Rotto'.
// class Rotto implements Badge {
//   readonly codice = "UP-001";
// }

// ---------------------------------------------------------------------------
// 3. implements NON aggiunge tipi: devi comunque annotare i membri
// ---------------------------------------------------------------------------

// "implements" e' solo un CHECK: non copia i tipi dell'interface nella class.
// I parametri restano "any implicito" se non li annoti (in strict e' errore).
interface Calcolatore {
  somma(a: number, b: number): number;
}

class CalcOre implements Calcolatore {
  // Devo riscrivere i tipi: implements non li inietta automaticamente.
  somma(a: number, b: number): number {
    return a + b;
  }
}
// new CalcOre().somma(4, 4) => 8

// ---------------------------------------------------------------------------
// 4. Multiple interface: una class puo' implementarne piu' di una
// ---------------------------------------------------------------------------

// Separi le interface con la virgola: la class deve soddisfarle TUTTE.
interface Identificabile {
  id: number;
}

interface Timbrabile {
  timbra(orario: string): void;
}

interface Serializzabile {
  toJSON(): string;
}

// Questa class rispetta tre contract contemporaneamente.
class DipendenteAttivo implements Identificabile, Timbrabile, Serializzabile {
  private timbrature: string[] = [];

  constructor(public id: number, public nome: string) {}

  timbra(orario: string): void {
    // Valido l'orario naive-UTC "HH:MM" prima di registrarlo.
    if (/^\d{2}:\d{2}$/.test(orario)) {
      this.timbrature.push(orario);
    }
  }

  toJSON(): string {
    return JSON.stringify({ id: this.id, nome: this.nome, timbrature: this.timbrature });
  }
}

const da = new DipendenteAttivo(1, "Rossi");
da.timbra("08:00");
da.timbra("orario-non-valido"); // ignorato dal regex
// da.toJSON() => '{"id":1,"nome":"Rossi","timbrature":["08:00"]}'

// ---------------------------------------------------------------------------
// 5. Differenza extends vs implements
// ---------------------------------------------------------------------------

// "extends" (tra class) EREDITA implementazione e stato: riusi il codice.
// "implements" (class -> interface) NON eredita nulla: promette solo la forma.
//
//   class B extends A        -> B ottiene i membri concreti di A
//   class B implements I     -> B deve DEFINIRE da sola i membri di I
//
// Una class puo' fare entrambe le cose insieme: extends UNA class + implements N interface.

class EntitaBase {
  // Implementazione condivisa ereditata dalle sottoclassi.
  protected creataIl: string = "2026-07-08";
  descrizione(): string {
    return `Entita creata il ${this.creataIl}`;
  }
}

// Sintassi: prima extends (una sola), poi implements (una o piu').
class Reparto extends EntitaBase implements Identificabile, Serializzabile {
  constructor(public id: number, public nome: string) {
    super();
  }
  // descrizione() e' ereditata da EntitaBase: non serve riscriverla.
  toJSON(): string {
    return JSON.stringify({ id: this.id, nome: this.nome, creato: this.creataIl });
  }
}

const rep = new Reparto(3, "Produzione");
// rep.descrizione() => "Entita creata il 2026-07-08"  (ereditata)
// rep.id tipo: number  (da Identificabile / dalla class stessa)

// Nota: "interface extends interface" e' invece composizione di forme (non class).
interface DipendenteConTurno extends Dipendente {
  turno: Turno;
}
// DipendenteConTurno richiede id, nome, badge, ruolo E turno.

// ---------------------------------------------------------------------------
// 6. Il pattern classico: class Repo implements IRepository
// ---------------------------------------------------------------------------

// Definiamo il "contract" del repository come interface generic.
// Cosi' possiamo avere piu' implementazioni (in-memory, DB, mock) intercambiabili.
interface IRepository<T> {
  getAll(): T[];
  getById(id: number): T | undefined;
  add(item: T): void;
  remove(id: number): boolean;
}

// Vincolo: gli item devono avere un id numerico (usiamo Identificabile).
// Implementazione in-memory che rispetta il contract IRepository.
class InMemoryRepository<T extends Identificabile> implements IRepository<T> {
  private items: T[] = [];

  getAll(): T[] {
    return [...this.items];
  }

  getById(id: number): T | undefined {
    return this.items.find((x) => x.id === id);
  }

  add(item: T): void {
    this.items.push(item);
  }

  remove(id: number): boolean {
    const prima = this.items.length;
    this.items = this.items.filter((x) => x.id !== id);
    return this.items.length < prima;
  }
}

// Uso concreto sul dominio ERP: un repository di Dipendenti.
const repoDip = new InMemoryRepository<Dipendente>();
repoDip.add({ id: 1, nome: "Bianchi", badge: "UP-001", ruolo: "Operatore" });
repoDip.add({ id: 2, nome: "Verdi", badge: "UP-002", ruolo: "Admin" });
// repoDip.getById(1)?.nome => "Bianchi"
// repoDip.remove(2) => true
// repoDip.getAll().length => 1  (dopo la remove)

// Poiche' il codice dipende dall'interface (non dalla class concreta),
// posso sostituire l'implementazione senza toccare i consumatori.
function contaRecord<T>(repo: IRepository<T>): number {
  return repo.getAll().length;
}
// contaRecord(repoDip) => 1

// ---------------------------------------------------------------------------
// 7. implements con interface che descrive anche il "constructor"? No.
// ---------------------------------------------------------------------------

// ATTENZIONE: "implements" verifica solo la parte ISTANZA della class.
// I membri "static" (incluso il constructor) NON sono controllati da implements.
interface HaCostruttore {
  // Questa firma descrive lato istanza, non il constructor.
  crea(nome: string): Dipendente;
}

class FabbricaDipendenti implements HaCostruttore {
  private prossimoId = 1;
  crea(nome: string): Dipendente {
    return {
      id: this.prossimoId++,
      nome,
      badge: `UP-${String(this.prossimoId).padStart(3, "0")}`,
      ruolo: "Operatore",
    };
  }
}
// new FabbricaDipendenti().crea("Neri").badge => "UP-002"

// Per vincolare il lato static si usano le "construct signature" (argomento a parte).

// ---------------------------------------------------------------------------
// 8. implements per garantire compatibilita' con piu' "ruoli" a runtime
// ---------------------------------------------------------------------------

// interface come "capability": una class dichiara cosa sa fare.
interface Loggabile {
  log(): string;
}

interface Validabile {
  isValido(): boolean;
}

// Combino piu' capability in una sola class di servizio.
class ServizioTimbratura implements Loggabile, Validabile {
  constructor(private t: Timbratura) {}

  isValido(): boolean {
    const ok = /^\d{2}:\d{2}$/;
    return ok.test(this.t.entrata) && ok.test(this.t.uscita);
  }

  log(): string {
    return `Timbratura dip ${this.t.dipendenteId}: ${this.t.entrata}-${this.t.uscita}`;
  }
}

const st = new ServizioTimbratura({ dipendenteId: 1, entrata: "08:00", uscita: "17:00" });
// st.isValido() => true
// st.log() => "Timbratura dip 1: 08:00-17:00"

// Funzione che accetta QUALSIASI oggetto Loggabile (duck typing sul contract).
function stampa(x: Loggabile): void {
  // In un'app reale: console.log(x.log());
  void x.log();
}
stampa(st); // ok: ServizioTimbratura e' Loggabile

// ---------------------------------------------------------------------------
// 9. implements e membri opzionali / readonly
// ---------------------------------------------------------------------------

// Se l'interface ha una proprieta' opzionale, la class puo' ometterla.
interface FiltroTurno {
  turno: Turno;
  soloAttivi?: boolean; // opzionale
  readonly reparto: string; // deve restare readonly
}

class FiltroStandard implements FiltroTurno {
  turno: Turno = "STD";
  // soloAttivi omesso: e' consentito perche' opzionale.
  readonly reparto: string = "Produzione";
}
// new FiltroStandard().turno => "STD"
// ERRORE TS: Cannot assign to 'reparto' because it is a read-only property.
// new FiltroStandard().reparto = "Magazzino";

// ---------------------------------------------------------------------------
// 10. Attenzione: implements non "restringe" i tipi di ritorno visibili
// ---------------------------------------------------------------------------

// La class puo' avere membri IN PIU' rispetto all'interface: implements chiede
// il minimo garantito, non l'uguaglianza esatta.
interface SoloId {
  id: number;
}

class RigaEstesa implements SoloId {
  constructor(public id: number, public extra: string) {}
}

const re = new RigaEstesa(9, "note");
// re.id => 9 ; re.extra => "note"  (extra e' un membro aggiuntivo, ammesso)

// Ma se tipizzi la variabile con l'interface, vedi SOLO cio' che promette.
const soloId: SoloId = re;
// soloId.id => 9
// ERRORE TS: Property 'extra' does not exist on type 'SoloId'.
// soloId.extra;

// ---------------------------------------------------------------------------
// 11. Esporto i simboli locali per l'uso didattico in altri esempi
// ---------------------------------------------------------------------------

export {
  BadgeDipendente,
  DipendenteAttivo,
  Reparto,
  InMemoryRepository,
  FabbricaDipendenti,
  ServizioTimbratura,
};

export type {
  Ruolo,
  Turno,
  Dipendente,
  Timbratura,
  Badge,
  IRepository,
  Identificabile,
  Loggabile,
  Validabile,
};

// ---------------------------------------------------------------------------
// RIEPILOGO COMANDI / CONCETTI
// ---------------------------------------------------------------------------
// - implements: la class promette di rispettare la FORMA di una interface.
// - Membro mancante -> "incorrectly implements interface ... is missing".
// - implements e' solo un CHECK: NON inietta i tipi; annota comunque i membri.
// - Multiple interface: class C implements I1, I2, I3 (deve soddisfarle tutte).
// - extends (class->class): EREDITA implementazione/stato.
// - implements (class->interface): NON eredita nulla, definisci tu i membri.
// - Combinabili: class B extends A implements I1, I2 (una extends, N implements).
// - interface extends interface: composizione di forme (non riguarda class).
// - Pattern: class Repo implements IRepository<T> -> implementazioni sostituibili.
// - Dipendi dall'interface (IRepository), non dalla class concreta (DIP).
// - implements verifica il lato ISTANZA, non static/constructor.
// - Proprieta' opzionali (?) omettibili; readonly resta readonly nella class.
// - La class puo' avere membri IN PIU'; con tipo=interface vedi solo il contract.
