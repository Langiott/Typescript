/**
 * 094_TS_ADV_Validation_Schema.ts
 * File 94 - ADV Validation & schema typing (livello ADVANCED)
 * Schema di validazione tipizzato a mano: combinatori (string/number/literal/
 * object/optional/array), InferSchema<S> via mapped/conditional types per
 * derivare il tipo TS dallo schema, e validazione runtime che restringe
 * unknown -> tipo. Dominio ERP Polyuretech (Dipendente, badge, orario, ruolo).
 */

// ============================================================================
// 1) MODELLO DEL RISULTATO: Result<T> invece di eccezioni
// ============================================================================
// Un validator puo' fallire. Invece di lanciare eccezioni (difficili da
// tipizzare e comporre) usiamo un tipo Result<T> discriminato: o "ok" con il
// valore gia' ristretto al tipo T, oppure "err" con la lista degli errori.

/** Errore di validazione con il path (percorso nel dato) e un messaggio. */
export interface ValidationError {
  readonly path: string; // es. "" per la radice, "badge", "turni[2]"
  readonly message: string;
}

/** Result discriminato dal campo booleano `ok`. */
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };

// Helper per costruire i due casi (evitano ripetizioni negli esempi).
function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}
function err<T>(path: string, message: string): Result<T> {
  return { ok: false, errors: [{ path, message }] };
}

// ============================================================================
// 2) IL TIPO Validator<T>
// ============================================================================
// Un Validator<T> prende un valore `unknown` (arriva dalla rete / JSON.parse,
// dove il tipo NON e' garantito) e ritorna un Result<T>. Se `ok:true` allora
// TypeScript sa che `value` e' di tipo T: abbiamo ristretto unknown -> T a
// runtime, con prova a compile-time.
//
// Nota: si potrebbe anche usare la forma type guard `(v: unknown) => v is T`,
// ma quella NON puo' riportare *perche'* la validazione e' fallita ne' il path.
// Con Result otteniamo messaggi d'errore ricchi + narrowing. Mostriamo pero'
// anche il ponte verso i type guard (vedi sezione 8).

/** Firma di ogni combinatore. Il campo `_t` porta il tipo solo a compile-time. */
export interface Validator<T> {
  readonly validate: (v: unknown, path?: string) => Result<T>;
  /** phantom field: mai valorizzato a runtime, serve a InferSchema. */
  readonly _t?: T;
}

// InferType<V> estrae il tipo T da un Validator<T> tramite conditional type +
// infer. E' la base di tutto: da un validator possiamo recuperare "cosa valida".
export type InferType<V> = V extends Validator<infer T> ? T : never;

// Esempio (dopo aver definito i combinatori sotto):
//   type A = InferType<Validator<number>>;  // tipo: number

// ============================================================================
// 3) COMBINATORI PRIMITIVI: string, number, boolean, literal
// ============================================================================

/** Valida che il valore sia una string. */
export function vString(): Validator<string> {
  return {
    validate(v, path = "") {
      return typeof v === "string"
        ? ok(v)
        : err(path, "atteso string, ricevuto " + typeName(v));
    },
  };
}

/** Valida che il valore sia un number finito (esclude NaN/Infinity). */
export function vNumber(): Validator<number> {
  return {
    validate(v, path = "") {
      return typeof v === "number" && Number.isFinite(v)
        ? ok(v)
        : err(path, "atteso number finito, ricevuto " + typeName(v));
    },
  };
}

/** Valida che il valore sia un boolean. */
export function vBoolean(): Validator<boolean> {
  return {
    validate(v, path = "") {
      return typeof v === "boolean"
        ? ok(v)
        : err(path, "atteso boolean, ricevuto " + typeName(v));
    },
  };
}

