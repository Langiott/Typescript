/**
 * 076_TS_ADV_Mixins.ts
 * Corso TypeScript - File 76 - ADV Mixins
 * Il mixin pattern permette di comporre classi combinando piu' "frammenti"
 * di comportamento riutilizzabile, senza ereditarieta' singola rigida.
 * In TypeScript si realizza con class expression + il type Constructor,
 * una funzione applicaMixin che estende una classe base, e mixin tipici
 * come Timestamped e Serializable applicati a entita' ERP (Dipendente,
 * Timbratura). Vediamo il pattern dal caso base a quello type-safe avanzato.
 */

// ---------------------------------------------------------------------------
// 0) HELPER DI TIPO PER TEST (usati per verificare i tipi a compile-time)
// ---------------------------------------------------------------------------

// Equal<A, B>: true se A e B sono lo stesso type (confronto strutturale profondo).
// Il trucco dei due generic condizionali con (<T>() => ...) forza TypeScript a
// confrontare i type in modo invariante, cogliendo differenze che un semplice
// "A extends B ? B extends A" non vedrebbe (es. readonly, any, unioni).
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect<T>: compila solo se T e' esattamente true. Serve come "assert di tipo".
type Expect<T extends true> = T;

// Esempio d'uso degli helper:
type _t0 = Expect<Equal<string, string>>; // ok, compila
// type _t0bad = Expect<Equal<string, number>>; // ERRORE TS: 'false' non soddisfa 'true'

// ---------------------------------------------------------------------------
// 1) IL TYPE Constructor: il mattone fondamentale dei mixin
// ---------------------------------------------------------------------------

// Un Constructor e' "qualunque cosa si possa chiamare con new".
// La firma (...args: any[]) => T descrive un costruttore che accetta
// argomenti arbitrari e produce un'istanza di tipo T.
type Constructor<T = {}> = new (...args: any[]) => T;

// Variante astratta: accetta ANCHE classi abstract (che non hanno 'new' concreto).
// Utile quando la base potrebbe essere abstract; i mixin la rendono concreta.
type AbstractConstructor<T = {}> = abstract new (...args: any[]) => T;

// Perche' (...args: any[]) e non un tuple tipizzato? Perche' un mixin deve
// poter avvolgere QUALSIASI classe, indipendentemente dai parametri del suo
// costruttore. any[] qui e' intenzionale e idiomatico (lo dice anche il TS handbook).

// ---------------------------------------------------------------------------
// 2) ENTITA' ERP DI BASE (le classi che verranno arricchite dai mixin)
// ---------------------------------------------------------------------------

// Ruoli come union literal: single source of truth per i permessi.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Entita' Dipendente: la classe "base" pulita, senza infrastruttura.
class Dipendente {
  constructor(
    public id: number,
    public nome: string,
    public badge: string, // formato "UP-001"
    public ruolo: Ruolo,
  ) {}

  descrizione(): string {
    return `#${this.id} ${this.nome} [${this.badge}] (${this.ruolo})`;
  }
}

const d0 = new Dipendente(1, "Rossi", "UP-001", "Operatore");
// d0.descrizione() // => "#1 Rossi [UP-001] (Operatore)"

// ---------------------------------------------------------------------------
// 3) PRIMO MIXIN: Timestamped (aggiunge createdAt / touch())
// ---------------------------------------------------------------------------

// Un mixin e' una FUNZIONE che prende un Constructor e ritorna una class
// expression che lo estende. La classe anonima e' il "frammento" iniettato.
function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    // Nota: i campi del mixin convivono con quelli della base.
    createdAt: Date = new Date();
    updatedAt: Date = new Date();

    // Aggiorna il timestamp di modifica e ritorna this per il chaining.
    touch(): this {
      this.updatedAt = new Date();
      return this;
    }
  };
}

// Applichiamo il mixin: DipendenteTs "e'" un Dipendente + Timestamped.
const DipendenteTs = Timestamped(Dipendente);
const d1 = new DipendenteTs(2, "Bianchi", "UP-002", "Admin");
// d1.nome     // tipo: string    (dalla base)
// d1.createdAt // tipo: Date      (dal mixin)
// d1.touch()  // tipo: DipendenteTs (this), consente chaining
// d1.touch().descrizione(); // ok: chaining base+mixin

