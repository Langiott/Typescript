/**
 * File 058 - Async/await typed (Promise<T>)
 * Corso TypeScript - livello INTERMEDIATE.
 * In questo file vediamo come tipizzare codice asincrono: Promise<T>, il valore
 * di ritorno di una funzione async, l'operatore await, la gestione errori con
 * try/catch, un cenno a Promise.all e un esempio realistico fetchDipendenti().
 * Dominio ERP Polyuretech: Dipendente, Timbratura, ruoli. Tutti gli esempi che
 * userebbero fetch/DOM sono mockati o commentati per compilare con tsc --strict.
 */

// ============================================================================
// 1) TIPI DI DOMINIO (mock ERP, definiti qui per non importare da altri file)
// ============================================================================

// union type dei ruoli applicativi
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// entita Dipendente: badge nel formato "UP-001"
interface Dipendente {
  id: number;
  nome: string;
  badge: string; // pattern /^UP-\d{3}$/
  ruolo: Ruolo;
}

// entita Timbratura: orari come stringhe naive-UTC "HH:MM"
interface Timbratura {
  dipendenteId: number;
  entrata: string; // pattern /^\d{2}:\d{2}$/
  uscita: string; // pattern /^\d{2}:\d{2}$/
}

// ============================================================================
// 2) Promise<T>: il tipo di una computazione asincrona che produce T
// ============================================================================

// Una Promise<number> e' la promessa di ottenere, prima o poi, un number.
const promessaNumero: Promise<number> = Promise.resolve(42);
// tipo: Promise<number>

// Promise.resolve inferisce il parametro generic dal valore passato.
const promessaStringa = Promise.resolve("UP-001");
// tipo: Promise<string>

// Promise<void> quando non c'e' un valore utile da restituire (solo effetto).
const promessaVuota: Promise<void> = Promise.resolve();
// tipo: Promise<void>

// ============================================================================
// 3) FUNZIONE async: il return type e' SEMPRE una Promise
// ============================================================================

// Anche se ritorniamo un number "nudo", il tipo di ritorno e' Promise<number>.
async function contaDipendenti(): Promise<number> {
  return 6; // il number viene automaticamente wrappato in Promise
}
// tipo di contaDipendenti(): Promise<number>

// Se si annota il return type NON come Promise, e' un ERRORE.
// ERRORE TS: il tipo di ritorno di una funzione async deve essere Promise<...>.
// async function sbagliata(): number { return 6; }

// Il compilatore inferisce Promise<T> anche senza annotazione esplicita.
async function saluta(nome: string) {
  return `Ciao ${nome}`;
}
// tipo inferito: (nome: string) => Promise<string>

// ============================================================================
// 4) await: "spacchetta" una Promise<T> e restituisce T
// ============================================================================

// await usabile solo dentro funzioni async (o top-level in moduli ES2022).
async function esempioAwait(): Promise<void> {
  const n = await contaDipendenti();
  // tipo di n: number (await ha tolto il wrapper Promise)
  const msg = await saluta("Mario");
  // tipo di msg: string
  console.log(n, msg); // => 6 "Ciao Mario"
}
// funzione definita ma volutamente non chiamata (nessun side effect a import)

// await su un valore non-Promise lo restituisce cosi' com'e' (identita').
async function awaitSuValoreSemplice(): Promise<number> {
  const x = await 10; // await su number => number
  return x; // tipo: number
}

// ============================================================================
// 5) Costruttore new Promise<T>: resolve/reject tipizzati
// ============================================================================

// Simuliamo una lettura async del badge di un dipendente.
function cercaBadge(id: number): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    // resolve accetta solo string (il generic T), reject accetta qualunque motivo
    if (id > 0) {
      resolve(`UP-${String(id).padStart(3, "0")}`); // es: "UP-005"
    } else {
      reject(new Error("id non valido"));
    }
  });
}
// tipo: (id: number) => Promise<string>

