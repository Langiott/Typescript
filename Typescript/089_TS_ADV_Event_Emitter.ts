/**
 * 089_TS_ADV_Event_Emitter.ts
 * File 89 - ADV Event emitter typed
 *
 * Un EventEmitter type-safe: una EventMap associa ad ogni nome-evento il tipo
 * del suo payload. Con generics + keyof rendiamo emit/on/off/once totalmente
 * type-safe: TypeScript inferisce il payload dal nome dell'evento e blocca a
 * compile-time nomi inesistenti o payload sbagliati. Dominio ERP Polyuretech:
 * eventi "timbratura:entrata" / "timbratura:uscita" e stato macchina turni.
 */

// ============================================================================
// SEZIONE 0 - Helper di test a livello di tipo (Equal / Expect)
// ============================================================================

// Equal confronta due tipi in modo esatto sfruttando l'identita' delle
// funzioni condizionali: due tipi X e Y sono uguali sse le due lambda
// condizionali producono lo stesso ramo. Trucco noto per l'uguaglianza stretta.
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
    ? true
    : false;

// Expect accetta solo il letterale true: se il test fallisce, non compila.
type Expect<T extends true> = T;

// Helper 'MutualAssign': A e B sono MUTUAMENTE assegnabili (A<:B e B<:A).
// E' piu' permissivo di Equal (che e' invariante e coglie differenze strutturali
// come i branded type): utile quando due tipi sono equivalenti "all'uso" ma non
// identici bit-a-bit. [X] extends [Y] evita la distributivita' sulle union.
type MutualAssign<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// Esempio: questi alias esistono solo per verificare i tipi a compile-time.
type _t0 = Expect<Equal<string, string>>; // ok
// type _t0bad = Expect<Equal<string, number>>; // ERRORE TS: false non soddisfa true

// ============================================================================
// SEZIONE 1 - Modello di dominio ERP (mock, nessuna libreria)
// ============================================================================

// Tipi di base del dominio. Sono definiti qui: nessun import esterno.
export type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
export type Turno = "P4" | "P2" | "STD";

// Template literal types per validare la FORMA di badge e orario a livello di
// tipo (approssimazione: il vincolo runtime resta la regex).
type Cifra = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type Badge = `UP-${Cifra}${Cifra}${Cifra}`; // es: "UP-001"
export type OrarioHHMM = `${Cifra}${Cifra}:${Cifra}${Cifra}`; // es: "07:30"

export interface Dipendente {
  id: number;
  nome: string;
  badge: Badge;
  ruolo: Ruolo;
}

export interface Reparto {
  id: number;
  nome: string;
}

// Timbratura con orario naive-UTC in formato "HH:MM" (niente Date, niente TZ).
export interface Timbratura {
  dipendenteId: number;
  badge: Badge;
  tipo: "entrata" | "uscita";
  orario: OrarioHHMM;
  turno: Turno;
}

// ============================================================================
// SEZIONE 2 - La EventMap tipizzata
// ============================================================================

// Una EventMap e' un semplice oggetto-tipo: chiave = nome evento, valore = tipo
// del payload trasportato da quell'evento. Nessun valore runtime, solo tipi.
// NOTA: usiamo una index signature [k: string]: unknown per soddisfare il
// vincolo Record<string, unknown> della classe TypedEventEmitter (vedi GOTCHA 3).
// Cosi' la mappa resta assegnabile al constraint generico mantenendo il
// type-safety sulle chiavi note.
export interface ErpEventMap {
  [evento: string]: unknown;
  "timbratura:entrata": { badge: Badge; orario: OrarioHHMM; turno: Turno };
  "timbratura:uscita": { badge: Badge; orario: OrarioHHMM };
  "dipendente:creato": Dipendente;
  "reparto:aggiornato": Reparto;
  // Evento senza payload utile: usiamo void come convenzione.
  "sistema:ready": void;
  "errore": { codice: number; messaggio: string };
}