// PERCHE' funziona l'inferenza: 'extends Base' fa si' che la class expression
// erediti staticamente tutti i membri di Base; il generic TBase preserva il
// type esatto della base cosi' d1.nome resta 'string' e non si perde.

// ---------------------------------------------------------------------------
// 4) SECONDO MIXIN: Serializable (toJSON tipizzato)
// ---------------------------------------------------------------------------

// Interface che descrive la CAPACITA' aggiunta dal mixin.
// Esporla come type separato serve per vincolare parametri (vedi sezione 7).
interface ISerializable {
  toJSONString(): string;
  clone(): this;
}

// Il mixin restituisce una classe che implementa ISerializable.
function Serializable<TBase extends Constructor>(Base: TBase) {
  return class extends Base implements ISerializable {
    toJSONString(): string {
      // Serializza tutte le proprieta' enumerabili dell'istanza.
      return JSON.stringify(this);
    }

    clone(): this {
      // Ricostruisce un'istanza dello stesso type copiando le proprieta'.
      // Object.create preserva il prototype (quindi i metodi restano).
      const copy = Object.create(Object.getPrototypeOf(this));
      Object.assign(copy, this);
      return copy;
    }
  };
}

const DipSerial = Serializable(Dipendente);
const d2 = new DipSerial(3, "Verdi", "UP-003", "SuperAdmin");
// d2.toJSONString() // => '{"id":3,"nome":"Verdi","badge":"UP-003","ruolo":"SuperAdmin"}'
// const d2b = d2.clone(); // tipo: DipSerial

// ---------------------------------------------------------------------------
// 5) COMPOSIZIONE DI PIU' MIXIN (mixin che si impilano)
// ---------------------------------------------------------------------------

// I mixin si compongono per funzione: Serializable(Timestamped(Dipendente)).
// L'ordine determina quale classe avvolge quale (il piu' esterno vede tutto).
const DipFull = Serializable(Timestamped(Dipendente));
const d3 = new DipFull(4, "Neri", "UP-004", "QrDisplay");

// Ora d3 ha membri da TUTTI e tre i livelli:
// d3.descrizione()   // dalla base Dipendente
// d3.touch()         // da Timestamped
// d3.toJSONString()  // da Serializable
// d3.createdAt       // tipo: Date
// d3.touch().toJSONString(); // chaining cross-mixin: ok

// Test di tipo: verifichiamo che l'istanza abbia davvero createdAt: Date.
type _t1 = Expect<Equal<typeof d3.createdAt, Date>>; // ok

// ---------------------------------------------------------------------------
// 6) FUNZIONE applicaMixin GENERICA (comporre una lista di mixin)
// ---------------------------------------------------------------------------

// Un "mixin factory" e' una funzione (Base) => classe-estesa.
// Tipizziamola: prende un Constructor e ne ritorna un altro (arricchito).
type MixinFactory = <B extends Constructor>(Base: B) => Constructor;

// applicaMixin: applica in sequenza una lista di factory alla base.
// Nota: la reduce compone left-to-right, come le chiamate annidate.
function applicaMixin<B extends Constructor>(
  Base: B,
  ...factories: MixinFactory[]
): Constructor {
  return factories.reduce((acc, factory) => factory(acc), Base as Constructor);
}

// Limite: il type di ritorno qui e' Constructor "generico" (perde i membri
// specifici). E' il classico trade-off dei mixin variadici: senza tuple types
// avanzati TypeScript non sa comporre N interfacce in ordine.
// const DipVar = applicaMixin(Dipendente, Timestamped, Serializable);
// new DipVar(...) // istanza tipizzata come {} generico -> poco utile

// SOLUZIONE PRAGMATICA: comporre a mano (annidato) mantiene i type esatti.
// Le composizioni annidate (sezione 5) sono quindi preferibili quando conta
// l'inferenza dei membri. applicaMixin resta utile a runtime o con cast.

// ---------------------------------------------------------------------------
// 7) VINCOLARE LA BASE: mixin che richiedono certi membri (constrained mixin)
// ---------------------------------------------------------------------------

