/**
 * File 022 - Type Narrowing (typeof / in / instanceof)
 * Corso TypeScript - livello FUNDAMENTALS.
 * Il narrowing e' il processo con cui TypeScript restringe un type
 * (spesso una union) a un type piu' specifico dentro un blocco di codice,
 * grazie a guardie come typeof, l'operatore in, instanceof e i type
 * predicate. Vediamo i pattern principali applicati al dominio ERP Polyuretech.
 */

export {}; // rende il file un module isolato (gli export locali seguono sotto)

/* ------------------------------------------------------------------ */
/* 1) typeof type guard                                               */
/* ------------------------------------------------------------------ */

// L'operatore typeof restituisce una stringa nota a runtime; TS la usa
// per restringere il type. Valori utili: "string" | "number" | "boolean"
// | "object" | "function" | "symbol" | "bigint" | "undefined".

// Formatta un id badge che puo' arrivare come numero o gia' come stringa.
function formattaBadge(valore: string | number): string {
  if (typeof valore === "number") {
    // qui valore: number  -> possiamo usare i metodi numerici
    return "UP-" + valore.toString().padStart(3, "0"); // => "UP-001"
  }
  // qui valore: string (narrowing per esclusione)
  return valore.toUpperCase();
}
// formattaBadge(1)       // => "UP-001"
// formattaBadge("up-7")  // => "UP-7"

// typeof distingue anche undefined da un valore presente.
function orarioOppureDefault(orario: string | undefined): string {
  if (typeof orario === "undefined") {
    return "00:00"; // qui orario: undefined
  }
  return orario; // qui orario: string
}

// Attenzione: typeof null === "object". Non affidarti a typeof per null.
function lunghezzaNome(nome: string | null): number {
  // ERRORE TS: Object is possibly 'null'.
  // return nome.length;
  if (typeof nome === "object") {
    // qui nome: null  (l'unico object rimasto nella union)
    return 0;
  }
  return nome.length; // qui nome: string
}

/* ------------------------------------------------------------------ */
/* 2) Modello di dominio: union Dipendente | Timbratura               */
/* ------------------------------------------------------------------ */

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  kind: "dipendente"; // discriminant literal (utile per narrowing)
  id: number;
  nome: string;
  badge: string; // formato "UP-001"
  ruolo: Ruolo;
  turno: Turno;
}

interface Timbratura {
  kind: "timbratura";
  id: number;
  dipendenteId: number;
  entrata: string; // "HH:MM" naive-UTC
  uscita: string | null; // null = ancora al lavoro
}

type EntitaErp = Dipendente | Timbratura;

/* ------------------------------------------------------------------ */
/* 3) narrowing su union con proprieta' discriminante                 */
/* ------------------------------------------------------------------ */

// Il modo piu' pulito per una discriminated union: controllare "kind".
function descrivi(entita: EntitaErp): string {
  if (entita.kind === "dipendente") {
    // qui entita: Dipendente
    return entita.nome + " (" + entita.badge + ")";
  }
  // qui entita: Timbratura
  return "Timbratura ingresso " + entita.entrata;
}

/* ------------------------------------------------------------------ */
/* 4) Operatore 'in' come type guard                                  */
/* ------------------------------------------------------------------ */

// 'in' verifica la presenza di una property; TS restringe la union in base
// a quale membro possiede quella property. Utile quando NON c'e' un
// discriminant esplicito.
interface DipMini {
  nome: string;
  badge: string;
}
interface TimbMini {
  entrata: string;
  uscita: string | null;
}
type RecordMini = DipMini | TimbMini;

function riassumi(rec: RecordMini): string {
  if ("badge" in rec) {
    // qui rec: DipMini  (solo DipMini ha 'badge')
    return "Dipendente " + rec.badge;
  }
  // qui rec: TimbMini
  return "Entrata alle " + rec.entrata;
}

// 'in' e' comodo anche per property opzionali che potrebbero mancare.
interface ConfigTurno {
  turno: Turno;
  pausaMinuti?: number;
}
function pausaEffettiva(cfg: ConfigTurno): number {
  if ("pausaMinuti" in cfg && typeof cfg.pausaMinuti === "number") {
    return cfg.pausaMinuti; // qui property presente e number
  }
  return 30; // default
}

/* ------------------------------------------------------------------ */
/* 5) instanceof type guard                                           */
/* ------------------------------------------------------------------ */

// instanceof restringe verso una classe controllando la prototype chain.
// Definiamo una gerarchia di errori per la validazione ERP.
class ErroreValidazione extends Error {
  constructor(public campo: string, message: string) {
    super(message);
    this.name = "ErroreValidazione";
  }
}
class ErroreBadge extends ErroreValidazione {
  constructor(public badgeErrato: string) {
    super("badge", "Badge non valido: " + badgeErrato);
    this.name = "ErroreBadge";
  }
}

function messaggioErrore(err: unknown): string {
  if (err instanceof ErroreBadge) {
    // qui err: ErroreBadge  -> accediamo a badgeErrato
    return "Badge rifiutato: " + err.badgeErrato;
  }
  if (err instanceof ErroreValidazione) {
    // qui err: ErroreValidazione  -> accediamo a campo
    return "Campo " + err.campo + " invalido";
  }
  if (err instanceof Error) {
    // qui err: Error
    return err.message;
  }
  // qui err: unknown residuo
  return "Errore sconosciuto";
}

// instanceof con tipi built-in: distinguere Date da stringa.
function comeIso(valore: Date | string): string {
  if (valore instanceof Date) {
    return valore.toISOString(); // qui valore: Date
  }
  return valore; // qui valore: string
}

