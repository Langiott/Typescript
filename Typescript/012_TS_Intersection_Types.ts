/**
 * 012 - Intersection Types (A & B) in TypeScript
 * ------------------------------------------------
 * Un intersection type combina PIU' tipi in uno solo: il risultato deve
 * soddisfare TUTTI i tipi contemporaneamente (logica AND). Si scrive `A & B`.
 * E' lo strumento tipico per COMPORRE DTO nel dominio ERP: partire da mattoni
 * riusabili (ConId, ConTimestamp, DatiAnagrafici, ...) e sommarli per ottenere
 * entita' complete come Dipendente, Timbratura o RichiestaPermesso.
 * Contrasto chiave: union `A | B` = "uno oppure l'altro"; intersection `A & B` = "entrambi insieme".
 */

// ============================================================================
// 1. IDEA DI BASE: & unisce le proprieta' di piu' tipi
// ============================================================================

// Due tipi "mattone" separati.
type ConId = { id: number };
type ConCodiceBadge = { codiceBadge: string }; // formato "UP-001"

// L'intersection richiede ENTRAMBE le proprieta'.
type EntitaBadge = ConId & ConCodiceBadge;

// Un valore valido deve avere sia id sia codiceBadge.
const badge1: EntitaBadge = { id: 1, codiceBadge: "UP-001" };
// tipo: { id: number; codiceBadge: string }

// ERRORE TS: manca 'codiceBadge' -> non soddisfa l'intero intersection.
// const badgeRotto: EntitaBadge = { id: 2 };

console.log(badge1.codiceBadge); // => "UP-001"

// ============================================================================
// 2. MATTONI RIUSABILI PER COMPORRE DTO (pattern ERP)
// ============================================================================

// Ruolo utente reale del dominio.
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Mattone: chi ha un id numerico.
type ConIdNumerico = { id: number };

// Mattone: colonne di audit (timestamp naive-UTC come stringa ISO).
type ConTimestamp = {
  creatoIl: string;    // "AAAA-MM-GGTHH:MM"
  aggiornatoIl: string;
};

// Mattone: dati anagrafici puri.
type DatiAnagrafici = {
  nome: string;
  cognome: string;
  email: string;
};

// Mattone: dati specifici del lavoratore.
type DatiLavoro = {
  codiceBadge: string; // "UP-001"
  ruolo: Ruolo;
  tipologia: string;   // reparto, es. "Ufficio_Informatico"
};

// DTO composto: sommo i mattoni con & -> un Dipendente completo.
type DipendenteDTO = ConIdNumerico & ConTimestamp & DatiAnagrafici & DatiLavoro;

const dip1: DipendenteDTO = {
  id: 1,
  creatoIl: "2026-07-08T08:00",
  aggiornatoIl: "2026-07-08T08:00",
  nome: "Mario",
  cognome: "Rossi",
  email: "mario.rossi@polyuretech.com",
  codiceBadge: "UP-001",
  ruolo: "Operatore",
  tipologia: "Ufficio_produzione",
};
// tipo: unione di TUTTE le proprieta' dei 4 mattoni

console.log(`${dip1.nome} ${dip1.cognome} - ${dip1.codiceBadge}`);
// => "Mario Rossi - UP-001"

// ============================================================================
// 3. INTERSECTION vs UNION (differenza fondamentale)
// ============================================================================

type A = { a: number };
type B = { b: number };

// Union: basta soddisfare UNO dei due tipi (puo' avere solo a, solo b, o entrambi).
type AoppureB = A | B;
const soloA: AoppureB = { a: 1 };           // ok
const soloB: AoppureB = { b: 2 };           // ok

// Intersection: deve avere ENTRAMBE le proprieta'.
type AeB = A & B;
const entrambi: AeB = { a: 1, b: 2 };       // ok
// ERRORE TS: manca 'b' -> l'intersection le vuole tutte e due.
// const parziale: AeB = { a: 1 };

console.log(soloA.a, soloB.b, entrambi.a + entrambi.b); // => 1 2 3

// ============================================================================
// 4. AGGIUNGERE CAMPI A UN TIPO ESISTENTE (estendere via &)
// ============================================================================

// Timbratura base del dominio (orari "HH:MM" naive-UTC, nullable).
type TimbraturaBase = {
  id: number;
  dipendenteId: number;
  data: string;            // "AAAA-MM-GG"
  ingresso: string | null; // "08:00"
  uscita: string | null;   // "17:00"
};

// Estendo con campi calcolati SENZA toccare il tipo originale.
type TimbraturaCalcolata = TimbraturaBase & {
  oreLavorate: number | null;
  minutiStraordinario: number;
  presente: boolean;
};