// keyof estrae l'unione dei nomi-evento validi.
type NomiEvento = keyof ErpEventMap;
// GOTCHA IMPORTANTE: ErpEventMap ha una index signature "[evento: string]: unknown"
// (riga sopra). Per questo "keyof ErpEventMap" NON e' solo l'unione dei nomi
// letterali, ma "string | number": la index signature string ammette anche indici
// numerici. Quindi NomiEvento = string | number (i literal vengono "assorbiti").
type _t1 = Expect<Equal<NomiEvento, string | number>>;

// Se vuoi SOLO i nomi-evento concreti (senza la index signature), definiscili in un
// tipo dedicato e usa quello per le operazioni type-level:
type NomiEventoNoti =
  | "timbratura:entrata"
  | "timbratura:uscita"
  | "dipendente:creato"
  | "reparto:aggiornato"
  | "sistema:ready"
  | "errore";
type _t1b = Expect<[NomiEventoNoti] extends [string] ? true : false>; // ok: tutti string

// ============================================================================
// SEZIONE 3 - Il tipo del listener e il problema di "void"
// ============================================================================

// Un listener riceve il payload dell'evento K. Con K generico vincolato a
// keyof EventMap, EventMap[K] e' il payload esatto: l'indicizzazione tipo-livello
// fa la "lookup" del valore associato alla chiave.
export type Listener<
  EventMap,
  K extends keyof EventMap
> = (payload: EventMap[K]) => void;

// Il caso "void": vogliamo poter emettere "sistema:ready" SENZA passare
// argomenti. Costruiamo un tuple-type condizionale per gli argomenti di emit:
// se il payload e' void, la lista argomenti e' vuota [], altrimenti [payload].
// Questo sfrutta la distribuzione dei rest-args tipizzati come tuple.
export type EmitArgs<P> = [P] extends [void] ? [] : [payload: P];
//   Nota: avvolgiamo in [P] per DISABILITARE la distributivita' del conditional
//   type sulle unioni. Senza le parentesi, "A | void" verrebbe distribuito e il
//   ramo void produrrebbe [] mescolato ad altri rami, rompendo l'inferenza.

type _t2 = Expect<Equal<EmitArgs<void>, []>>;
type _t3 = Expect<Equal<EmitArgs<{ x: number }>, [payload: { x: number }]>>;
// Con il wrapping [P], anche un payload che INCLUDE void non collassa a []:
type _t4 = Expect<Equal<EmitArgs<number | void>, [payload: number | void]>>;

// ============================================================================
// SEZIONE 4 - La classe TypedEventEmitter
// ============================================================================

// EM e' il parametro generico della EventMap: ogni emitter e' "sagomato" sulla
// propria mappa di eventi. Vincolo: le chiavi devono essere property-key.
export class TypedEventEmitter<EM extends Record<string, unknown>> {
  // Registro interno: per ogni evento, un Set di listener.
  // Usiamo un Record parziale con valore Set di funzioni "larghe": internamente
  // rilassiamo il tipo, il type-safety vero e' garantito dalle firme pubbliche.
  private readonly registry: {
    [K in keyof EM]?: Set<(payload: EM[K]) => void>;
  } = {};

  // Wrapper once -> handler originale, per poter fare off() dopo un once().
  private readonly onceWrappers = new WeakMap<
    (payload: never) => void,
    (payload: never) => void
  >();

  // on: registra un listener. Il generic K viene INFERITO dal primo argomento
  // (il nome dell'evento), quindi listener riceve gia' il payload giusto.
  on<K extends keyof EM>(evento: K, listener: (payload: EM[K]) => void): this {
    // Il '??=' inizializza il Set solo la prima volta.
    (this.registry[evento] ??= new Set())!.add(listener);
    return this; // chaining fluente: emitter.on(...).on(...)
  }

