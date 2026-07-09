/**
 * File 080 - ADV const assertions (as const)
 * Corso TypeScript avanzato - modulo Advanced.
 * Questo file spiega in profondita' l'operatore "as const" (const assertion):
 * come congela literal, oggetti, array e tuple in tipi readonly e narrow,
 * come estrarre union da array con (typeof arr)[number], e come usare il
 * pattern "RUOLI as const" per modellare enum-like nell'ERP Polyuretech.
 * Tutti gli esempi compilano con tsc --strict (target ES2022, noEmit).
 */

// ============================================================================
// SEZIONE 0 - Helper di type-testing (usati in tutto il file)
// ============================================================================

// Equal<A, B>: true SOLO se A e B sono lo stesso identico type.
// Trucco classico: si confrontano due funzioni condizionali; TS le considera
// assegnabili solo quando A e B coincidono esattamente (anche su readonly).
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect<T>: compila solo se T e' esattamente true. Serve come "assert" di tipo.
type Expect<T extends true> = T;

// Esempi d'uso dell'helper (se il tipo non torna, tsc segnala errore qui).
type _t0 = Expect<Equal<1, 1>>;        // ok
// ERRORE TS: Type 'false' does not satisfy the constraint 'true'.
// type _tBad = Expect<Equal<1, 2>>;

// ============================================================================
// SEZIONE 1 - Il problema che "as const" risolve: widening dei literal
// ============================================================================

// Senza as const, TS "allarga" (widening) i literal al loro tipo base
// quando li assegna a un binding mutabile (let / proprieta' non-readonly).

let turnoLet = "P4";          // tipo: string  (widened, perche' let e' riassegnabile)
const turnoConst = "P4";      // tipo: "P4"    (literal type, const non riassegnabile)

// Con as const forziamo il literal type ANCHE dove ci sarebbe widening.
let turnoPinned = "P4" as const; // tipo: "P4"  (nonostante il let)

// Verifica a livello di tipo dei tre casi sopra.
type _t1a = Expect<Equal<typeof turnoLet, string>>;
type _t1b = Expect<Equal<typeof turnoConst, "P4">>;
type _t1c = Expect<Equal<typeof turnoPinned, "P4">>;

// Numeri e boolean: stesso meccanismo.
const porta = 9000 as const;   // tipo: 9000  (non 'number')
const attivo = true as const;  // tipo: true  (non 'boolean')
type _t1d = Expect<Equal<typeof porta, 9000>>;
type _t1e = Expect<Equal<typeof attivo, true>>;

// ============================================================================
// SEZIONE 2 - as const su OGGETTI: deep readonly + literal properties
// ============================================================================

// Oggetto SENZA as const: le proprieta' sono mutabili e i valori widened.
const dipMutabile = {
  badge: "UP-001",
  turno: "P4",
  attivo: true,
};
// tipo inferito: { badge: string; turno: string; attivo: boolean }
type _t2a = Expect<Equal<typeof dipMutabile.badge, string>>;

// Stesso oggetto CON as const: ogni proprieta' diventa readonly e literal.
const dipConst = {
  badge: "UP-001",
  turno: "P4",
  attivo: true,
} as const;
// tipo inferito:
//   { readonly badge: "UP-001"; readonly turno: "P4"; readonly attivo: true }
type _t2b = Expect<Equal<typeof dipConst.badge, "UP-001">>;
type _t2c = Expect<Equal<typeof dipConst.turno, "P4">>;

// as const e' RICORSIVO (deep): congela anche gli oggetti annidati.
const configErp = {
  server: { host: "192.168.2.98", porta: 9000 },
  timbratura: { formatoOra: "HH:MM", live: true },
} as const;
// configErp.server.porta ha tipo 9000 (non number), e server e' readonly.
type _t2d = Expect<Equal<typeof configErp.server.porta, 9000>>;

// ERRORE TS: Cannot assign to 'badge' because it is a read-only property.
// dipConst.badge = "UP-999";

// ERRORE TS: Cannot assign to 'porta' because it is a read-only property.
// configErp.server.porta = 8080;

// ============================================================================
// SEZIONE 3 - as const su ARRAY e TUPLE: da mutabile a readonly tuple
// ============================================================================

// Array SENZA as const: tipo array mutabile, elementi widened.
const repartiArr = ["Taglio", "Assemblaggio", "Collaudo"];
// tipo: string[]
type _t3a = Expect<Equal<typeof repartiArr, string[]>>;

