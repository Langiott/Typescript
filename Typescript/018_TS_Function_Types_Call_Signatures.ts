/**
 * File 018 - Function Types & Call Signatures
 * Corso TypeScript (livello FUNDAMENTALS).
 * Argomento: come tipizzare le funzioni: type alias di funzione, call
 * signature dentro interface, funzioni con proprieta' aggiuntive e il
 * pattern del type Validator = (v: string) => boolean.
 * Tutti gli esempi usano il dominio ERP Polyuretech (Dipendente, Timbratura,
 * Reparto, Turno). Il file compila con tsc --strict, target ES2022.
 */

// ============================================================
// 1. TYPE ALIAS DI FUNZIONE (function type expression)
// ============================================================

// La sintassi (parametri) => returnType descrive il "tipo" di una funzione.
// Qui definiamo un alias riutilizzabile invece di ripeterlo ovunque.
type Validator = (v: string) => boolean;

// Una funzione che rispetta il tipo Validator: prende una string, torna boolean.
const isBadge: Validator = (v) => /^UP-\d{3}$/.test(v);
// tipo inferito del parametro v: string (grazie al type Validator)

isBadge("UP-001"); // => true
isBadge("XX-1");   // => false

// Validator per orari naive-UTC in formato "HH:MM".
const isOrario: Validator = (v) => /^\d{2}:\d{2}$/.test(v);
isOrario("08:30"); // => true
isOrario("8:30");  // => false

// I parametri possono avere nome libero: conta solo la posizione e il tipo.
const nonVuoto: Validator = (testo) => testo.length > 0;
nonVuoto("");      // => false

// ============================================================
// 2. IL TIPO DI FUNZIONE E' STRUTTURALE
// ============================================================

// TypeScript e' strutturale: una funzione e' assegnabile a Validator se la
// sua firma e' compatibile. Una funzione con MENO parametri va bene.
const sempreVero: Validator = () => true;
// Ok: ignorare argomenti in piu' e' lecito (contravarianza dei parametri).

// ERRORE TS: parametro in piu' non compatibile con Validator.
// const troppiParam: Validator = (a: string, b: string) => a === b;
// ERRORE TS: Type '(a, b) => boolean' is not assignable to type 'Validator'.

// ERRORE TS: return type sbagliato (string invece di boolean).
// const ritornoStringa: Validator = (v) => v; // string non e' boolean

// ============================================================
// 3. FUNZIONI COME PARAMETRO (higher order)
// ============================================================

// Una funzione che riceve un Validator: componiamo la validazione.
function validaCampo(valore: string, regola: Validator): string {
  return regola(valore) ? "ok" : "errore";
}
validaCampo("UP-042", isBadge); // => "ok"
validaCampo("nope", isOrario);  // => "errore"

// Passare direttamente un arrow inline: il tipo del parametro e' inferito
// dal contesto (contextual typing) come string.
validaCampo("QR-DISPLAY", (v) => v.startsWith("QR")); // => "ok"

// Combinare piu' Validator in AND.
function tutti(...regole: Validator[]): Validator {
  return (v) => regole.every((r) => r(v));
}
const badgeNonVuoto = tutti(nonVuoto, isBadge);
badgeNonVuoto("UP-007"); // => true
badgeNonVuoto("");       // => false

// ============================================================
// 4. CALL SIGNATURE DENTRO UNA INTERFACE
// ============================================================

// Dentro una interface si puo' dichiarare una "call signature": descrive
// come l'oggetto e' invocabile come funzione. Sintassi: (params): ret.
interface ValidatoreOrario {
  (orario: string): boolean;
}

const orarioValido: ValidatoreOrario = (o) => /^\d{2}:\d{2}$/.test(o);
orarioValido("17:45"); // => true

// La call signature e' equivalente a un type alias di funzione, ma la
// interface permette di aggiungere anche PROPRIETA' (vedi sezione 5).

// ============================================================
// 5. FUNZIONI CON PROPRIETA' (hybrid types)
// ============================================================

// Una funzione in JS e' un oggetto: puo' avere proprieta'. Con una interface
// che ha sia call signature sia campi descriviamo un "hybrid type".
interface ValidatoreConMeta {
  // call signature: come si invoca
  (valore: string): boolean;
  // proprieta' aggiuntive
  nome: string;
  pattern: RegExp;
}

// Costruiamo un oggetto-funzione che soddisfa il tipo.
function creaValidatore(nome: string, pattern: RegExp): ValidatoreConMeta {
  const fn = ((valore: string) => pattern.test(valore)) as ValidatoreConMeta;
  fn.nome = nome;
  fn.pattern = pattern;
  return fn;
}

const vBadge = creaValidatore("badge", /^UP-\d{3}$/);
vBadge("UP-100");   // => true   (chiamata via call signature)
vBadge.nome;        // tipo: string  => "badge"
vBadge.pattern;     // tipo: RegExp

// Uso pratico: messaggio di errore che sfrutta la proprieta' nome.
function descriviErrore(v: ValidatoreConMeta, input: string): string {
  return v(input) ? `${v.nome}: ok` : `${v.nome}: valore '${input}' non valido`;
}
descriviErrore(vBadge, "xx"); // => "badge: valore 'xx' non valido"

// ============================================================
// 6. CALL SIGNATURE + STATIC/CONSTRUCT (overview)
// ============================================================

