/**
 * File 046 - Default Type Params (parametri di tipo di default)
 * Corso TypeScript - livello INTERMEDIATE.
 * Un generic type parameter puo' avere un valore di default: <T = string>.
 * Se il chiamante non specifica T, TypeScript usa il default; se lo specifica, vince il suo.
 * Vediamo: sintassi T=Default, Container<T=string>, ApiResponse<T=unknown>,
 * e le REGOLE di ordine dei parametri quando si combinano default e constraint (extends).
 */

// ---------------------------------------------------------------------------
// 1. Sintassi base: <T = Default>
// ---------------------------------------------------------------------------

// Un parametro con default puo' essere omesso in fase di uso.
type Box<T = string> = { valore: T };

// Se NON passo il type argument, T diventa string (il default).
const b1: Box = { valore: "UP-001" };
// tipo di b1.valore: string

// Se passo il type argument, quello vince sul default.
const b2: Box<number> = { valore: 42 };
// tipo di b2.valore: number

// ERRORE TS: Type 'number' is not assignable to type 'string'.
// const bErr: Box = { valore: 42 };

// ---------------------------------------------------------------------------
// 2. Container<T=string> in stile ERP
// ---------------------------------------------------------------------------

// Un container generico riutilizzabile: senza argomento contiene string.
interface Container<T = string> {
  items: T[];
  aggiungi(item: T): void;
  primo(): T | undefined;
}

// Uso senza argomento: Container di string (es. lista di badge).
const badges: Container = {
  items: ["UP-001", "UP-002"],
  aggiungi(b) { this.items.push(b); }, // b: string
  primo() { return this.items[0]; },   // => string | undefined
};

// Uso con argomento esplicito: Container di number (es. id dipendenti).
const ids: Container<number> = {
  items: [1, 2, 3],
  aggiungi(n) { this.items.push(n); }, // n: number
  primo() { return this.items[0]; },
};

// ---------------------------------------------------------------------------
// 3. Entita' di dominio ERP usate negli esempi
// ---------------------------------------------------------------------------

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

interface Dipendente {
  id: number;
  nome: string;
  badge: `UP-${string}`; // template literal type, es. "UP-001"
  ruolo: Ruolo;
}

interface Timbratura {
  dipendenteId: number;
  entrata: string; // orario naive-UTC "HH:MM"
  uscita: string;
}

interface Reparto {
  id: number;
  nome: string;
  turno: Turno;
}

// ---------------------------------------------------------------------------
// 4. ApiResponse<T=unknown>: il default "sicuro" e' unknown
// ---------------------------------------------------------------------------

// unknown come default costringe il consumatore a fare narrowing se non
// specifica il tipo del payload: e' piu' sicuro di 'any'.
interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

// Senza argomento: data e' unknown.
const respGenerica: ApiResponse = { ok: true, status: 200, data: { x: 1 } };
// tipo di respGenerica.data: unknown
// ERRORE TS: 'respGenerica.data' is of type 'unknown'.
// respGenerica.data.x;
if (respGenerica.data && typeof respGenerica.data === "object") {
  // qui serve narrowing prima di usare data
}

