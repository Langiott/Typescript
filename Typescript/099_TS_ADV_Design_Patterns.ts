/**
 * File 099 - ADV Design Patterns in TypeScript (tipizzati)
 * Rassegna avanzata dei design pattern GoF piu' usati, adattati al type system di TS:
 * Singleton, Factory, Strategy, Observer, Adapter, Decorator (il PATTERN, non la sintassi @decorator).
 * Ogni pattern e' spiegato col "perche' dei tipi" (generics, distributivita', inferenza, control flow)
 * e ancorato al dominio ERP Polyuretech (Dipendente, Timbratura, Reparto, Turno, ruoli).
 * NB: experimentalDecorators=FALSE -> la sintassi @decorator compare SOLO nei commenti.
 * Tutto compila con: tsc --strict --target ES2022 --lib ES2022,DOM --noEmit
 */

// ============================================================================
// TIPI DI DOMINIO ERP (mock, definiti qui: nessun import esterno)
// ============================================================================

// Ruoli applicativi come union di string literal: e' un tipo "chiuso" ed
// esaustivo, quindi lo switch potra' essere verificato con never (vedi sotto).
export type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Turni di reparto. STD = standard, P2/P4 = turni speciali.
export type Turno = "P4" | "P2" | "STD";

// Template literal type: un badge e' "UP-" seguito da qualcosa.
// Non vincola le cifre a runtime, ma documenta la forma a compile time.
export type Badge = `UP-${string}`; // pattern runtime: /^UP-\d{3}$/

// Un orario naive-UTC in formato "HH:MM" (pattern runtime: /^\d{2}:\d{2}$/).
export type OrarioHHMM = `${number}:${number}`; // approssimazione a compile time

export interface Dipendente {
  readonly id: number;
  nome: string;
  badge: Badge;   // es: "UP-001"
  ruolo: Ruolo;
  reparto?: string;
}

export interface Timbratura {
  readonly id: number;
  dipendenteId: number;
  tipo: "entrata" | "uscita";
  orario: OrarioHHMM; // "08:30"
  turno: Turno;
}

// ============================================================================
// HELPER DI TEST DI TIPO (Equal / Expect) - usati per "asserzioni a compile time"
// ============================================================================

// Equal<A,B> sfrutta il fatto che due funzioni condizionali generiche sono
// assegnabili l'una all'altra SOLO se A e B sono identici (stessa varianza).
// E' il trucco standard per l'uguaglianza esatta dei tipi (piu' preciso di extends).
export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect accetta solo true: se il test fallisce, il tipo diventa un errore.
export type Expect<T extends true> = T;

// Esempio d'uso (asserzioni a compile time, non producono codice a runtime):
type _t1 = Expect<Equal<Ruolo, "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay">>;
// ERRORE TS: type _bad = Expect<Equal<Ruolo, "Admin">>;  // false non estende true

// ============================================================================
// 1) SINGLETON - una sola istanza condivisa, tipizzata
// ============================================================================

// Idea: costruttore privato + accessore statico. In TS il "private constructor"
// impedisce `new` esterno gia' a compile time (non solo a runtime).
// ERP: un client di configurazione globale (fuso, feature flags) deve essere unico.

export interface ConfigErp {
  fuso: string;          // es: "Europe/Rome"
  serverNaiveUTC: boolean;
  turnoDefault: Turno;
}

export class ConfigService {
  // L'istanza vive nella proprieta' statica: unica per tutto il processo.
  private static _instance: ConfigService | null = null;

  // readonly per congelare la config dopo la costruzione.
  private constructor(public readonly config: ConfigErp) {}

  // getInstance e' l'unico modo per ottenere l'oggetto. Lazy init.
  static getInstance(): ConfigService {
    // Il narrowing su `_instance` (da `... | null` a `ConfigService`) avviene
    // via control-flow analysis dentro l'if: TS "restringe" il tipo nel ramo.
    if (ConfigService._instance === null) {
      ConfigService._instance = new ConfigService({
        fuso: "Europe/Rome",
        serverNaiveUTC: true,
        turnoDefault: "STD",
      });
    }
    return ConfigService._instance;
  }
}

const cfgA = ConfigService.getInstance();
const cfgB = ConfigService.getInstance();
// A runtime cfgA === cfgB (stessa istanza).
// ERRORE TS: const c = new ConfigService({ ... }); // Constructor is private
export const stessaIstanza = cfgA === cfgB; // => true (a runtime)

