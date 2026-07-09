/**
 * File 059 - Working with Date (naive-UTC, spunto ERP)
 * Corso TypeScript - livello INTERMEDIATE.
 * Argomento: Date object, ISO string, timestamp e il PROBLEMA del fuso orario
 * quando il server gira in UTC ma le timbrature vanno salvate come orari "locali".
 * Vediamo il pattern naive-UTC, la funzione nowRomeNaiveUTC, formatHHMM e la
 * validazione con regex /^\d{2}:\d{2}$/. Contesto ispirato all'ERP Polyuretech.
 * NOTA: nessuna libreria esterna (niente date-fns/luxon): solo Date nativo.
 */

// ============================================================
// 1) Date: creazione e rappresentazioni base
// ============================================================

// Creare una Date "adesso": rappresenta un istante nel tempo (UTC internamente).
const adesso: Date = new Date();
// tipo: Date

// Da timestamp in millisecondi (epoch): numero di ms dal 1970-01-01T00:00:00Z.
const dallEpoch: Date = new Date(0);
// => 1970-01-01T00:00:00.000Z

// Da stringa ISO 8601. La "Z" finale indica UTC (Zulu time).
const daISO: Date = new Date("2026-07-08T09:30:00Z");

// getTime() restituisce il timestamp in ms: sempre number.
const ts: number = adesso.getTime();
// tipo: number  (es: 1783501800000)

// Date.now() e' uno static method: number, non serve istanziare.
const tsOra: number = Date.now();
// tipo: number

// toISOString() serializza SEMPRE in UTC con la Z finale.
const iso: string = daISO.toISOString();
// => "2026-07-08T09:30:00.000Z"

// ============================================================
// 2) getX vs getUTCX: il cuore del problema fuso orario
// ============================================================

// I metodi getHours/getDate leggono nel fuso LOCALE del runtime (dipende da TZ).
// I metodi getUTCHours/getUTCDate leggono in UTC, indipendenti dal fuso.
// Su un server che gira in UTC i due coincidono; sul PC di uno sviluppatore no.

function differenzaLocaleVsUtc(d: Date): { locale: number; utc: number } {
  return {
    locale: d.getHours(), // dipende da process.env.TZ / OS
    utc: d.getUTCHours(),
  };
}
// Se il server e' UTC: locale === utc. Sul portatile a Roma d'estate: locale = utc + 2.

// ============================================================
// 3) Il PROBLEMA: server UTC e timbrature
// ============================================================

// Scenario ERP: un operatore timbra alle 08:00 ora di Roma.
// Se salviamo new Date() e il server e' in UTC, otteniamo le 06:00 (estate, +2).
// Rileggendo l'orario "grezzo" vedremmo 06:00 -> SBAGLIATO per il cartellino.
//
// Soluzione adottata dall'ERP: salvare orari "naive-UTC", cioe' prendere l'ora
// di Roma e scriverla come se fosse UTC. Cosi' la stringa "HH:MM" e' gia' quella
// che l'utente si aspetta di vedere, senza conversioni al momento della lettura.

// ============================================================
// 4) Pattern nowRomeNaiveUTC
// ============================================================

// Offset di Roma: +1 in inverno (CET), +2 in estate (CEST).
// Qui NON gestiamo la DST in modo perfetto (servirebbe Intl); mostriamo il pattern.
// In produzione l'offset si ricava con Intl.DateTimeFormat, vedi funzione dopo.

/**
 * Restituisce una Date il cui "wall clock UTC" coincide con l'ora di Roma.
 * Cioe': se a Roma sono le 08:00, la Date avra' getUTCHours() === 8.
 */
function nowRomeNaiveUTC(offsetOre: number): Date {
  const ora = new Date();
  // Spostiamo l'istante di offset ore in avanti, poi lo leggeremo come UTC.
  return new Date(ora.getTime() + offsetOre * 60 * 60 * 1000);
}
// Uso: const d = nowRomeNaiveUTC(2); d.toISOString() mostra l'ora di Roma con la Z.

// Versione che ricava l'offset di Roma in modo affidabile tramite Intl.
// Intl.DateTimeFormat con timeZone "Europe/Rome" gestisce la DST automaticamente.
function offsetRomaOre(d: Date = new Date()): number {
  // Formattiamo lo stesso istante in UTC e a Roma, poi confrontiamo le ore.
  const fmt = (tz: string): number => {
    const parts = new Intl.DateTimeFormat("it-IT", {
      timeZone: tz,
      hour: "2-digit",
      hour12: false,
    }).format(d);
    return Number(parts);
  };
  // Attenzione: questo semplice confronto ignora il cambio di giorno; e' didattico.
  const diff = fmt("Europe/Rome") - fmt("UTC");
  return diff;
}
// offsetRomaOre() => 2 in estate, 1 in inverno (approssimazione didattica).

// ============================================================
// 5) formatHHMM: da Date a stringa "HH:MM"
// ============================================================

// padStart garantisce sempre 2 cifre: 8 -> "08".
function formatHHMM(d: Date): string {
  const hh = d.getUTCHours().toString().padStart(2, "0");
  const mm = d.getUTCMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}
