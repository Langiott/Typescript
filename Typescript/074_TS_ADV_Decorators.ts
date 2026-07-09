/**
 * File 074 - ADV Decorators (class/method/property)
 * Corso TypeScript Advanced - argomento: Decorators.
 * ATTENZIONE: in questo progetto "experimentalDecorators" e' FALSE, quindi la
 * sintassi @decorator NON compila: la mostriamo SOLO nei commenti e forniamo
 * equivalenti runtime NON-decorator che compilano con tsc --strict / ES2022.
 * Spieghiamo la differenza tra legacy decorators e Stage-3 (standard) decorators,
 * i signature dei vari tipi (class/method/accessor/field) e i pattern realistici
 * usati nell'ERP Polyuretech (repository, validazione badge/orari, logging).
 */

// ============================================================================
// 0) COS'E' UN DECORATOR E PERCHE' QUI NON POSSIAMO USARLO
// ============================================================================
// Un decorator e' una funzione che il compilatore applica a una class (o a un
// suo membro) al momento della definizione, per aggiungere/alterare comportamento.
// Esistono DUE modelli incompatibili:
//   - "legacy" (experimentalDecorators=true): basato sulla vecchia proposta TC39
//     Stage-1/2, usa reflect-metadata, signature diversi.
//   - "Stage-3" / standard (TS 5.0+, experimentalDecorators NON impostato o false):
//     e' la proposta ormai standardizzata in JavaScript.
// Qui experimentalDecorators=FALSE: potremmo usare gli Stage-3 solo se il target/
// configurazione li abilitasse, ma per sicurezza in questo file NON scriviamo mai
// @decorator: ogni pattern e' riprodotto con funzioni normali (HOF, wrapper,
// Object.defineProperty). Tutto cio' che segue compila.

// ---------------------------------------------------------------------------
// Helper di test a livello di tipo (li riusiamo in tutto il file).
// ---------------------------------------------------------------------------
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
// Perche' funziona: due function type generici sono "identici" solo se X e Y
// sono strutturalmente uguali; e' il trucco standard per confrontare tipi esatti.

// Dominio ERP condiviso negli esempi.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";
interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
}
interface Timbratura {
  dipendenteId: number;
  entrata: string; // "HH:MM" naive-UTC
  uscita: string;  // "HH:MM" naive-UTC
}
const BADGE_RE = /^UP-\d{3}$/;
const ORARIO_RE = /^\d{2}:\d{2}$/;

// ============================================================================
// 1) CLASS DECORATOR - sintassi (SOLO commento) vs equivalente runtime
// ============================================================================
// SINTASSI STAGE-3 (NON compila qui, solo per studio):
//
//   type ClassDecorator<T> = (
//     value: T,
//     context: ClassDecoratorContext
//   ) => T | void;
//
//   @sealed
//   class Foo {}
//
//   function sealed<T extends new (...a: any[]) => object>(
//     value: T, ctx: ClassDecoratorContext
//   ): T {
//     Object.seal(value);
//     Object.seal(value.prototype);
//     return value; // puo' restituire una NUOVA class (sostituzione)
//   }
//
// EQUIVALENTE RUNTIME (compila): il decorator e' solo una funzione (Ctor) => Ctor.
type Ctor<T = object> = new (...args: any[]) => T;

function sealed<T extends Ctor>(Base: T): T {
  Object.seal(Base);
  Object.seal(Base.prototype);
  return Base;
}

class RepartoBase {
  constructor(public nome: string) {}
}
const RepartoSealed = sealed(RepartoBase); // applicazione ESPLICITA, senza @
const r1 = new RepartoSealed("Verniciatura");
// r1 e' RepartoBase => nome: string
type _T1 = Expect<Equal<typeof r1.nome, string>>; // tipo: true

// Class decorator che AGGIUNGE membri: nel modello Stage-3 si torna una subclass.
// Nota: se aggiungi proprieta' il TYPE della class NON cambia automaticamente,
// per questo i mixin (sotto) sono preferiti quando serve tipizzare l'aggiunta.