const timb1: TimbraturaCalcolata = {
  id: 10,
  dipendenteId: 1,
  data: "2026-07-08",
  ingresso: "08:00",
  uscita: "17:00",
  oreLavorate: 8,
  minutiStraordinario: 0,
  presente: true,
};
console.log(timb1.oreLavorate); // => 8

// ============================================================================
// 5. INTERSEZIONE DI PROPRIETA' CON LO STESSO NOME
// ============================================================================

// Se due tipi condividono una proprieta', il suo tipo diventa a sua volta
// l'intersection dei due tipi di quella proprieta'.
type ConNumero = { valore: number };
type ConNumeroPositivo = { valore: number }; // stesso tipo -> ok, resta number
type IncrocioOk = ConNumero & ConNumeroPositivo;
const inc1: IncrocioOk = { valore: 42 };
// tipo di valore: number & number = number
console.log(inc1.valore); // => 42

// Attenzione: se i tipi sono INCOMPATIBILI la proprieta' diventa `never`.
type ConStringa = { campo: string };
type ConNumero2 = { campo: number };
type IncrocioAssurdo = ConStringa & ConNumero2;
// tipo di campo: string & number = never (nessun valore lo soddisfa)
// ERRORE TS: impossibile assegnare qualcosa a 'campo: never'.
// const inc2: IncrocioAssurdo = { campo: "x" };
declare const incAssurdo: IncrocioAssurdo; // solo per mostrare il tipo, mai istanziabile
console.log(typeof incAssurdo); // (mai eseguito con un valore reale)

// ============================================================================
// 6. INTERSECTION CON INTERFACE (interface + type mescolabili)
// ============================================================================

interface HaTurno {
  acronimo: "P4" | "P2" | "STD"; // P4 = 4 timbrature, P2 = 2 timbrature
  ingresso: string;              // "08:00"
  uscita: string;                // "17:00"
}

interface HaPausa {
  uscitaPranzo: string;  // "12:00"
  rientroPranzo: string; // "13:00"
}

// Un turno P4 = ha turno E ha pausa pranzo.
type TurnoP4 = HaTurno & HaPausa;

const turnoP4: TurnoP4 = {
  acronimo: "P4",
  ingresso: "08:00",
  uscita: "17:00",
  uscitaPranzo: "12:00",
  rientroPranzo: "13:00",
};
console.log(turnoP4.acronimo, turnoP4.uscitaPranzo); // => "P4" "12:00"

// ============================================================================
// 7. INTERSECTION GENERICA: helper riusabili
// ============================================================================

// Helper generico: "aggiungi id numerico a qualunque tipo T".
type ConId2<T> = T & { id: number };

type RepartoDati = { nome: string; sigla: string; attivo: boolean };
type RepartoConId = ConId2<RepartoDati>;

const rep1: RepartoConId = {
  id: 5,
  nome: "Ufficio_Informatico",
  sigla: "UI",
  attivo: true,
};
console.log(`${rep1.sigla} -> ${rep1.id}`); // => "UI -> 5"

// Helper generico: unisce due tipi arbitrari (merge type-safe).
function unisci<T extends object, U extends object>(a: T, u: U): T & U {
  return { ...a, ...u };
}

const anagrafica = { nome: "Luca", cognome: "Bianchi" };
const lavoro = { codiceBadge: "CO-003", ruolo: "Admin" as Ruolo };
const dipMerge = unisci(anagrafica, lavoro);
// tipo inferito: { nome: string; cognome: string } & { codiceBadge: string; ruolo: Ruolo }
console.log(dipMerge.codiceBadge, dipMerge.nome); // => "CO-003" "Luca"

// ============================================================================
// 8. COMPORRE DTO DI RISPOSTA API (caso pratico ERP)
// ============================================================================

// Mattone comune a tutte le risposte paginate.
type ConPaginazione = {
  totale: number;
  pagina: number;
  perPagina: number;
};

// Mattone: wrapper con la lista dati.
type ConLista<T> = { dati: T[] };

// DTO risposta = lista + paginazione, composta via intersection generica.
type RispostaPaginata<T> = ConLista<T> & ConPaginazione;

const rispostaDip: RispostaPaginata<DipendenteDTO> = {
  dati: [dip1],
  totale: 1,
  pagina: 1,
  perPagina: 20,
};
console.log(rispostaDip.dati.length, rispostaDip.totale); // => 1 1

// ============================================================================
// 9. STATO RICHIESTA: comporre metadati + payload
// ============================================================================

type StatoRichiesta = "In attesa" | "Approvato" | "Rifiutato";

