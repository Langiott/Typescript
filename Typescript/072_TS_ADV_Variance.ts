/**
 * File 072 - ADV Variance & function compatibility
 * ================================================
 * Argomento: covarianza, controvarianza, bivarianza dei metodi, strictFunctionTypes
 * e regole di assegnabilita' (assignability) tra function type.
 * Vedremo PERCHE' il type system accetta o rifiuta un assegnamento tra funzioni,
 * come cambia il comportamento con strictFunctionTypes on/off, e come questo impatta
 * gli handler/callback in scenari reali (repository, validazione, timbrature ERP).
 * Tutti gli esempi compilano con tsc --strict; gli errori voluti sono COMMENTATI.
 */

// ============================================================================
// 0) HELPER DI TYPE-TESTING (tipi come test)
// ============================================================================
// Equal<A, B> e' true SOLO se A e B sono lo stesso tipo (anche rispetto a
// readonly, optional, ecc). Usa il trucco dei due conditional type identici:
// il compiler li considera assegnabili solo se A e B coincidono davvero.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect<T> accetta solo T = true: serve a "far fallire la compilazione"
// se un test di tipo non ha il risultato atteso.
type Expect<T extends true> = T;

// Alcuni test iniziali (se sbagliassimo il tipo, il file non compilerebbe)
type _t0 = Expect<Equal<string, string>>; // ok
// type _tBad = Expect<Equal<string, number>>; // ERRORE TS: Type 'false' does not satisfy the constraint 'true'.

// ============================================================================
// 1) IL CONCETTO: COVARIANZA E CONTROVARIANZA (intuizione)
// ============================================================================
// "Varianza" descrive come la relazione di sottotipo (subtype) tra due tipi
// si propaga a un costruttore di tipi (array, funzione, promise, ...).
// - COVARIANTE: se Sub <: Super allora F<Sub> <: F<Super> (stesso verso).
// - CONTROVARIANTE: se Sub <: Super allora F<Super> <: F<Sub> (verso opposto).
// - BIVARIANTE: vale in entrambi i versi (piu' permissivo, meno sicuro).
// - INVARIANTE: nessuna delle due direzioni.

// Gerarchia di esempio nel dominio ERP: un Operatore e' un Dipendente.
interface Dipendente {
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
}
interface Operatore extends Dipendente {
  reparto: string; // Operatore ha un campo in piu' => Operatore <: Dipendente
}

// Operatore e' assegnabile a Dipendente (ha tutto cio' che serve + extra)
const op: Operatore = { id: 1, nome: "Anna", badge: "UP-001", reparto: "Stampaggio" };
const dip: Dipendente = op; // ok: Operatore <: Dipendente
// const opBad: Operatore = dip; // ERRORE TS: Property 'reparto' is missing.

// ============================================================================
// 2) COVARIANZA DEL RETURN TYPE
// ============================================================================
// Il tipo di ritorno di una funzione e' COVARIANTE: una funzione che ritorna
// un sottotipo e' assegnabile dove serve una che ritorna il supertipo.
type CreaDipendente = () => Dipendente;
type CreaOperatore = () => Operatore;

const creaOp: CreaOperatore = () => op;
const creaDip: CreaDipendente = creaOp; // ok: Operatore (return) <: Dipendente (return)
// Ha senso: chi chiama creaDip si aspetta un Dipendente; riceverne uno "piu' ricco"
// (Operatore) non rompe nulla.
const risultato = creaDip(); // tipo: Dipendente (anche se a runtime e' un Operatore)

// L'inverso NON e' sicuro e viene rifiutato:
// const creaOp2: CreaOperatore = creaDip; // ERRORE TS: manca 'reparto' nel return.

// ============================================================================
// 3) CONTROVARIANZA DEI PARAMETRI (con strictFunctionTypes ON)
// ============================================================================
// Con strictFunctionTypes: true (parte di --strict) i PARAMETRI delle function
// sono controvarianti. Una funzione che accetta un parametro PIU' GENERALE
// (supertipo) e' assegnabile dove ne serve una che accetta uno PIU' SPECIFICO.
type LogDipendente = (d: Dipendente) => void;
type LogOperatore = (o: Operatore) => void;