// ============================================================================
// 2) METHOD DECORATOR - logging/timing come wrapper (equivalente runtime)
// ============================================================================
// SINTASSI STAGE-3 (solo commento):
//
//   type MethodDecorator = (
//     value: Function,
//     context: ClassMethodDecoratorContext
//   ) => Function | void;
//
//   class Servizio {
//     @logged
//     salva(x: number) { return x * 2; }
//   }
//
//   function logged(orig: any, ctx: ClassMethodDecoratorContext) {
//     const name = String(ctx.name);
//     return function (this: any, ...args: any[]) {
//       console.log("call", name, args);
//       return orig.apply(this, args);
//     };
//   }
//
// EQUIVALENTE RUNTIME: un HOF che avvolge la funzione preservando i tipi.
function logged<A extends any[], R>(
  name: string,
  fn: (...args: A) => R
): (...args: A) => R {
  return (...args: A): R => {
    // In produzione useremmo un logger; qui simuliamo con una closure.
    void `call ${name} ${JSON.stringify(args)}`;
    return fn(...args); // firma preservata: args tipizzati, R inferito
  };
}
const raddoppia = logged("raddoppia", (x: number) => x * 2);
const d1 = raddoppia(21); // tipo: number => 42
type _T2 = Expect<Equal<typeof d1, number>>; // tipo: true

// Timing decorator: stesso pattern, misura la durata senza cambiare la firma.
function timed<A extends any[], R>(fn: (...args: A) => R): (...args: A) => R {
  return (...args: A): R => {
    const t0 = Date.now();
    try {
      return fn(...args);
    } finally {
      void (Date.now() - t0); // ms trascorsi
    }
  };
}

// ============================================================================
// 3) PROPERTY / FIELD DECORATOR - validazione via Object.defineProperty
// ============================================================================
// SINTASSI STAGE-3 field decorator (solo commento): l'init hook trasforma il
// valore iniziale del campo.
//
//   type FieldDecorator = (
//     value: undefined,
//     context: ClassFieldDecoratorContext
//   ) => ((initial: unknown) => unknown) | void;
//
//   class D {
//     @maiuscolo nome = "";
//   }
//   function maiuscolo(_v: undefined, _c: ClassFieldDecoratorContext) {
//     return (init: string) => init.toUpperCase();
//   }
//
// EQUIVALENTE RUNTIME: una factory che installa un accessor con validazione.
// Definisce get/set su un'istanza per un campo "controllato".
function defineValidato<T, K extends string>(
  target: Record<K, T>,
  key: K,
  valida: (v: T) => boolean,
  iniziale: T
): void {
  let interno = iniziale;
  Object.defineProperty(target, key, {
    get(): T {
      return interno;
    },
    set(v: T): void {
      if (!valida(v)) throw new Error(`Valore non valido per ${key}`);
      interno = v;
    },
    enumerable: true,
    configurable: true,
  });
}

class DipendenteModel {
  badge!: string; // sara' rimpiazzato da un accessor validato
  constructor(public nome: string, badgeIniziale: string) {
    // Riproduce cio' che un property decorator @isBadge farebbe:
    defineValidato<string, "badge">(
      this,
      "badge",
      (v) => BADGE_RE.test(v),
      badgeIniziale
    );
  }
}
const dm = new DipendenteModel("Rossi", "UP-007");
// dm.badge = "xx"; // lancerebbe a runtime perche' non matcha /^UP-\d{3}$/
type _T3 = Expect<Equal<typeof dm.badge, string>>; // tipo: true

// ============================================================================
// 4) ACCESSOR DECORATOR - normalizzare un orario "HH:MM" naive-UTC
// ============================================================================
// SINTASSI STAGE-3 (solo commento) per get/set:
//
//   class T {
//     #v = "00:00";
//     @orarioValido
//     get entrata() { return this.#v; }
//     set entrata(v: string) { this.#v = v; }
//   }
//
// EQUIVALENTE RUNTIME: incapsuliamo la logica in un factory di accessor.
interface OrarioBox {
  get valore(): string;
  set valore(v: string);
}
function creaOrario(iniziale: string): OrarioBox {
  let v = iniziale;
  return {
    get valore(): string {
      return v;
    },
    set valore(next: string) {
      if (!ORARIO_RE.test(next)) throw new Error("Orario deve essere HH:MM");
      v = next; // naive-UTC: nessuna conversione fuso, e' voluto nell'ERP
    },
  };
}
const box = creaOrario("07:30");
box.valore = "15:45"; // ok
// box.valore = "9:5"; // lancerebbe: non matcha /^\d{2}:\d{2}$/
const orarioLetto = box.valore; // tipo: string

