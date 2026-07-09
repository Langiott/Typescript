/**
 * File 034 - Getters/Setters in TypeScript
 * Corso TypeScript - Livello INTERMEDIATE.
 * Argomento: get/set accessor, validazione nel setter (es. oreLavorate>=0),
 * computed property (proprieta' calcolate al volo), e tipi degli accessor.
 * Contesto dominio ERP Polyuretech: Dipendente, Timbratura, orari naive-UTC "HH:MM".
 * Il file compila con: tsc --strict, target ES2022, experimentalDecorators=false, noEmit.
 */

// ---------------------------------------------------------------------------
// 1) Accessor di base: get e set
// ---------------------------------------------------------------------------
// Un accessor 'get' si usa come una proprieta' (senza parentesi) ma esegue codice.
// Un accessor 'set' intercetta l'assegnazione ( x.prop = valore ).

class Reparto {
  // Campo privato: convenzione con underscore. Vedi anche # (vero private) piu' sotto.
  private _nome: string;

  constructor(nome: string) {
    this._nome = nome;
  }

  // getter: si legge come reparto.nome (NON reparto.nome())
  get nome(): string {
    return this._nome;
  }

  // setter: si scrive come reparto.nome = "..."
  set nome(valore: string) {
    this._nome = valore.trim().toUpperCase();
  }
}

const rep = new Reparto("stampaggio");
// console.log(rep.nome); // => "STAMPAGGIO" (il set ha normalizzato)
rep.nome = "  assemblaggio  ";
// console.log(rep.nome); // => "ASSEMBLAGGIO"

// ---------------------------------------------------------------------------
// 2) Tipi degli accessor: get e set possono avere tipi DIVERSI
// ---------------------------------------------------------------------------
// TS (5.1+) permette che il tipo accettato dal setter sia piu' ampio del
// tipo restituito dal getter. Utile per "accetta molte forme, restituisci una".

class ContatoreOre {
  private _ore = 0;

  // il getter restituisce sempre number
  get ore(): number {
    return this._ore;
  }

  // il setter accetta number OPPURE una stringa numerica: tipo piu' ampio
  set ore(valore: number | string) {
    const n = typeof valore === "string" ? Number(valore) : valore;
    this._ore = Number.isFinite(n) ? n : 0;
  }
}

const c = new ContatoreOre();
c.ore = "8";        // ok: setter accetta string
c.ore = 7.5;        // ok: setter accetta number
const oreLette: number = c.ore; // tipo: number (dal getter)
// console.log(oreLette); // => 7.5

// ---------------------------------------------------------------------------
// 3) Validazione nel setter: oreLavorate >= 0
// ---------------------------------------------------------------------------
// Il setter e' il punto ideale per applicare invarianti: qui vietiamo ore negative.

class GiornataLavorativa {
  private _oreLavorate = 0;

  get oreLavorate(): number {
    return this._oreLavorate;
  }

  set oreLavorate(valore: number) {
    if (valore < 0) {
      throw new RangeError("oreLavorate non puo' essere negativo: " + valore);
    }
    if (valore > 24) {
      throw new RangeError("oreLavorate non puo' superare 24: " + valore);
    }
    this._oreLavorate = valore;
  }
}

const g = new GiornataLavorativa();
g.oreLavorate = 8; // ok
// g.oreLavorate = -3; // a runtime lancia RangeError (tipo number valido a compile-time)
// console.log(g.oreLavorate); // => 8

// ---------------------------------------------------------------------------
// 4) Solo getter = proprieta' in sola lettura (readonly dall'esterno)
// ---------------------------------------------------------------------------
// Se definisci SOLO il get, la proprieta' e' readonly: assegnarla e' errore TS.

class Badge {
  constructor(private readonly _codice: string) {}

  get codice(): string {
    return this._codice;
  }

  // getter derivato/computed: valida il pattern UP-\d{3}
  get valido(): boolean {
    return /^UP-\d{3}$/.test(this._codice);
  }
}

const b = new Badge("UP-001");
// console.log(b.codice); // => "UP-001"
// console.log(b.valido); // => true
// ERRORE TS: Cannot assign to 'codice' because it is a read-only property.
// b.codice = "UP-999";

// ---------------------------------------------------------------------------
// 5) Computed property: valore calcolato al volo dal getter
// ---------------------------------------------------------------------------
// Il getter non memorizza nulla: ricalcola ogni volta partendo da altri campi.
// Qui calcoliamo la durata in minuti tra entrata e uscita (orari "HH:MM").

const REGEX_ORARIO = /^\d{2}:\d{2}$/;