// Un mixin puo' PRETENDERE che la base abbia gia' certe proprieta'.
// Qui il vincolo e' Constructor<{ badge: string }>: la base DEVE avere 'badge'.
function WithBadgeValidation<TBase extends Constructor<{ badge: string }>>(
  Base: TBase,
) {
  // Diamo un NOME alla class expression: cosi' possiamo riferirci ai suoi
  // membri STATIC (BADGE_RE) da dentro i metodi. Con la classe anonima il
  // nome della funzione mixin NON espone i static della classe interna.
  return class WithBadge extends Base {
    // Regex badge ERP: "UP-" seguito da 3 cifre.
    private static readonly BADGE_RE = /^UP-\d{3}$/;

    badgeValido(): boolean {
      // this.badge e' visibile e tipizzato string grazie al vincolo sulla base.
      return WithBadge.BADGE_RE.test(this.badge);
    }
  };
}

const DipBadge = WithBadgeValidation(Dipendente);
const d4 = new DipBadge(5, "Gialli", "UP-005", "Operatore");
// d4.badgeValido() // => true
// d4b con badge "X-1" darebbe badgeValido() === false

// Se la base NON avesse 'badge', il vincolo scatterebbe:
class SenzaBadge {
  constructor(public nome: string) {}
}
// const bad = WithBadgeValidation(SenzaBadge);
// ERRORE TS: 'SenzaBadge' non soddisfa il vincolo 'Constructor<{ badge: string }>'
//            (Property 'badge' is missing)

// ---------------------------------------------------------------------------
// 8) ESEMPIO ERP REALISTICO: Timbratura + mixin di validazione orario
// ---------------------------------------------------------------------------

// Turni come union: influiscono su regole di calcolo (non mostrate qui).
type Turno = "P4" | "P2" | "STD";

// Timbratura con orari naive-UTC come stringhe "HH:MM" (come nell'ERP reale).
class Timbratura {
  constructor(
    public dipendenteId: number,
    public entrata: string, // "08:00"
    public uscita: string, // "17:00"
    public turno: Turno,
  ) {}
}

// Mixin che aggiunge validazione degli orari. Vincola la base ad avere
// entrata/uscita: cosi' il mixin e' riusabile su qualsiasi entita' con orari.
function OrarioValidabile<
  TBase extends Constructor<{ entrata: string; uscita: string }>,
>(Base: TBase) {
  // Anche qui la class expression e' NOMINATA (OrarioVal) per poter accedere
  // al membro static HHMM dai metodi d'istanza.
  return class OrarioVal extends Base {
    private static readonly HHMM = /^\d{2}:\d{2}$/;

    // Verifica formato "HH:MM" su entrata e uscita.
    orariBenFormati(): boolean {
      const re = OrarioVal.HHMM;
      return re.test(this.entrata) && re.test(this.uscita);
    }

    // Converte "HH:MM" in minuti dall'inizio giornata (naive, no timezone).
    private toMin(s: string): number {
      const [h, m] = s.split(":").map(Number);
      return h * 60 + m;
    }

    // Ritorna la durata in minuti; negativa/NaN segnala anomalia.
    durataMinuti(): number {
      if (!this.orariBenFormati()) return NaN;
      return this.toMin(this.uscita) - this.toMin(this.entrata);
    }
  };
}

// Impiliamo Timestamped SOPRA la validazione: la timbratura sa validarsi
// ED e' tracciata nel tempo.
const TimbraturaFull = Timestamped(OrarioValidabile(Timbratura));
const t1 = new TimbraturaFull(1, "08:00", "17:00", "STD");
// t1.orariBenFormati() // => true
// t1.durataMinuti()    // => 540  (9 ore)
// t1.touch().createdAt // tipo: Date, chaining ok

const t2 = new TimbraturaFull(1, "8:0", "17:00", "P4");
// t2.orariBenFormati() // => false  (formato non "HH:MM")
// t2.durataMinuti()    // => NaN

// ---------------------------------------------------------------------------
// 9) ESEMPIO ERP: mixin Repository-like (identita' + registry statico)
// ---------------------------------------------------------------------------

// Mixin che aggiunge un mini "registry" statico in memoria + salvataggio.
// Vincola la base ad avere 'id: number' per usarlo come chiave.
function InMemoryStored<TBase extends Constructor<{ id: number }>>(
  Base: TBase,
) {
  return class extends Base {
    // Membro statico condiviso: la mappa id -> istanza.
    // Nota: static su class expression e' consentito e ben tipizzato.
    static store = new Map<number, InstanceType<TBase>>();

    // Salva l'istanza corrente nel registry, ritorna this per chaining.
    save(): this {
      // Cast necessario: 'this.constructor' e' tipizzato 'Function', quindi
      // passiamo per 'unknown' prima di vederlo come portatore di 'store'.
      const cls = this.constructor as unknown as {
        store: Map<number, unknown>;
      };
      cls.store.set((this as unknown as { id: number }).id, this);
      return this;
    }
  };
}