// Array CON as const: diventa una readonly tuple di literal fissi.
const repartiTuple = ["Taglio", "Assemblaggio", "Collaudo"] as const;
// tipo: readonly ["Taglio", "Assemblaggio", "Collaudo"]
type _t3b = Expect<
  Equal<typeof repartiTuple, readonly ["Taglio", "Assemblaggio", "Collaudo"]>
>;

// La lunghezza e' fissata: .length e' il literal 3.
type _t3c = Expect<Equal<typeof repartiTuple.length, 3>>;

// I metodi mutanti spariscono dal type (e' readonly): niente push/pop/splice.
// ERRORE TS: Property 'push' does not exist on type 'readonly ["Taglio", ...]'.
// repartiTuple.push("Nuovo");

// Tuple eterogenea (coppia): as const preserva posizione E tipo di ogni slot.
const coppiaTimbro = ["08:00", "17:30"] as const;
// tipo: readonly ["08:00", "17:30"]
type _t3d = Expect<Equal<(typeof coppiaTimbro)[0], "08:00">>;
type _t3e = Expect<Equal<(typeof coppiaTimbro)[1], "17:30">>;

// ============================================================================
// SEZIONE 4 - (typeof arr)[number]: da array di valori a UNION di tipi
// ============================================================================

// Pattern chiave: da un array as const ricavo una union dei suoi elementi.
// (typeof arr)[number] = "indicizza la tuple con number" = union degli slot.

const TURNI = ["P4", "P2", "STD"] as const;
type Turno = (typeof TURNI)[number];
// tipo: "P4" | "P2" | "STD"
type _t4a = Expect<Equal<Turno, "P4" | "P2" | "STD">>;

// Perche' funziona? repartiTuple[number] chiede "che tipo ottengo indicizzando
// con un number qualsiasi?" -> il type system risponde con l'unione di TUTTI
// gli slot possibili, cioe' la union dei literal.

// Vantaggio DRY: un solo array e' la fonte di verita' sia a runtime (per
// iterare/validare) sia a livello di tipo (per vincolare le firme).
function descriviTurno(t: Turno): string {
  switch (t) {
    case "P4":
      return "Turno da 4 (long shift)";
    case "P2":
      return "Turno da 2";
    case "STD":
      return "Turno standard";
    // Nessun default: se aggiungo un turno a TURNI e non lo gestisco,
    // TS non forza qui, ma il pattern exhaustive lo vedremo nella sezione 9.
  }
}
descriviTurno("P4"); // ok
// ERRORE TS: Argument of type '"P9"' is not assignable to parameter of type 'Turno'.
// descriviTurno("P9");

// Runtime + type dallo STESSO array: includes come guardia.
function isTurnoValido(x: string): x is Turno {
  return (TURNI as readonly string[]).includes(x);
}
// Nota: castiamo TURNI a readonly string[] perche' includes su una readonly
// tuple di literal accetterebbe solo quei literal come argomento (vedi GOTCHA).

// ============================================================================
// SEZIONE 5 - Il caso "RUOLI as const" dell'ERP (enum-like senza enum)
// ============================================================================

// Pattern idiomatico per sostituire gli enum: array as const + union derivata.
// Vantaggi rispetto a `enum`: zero JS emesso extra, valori sono stringhe vere,
// iterabile a runtime, union esatta a livello di tipo.

export const RUOLI = ["SuperAdmin", "Admin", "Operatore", "QrDisplay"] as const;

// Union dei ruoli, derivata dall'array (unica fonte di verita').
export type Ruolo = (typeof RUOLI)[number];
// tipo: "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay"
type _t5a = Expect<
  Equal<Ruolo, "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay">
>;

// Mappa di priorita' per ruolo, con as const per literal numerici precisi.
const PRIORITA_RUOLO = {
  SuperAdmin: 100,
  Admin: 75,
  Operatore: 50,
  QrDisplay: 10,
} as const;
// tipo dei valori: 100 | 75 | 50 | 10 (non 'number')
type PrioritaRuolo = (typeof PRIORITA_RUOLO)[Ruolo];
type _t5b = Expect<Equal<PrioritaRuolo, 100 | 75 | 50 | 10>>;

// Controllo di completezza: le chiavi della mappa DEVONO coincidere coi ruoli.
// Se dimentico un ruolo nella mappa, questa riga non compila -> safety.
type _t5c = Expect<Equal<keyof typeof PRIORITA_RUOLO, Ruolo>>;

// Funzione che sfrutta il narrowing dei literal per l'autorizzazione.
export function puoAmministrare(r: Ruolo): boolean {
  return PRIORITA_RUOLO[r] >= PRIORITA_RUOLO.Admin; // >= 75
}
puoAmministrare("Operatore"); // => false a runtime
// ERRORE TS: Argument of type '"Ospite"' is not assignable to parameter of type 'Ruolo'.
// puoAmministrare("Ospite");