// formatHHMM(new Date("2026-07-08T08:05:00Z")) => "08:05"

// Usiamo getUTCHours perche' lavoriamo con date naive-UTC: cosi' l'output
// e' stabile qualunque sia il fuso del server. Con getHours() sarebbe fragile.

// Esempio combinato: orario di timbratura pronto per il DB.
function orarioTimbraturaRoma(offset: number): string {
  return formatHHMM(nowRomeNaiveUTC(offset));
}
// orarioTimbraturaRoma(2) => es "08:00" se a Roma sono le 08:00

// ============================================================
// 6) Validazione orario con regex /^\d{2}:\d{2}$/
// ============================================================

// La regex accetta esattamente due cifre, due punti, due cifre.
const RE_HHMM = /^\d{2}:\d{2}$/;

// Type guard: restringe string a un branded type OrarioHHMM (vedi sotto).
type OrarioHHMM = string & { readonly __brand: "OrarioHHMM" };

function isOrarioHHMM(s: string): s is OrarioHHMM {
  if (!RE_HHMM.test(s)) return false;
  // La regex non basta: "99:99" passa il formato ma non e' un'ora valida.
  const [h, m] = s.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}
// isOrarioHHMM("08:30") => true
// isOrarioHHMM("8:30")  => false  (manca lo zero iniziale)
// isOrarioHHMM("25:00") => false  (ora fuori range)

// Uso del type guard per il narrowing:
function stampaOrario(s: string): string {
  if (isOrarioHHMM(s)) {
    // qui s ha tipo OrarioHHMM
    return `Orario valido: ${s}`;
  }
  return "Formato non valido (atteso HH:MM)";
}

// Il branded type impedisce di passare una stringa qualsiasi dove serve un orario.
function creaTimbratura(entrata: OrarioHHMM, uscita: OrarioHHMM): string {
  return `${entrata} -> ${uscita}`;
}
// ERRORE TS: creaTimbratura("08:00", "17:00") -> Argument of type 'string' is
//            not assignable to parameter of type 'OrarioHHMM'.
// Va prima validato: if (isOrarioHHMM(a) && isOrarioHHMM(b)) creaTimbratura(a, b);

// ============================================================
// 7) Parsing inverso: da "HH:MM" a minuti / a Date naive-UTC
// ============================================================

// Converte "HH:MM" nel numero di minuti dall'inizio giornata: utile per calcoli.
function hhmmToMinuti(o: OrarioHHMM): number {
  const [h, m] = o.split(":").map(Number);
  return h * 60 + m;
}
// hhmmToMinuti("08:30" as OrarioHHMM) => 510

// Differenza in minuti tra due orari (durata turno, senza mezzanotte).
function durataMinuti(entrata: OrarioHHMM, uscita: OrarioHHMM): number {
  return hhmmToMinuti(uscita) - hhmmToMinuti(entrata);
}
// durataMinuti("08:00" as OrarioHHMM, "17:00" as OrarioHHMM) => 540 (9 ore)

// Ricostruisce una Date naive-UTC di oggi con l'orario dato.
function hhmmToDateNaiveUTC(o: OrarioHHMM, giorno: Date = new Date()): Date {
  const [h, m] = o.split(":").map(Number);
  const d = new Date(giorno);
  d.setUTCHours(h, m, 0, 0);
  return d;
}
// La Date risultante, letta con formatHHMM, ritorna lo stesso "HH:MM".

// ============================================================
// 8) Modello dominio ERP (interfacce mock, nessun Prisma reale)
// ============================================================
// NOTA: queste interfacce sono MOCK didattiche, non generate da Prisma.

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Turno = "P4" | "P2" | "STD";

// Badge tipo "UP-001": validato da regex dedicata.
const RE_BADGE = /^UP-\d{3}$/;
type Badge = string & { readonly __brand: "Badge" };

function isBadge(s: string): s is Badge {
  return RE_BADGE.test(s);
}
// isBadge("UP-001") => true ; isBadge("UP-1") => false

interface Dipendente {
  id: number;
  nome: string;
  badge: Badge;
  ruolo: Ruolo;
}

interface Reparto {
  id: number;
  nome: string;
  turno: Turno;
}

interface Timbratura {
  dipendenteId: number;
  entrata: OrarioHHMM; // naive-UTC "HH:MM"
  uscita: OrarioHHMM | null; // null se ancora dentro
  giorno: string; // ISO date "YYYY-MM-DD"
}

// Costruzione di una timbratura valida partendo da input grezzo (string).
function nuovaTimbratura(
  dipendenteId: number,
  entrataRaw: string,
  giornoISO: string
): Timbratura | null {
  if (!isOrarioHHMM(entrataRaw)) return null;
  return { dipendenteId, entrata: entrataRaw, uscita: null, giorno: giornoISO };
}
// nuovaTimbratura(1, "08:00", "2026-07-08") => oggetto Timbratura
// nuovaTimbratura(1, "8:0", "2026-07-08")   => null

