/**
 * File 114 - Input Validation Tipizzata
 * Validatori componibili e type-safe per l'ERP Polyuretech.
 * Modelliamo un ValidationResult discriminato, funzioni Validator<T> pure
 * e le combiniamo (composizione) per validare DipendenteInput: badge "UP-###",
 * orario "HH:MM", ruolo enumerato. Ogni regola porta un messaggio in italiano.
 * Livello: ECOSYSTEM/EXTRA. Nessuna libreria esterna, solo TypeScript strict.
 */

// ---------------------------------------------------------------------------
// 1) Il tipo ValidationResult: unione discriminata su "ok"
// ---------------------------------------------------------------------------

// Un risultato o e' valido (con il valore ristretto di tipo T) oppure e'
// invalido con una lista di messaggi di errore. La discriminante e' "ok".
export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly string[] };

// Costruttori (smart constructors) per non ripetere la forma dell'oggetto.
export function valid<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}
export function invalid<T>(...errors: string[]): ValidationResult<T> {
  return { ok: false, errors };
}

// Esempio d'uso dei costruttori:
const r1 = valid(42); // tipo: ValidationResult<number>
const r2 = invalid<number>("non e' un numero"); // tipo: ValidationResult<number>
// Narrowing tramite la discriminante:
if (r1.ok) {
  // qui r1.value e' visibile e ha tipo number
  console.log(r1.value); // => 42
}
if (!r2.ok) {
  console.log(r2.errors.join(", ")); // => "non e' un numero"
}

// ---------------------------------------------------------------------------
// 2) Il tipo Validator<T>: una funzione da unknown a ValidationResult<T>
// ---------------------------------------------------------------------------

// Un Validator prende un input non fidato (unknown, tipico dei dati che
// arrivano da HTTP/form/JSON) e produce un ValidationResult<T>. In caso di
// successo il tipo di uscita e' garantito: e' un "parse, don't validate".
export type Validator<T> = (input: unknown) => ValidationResult<T>;

// Validator di base: stringa non vuota.
export const vString: Validator<string> = (input) => {
  if (typeof input !== "string") return invalid<string>("valore non stringa");
  if (input.trim().length === 0) return invalid<string>("stringa vuota");
  return valid(input);
};

// vString applicato:
const s1 = vString("ciao"); // ok: true, value "ciao"
const s2 = vString(123); // ok: false, errors ["valore non stringa"]
const s3 = vString("   "); // ok: false, errors ["stringa vuota"]

// ---------------------------------------------------------------------------
// 3) Combinatore: validatore da espressione regolare
// ---------------------------------------------------------------------------

// Factory che, data una regex e un messaggio, produce un Validator<string>.
// Prima verifica che sia una stringa (riusa vString) poi il match.
export function vRegex(pattern: RegExp, message: string): Validator<string> {
  return (input) => {
    const base = vString(input);
    if (!base.ok) return base; // propaga gli errori di stringa
    return pattern.test(base.value) ? valid(base.value) : invalid<string>(message);
  };
}

// Pattern del dominio ERP Polyuretech:
const BADGE_RE = /^UP-\d{3}$/; // es: "UP-001"
const ORARIO_RE = /^\d{2}:\d{2}$/; // es: "07:30" (naive-UTC "HH:MM")

// Validator specifici costruiti dalla factory:
export const vBadge: Validator<string> = vRegex(
  BADGE_RE,
  "badge non valido: atteso formato UP-### (es. UP-001)",
);
export const vOrario: Validator<string> = vRegex(
  ORARIO_RE,
  "orario non valido: atteso formato HH:MM (es. 07:30)",
);

// Prove:
const b1 = vBadge("UP-001"); // ok: true
const b2 = vBadge("UP-1"); // ok: false (troppo corto)
const b3 = vBadge("XX-001"); // ok: false (prefisso sbagliato)
const o1 = vOrario("07:30"); // ok: true
const o2 = vOrario("7:30"); // ok: false (ora a una cifra)

// ---------------------------------------------------------------------------
// 4) Validazione semantica oltre la regex: orario con range valido
// ---------------------------------------------------------------------------

// La regex accetta "99:99": aggiungiamo un controllo semantico sulle ore/minuti.
// Mostra come concatenare (chaining) un secondo controllo dopo il primo.
export const vOrarioValido: Validator<string> = (input) => {
  const base = vOrario(input);
  if (!base.ok) return base;
  const [hh, mm] = base.value.split(":").map((p) => Number(p));
  if (hh > 23) return invalid<string>("ore fuori range (00-23)");
  if (mm > 59) return invalid<string>("minuti fuori range (00-59)");
  return valid(base.value);
};