// Iterazione a runtime sui ruoli (impossibile/scomodo con union pura).
for (const r of RUOLI) {
  // r ha tipo Ruolo dentro il loop
  void r;
}

// ============================================================================
// SEZIONE 6 - readonly + narrowing: come as const aiuta il control-flow
// ============================================================================

// Definiamo entita' ERP mock (nessuna libreria: interfacce locali).
interface Dipendente {
  readonly id: number;
  nome: string;
  badge: string;     // atteso formato "UP-###"
  ruolo: Ruolo;
}

interface Timbratura {
  tipo: "entrata" | "uscita";
  ora: string;       // formato naive-UTC "HH:MM"
}

// Discriminated union: il campo letterale "tipo" e' il discriminante.
// as const sui literal garantisce che i tipi restino stretti e narrowabili.
type EventoBadge =
  | { readonly kind: "timbra"; ora: string }
  | { readonly kind: "apri"; reparto: string }
  | { readonly kind: "logout" };

function gestisci(ev: EventoBadge): string {
  // Il control flow analysis usa il literal "kind" per fare narrowing.
  switch (ev.kind) {
    case "timbra":
      return `Timbrato alle ${ev.ora}`;      // qui ev ha 'ora'
    case "apri":
      return `Apri reparto ${ev.reparto}`;   // qui ev ha 'reparto'
    case "logout":
      return "Uscita effettuata";            // qui ev non ha altri campi
  }
}
void gestisci;

// Perche' i literal contano per il narrowing: se 'kind' fosse 'string'
// (widened), lo switch NON restringerebbe la union e ev.ora / ev.reparto
// darebbero errore. as const/literal type sono cio' che rende sicuro il branch.

// Factory che crea eventi mantenendo il literal stretto grazie a as const.
function creaTimbra(ora: string) {
  return { kind: "timbra", ora } as const;
  // tipo di ritorno: { readonly kind: "timbra"; readonly ora: string }
}
const ev1 = creaTimbra("08:00");
type _t6a = Expect<Equal<typeof ev1.kind, "timbra">>;
// Senza as const, kind sarebbe string e non combacerebbe con EventoBadge.

// ============================================================================
// SEZIONE 7 - satisfies + as const: validare la forma senza perdere i literal
// ============================================================================

// Vogliamo che una tabella rispetti Record<Ruolo, string> MA conservare i
// literal esatti dei valori. 'satisfies' verifica la forma; 'as const' pinna.

const LABEL_RUOLO = {
  SuperAdmin: "Super Amministratore",
  Admin: "Amministratore",
  Operatore: "Operatore di reparto",
  QrDisplay: "Display QR",
} as const satisfies Record<Ruolo, string>;

// Grazie a satisfies, se manca un ruolo TS segnala; grazie a as const, i valori
// restano literal (utile per union derivate o confronti stretti).
type LabelSuperAdmin = (typeof LABEL_RUOLO)["SuperAdmin"];
// tipo: "Super Amministratore"
type _t7a = Expect<Equal<LabelSuperAdmin, "Super Amministratore">>;

// ERRORE TS (se togliessi QrDisplay): Property 'QrDisplay' is missing in type ...
// ... does not satisfy the expected type 'Record<Ruolo, string>'.

// Union di tutte le label, ricavata dai valori dell'oggetto as const.
type LabelRuolo = (typeof LABEL_RUOLO)[Ruolo];
type _t7b = Expect<
  Equal<
    LabelRuolo,
    | "Super Amministratore"
    | "Amministratore"
    | "Operatore di reparto"
    | "Display QR"
  >
>;

// ============================================================================
// SEZIONE 8 - Esempio ERP realistico: repository + DTO con as const
// ============================================================================

// Colonne selezionabili definite una sola volta (fonte di verita' unica).
const COLONNE_DIP = ["id", "nome", "badge", "ruolo"] as const;
type ColonnaDip = (typeof COLONNE_DIP)[number];
// tipo: "id" | "nome" | "badge" | "ruolo"

// DTO derivato: prendo da Dipendente solo le colonne dichiarate nell'array.
// Pick + union derivata = il DTO segue automaticamente COLONNE_DIP.
type DipendenteDTO = Pick<Dipendente, ColonnaDip>;
// tipo: { readonly id: number; nome: string; badge: string; ruolo: Ruolo }
type _t8a = Expect<Equal<keyof DipendenteDTO, ColonnaDip>>;