const logDip: LogDipendente = (d) => {
  // usa solo campi comuni: sicuro anche se riceve un Operatore
  void d.nome;
};
// Assegno una fn che accetta Dipendente dove serve una che accetta Operatore:
const logOp: LogOperatore = logDip; // ok: parametro controvariante (Dipendente >: Operatore)
logOp(op);
// Perche' e' sicuro? Chi usa logOp gli passera' sempre un Operatore, che
// e' anche un Dipendente: logDip sa gestirlo.

// L'inverso e' PERICOLOSO e viene rifiutato con strictFunctionTypes:
// const bad: LogDipendente = logOp;
// ERRORE TS: Argument of type 'Dipendente' is not assignable to parameter of type 'Operatore'.
// (logOp potrebbe leggere o.reparto, ma un Dipendente generico non ce l'ha)

// ============================================================================
// 4) BIVARIANZA DEI METODI (il "buco" storico compatibilita')
// ============================================================================
// Sorpresa: i PARAMETRI dei METODI (sintassi "metodo(x): T") restano BIVARIANTI
// anche con strictFunctionTypes. E' una scelta deliberata per compatibilita'
// (es. Array<Dog> assegnabile ad Array<Animal>). La differenza sta nella SINTASSI:
//   - proprieta' funzione:  onEvento: (x: T) => void   -> controvariante (strict)
//   - metodo:               onEvento(x: T): void       -> bivariante (sempre)

interface HandlerMetodo {
  gestisci(o: Operatore): void; // METODO => bivariante
}
interface HandlerProprieta {
  gestisci: (o: Operatore) => void; // PROPRIETA' => controvariante con strict
}

const generico = (d: Dipendente) => void d.nome;

// Con la sintassi a METODO, TS accetta il parametro piu' generale (bivarianza):
const hMet: HandlerMetodo = { gestisci: generico }; // ok (bivariante)
hMet.gestisci(op);

// Con la sintassi a PROPRIETA', vale la controvarianza (qui e' comunque ok,
// perche' Dipendente >: Operatore, quindi passa lo stesso ma per la regola strict):
const hProp: HandlerProprieta = { gestisci: generico }; // ok (controvariante: super->sub)

// Dove si vede la DIFFERENZA? Quando proviamo ad assegnare una fn con parametro
// piu' SPECIFICO del richiesto (unsafe). La proprieta' lo BLOCCA, il metodo NO.
const soloOperatore = (o: Operatore) => void o.reparto;

interface AcceptDip_Method {
  f(d: Dipendente): void;
}
interface AcceptDip_Prop {
  f: (d: Dipendente) => void;
}
// Metodo: bivariante -> passa anche una fn che vuole un Operatore (UNSAFE ma ammesso)
const okMethod: AcceptDip_Method = { f: soloOperatore }; // ok (bivarianza: buco di type safety)
// okMethod.f({ id: 9, nome: "X", badge: "UP-009" }); // a runtime leggerebbe .reparto -> undefined
// Proprieta': controvariante -> RIFIUTATO (giustamente)
// const koProp: AcceptDip_Prop = { f: soloOperatore };
// ERRORE TS: Type '(o: Operatore) => void' is not assignable to type '(d: Dipendente) => void'.

// MORALE: per gli handler dei tuoi tipi, preferisci la sintassi a PROPRIETA'
// (arrow) se vuoi la massima type safety controvariante.
void okMethod;
void hProp;

// ============================================================================
// 5) ARRAY: COVARIANTE (per pragmatismo) => rischio nascosto
// ============================================================================
// TypeScript rende Array covariante per comodita', anche se in teoria e' unsafe
// in scrittura. Operatore[] e' assegnabile a Dipendente[].
const operatori: Operatore[] = [op];
const dipendenti: Dipendente[] = operatori; // ok (covarianza array)
// Il "buco": ora posso pushare un Dipendente puro in un array di Operatore (via alias)
// dipendenti.push({ id: 2, nome: "Bea", badge: "UP-002" });
// operatori[1].reparto // sarebbe undefined a runtime: covarianza + mutabilita' = trappola
void dipendenti;