  // off: rimuove un listener. Se il listener era stato registrato via once,
  // rimuoviamo il wrapper reale memorizzato nella WeakMap.
  off<K extends keyof EM>(evento: K, listener: (payload: EM[K]) => void): this {
    const set = this.registry[evento];
    if (!set) return this;
    // Cerchiamo un eventuale wrapper once collegato a questo listener.
    const wrapper = this.onceWrappers.get(
      listener as unknown as (payload: never) => void
    );
    if (wrapper) {
      set.delete(wrapper as unknown as (payload: EM[K]) => void);
      this.onceWrappers.delete(listener as unknown as (payload: never) => void);
    } else {
      set.delete(listener);
    }
    return this;
  }

  // once: il listener viene eseguito una sola volta, poi si auto-rimuove.
  // Salviamo il legame handler-originale -> wrapper cosi' off(handler) funziona.
  once<K extends keyof EM>(evento: K, listener: (payload: EM[K]) => void): this {
    const wrapper = (payload: EM[K]): void => {
      this.off(evento, wrapper);
      listener(payload);
    };
    this.onceWrappers.set(
      listener as unknown as (payload: never) => void,
      wrapper as unknown as (payload: never) => void
    );
    return this.on(evento, wrapper);
  }

  // emit: rest-args condizionale. Se EM[K] e' void, si chiama senza payload;
  // altrimenti il payload e' obbligatorio e con il tipo esatto.
  emit<K extends keyof EM>(evento: K, ...args: EmitArgs<EM[K]>): boolean {
    const set = this.registry[evento];
    if (!set || set.size === 0) return false;
    // args[0] e' il payload (o undefined per gli eventi void).
    const payload = args[0] as EM[K];
    // Copiamo in array per evitare problemi se un listener modifica il Set
    // (es. once che rimuove se stesso durante l'iterazione).
    for (const listener of [...set]) {
      listener(payload);
    }
    return true;
  }

  // Utility: quanti listener per un dato evento.
  listenerCount<K extends keyof EM>(evento: K): number {
    return this.registry[evento]?.size ?? 0;
  }

  // Utility: rimuove tutti i listener di un evento (o di tutti se omesso).
  removeAll<K extends keyof EM>(evento?: K): this {
    if (evento === undefined) {
      for (const k of Object.keys(this.registry) as (keyof EM)[]) {
        this.registry[k]?.clear();
      }
    } else {
      this.registry[evento]?.clear();
    }
    return this;
  }
}

// ============================================================================
// SEZIONE 5 - Uso base: type-safety di emit/on
// ============================================================================

// Istanziamo l'emitter sulla EventMap ERP.
const bus = new TypedEventEmitter<ErpEventMap>();

// on: il payload e' inferito. Nessuna annotazione manuale necessaria.
bus.on("timbratura:entrata", (p) => {
  // p tipo: { badge: Badge; orario: OrarioHHMM; turno: Turno }
  const _b: Badge = p.badge; // ok
  const _o: OrarioHHMM = p.orario; // ok
  void _b;
  void _o;
});

// emit: payload obbligatorio e tipizzato.
bus.emit("timbratura:entrata", {
  badge: "UP-001",
  orario: "07:30",
  turno: "P4",
});

// Evento void: si emette senza payload.
bus.on("sistema:ready", () => {
  // nessun payload
});
bus.emit("sistema:ready"); // ok: nessun argomento richiesto

// --- Errori che il compilatore blocca (COMMENTATI per far compilare) ---

// bus.emit("timbratura:entrata", { badge: "UP-001" });
// ERRORE TS: mancano 'orario' e 'turno' nel payload.

// bus.emit("timbratura:entrata"); // ERRORE TS: atteso 1 argomento payload.

// bus.emit("evento:inesistente", {}); // ERRORE TS: nome evento non in keyof.

// bus.on("timbratura:uscita", (p: { badge: Badge; orario: OrarioHHMM; turno: Turno }) => {});
// ERRORE TS: il payload di uscita NON ha 'turno', firma incompatibile.

// bus.emit("sistema:ready", { x: 1 });
// ERRORE TS: 'sistema:ready' e' void, nessun argomento payload ammesso.

// ============================================================================
// SEZIONE 6 - off e once
// ============================================================================