// Mock di un repository: la firma vincola le colonne ai literal ammessi.
interface Repository<T> {
  select<K extends keyof T>(cols: readonly K[]): Pick<T, K>[];
}

// Uso simulato (nessun runtime reale): il compilatore controlla le colonne.
declare const dipRepo: Repository<Dipendente>;
const proiezione = dipRepo.select(COLONNE_DIP);
// tipo: Pick<Dipendente, "id" | "nome" | "badge" | "ruolo">[]
void proiezione;
// ERRORE TS: Type '"stipendio"' is not assignable to type 'keyof Dipendente'.
// dipRepo.select(["id", "stipendio"] as const);

// Validazione badge/orario: regex costanti + literal type di ritorno.
const BADGE_RE = /^UP-\d{3}$/;
const ORA_RE = /^\d{2}:\d{2}$/;

// Il ritorno as const rende il risultato una discriminated union stretta,
// cosi' il chiamante puo' fare narrowing su .ok.
function validaBadge(x: string) {
  if (BADGE_RE.test(x)) return { ok: true, badge: x } as const;
  return { ok: false, errore: "badge non valido" } as const;
}
const rb = validaBadge("UP-001");
if (rb.ok) {
  // qui TS sa che esiste rb.badge (branch ok:true)
  void rb.badge;
} else {
  // qui TS sa che esiste rb.errore (branch ok:false)
  void rb.errore;
}

function validaOra(x: string): x is string {
  return ORA_RE.test(x);
}
void validaOra;

// ============================================================================
// SEZIONE 9 - Exhaustiveness check con never (chiude il cerchio coi literal)
// ============================================================================

// assertNever: se raggiunta, significa che un caso della union non e' gestito.
function assertNever(x: never): never {
  throw new Error("Caso non gestito: " + String(x));
}

// Usando la union Ruolo (derivata da RUOLI as const) rendiamo lo switch
// completo: se aggiungo un ruolo a RUOLI, il ramo default diventa un errore
// di compilazione perche' il nuovo literal non e' 'never'.
function coloreRuolo(r: Ruolo): string {
  switch (r) {
    case "SuperAdmin":
      return "#c00";
    case "Admin":
      return "#e67e22";
    case "Operatore":
      return "#2980b9";
    case "QrDisplay":
      return "#7f8c8d";
    default:
      // Se tutti i casi sono coperti, qui r ha tipo never -> compila.
      return assertNever(r);
  }
}
void coloreRuolo;

// ============================================================================
// SEZIONE 10 - GOTCHA / PITFALLS (trappole comuni con as const)
// ============================================================================

// --- Pitfall 1: readonly non e' assegnabile a mutabile ---------------------
// Una readonly tuple NON e' assegnabile la' dove serve un array mutabile.
function contaMutabile(xs: string[]): number {
  return xs.length;
}
// ERRORE TS: The type 'readonly ["Taglio", ...]' is 'readonly' and cannot be
// assigned to the mutable type 'string[]'.
// contaMutabile(repartiTuple);
// SOLUZIONE: accettare readonly nella firma, oppure copiare l'array.
function contaReadonly(xs: readonly string[]): number {
  return xs.length;
}
contaReadonly(repartiTuple);              // ok
contaMutabile([...repartiTuple]);         // ok: spread crea copia mutabile

// --- Pitfall 2: as const NON valida i valori, li pinna soltanto -----------
// as const congela la forma ma non controlla che i valori siano "giusti".
const oraSbagliata = "8:0" as const; // tipo: "8:0" (literal), MA formato errato!
// as const non applica la regex: la validazione runtime resta necessaria.
void oraSbagliata;

// --- Pitfall 3: includes/indexOf su readonly tuple di literal ---------------
// TURNI e' readonly ["P4","P2","STD"]: il tipo di includes accetta solo quei
// literal, quindi passare uno 'string' generico da' errore.
declare const inputUtente: string;
// ERRORE TS: Argument of type 'string' is not assignable to parameter of
// type '"P4" | "P2" | "STD"'.
// const c = TURNI.includes(inputUtente);
// SOLUZIONE: allargare a readonly string[] prima di chiamare includes.
const trovato = (TURNI as readonly string[]).includes(inputUtente); // ok
void trovato;

// --- Pitfall 4: as const su let non impedisce la RIASSEGNAZIONE ------------
// as const fissa il TIPO del valore, non rende la variabile costante.
let modo = "STD" as const; // tipo: "STD"
// La riassegnazione allo stesso literal e' ok:
modo = "STD";
// ERRORE TS: Type '"P4"' is not assignable to type '"STD"'.
// modo = "P4";
// Nota: il binding resta 'let' (riassegnabile), ma solo con valori "STD".
void modo;

