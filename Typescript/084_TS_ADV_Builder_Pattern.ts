/**
 * File 084 - ADV Builder Pattern typed
 * Builder fluente tipizzato con tracking dei campi obbligatori tramite generics.
 * Usa un "phantom state" (union di chiavi gia impostate) per rendere build()
 * disponibile SOLO quando tutti i required sono presenti. Dominio ERP Polyuretech.
 * Livello: ADVANCED. Niente decorator, niente librerie: solo mock locali e ASCII.
 */

// ============================================================================
// SEZIONE 1 - IL PROBLEMA: perche' un builder "typed"
// ============================================================================
//
// Un builder classico accumula campi con metodi fluenti e alla fine chiama
// build(). Problema: nulla impedisce di chiamare build() prima di aver
// impostato i campi obbligatori. Vogliamo che il TYPE SYSTEM lo vieti.
//
// Idea: portiamo nel tipo del builder l'informazione di "quali chiavi required
// sono gia state impostate". Ogni setter restituisce un NUOVO tipo builder in
// cui quella chiave e' aggiunta alla union. build() e' abilitato solo quando la
// union copre tutte le chiavi required.

// ----------------------------------------------------------------------------
// Tipi di dominio ERP
// ----------------------------------------------------------------------------

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

// Badge nel formato "UP-001", orari "HH:MM" naive-UTC.
// Usiamo branded types leggeri per rendere il dominio piu' espressivo.
type Badge = string & { readonly __brand: "Badge" };   // /^UP-\d{3}$/
type Orario = string & { readonly __brand: "Orario" };  // /^\d{2}:\d{2}$/

const badgeRe = /^UP-\d{3}$/;
const orarioRe = /^\d{2}:\d{2}$/;

function toBadge(s: string): Badge {
  if (!badgeRe.test(s)) throw new Error("Badge non valido: " + s);
  return s as Badge;
}
function toOrario(s: string): Orario {
  if (!orarioRe.test(s)) throw new Error("Orario non valido: " + s);
  return s as Orario;
}

interface Dipendente {
  id: number;
  nome: string;
  badge: Badge;
  ruolo: Ruolo;
  reparto?: string;
  turno?: Turno;
}

// ============================================================================
// SEZIONE 2 - PHANTOM STATE: la union di chiavi impostate
// ============================================================================
//
// Il builder e' generico su Set, dove Set e' la union delle chiavi gia
// impostate (o mai = never all'inizio). Ogni setter aggiunge la sua chiave.
//
//   DipendenteBuilder<never>                 // nessun campo settato
//   DipendenteBuilder<"nome">                // solo nome
//   DipendenteBuilder<"nome" | "badge">      // nome e badge
//
// I campi required per costruire un Dipendente valido:
type RequiredKeys = "id" | "nome" | "badge" | "ruolo";

// Helper: true (in senso di tipo) se Have copre tutte le Need.
// Se Need e' interamente contenuto in Have, allora "Exclude<Need, Have>" e'
// never, e la condizione diventa vera.
type HasAll<Need extends string, Have extends string> =
  [Exclude<Need, Have>] extends [never] ? true : false;

// Esempi (tipi di sola verifica, non emettono nulla):
type _T1 = HasAll<RequiredKeys, "id" | "nome" | "badge" | "ruolo">; // => true
type _T2 = HasAll<RequiredKeys, "id" | "nome">;                     // => false
type _T3 = HasAll<RequiredKeys, "id" | "nome" | "badge" | "ruolo" | "turno">; // => true

// ============================================================================
// SEZIONE 3 - DipendenteBuilder con this-return tipizzato
// ============================================================================
//
// Ogni setter restituisce "this & { ... }"? No: TypeScript non permette di
// cambiare il parametro generico con "this". Il pattern corretto e'
// restituire un tipo builder aggiornato: DipendenteBuilder<Set | "chiave">.
//
// Lo stato interno e' un Partial<Dipendente>: i valori ci sono a runtime, ma
// e' il generico Set a garantire a compile-time cosa e' presente.

class DipendenteBuilder<Set extends RequiredKeys = never> {
  // Lo stato e' private: si accede solo tramite i setter fluenti.
  private readonly stato: Partial<Dipendente>;

  // Costruttore privato-ish: si parte da create().
  private constructor(stato: Partial<Dipendente>) {
    this.stato = stato;
  }