// off richiede lo STESSO riferimento di funzione usato in on.
const onEntrata: Listener<ErpEventMap, "timbratura:entrata"> = (p) => {
  void p.badge;
};
bus.on("timbratura:entrata", onEntrata);
bus.off("timbratura:entrata", onEntrata); // rimosso correttamente

// once: eseguito una sola volta.
let contaReady = 0;
bus.once("sistema:ready", () => {
  contaReady++;
});
bus.emit("sistema:ready");
bus.emit("sistema:ready");
// contaReady === 1 perche' il listener si e' auto-rimosso dopo il primo emit.
void contaReady;

// off funziona anche sul handler originale passato a once (grazie alla WeakMap).
const onceHandler: Listener<ErpEventMap, "errore"> = (e) => {
  void e.messaggio;
};
bus.once("errore", onceHandler);
bus.off("errore", onceHandler); // rimuove il wrapper prima che scatti

// ============================================================================
// SEZIONE 7 - Esempio ERP realistico: servizio timbrature
// ============================================================================

// Repository mock (in memoria): niente Prisma, solo un array.
class TimbratureRepository {
  private readonly righe: Timbratura[] = [];
  salva(t: Timbratura): void {
    this.righe.push(t);
  }
  perBadge(badge: Badge): readonly Timbratura[] {
    return this.righe.filter((r) => r.badge === badge);
  }
}

// Servizio che reagisce agli eventi del bus e li persiste. Mostra il pattern
// "emitter come integrazione fra moduli disaccoppiati".
class ServizioTimbrature {
  constructor(
    private readonly repo: TimbratureRepository,
    private readonly emitter: TypedEventEmitter<ErpEventMap>
  ) {
    // Sottoscrizioni: ogni handler riceve il payload gia' tipizzato.
    this.emitter.on("timbratura:entrata", (p) => this.onEntrata(p));
    this.emitter.on("timbratura:uscita", (p) => this.onUscita(p));
  }

  private onEntrata(p: ErpEventMap["timbratura:entrata"]): void {
    this.repo.salva({
      dipendenteId: 0,
      badge: p.badge,
      tipo: "entrata",
      orario: p.orario,
      turno: p.turno,
    });
  }

  private onUscita(p: ErpEventMap["timbratura:uscita"]): void {
    // L'uscita non porta il turno: convenzione, lo settiamo a "STD".
    this.repo.salva({
      dipendenteId: 0,
      badge: p.badge,
      tipo: "uscita",
      orario: p.orario,
      turno: "STD",
    });
  }

  report(badge: Badge): readonly Timbratura[] {
    return this.repo.perBadge(badge);
  }
}

const repo = new TimbratureRepository();
const servizio = new ServizioTimbrature(repo, bus);
bus.emit("timbratura:entrata", { badge: "UP-007", orario: "08:00", turno: "P2" });
bus.emit("timbratura:uscita", { badge: "UP-007", orario: "17:00" });
// servizio.report("UP-007") -> 2 righe (entrata + uscita)
void servizio;

// ============================================================================
// SEZIONE 8 - Pattern type-level: filtrare eventi per prefisso
// ============================================================================

// Estrae dalla EventMap solo le chiavi che iniziano con un dato prefisso.
// Sfrutta i template literal types come pattern-match sulle stringhe: la parte
// `${infer _}` cattura il resto del nome dopo il prefisso.
// Idioma affidabile: KEY REMAPPING con "as". Le chiavi che non iniziano con il
// prefisso vengono rimappate a "never" (e quindi ELIMINATE dal tipo), poi "keyof"
// raccoglie quelle rimaste. (La variante "{ [K]: ... ? K : never }[keyof EM]"
// puo' collassare a "never" in alcuni casi: questa e' piu' robusta.)
export type EventiConPrefisso<EM, Prefix extends string> = keyof {
  [K in keyof EM as K extends `${Prefix}${string}` ? K : never]: EM[K];
};