// ReadonlyArray e' piu' sicuro perche' non consente push:
const roDip: ReadonlyArray<Dipendente> = operatori; // ok e senza rischio di scrittura
void roDip;

// ============================================================================
// 6) PARAMETER-COUNT: meno parametri e' assegnabile a piu' parametri
// ============================================================================
// Una funzione che IGNORA argomenti extra e' assegnabile dove ne servono di piu'.
// (Modella i callback JS: map((v, i, arr) => ...) accetta anche (v) => ...)
type MapCallback = (valore: number, indice: number) => number;
const soloValore = (v: number) => v * 2;
const cb: MapCallback = soloValore; // ok: parametri in meno accettati
void cb(1, 2);
// Viceversa NO: non puoi richiedere piu' parametri di quelli forniti dal chiamante.
// const cbBad: (v: number) => number = (v: number, i: number) => v + i; // ERRORE TS

// ============================================================================
// 7) OPTIONAL / undefined nei parametri
// ============================================================================
// Un parametro obbligatorio del target puo' essere soddisfatto da uno optional
// nella source, ma non viceversa in modo unsafe.
type ConEntrata = (orario: string) => void;
const conOpt = (orario?: string) => void orario; // accetta anche undefined
const f7: ConEntrata = conOpt; // ok
void f7("08:00");

// ============================================================================
// 8) ESEMPIO ERP #1 - Repository generico e varianza del callback
// ============================================================================
// Mock (nessuna libreria esterna): definiamo noi le interfacce del dominio.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

interface Reparto {
  id: number;
  nome: string;
  turno: "P4" | "P2" | "STD";
}

// Un Repository<T> espone un forEach il cui callback riceve T.
interface Repository<T> {
  items: T[];
  // sintassi a METODO => bivariante: attenzione (vedi sotto)
  forEach(cb: (item: T) => void): void;
}

// Implementazione mock
function makeRepo<T>(items: T[]): Repository<T> {
  return {
    items,
    forEach(cb) {
      for (const it of items) cb(it);
    },
  };
}

const repoOperatori = makeRepo<Operatore>([op]);
// Un callback che accetta il supertipo Dipendente e' sempre sicuro (controvarianza):
repoOperatori.forEach((d: Dipendente) => void d.nome); // ok e SICURO

// A causa della sintassi a metodo (bivarianza), TS accetterebbe anche un cb
// che vuole un sottotipo piu' specifico. Se vogliamo BLOCCARLO, usiamo una
// versione a PROPRIETA':
interface RepositorySafe<T> {
  items: T[];
  forEach: (cb: (item: T) => void) => void; // proprieta' => varianza corretta
}
function makeRepoSafe<T>(items: T[]): RepositorySafe<T> {
  return { items, forEach: (cb) => items.forEach(cb) };
}
const repoSafe = makeRepoSafe<Operatore>([op]);
repoSafe.forEach((d: Dipendente) => void d.badge); // ok (super accettato)
// repoSafe.forEach((o: OperatoreConStato) => o.stato); // sarebbe rifiutato (vedi sotto)

// ============================================================================
// 9) ESEMPIO ERP #2 - EventBus tipizzato per timbrature
// ============================================================================
// Orari come stringhe naive-UTC "HH:MM". Validazione con regex.
const RE_ORARIO = /^\d{2}:\d{2}$/;
const RE_BADGE = /^UP-\d{3}$/;

interface EventoTimbratura {
  badge: string; // "UP-001"
  orario: string; // "08:00"
  tipo: "entrata" | "uscita";
}
interface EventoTimbraturaConReparto extends EventoTimbratura {
  reparto: string;
}

// Un handler e' una PROPRIETA' funzione => controvarianza (massima sicurezza).
type Handler<E> = (evento: E) => void;

class EventBus<E> {
  private handlers: Array<Handler<E>> = [];
  on(h: Handler<E>): void {
    this.handlers.push(h);
  }
  emit(evento: E): void {
    for (const h of this.handlers) h(evento);
  }
}

const bus = new EventBus<EventoTimbraturaConReparto>();