// Oltre alla call signature, una interface puo' avere una CONSTRUCT signature
// con la keyword 'new'. Descrive un costruttore (usabile con 'new').
interface DipendenteBase {
  id: number;
  badge: string;
}
interface CostruttoreDipendente {
  new (id: number, badge: string): DipendenteBase;
}

// Classe compatibile con la construct signature.
class Dipendente implements DipendenteBase {
  constructor(public id: number, public badge: string) {}
}

// Assegnamo la classe (che e' un costruttore) al tipo construct signature.
const Factory: CostruttoreDipendente = Dipendente;
const d = new Factory(1, "UP-001"); // tipo: DipendenteBase
d.badge; // => "UP-001"

// ============================================================
// 7. OVERLOAD tramite MULTIPLE CALL SIGNATURES
// ============================================================

// Una interface puo' elencare piu' call signature: e' l'overload di funzione.
// Qui: formatta un orario da stringa oppure da minuti totali (number).
interface FormattaOrario {
  (orario: string): string; // gia' "HH:MM" -> normalizza
  (minuti: number): string; // minuti dall'inizio giornata -> "HH:MM"
}

const formatta: FormattaOrario = (input: string | number): string => {
  if (typeof input === "number") {
    const h = Math.floor(input / 60);
    const m = input % 60;
    // padStart per avere sempre due cifre (formato naive-UTC "HH:MM")
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return input.trim();
};

formatta(510);      // tipo: string => "08:30"
formatta("09:15 "); // tipo: string => "09:15"

// ============================================================
// 8. TIPI DI FUNZIONE E UNION / RUOLI ERP
// ============================================================

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Un predicate function tipizzato: mappa un ruolo a un permesso.
type PermessoCheck = (ruolo: Ruolo) => boolean;

const puoModificare: PermessoCheck = (r) => r === "SuperAdmin" || r === "Admin";
puoModificare("Operatore"); // => false
puoModificare("Admin");     // => true

// Mappa nome-permesso -> funzione: un record di function types.
const permessi: Record<string, PermessoCheck> = {
  modifica: (r) => r === "SuperAdmin" || r === "Admin",
  visualizza: () => true,
  cancella: (r) => r === "SuperAdmin",
};
permessi.cancella("Admin");     // => false
permessi.visualizza("QrDisplay"); // => true

// ============================================================
// 9. TYPE PREDICATE (call signature che fa narrowing)
// ============================================================

// Una funzione il cui return type e' "arg is Tipo" restringe il tipo.
interface Timbratura {
  entrata: string; // "HH:MM"
  uscita: string | null;
}

// Type guard: se torna true, TS sa che uscita e' una string.
function haUscita(t: Timbratura): t is Timbratura & { uscita: string } {
  return t.uscita !== null;
}

const t1: Timbratura = { entrata: "08:00", uscita: "17:00" };
if (haUscita(t1)) {
  t1.uscita.padStart(5, "0"); // qui uscita: string (narrowed, non null)
}

// ============================================================
// 10. FUNZIONI CHE RITORNANO FUNZIONI (currying)
// ============================================================

// Un builder che ritorna un Validator basato su una regex: comodo per turni.
const validaConRegex = (pattern: RegExp): Validator => (v) => pattern.test(v);

const isTurno = validaConRegex(/^(P4|P2|STD)$/);
isTurno("P4");  // => true
isTurno("P9");  // => false

// La firma completa di validaConRegex, resa esplicita come type:
type RegexValidatorFactory = (pattern: RegExp) => Validator;
const factory: RegexValidatorFactory = validaConRegex;
factory(/^UP-\d{3}$/)("UP-321"); // => true

// ============================================================
// 11. OPTIONAL, DEFAULT E REST NEI FUNCTION TYPES
// ============================================================

// Parametri optional (?) e rest (...) nella firma di un function type.
type Logger = (msg: string, livello?: "info" | "warn", ...tag: string[]) => void;

const log: Logger = (msg, livello = "info", ...tag) => {
  // Esempio: non fa I/O reale, resta puro per l'esempio.
  void `[${livello}] ${msg} ${tag.join(",")}`;
};
log("timbratura salvata");                    // livello default "info"
log("badge sconosciuto", "warn", "UP-999");   // con tag

// ============================================================
// 12. EXPORT dei simboli locali
// ============================================================

export type {
  Validator,
  PermessoCheck,
  ValidatoreConMeta,
  FormattaOrario,
  Ruolo,
  Timbratura,
};
export { isBadge, isOrario, creaValidatore, validaCampo, haUscita, isTurno };

/*
 * ============================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================
 * - Function type alias:      type F = (a: string) => boolean;
 * - Validator pattern:        type Validator = (v: string) => boolean;
 * - Structural typing:        meno parametri OK, piu' parametri NO.
 * - Contextual typing:        arrow inline eredita i tipi dal contesto.
 * - Call signature:           interface I { (x: T): R }  (oggetto invocabile).
 * - Hybrid type:              interface con call signature + proprieta'.
 * - Construct signature:      interface I { new (x: T): R }  (costruttore).
 * - Overload:                 piu' call signature nella stessa interface.
 * - Higher order function:    funzione che prende/ritorna funzioni.
 * - Currying:                 (a) => (b) => risultato.
 * - Type predicate:           (x): x is T  -> narrowing nel type guard.
 * - Optional/default/rest:    (a, b?, ...c) => R nei function types.
 * - Record di funzioni:       Record<string, (r: Ruolo) => boolean>.
 * ============================================================
 */