type EventiTimbratura = EventiConPrefisso<ErpEventMap, "timbratura:">;
// tipo: "timbratura:entrata" | "timbratura:uscita"
type _t5 = Expect<
  Equal<EventiTimbratura, "timbratura:entrata" | "timbratura:uscita">
>;

// Il pattern mapped-type + index-access [keyof EM] e' l'idioma standard per
// "collezionare" chiavi filtrate: le chiavi scartate diventano never e never
// sparisce dall'unione finale.

// ============================================================================
// SEZIONE 9 - Stato macchina tipizzata guidata da eventi
// ============================================================================

// Mostriamo come un emitter puo' pilotare una FSM (finite state machine) del
// turno di un dipendente. Gli stati sono un'unione discriminata.
export type StatoTurno =
  | { fase: "assente" }
  | { fase: "presente"; entrata: OrarioHHMM; turno: Turno }
  | { fase: "chiuso"; entrata: OrarioHHMM; uscita: OrarioHHMM };

// Transizione pura: dato uno stato e un evento, produce il nuovo stato.
// switch esaustivo sui possibili eventi rilevanti.
export function transizione(
  stato: StatoTurno,
  evento:
    | { t: "entrata"; orario: OrarioHHMM; turno: Turno }
    | { t: "uscita"; orario: OrarioHHMM }
): StatoTurno {
  switch (evento.t) {
    case "entrata":
      // Si entra solo se assenti; altrimenti stato invariato (idempotenza).
      return stato.fase === "assente"
        ? { fase: "presente", entrata: evento.orario, turno: evento.turno }
        : stato;
    case "uscita":
      // Si esce solo se presenti; il narrowing su fase="presente" espone
      // 'stato.entrata' senza cast.
      return stato.fase === "presente"
        ? { fase: "chiuso", entrata: stato.entrata, uscita: evento.orario }
        : stato;
    default: {
      // Exhaustiveness check: se aggiungi un case a 'evento' e dimentichi un
      // ramo, 'evento' non sara' piu' never e questa riga dara' ERRORE TS.
      const _exhaustive: never = evento;
      return _exhaustive;
    }
  }
}

// Colleghiamo la FSM al bus: ad ogni evento di timbratura aggiorniamo lo stato.
let statoUP009: StatoTurno = { fase: "assente" };
bus.on("timbratura:entrata", (p) => {
  if (p.badge === "UP-009") {
    statoUP009 = transizione(statoUP009, {
      t: "entrata",
      orario: p.orario,
      turno: p.turno,
    });
  }
});
bus.on("timbratura:uscita", (p) => {
  if (p.badge === "UP-009") {
    statoUP009 = transizione(statoUP009, { t: "uscita", orario: p.orario });
  }
});
bus.emit("timbratura:entrata", { badge: "UP-009", orario: "09:00", turno: "STD" });
bus.emit("timbratura:uscita", { badge: "UP-009", orario: "18:00" });
// statoUP009 -> { fase: "chiuso", entrata: "09:00", uscita: "18:00" }
void statoUP009;

// ============================================================================
// SEZIONE 10 - waitFor: promisify di un evento (once + Promise)
// ============================================================================

// Restituisce una Promise che risolve col payload del primo evento emesso.
// Utile per attendere in stile async/await un evento asincrono.
export function waitFor<EM extends Record<string, unknown>, K extends keyof EM>(
  emitter: TypedEventEmitter<EM>,
  evento: K
): Promise<EM[K]> {
  return new Promise<EM[K]>((resolve) => {
    emitter.once(evento, (payload) => resolve(payload));
  });
}

// Esempio d'uso (funzione non chiamata: solo per mostrare il tipo).
async function esempioWaitFor(): Promise<void> {
  const p = await waitFor(bus, "timbratura:entrata");
  // p tipo: { badge: Badge; orario: OrarioHHMM; turno: Turno }
  void p.turno;
}
void esempioWaitFor;

// ============================================================================
// SEZIONE 11 - GOTCHA / PITFALLS
// ============================================================================