// vLiteral usa un generic con vincolo `const` per preservare il tipo letterale.
// Senza il vincolo `L extends string | number | boolean`, il tipo verrebbe
// allargato (widening) a string/number.
/** Valida che il valore sia ESATTAMENTE il literal atteso. */
export function vLiteral<L extends string | number | boolean>(
  lit: L
): Validator<L> {
  return {
    validate(v, path = "") {
      return v === lit
        ? ok(v as L)
        : err(path, "atteso letterale " + JSON.stringify(lit));
    },
  };
}

// Esempi:
//   const s = vString();
//   s.validate("ciao");           // => { ok: true, value: "ciao" }
//   s.validate(42);               // => { ok: false, errors: [...] }
//   type S = InferType<typeof s>; // tipo: string
//
//   const std = vLiteral("STD");
//   type L = InferType<typeof std>; // tipo: "STD"  (NON string!)

// ============================================================================
// 4) COMBINATORE string CON VINCOLO REGEX (pattern)
// ============================================================================
// Utile per badge /^UP-\d{3}$/ e orario /^\d{2}:\d{2}$/. A runtime controlla
// la regex; a compile-time resta `string` (i template-literal type non possono
// esprimere "\d{3}" in modo pratico, quindi non fingiamo di conoscere il valore).

/** string che deve rispettare una regex; `label` compare nel messaggio. */
export function vPattern(re: RegExp, label: string): Validator<string> {
  return {
    validate(v, path = "") {
      if (typeof v !== "string") {
        return err(path, "atteso string (" + label + "), ricevuto " + typeName(v));
      }
      return re.test(v)
        ? ok(v)
        : err(path, label + ' non valido: "' + v + '" non rispetta ' + re.source);
    },
  };
}

// Combinatori di dominio ERP costruiti sopra vPattern:
export const vBadge = (): Validator<string> => vPattern(/^UP-\d{3}$/, "badge");
export const vOrario = (): Validator<string> => vPattern(/^\d{2}:\d{2}$/, "orario");

// Esempi:
//   vBadge().validate("UP-001");  // => { ok: true, value: "UP-001" }
//   vBadge().validate("UP-1");    // => { ok: false, errors: [...] }
//   vOrario().validate("08:30");  // => { ok: true, value: "08:30" }
//   vOrario().validate("8:30");   // => { ok: false, ... } (mancano cifre)

// ============================================================================
// 5) COMBINATORE union (per ruoli / turni)
// ============================================================================
// vUnion prova ciascun membro; il primo che passa vince. Il tipo risultante e'
// l'unione dei tipi dei membri, ottenuta con InferType su una tupla di validator.

// UnionOf<Vs> mappa una tupla di Validator nei loro tipi, poi li unisce con [number].
type UnionOf<Vs extends readonly Validator<unknown>[]> = InferType<Vs[number]>;

/** Valida che il valore soddisfi ALMENO uno dei validator passati. */
export function vUnion<Vs extends readonly Validator<unknown>[]>(
  ...members: Vs
): Validator<UnionOf<Vs>> {
  return {
    validate(v, path = "") {
      for (const m of members) {
        const r = m.validate(v, path);
        if (r.ok) return ok(r.value as UnionOf<Vs>);
      }
      return err(path, "nessun membro dell'unione soddisfatto");
    },
  };
}

/** Zucchero: unione di literal (tipico per enum-like: ruoli, turni). */
export function vEnum<const L extends readonly (string | number | boolean)[]>(
  ...lits: L
): Validator<L[number]> {
  const members = lits.map((l) => vLiteral(l));
  return {
    validate(v, path = "") {
      for (const m of members) {
        const r = m.validate(v, path);
        if (r.ok) return ok(r.value as L[number]);
      }
      return err(
        path,
        "atteso uno di " + lits.map((l) => JSON.stringify(l)).join(", ")
      );
    },
  };
}

// Esempi:
//   const ruolo = vEnum("SuperAdmin", "Admin", "Operatore", "QrDisplay");
//   type Ruolo = InferType<typeof ruolo>;
//   // tipo: "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay"
//   const turno = vEnum("P4", "P2", "STD");
//   type Turno = InferType<typeof turno>; // tipo: "P4" | "P2" | "STD"