// Payload della richiesta permesso.
type RichiestaPayload = {
  dipendenteId: number;
  dal: string;   // "AAAA-MM-GG"
  al: string;
  motivo: string;
};

// Metadati di workflow.
type WorkflowMeta = {
  stato: StatoRichiesta;
  approvatoDa: number | null;
};

// DTO completo = payload + metadati + audit.
type RichiestaPermessoDTO = RichiestaPayload & WorkflowMeta & ConTimestamp;

const richiesta1: RichiestaPermessoDTO = {
  dipendenteId: 1,
  dal: "2026-07-10",
  al: "2026-07-12",
  motivo: "Ferie",
  stato: "In attesa",
  approvatoDa: null,
  creatoIl: "2026-07-08T09:15",
  aggiornatoIl: "2026-07-08T09:15",
};
console.log(richiesta1.stato); // => "In attesa"

// ============================================================================
// 10. INTERSECTION E FUNZIONI (parametri che devono soddisfare piu' contratti)
// ============================================================================

// La funzione accetta qualunque cosa sia SIA identificabile SIA con badge.
function descriviBadge(x: ConId & ConCodiceBadge): string {
  return `#${x.id} badge ${x.codiceBadge}`;
}

// dip1 soddisfa entrambi i mattoni (ha id e codiceBadge) -> compatibile.
console.log(descriviBadge(dip1)); // => "#1 badge UP-001"

// ============================================================================
// 11. NARROWING: & come intersezione di vincoli letterali
// ============================================================================

// Union larga.
type Colore = "rosso" | "verde" | "blu";
// Altra union.
type Primario = "rosso" | "blu" | "giallo";
// L'intersection tiene solo i letterali comuni a ENTRAMBE.
type ColorePrimario = Colore & Primario;
// tipo: "rosso" | "blu"
const c1: ColorePrimario = "rosso"; // ok
// ERRORE TS: "verde" non e' in Primario, "giallo" non e' in Colore.
// const c2: ColorePrimario = "verde";
console.log(c1); // => "rosso"

// ============================================================================
// 12. ESEMPIO BROWSER (non eseguito a runtime, ma tipizzato)
// ============================================================================

// Esempio browser: comporre un tipo che e' SIA un HTMLElement SIA con dati custom.
type ElementoConDati = HTMLElement & { dataBadge: string };

// Racchiuso in funzione NON chiamata: compila ma non gira in ambiente non-DOM.
function evidenziaBadge(): void {
  // Esempio browser
  const el = document.getElementById("badge") as ElementoConDati | null;
  if (el) {
    el.dataBadge = "UP-001";
    el.style.fontWeight = "bold";
    console.log(el.dataBadge); // => "UP-001"
  }
}
void evidenziaBadge; // referenziata ma non invocata

// ============================================================================
// 13. NAMESPACE per isolare esempi con nomi ripetuti
// ============================================================================

namespace EsempiIntersection {
  // Qui posso riusare nomi "puliti" senza collidere col resto del file.
  type Base = { id: number };
  type Extra = { nota: string };
  export type Completo = Base & Extra;

  export const esempio: Completo = { id: 99, nota: "composto in namespace" };
}
console.log(EsempiIntersection.esempio.nota); // => "composto in namespace"

// ============================================================================
// 14. EXPORT (simboli definiti in QUESTO file, per uso come modulo)
// ============================================================================

export type { DipendenteDTO, RichiestaPermessoDTO, RispostaPaginata };
export { unisci };

/*
 * ============================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================================
 * - `A & B` (intersection) = tipo che soddisfa A E B insieme (logica AND).
 * - Contrasto: `A | B` (union) = soddisfa A OPPURE B (logica OR).
 * - Uso principale: COMPORRE DTO da mattoni riusabili (ConId & ConTimestamp & ...).
 * - Estendere un tipo esistente: `Base & { campoNuovo: ... }` senza modificarlo.
 * - Proprieta' con stesso nome: i tipi si intersecano (number & number = number).
 * - Tipi incompatibili sulla stessa prop -> `never` (es. string & number).
 * - interface e type si mescolano liberamente in un'intersection.
 * - Intersection generica: `type ConId<T> = T & { id: number }`.
 * - Merge type-safe a runtime: `function unisci<T,U>(a,b): T & U` con spread.
 * - Su union di literal: `Colore & Primario` = solo i letterali COMUNI.
 * - Esempi DOM: prefissati "// Esempio browser", chiusi in funzioni non chiamate.
 * - Errori mostrati sempre commentati con "// ERRORE TS: ..." per far compilare il file.
 * ============================================================================
 */