// Uso con .then/.catch (stile "a catena", alternativa ad await).
function usaCercaBadge(): void {
  cercaBadge(5)
    .then((badge) => {
      // tipo di badge: string
      console.log(badge); // => "UP-005"
    })
    .catch((err: unknown) => {
      // in TS moderno il valore catturato e' unknown: va narrowato
      if (err instanceof Error) console.error(err.message);
    });
}

// ============================================================================
// 6) GESTIONE ERRORI async con try/catch
// ============================================================================

// Con async/await gli errori (reject) si intercettano con try/catch classico.
async function badgeSicuro(id: number): Promise<string> {
  try {
    const badge = await cercaBadge(id);
    return badge; // tipo: string
  } catch (err) {
    // err e' di tipo unknown sotto --strict (useUnknownInCatchVariables)
    if (err instanceof Error) {
      return `errore: ${err.message}`;
    }
    return "errore sconosciuto";
  }
}

// Pattern "Result" tipizzato: invece di lanciare, ritorniamo un discriminated union.
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

// La funzione non fa mai throw: l'errore e' dentro il valore di ritorno.
async function badgeResult(id: number): Promise<Result<string>> {
  try {
    const value = await cercaBadge(id);
    return { ok: true, value }; // ramo success
  } catch (err) {
    const error = err instanceof Error ? err.message : "sconosciuto";
    return { ok: false, error }; // ramo failure
  }
}

// Consumo del Result con narrowing sulla proprieta' discriminante "ok".
async function stampaBadge(id: number): Promise<void> {
  const r = await badgeResult(id);
  if (r.ok) {
    console.log(r.value); // qui TS sa che value: string esiste
  } else {
    console.warn(r.error); // qui TS sa che error: string esiste
  }
}

// ============================================================================
// 7) Promise.all (cenno): esegue in parallelo e tipizza la TUPLA dei risultati
// ============================================================================

// Promise.all su una tupla eterogenea inferisce una tupla di tipi coerente.
async function caricaParallelo(): Promise<void> {
  const [totale, badge] = await Promise.all([
    contaDipendenti(), // Promise<number>
    cercaBadge(3), // Promise<string>
  ]);
  // tipo di totale: number, tipo di badge: string (tupla [number, string])
  console.log(totale, badge); // => 6 "UP-003"
}

// Promise.all su un array omogeneo Promise<string>[] => Promise<string[]>.
async function tuttiIBadge(ids: number[]): Promise<string[]> {
  const promesse = ids.map((id) => cercaBadge(id));
  // tipo: Promise<string>[]
  return Promise.all(promesse); // tipo: Promise<string[]>
}

// Nota: se UNA promise fa reject, Promise.all fallisce subito (fail-fast).
// Per non fallire in blocco esiste Promise.allSettled (cenno).
async function badgeSettled(ids: number[]): Promise<void> {
  const esiti = await Promise.allSettled(ids.map((id) => cercaBadge(id)));
  // tipo: PromiseSettledResult<string>[]
  for (const e of esiti) {
    if (e.status === "fulfilled") {
      console.log(e.value); // value: string
    } else {
      console.error(e.reason); // reason: any
    }
  }
}

// ============================================================================
// 8) ESEMPIO REALISTICO: fetchDipendenti(): Promise<Dipendente[]>
// ============================================================================

// Dataset mock in-memory (simula la risposta del backend ERP).
const MOCK_DB: Dipendente[] = [
  { id: 1, nome: "Anna", badge: "UP-001", ruolo: "Admin" },
  { id: 2, nome: "Luca", badge: "UP-002", ruolo: "Operatore" },
  { id: 3, nome: "Sara", badge: "UP-003", ruolo: "SuperAdmin" },
];

// Simula la latenza di rete: Promise<void> che si risolve dopo ms millisecondi.
function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * fetchDipendenti: ritorna Promise<Dipendente[]>.
 * La chiamata HTTP reale e' commentata; usiamo il MOCK_DB per compilare
 * senza rete. In produzione si userebbe fetch() (tipizzato via lib DOM).
 */