// ============================================================================
// 6) COMBINATORE array
// ============================================================================
// vArray<T> valida che il valore sia un array e che OGNI elemento soddisfi il
// validator dell'elemento. Accumula gli errori con path indicizzato "campo[i]".

/** Valida un array omogeneo di elementi validati da `elem`. */
export function vArray<T>(elem: Validator<T>): Validator<T[]> {
  return {
    validate(v, path = "") {
      if (!Array.isArray(v)) {
        return { ok: false, errors: [{ path, message: "atteso array" }] };
      }
      const out: T[] = [];
      const errors: ValidationError[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = elem.validate(v[i], path + "[" + i + "]");
        if (r.ok) out.push(r.value);
        else errors.push(...r.errors);
      }
      return errors.length === 0 ? { ok: true, value: out } : { ok: false, errors };
    },
  };
}

// Esempio:
//   const orari = vArray(vOrario());
//   orari.validate(["08:00", "17:00"]); // => { ok: true, value: [...] }
//   orari.validate(["08:00", "nope"]);  // => { ok: false, errors: [ [1] ... ] }
//   type Orari = InferType<typeof orari>; // tipo: string[]

// ============================================================================
// 7) COMBINATORE object + InferSchema (il cuore del file)
// ============================================================================
// Uno "schema oggetto" e' un record { chiave: Validator<...> }. Da esso vogliamo:
//   (a) validare a runtime ogni campo;
//   (b) DERIVARE il tipo TS con un mapped type che estrae InferType da ogni field.
//
// Introduciamo vOptional per marcare campi facoltativi: il tipo risultante deve
// avere quelle chiavi come `?:` (optional), non solo `| undefined`.

/** Marker: un campo optional wrappa un validator ma tollera `undefined`. */
export interface OptionalValidator<T> extends Validator<T | undefined> {
  readonly _optional: true;
}

/** Rende un campo dello schema facoltativo. */
export function vOptional<T>(inner: Validator<T>): OptionalValidator<T> {
  return {
    _optional: true,
    validate(v, path = "") {
      if (v === undefined) return ok(undefined);
      return inner.validate(v, path);
    },
  };
}

/** Uno schema oggetto: mappa nome-campo -> Validator. */
export type ObjectSchema = Readonly<Record<string, Validator<unknown>>>;

// --- InferSchema<S>: derivazione del tipo TS dallo schema -------------------
// Passo 1: individua le chiavi optional (quelle il cui validator ha _optional).
type OptionalKeys<S extends ObjectSchema> = {
  [K in keyof S]: S[K] extends OptionalValidator<unknown> ? K : never;
}[keyof S];

// Passo 2: le chiavi restanti sono required.
type RequiredKeys<S extends ObjectSchema> = Exclude<keyof S, OptionalKeys<S>>;

// Passo 3: due mapped type distinti, uno required e uno con `?`, poi intersect.
// InferType su ciascun field ricava il tipo; per gli optional togliamo il
// `| undefined` dal valore perche' l'opzionalita' e' gia' espressa dal `?`.
type UnwrapOptional<V> = V extends OptionalValidator<infer T> ? T : InferType<V>;

/** Deriva il tipo TS dell'oggetto descritto dallo schema S. */
export type InferSchema<S extends ObjectSchema> = {
  [K in RequiredKeys<S>]: InferType<S[K]>;
} & {
  [K in OptionalKeys<S>]?: UnwrapOptional<S[K]>;
};

// Nota: InferSchema<S> produce un tipo OGGETTO (un'intersezione di due mapped
// type), NON un Validator. Ma vObject deve restituire Validator<InferSchema<S>>
// dove l'argomento deve a sua volta soddisfare il vincolo di InferSchema quando
// usato come chiave in schemi annidati. Per questo NON vincoliamo il risultato
// con InferSchema<S> direttamente: usiamo un helper ObjectValidator che espone
// il tipo derivato senza reintrodurre il vincolo ObjectSchema sul risultato.