// Chiude una timbratura aperta impostando l'uscita.
function chiudiTimbratura(t: Timbratura, uscitaRaw: string): Timbratura | null {
  if (!isOrarioHHMM(uscitaRaw)) return null;
  return { ...t, uscita: uscitaRaw };
}

// ============================================================
// 9) ISO date-only "YYYY-MM-DD" (il "giorno" del cartellino)
// ============================================================

// Estrae la parte data da una Date in UTC: split su "T" della toISOString.
function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}
// toISODate(new Date("2026-07-08T22:00:00Z")) => "2026-07-08"

// Attenzione al bug classico: usando il fuso locale la data puo' slittare.
// Alle 23:30 di Roma (21:30 UTC estate) toISODate resta corretto perche' UTC;
// con getFullYear/getMonth locali rischieresti il giorno sbagliato a mezzanotte.

// ============================================================
// 10) Confronti e ordinamento di date
// ============================================================

// Due Date si confrontano tramite getTime(): il confronto diretto con < / > funziona
// perche' Date viene convertito a number, ma === confronta i riferimenti, non l'istante.
const a1 = new Date("2026-07-08T08:00:00Z");
const a2 = new Date("2026-07-08T08:00:00Z");
// a1 === a2   => false (oggetti diversi)
// a1 < a2     => false ; a1 <= a2 => true (via coercion a number)
const stessoIstante: boolean = a1.getTime() === a2.getTime();
// => true

// Ordinare timbrature per orario di entrata (stringhe "HH:MM" ordinano bene lessicograficamente).
function ordinaPerEntrata(ts: Timbratura[]): Timbratura[] {
  return [...ts].sort((x, y) => x.entrata.localeCompare(y.entrata));
}
// "08:00" < "17:00" anche come stringhe grazie al padding a 2 cifre.

// ============================================================
// 11) Esempio browser (NON eseguito qui)
// ============================================================

// Esempio browser: mostrare l'ora corrente in un elemento della pagina.
// Non viene chiamata: gira solo in ambiente DOM.
function mostraOrarioNelDom(): void {
  const el = document.getElementById("orologio");
  if (el) {
    el.textContent = formatHHMM(nowRomeNaiveUTC(offsetRomaOre()));
  }
}

// ============================================================
// 12) Mini demo (pura, senza side effect DOM)
// ============================================================

function demo(): string[] {
  const out: string[] = [];
  const badgeRaw = "UP-007";
  if (isBadge(badgeRaw)) {
    const dip: Dipendente = { id: 7, nome: "Rossi", badge: badgeRaw, ruolo: "Operatore" };
    out.push(`Dipendente ${dip.nome} badge ${dip.badge}`);
  }
  const t = nuovaTimbratura(7, "08:00", "2026-07-08");
  if (t) {
    const chiusa = chiudiTimbratura(t, "17:30");
    if (chiusa && chiusa.uscita) {
      out.push(`Turno: ${durataMinuti(chiusa.entrata, chiusa.uscita)} minuti`);
      // => "Turno: 570 minuti"
    }
  }
  out.push(`Ora naive-UTC formattata: ${formatHHMM(nowRomeNaiveUTC(2))}`);
  return out;
}
// demo() restituisce un array di stringhe riepilogative.

export {
  nowRomeNaiveUTC,
  offsetRomaOre,
  formatHHMM,
  orarioTimbraturaRoma,
  isOrarioHHMM,
  isBadge,
  hhmmToMinuti,
  durataMinuti,
  hhmmToDateNaiveUTC,
  toISODate,
  nuovaTimbratura,
  chiudiTimbratura,
  ordinaPerEntrata,
  demo,
};

export type { OrarioHHMM, Badge, Ruolo, Turno, Dipendente, Reparto, Timbratura };

/*
 * ============================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================
 * - new Date(), new Date(ms), new Date(isoString): istanti nel tempo (UTC interno).
 * - Date.now() / getTime(): timestamp number in ms dall'epoch.
 * - toISOString(): serializza SEMPRE in UTC con la "Z".
 * - getHours (locale) vs getUTCHours (UTC): fonte dei bug di fuso.
 * - PROBLEMA fuso: server UTC + new Date() -> orario sfasato per il cartellino.
 * - naive-UTC: scrivi l'ora di Roma "come se fosse UTC" -> "HH:MM" gia' giusto.
 * - nowRomeNaiveUTC(offset): sposta l'istante e lo legge in UTC.
 * - offsetRomaOre(): ricava +1/+2 via Intl.DateTimeFormat (gestisce DST).
 * - formatHHMM: getUTCHours/Minutes + padStart(2, "0").
 * - Regex orario: /^\d{2}:\d{2}$/ (formato) + range check 0-23 / 0-59.
 * - Regex badge: /^UP-\d{3}$/.
 * - Branded type (string & { __brand }): impedisce string non validate.
 * - Type guard (s is T): narrowing dopo la validazione.
 * - toISODate: toISOString().split("T")[0] -> "YYYY-MM-DD" stabile in UTC.
 * - Confronto date: usare getTime(); === confronta riferimenti, non l'istante.
 * - Ordinamento "HH:MM": localeCompare va bene grazie al padding a 2 cifre.
 */
