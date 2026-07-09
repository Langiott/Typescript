/**
 * File 035 - Static Members (membri statici)
 * Corso TypeScript - livello INTERMEDIATE.
 * I membri static appartengono alla CLASSE, non alle istanze: si accede con
 * NomeClasse.membro. Utili per contatori globali, factory, costanti condivise
 * e inizializzazioni una-tantum (static block). Contesto ERP Polyuretech:
 * Dipendente, Reparto, badge "UP-001", ruoli, turni.
 * Nota: nessuna libreria esterna, tutti i tipi mock sono definiti qui.
 */

// ---------------------------------------------------------------------------
// 1) STATIC FIELD e STATIC METHOD di base
// ---------------------------------------------------------------------------

// Un static field vive sulla classe: uno solo, condiviso da tutte le istanze.
// Un static method non ha accesso a 'this' di istanza, ma a 'this' = classe.
class Azienda {
  static readonly ragioneSociale = "Polyuretech S.r.l."; // costante di classe
  static sedeLegale = "Roma"; // static field modificabile

  // static method: si chiama su Azienda, non su un'istanza
  static descrizione(): string {
    return `${Azienda.ragioneSociale} - ${Azienda.sedeLegale}`;
  }
}

// Accesso senza 'new': tipo string
const rag = Azienda.ragioneSociale; // tipo: "Polyuretech S.r.l." (literal readonly)
const desc = Azienda.descrizione(); // => "Polyuretech S.r.l. - Roma"

// ERRORE TS: la readonly non e' riassegnabile
// Azienda.ragioneSociale = "Altro"; // ERRORE TS: Cannot assign to 'ragioneSociale'

Azienda.sedeLegale = "Milano"; // ok, non e' readonly

// ---------------------------------------------------------------------------
// 2) CONTATORE DI ISTANZE con static field
// ---------------------------------------------------------------------------

// Pattern classico: contare quante istanze sono state create.
// Il contatore e' UNICO perche' vive sulla classe, non su ogni oggetto.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

class Dipendente {
  static conteggio = 0; // condiviso da tutte le istanze
  readonly id: number;

  constructor(
    public nome: string,
    public badge: string,
    public ruolo: Ruolo,
  ) {
    Dipendente.conteggio += 1; // incremento a ogni new
    this.id = Dipendente.conteggio; // id progressivo derivato dal contatore
  }

  // static method che legge lo stato di classe
  static quanti(): number {
    return Dipendente.conteggio;
  }
}

const d1 = new Dipendente("Rossi", "UP-001", "Operatore");
const d2 = new Dipendente("Bianchi", "UP-002", "Admin");
console.log(d1.id, d2.id); // => 1 2
console.log(Dipendente.quanti()); // => 2
console.log(Dipendente.conteggio); // => 2

// ---------------------------------------------------------------------------
// 3) FACTORY STATICA (static factory method)
// ---------------------------------------------------------------------------

// Un metodo statico che costruisce e ritorna un'istanza, spesso con
// validazione. Vantaggio: nome espressivo + logica di parsing centralizzata.
const RE_BADGE = /^UP-\d{3}$/;
const RE_ORARIO = /^\d{2}:\d{2}$/;

class Utente {
  private constructor(
    public readonly badge: string,
    public readonly ruolo: Ruolo,
  ) {}

  // factory: valida il badge prima di costruire. Il constructor e' private,
  // quindi si e' OBBLIGATI a passare dalla factory.
  static crea(badge: string, ruolo: Ruolo): Utente {
    if (!RE_BADGE.test(badge)) {
      throw new Error(`Badge non valido: ${badge} (atteso UP-000)`);
    }
    return new Utente(badge, ruolo);
  }

  // factory alternativa: crea un QrDisplay senza dover ripetere il ruolo
  static creaQrDisplay(badge: string): Utente {
    return Utente.crea(badge, "QrDisplay");
  }
}