/** Costruisce un Validator per l'oggetto intero a partire dallo schema. */
export function vObject<S extends ObjectSchema>(
  schema: S
): Validator<InferSchema<S>> {
  return {
    validate(v, path = "") {
      if (typeof v !== "object" || v === null || Array.isArray(v)) {
        return { ok: false, errors: [{ path, message: "atteso object" }] };
      }
      const src = v as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      const errors: ValidationError[] = [];
      for (const key of Object.keys(schema)) {
        const field = schema[key];
        const child = path === "" ? key : path + "." + key;
        const r = field.validate(src[key], child);
        if (r.ok) {
          // scriviamo solo se non e' undefined per non creare chiavi optional vuote
          if (r.value !== undefined) out[key] = r.value;
        } else {
          errors.push(...r.errors);
        }
      }
      return errors.length === 0
        ? { ok: true, value: out as InferSchema<S> }
        : { ok: false, errors };
    },
  };
}

// ============================================================================
// 8) PONTE VERSO I TYPE GUARD: (v: unknown) => v is T
// ============================================================================
// Da un Validator<T> possiamo generare una type guard classica. Utile con
// Array.prototype.filter, if-narrowing, ecc. Perdiamo pero' i messaggi d'errore.

/** Trasforma un Validator<T> in una type guard `v is T`. */
export function toGuard<T>(val: Validator<T>): (v: unknown) => v is T {
  return (v: unknown): v is T => val.validate(v).ok;
}

// Esempio:
//   const isOrario = toGuard(vOrario());
//   const raw: unknown[] = ["08:00", 3, "nope", "17:30"];
//   const soloOrari = raw.filter(isOrario); // tipo: string[]  (narrowing!)

// ============================================================================
// 9) ESEMPIO REALE: schema DipendenteInput (dominio Polyuretech)
// ============================================================================
// Payload che potrebbe arrivare dal frontend quando si crea un dipendente.
// Regole di dominio:
//   - badge   deve rispettare /^UP-\d{3}$/            -> vBadge()
//   - nome    string non vuota                         -> vString()
//   - ruolo   union dei 4 ruoli                         -> vEnum(...)
//   - turno   "P4" | "P2" | "STD"                       -> vEnum(...)
//   - oraEntrata orario "HH:MM"                         -> vOrario()
//   - oraUscita  orario opzionale (turno aperto)        -> vOptional(vOrario())
//   - repartoId  number                                 -> vNumber()

// Nota: annotiamo lo schema con `satisfies ObjectSchema` cosi' i valori
// mantengono i loro tipi precisi (Validator<...>, OptionalValidator<...>) e allo
// stesso tempo verifichiamo che ogni campo sia un Validator. Passando poi lo
// schema a vObject, il parametro S viene inferito come il tipo PRECISO (non
// allargato a Record<string, Validator<unknown>>), condizione necessaria perche'
// InferSchema estragga i literal esatti.
export const DipendenteInputSchema = vObject({
  badge: vBadge(),
  nome: vString(),
  ruolo: vEnum("SuperAdmin", "Admin", "Operatore", "QrDisplay"),
  turno: vEnum("P4", "P2", "STD"),
  oraEntrata: vOrario(),
  oraUscita: vOptional(vOrario()),
  repartoId: vNumber(),
} satisfies ObjectSchema);

// Il tipo TS viene DERIVATO dallo schema (single source of truth):
export type DipendenteInput = InferType<typeof DipendenteInputSchema>;
// tipo (semplificato):
// {
//   badge: string;
//   nome: string;
//   ruolo: "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
//   turno: "P4" | "P2" | "STD";
//   oraEntrata: string;
//   repartoId: number;
//   oraUscita?: string;   // <-- optional grazie a vOptional
// }