  // Factory statica: builder vuoto, Set = never.
  static create(): DipendenteBuilder<never> {
    return new DipendenteBuilder<never>({});
  }

  // Ogni setter "casta" il this al nuovo tipo builder con la chiave aggiunta.
  // Nota: non muta lo stato in-place per la chiave (in realta' qui riusiamo lo
  // stesso oggetto per semplicita', ma il return type e' il tipo aggiornato).

  setId(id: number): DipendenteBuilder<Set | "id"> {
    this.stato.id = id;
    return this as unknown as DipendenteBuilder<Set | "id">;
  }

  setNome(nome: string): DipendenteBuilder<Set | "nome"> {
    this.stato.nome = nome;
    return this as unknown as DipendenteBuilder<Set | "nome">;
  }

  setBadge(badge: string): DipendenteBuilder<Set | "badge"> {
    this.stato.badge = toBadge(badge);
    return this as unknown as DipendenteBuilder<Set | "badge">;
  }

  setRuolo(ruolo: Ruolo): DipendenteBuilder<Set | "ruolo"> {
    this.stato.ruolo = ruolo;
    return this as unknown as DipendenteBuilder<Set | "ruolo">;
  }

  // Campi opzionali: non entrano in RequiredKeys, quindi non alterano Set.
  // Restituiscono "this" (this type): il tipo builder resta invariato.
  setReparto(reparto: string): this {
    this.stato.reparto = reparto;
    return this;
  }

  setTurno(turno: Turno): this {
    this.stato.turno = turno;
    return this;
  }

  // build() e' abilitato SOLO quando Set copre tutte le RequiredKeys.
  // Tecnica: vincoliamo "this" a un tipo builder il cui Set contiene i required.
  // Se manca anche una sola chiave, la chiamata non type-checka.
  build(
    this: HasAll<RequiredKeys, Set> extends true
      ? DipendenteBuilder<Set>
      : never
  ): Dipendente {
    // A runtime i campi ci sono per costruzione: cast sicuro.
    const s = (this as DipendenteBuilder<Set>).stato;
    return {
      id: s.id!,
      nome: s.nome!,
      badge: s.badge!,
      ruolo: s.ruolo!,
      reparto: s.reparto,
      turno: s.turno,
    };
  }
}

// ----------------------------------------------------------------------------
// Uso: catena completa -> build() OK
// ----------------------------------------------------------------------------

const dip1 = DipendenteBuilder.create()
  .setId(1)
  .setNome("Mario Rossi")
  .setBadge("UP-001")
  .setRuolo("Operatore")
  .setReparto("Estrusione")
  .setTurno("P4")
  .build();
// tipo: Dipendente
// => { id:1, nome:"Mario Rossi", badge:"UP-001", ruolo:"Operatore", reparto:"Estrusione", turno:"P4" }

// L'ordine dei setter e' libero: la union non dipende dall'ordine.
const dip2 = DipendenteBuilder.create()
  .setRuolo("Admin")
  .setBadge("UP-042")
  .setNome("Anna Bianchi")
  .setId(2)
  .build();
// tipo: Dipendente

// ----------------------------------------------------------------------------
// Uso: manca un required -> build() vietato a compile-time
// ----------------------------------------------------------------------------

// Manca setBadge: Set = "id"|"nome"|"ruolo", HasAll = false, this = never.
// const dipKo = DipendenteBuilder.create()
//   .setId(3)
//   .setNome("Luca Verdi")
//   .setRuolo("Operatore")
//   .build();
// ERRORE TS: The 'this' context of type 'DipendenteBuilder<"id" | "nome" |
//   "ruolo">' is not assignable to method's 'this' of type 'never'.

// Builder totalmente vuoto -> build() vietato.
// const dipVuoto = DipendenteBuilder.create().build();
// ERRORE TS: 'this' context ... not assignable to 'never'.

// Impostare due volte la stessa chiave e' innocuo: "id" | "id" = "id".
const dip3 = DipendenteBuilder.create()
  .setId(4).setId(5) // seconda vince a runtime; tipo resta "id"
  .setNome("Bis").setBadge("UP-009").setRuolo("QrDisplay")
  .build();
// tipo: Dipendente ; dip3.id => 5