// ============================================================================
// 5) DECORATOR FACTORY - funzione che RITORNA un decorator (parametrizzato)
// ============================================================================
// SINTASSI (solo commento): @Ruolo("Admin") metodo() {}
//   function Ruolo(min: Ruolo) {
//     return (orig: any, ctx: ClassMethodDecoratorContext) => { ...usa min... };
//   }
// Il "doppio livello" (funzione che ritorna funzione) e' la factory.
//
// EQUIVALENTE RUNTIME: una factory che ritorna un wrapper con controllo ruolo.
const ORDINE_RUOLI: Record<Ruolo, number> = {
  QrDisplay: 0,
  Operatore: 1,
  Admin: 2,
  SuperAdmin: 3,
};
function richiedeRuolo(min: Ruolo) {
  // ritorna un HOF: ecco la "factory"
  return function <A extends any[], R>(
    fn: (utente: Dipendente, ...args: A) => R
  ): (utente: Dipendente, ...args: A) => R {
    return (utente: Dipendente, ...args: A): R => {
      if (ORDINE_RUOLI[utente.ruolo] < ORDINE_RUOLI[min]) {
        throw new Error(`Serve ruolo >= ${min}`);
      }
      return fn(utente, ...args);
    };
  };
}
const eliminaReparto = richiedeRuolo("Admin")(
  (_u: Dipendente, id: number): string => `reparto ${id} eliminato`
);
// eliminaReparto({ ...operatore }) lancerebbe; con Admin/SuperAdmin passa.

// ============================================================================
// 6) COMPOSIZIONE DI "DECORATOR" - ordine di applicazione
// ============================================================================
// Con @a @b metodo(): b viene applicato PRIMA (piu' vicino), poi a lo avvolge.
// Con l'equivalente runtime l'ordine e' esplicito: pipe(a, b) o a(b(fn)).
function comporre<A extends any[], R>(
  fn: (...args: A) => R,
  ...wrappers: Array<(f: (...args: A) => R) => (...args: A) => R>
): (...args: A) => R {
  // applica da destra a sinistra come farebbero i decorator impilati
  return wrappers.reduceRight((acc, w) => w(acc), fn);
}
const calcolaMinuti = comporre(
  (t: Timbratura): number => {
    const [he, me] = t.entrata.split(":").map(Number);
    const [hu, mu] = t.uscita.split(":").map(Number);
    return hu * 60 + mu - (he * 60 + me);
  },
  (f) => timed(f),
  (f) => logged("calcolaMinuti", f)
);
const minuti = calcolaMinuti({ dipendenteId: 1, entrata: "08:00", uscita: "17:00" });
// tipo: number => 540

// ============================================================================
// 7) ESEMPIO ERP realistico: REPOSITORY con "decorator" di cache e retry
// ============================================================================
interface Repository<T, ID> {
  trova(id: ID): T | undefined;
}
class DipendenteRepo implements Repository<Dipendente, number> {
  constructor(private dati: Dipendente[]) {}
  trova(id: number): Dipendente | undefined {
    return this.dati.find((d) => d.id === id);
  }
}
// "Decorator pattern" classico (GoF): stessa interface, comportamento aggiunto.
class RepoConCache<T, ID> implements Repository<T, ID> {
  private cache = new Map<ID, T | undefined>();
  constructor(private inner: Repository<T, ID>) {}
  trova(id: ID): T | undefined {
    if (this.cache.has(id)) return this.cache.get(id);
    const v = this.inner.trova(id);
    this.cache.set(id, v);
    return v;
  }
}
const repo: Repository<Dipendente, number> = new RepoConCache(
  new DipendenteRepo([{ id: 1, nome: "Bianchi", badge: "UP-001", ruolo: "Operatore" }])
);
const trovato = repo.trova(1); // tipo: Dipendente | undefined
type _T4 = Expect<Equal<typeof trovato, Dipendente | undefined>>; // tipo: true