// Prove:
const ov1 = vOrarioValido("07:30"); // ok: true
const ov2 = vOrarioValido("25:00"); // ok: false, "ore fuori range (00-23)"
const ov3 = vOrarioValido("07:75"); // ok: false, "minuti fuori range (00-59)"

// ---------------------------------------------------------------------------
// 5) Validator per unioni letterali: il ruolo
// ---------------------------------------------------------------------------

// Ruoli ammessi nell'ERP: unione di string literal types.
export type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

const RUOLI: readonly Ruolo[] = ["SuperAdmin", "Admin", "Operatore", "QrDisplay"];

// Factory generica: valida che l'input sia uno dei valori ammessi.
// Il tipo di ritorno restringe unknown all'unione literal T.
export function vLiteral<T extends string>(
  allowed: readonly T[],
  message: string,
): Validator<T> {
  return (input) => {
    if (typeof input !== "string") return invalid<T>("valore non stringa");
    // includes su readonly T[]: se passa, restringiamo con un cast controllato.
    return (allowed as readonly string[]).includes(input)
      ? valid(input as T)
      : invalid<T>(message);
  };
}

export const vRuolo: Validator<Ruolo> = vLiteral(
  RUOLI,
  `ruolo non valido: atteso uno di ${RUOLI.join(", ")}`,
);

// Prove:
const ru1 = vRuolo("Admin"); // ok: true, value: "Admin" (tipo Ruolo)
const ru2 = vRuolo("Capo"); // ok: false
if (ru1.ok) {
  const r: Ruolo = ru1.value; // il narrowing garantisce il tipo Ruolo
  console.log(r); // => "Admin"
}

// ---------------------------------------------------------------------------
// 6) Combinatore "all": accumula tutti gli errori di piu' validatori
// ---------------------------------------------------------------------------

// Esegue una lista di validatori sullo stesso input e raccoglie TUTTI gli
// errori (utile per mostrare all'utente ogni problema in una volta sola).
export function vAll<T>(validators: readonly Validator<T>[]): Validator<T> {
  return (input) => {
    const errors: string[] = [];
    let lastValue: T | undefined;
    for (const v of validators) {
      const res = v(input);
      if (res.ok) lastValue = res.value;
      else errors.push(...res.errors);
    }
    if (errors.length > 0) return invalid<T>(...errors);
    return valid(lastValue as T);
  };
}

// Esempio: badge che deve passare regex e non essere "UP-000" (riservato).
const vBadgeNonZero: Validator<string> = (input) =>
  input === "UP-000" ? invalid<string>("UP-000 e' riservato") : valid(input as string);

const vBadgeCompleto = vAll<string>([vBadge, vBadgeNonZero]);
const bc1 = vBadgeCompleto("UP-042"); // ok: true
const bc2 = vBadgeCompleto("UP-000"); // ok: false, "UP-000 e' riservato"
const bc3 = vBadgeCompleto("nope"); // ok: false, errori di badge

// ---------------------------------------------------------------------------
// 7) L'oggetto da validare: DipendenteInput
// ---------------------------------------------------------------------------

// Forma "grezza" in ingresso: campi unknown perche' non fidati (es. da JSON).
// In pratica arriverebbe come Record<string, unknown> da req.body.
export interface DipendenteInputRaw {
  readonly nome: unknown;
  readonly badge: unknown;
  readonly ruolo: unknown;
  readonly orarioEntrata: unknown;
}

// Forma validata: i tipi sono ora certi. E' il "prodotto" del parsing.
export interface DipendenteInput {
  readonly nome: string;
  readonly badge: string;
  readonly ruolo: Ruolo;
  readonly orarioEntrata: string;
}

// ---------------------------------------------------------------------------
// 8) Validator di oggetto: schema campo -> Validator, con errori prefissati
// ---------------------------------------------------------------------------

// Uno "schema" mappa ogni chiave di T a un Validator del tipo di quel campo.
// mapped type: per ogni K in keyof T, un Validator<T[K]>.
export type Schema<T> = { readonly [K in keyof T]: Validator<T[K]> };

