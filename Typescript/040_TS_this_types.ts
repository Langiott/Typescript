/**
 * File 040 - this types
 * ------------------------------------------------------
 * In TypeScript "this" e' un type a se stante: dentro una classe o interface
 * il polymorphic this si riferisce al tipo della sottoclasse concreta,
 * abilitando pattern fluent/builder che ritornano this. Inoltre le funzioni
 * possono dichiarare un "this parameter" (primo parametro fittizio) per
 * tipizzare il contesto di chiamata. Vediamo anche un cenno a ThisType.
 * Contesto dominio: ERP Polyuretech (Dipendente, Timbratura, Turno, ruoli).
 */

// ============================================================
// 1) Il polymorphic "this" nelle classi
// ============================================================

// "this" come return type indica "il tipo dell'istanza corrente", che nelle
// sottoclassi diventa automaticamente il tipo della sottoclasse.
class EntitaBase {
  private _dirty = false;

  // Ritornando "this" la catena resta tipizzata sulla sottoclasse concreta.
  segnaModificata(): this {
    this._dirty = true;
    return this;
  }

  get modificata(): boolean {
    return this._dirty;
  }
}

class Dipendente extends EntitaBase {
  constructor(
    public id: number,
    public nome: string,
    public badge: string, // formato "UP-001"
  ) {
    super();
  }

  rinomina(nome: string): this {
    this.nome = nome;
    return this;
  }
}

// segnaModificata e' ereditata ma ritorna un Dipendente, non un EntitaBase:
const d1 = new Dipendente(1, "Rossi", "UP-001").segnaModificata().rinomina("Bianchi");
// tipo di d1: Dipendente  (non EntitaBase) -> .rinomina resta disponibile
// => se il return type fosse EntitaBase, .rinomina non sarebbe chiamabile

// ============================================================
// 2) Fluent / builder che ritorna this
// ============================================================

// Regex di dominio riusate negli esempi.
const RE_ORARIO = /^\d{2}:\d{2}$/;
const RE_BADGE = /^UP-\d{3}$/;

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

// Builder generico: ogni metodo ritorna this cosi' le sottoclassi possono
// aggiungere metodi propri senza perdere il fluent typing.
class QueryBuilderBase {
  protected filtri: string[] = [];

  where(clausola: string): this {
    this.filtri.push(clausola);
    return this;
  }

  build(): string {
    return this.filtri.length ? `WHERE ${this.filtri.join(" AND ")}` : "";
  }
}

// Sottoclasse specializzata: aggiunge un helper di dominio.
class DipendenteQuery extends QueryBuilderBase {
  perRuolo(r: Ruolo): this {
    this.filtri.push(`ruolo = '${r}'`);
    return this;
  }

  perBadge(badge: string): this {
    if (!RE_BADGE.test(badge)) throw new Error(`badge non valido: ${badge}`);
    this.filtri.push(`badge = '${badge}'`);
    return this;
  }
}

// Grazie a "this" possiamo alternare metodi base (where) e specifici (perRuolo)
// in qualsiasi ordine senza perdere il tipo DipendenteQuery.
const q = new DipendenteQuery()
  .where("attivo = 1")
  .perRuolo("Operatore")
  .perBadge("UP-042")
  .build();
// tipo di q: string
// => "WHERE attivo = 1 AND ruolo = 'Operatore' AND badge = 'UP-042'"

// Nota: se where ritornasse QueryBuilderBase (invece di this) allora
// new DipendenteQuery().where(...).perRuolo(...) NON compilerebbe.
// ERRORE TS: Property 'perRuolo' does not exist on type 'QueryBuilderBase'.

// ============================================================
// 3) Builder concreto per una Timbratura
// ============================================================

interface Timbratura {
  badge: string;
  entrata: string; // "HH:MM" naive-UTC
  uscita: string; // "HH:MM" naive-UTC
  turno: Turno;
}

// Builder mutabile con validazione; ogni setter ritorna this.
class TimbraturaBuilder {
  private badge = "";
  private entrata = "";
  private uscita = "";
  private turno: Turno = "STD";

  conBadge(badge: string): this {
    if (!RE_BADGE.test(badge)) throw new Error(`badge non valido: ${badge}`);
    this.badge = badge;
    return this;
  }

  conEntrata(hhmm: string): this {
    if (!RE_ORARIO.test(hhmm)) throw new Error(`orario non valido: ${hhmm}`);
    this.entrata = hhmm;
    return this;
  }

  conUscita(hhmm: string): this {
    if (!RE_ORARIO.test(hhmm)) throw new Error(`orario non valido: ${hhmm}`);
    this.uscita = hhmm;
    return this;
  }