const u1 = Utente.crea("UP-010", "SuperAdmin"); // tipo: Utente
const u2 = Utente.creaQrDisplay("UP-099"); // ruolo: "QrDisplay"
console.log(u1.badge, u2.ruolo); // => UP-010 QrDisplay

// ERRORE TS: il constructor e' private, non si usa direttamente
// const bad = new Utente("UP-000", "Admin"); // ERRORE TS: Constructor of class 'Utente' is private

// ---------------------------------------------------------------------------
// 4) STATIC FACTORY con parsing di stringhe (Timbratura)
// ---------------------------------------------------------------------------

// Orari come stringhe naive-UTC "HH:MM". La factory valida il formato.
class Timbratura {
  private constructor(
    public readonly entrata: string,
    public readonly uscita: string,
  ) {}

  static da(entrata: string, uscita: string): Timbratura {
    for (const o of [entrata, uscita]) {
      if (!RE_ORARIO.test(o)) {
        throw new Error(`Orario non valido: ${o} (atteso HH:MM)`);
      }
    }
    return new Timbratura(entrata, uscita);
  }

  // calcolo minuti lavorati usando parsing naive (nessun fuso)
  minutiLavorati(): number {
    const [he, me] = this.entrata.split(":").map(Number);
    const [hu, mu] = this.uscita.split(":").map(Number);
    return hu * 60 + mu - (he * 60 + me);
  }
}

const t1 = Timbratura.da("08:00", "17:30");
console.log(t1.minutiLavorati()); // => 570

// ---------------------------------------------------------------------------
// 5) STATIC BLOCK: inizializzazione una-tantum (ES2022)
// ---------------------------------------------------------------------------

// Lo static block gira UNA volta, quando la classe viene valutata.
// Serve per inizializzare static field con logica complessa o con try/catch.
class ConfigTurni {
  static turni: readonly string[]; // (assegnato una sola volta nello static block)
  static minutiPerTurno: Readonly<Record<string, number>>; // (assegnato una sola volta nello static block)

  // static block: puo' contenere piu' istruzioni, ha accesso ai membri privati
  static {
    const base: Record<string, number> = { STD: 480, P4: 240, P2: 120 };
    ConfigTurni.turni = Object.keys(base); // ["STD","P4","P2"]
    ConfigTurni.minutiPerTurno = base; // congelato logicamente da Readonly
  }

  static minuti(turno: string): number {
    return ConfigTurni.minutiPerTurno[turno] ?? 0;
  }
}

console.log(ConfigTurni.turni); // => ["STD","P4","P2"]
console.log(ConfigTurni.minuti("P4")); // => 240
console.log(ConfigTurni.minuti("XX")); // => 0

// ---------------------------------------------------------------------------
// 6) COSTANTI REPARTI statiche (registry di dominio)
// ---------------------------------------------------------------------------

// Interfaccia mock per un reparto (nessuna dipendenza esterna).
interface Reparto {
  readonly codice: string;
  readonly nome: string;
  readonly turno: "STD" | "P4" | "P2";
}

// Classe usata come "namespace" di sole costanti + lookup statici.
class Reparti {
  // 'as const' rende i literal readonly e restringe i type
  static readonly PRODUZIONE = {
    codice: "PROD",
    nome: "Produzione",
    turno: "P4",
  } as const satisfies Reparto;

  static readonly MAGAZZINO = {
    codice: "MAG",
    nome: "Magazzino",
    turno: "STD",
  } as const satisfies Reparto;

  static readonly QUALITA = {
    codice: "QUAL",
    nome: "Qualita",
    turno: "P2",
  } as const satisfies Reparto;

  // registro completo per iterazione
  static readonly TUTTI: readonly Reparto[] = [
    Reparti.PRODUZIONE,
    Reparti.MAGAZZINO,
    Reparti.QUALITA,
  ];

  // lookup statico per codice
  static byCodice(codice: string): Reparto | undefined {
    return Reparti.TUTTI.find((r) => r.codice === codice);
  }
}