// Combinatore che, dato uno schema, valida un oggetto unknown campo per campo,
// prefissando ogni errore con il nome del campo. Ritorna T se tutto ok.
export function vObject<T>(schema: Schema<T>): Validator<T> {
  return (input) => {
    if (typeof input !== "object" || input === null)
      return invalid<T>("input non e' un oggetto");
    const record = input as Record<string, unknown>;
    const errors: string[] = [];
    // Oggetto parziale che riempiamo campo per campo.
    const out: Partial<T> = {};
    // Object.keys perde il tipo: iteriamo sulle chiavi dello schema.
    for (const key of Object.keys(schema) as (keyof T)[]) {
      const validator = schema[key];
      const res = validator(record[key as string]);
      if (res.ok) out[key] = res.value;
      else errors.push(...res.errors.map((e) => `${String(key)}: ${e}`));
    }
    if (errors.length > 0) return invalid<T>(...errors);
    return valid(out as T);
  };
}

// ---------------------------------------------------------------------------
// 9) Lo schema di DipendenteInput e il validatore finale
// ---------------------------------------------------------------------------

// Nota il type-checking dello schema: se sbagliassimo il Validator di un campo
// il compilatore protesterebbe. Esempio (commentato):
// const bad: Schema<DipendenteInput> = { nome: vRuolo, ... };
// ERRORE TS: Validator<Ruolo> non assegnabile a Validator<string> per 'nome'.

export const dipendenteSchema: Schema<DipendenteInput> = {
  nome: vString,
  badge: vBadge,
  ruolo: vRuolo,
  orarioEntrata: vOrarioValido,
};

export const validaDipendente: Validator<DipendenteInput> = vObject(dipendenteSchema);

// Caso valido:
const inputOk: DipendenteInputRaw = {
  nome: "Mario Rossi",
  badge: "UP-007",
  ruolo: "Operatore",
  orarioEntrata: "07:30",
};
const resOk = validaDipendente(inputOk);
if (resOk.ok) {
  // resOk.value ha tipo DipendenteInput: campi tutti tipizzati.
  const d: DipendenteInput = resOk.value;
  console.log(d.badge, d.ruolo); // => "UP-007" "Operatore"
}

// Caso con piu' errori accumulati:
const inputKo: DipendenteInputRaw = {
  nome: "",
  badge: "UP-1",
  ruolo: "Capo",
  orarioEntrata: "25:99",
};
const resKo = validaDipendente(inputKo);
if (!resKo.ok) {
  console.log(resKo.errors);
  // => [
  //   "nome: stringa vuota",
  //   "badge: badge non valido: atteso formato UP-### (es. UP-001)",
  //   "ruolo: ruolo non valido: atteso uno di SuperAdmin, Admin, Operatore, QrDisplay",
  //   "orarioEntrata: ore fuori range (00-23)"
  // ]
}

// ---------------------------------------------------------------------------
// 10) map / andThen: trasformare un ValidationResult mantenendo il tipo
// ---------------------------------------------------------------------------

// map: se ok, applica una funzione al valore (cambia il tipo di successo).
export function mapResult<A, B>(
  res: ValidationResult<A>,
  f: (a: A) => B,
): ValidationResult<B> {
  return res.ok ? valid(f(res.value)) : res;
}

// andThen (bind monadico): concatena una seconda validazione dipendente.
export function andThen<A, B>(
  res: ValidationResult<A>,
  f: (a: A) => ValidationResult<B>,
): ValidationResult<B> {
  return res.ok ? f(res.value) : res;
}

// Esempio: dal DipendenteInput validato ricaviamo un id numerico dal badge.
// NB: dentro mapResult il parametro 'd' e' GIA' il valore validato (DipendenteInput),
// non un ValidationResult: si accede direttamente a d.badge (niente d.ok / d.value).
const idResult = mapResult(resOk, (d) => Number(d.badge.slice(3)));
// Nota: qui resOk non e' un ValidationResult<DipendenteInput> "diretto" ma il
// risultato gia' calcolato; l'esempio didattico piu' pulito e' il seguente:
const idFromBadge = andThen(validaDipendente(inputOk), (d) =>
  valid(Number(d.badge.slice(3))),
);
if (idFromBadge.ok) {
  console.log(idFromBadge.value); // => 7 (da "UP-007")
}
void idResult;

// ---------------------------------------------------------------------------
// 11) Validator opzionale e con default
// ---------------------------------------------------------------------------

// vOptional: accetta undefined/assente, altrimenti delega al validator interno.
export function vOptional<T>(inner: Validator<T>): Validator<T | undefined> {
  return (input) =>
    input === undefined ? valid(undefined) : (inner(input) as ValidationResult<T | undefined>);
}

// vDefault: se assente, sostituisce con un valore di default gia' tipizzato.
export function vDefault<T>(inner: Validator<T>, fallback: T): Validator<T> {
  return (input) => (input === undefined ? valid(fallback) : inner(input));
}