async function fetchDipendenti(): Promise<Dipendente[]> {
  await delay(10); // simula il round-trip di rete

  // Esempio browser (versione reale, COMMENTATA per non eseguire I/O):
  // const res = await fetch("https://erp.polyuretech/api/dipendenti");
  // if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // const data = (await res.json()) as Dipendente[]; // json() ritorna Promise<any>
  // return data;

  return MOCK_DB; // tipo: Dipendente[]
}
// tipo: () => Promise<Dipendente[]>

// Filtro asincrono: recupera i dipendenti e ne estrae solo un ruolo.
async function fetchPerRuolo(ruolo: Ruolo): Promise<Dipendente[]> {
  const tutti = await fetchDipendenti(); // tipo: Dipendente[]
  return tutti.filter((d) => d.ruolo === ruolo); // ancora Dipendente[]
}

// Composizione: fetch di un singolo dipendente per id, con Result tipizzato.
async function fetchDipendente(id: number): Promise<Result<Dipendente>> {
  const tutti = await fetchDipendenti();
  const trovato = tutti.find((d) => d.id === id);
  if (trovato) {
    return { ok: true, value: trovato }; // value: Dipendente
  }
  return { ok: false, error: `dipendente ${id} non trovato` };
}

// ============================================================================
// 9) VALIDAZIONE async con regex di dominio (badge e orario)
// ============================================================================

const RE_BADGE = /^UP-\d{3}$/; // badge valido: "UP-001"
const RE_ORARIO = /^\d{2}:\d{2}$/; // orario naive-UTC "HH:MM"

// type guard sincrona riusata dentro codice async.
function isBadgeValido(s: string): boolean {
  return RE_BADGE.test(s);
}

// Valida una Timbratura in modo asincrono (es: dopo fetch) e ritorna Result.
async function validaTimbratura(t: Timbratura): Promise<Result<Timbratura>> {
  await delay(1); // finge un controllo remoto
  if (!RE_ORARIO.test(t.entrata) || !RE_ORARIO.test(t.uscita)) {
    return { ok: false, error: "orario non nel formato HH:MM" };
  }
  return { ok: true, value: t };
}

// Esempio d'uso combinato (definito, non invocato a import-time).
async function reportRuoli(): Promise<void> {
  const admins = await fetchPerRuolo("Admin");
  console.log(`Admin trovati: ${admins.length}`); // => Admin trovati: 1
  const r = await fetchDipendente(2);
  if (r.ok && isBadgeValido(r.value.badge)) {
    console.log(r.value.nome); // => "Luca"
  }
}

// ============================================================================
// 10) EXPORT dei simboli locali (solo roba definita in questo file)
// ============================================================================

export {
  contaDipendenti,
  cercaBadge,
  badgeResult,
  fetchDipendenti,
  fetchPerRuolo,
  fetchDipendente,
  validaTimbratura,
  reportRuoli,
};
export type { Dipendente, Timbratura, Ruolo, Result };

/*
 * ============================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================================
 * - Promise<T>            : promessa di un valore di tipo T (asincrono).
 * - async fn(): Promise<T>: una async ritorna SEMPRE Promise, mai T "nudo".
 * - return x (in async)   : x viene wrappato -> Promise<typeof x>.
 * - await p               : spacchetta Promise<T> -> T; solo in async/top-level.
 * - await valore          : su non-Promise restituisce il valore (identita').
 * - new Promise<T>(res,rej): resolve(T) tipizzato, reject(motivo) libero.
 * - .then / .catch        : stile a catena; catch riceve unknown -> narrowing.
 * - try/catch + await     : errori/reject intercettati; err e' unknown (strict).
 * - err instanceof Error  : narrowing dell'errore prima di leggere .message.
 * - Result<T> union       : ok:true/value | ok:false/error, niente throw.
 * - Promise.all([...])    : parallelo, tupla/array di risultati, fail-fast.
 * - Promise.allSettled    : parallelo, non fallisce in blocco, status+value/reason.
 * - fetch().json()        : ritorna Promise<any> -> castare con "as Tipo".
 * - useUnknownInCatch...  : sotto --strict la catch variable e' unknown.
 * ============================================================================
 */