// Con argomento: data e' tipizzato correttamente.
const respDip: ApiResponse<Dipendente> = {
  ok: true,
  status: 200,
  data: { id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Operatore" },
};
respDip.data.nome; // => string, nessun narrowing necessario

// Anche con array come payload.
const respLista: ApiResponse<Dipendente[]> = {
  ok: true,
  status: 200,
  data: [],
};
respLista.data.length; // => number

// ---------------------------------------------------------------------------
// 5. Perche' unknown e non any come default
// ---------------------------------------------------------------------------

// Con default = any si perderebbe ogni controllo (sconsigliato).
interface ApiResponseUnsafe<T = any> {
  data: T;
}
const unsafe: ApiResponseUnsafe = { data: 123 };
unsafe.data.qualsiasiCosa.esplode; // nessun errore: any disabilita i check (pericoloso)

// Con unknown il compilatore ci protegge (vedi esempio 4). Preferire unknown.

// ---------------------------------------------------------------------------
// 6. Default che dipende da un parametro precedente
// ---------------------------------------------------------------------------

// Il default di un parametro puo' riferirsi a parametri dichiarati PRIMA.
type Coppia<A, B = A> = { primo: A; secondo: B };

const c1: Coppia<string> = { primo: "a", secondo: "b" };
// B eredita da A => secondo: string

const c2: Coppia<number, string> = { primo: 1, secondo: "due" };
// B esplicito => secondo: string

// ERRORE TS: un default NON puo' riferirsi a un parametro dichiarato DOPO.
// type Rovescio<A = B, B = string> = { a: A; b: B };

// ---------------------------------------------------------------------------
// 7. Default + constraint (extends): ordine e regole
// ---------------------------------------------------------------------------

// Sintassi completa: <T extends Vincolo = Default>. Prima il constraint, poi il default.
// Il Default DEVE soddisfare il constraint, altrimenti errore.
interface Elenco<T extends { id: number } = Dipendente> {
  righe: T[];
}

// Senza argomento: T = Dipendente (che rispetta { id: number }).
const elencoDip: Elenco = {
  righe: [{ id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Admin" }],
};

// Con argomento che rispetta il constraint.
const elencoRep: Elenco<Reparto> = {
  righe: [{ id: 10, nome: "Stampaggio", turno: "P4" }],
};

// ERRORE TS: 'string' non soddisfa il constraint '{ id: number }'.
// const elencoErr: Elenco<string> = { righe: [] };

// ERRORE TS: il Default non rispetta il constraint.
// interface Sbagliato<T extends { id: number } = string> { x: T }

// ---------------------------------------------------------------------------
// 8. Ordine dei parametri: quelli con default vanno DOPO quelli senza
// ---------------------------------------------------------------------------

// Regola simile ai parametri di funzione: i default in coda.
type Mappa<K, V = string> = Map<K, V>;
const m1: Mappa<number> = new Map(); // V default string => Map<number, string>
const m2: Mappa<number, Dipendente> = new Map();

// ERRORE TS: un parametro con default non puo' precedere uno senza default.
// type MappaKO<K = string, V> = Map<K, V>;

// ---------------------------------------------------------------------------
// 9. Default in funzioni generiche
// ---------------------------------------------------------------------------

// Nelle funzioni il default entra in gioco solo se T non e' inferibile dagli argomenti.
function creaContainer<T = string>(): Container<T> {
  return { items: [], aggiungi() {}, primo() { return undefined; } };
}

const cs = creaContainer(); // Container<string> (usa il default)
const cn = creaContainer<number>(); // Container<number>
cs.aggiungi("UP-999"); // ok, string
cn.aggiungi(7); // ok, number

// Se invece l'argomento consente l'inferenza, T viene inferito e il default e' ignorato.
function primoElemento<T = unknown>(arr: T[]): T | undefined {
  return arr[0];
}
const pe = primoElemento([10, 20, 30]); // T inferito = number => number | undefined
const peVuoto = primoElemento([]); // nessuna info: T resta il default => never[] => never
// Nota: su array vuoto senza annotazione T collassa a never; annotare se serve:
const peTip = primoElemento<string>([]); // string | undefined

// ---------------------------------------------------------------------------
// 10. Default per rendere ergonomici i tipi "wrapper"
// ---------------------------------------------------------------------------

// Risultato paginato: payload di default lista vuota-agnostica (unknown).
interface Paginato<T = unknown> {
  pagina: number;
  perPagina: number;
  totale: number;
  risultati: T[];
}

// Uso comodo: specializzato su Timbratura.
const pageTimbrature: Paginato<Timbratura> = {
  pagina: 1,
  perPagina: 20,
  totale: 2,
  risultati: [
    { dipendenteId: 1, entrata: "08:00", uscita: "17:00" },
    { dipendenteId: 2, entrata: "09:00", uscita: "18:00" },
  ],
};
pageTimbrature.risultati[0].entrata; // => string "HH:MM"

// ---------------------------------------------------------------------------
// 11. Combinare default + constraint + parametro dipendente (caso completo)
// ---------------------------------------------------------------------------

// K vincolato alle chiavi di T; default di V = il tipo del valore corrispondente.
// Mostra ordine: T senza default -> K con constraint -> V con default dipendente.
type ValoreDi<T, K extends keyof T = keyof T, V = T[K]> = {
  chiave: K;
  valore: V;
};

const vd: ValoreDi<Dipendente, "ruolo"> = { chiave: "ruolo", valore: "Admin" };
// V default = Dipendente["ruolo"] => Ruolo

// ERRORE TS: "inesistente" non e' una chiave di Dipendente.
// const vdErr: ValoreDi<Dipendente, "inesistente"> = { chiave: "inesistente", valore: 1 };

// ---------------------------------------------------------------------------
// 12. Validazione di dominio con type guard (default unknown in azione)
// ---------------------------------------------------------------------------

const RE_BADGE = /^UP-\d{3}$/;
const RE_ORARIO = /^\d{2}:\d{2}$/;

// La risposta arriva come ApiResponse (data: unknown): dobbiamo validare.
function estraiBadge(resp: ApiResponse): string | null {
  const d = resp.data; // unknown
  if (typeof d === "string" && RE_BADGE.test(d)) {
    return d; // qui d e' string, narrowed
  }
  return null;
}
estraiBadge({ ok: true, status: 200, data: "UP-042" }); // => "UP-042"
estraiBadge({ ok: true, status: 200, data: 123 }); // => null

// Con ApiResponse<string> il narrowing su typeof e' comunque utile per la regex.
function orarioValido(resp: ApiResponse<string>): boolean {
  return RE_ORARIO.test(resp.data); // data: string, nessun controllo typeof necessario
}
orarioValido({ ok: true, status: 200, data: "08:30" }); // => true

// ---------------------------------------------------------------------------
// 13. Default in class generiche
// ---------------------------------------------------------------------------

// Anche le class supportano default type params.
class Registro<T extends { id: number } = Dipendente> {
  private dati: T[] = [];
  inserisci(x: T): void { this.dati.push(x); }
  trova(id: number): T | undefined { return this.dati.find((r) => r.id === id); }
  get tutti(): readonly T[] { return this.dati; }
}

const regDip = new Registro(); // Registro<Dipendente> via default
regDip.inserisci({ id: 1, nome: "Bianchi", badge: "UP-003", ruolo: "Operatore" });

const regRep = new Registro<Reparto>(); // esplicito
regRep.inserisci({ id: 5, nome: "Assemblaggio", turno: "STD" });

// ---------------------------------------------------------------------------
// 14. Riesporto simboli locali (solo di questo file)
// ---------------------------------------------------------------------------

export type {
  Box,
  Container,
  ApiResponse,
  Paginato,
  Coppia,
  Elenco,
  ValoreDi,
  Dipendente,
  Timbratura,
  Reparto,
  Ruolo,
  Turno,
};
export { creaContainer, primoElemento, estraiBadge, Registro };

// ---------------------------------------------------------------------------
// RIEPILOGO COMANDI / CONCETTI
// ---------------------------------------------------------------------------
// - Sintassi: <T = Default> assegna un valore di default al type parameter.
// - Se il chiamante omette il type argument, vince il Default; se lo passa, vince il suo.
// - Container<T = string>: tipo riusabile che senza argomento contiene string.
// - ApiResponse<T = unknown>: unknown come default forza il narrowing (piu' sicuro di any).
// - Preferire unknown a any come default: any disabilita i controlli di tipo.
// - Un default puo' dipendere da parametri dichiarati PRIMA: <A, B = A>.
// - Un default NON puo' riferirsi a parametri dichiarati DOPO.
// - Constraint + default insieme: <T extends Vincolo = Default>; il Default deve rispettare il Vincolo.
// - Ordine: i parametri con default vanno DOPO quelli senza default.
// - Funzioni: il default si applica solo se T non e' inferibile dagli argomenti.
// - Su array vuoto senza annotazione T puo' collassare a never: annotare esplicitamente.
// - Class e interface supportano entrambe i default type params.
// - Caso completo: <T, K extends keyof T = keyof T, V = T[K]> combina tutto.