// Applichiamo a Dipendente: otteniamo persistenza in memoria + toJSON.
const DipRepo = Serializable(InMemoryStored(Dipendente));
const r1 = new DipRepo(10, "Fumagalli", "UP-010", "Admin");
r1.save();
// DipRepo.store.get(10) // recupera l'istanza salvata (tipo: Dipendente-like)
// r1.toJSONString()     // dalla capacita' Serializable
// Nota: 'store' e' statico e vive sulla classe generata, non sull'istanza.

// ---------------------------------------------------------------------------
// 10) MECCANISMO INTERNO: perche' l'inferenza dei membri "sale"
// ---------------------------------------------------------------------------

// Quando scrivi `class extends Base`, TypeScript costruisce il type
// dell'istanza risultante come INTERSEZIONE strutturale:
//   (membri di Base) & (membri della class expression)
// Il generic <TBase extends Constructor> cattura il type ESATTO della base,
// quindi l'intersezione conserva le proprieta' concrete (nome, badge, ...).
//
// Dimostrazione con un helper che estrae il type-istanza da un Constructor:
type IstanzaDi<C> = C extends Constructor<infer I> ? I : never;

type TFull = IstanzaDi<typeof DipFull>;
// TFull ha: id, nome, badge, ruolo, descrizione, createdAt, updatedAt,
//           touch, toJSONString, clone  -> tutto insieme

// Test di tipo: TFull deve avere 'toJSONString' che ritorna string.
type _t2 = Expect<Equal<ReturnType<TFull["toJSONString"]>, string>>; // ok
// Test: TFull deve avere 'ruolo' di type Ruolo (proveniente dalla base).
type _t3 = Expect<Equal<TFull["ruolo"], Ruolo>>; // ok

// ---------------------------------------------------------------------------
// 11) PATTERN AVANZATO: mixin come "interface + implementazione" separati
// ---------------------------------------------------------------------------

// A volte serve DICHIARARE il type della capacita' e usarlo altrove
// (parametri di funzione, array eterogenei) senza dipendere dalla classe.
// Definiamo l'interface e facciamo si' che il mixin la implementi.

interface HasTimestamps {
  createdAt: Date;
  updatedAt: Date;
  touch(): this;
}

// Funzione che accetta QUALSIASI oggetto con capacita' HasTimestamps,
// a prescindere da quale classe/mixin l'abbia prodotto (duck typing tipizzato).
function tocca<T extends HasTimestamps>(x: T): T {
  return x.touch();
}

// d1 (DipendenteTs) e t1 (TimbraturaFull) hanno entrambi i timestamp:
// tocca(d1); // ok, ritorna DipendenteTs
// tocca(t1); // ok, ritorna TimbraturaFull
// tocca(d0); // ERRORE TS: 'Dipendente' non ha 'createdAt'/'touch' (manca il mixin)

// ---------------------------------------------------------------------------
// 12) super NEI MIXIN: estendere/override di metodi della base
// ---------------------------------------------------------------------------

// Un mixin puo' fare override di un metodo della base e richiamare super.
// Vincoliamo la base ad avere descrizione(): string per poterla arricchire.
function ConEtichetta<
  TBase extends Constructor<{ descrizione(): string }>,
>(Base: TBase) {
  return class extends Base {
    prefissoAudit = "[AUDIT] ";

    // Override che DECORA il risultato della base tramite super.
    descrizione(): string {
      // super.descrizione() richiama l'implementazione della classe avvolta.
      return this.prefissoAudit + super.descrizione();
    }
  };
}

const DipAudit = ConEtichetta(Dipendente);
const d5 = new DipAudit(6, "Longo", "UP-006", "Operatore");
// d5.descrizione() // => "[AUDIT] #6 Longo [UP-006] (Operatore)"

// GOTCHA super: se la base NON dichiara il metodo nel vincolo, super.metodo()
// non e' visibile al type checker anche se esistesse a runtime.