// --- Uso a runtime: da unknown (JSON) a DipendenteInput tipizzato ------------
const payloadOk: unknown = {
  badge: "UP-042",
  nome: "Maria Rossi",
  ruolo: "Operatore",
  turno: "P4",
  oraEntrata: "06:00",
  oraUscita: "14:00",
  repartoId: 3,
};

const res1 = DipendenteInputSchema.validate(payloadOk);
if (res1.ok) {
  // Qui res1.value ha tipo DipendenteInput: narrowing riuscito.
  const d = res1.value;
  // d.ruolo e' ristretto all'union: possiamo fare switch esaustivo.
  const etichetta: string =
    d.ruolo === "SuperAdmin" ? "SA" : d.ruolo === "Admin" ? "AD" : d.badge;
  void etichetta;
  // d.oraUscita ha tipo `string | undefined` (perche' optional).
  const uscita: string = d.oraUscita ?? "--:--";
  void uscita;
}

// Payload con piu' errori: badge malformato, ruolo inesistente, orario errato.
const payloadKo: unknown = {
  badge: "X-01",
  nome: "Test",
  ruolo: "Capo",
  turno: "P4",
  oraEntrata: "6:00",
  repartoId: 3,
};
const res2 = DipendenteInputSchema.validate(payloadKo);
// res2.ok === false; res2.errors contiene 3 voci con path "badge","ruolo","oraEntrata".
if (!res2.ok) {
  // res2.value NON esiste qui (discriminated union): il compilatore lo impedisce.
  // ERRORE TS: Property 'value' does not exist on type '{ ok: false; errors: ... }'
  //   const x = res2.value;
  void res2.errors.length;
}

// ============================================================================
// 10) SCHEMA ANNIDATO: Timbratura dentro un array
// ============================================================================
export const TimbraturaSchema = vObject({
  entrata: vOrario(),
  uscita: vOptional(vOrario()),
} satisfies ObjectSchema);
export type Timbratura = InferType<typeof TimbraturaSchema>;
// tipo: { entrata: string; uscita?: string }

export const GiornataSchema = vObject({
  badge: vBadge(),
  reparto: vString(),
  timbrature: vArray(TimbraturaSchema), // array di oggetti annidati
} satisfies ObjectSchema);
export type Giornata = InferType<typeof GiornataSchema>;
// tipo: { badge: string; reparto: string; timbrature: { entrata: string; uscita?: string }[] }

const giornataRaw: unknown = {
  badge: "UP-007",
  reparto: "Stampaggio",
  timbrature: [
    { entrata: "06:00", uscita: "14:00" },
    { entrata: "14:00" }, // uscita omessa: valida perche' optional
  ],
};
const resG = GiornataSchema.validate(giornataRaw);
// resG.ok === true; resG.value.timbrature[0].entrata ha tipo string.
void resG;