// Variante type-safe con "brand": un token che prova il passaggio dalla factory.
// Utile quando vuoi impedire di costruire l'oggetto senza init controllato.
declare const SINGLETON_BRAND: unique symbol;
type Branded<T> = T & { readonly [SINGLETON_BRAND]: true };

// ============================================================================
// 2) FACTORY - creazione disaccoppiata, con overload/discriminated union
// ============================================================================

// Idea: nascondere il `new` dietro una funzione che sceglie l'implementazione.
// La forza in TS e': mappare una "chiave" (discriminante) al tipo di ritorno esatto
// tramite conditional/mapped types, cosi' il chiamante non perde informazione.

// Prodotti: badge display diversi per ruolo.
interface DisplayBase {
  ruolo: Ruolo;
  render(): string;
}
interface AdminDisplay extends DisplayBase {
  ruolo: "SuperAdmin" | "Admin";
  pannelloAdmin: true;
}
interface OperatoreDisplay extends DisplayBase {
  ruolo: "Operatore";
  timbraturaRapida: true;
}
interface QrDisplayView extends DisplayBase {
  ruolo: "QrDisplay";
  soloLettura: true;
}

// Mappa chiave -> tipo prodotto. E' il cuore della factory tipizzata:
// permette a `creaDisplay` di restituire il tipo ESATTO in base all'argomento.
interface DisplayMap {
  SuperAdmin: AdminDisplay;
  Admin: AdminDisplay;
  Operatore: OperatoreDisplay;
  QrDisplay: QrDisplayView;
}

// Il generic K estends keyof DisplayMap: l'inferenza fissa K sul literal passato,
// quindi il ritorno DisplayMap[K] e' preciso (non l'unione di tutti i prodotti).
export function creaDisplay<K extends keyof DisplayMap>(ruolo: K): DisplayMap[K] {
  switch (ruolo) {
    case "SuperAdmin":
    case "Admin":
      // `as DisplayMap[K]` e' necessario perche' dentro il case TS non collega
      // automaticamente il narrowing di `ruolo` al parametro generico K.
      return { ruolo, pannelloAdmin: true, render: () => "admin" } as DisplayMap[K];
    case "Operatore":
      return { ruolo, timbraturaRapida: true, render: () => "op" } as DisplayMap[K];
    case "QrDisplay":
      return { ruolo, soloLettura: true, render: () => "qr" } as DisplayMap[K];
    default:
      // Esaustivita': se aggiungi un ruolo e dimentichi un case, `ruolo` non e'
      // piu' `never` e questa riga da errore. Guardia a compile time.
      const _exhaustive: never = ruolo;
      throw new Error(`Ruolo non gestito: ${String(_exhaustive)}`);
  }
}

const d1 = creaDisplay("Admin");     // tipo: AdminDisplay
const d2 = creaDisplay("Operatore"); // tipo: OperatoreDisplay
// d1.pannelloAdmin e' visibile; d2.pannelloAdmin NO (tipo preciso).
// ERRORE TS: const bad = creaDisplay("Ospite"); // "Ospite" non e' keyof DisplayMap
export const displayAdminOk: boolean = d1.pannelloAdmin === true;
void d2;

// ============================================================================
// 3) STRATEGY - algoritmi intercambiabili dietro un'interfaccia comune
// ============================================================================

// Idea: incapsulare "come si fa una cosa" in oggetti/funzioni intercambiabili.
// In TS il modo idiomatico e' un tipo funzione (o interface con un metodo).
// ERP: calcolo delle ore lavorate cambia per turno (P4/P2/STD).

// Una strategy e' una funzione pura: input timbrature -> minuti lavorati.
export type StrategyOreLavorate = (timbrature: readonly Timbratura[]) => number;

// Helper: converte "HH:MM" naive in minuti dall'inizio giornata.
function minutiDa(orario: OrarioHHMM): number {
  const [h, m] = orario.split(":");
  return Number(h) * 60 + Number(m);
}

// Strategia STD: differenza semplice entrata/uscita.
const oreSTD: StrategyOreLavorate = (t) => {
  const entrata = t.find((x) => x.tipo === "entrata");
  const uscita = t.find((x) => x.tipo === "uscita");
  if (!entrata || !uscita) return 0; // narrowing: dopo il guard sono definiti
  return minutiDa(uscita.orario) - minutiDa(entrata.orario);
};

// Strategia P4: turno con maggiorazione 25% (es. notturno).
const oreP4: StrategyOreLavorate = (t) => Math.round(oreSTD(t) * 1.25);