// ============================================================================
// SEZIONE 4 - QueryBuilder per Timbrature (this types + phantom optional)
// ============================================================================
//
// Costruiamo query sulle timbrature. Regole tipizzate:
//  - .from() e' obbligatorio prima di run() (phantom "from").
//  - .orderBy() puo' essere chiamato una sola volta (tracked via phantom).
//  - i filtri where sono opzionali e ripetibili -> ritornano this.

interface Timbratura {
  id: number;
  badge: Badge;
  giorno: string;    // "YYYY-MM-DD"
  entrata: Orario;   // "HH:MM" naive-UTC
  uscita: Orario;    // "HH:MM" naive-UTC
  turno: Turno;
}

// Sorgente mock (in-memory), niente DB reale.
const TIMBRATURE: Timbratura[] = [
  { id: 1, badge: toBadge("UP-001"), giorno: "2026-07-08", entrata: toOrario("06:00"), uscita: toOrario("14:00"), turno: "P4" },
  { id: 2, badge: toBadge("UP-002"), giorno: "2026-07-08", entrata: toOrario("14:00"), uscita: toOrario("22:00"), turno: "P2" },
  { id: 3, badge: toBadge("UP-001"), giorno: "2026-07-09", entrata: toOrario("08:00"), uscita: toOrario("17:00"), turno: "STD" },
];

type Predicato = (t: Timbratura) => boolean;

// Stato del query builder tracciato nella union QS ("query state").
//   "from"    -> la tabella sorgente e' impostata
//   "order"   -> orderBy gia' chiamato (per vietare doppioni)
type QueryFlag = "from" | "order";

class TimbratureQueryBuilder<QS extends QueryFlag = never> {
  private sorgente: Timbratura[] = [];
  private filtri: Predicato[] = [];
  private ordine: ((a: Timbratura, b: Timbratura) => number) | null = null;
  private limite: number | null = null;

  private constructor() {}

  static query(): TimbratureQueryBuilder<never> {
    return new TimbratureQueryBuilder<never>();
  }

  // from() imposta la sorgente e aggiunge il flag "from".
  from(rows: Timbratura[]): TimbratureQueryBuilder<QS | "from"> {
    this.sorgente = rows;
    return this as unknown as TimbratureQueryBuilder<QS | "from">;
  }

  // where() e' opzionale e ripetibile: this type, QS invariato.
  where(p: Predicato): this {
    this.filtri.push(p);
    return this;
  }

  // Zucchero: filtro per badge.
  whereBadge(b: string): this {
    const badge = toBadge(b);
    this.filtri.push((t) => t.badge === badge);
    return this;
  }

  // Zucchero: filtro per turno.
  whereTurno(turno: Turno): this {
    this.filtri.push((t) => t.turno === turno);
    return this;
  }

  // orderBy() e' concesso una sola volta: il this richiede che "order" NON sia
  // ancora in QS. Se lo e', il this diventa "never" e la chiamata e' vietata.
  orderBy(
    this: "order" extends QS ? never : TimbratureQueryBuilder<QS>,
    cmp: (a: Timbratura, b: Timbratura) => number
  ): TimbratureQueryBuilder<QS | "order"> {
    const self = this as TimbratureQueryBuilder<QS>;
    (self as unknown as { ordine: typeof self.ordine }).ordine = cmp;
    return self as unknown as TimbratureQueryBuilder<QS | "order">;
  }

  limit(n: number): this {
    this.limite = n;
    return this;
  }

  // run() e' abilitato solo se "from" e' presente in QS.
  run(
    this: "from" extends QS ? TimbratureQueryBuilder<QS> : never
  ): Timbratura[] {
    const self = this as TimbratureQueryBuilder<QS>;
    const priv = self as unknown as {
      sorgente: Timbratura[];
      filtri: Predicato[];
      ordine: ((a: Timbratura, b: Timbratura) => number) | null;
      limite: number | null;
    };
    let out = priv.sorgente.filter((t) => priv.filtri.every((f) => f(t)));
    if (priv.ordine) out = [...out].sort(priv.ordine);
    if (priv.limite !== null) out = out.slice(0, priv.limite);
    return out;
  }
}

// ----------------------------------------------------------------------------
// Uso QueryBuilder: from presente -> run() OK
// ----------------------------------------------------------------------------