// ============================================================================
// 11) GOTCHA / PITFALLS
// ============================================================================
// (a) WIDENING DEI LITERAL: senza `L extends string | number | boolean` (o
//     senza `const` nei generics), vLiteral("STD") verrebbe inferito come
//     Validator<string> e perderemmo l'union esatta. Il vincolo lo evita.
//
// (b) OPTIONAL vs `| undefined`: `oraUscita?: string` NON e' la stessa cosa di
//     `oraUscita: string | undefined`. Il primo permette di OMETTERE la chiave;
//     il secondo la RICHIEDE (anche se col valore undefined). Il nostro
//     InferSchema separa OptionalKeys/RequiredKeys apposta per generare il `?`.
//     Nota: con --exactOptionalPropertyTypes il campo optional non accetta un
//     `undefined` esplicito; qui in vObject non scriviamo la chiave se il valore
//     e' undefined, coerente con la semantica "assente".
//
// (c) unknown NON e' any: non puoi accedere a proprieta' di `unknown` senza
//     prima restringere. In vObject facciamo `v as Record<string, unknown>`
//     SOLO dopo aver verificato typeof/null/Array. Ecco perche' i validator
//     partono da `unknown` e non da `any`: any spegnerebbe i controlli.
//       function bad(v: unknown) { return (v as any).badge; }
//       // Senza il cast: ERRORE TS: 'v' is of type 'unknown'.
//
// (d) Array.isArray e typeof "object": in JS `typeof null === "object"` e
//     `typeof [] === "object"`. Per validare un oggetto "vero" servono TRE
//     controlli: typeof === "object" && !== null && !Array.isArray. Dimenticarne
//     uno fa passare null o gli array come oggetti.
//
// (e) REGEX e ancore: /^\d{2}:\d{2}$/ senza ^ e $ farebbe passare "xx08:30yy".
//     Le ancore ^...$ sono obbligatorie per la validazione di formato.
//
// (f) NaN e' number: `typeof NaN === "number"`. vNumber usa Number.isFinite per
//     escludere NaN/Infinity, altrimenti JSON malformato passerebbe come number.
//
// (g) InferType usa `infer` dentro un conditional type: se passi qualcosa che
//     NON e' un Validator, ottieni `never` (non un errore). Attenzione a non
//     propagare `never` per sbaglio nei mapped type.
//
// (h) I combinatori catturano il tipo via il phantom field `_t?: T`. Non
//     leggerlo mai a runtime (e' sempre undefined): serve solo al compilatore.
//
// (i) PROVA CHE IL TIPO E' DERIVATO E NON SCRITTO A MANO: se cambi lo schema
//     (es. aggiungi un campo), il tipo InferSchema cambia da solo. Verifica:
type _AssertHasTurno = DipendenteInput["turno"]; // tipo: "P4" | "P2" | "STD"
void (0 as unknown as _AssertHasTurno);
//     Se rinomini "turno" nello schema, questa riga da' ERRORE TS: coerenza garantita.

// ============================================================================
// 12) UTILITY: typeName (diagnostica leggibile per i messaggi d'errore)
// ============================================================================
function typeName(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v; // "string" | "number" | "object" | "undefined" | ...
}

// ============================================================================
// 13) DEMO FINALE eseguibile (log condizionale, nessun side effect esterno)
// ============================================================================
export function demo(): void {
  const inputs: readonly unknown[] = [payloadOk, payloadKo, giornataRaw];
  for (const raw of inputs) {
    const r = DipendenteInputSchema.validate(raw);
    if (r.ok) {
      // r.value: DipendenteInput
      console.log("OK ", r.value.badge, r.value.ruolo);
    } else {
      const msg = r.errors.map((e) => e.path + ": " + e.message).join(" | ");
      console.log("KO ", msg);
    }
  }
}
// demo(); // decommentare per provare (richiede runtime, es. ts-node)

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
// - Validator<T>: (v: unknown) => Result<T>; restringe unknown -> T con prova.
// - Result<T>: union discriminata { ok:true, value } | { ok:false, errors }.
// - Combinatori primitivi: vString, vNumber, vBoolean, vLiteral (con vincolo anti-widening).
// - vPattern(re,label): string + regex; vBadge /^UP-\d{3}$/, vOrario /^\d{2}:\d{2}$/.
// - vUnion / vEnum: prova-i-membri; tipo = unione via InferType<Vs[number]>.
// - vArray(elem): valida array omogeneo, path indicizzato "campo[i]".
// - vObject(schema) + vOptional: valida oggetti; optional -> chiave `?`.
// - InferType<V> = V extends Validator<infer T> ? T : never  (conditional + infer).
// - InferSchema<S>: mapped type + split RequiredKeys/OptionalKeys -> deriva il tipo TS.
// - toGuard(val): Validator<T> -> (v: unknown) => v is T (ponte ai type guard).
// - Pitfalls: widening literal, optional vs |undefined, unknown!=any, typeof null/array, ancore regex, NaN e' number, phantom _t, never da infer.
// - Schema = single source of truth: cambi lo schema, il tipo InferSchema si aggiorna da solo.