// ---------------------------------------------------------------------------
// 13) GOTCHA / PITFALLS (trappole comuni e soluzioni)
// ---------------------------------------------------------------------------

// PITFALL 1: proprieta' private di un mixin e collisioni.
// Due mixin diversi con lo stesso nome di campo PUBBLICO si sovrascrivono a
// runtime (l'ultimo vince). TypeScript non sempre segnala il conflitto perche'
// i type sono compatibili. Soluzione: prefissare i campi (es. _ts_updatedAt).

// PITFALL 2: dimenticare `extends Constructor` sul generic.
// function BadMixin<TBase>(Base: TBase) {
//   return class extends Base {}; // ERRORE TS: 'Base' non e' un constructor
// }
// Soluzione: sempre <TBase extends Constructor> (o AbstractConstructor).

// PITFALL 3: campi con initializer che ombreggiano la base.
// Se un mixin dichiara `nome = ""` mentre la base setta nome nel costruttore,
// l'initializer del mixin puo' AZZERARE il valore dopo la super() chiamata.
class BaseNome {
  constructor(public nome: string) {}
}
function OmbraNome<TBase extends Constructor<{ nome: string }>>(Base: TBase) {
  return class extends Base {
    // ERRORE LOGICO (non di tipo): questo initializer gira DOPO super()
    // e sovrascrive il nome passato al costruttore della base.
    // nome = "";  // <-- se decommentato, r.nome sarebbe "" e non il valore reale
    marcatore = true;
  };
}
const OmbraTest = OmbraNome(BaseNome);
const on1 = new OmbraTest("Rossi");
// on1.nome // => "Rossi" (perche' NON abbiamo ridichiarato nome nel mixin)
// Soluzione: non ridichiarare nel mixin campi gia' inizializzati dalla base.

// PITFALL 4: applicaMixin variadico perde i type (vedi sezione 6).
// Soluzione: comporre annidato per l'inferenza, o overload tipizzati per 2-3
// mixin fissi. Sotto un overload esplicito che PRESERVA i type per 2 mixin:
function componi2<
  B extends Constructor,
  M1 extends (b: B) => Constructor,
  M2 extends (b: ReturnType<M1>) => Constructor,
>(Base: B, m1: M1, m2: M2): ReturnType<M2> {
  // NOTA: chiamando 'm1'/'m2' (tipizzati come parametri generici) TypeScript
  // usa il RETURN del vincolo (Constructor) e non ReturnType<Mn>; i cast
  // riallineano i type cosi' la composizione resta ben tipizzata.
  const step1 = m1(Base) as ReturnType<M1>;
  return m2(step1) as ReturnType<M2>;
}
const DipComposto = componi2(Dipendente, Timestamped, Serializable);
const dc = new DipComposto(7, "Marchetti", "UP-007", "Admin");
// dc.touch()        // preservato (Timestamped)
// dc.toJSONString() // preservato (Serializable)
// dc.descrizione()  // preservato (base)
type _t4 = Expect<Equal<ReturnType<typeof dc.toJSONString>, string>>; // ok

// ---------------------------------------------------------------------------
// 14) MIXIN CON ABSTRACT BASE (rendere concreta una classe abstract)
// ---------------------------------------------------------------------------

// Classe abstract che definisce un contratto ma non e' istanziabile.
// NOTA: qui 'chiave' e' una PROPRIETA' astratta (non un accessor). Cosi' il
// type del membro e' una property, e le sottoclassi possono implementarla con
// una property senza il conflitto property-vs-accessor.
abstract class EntitaBase {
  abstract chiave: string; // ogni entita' fornisce la sua chiave logica
}

// Il mixin usa AbstractConstructor per accettare anche basi abstract.
function ConChiaveLog<TBase extends AbstractConstructor<{ chiave: string }>>(
  Base: TBase,
) {
  // La classe eredita i membri astratti della base ma NON li implementa:
  // resta quindi 'abstract' (per istanziare serve una sottoclasse concreta).
  // NB (TS2797): estendendo una base con construct-signature ASTRATTA (TBase
  // vincolato ad AbstractConstructor), la classe DEVE essere dichiarata 'abstract'.
  // Cio' e' possibile perche' qui usiamo una class DECLARATION locale (non una
  // class expression, su cui 'abstract' non sarebbe sintatticamente ammesso).
  abstract class ConChiave extends Base {
    logga(): string {
      return `entita:${this.chiave}`;
    }
  }
  return ConChiave;
}