// ============================================================================
// SEZIONE 11 - Pattern type-level: costruire un tipo passo dopo passo
// ============================================================================

// Obiettivo: da una tabella as const generare una "lookup" tipizzata.
// Passo A: la tabella (fonte di verita').
const REPARTI = {
  TAG: "Taglio",
  ASM: "Assemblaggio",
  COL: "Collaudo",
} as const;

// Passo B: union delle chiavi (codici) e union dei valori (nomi).
type CodiceReparto = keyof typeof REPARTI;          // "TAG" | "ASM" | "COL"
type NomeReparto = (typeof REPARTI)[CodiceReparto]; // "Taglio" | "Assemblaggio" | "Collaudo"
type _t11a = Expect<Equal<CodiceReparto, "TAG" | "ASM" | "COL">>;
type _t11b = Expect<Equal<NomeReparto, "Taglio" | "Assemblaggio" | "Collaudo">>;

// Passo C: mapped type che inverte la tabella (nome -> codice) a livello di tipo.
// Per ogni chiave K, uso il valore come nuova chiave (key remapping con 'as').
type Inverti<T extends Record<string, string>> = {
  [K in keyof T as T[K]]: K;
};
type RepartoInverso = Inverti<typeof REPARTI>;
// tipo: { Taglio: "TAG"; Assemblaggio: "ASM"; Collaudo: "COL" }
type _t11c = Expect<Equal<RepartoInverso["Taglio"], "TAG">>;

// Passo D: funzione di lookup vincolata dai literal derivati sopra.
function nomeReparto(codice: CodiceReparto): NomeReparto {
  return REPARTI[codice];
}
nomeReparto("TAG"); // => "Taglio"
// ERRORE TS: Argument of type '"XXX"' is not assignable to parameter of type 'CodiceReparto'.
// nomeReparto("XXX");

// ============================================================================
// SEZIONE 12 - as const vs alternative (quando NON usarlo)
// ============================================================================

// (a) Se ti serve un valore MUTABILE, non usare as const: bloccheresti le
//     scritture. Es. un array che riempi in un ciclo deve restare mutabile.
const accumulatore: string[] = [];
for (const r of RUOLI) accumulatore.push(r); // ok perche' non e' as const

// (b) Per un singolo parametro puoi pinnare inline senza toccare la variabile.
function log(livello: "info" | "warn" | "error", msg: string): void {
  void livello;
  void msg;
}
const liv = "warn";        // tipo: "warn" (const, gia' literal)
log(liv, "test");          // ok senza as const perche' const stringa e' literal
// Con 'let liv = "warn"' invece servirebbe 'log(liv as const, ...)' o annotazione.

// (c) as const NON serve se hai gia' una annotazione esplicita che stringe il tipo:
const turnoTyped: Turno = "P2"; // gia' literal per via del type annotation
void turnoTyped;

// ============================================================================
// EXPORTS (solo simboli locali di questo file)
// ============================================================================

export type { Turno, ColonnaDip, DipendenteDTO, CodiceReparto, NomeReparto };
export { TURNI, descriviTurno, validaBadge, coloreRuolo, nomeReparto };

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI (ripasso veloce)
// ============================================================================
//
// - as const = "const assertion": pinna i literal e rende tutto readonly (deep).
// - Widening: let/oggetti allargano i literal al tipo base; as const lo evita.
// - Oggetto as const  -> { readonly k: <literal> } ricorsivo (anche annidato).
// - Array as const    -> readonly tuple di literal, con .length literal e senza push/pop.
// - (typeof arr)[number] -> UNION dei valori dell'array (da runtime a type).
// - Pattern RUOLI: const ARR as const + type X = (typeof ARR)[number]  (enum-like).
// - keyof typeof OBJ  -> union delle chiavi;  (typeof OBJ)[K] -> union dei valori.
// - satisfies + as const -> valida la forma MA conserva i literal esatti.
// - Literal + discriminated union -> abilitano narrowing nel control-flow (switch).
// - assertNever(x: never) -> exhaustiveness check: nuovo caso = errore di compile.
// - GOTCHA: readonly non e' assegnabile a mutabile (usa readonly T[] o spread).
// - GOTCHA: as const NON valida i valori (regex/formati vanno controllati a runtime).
// - GOTCHA: includes su tuple di literal -> castare a readonly string[].
// - GOTCHA: as const su let pinna il TIPO, non impedisce la riassegnazione.
// - Quando NON usarlo: valori mutabili, o quando un'annotazione stringe gia' il tipo.
// - Helper di tipo: Equal<A,B> + Expect<T> per scrivere test di tipo nel file.