// Registry chiuso: Record<Turno, ...> impone di coprire TUTTI i turni.
// Se aggiungi un turno alla union e non lo metti qui -> ERRORE TS. Ottima guardia.
export const strategieOre: Record<Turno, StrategyOreLavorate> = {
  STD: oreSTD,
  P4: oreP4,
  P2: (t) => Math.round(oreSTD(t) * 1.1),
};

// Il "context" seleziona la strategy a runtime ma resta type-safe.
export function calcolaMinuti(turno: Turno, timbrature: readonly Timbratura[]): number {
  return strategieOre[turno](timbrature);
}

const esempioTimbr: Timbratura[] = [
  { id: 1, dipendenteId: 1, tipo: "entrata", orario: "08:00", turno: "STD" },
  { id: 2, dipendenteId: 1, tipo: "uscita", orario: "16:00", turno: "STD" },
];
export const minutiSTD = calcolaMinuti("STD", esempioTimbr); // => 480
export const minutiP4 = calcolaMinuti("P4", esempioTimbr);   // => 600

// ============================================================================
// 4) OBSERVER - pubblicazione di eventi con payload tipizzato per evento
// ============================================================================

// Idea: un subject notifica N observer al variare dello stato. La sfida di tipo
// e' collegare il NOME dell'evento al TIPO del payload (event map + generics).
// ERP: quando arriva una timbratura, notifica badge-display e log.

// Mappa evento -> payload. E' il pattern "typed event emitter".
export interface EventiErp {
  timbratura: Timbratura;
  loginFallito: { badge: Badge; motivo: string };
  repartoAggiornato: { reparto: string; turno: Turno };
}

// Un listener riceve il payload del proprio evento. `EventiErp[K]` estrae il tipo.
type Listener<K extends keyof EventiErp> = (payload: EventiErp[K]) => void;

export class EventBus {
  // Mapped type: per ogni chiave un array di listener del tipo corretto.
  // `Partial` perche' non tutti gli eventi hanno subito subscriber.
  private listeners: { [K in keyof EventiErp]?: Array<Listener<K>> } = {};

  // `on` lega K al nome evento: cosi' il callback e' tipizzato automaticamente.
  on<K extends keyof EventiErp>(evento: K, cb: Listener<K>): () => void {
    // Il ??= inizializza l'array la prima volta. TS conosce il tipo esatto.
    // NB: indicizzare un mapped/Partial type con una chiave generica K collassa
    // il tipo del valore a 'never' (limite noto di TS). Si isola l'array con un
    // cast al tipo concreto Array<Listener<K>> per poter fare push in sicurezza.
    const bucket = (this.listeners[evento] ??= []) as Array<Listener<K>>;
    bucket.push(cb);
    // Ritorna un "unsubscribe" (closure): pattern per rimuovere il listener.
    return () => {
      const arr = this.listeners[evento];
      if (!arr) return;
      // stesso motivo: si passa da 'never' al tipo concreto con un doppio cast.
      (this.listeners as Record<K, Array<Listener<K>>>)[evento] =
        (arr as Array<Listener<K>>).filter((l) => l !== cb);
    };
  }

  // `emit` obbliga a passare il payload coerente con l'evento: se sbagli tipo, errore.
  emit<K extends keyof EventiErp>(evento: K, payload: EventiErp[K]): void {
    this.listeners[evento]?.forEach((l) => l(payload));
  }
}

const bus = new EventBus();
const off = bus.on("timbratura", (t) => {
  // t e' Timbratura, non `any`: t.orario, t.turno accessibili e tipizzati.
  void t.orario;
});
bus.emit("timbratura", esempioTimbr[0]);
off(); // disiscrizione
// ERRORE TS: bus.emit("timbratura", { badge: "UP-001", motivo: "x" }); // payload sbagliato
// ERRORE TS: bus.on("evento_inesistente", () => {}); // non e' keyof EventiErp

// ============================================================================
// 5) ADAPTER - adattare un'interfaccia legacy a quella attesa dal client
// ============================================================================

// Idea: il client vuole l'interfaccia A, il fornitore espone B. L'adapter traduce.
// ERP: un vecchio sistema restituisce record "flat" con nomi diversi; noi vogliamo Dipendente.

// Forma legacy (mock di un DTO esterno): nomi e tipi diversi da Dipendente.
interface DipendenteLegacy {
  emp_id: string;      // stringa, non number
  full_name: string;
  badge_code: string;  // senza garanzie sul prefisso
  role_code: 0 | 1 | 2 | 3; // codici numerici
}