// ============================================================================
// 8) ESEMPIO ERP: MIXIN (il modo type-safe per "aggiungere" via class decorator)
// ============================================================================
// Un class decorator che aggiunge membri NON aggiorna il tipo; un MIXIN si'.
type GConstructor<T = object> = new (...args: any[]) => T;
function Timestamped<TBase extends GConstructor>(Base: TBase) {
  return class extends Base {
    creatoIl: string = "00:00"; // naive-UTC
    tocca(ora: string): void {
      if (!ORARIO_RE.test(ora)) throw new Error("ora HH:MM");
      this.creatoIl = ora;
    }
  };
}
class TurnoEntity {
  constructor(public tipo: Turno) {}
}
const TurnoTimestamped = Timestamped(TurnoEntity);
const te = new TurnoTimestamped("P4");
te.tocca("06:00");
// Ora il TIPO include sia tipo:Turno sia creatoIl:string (a differenza di un
// class decorator "puro"): questo e' il vantaggio del mixin per la tipizzazione.
type _T5 = Expect<Equal<typeof te.creatoIl, string>>; // tipo: true
type _T6 = Expect<Equal<typeof te.tipo, Turno>>;       // tipo: true

// ============================================================================
// 9) PATTERN TYPE-LEVEL: derivare un DTO "solo campi validabili" (mapped type)
// ============================================================================
// Simuliamo cio' che un property decorator @Validate annoterebbe, ma a TIPO:
// costruiamo un tipo che tiene solo le proprieta' "string-like" di Dipendente.
type SoloStringhe<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};
type DipendenteStr = SoloStringhe<Dipendente>;
// tipo: { nome: string; badge: string; ruolo: Ruolo }
// ATTENZIONE (gotcha di tipo): `ruolo` E' incluso! Ruolo e' una UNION di string
// literal ("SuperAdmin" | ...) e ogni literal e' assignable a `string`, quindi
// `Ruolo extends string` e' true. Scarta invece solo `id: number`.
type _T7 = Expect<Equal<keyof DipendenteStr, "nome" | "badge" | "ruolo">>; // tipo: true
// Perche': la "key remapping" con `as ... : never` scarta le chiavi il cui valore
// non e' string; e' un calcolo di tipo, valutato dal compiler senza runtime.

// Registry di validatori runtime coerente col tipo sopra (deve coprire anche ruolo).
const RUOLI_VALIDI: readonly Ruolo[] = ["SuperAdmin", "Admin", "Operatore", "QrDisplay"];
const validatoriDip: { [K in keyof DipendenteStr]: (v: string) => boolean } = {
  nome: (v) => v.length > 0,
  badge: (v) => BADGE_RE.test(v),
  ruolo: (v) => (RUOLI_VALIDI as readonly string[]).includes(v),
};
function validaDipendente(d: Dipendente): boolean {
  return (Object.keys(validatoriDip) as Array<keyof DipendenteStr>).every((k) =>
    validatoriDip[k](d[k])
  );
}
const okDip = validaDipendente({ id: 9, nome: "Verdi", badge: "UP-099", ruolo: "Admin" });
// tipo: boolean => true

// ============================================================================
// 10) STATO MACCHINA (ERP timbratura) senza decorator, con union discriminata
// ============================================================================
// Spesso i decorator @State/@Transition si sostituiscono con una tabella di
// transizioni tipizzata: piu' semplice e completamente statica.
type StatoTimbr = "Assente" | "Presente" | "Chiuso";
type Evento = "ENTRA" | "ESCE";
const TRANSIZIONI: Record<StatoTimbr, Partial<Record<Evento, StatoTimbr>>> = {
  Assente: { ENTRA: "Presente" },
  Presente: { ESCE: "Chiuso" },
  Chiuso: {},
};
function prossimoStato(s: StatoTimbr, e: Evento): StatoTimbr {
  const next = TRANSIZIONI[s][e];
  if (!next) throw new Error(`Transizione ${s}->${e} non valida`);
  return next; // control flow: dopo il throw, next e' StatoTimbr (non undefined)
}
const s2 = prossimoStato("Assente", "ENTRA"); // tipo: StatoTimbr => "Presente"