function minutiDaOrario(hhmm: string): number {
  // "HH:MM" -> minuti dalla mezzanotte
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

class Timbratura {
  private _entrata: string;
  private _uscita: string;

  constructor(entrata: string, uscita: string) {
    // riusiamo i setter nel costruttore per validare fin da subito
    this._entrata = "00:00";
    this._uscita = "00:00";
    this.entrata = entrata;
    this.uscita = uscita;
  }

  get entrata(): string {
    return this._entrata;
  }
  set entrata(valore: string) {
    if (!REGEX_ORARIO.test(valore)) {
      throw new Error("Orario entrata non valido (atteso HH:MM): " + valore);
    }
    this._entrata = valore;
  }

  get uscita(): string {
    return this._uscita;
  }
  set uscita(valore: string) {
    if (!REGEX_ORARIO.test(valore)) {
      throw new Error("Orario uscita non valido (atteso HH:MM): " + valore);
    }
    this._uscita = valore;
  }

  // computed property: nessun campo _durata, si ricalcola sempre
  get durataMinuti(): number {
    return minutiDaOrario(this._uscita) - minutiDaOrario(this._entrata);
  }

  // computed property derivata da un'altra computed property
  get durataOre(): number {
    return this.durataMinuti / 60;
  }
}

const t = new Timbratura("08:00", "17:30");
// console.log(t.durataMinuti); // => 570
// console.log(t.durataOre);    // => 9.5
t.uscita = "18:00";
// console.log(t.durataMinuti); // => 600 (ricalcolato: le computed seguono lo stato)

// ---------------------------------------------------------------------------
// 6) Caching in un getter (memoization semplice)
// ---------------------------------------------------------------------------
// A volte il calcolo e' costoso: si puo' cacheare, ma bisogna invalidare
// la cache quando cambiano gli input. Qui il set di 'testo' resetta la cache.

class AnalisiNota {
  private _testo = "";
  private _cacheParole: number | null = null;

  get testo(): string {
    return this._testo;
  }
  set testo(valore: string) {
    this._testo = valore;
    this._cacheParole = null; // invalida la cache: input cambiato
  }

  // getter con memoization
  get numeroParole(): number {
    if (this._cacheParole === null) {
      this._cacheParole = this._testo.trim() === "" ? 0 : this._testo.trim().split(/\s+/).length;
    }
    return this._cacheParole;
  }
}

const nota = new AnalisiNota();
nota.testo = "turno P4 completato senza fermi";
// console.log(nota.numeroParole); // => 5 (calcolato e messo in cache)
// console.log(nota.numeroParole); // => 5 (letto dalla cache)

// ---------------------------------------------------------------------------
// 7) Accessor con veri campi privati (#) e union type di dominio
// ---------------------------------------------------------------------------
// I campi '#' sono privati a livello di linguaggio (hard private), non solo TS.

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

class Dipendente {
  #ruolo: Ruolo;

  constructor(
    public readonly id: number,
    public nome: string,
    private _badge: string,
    ruolo: Ruolo,
  ) {
    this.#ruolo = ruolo;
  }

  get badge(): string {
    return this._badge;
  }
  set badge(valore: string) {
    if (!/^UP-\d{3}$/.test(valore)) {
      throw new Error("Badge non valido (atteso UP-XXX): " + valore);
    }
    this._badge = valore;
  }

  get ruolo(): Ruolo {
    return this.#ruolo;
  }
  set ruolo(valore: Ruolo) {
    // il tipo Ruolo blocca gia' a compile-time i valori errati
    this.#ruolo = valore;
  }

  // computed property: privilegi derivati dal ruolo
  get puoAmministrare(): boolean {
    return this.#ruolo === "SuperAdmin" || this.#ruolo === "Admin";
  }
}

const dip = new Dipendente(1, "Rossi", "UP-007", "Operatore");
// console.log(dip.puoAmministrare); // => false
dip.ruolo = "Admin";
// console.log(dip.puoAmministrare); // => true
// ERRORE TS: Type '"Capo"' is not assignable to type 'Ruolo'.
// dip.ruolo = "Capo";

// ---------------------------------------------------------------------------
// 8) Accessor statici (static get / static set)
// ---------------------------------------------------------------------------
// Anche la classe (non l'istanza) puo' avere accessor: utili per config globali.

class ConfigTurni {
  private static _turnoDefault: "P4" | "P2" | "STD" = "STD";

  static get turnoDefault(): "P4" | "P2" | "STD" {
    return ConfigTurni._turnoDefault;
  }
  static set turnoDefault(valore: "P4" | "P2" | "STD") {
    ConfigTurni._turnoDefault = valore;
  }
}

ConfigTurni.turnoDefault = "P4";
// console.log(ConfigTurni.turnoDefault); // => "P4"

// ---------------------------------------------------------------------------
// 9) Accessor in un'interfaccia? No: le interface hanno solo proprieta'
// ---------------------------------------------------------------------------
// Le interface NON distinguono get/set: descrivono solo la "forma" (property).
// Una property senza 'readonly' e' equivalente a get+set lato consumo.

interface HaOreLavorate {
  oreLavorate: number;         // implementabile con campo oppure con get+set
  readonly durataOre: number;  // 'readonly' => la classe puo' esporre solo il get
}

// La classe soddisfa l'interface usando accessor:
class RigaTimesheet implements HaOreLavorate {
  private _ore = 0;

  get oreLavorate(): number {
    return this._ore;
  }
  set oreLavorate(v: number) {
    this._ore = Math.max(0, v); // clamp: mai negativo
  }

  // solo getter => compatibile con 'readonly durataOre'
  get durataOre(): number {
    return this._ore;
  }
}

const riga: HaOreLavorate = new RigaTimesheet();
riga.oreLavorate = -5;
// console.log(riga.oreLavorate); // => 0 (clamp nel setter)
// ERRORE TS: Cannot assign to 'durataOre' because it is a read-only property.
// riga.durataOre = 10;

// ---------------------------------------------------------------------------
// 10) Accessor negli object literal (non solo nelle classi)
// ---------------------------------------------------------------------------
// Anche un oggetto plain puo' avere get/set. Il tipo viene inferito.

const orologio = {
  _minuti: 0,
  get minuti(): number {
    return this._minuti;
  },
  set minuti(v: number) {
    // normalizza in 0..1439 (minuti di una giornata)
    this._minuti = ((v % 1440) + 1440) % 1440;
  },
  // computed property: formatta in "HH:MM"
  get hhmm(): string {
    const h = Math.floor(this._minuti / 60);
    const m = this._minuti % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  },
};

orologio.minuti = 8 * 60 + 5; // 485
// console.log(orologio.hhmm); // => "08:05"
orologio.minuti = -10;        // wrap-around
// console.log(orologio.hhmm); // => "23:50"

// ---------------------------------------------------------------------------
// 11) Override di accessor in sottoclasse
// ---------------------------------------------------------------------------
// Una sottoclasse puo' ridefinire un getter (es. aggiungere un prefisso).

class EntitaBase {
  constructor(protected _label: string) {}
  get label(): string {
    return this._label;
  }
}

class EntitaReparto extends EntitaBase {
  // override: arricchisce il getter della base
  override get label(): string {
    return "[REPARTO] " + this._label;
  }
}

const er = new EntitaReparto("Verniciatura");
// console.log(er.label); // => "[REPARTO] Verniciatura"

// ---------------------------------------------------------------------------
// 12) Nota sui decorator (@) con experimentalDecorators=false
// ---------------------------------------------------------------------------
// Con experimentalDecorators DISATTIVATO la sintassi @decorator sugli accessor
// NON e' mostrabile come codice compilabile qui. Esempio SOLO nei commenti:
//
//   class Esempio {
//     @log            // <- NON compila in questa config: solo illustrativo
//     get valore() { return 42; }
//   }
//
// I moderni "auto-accessor" ( accessor x = 0 ) fanno parte dei decorator stage-3
// e non vengono trattati qui.

// ---------------------------------------------------------------------------
// Export di simboli LOCALI (solo cose definite in questo file)
// ---------------------------------------------------------------------------
export {
  Reparto,
  ContatoreOre,
  GiornataLavorativa,
  Badge,
  Timbratura,
  AnalisiNota,
  Dipendente,
  ConfigTurni,
  RigaTimesheet,
  minutiDaOrario,
};
export type { Ruolo, HaOreLavorate };

/*
 * ==========================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ==========================================================================
 * - get prop(): T        -> accessor di lettura, si usa come prop (no parentesi)
 * - set prop(v: U)       -> accessor di scrittura, intercetta prop = v
 * - Tipi diversi         -> il set puo' accettare tipo piu' ampio del get (TS 5.1+)
 * - Solo get             -> proprieta' readonly: assegnarla e' ERRORE TS
 * - Validazione nel set   -> punto ideale per invarianti (oreLavorate>=0, regex orario/badge)
 * - Computed property    -> getter che ricalcola dallo stato, nessun campo dedicato
 * - Memoization          -> cache nel getter + invalidazione nel setter
 * - #campo               -> hard private (linguaggio), vs _campo (convenzione TS)
 * - static get/set       -> accessor a livello di classe (config globali)
 * - interface            -> solo property (readonly => richiede almeno il get)
 * - Object literal        -> get/set anche su oggetti plain
 * - override get         -> sottoclasse puo' ridefinire un accessor
 * - @decorator           -> NON compila con experimentalDecorators=false (solo commenti)
 * - Regole ERP           -> orario /^\d{2}:\d{2}$/, badge /^UP-\d{3}$/, Ruolo union type
 * ==========================================================================
 */