// Interfaccia "target" attesa dal client (Repository).
export interface DipendenteRepo {
  getById(id: number): Dipendente;
}

// Mappa codici legacy -> Ruolo. `satisfies` verifica che copra tutti i codici
// SENZA allargare il tipo del literal (mantiene l'inferenza dei valori).
const mappaRuolo = {
  0: "SuperAdmin",
  1: "Admin",
  2: "Operatore",
  3: "QrDisplay",
} satisfies Record<DipendenteLegacy["role_code"], Ruolo>;

// Type guard: promuove `string` a `Badge` solo se rispetta il pattern runtime.
// A compile time restringe il tipo grazie al predicato `x is Badge`.
function isBadge(x: string): x is Badge {
  return /^UP-\d{3}$/.test(x);
}

// L'Adapter implementa l'interfaccia target avvolgendo la sorgente legacy.
export class LegacyDipendenteAdapter implements DipendenteRepo {
  constructor(private readonly legacy: Record<number, DipendenteLegacy>) {}

  getById(id: number): Dipendente {
    const raw = this.legacy[id];
    if (!raw) throw new Error(`Dipendente ${id} non trovato`);
    // Traduzione dei campi: qui vive la "logica di adattamento".
    const badge = isBadge(raw.badge_code) ? raw.badge_code : (`UP-000` as Badge);
    return {
      id: Number(raw.emp_id),
      nome: raw.full_name,
      badge,
      ruolo: mappaRuolo[raw.role_code], // tipo: Ruolo (grazie a satisfies)
    };
  }
}

const adapter = new LegacyDipendenteAdapter({
  1: { emp_id: "1", full_name: "Mario Rossi", badge_code: "UP-001", role_code: 2 },
});
export const dipAdattato = adapter.getById(1);
// dipAdattato: Dipendente con ruolo "Operatore", badge "UP-001".

// ============================================================================
// 6) DECORATOR (pattern, non sintassi @) - wrapping che aggiunge comportamento
// ============================================================================

// Idea: avvolgere un oggetto che rispetta un'interfaccia con un altro che la
// rispetta ugualmente, aggiungendo funzionalita' (logging, cache) in modo trasparente.
// NB: NON e' la sintassi @decorator (disabilitata). E' composizione a runtime.

// Interfaccia comune: sia il "componente" sia i "decorator" la implementano.
export interface RepoTimbrature {
  salva(t: Timbratura): void;
  conta(): number;
}

// Componente concreto: implementazione base in memoria.
export class RepoTimbratureMemoria implements RepoTimbrature {
  private dati: Timbratura[] = [];
  salva(t: Timbratura): void {
    this.dati.push(t);
  }
  conta(): number {
    return this.dati.length;
  }
}

// Decorator base: tiene un riferimento al "wrapped" e delega di default.
// Estendere questa classe evita di riscrivere tutti i metodi ad ogni decorator.
abstract class RepoDecorator implements RepoTimbrature {
  constructor(protected readonly inner: RepoTimbrature) {}
  salva(t: Timbratura): void {
    this.inner.salva(t); // delega
  }
  conta(): number {
    return this.inner.conta();
  }
}

// Decorator concreto 1: logging. Aggiunge comportamento, poi delega.
export class RepoLogging extends RepoDecorator {
  override salva(t: Timbratura): void {
    // In produzione userei un logger; qui e' solo dimostrativo.
    // console.log(`[LOG] salvo timbratura ${t.id} @ ${t.orario}`);
    super.salva(t);
  }
}

// Decorator concreto 2: validazione (rifiuta orari fuori pattern).
export class RepoValidante extends RepoDecorator {
  override salva(t: Timbratura): void {
    if (!/^\d{2}:\d{2}$/.test(t.orario)) {
      throw new Error(`Orario non valido: ${t.orario}`);
    }
    super.salva(t);
  }
}

// Composizione: i decorator si impilano. L'ordine conta (validazione PRIMA del log).
// Poiche' tutti sono RepoTimbrature, il tipo si conserva ad ogni livello.
const repoBase = new RepoTimbratureMemoria();
const repoDecorato: RepoTimbrature = new RepoLogging(new RepoValidante(repoBase));
repoDecorato.salva(esempioTimbr[0]);
export const totaleTimbrature = repoDecorato.conta(); // => 1

// ============================================================================
// GOTCHA / PITFALLS
// ============================================================================