/* ------------------------------------------------------------------ */
/* 6) Type predicate (guardia personalizzata riutilizzabile)          */
/* ------------------------------------------------------------------ */

// Una funzione che ritorna "arg is Tipo" insegna a TS il narrowing.
// Cosi' incapsuliamo la logica e la riusiamo ovunque.
function isDipendente(e: EntitaErp): e is Dipendente {
  return e.kind === "dipendente";
}

function badgeDi(entita: EntitaErp): string {
  if (isDipendente(entita)) {
    return entita.badge; // qui entita: Dipendente
  }
  return "(nessun badge)";
}

// Type predicate su unknown: valida a runtime la forma di un Dipendente.
function isTimbratura(x: unknown): x is Timbratura {
  return (
    typeof x === "object" &&
    x !== null &&
    "kind" in x &&
    (x as { kind: unknown }).kind === "timbratura"
  );
}
// const dati: unknown = JSON.parse('{"kind":"timbratura","id":1,"dipendenteId":2,"entrata":"08:00","uscita":null}');
// if (isTimbratura(dati)) { dati.entrata }  // qui dati: Timbratura

/* ------------------------------------------------------------------ */
/* 7) Guardie combinate                                               */
/* ------------------------------------------------------------------ */

// Combinare piu' guardie in una sola condizione restringe progressivamente.
const RE_ORARIO = /^\d{2}:\d{2}$/;
const RE_BADGE = /^UP-\d{3}$/;

// Accetta molte forme e produce un orario "HH:MM" valido oppure null.
function normalizzaOrario(input: unknown): string | null {
  if (typeof input === "string" && RE_ORARIO.test(input)) {
    return input; // string valida "HH:MM"
  }
  if (typeof input === "number" && input >= 0 && input < 24) {
    // number ora intera -> "HH:00"
    return input.toString().padStart(2, "0") + ":00";
  }
  if (input instanceof Date) {
    const h = input.getUTCHours().toString().padStart(2, "0");
    const m = input.getUTCMinutes().toString().padStart(2, "0");
    return h + ":" + m;
  }
  return null;
}
// normalizzaOrario("08:30") // => "08:30"
// normalizzaOrario(9)        // => "09:00"
// normalizzaOrario("xx")     // => null

// Guardia combinata su union + property + regex: valida un Dipendente
// "completo" pronto per il salvataggio.
function isDipendenteValido(e: EntitaErp): e is Dipendente {
  return (
    isDipendente(e) &&
    RE_BADGE.test(e.badge) &&
    e.nome.trim().length > 0
  );
}

// Uso combinato di in + typeof per leggere l'uscita solo se e' timbratura chiusa.
function turnoChiuso(e: EntitaErp): boolean {
  if ("uscita" in e && typeof e.uscita === "string") {
    // qui e: Timbratura con uscita valorizzata (string, non null)
    return RE_ORARIO.test(e.uscita);
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* 8) Narrowing e controllo di esaustivita' (never)                   */
/* ------------------------------------------------------------------ */

// Dopo aver esaminato tutti i membri della union, il caso residuo e' never:
// utile per forzare la gestione di ogni ruolo a compile time.
function permessi(ruolo: Ruolo): string {
  switch (ruolo) {
    case "SuperAdmin":
      return "tutto";
    case "Admin":
      return "gestione reparto";
    case "Operatore":
      return "timbra";
    case "QrDisplay":
      return "sola lettura QR";
    default: {
      // qui ruolo: never  -> se aggiungi un ruolo nuovo, questa riga non compila
      const esaustivo: never = ruolo;
      return esaustivo;
    }
  }
}
// permessi("Admin") // => "gestione reparto"

/* ------------------------------------------------------------------ */
/* 9) Truthiness narrowing                                            */
/* ------------------------------------------------------------------ */

// Un semplice if(valore) elimina null, undefined, "", 0, NaN, false.
function saluta(nome?: string | null): string {
  if (nome) {
    return "Ciao " + nome; // qui nome: string (non vuota)
  }
  return "Ciao ospite"; // qui nome: string vuota | undefined | null
}

// Attenzione al numero 0: la truthiness lo scarta. Meglio typeof/confronto.
function haUscita(uscita: string | null): boolean {
  // usa un confronto esplicito invece di if(uscita) per chiarezza
  return uscita !== null && uscita.length > 0;
}

export type { Dipendente, Timbratura, EntitaErp, Ruolo, Turno };
export {
  formattaBadge,
  descrivi,
  riassumi,
  messaggioErrore,
  isDipendente,
  isTimbratura,
  normalizzaOrario,
  isDipendenteValido,
  permessi,
  ErroreValidazione,
  ErroreBadge,
};

/* ------------------------------------------------------------------ */
/* RIEPILOGO COMANDI / CONCETTI                                       */
/* ------------------------------------------------------------------ */
/*
 * - typeof x === "string"|"number"|"boolean"|"object"|... : guard su primitivi.
 * - typeof null === "object" : trappola, null non e' distinguibile da object via typeof.
 * - discriminated union : property literal comune (kind) per narrowing pulito con ===.
 * - "prop" in oggetto : guard basata sulla presenza di una property.
 * - x instanceof Classe : guard sulla prototype chain (classi, Error, Date...).
 * - type predicate: function f(x): x is Tipo -> guardia riutilizzabile.
 * - validazione unknown: typeof object + != null + "prop" in x + cast controllato.
 * - guardie combinate: typeof + regex + in + predicate nella stessa condizione.
 * - esaustivita': ramo default con const _: never = x -> errore se la union cresce.
 * - truthiness: if(x) scarta null/undefined/""/0/NaN/false (occhio a 0 e "").
 * - narrowing per esclusione: dopo aver escluso un membro, resta l'altro.
 */