// Handler che usa solo i campi base: accetta il SUPERtipo EventoTimbratura.
// Grazie alla controvarianza dei parametri (proprieta' fn), e' assegnabile.
const logBase: Handler<EventoTimbratura> = (e) => {
  const okOrario = RE_ORARIO.test(e.orario);
  const okBadge = RE_BADGE.test(e.badge);
  void `${e.badge} ${e.orario} valido=${okOrario && okBadge}`;
};
bus.on(logBase); // ok: Handler<EventoTimbratura> assegnabile a Handler<...ConReparto>
bus.emit({ badge: "UP-001", orario: "08:00", tipo: "entrata", reparto: "Stampaggio" });

// Handler che pretende il campo extra .reparto: NON assegnabile a Handler del
// supertipo, ma QUI il bus e' del sottotipo quindi va bene.
const logConReparto: Handler<EventoTimbraturaConReparto> = (e) => void e.reparto;
bus.on(logConReparto); // ok

// Se il bus fosse del SUPERtipo, registrare logConReparto sarebbe UNSAFE:
const busBase = new EventBus<EventoTimbratura>();
// busBase.on(logConReparto);
// ERRORE TS: 'reparto' e' richiesto dall'handler ma non garantito dagli eventi emessi.
void busBase;

// ============================================================================
// 10) ESEMPIO ERP #3 - Validator componibili e varianza
// ============================================================================
// Un Validator<T> e' controvariante in T (T e' in posizione di parametro).
type Validator<T> = (valore: T) => boolean;

// Un validator che lavora su una stringa qualsiasi (supertipo) puo' essere usato
// dove serve un validator di un tipo piu' specifico (branded/narrow).
type OrarioStr = string; // (idealmente un branded type, semplificato qui)
const nonVuoto: Validator<string> = (s) => s.length > 0;
const validaOrario: Validator<OrarioStr> = nonVuoto; // ok (controvarianza)
void validaOrario("08:00");

// Combinatore che AND-a due validator dello stesso tipo:
function and<T>(a: Validator<T>, b: Validator<T>): Validator<T> {
  return (v) => a(v) && b(v);
}
const validaOrarioCompleto = and<string>(nonVuoto, (s) => RE_ORARIO.test(s));
void validaOrarioCompleto("8:00"); // => false (manca zero iniziale)
void validaOrarioCompleto("08:00"); // => true

// ============================================================================
// 11) MECCANISMO INTERNO: perche' la varianza e' cosi'
// ============================================================================
// Regola di assegnabilita' funzioni (source S assegnabile a target T):
//   1) Ogni parametro di T deve essere assegnabile al corrispondente di S
//      (CONTROVARIANTE: i parametri "girano al contrario").
//   2) Il return di S deve essere assegnabile al return di T (COVARIANTE).
//   3) S puo' avere MENO parametri di T (parametri in eccesso ignorati).
// Con strictFunctionTypes=false, il punto (1) diventa BIVARIANTE per tutte le fn
// (non solo i metodi): comodo ma unsafe. Con --strict e' attivo => piu' sicuro.

// Verifica type-level della controvarianza dei parametri:
type ParamContro = Expect<
  Equal<
    // Handler<Operatore> e' assegnabile a Handler<Dipendente>? NO (parametro piu' specifico)
    // ma Handler<Dipendente> e' assegnabile a Handler<Operatore>? SI.
    ((x: Dipendente) => void) extends ((x: Operatore) => void) ? true : false,
    true
  >
>;
void 0 as unknown as ParamContro;

// Verifica covarianza del return:
type RetCo = Expect<
  Equal<(() => Operatore) extends (() => Dipendente) ? true : false, true>
>;
void 0 as unknown as RetCo;

// ============================================================================
// 12) VARIANZA E GENERICS: annotazioni 'in' / 'out' (TS 4.7+)
// ============================================================================
// Dai type parameter possiamo annotare la varianza attesa; TS la verifica.
// - 'out T': T usato solo in posizione covariante (return) => Producer.
// - 'in T' : T usato solo in posizione controvariante (parametro) => Consumer.
interface Producer<out T> {
  produce(): T;
}
interface Consumer<in T> {
  consume(value: T): void;
}
// Se violassimo l'annotazione, TS segnala l'errore. Esempio VOLUTO (commentato):
// interface WrongOut<out T> { consume(v: T): void; }
// ERRORE TS: Type 'T' is used in a contravariant position but declared as covariant.