console.log(Reparti.PRODUZIONE.turno); // tipo: "P4"  => P4
console.log(Reparti.TUTTI.length); // => 3
console.log(Reparti.byCodice("MAG")?.nome); // => Magazzino
console.log(Reparti.byCodice("ZZZ")); // => undefined

// ERRORE TS: le costanti sono readonly, non riassegnabili
// Reparti.PRODUZIONE = Reparti.MAGAZZINO; // ERRORE TS: Cannot assign to 'PRODUZIONE'

// ---------------------------------------------------------------------------
// 7) STATIC + generics: cache/registry generica
// ---------------------------------------------------------------------------

// Un metodo statico generico non dipende dal type parameter della classe:
// riceve il proprio <T> a ogni chiamata.
class Registry<T> {
  private items: T[] = [];

  add(item: T): void {
    this.items.push(item);
  }

  tutti(): readonly T[] {
    return this.items;
  }

  // static generico indipendente: costruisce un Registry pre-popolato
  static di<U>(...iniziali: U[]): Registry<U> {
    const r = new Registry<U>();
    for (const i of iniziali) r.add(i);
    return r;
  }
}

const regBadge = Registry.di("UP-001", "UP-002"); // Registry<string>
regBadge.add("UP-003");
console.log(regBadge.tutti()); // => ["UP-001","UP-002","UP-003"]

// ---------------------------------------------------------------------------
// 8) STATIC e ereditarieta': i membri statici si ereditano
// ---------------------------------------------------------------------------

class Entita {
  static prefisso = "ENT";
  static etichetta(): string {
    // 'this' in un static method e' la classe (anche la sottoclasse)
    return `${this.prefisso}:static`;
  }
}

class Ordine extends Entita {
  static override prefisso = "ORD"; // shadowing del field statico
}

console.log(Entita.etichetta()); // => ENT:static
console.log(Ordine.etichetta()); // => ORD:static (this = Ordine)

// ---------------------------------------------------------------------------
// 9) Differenza static vs istanza (stesso nome, spazi separati)
// ---------------------------------------------------------------------------

// Un nome static e uno di istanza NON collidono: vivono in scope diversi.
class Contatore {
  static totale = 0; // sulla classe
  valore = 0; // su ogni istanza

  incrementa(): void {
    this.valore += 1; // istanza
    Contatore.totale += 1; // classe
  }
}

const c1 = new Contatore();
const c2 = new Contatore();
c1.incrementa();
c1.incrementa();
c2.incrementa();
console.log(c1.valore, c2.valore); // => 2 1
console.log(Contatore.totale); // => 3 (somma globale)

// ---------------------------------------------------------------------------
// 10) Export dei simboli locali per riuso didattico
// ---------------------------------------------------------------------------

export {
  Azienda,
  Dipendente,
  Utente,
  Timbratura,
  ConfigTurni,
  Reparti,
  Registry,
  Contatore,
};
export type { Ruolo, Reparto };

// ===========================================================================
// RIEPILOGO COMANDI / CONCETTI
// ---------------------------------------------------------------------------
// - static field/method: appartengono alla CLASSE, accesso NomeClasse.membro.
// - static readonly: costante di classe, non riassegnabile.
// - Contatore istanze: static field incrementato nel constructor.
// - Factory statica: static crea(...) + constructor private -> validazione forzata.
// - static block { }: init una-tantum (ES2022), accede ai membri privati.
// - Costanti di dominio: static readonly ... as const satisfies Tipo.
// - Registry/lookup: static TUTTI + static byCodice().
// - static generico: static di<U>(...) ha il proprio type param, non quello della classe.
// - Ereditarieta': i membri static si ereditano; 'this' in static = la classe chiamante.
// - static vs istanza: nomi in scope separati, non collidono.
// - 'this' in static method = costruttore/classe (utile con override).
// ===========================================================================