const q1 = TimbratureQueryBuilder.query()
  .from(TIMBRATURE)
  .whereBadge("UP-001")
  .orderBy((a, b) => a.giorno.localeCompare(b.giorno))
  .limit(10)
  .run();
// tipo: Timbratura[]
// => timbrature del badge UP-001 ordinate per giorno (id 1 e 3)

const q2 = TimbratureQueryBuilder.query()
  .from(TIMBRATURE)
  .whereTurno("P2")
  .run();
// tipo: Timbratura[] ; => [ timbratura id 2 ]

// ----------------------------------------------------------------------------
// Uso QueryBuilder: errori a compile-time
// ----------------------------------------------------------------------------

// Manca from(): QS = never, run() richiede this = never.
// const qKo = TimbratureQueryBuilder.query().whereTurno("STD").run();
// ERRORE TS: The 'this' context of type 'TimbratureQueryBuilder<never>' is not
//   assignable to method's 'this' of type 'never'.

// orderBy() due volte: la seconda ha this = never.
// const qDoppio = TimbratureQueryBuilder.query()
//   .from(TIMBRATURE)
//   .orderBy((a, b) => a.id - b.id)
//   .orderBy((a, b) => b.id - a.id) // <- vietato
//   .run();
// ERRORE TS: The 'this' context of type 'TimbratureQueryBuilder<"from" |
//   "order">' is not assignable to method's 'this' of type 'never'.

// ============================================================================
// SEZIONE 5 - VARIANTE: build() con firma condizionale che spiega l'errore
// ============================================================================
//
// Il messaggio "not assignable to never" e' criptico. Possiamo migliorarlo
// facendo si' che il this richieda un tipo-marcatore con nome parlante.

// Marker "brandizzato" usato solo per messaggi d'errore piu' leggibili.
interface MancanoCampiRequired<K extends string> {
  readonly __errore: "Mancano campi required";
  readonly __campi: K;
}

// Nuova versione del builder Dipendente con errore parlante.
class DipendenteBuilder2<Set extends RequiredKeys = never> {
  private readonly stato: Partial<Dipendente> = {};
  private constructor() {}

  static create(): DipendenteBuilder2<never> {
    return new DipendenteBuilder2<never>();
  }

  setId(id: number): DipendenteBuilder2<Set | "id"> {
    this.stato.id = id;
    return this as unknown as DipendenteBuilder2<Set | "id">;
  }
  setNome(nome: string): DipendenteBuilder2<Set | "nome"> {
    this.stato.nome = nome;
    return this as unknown as DipendenteBuilder2<Set | "nome">;
  }
  setBadge(b: string): DipendenteBuilder2<Set | "badge"> {
    this.stato.badge = toBadge(b);
    return this as unknown as DipendenteBuilder2<Set | "badge">;
  }
  setRuolo(r: Ruolo): DipendenteBuilder2<Set | "ruolo"> {
    this.stato.ruolo = r;
    return this as unknown as DipendenteBuilder2<Set | "ruolo">;
  }

  // Le chiavi mancanti sono Exclude<RequiredKeys, Set>. Se e' never, tutto ok e
  // il this accetta il builder; altrimenti richiede il marker con i nomi.
  build(
    this: [Exclude<RequiredKeys, Set>] extends [never]
      ? DipendenteBuilder2<Set>
      : MancanoCampiRequired<Exclude<RequiredKeys, Set>>
  ): Dipendente {
    const s = (this as unknown as DipendenteBuilder2<Set>).stato;
    return { id: s.id!, nome: s.nome!, badge: s.badge!, ruolo: s.ruolo! };
  }
}

const okDip = DipendenteBuilder2.create()
  .setId(7).setNome("Test").setBadge("UP-100").setRuolo("SuperAdmin")
  .build();
// tipo: Dipendente

// Manca "ruolo": il this richiede MancanoCampiRequired<"ruolo">.
// const koDip = DipendenteBuilder2.create()
//   .setId(8).setNome("X").setBadge("UP-101")
//   .build();
// ERRORE TS: The 'this' context of type 'DipendenteBuilder2<"id" | "nome" |
//   "badge">' is not assignable to method's 'this' of type
//   'MancanoCampiRequired<"ruolo">'.