// Consumer e' controvariante: Consumer<Dipendente> assegnabile a Consumer<Operatore>.
const consDip: Consumer<Dipendente> = { consume: (d) => void d.nome };
const consOp: Consumer<Operatore> = consDip; // ok (in T => controvariante)
consOp.consume(op);
void consOp;
// Producer e' covariante: Producer<Operatore> assegnabile a Producer<Dipendente>.
const prodOp: Producer<Operatore> = { produce: () => op };
const prodDip: Producer<Dipendente> = prodOp; // ok (out T => covariante)
void prodDip.produce().nome;

// ============================================================================
// 13) STATO MACCHINA: transizioni e varianza dei parametri
// ============================================================================
// Una macchina a stati per la timbratura: "fuori" -> entrata -> "dentro" -> uscita.
type StatoPresenza = "fuori" | "dentro";
interface Transizione {
  da: StatoPresenza;
  a: StatoPresenza;
  orario: string;
}
// La reducer function riceve lo stato e un evento; il suo parametro-evento e'
// controvariante: un reducer che accetta un evento base va bene per uno esteso.
type Reducer<S, Ev> = (stato: S, evento: Ev) => S;

const reducerBase: Reducer<StatoPresenza, EventoTimbratura> = (stato, ev) => {
  if (stato === "fuori" && ev.tipo === "entrata") return "dentro";
  if (stato === "dentro" && ev.tipo === "uscita") return "fuori";
  return stato; // transizione non valida: stato invariato
};
// Usiamo reducerBase dove serve un reducer di eventi CON reparto (controvarianza ok):
const reducerConReparto: Reducer<StatoPresenza, EventoTimbraturaConReparto> = reducerBase; // ok
const nuovoStato = reducerConReparto("fuori", {
  badge: "UP-001",
  orario: "08:00",
  tipo: "entrata",
  reparto: "Stampaggio",
});
void nuovoStato; // tipo: StatoPresenza  => "dentro"

// ============================================================================
// 14) GOTCHA / PITFALLS
// ============================================================================
// --- GOTCHA 1: metodo vs proprieta' cambia la sicurezza degli handler ---
// Se dichiari onClick come METODO, TS e' piu' lasco (bivarianza) e puoi
// registrare handler unsafe senza errore. Preferisci la sintassi a PROPRIETA'.
interface WidgetMetodo {
  onSelect(op: Operatore): void; // bivariante: buco
}
interface WidgetProprieta {
  onSelect: (op: Operatore) => void; // controvariante: sicuro
}
const soloOp = (o: Operatore) => void o.reparto;
const wm: WidgetMetodo = { onSelect: soloOp }; // sempre ok
void wm;
// Ma se poi lo tratti come "accetta un Dipendente":
// const wmDip: { onSelect(d: Dipendente): void } = wm; // ok (bivarianza) -> UNSAFE
// const wpDip: { onSelect: (d: Dipendente) => void } = { onSelect: soloOp };
// ERRORE TS (proprieta'): (o: Operatore) => void non assegnabile a (d: Dipendente) => void

// --- GOTCHA 2: array covariante + mutazione = crash a runtime ---
// Vedi sezione 5. Soluzione: usa ReadonlyArray<T> quando passi array "in lettura".
function stampaBadge(lista: ReadonlyArray<Dipendente>): void {
  for (const d of lista) void d.badge;
}
stampaBadge(operatori); // ok e sicuro (nessun push possibile all'interno)

// --- GOTCHA 3: () => void accetta funzioni che ritornano QUALSIASI cosa ---
// Il return type 'void' e' speciale: una fn che ritorna un valore E' assegnabile
// a una che ritorna void (il valore viene ignorato). Utile con forEach/callback.
type VoidFn = (x: number) => void;
const ritornaNumero: VoidFn = (x) => x + 1; // ok: il numero e' scartato
void ritornaNumero(5);
// Attenzione: NON significa che puoi USARE quel valore di ritorno.
// const r: number = (ritornaNumero as (x: number) => void)(5); // r sarebbe 'void'
// ERRORE TS: Type 'void' is not assignable to type 'number'.

