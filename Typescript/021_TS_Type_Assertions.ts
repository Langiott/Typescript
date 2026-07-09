/**
 * File 021 - Type Assertions (as, !) - TypeScript FUNDAMENTALS
 *
 * In questo file vediamo le type assertions: modi per dire al compiler
 * "fidati, questo valore ha questo type". Coprono l'operatore 'as',
 * la sintassi angle-bracket <T> (e perche' in .tsx e' vietata), il
 * non-null assertion operator '!', la doppia assertion 'as unknown as T',
 * i pericoli e alcuni pattern DOM (solo commentati, non eseguiti).
 * Contesto dominio: ERP Polyuretech (Dipendente, Timbratura, Reparto).
 */

// ---------------------------------------------------------------------------
// 1. Cos'e' una type assertion
// ---------------------------------------------------------------------------
// Una type assertion NON converte il valore a runtime: e' solo un'informazione
// per il type checker. Non esiste alcun controllo o cast reale.

const valoreSconosciuto: unknown = "UP-001";

// Con 'as' diciamo al compiler: trattalo come string.
const badge1 = valoreSconosciuto as string;
// tipo: string  (a runtime resta la stessa stringa "UP-001")

// Senza assertion questo darebbe errore perche' unknown non e' assegnabile:
// ERRORE TS: Type 'unknown' is not assignable to type 'string'.
// const badgeErr: string = valoreSconosciuto;

// ---------------------------------------------------------------------------
// 2. Sintassi 'as' vs angle-bracket <T>
// ---------------------------------------------------------------------------
// Esistono due sintassi equivalenti per la stessa assertion.

const x: unknown = "P4";

// Sintassi 'as' (consigliata, funziona ovunque):
const turnoA = x as string; // tipo: string

// Sintassi angle-bracket (identica semantica):
const turnoB = <string>x; // tipo: string

// NOTA JSX: la sintassi <string>x NON e' utilizzabile nei file .tsx,
// perche' i '<...>' si confondono con i tag JSX. Nei file .tsx e nel
// codice React usa SEMPRE 'as'. Regola pratica: preferisci 'as' e basta.

// ---------------------------------------------------------------------------
// 3. Assertion "vietate" senza passare da unknown
// ---------------------------------------------------------------------------
// TypeScript permette assertion solo tra type "sufficientemente" sovrapposti.
// Non puoi asserire tra type completamente scorrelati.

const numero = 42;
// ERRORE TS: Conversion of type 'number' to type 'string' may be a mistake...
// const comeStringa = numero as string;

// La soluzione (pericolosa!) e' la doppia assertion, vedi sezione 7.
void numero;

// ---------------------------------------------------------------------------
// 4. Entita' di dominio ERP usate negli esempi
// ---------------------------------------------------------------------------

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

interface Dipendente {
  id: number;
  nome: string;
  badge: `UP-${string}`; // template literal type, formato "UP-001"
  ruolo: Ruolo;
}

interface Timbratura {
  dipendenteId: number;
  entrata: string; // orario naive-UTC "HH:MM"
  uscita: string; // "HH:MM"
  turno: "P4" | "P2" | "STD";
}

interface Reparto {
  codice: string;
  nome: string;
}

// ---------------------------------------------------------------------------
// 5. Assertion su oggetti: dare forma a un dato "grezzo"
// ---------------------------------------------------------------------------
// Caso tipico: un JSON parse-ato torna 'any'/'unknown' e vogliamo tipizzarlo.

const rawJson = '{"id":1,"nome":"Rossi","badge":"UP-001","ruolo":"Operatore"}';

// JSON.parse ritorna 'any': lo asseriamo a Dipendente.
const dip = JSON.parse(rawJson) as Dipendente;
// tipo: Dipendente
// ATTENZIONE: nessuno garantisce che il JSON rispetti davvero la forma!
// L'assertion e' una promessa che facciamo noi al compiler.
console.log(dip.badge); // => "UP-001"

// Assertion con oggetto letterale + 'as' per fissare i literal type:
const turnoFisso = { turno: "P4" } as { turno: "P4" | "P2" | "STD" };
// tipo: { turno: "P4" | "P2" | "STD" }
void turnoFisso;

// ---------------------------------------------------------------------------
// 6. Non-null assertion operator '!'
// ---------------------------------------------------------------------------
// Il suffisso '!' dice al compiler: "questo valore NON e' null ne' undefined".
// Rimuove null/undefined dal type. A runtime non fa nulla.