  conTurno(t: Turno): this {
    this.turno = t;
    return this;
  }

  build(): Timbratura {
    return {
      badge: this.badge,
      entrata: this.entrata,
      uscita: this.uscita,
      turno: this.turno,
    };
  }
}

const timbratura = new TimbraturaBuilder()
  .conBadge("UP-007")
  .conEntrata("08:00")
  .conUscita("17:00")
  .conTurno("P4")
  .build();
// tipo di timbratura: Timbratura
// => { badge: "UP-007", entrata: "08:00", uscita: "17:00", turno: "P4" }

// ============================================================
// 4) "this" nelle interface e nei type
// ============================================================

// Anche le interface possono usare "this" come return type polimorfico.
interface Comparabile {
  // "this" qui significa "lo stesso tipo che implementa Comparabile".
  confrontaCon(altro: this): number;
}

class Orario implements Comparabile {
  constructor(public hhmm: string) {}

  private minuti(): number {
    const [h, m] = this.hhmm.split(":").map(Number);
    return h * 60 + m;
  }

  // altro e' tipizzato come Orario (this), non come Comparabile generico.
  confrontaCon(altro: this): number {
    return this.minuti() - altro.minuti();
  }
}

const cmp = new Orario("08:30").confrontaCon(new Orario("08:00"));
// tipo di cmp: number  => 30

// ============================================================
// 5) this parameter nelle funzioni
// ============================================================

// Il "this parameter" e' un primo parametro fittizio chiamato this: NON esiste
// a runtime, serve solo a tipizzare il contesto in cui la funzione gira.
interface RepartoCtx {
  nome: string;
  capienza: number;
}

// Questa funzione puo' essere chiamata solo con "this" di tipo RepartoCtx.
function descriviReparto(this: RepartoCtx, prefisso: string): string {
  return `${prefisso}: ${this.nome} (max ${this.capienza})`;
}

const ctx: RepartoCtx = { nome: "Stampaggio", capienza: 12 };
// Chiamata corretta legando this tramite call/apply/bind:
const desc = descriviReparto.call(ctx, "Reparto");
// tipo di desc: string  => "Reparto: Stampaggio (max 12)"

// Chiamata "libera" senza contesto: errore di tipo a compile time.
// ERRORE TS: The 'this' context of type 'void' is not assignable to method's 'this' of type 'RepartoCtx'.
// descriviReparto("Reparto");

// this: void vieta esplicitamente l'uso di this dentro la funzione: utile per
// callback che non devono dipendere da alcun contesto.
function logPuro(this: void, messaggio: string): void {
  // this.nome; // ERRORE TS: 'this' implicitly has type 'void'.
  void messaggio;
}
void logPuro; // riferimento per evitare warning di simbolo inutilizzato

// ============================================================
// 6) this parameter e callback: il problema del "this perso"
// ============================================================

// Classe che espone un handler; con this parameter documentiamo il contesto.
class Contatore {
  valore = 0;

  // Metodo che usa this: se passato come callback perde il binding.
  incrementa(this: Contatore): void {
    this.valore++;
  }

  // Versione arrow: cattura this lessicalmente, resta legata all'istanza.
  incrementaSafe = (): void => {
    this.valore++;
  };
}

const c = new Contatore();
c.incrementa(); // ok, this = c  => valore 1

// Simulazione di un setTimeout: la callback viene invocata senza contesto.
type Callback = (this: void) => void;
function esegui(cb: Callback): void {
  cb();
}

// esegui(c.incrementa);
// ERRORE TS: The 'this' types of each signature are incompatible.
// (incrementa vuole this: Contatore, ma esegui fornisce this: void)

esegui(c.incrementaSafe); // ok: arrow function, this gia' legato  => valore 2
esegui(() => c.incrementa()); // ok: wrapper che rilega esplicitamente

// ============================================================
// 7) "this" come tipo in una type guard (this is ...)
// ============================================================

// Un metodo puo' restringere il tipo dell'istanza con "this is Sottotipo".
class Sessione {
  constructor(public ruolo: Ruolo | null) {}

  // Se ritorna true, il compiler sa che this e' una SessioneAutenticata.
  isAutenticata(): this is SessioneAutenticata {
    return this.ruolo !== null;
  }
}

interface SessioneAutenticata extends Sessione {
  ruolo: Ruolo; // ruolo garantito non-null
}

const s = new Sessione("Admin");
if (s.isAutenticata()) {
  // dentro il branch s.ruolo e' Ruolo (non Ruolo | null)
  const r: Ruolo = s.ruolo; // ok, narrowing avvenuto
  void r;
}