// GOTCHA 1: Singleton e `const enum`/istanza persa con moduli duplicati.
// Se il modulo viene caricato due volte (bundler mal configurato) hai DUE
// istanze. Soluzione concettuale: agganciare l'istanza a globalThis. Esempio tipo:
//   (globalThis as any).__cfg__ ??= ConfigService.getInstance();
// Il cast ad any e' il costo; alternativa: dichiarare `declare global` la chiave.

// GOTCHA 2: Factory che perde il tipo di ritorno.
// Se il ritorno fosse `DisplayBase` invece di `DisplayMap[K]`, il chiamante
// perderebbe i campi specifici:
// ERRORE TS: creaDisplay("Admin").pannelloAdmin // se il ritorno fosse DisplayBase
// Soluzione: mappare la chiave al prodotto con DisplayMap[K] (fatto sopra).

// GOTCHA 3: Observer e `this` perso passando un metodo come listener.
class ServizioBadge {
  contatore = 0;
  // Metodo classico: passandolo a `on` come `this.onTimbr` perde `this`.
  onTimbrRotto(_t: Timbratura): void {
    this.contatore++; // `this` sarebbe undefined a runtime se destrutturato
  }
  // Soluzione: arrow property, che cattura `this` lessicalmente.
  onTimbrOk = (_t: Timbratura): void => {
    this.contatore++;
  };
}
const svc = new ServizioBadge();
bus.on("timbratura", svc.onTimbrOk); // sicuro: `this` bindato
// ERRORE-A-RUNTIME (non TS): bus.on("timbratura", svc.onTimbrRotto); compila ma `this` puo' rompersi

// GOTCHA 4: Strategy con Record non esaustivo.
// Se dichiari `strategieOre` come Partial<Record<Turno, ...>>, `strategieOre[turno]`
// diventa `... | undefined` e devi gestirlo:
//   const s = parziale[turno]; s?.(timbrature) ?? 0;
// Con Record pieno (non-Partial) TS ti obbliga a definirle tutte -> piu' sicuro.

// ============================================================================
// TYPE-LEVEL BONUS: verificare le proprieta' dei pattern a compile time
// ============================================================================

// Il ritorno della factory per "Operatore" deve essere ESATTAMENTE OperatoreDisplay.
type _tFactory = Expect<Equal<ReturnType<typeof creaDisplay<"Operatore">>, OperatoreDisplay>>;

// Il registry Strategy deve coprire tutti i Turni (chiavi === union Turno).
type _tStrategy = Expect<Equal<keyof typeof strategieOre, Turno>>;

// L'event map deve esporre esattamente i tre eventi previsti.
type _tEventi = Expect<Equal<keyof EventiErp, "timbratura" | "loginFallito" | "repartoAggiornato">>;

// Evita "unused" senza emettere codice: i tipi non esistono a runtime comunque.
export type _Checks = [_t1, _tFactory, _tStrategy, _tEventi];

// ============================================================================
// EXPORT riepilogativi (solo simboli locali)
// ============================================================================

export type { Listener };
export {
  ServizioBadge,
  RepoDecorator,
};

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
/*
  - tsc --strict --target ES2022 --lib ES2022,DOM --noEmit  (experimentalDecorators=FALSE)
  - Singleton: private constructor + static getInstance; narrowing null->istanza via control-flow.
  - Factory: generic K extends keyof Map -> ritorno DisplayMap[K] preciso; default: never per esaustivita'.
  - Strategy: tipo funzione intercambiabile; Record<Turno, ...> impone copertura totale.
  - Observer: typed event bus; event map + Listener<K>; on() ritorna unsubscribe (closure); emit type-safe.
  - Adapter: implementa interfaccia target avvolgendo DTO legacy; satisfies per mappe; type guard `x is Badge`.
  - Decorator (pattern): stessa interface del componente; classe base che delega; decorator impilabili (ordine conta).
  - Equal<A,B>/Expect<T>: asserzioni di tipo a compile time (trucco delle funzioni condizionali generiche).
  - satisfies: valida la forma senza allargare il literal (mantiene i valori esatti).
  - Type guard (x is T): restringe string->Badge; predicati per validazione al confine dei dati.
  - GOTCHA: istanze duplicate (globalThis), ritorno factory troppo largo, `this` perso negli observer, Record parziale.
  - Regola ERP: server naive-UTC, orari "HH:MM" (/^\d{2}:\d{2}$/), badge /^UP-\d{3}$/, ruoli/turni come union chiuse.
*/