const ConChiaveMix = ConChiaveLog(EntitaBase);
// new ConChiaveMix(); // ERRORE TS: la classe e' ancora abstract (chiave non implementata)

// Sottoclasse concreta che implementa 'chiave' e diventa istanziabile.
// 'chiave' e' una PROPERTY (coerente con la base): la valorizziamo nel
// costruttore, evitando il conflitto property-vs-accessor.
class Reparto extends ConChiaveMix {
  chiave: string;
  constructor(public codice: string) {
    super();
    this.chiave = `REP-${this.codice}`;
  }
}
const rep = new Reparto("SALD");
// rep.chiave // => "REP-SALD"
// rep.logga() // => "entita:REP-SALD"

// ---------------------------------------------------------------------------
// 15) TEST DI TIPO FINALI (raccolta di assert compile-time)
// ---------------------------------------------------------------------------

// Constructor<T> deve essere costruibile con new e dare T.
type _c1 = Expect<Equal<IstanzaDi<Constructor<Dipendente>>, Dipendente>>; // ok

// La composizione full deve includere sia HasTimestamps sia ISerializable.
type TFull2 = IstanzaDi<typeof DipFull>;
type _c2 = Expect<TFull2 extends HasTimestamps ? true : false>; // ok
type _c3 = Expect<TFull2 extends ISerializable ? true : false>; // ok

// La timbratura full deve avere durataMinuti(): number.
type TTimb = IstanzaDi<typeof TimbraturaFull>;
type _c4 = Expect<Equal<ReturnType<TTimb["durataMinuti"]>, number>>; // ok

// ---------------------------------------------------------------------------
// 16) EXPORT (solo simboli definiti in questo file)
// ---------------------------------------------------------------------------

export {
  Dipendente,
  Timbratura,
  Timestamped,
  Serializable,
  WithBadgeValidation,
  OrarioValidabile,
  InMemoryStored,
  ConEtichetta,
  ConChiaveLog,
  applicaMixin,
  componi2,
  tocca,
};

export type {
  Constructor,
  AbstractConstructor,
  Ruolo,
  Turno,
  ISerializable,
  HasTimestamps,
  IstanzaDi,
  Equal,
  Expect,
  MixinFactory,
};

/* ===========================================================================
 * RIEPILOGO COMANDI / CONCETTI (ripasso veloce)
 * ---------------------------------------------------------------------------
 * - Constructor<T> = new (...args: any[]) => T     -> mattone dei mixin
 * - AbstractConstructor<T> = abstract new (...)     -> per basi abstract
 * - Mixin = funzione (Base) => class extends Base   -> class expression
 * - <TBase extends Constructor> preserva i type della base (inferenza "sale")
 * - Composizione: Serializable(Timestamped(Base))   -> impila piu' mixin
 * - this come return type -> abilita method chaining cross-mixin
 * - Constrained mixin: <TBase extends Constructor<{ campo: T }>> -> richiede membri
 * - super.metodo() nel mixin -> override che decora la base (vincola il metodo)
 * - static su class expression -> registry/costanti condivise (es. store Map)
 * - NOMINA la class expression (class Nome extends Base) per accedere ai suoi static
 * - InstanceType<C> / IstanzaDi<C> = C extends Constructor<infer I> ? I : never
 * - Intersezione strutturale: istanza = membri(Base) & membri(mixin)
 * - applicaMixin variadico -> comodo a runtime ma PERDE i type -> preferisci annidato
 * - componi2 con overload generici -> preserva i type per N mixin fissi (con cast)
 * - Interface della capacita' (HasTimestamps/ISerializable) -> duck typing tipizzato
 * - Mixin su AbstractConstructor -> la classe restituita va 'abstract' (return abstract class)
 * - property-vs-accessor: base e sottoclasse devono usare lo STESSO tipo di membro
 * - GOTCHA: no extends Constructor => Base non costruibile
 * - GOTCHA: initializer del mixin gira DOPO super() => non ridichiarare campi base
 * - GOTCHA: campi pubblici omonimi tra mixin => collisione a runtime (prefissa)
 * - GOTCHA: super.metodo visibile solo se il vincolo lo dichiara
 * - Equal<A,B> + Expect<T extends true> -> test di tipo a compile-time
 * ======================================================================== */