// ============================================================
// 8) Cenno a ThisType<T> (utility per oggetti-configurazione)
// ============================================================

// ThisType<T> NON produce codice: e' un marker che, dentro un object literal,
// dice al compiler quale sia il tipo di "this" nei metodi. Utile per API stile
// "options object" (Vue-like) dove i metodi accedono a stato + azioni.

// Definiamo tipi mock (nessuna libreria esterna) per l'esempio.
interface StatoTurni {
  dipendenti: string[];
}
interface AzioniTurni {
  aggiungi(nome: string): void;
  totale(): number;
}

// Il tipo del descrittore: dentro i metodi, this = StatoTurni & AzioniTurni.
type DescrittoreTurni = {
  stato: StatoTurni;
  azioni: AzioniTurni & ThisType<StatoTurni & AzioniTurni>;
};

// Funzione factory che fa il "merge" di stato e azioni.
function creaModulo(desc: DescrittoreTurni): StatoTurni & AzioniTurni {
  return Object.assign({}, desc.stato, desc.azioni);
}

const modulo = creaModulo({
  stato: { dipendenti: [] },
  azioni: {
    // grazie a ThisType, qui this.dipendenti e this.totale sono tipizzati
    aggiungi(nome: string) {
      this.dipendenti.push(nome); // this: StatoTurni & AzioniTurni
    },
    totale() {
      return this.dipendenti.length;
    },
  },
});

modulo.aggiungi("Rossi");
modulo.aggiungi("Bianchi");
const tot = modulo.totale();
// tipo di tot: number  => 2

// ============================================================
// 9) Polymorphic this con clone tipizzato
// ============================================================

// Pattern "clone" che restituisce il tipo esatto della sottoclasse.
abstract class RecordBase {
  // Il return "this" garantisce che clone() dia il tipo concreto.
  abstract clone(): this;
}

class TurnoRecord extends RecordBase {
  constructor(public codice: Turno, public ore: number) {
    super();
  }

  clone(): this {
    // Cast necessario: il costruttore concreto non e' noto in RecordBase,
    // ma per la sottoclasse foglia il tipo runtime coincide con this.
    return new TurnoRecord(this.codice, this.ore) as this;
  }
}

const t1 = new TurnoRecord("P2", 6);
const t2 = t1.clone();
// tipo di t2: TurnoRecord  => { codice: "P2", ore: 6 }
void t2;

// ============================================================
// 10) Mixin fluent: this preserva i metodi aggiunti
// ============================================================

// Chain builder di validazione: ogni regola ritorna this per comporre pipeline.
class Validatore {
  private errori: string[] = [];

  private valore: string;
  constructor(valore: string) {
    this.valore = valore;
  }

  nonVuoto(): this {
    if (this.valore.length === 0) this.errori.push("valore vuoto");
    return this;
  }

  matcha(re: RegExp, msg: string): this {
    if (!re.test(this.valore)) this.errori.push(msg);
    return this;
  }

  risultato(): string[] {
    return this.errori;
  }
}

const errori = new Validatore("UP-99")
  .nonVuoto()
  .matcha(RE_BADGE, "badge fuori formato")
  .risultato();
// tipo di errori: string[]  => ["badge fuori formato"]
void errori;

// ============================================================
// Esempi export locali (solo simboli definiti in questo file)
// ============================================================

export { Dipendente, TimbraturaBuilder, DipendenteQuery, Sessione, creaModulo };
export type { Ruolo, Turno, Timbratura, Comparabile, SessioneAutenticata };

/*
============================================================
RIEPILOGO COMANDI / CONCETTI
============================================================
- polymorphic this : "this" come type = tipo dell'istanza concreta corrente.
- return this      : abilita fluent/builder che preservano la sottoclasse.
- metodo base che ritorna this -> chiamabile in catena con metodi derivati.
- return della superclasse (non this) -> perde i metodi della sottoclasse.
- "this" in interface: confrontaCon(altro: this) = stesso tipo implementante.
- this parameter   : function f(this: T, ...) tipizza il contesto di chiamata.
- this: void       : vieta l'uso di this (callback context-free).
- "this perso"     : metodo passato come callback -> usa arrow o wrapper.
- this is Sub      : type guard che restringe il tipo dell'istanza (narrowing).
- ThisType<T>      : marker per tipizzare this nei metodi di un object literal.
- clone(): this    : ritorna il tipo esatto della sottoclasse (a volte serve cast).
- il "this parameter" NON esiste a runtime: e' solo compile-time.
============================================================
*/