// --- GOTCHA 4: strictFunctionTypes NON tocca i metodi ---
// Anche in --strict, la bivarianza dei metodi resta. Non contarci per la safety:
// se serve controvarianza reale, riscrivi il metodo come proprieta' arrow.
// (Non esiste un flag "strictMethodTypes".)

// ============================================================================
// 15) MINI-ESERCIZIO DI TIPO (costruzione passo-passo)
// ============================================================================
// Costruiamo IsAssignable<S, T> = true se S e' assegnabile a T.
type IsAssignable<S, T> = S extends T ? true : false;

// Test sulle funzioni handler dell'ERP:
type _e1 = Expect<Equal<IsAssignable<Handler<EventoTimbratura>, Handler<EventoTimbraturaConReparto>>, true>>;
// Handler del supertipo -> assegnabile all'handler del sottotipo (controvarianza)
type _e2 = Expect<Equal<IsAssignable<Handler<EventoTimbraturaConReparto>, Handler<EventoTimbratura>>, false>>;
// Handler del sottotipo -> NON assegnabile all'handler del supertipo (unsafe)
type _e3 = Expect<Equal<IsAssignable<CreaOperatore, CreaDipendente>, true>>; // return covariante
type _e4 = Expect<Equal<IsAssignable<CreaDipendente, CreaOperatore>, false>>;
// (nessun uso a runtime: sono solo test di tipo)
void 0 as unknown as [_e1, _e2, _e3, _e4];

// Tipo usato in un commento della sezione 8, definito qui per completezza:
interface OperatoreConStato extends Operatore {
  stato: StatoPresenza;
}
const _osExample: OperatoreConStato = { ...op, stato: "fuori" };
void _osExample;

// ============================================================================
// EXPORT (solo simboli locali di questo file)
// ============================================================================
export {
  makeRepo,
  makeRepoSafe,
  EventBus,
  and,
  stampaBadge,
  RE_ORARIO,
  RE_BADGE,
};
export type {
  Equal,
  Expect,
  Dipendente,
  Operatore,
  OperatoreConStato,
  Ruolo,
  Reparto,
  Handler,
  Validator,
  Reducer,
  Repository,
  RepositorySafe,
  Producer,
  Consumer,
  EventoTimbratura,
  EventoTimbraturaConReparto,
  IsAssignable,
};

/*
 * ============================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================================
 * - VARIANZA: come subtype si propaga a costruttori di tipo (array, fn, ...).
 * - COVARIANTE: Sub<:Super => F<Sub><:F<Super> (return type, out T, array TS).
 * - CONTROVARIANTE: Sub<:Super => F<Super><:F<Sub> (parametri fn con strict, in T).
 * - BIVARIANTE: vale in entrambi i versi (parametri dei METODI, sempre).
 * - INVARIANTE: nessuna direzione (es. mutable box teorico).
 * - REGOLA FN: parametri controvarianti + return covariante + meno parametri ok.
 * - METODO vs PROPRIETA': metodo(x)=bivariante; prop:(x)=>=controvariante(strict).
 *   -> per handler sicuri usa la PROPRIETA' arrow.
 * - strictFunctionTypes (in --strict): parametri fn controvarianti; NON tocca i metodi.
 * - ARRAY covariante = comodo ma unsafe in scrittura -> usa ReadonlyArray in lettura.
 * - () => void: accetta fn che ritornano valori (scartati); il return resta void.
 * - Parametri optional/undefined: super soddisfa sub, non il contrario unsafe.
 * - ANNOTAZIONI GENERICS (TS 4.7+): 'out T' covariante, 'in T' controvariante.
 * - HELPER TIPO: Equal<A,B>, Expect<T extends true>, IsAssignable<S,T>.
 * - ESEMPI ERP: Repository forEach, EventBus timbrature, Validator componibili,
 *   Reducer stato presenza (fuori/dentro) con eventi entrata/uscita.
 * - GOTCHA: bivarianza metodi, array+mutazione, void speciale, no strictMethodTypes.
 */