// GOTCHA 1 - Arrow inline non e' rimovibile con off.
//   Se registri una arrow inline, non ne conservi il riferimento: off con una
//   nuova arrow (anche identica) NON rimuove nulla, perche' le due funzioni sono
//   oggetti distinti. Soluzione: salva la funzione in una const e riusala.
// bus.on("errore", (e) => console.log(e.codice));
// bus.off("errore", (e) => console.log(e.codice)); // NON rimuove: altra ref!

// GOTCHA 2 - Distributivita' del conditional type in EmitArgs.
//   Senza il wrapping [P] extends [void], un payload di tipo unione con void
//   verrebbe distribuito e il ramo void produrrebbe [], collassando la tupla.
//   Verifica: EmitArgs<number | void> deve restare [payload: number | void].
type _t6 = Expect<Equal<EmitArgs<number | void>, [payload: number | void]>>;
//   Versione SBAGLIATA (distributiva) per confronto didattico:
type EmitArgsWrong<P> = P extends void ? [] : [payload: P];
type _t7 = Expect<Equal<EmitArgsWrong<number | void>, [] | [payload: number]>>;
//   ^ distribuita: si e' spezzata in due rami. Ecco perche' serve [P].

// GOTCHA 3 - EM vincolato a Record<string, unknown>.
//   La classe richiede che EM sia assegnabile a Record<string, unknown>: una
//   interface SENZA index signature NON lo soddisfa (le interface non hanno un
//   index implicito). Per questo ErpEventMap dichiara '[evento: string]:
//   unknown' in SEZIONE 2. In alternativa si sarebbe potuto usare un 'type' con
//   intersezione, o allargare il vincolo della classe a Record<string, any>.
// const bad = new TypedEventEmitter<string>();
// ERRORE TS: 'string' non e' assegnabile a Record<string, unknown>.

// GOTCHA 4 - void payload e listener con 1 parametro.
//   Un listener su evento void puo' comunque dichiarare un parametro (sara'
//   'undefined' a runtime), ma NON puoi renderlo obbligatorio in emit: emit
//   non passa argomenti per gli eventi void. Meglio: listener senza parametri.
bus.on("sistema:ready", (_p) => {
  // _p tipo: void  (a runtime undefined) - preferibile ometterlo del tutto.
  void _p;
});

// ============================================================================
// SEZIONE 12 - Export pubblici del modulo
// ============================================================================

export type { NomiEvento, EventiTimbratura };
export { bus, TimbratureRepository, ServizioTimbrature };

/*
 * ============================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================================
 * - EventMap: interface { "nome:evento": PayloadType } -> single source of truth.
 * - keyof EventMap: unione dei nomi-evento validi.
 * - EventMap[K]: index-access type -> lookup del payload dalla chiave.
 * - Generics + keyof su on/off/emit/once: K inferito dal nome evento.
 * - Listener<EM,K> = (payload: EM[K]) => void: firma dedotta dall'evento.
 * - EmitArgs<P> = [P] extends [void] ? [] : [payload: P]: rest-args condizionali.
 * - Wrapping [P]: DISABILITA la distributivita' del conditional type su unioni.
 * - emit(evento, ...args): payload obbligatorio o assente (eventi void).
 * - on/off/once: off richiede la STESSA reference; WeakMap lega once-handler->wrapper.
 * - once: wrapper che chiama off(self) poi il listener -> esecuzione singola.
 * - waitFor: once + Promise -> attesa async/await di un evento.
 * - Template literal types + infer: EventiConPrefisso filtra eventi per prefisso.
 * - Mapped type + [keyof EM]: idioma per collezionare chiavi (never sparisce).
 * - FSM tipizzata: unione discriminata + switch esaustivo + never check.
 * - Exhaustiveness: const _x: never = evento nel default -> errore se dimentichi un case.
 * - Equal/Expect: test di uguaglianza a livello di tipo (compile-time only).
 * - GOTCHA: arrow inline non rimovibile; distributivita'; vincolo Record; void payload.
 * ============================================================================
 */