// Prove:
const turnoOpt = vOptional(vLiteral(["P4", "P2", "STD"] as const, "turno non valido"));
const to1 = turnoOpt(undefined); // ok: true, value: undefined
const to2 = turnoOpt("P4"); // ok: true, value: "P4"
const to3 = turnoOpt("X"); // ok: false

const turnoDef = vDefault(vLiteral(["P4", "P2", "STD"] as const, "turno non valido"), "STD");
const td1 = turnoDef(undefined); // ok: true, value: "STD"
const td2 = turnoDef("P2"); // ok: true, value: "P2"

// ---------------------------------------------------------------------------
// 12) Uso realistico: bordo HTTP (mock, nessun Express importato)
// ---------------------------------------------------------------------------

// Interfacce mock: NON importiamo Express, definiamo il minimo indispensabile.
interface MockReq {
  readonly body: unknown;
}
interface MockRes {
  status(code: number): MockRes;
  json(payload: unknown): void;
}

// Handler che valida req.body ed emette 400 con la lista errori oppure 201.
export function creaDipendenteHandler(req: MockReq, res: MockRes): void {
  const parsed = validaDipendente(req.body);
  if (!parsed.ok) {
    res.status(400).json({ errors: parsed.errors });
    return;
  }
  // parsed.value e' DipendenteInput: da qui in poi tipi sicuri.
  const dip: DipendenteInput = parsed.value;
  res.status(201).json({ creato: dip.badge });
}

// Esempio browser (non eseguito): validare un form prima della submit.
// Esempio browser
export function validaFormBrowser(form: HTMLFormElement): ValidationResult<DipendenteInput> {
  const fd = new FormData(form);
  return validaDipendente({
    nome: fd.get("nome"),
    badge: fd.get("badge"),
    ruolo: fd.get("ruolo"),
    orarioEntrata: fd.get("orarioEntrata"),
  });
}

// ---------------------------------------------------------------------------
// 13) Type guard derivato da un Validator (assertion-like)
// ---------------------------------------------------------------------------

// Da un Validator possiamo ricavare un type predicate per usarlo negli if.
export function isValid<T>(validator: Validator<T>, input: unknown): input is T {
  return validator(input).ok;
}

// Uso:
const forse: unknown = "UP-999";
if (isValid(vBadge, forse)) {
  // qui forse e' ristretto a string
  console.log(forse.toUpperCase()); // => "UP-999"
}

// ---------------------------------------------------------------------------
// 14) Decorator (solo in commento: experimentalDecorators = FALSE)
// ---------------------------------------------------------------------------

// Con i decorator si potrebbe annotare un metodo per auto-validare gli argomenti,
// ma qui i decorator NON sono abilitati, quindi resta pseudo-codice:
//
//   class DipendenteService {
//     @Validate(dipendenteSchema)
//     crea(input: DipendenteInput) { ... }
//   }
//
// Senza experimentalDecorators la riga @Validate non compila: usare invece
// esplicitamente validaDipendente(input) all'inizio del metodo.

// Riferimenti esportati per eventuale riuso didattico:
export { r1 as esempioValid, r2 as esempioInvalid };

// ---------------------------------------------------------------------------
// RIEPILOGO COMANDI / CONCETTI
// ---------------------------------------------------------------------------
// - ValidationResult<T>: unione discriminata { ok:true,value } | { ok:false,errors }.
// - valid() / invalid(): smart constructors per non ripetere la forma.
// - Validator<T> = (input: unknown) => ValidationResult<T> ("parse, don't validate").
// - vString / vRegex(pattern,msg): validatori base e da RegExp.
// - Pattern ERP: badge /^UP-\d{3}$/, orario /^\d{2}:\d{2}$/.
// - Controllo semantico oltre regex (range ore/minuti in vOrarioValido).
// - vLiteral(allowed,msg): valida unioni di string literal (Ruolo, Turno).
// - vAll([...]): accumula gli errori di piu' validatori sullo stesso input.
// - Schema<T> = mapped type { [K in keyof T]: Validator<T[K]> }.
// - vObject(schema): valida oggetti unknown campo per campo con errori prefissati.
// - mapResult / andThen: trasformare e concatenare risultati (stile monadico).
// - vOptional / vDefault: campi assenti e valori di default tipizzati.
// - isValid(validator,input): deriva un type predicate (input is T) per gli if.
// - Bordo HTTP mock (MockReq/MockRes) e form browser: unknown -> tipo sicuro.
// - Decorator @Validate solo in commento (experimentalDecorators = FALSE).
// - Compila con: tsc --strict --target ES2022 --lib ES2022,DOM --noEmit.