function trovaDipendente(id: number): Dipendente | undefined {
  const elenco: Dipendente[] = [
    { id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Operatore" },
  ];
  return elenco.find((d) => d.id === id);
}

const forse = trovaDipendente(1);
// tipo: Dipendente | undefined

// Con '!' garantiamo noi che non e' undefined:
const sicuro = trovaDipendente(1)!;
// tipo: Dipendente  (undefined rimosso)
console.log(sicuro.nome); // => "Rossi"

// PERICOLO: se in realta' fosse undefined, a runtime esplode con
// "Cannot read properties of undefined". Il '!' NON aggiunge controlli.
// const nessuno = trovaDipendente(999)!; // compila, ma a runtime crasherebbe usandolo

// Alternativa SICURA senza '!': narrowing con un controllo esplicito.
if (forse !== undefined) {
  console.log(forse.badge); // qui il type e' Dipendente per narrowing
}

// '!' su property di oggetto possibilmente nullo:
interface RispostaApi {
  dati?: { reparto?: Reparto };
}
const resp: RispostaApi = { dati: { reparto: { codice: "R1", nome: "Stampi" } } };
const nomeReparto = resp.dati!.reparto!.nome;
// tipo: string  (abbiamo asserito che dati e reparto esistono)
console.log(nomeReparto); // => "Stampi"

// Con optional chaining l'approccio sicuro sarebbe:
const nomeSicuro = resp.dati?.reparto?.nome;
// tipo: string | undefined

// ---------------------------------------------------------------------------
// 7. Doppia assertion: 'as unknown as T'
// ---------------------------------------------------------------------------
// Quando due type non si sovrappongono, TS blocca l'assertion diretta.
// Passando da 'unknown' (o 'any') si "convince" il compiler in due passi.
// E' un'arma potente e PERICOLOSA: bypassa ogni controllo.

const eta = 30;
// ERRORE TS: assertion diretta number -> string non ammessa
// const s = eta as string;

// Doppia assertion: number -> unknown -> string
const forzato = eta as unknown as string;
// tipo: string  (ma a runtime forzato e' ancora il numero 30!)
// console.log(forzato.toUpperCase()); // a runtime: crash, i number non hanno toUpperCase
void forzato;

// Uso "legittimo" (raro): adattare un mock nei test a un'interfaccia complessa.
interface ServizioTimbrature {
  registra(t: Timbratura): void;
  chiudiTurno(id: number): boolean;
}
// Mock parziale: implementa solo un metodo. Doppia assertion per accettarlo.
const mockServizio = {
  registra(_t: Timbratura): void {
    /* no-op nel test */
  },
} as unknown as ServizioTimbrature;
// tipo: ServizioTimbrature  (chiudiTurno NON esiste davvero: rischio se lo chiami)
mockServizio.registra({ dipendenteId: 1, entrata: "08:00", uscita: "17:00", turno: "P4" });

// ---------------------------------------------------------------------------
// 8. 'as const' - la assertion piu' utile e sicura
// ---------------------------------------------------------------------------
// 'as const' rende un valore readonly e ne restringe i type ai literal.

const turniLet = ["P4", "P2", "STD"];
// tipo: string[]  (i literal sono "allargati" a string)

const turni = ["P4", "P2", "STD"] as const;
// tipo: readonly ["P4", "P2", "STD"]  (tuple di literal, immutabile)

type TurnoDaArray = (typeof turni)[number];
// tipo: "P4" | "P2" | "STD"

const config = { maxOre: 8, sede: "Modena" } as const;
// tipo: { readonly maxOre: 8; readonly sede: "Modena" }
// ERRORE TS: Cannot assign to 'maxOre' because it is a read-only property.
// config.maxOre = 9;
void turniLet;
void config;

// ---------------------------------------------------------------------------
// 9. Assertion NON e' validazione: fare validazione vera
// ---------------------------------------------------------------------------
// L'assertion e' cieca. Se il dato puo' non rispettare la forma, VALIDA.

const badgeRegex = /^UP-\d{3}$/;
const orarioRegex = /^\d{2}:\d{2}$/;

// Type guard che valida DAVVERO e restringe il type (safe alternative a 'as'):
function isBadge(v: unknown): v is `UP-${string}` {
  return typeof v === "string" && badgeRegex.test(v);
}

const inputUtente: unknown = "UP-042";
if (isBadge(inputUtente)) {
  // qui inputUtente ha tipo `UP-${string}` grazie al type guard (non a un 'as')
  console.log("badge valido:", inputUtente); // => "badge valido: UP-042"
}

function validaOrario(v: string): boolean {
  return orarioRegex.test(v);
}
console.log(validaOrario("08:30")); // => true
console.log(validaOrario("8:30")); // => false

// ---------------------------------------------------------------------------
// 10. Esempi browser / DOM (SOLO commentati, non eseguiti)
// ---------------------------------------------------------------------------
// getElementById ritorna 'HTMLElement | null'. Servono spesso assertion.

// Esempio browser: assertion sul type dell'elemento
// const input = document.getElementById("badge") as HTMLInputElement;
// input.value = "UP-001"; // .value esiste solo su HTMLInputElement, non su HTMLElement

// Esempio browser: non-null assertion perche' sappiamo che l'elemento esiste
// const bottone = document.getElementById("salva")!; // tipo: HTMLElement
// bottone.addEventListener("click", () => console.log("salvato"));

// Esempio browser: combinare '!' e 'as' insieme
// const campo = document.getElementById("orario")! as HTMLInputElement;
// console.log(campo.value);

// Esempio browser: alternativa SICURA senza assertion
// const el = document.getElementById("badge");
// if (el instanceof HTMLInputElement) {
//   el.value = "UP-002"; // narrowing reale via instanceof, niente 'as'
// }

// La funzione seguente e' definita ma NON chiamata (nessun DOM a runtime qui):
function leggiValoreCampo(id: string): string {
  // Esempio browser: querySelector con generic + assertion implicita
  // const el = document.querySelector<HTMLInputElement>("#" + id);
  // return el?.value ?? "";
  return id; // placeholder per far compilare senza DOM
}
void leggiValoreCampo;

// ---------------------------------------------------------------------------
// 11. Assertion con generics e array
// ---------------------------------------------------------------------------

// Array vuoto tipizzato via assertion (alternativa all'annotazione):
const timbrature = [] as Timbratura[];
// tipo: Timbratura[]
timbrature.push({ dipendenteId: 1, entrata: "08:00", uscita: "17:00", turno: "STD" });

// Assertion per restringere un elemento di union in un array eterogeneo:
const misto: (Dipendente | Reparto)[] = [
  { id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Admin" },
  { codice: "R1", nome: "Stampi" },
];
const primo = misto[0] as Dipendente;
// tipo: Dipendente  (asseriamo di sapere che il primo e' un Dipendente)
console.log(primo.ruolo); // => "Admin"

// ---------------------------------------------------------------------------
// 12. Quando e' pericoloso: riepilogo dei rischi
// ---------------------------------------------------------------------------
// - 'as' su dati esterni (JSON, fetch, localStorage) senza validare -> bug runtime.
// - '!' su valori che POSSONO essere null/undefined -> crash "reading undefined".
// - 'as unknown as T' -> bypassa tutto il type system, usare solo se indispensabile.
// - Assertion per "zittire" un errore invece di capirlo -> nasconde bug reali.
// Preferisci sempre: narrowing (if/typeof/instanceof), type guard (v is T),
// optional chaining (?.), nullish coalescing (??) e validazione con regex/schema.

// ---------------------------------------------------------------------------
// Export di simboli locali (solo roba definita in questo file)
// ---------------------------------------------------------------------------
export { isBadge, validaOrario, trovaDipendente, turni };
export type { Dipendente, Timbratura, Reparto, Ruolo, TurnoDaArray };

/*
 * =====================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * =====================================================================
 * - Type assertion: informa il compiler, NON e' un cast runtime.
 * - 'valore as T'         -> sintassi standard, valida ovunque.
 * - '<T>valore'           -> stessa cosa, VIETATA nei file .tsx (conflitto JSX).
 * - 'valore!'             -> non-null assertion: rimuove null | undefined.
 * - 'a as unknown as T'   -> doppia assertion: forza type scorrelati (pericolosa).
 * - 'x as const'          -> readonly + literal type (assertion sicura e utile).
 * - (typeof arr)[number]  -> ricava union dai valori di un array 'as const'.
 * - Assertion NON valida: per dati esterni usa type guard 'v is T' + regex.
 * - DOM: getElementById ritorna HTMLElement | null -> 'as HTMLInputElement' o '!'.
 * - Sicurezza: preferisci narrowing (typeof/instanceof), ?., ?? alle assertion.
 * - Rischi: crash runtime, bug nascosti, type system bypassato.
 * =====================================================================
 */