// ============================================================================
// 11) GOTCHA / PITFALLS (trappole comuni e soluzioni)
// ============================================================================
// (A) Scrivere @decorator con experimentalDecorators=FALSE puo' cambiare
//     semantica o non compilare a seconda del target:
//   // ERRORE TS: sintassi decorator non abilitata / incompatibile in questo tsconfig
//   // @sealed
//   // class X {}
//   // Soluzione: applica la funzione a mano -> const X = sealed(class {...});

// (B) Un wrapper che perde `this`: se avvolgi un metodo di classe con una arrow
//     che chiama fn(...args) SENZA bind, dentro fn `this` e' sbagliato.
class Contatore {
  n = 0;
  inc(): number {
    // this.n++; funziona SOLO se `this` e' il Contatore
    return ++this.n;
  }
}
const c = new Contatore();
const staccato = c.inc; // perde il binding
// staccato(); // ERRORE a RUNTIME: this undefined (non e' un errore di tipo!)
const legato = c.inc.bind(c); // Soluzione: bind, oppure metodo arrow-field.
const _n = legato(); // tipo: number => 1

// (C) Class decorator "che aggiunge una proprieta'" ma il tipo non cambia:
//   // Con @AddCreatedAt class Y {}  ->  y.creatoIl NON esiste per il compiler.
//   // ERRORE TS: Property 'creatoIl' does not exist on type 'Y'
//   // Soluzione: usa un MIXIN (vedi sezione 8) che ritorna una class tipizzata.

// (D) any che si propaga nei wrapper: se il wrapper usa `...args: any[]` e
//     restituisce `any`, PERDI il type-checking dei call site.
function badWrap(fn: Function): (...a: any[]) => any {
  return (...a: any[]) => fn(...a);
}
const somma = badWrap((x: number, y: number) => x + y);
const cattivo = somma("a", "b"); // COMPILA ma e' sbagliato: tipo any
// Prova che e' `any`: e' assegnabile a DUE tipi incompatibili senza errore
// (solo `any` lo permette). NB: NON usare Equal<T, any> per testarlo, perche'
// `any` corto-circuita i conditional type e l'helper Equal da' risultati
// inaffidabili -> e' esso stesso un gotcha del type system.
const comeNumero: number = cattivo; // ok solo perche' cattivo e' any
const comeStringa: string = cattivo; // ok pure questo => quindi era any
void comeNumero;
void comeStringa;
// Soluzione: generics <A extends any[], R> come in logged/timed (sez. 2), che
// preservano firma e ritorno -> il call site errato darebbe ERRORE TS.

// ============================================================================
// 12) Export di simboli LOCALI (solo definizioni di questo file)
// ============================================================================
export {
  sealed,
  logged,
  timed,
  richiedeRuolo,
  comporre,
  Timestamped,
  RepoConCache,
  prossimoStato,
  validaDipendente,
};
export type {
  Ctor,
  Equal,
  Expect,
  Repository,
  SoloStringhe,
  DipendenteStr,
  StatoTimbr,
};

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
// - experimentalDecorators=FALSE: qui @decorator NON si usa; solo nei commenti.
// - Due modelli: legacy (reflect-metadata, signature vecchi) vs Stage-3 standard
//   (context object: ClassDecoratorContext / ClassMethodDecoratorContext / ...).
// - Class decorator: (Ctor) => Ctor (puo' restituire una nuova class).
// - Method decorator: (fn, ctx) => fn' ; equivalente runtime = HOF wrapper.
// - Property/field decorator: init hook o Object.defineProperty(get/set).
// - Accessor decorator: avvolge get/set; qui = factory di accessor (creaOrario).
// - Decorator FACTORY = funzione che ritorna un decorator (richiedeRuolo).
// - Ordine: @a @b -> b applicato prima; runtime = comporre/reduceRight.
// - Preserva sempre i tipi con generics <A extends any[], R> (evita any).
// - Preserva `this`: bind o metodo arrow-field (gotcha B).
// - Per "aggiungere membri tipizzati" usa MIXIN, non un class decorator puro.
// - GoF Decorator pattern: stessa interface, comportamento in piu' (RepoConCache).
// - Type-level: mapped type con key remapping (SoloStringhe) = calcolo di tipo.
// - Stato macchina: union discriminata + tabella TRANSIZIONI, tutto statico.
// - Test di tipo: Equal<X,Y> + Expect<true> per asserire l'inferenza.