// ============================================================================
// SEZIONE 6 - GOTCHA / PITFALLS
// ============================================================================
//
// [1] "this" NON puo' riscrivere il proprio generico.
//     Non esiste "this<Set | 'id'>". Per aggiornare il phantom state bisogna
//     restituire un TIPO builder esplicito (Builder<Set | 'id'>) e castare.
//     I setter opzionali che NON toccano il required possono invece ritornare
//     "this" (this type polimorfico) senza cast.
//
// [2] Il cast "as unknown as Builder<...>" e' obbligato.
//     A runtime restituiamo lo stesso oggetto; il tipo cambia solo a livello
//     statico. Il doppio cast (unknown) evita l'errore di overlap:
//     // return this as Builder<Set | "id">;
//     // ERRORE TS: Conversion of type 'this' to ... may be a mistake because
//     //   neither type sufficiently overlaps with the other.
//
// [3] Union assorbe i doppioni: setId().setId() -> Set = "id".
//     Ottimo per l'idempotenza del tipo, ma ATTENZIONE: non impedisce di
//     re-impostare un campo. Se vuoi vietarlo, escludi la chiave dal tipo di
//     ritorno dopo il primo set (vedi orderBy: usa "K extends QS ? never : ...").
//
// [4] build() con "this: never" da' un errore criptico.
//     Preferisci un marker brandizzato (SEZIONE 5) per messaggi leggibili.
//
// [5] Distributivita' dei conditional type.
//     In HasAll usiamo [Exclude<...>] extends [never] con le TUPLE per NON
//     distribuire sulla union e testare "e' vuota" in un colpo solo:
//     // type Bad<T> = T extends never ? true : false; // distribuisce!
//     // Bad<"a" | "b"> => "boolean" (union di true/false), non quello che vuoi.
//
// [6] L'ordine dei setter e' irrilevante per il tipo ma non per i side-effect.
//     Se un setter valida (toBadge lancia), l'eccezione avviene a runtime nel
//     punto di chiamata, indipendentemente dalla union.
//
// [7] Stato condiviso: qui riusiamo lo stesso oggetto stato tra i "vari" tipi
//     builder restituiti. E' voluto (fluent chain lineare). NON conservare un
//     riferimento a uno stadio intermedio e riusarlo due volte aspettandoti
//     stati separati: muteresti lo stesso stato.
//     // const b = DipendenteBuilder.create().setId(1);
//     // const x = b.setNome("A"); const y = b.setNome("B"); // y e x = stesso stato
//
// [8] "K extends QS" vs "QS extends K".
//     Per "il flag e' gia presente" usa "flag extends QS" (il letterale sta
//     nella union). Invertire i lati cambia completamente la semantica.
//
// [9] Default generico = never.
//     "class B<Set extends RequiredKeys = never>": partire da never e' cruciale,
//     cosi' Set|"id" = "id" (never e' l'elemento neutro della union).
//
// [10] noEmit/strict: i cast unknown e i "!" non-null sono confinati dentro il
//      builder, dove il tipo garantisce la presenza. Non esporre "!" ai chiamanti.

// ============================================================================
// SEZIONE 7 - EXPORT dei simboli locali
// ============================================================================

export {
  DipendenteBuilder,
  DipendenteBuilder2,
  TimbratureQueryBuilder,
  toBadge,
  toOrario,
  TIMBRATURE,
};
export type {
  Dipendente,
  Timbratura,
  Ruolo,
  Turno,
  Badge,
  Orario,
  RequiredKeys,
  HasAll,
  MancanoCampiRequired,
};

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
// - Builder typed: porta nel tipo la union delle chiavi gia impostate (phantom state).
// - Default generico = never: elemento neutro della union (Set|"id" = "id").
// - Setter required: return Builder<Set | "chiave"> + cast "as unknown as".
// - Setter opzionali: return this (this type polimorfico), Set invariato.
// - build() gated: "this: HasAll<Req,Set> extends true ? Builder<Set> : never".
// - HasAll<Need,Have> = [Exclude<Need,Have>] extends [never] ? true : false.
// - Tuple [T] extends [never] per evitare la distributivita' dei conditional type.
// - Errore parlante: this richiede un marker brandizzato (MancanoCampiRequired<K>).
// - "una volta sola": orderBy usa "flag extends QS ? never : Builder<QS>".
// - QueryBuilder: from() gate su run(), where() ripetibile (this), orderBy() unico.
// - GOTCHA: this non riscrive il proprio generico; union assorbe doppioni; stato condiviso mutabile.
