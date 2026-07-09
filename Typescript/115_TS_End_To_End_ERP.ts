/**
 * File 115 - Esempi pratici end-to-end ispirati a un gestionale (ERP Polyuretech)
 * Livello: ECOSYSTEM/EXTRA.
 * Questo file mette insieme molti concetti del corso in un mini-dominio ERP:
 * tipi Dipendente/Timbratura/Reparto/Turno, union di ruoli, repository e service,
 * DTO con validazione, calcolo ore in naive-UTC ("HH:MM") e una state machine.
 * Nessuna libreria esterna: eventuali tipi framework sono interfacce mock definite qui.
 */

// ============================================================================
// SEZIONE 1 - Domini di base: literal union, branded id, template literal type
// ============================================================================

// I ruoli sono una union di string literal: type-safe e "chiuso" (exhaustive).
export type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// I turni ammessi in fabbrica: P4 (4 squadre), P2 (2 squadre), STD (giornaliero).
export type Turno = "P4" | "P2" | "STD";

// Template literal type: un badge e' sempre "UP-" seguito da tre cifre.
// Nota: il type descrive la forma, la regex a runtime la verifica davvero.
type Cifra = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type Badge = `UP-${Cifra}${Cifra}${Cifra}`; // es: "UP-001"

// Un orario naive-UTC in formato "HH:MM" (nessun fuso, nessun offset).
// Il template literal e' una approssimazione; la validazione runtime usa la regex.
export type OrarioHHMM = `${number}:${number}`; // es: "08:30"

// Branded types: interi diversi non confondibili anche se sono tutti number.
declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };
export type DipendenteId = Brand<number, "DipendenteId">;
export type RepartoId = Brand<number, "RepartoId">;

// Costruttori dei brand (unico punto in cui si "conia" un id).
export const asDipendenteId = (n: number): DipendenteId => n as DipendenteId;
export const asRepartoId = (n: number): RepartoId => n as RepartoId;

// ERRORE TS: un number normale non e' assegnabile a un branded id.
// const x: DipendenteId = 5; // Type 'number' is not assignable to 'DipendenteId'

// ============================================================================
// SEZIONE 2 - Entita' del dominio: interface e composizione
// ============================================================================

// Reparto: entita' semplice con id branded.
export interface Reparto {
  readonly id: RepartoId;
  nome: string;
  turnoDefault: Turno;
}

// Dipendente: usa Badge (template literal) e Ruolo (union).
export interface Dipendente {
  readonly id: DipendenteId;
  nome: string;
  badge: Badge;
  ruolo: Ruolo;
  repartoId: RepartoId;
  attivo: boolean;
}

// Timbratura: entrata e uscita opzionale (uscita assente = turno in corso).
// Gli orari sono naive-UTC "HH:MM" salvati come stringa.
export interface Timbratura {
  readonly id: number;
  dipendenteId: DipendenteId;
  data: string;            // "YYYY-MM-DD" naive
  entrata: OrarioHHMM;
  uscita?: OrarioHHMM;     // undefined finche' non si esce
}

// ============================================================================
// SEZIONE 3 - Validazione: type guard e regex del dominio
// ============================================================================

// Regex del dominio (le stesse usate lato server dell'ERP reale).
const RE_ORARIO = /^\d{2}:\d{2}$/;   // "HH:MM"
const RE_BADGE = /^UP-\d{3}$/;       // "UP-001"

// Type guard: da string a OrarioHHMM verificando anche i range 00-23 / 00-59.
export function isOrarioHHMM(s: string): s is OrarioHHMM {
  if (!RE_ORARIO.test(s)) return false;
  const [hh, mm] = s.split(":").map(Number);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

// Type guard per il badge.
export function isBadge(s: string): s is Badge {
  return RE_BADGE.test(s);
}

// isRuolo: narrowing da string generica alla union chiusa.
const RUOLI: readonly Ruolo[] = ["SuperAdmin", "Admin", "Operatore", "QrDisplay"];
export function isRuolo(s: string): s is Ruolo {
  return (RUOLI as readonly string[]).includes(s);
}

// Esempio d'uso dei guard:
const grezzo = "08:30";
if (isOrarioHHMM(grezzo)) {
  // qui grezzo ha tipo OrarioHHMM, non piu' string
  const _o: OrarioHHMM = grezzo; // ok
  void _o;
}

// ============================================================================
// SEZIONE 4 - Calcolo ore naive-UTC (nessun new Date, tutto su "HH:MM")
// ============================================================================

// Converte "HH:MM" in minuti dall'inizio giornata. Naive: niente fuso.
export function hhmmToMinuti(o: OrarioHHMM): number {
  const [hh, mm] = o.split(":").map(Number);
  return hh * 60 + mm;
}

// Converte minuti in "HH:MM" con padding. Restituisce una stringa valida.
export function minutiToHHMM(min: number): OrarioHHMM {
  const clamp = ((min % 1440) + 1440) % 1440; // gestisce anche negativi
  const hh = Math.floor(clamp / 60).toString().padStart(2, "0");
  const mm = (clamp % 60).toString().padStart(2, "0");
  return `${hh}:${mm}` as OrarioHHMM;
}

// Durata di una timbratura in minuti. Se manca l'uscita, ritorna null.
// Gestisce il turno notturno (uscita < entrata => si sconfina a domani).
export function durataMinuti(t: Timbratura): number | null {
  if (t.uscita === undefined) return null;
  const start = hhmmToMinuti(t.entrata);
  let end = hhmmToMinuti(t.uscita);
  if (end < start) end += 1440; // turno che passa mezzanotte
  return end - start;
}

// Esempio:
const _demoT: Timbratura = {
  id: 1,
  dipendenteId: asDipendenteId(1),
  data: "2026-07-08",
  entrata: "22:00",
  uscita: "06:00",
};
// durataMinuti(_demoT) => 480 (8 ore, turno notturno)
void durataMinuti(_demoT);

// ============================================================================
// SEZIONE 5 - DTO e mapper: Pick/Omit/Partial per input/output
// ============================================================================

// DTO di creazione: il client non manda l'id (lo assegna il repository).
export type CreaDipendenteDTO = Omit<Dipendente, "id" | "attivo"> & {
  attivo?: boolean; // default true lato service
};

// DTO di aggiornamento: tutti i campi opzionali tranne l'id (Partial mirato).
export type PatchDipendenteDTO = Partial<Omit<Dipendente, "id">>;

// DTO di sola lettura per la UI: niente campi tecnici, nome reparto risolto.
export type DipendenteView = Readonly<{
  id: number;
  nome: string;
  badge: Badge;
  ruolo: Ruolo;
  reparto: string; // gia' risolto dal service
}>;

// Mapper entity -> view: mostra come si "appiattisce" per la UI.
export function toView(d: Dipendente, nomeReparto: string): DipendenteView {
  return {
    id: d.id,
    nome: d.nome,
    badge: d.badge,
    ruolo: d.ruolo,
    reparto: nomeReparto,
  };
}

// ============================================================================
// SEZIONE 6 - Result type: errori come valori (no throw nel dominio)
// ============================================================================

// Union discriminata per esiti: ok/errore senza eccezioni.
export type Result<T, E = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// Validazione del DTO di creazione: raccoglie il primo errore.
export function validaCreaDipendente(
  dto: CreaDipendenteDTO
): Result<CreaDipendenteDTO> {
  if (dto.nome.trim().length === 0) return err("nome mancante");
  if (!isBadge(dto.badge)) return err(`badge non valido: ${dto.badge}`);
  if (!isRuolo(dto.ruolo)) return err(`ruolo non valido: ${dto.ruolo}`);
  return ok(dto);
}

// ============================================================================
// SEZIONE 7 - Repository generico: interfaccia + implementazione in-memory
// ============================================================================

// Contratto generico di persistenza. K = tipo id, T = entita'.
export interface Repository<T, K> {
  findAll(): T[];
  findById(id: K): T | undefined;
  create(entity: T): T;
  update(id: K, patch: Partial<T>): T | undefined;
  delete(id: K): boolean;
}

// Implementazione in-memory riusabile: incapsula una Map.
export class InMemoryRepository<T, K> implements Repository<T, K> {
  private readonly store = new Map<K, T>();
  constructor(private readonly getId: (e: T) => K) {}

  findAll(): T[] {
    return [...this.store.values()];
  }
  findById(id: K): T | undefined {
    return this.store.get(id);
  }
  create(entity: T): T {
    this.store.set(this.getId(entity), entity);
    return entity;
  }
  update(id: K, patch: Partial<T>): T | undefined {
    const cur = this.store.get(id);
    if (cur === undefined) return undefined;
    const next = { ...cur, ...patch };
    this.store.set(id, next);
    return next;
  }
  delete(id: K): boolean {
    return this.store.delete(id);
  }
}

// Repository concreti tramite alias: tipizzazione senza duplicare codice.
export type DipendenteRepo = Repository<Dipendente, DipendenteId>;
export type RepartoRepo = Repository<Reparto, RepartoId>;

// ============================================================================
// SEZIONE 8 - Service: orchestrazione, generazione id, regole di business
// ============================================================================

// Il service dipende da astrazioni (Repository), non da implementazioni:
// dependency inversion, testabile con qualsiasi repo.
export class DipendenteService {
  private nextId = 1;

  constructor(
    private readonly dipRepo: DipendenteRepo,
    private readonly repRepo: RepartoRepo
  ) {}

  crea(dto: CreaDipendenteDTO): Result<DipendenteView> {
    const check = validaCreaDipendente(dto);
    if (!check.ok) return check; // narrowing: qui e' il ramo errore

    const reparto = this.repRepo.findById(dto.repartoId);
    if (reparto === undefined) return err("reparto inesistente");

    const entity: Dipendente = {
      id: asDipendenteId(this.nextId++),
      nome: dto.nome,
      badge: dto.badge,
      ruolo: dto.ruolo,
      repartoId: dto.repartoId,
      attivo: dto.attivo ?? true,
    };
    this.dipRepo.create(entity);
    return ok(toView(entity, reparto.nome));
  }

  elenco(): DipendenteView[] {
    return this.dipRepo.findAll().map((d) => {
      const r = this.repRepo.findById(d.repartoId);
      return toView(d, r?.nome ?? "(sconosciuto)");
    });
  }
}

// ============================================================================
// SEZIONE 9 - Autorizzazione: mapped type ruolo -> permessi + exhaustive check
// ============================================================================

// Le azioni possibili sul modulo timbrature.
export type Azione = "leggi" | "timbra" | "modifica" | "amministra";

// Record esaustivo: TS obbliga a coprire OGNI ruolo (chiave mancante = errore).
export const PERMESSI: Record<Ruolo, readonly Azione[]> = {
  SuperAdmin: ["leggi", "timbra", "modifica", "amministra"],
  Admin: ["leggi", "timbra", "modifica"],
  Operatore: ["leggi", "timbra"],
  QrDisplay: ["leggi"],
};

export function puo(ruolo: Ruolo, azione: Azione): boolean {
  return PERMESSI[ruolo].includes(azione);
}

// Helper di exhaustiveness: se aggiungo un Ruolo e dimentico un case, TS lo segnala.
function assertNever(x: never): never {
  throw new Error(`caso non gestito: ${String(x)}`);
}

export function etichettaRuolo(r: Ruolo): string {
  switch (r) {
    case "SuperAdmin":
      return "Super amministratore";
    case "Admin":
      return "Amministratore";
    case "Operatore":
      return "Operatore di reparto";
    case "QrDisplay":
      return "Display QR";
    default:
      return assertNever(r); // ERRORE TS se un ruolo resta scoperto
  }
}

// ============================================================================
// SEZIONE 10 - State machine della timbratura (union discriminata di stati)
// ============================================================================

// Stati possibili di un turno di lavoro giornaliero.
export type StatoTimbratura =
  | { readonly tipo: "chiuso" }                                  // nessun turno aperto
  | { readonly tipo: "aperto"; readonly entrata: OrarioHHMM }    // dentro
  | { readonly tipo: "completato"; readonly entrata: OrarioHHMM; readonly uscita: OrarioHHMM; readonly minuti: number };

// Eventi che guidano le transizioni.
export type EventoTimbratura =
  | { readonly tipo: "ENTRA"; readonly ora: OrarioHHMM }
  | { readonly tipo: "ESCI"; readonly ora: OrarioHHMM };

// Reducer puro stato + evento -> Result<nuovo stato>. Transizioni illegali = errore.
export function transizione(
  stato: StatoTimbratura,
  ev: EventoTimbratura
): Result<StatoTimbratura> {
  switch (stato.tipo) {
    case "chiuso":
      if (ev.tipo === "ENTRA") return ok({ tipo: "aperto", entrata: ev.ora });
      return err("non puoi uscire: nessun turno aperto");

    case "aperto":
      if (ev.tipo === "ESCI") {
        const min = durataMinuti({
          id: 0,
          dipendenteId: asDipendenteId(0),
          data: "",
          entrata: stato.entrata,
          uscita: ev.ora,
        });
        return ok({
          tipo: "completato",
          entrata: stato.entrata,
          uscita: ev.ora,
          minuti: min ?? 0,
        });
      }
      return err("turno gia' aperto");

    case "completato":
      return err("turno gia' completato: aprine uno nuovo");

    default:
      return assertNever(stato); // exhaustive sugli stati
  }
}

// ============================================================================
// SEZIONE 11 - Demo end-to-end (funzione non chiamata a runtime lato modulo)
// ============================================================================

// Mette in fila repository -> service -> permessi -> state machine.
export function demoErp(): void {
  const repRepo = new InMemoryRepository<Reparto, RepartoId>((r) => r.id);
  const dipRepo = new InMemoryRepository<Dipendente, DipendenteId>((d) => d.id);

  const reparto: Reparto = {
    id: asRepartoId(10),
    nome: "Stampaggio",
    turnoDefault: "P4",
  };
  repRepo.create(reparto);

  const service = new DipendenteService(dipRepo, repRepo);

  const res = service.crea({
    nome: "Mario Rossi",
    badge: "UP-001",
    ruolo: "Operatore",
    repartoId: asRepartoId(10),
  });

  if (res.ok) {
    // res.value ha tipo DipendenteView (narrowing sul discriminante ok)
    console.log("Creato:", res.value.nome, "in", res.value.reparto);
    console.log("Puo' timbrare?", puo(res.value.ruolo, "timbra")); // true
    console.log("Puo' amministrare?", puo(res.value.ruolo, "amministra")); // false
  } else {
    console.error("Errore:", res.error);
  }

  // State machine: chiuso -> aperto -> completato
  let stato: StatoTimbratura = { tipo: "chiuso" };
  const e1 = transizione(stato, { tipo: "ENTRA", ora: "08:00" });
  if (e1.ok) stato = e1.value;
  const e2 = transizione(stato, { tipo: "ESCI", ora: "17:00" });
  if (e2.ok) stato = e2.value;

  if (stato.tipo === "completato") {
    console.log("Ore lavorate:", minutiToHHMM(stato.minuti)); // "09:00"
  }

  // Transizione illegale: uscire da stato chiuso
  const illegale = transizione({ tipo: "chiuso" }, { tipo: "ESCI", ora: "10:00" });
  console.log(illegale.ok ? "ok" : `bloccato: ${illegale.error}`);
}

// Evita "unused" mantenendo la demo esportata ma non eseguita.
void demoErp;

// ============================================================================
// SEZIONE 12 - Export raggruppati (solo simboli di questo file)
// ============================================================================

export type {
  // tipi ri-esportati esplicitamente come type-only
  Cifra,
};

// Esempio browser (non eseguito): binding di un pulsante timbratura.
// function bindBottone(): void {
//   const btn = document.querySelector<HTMLButtonElement>("#timbra");
//   btn?.addEventListener("click", () => transizione({ tipo: "chiuso" }, { tipo: "ENTRA", ora: "08:00" }));
// }

/*
 * ==========================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ==========================================================================
 * - Literal union (Ruolo/Turno): insiemi chiusi, exhaustive checking.
 * - Template literal type (Badge/OrarioHHMM): forma della stringa a livello di tipo.
 * - Branded types (DipendenteId/RepartoId): interi non confondibili via unique symbol.
 * - Type guard (is...): narrowing da string alla union/forma validata a runtime.
 * - Regex dominio: /^\d{2}:\d{2}$/ orario, /^UP-\d{3}$/ badge.
 * - Calcolo ore naive-UTC: hhmmToMinuti/minutiToHHMM, niente new Date, turno notturno.
 * - DTO: Omit/Partial/Pick/Readonly per input, patch e view.
 * - Result<T,E>: errori come valori, discriminante ok, no throw nel dominio.
 * - Repository<T,K>: interfaccia generica + InMemoryRepository riusabile (Map).
 * - Service: dependency inversion, genera id, applica regole di business.
 * - Record<Ruolo, Azione[]>: mapped type esaustivo per i permessi (puo).
 * - assertNever(x: never): garanzia di exhaustiveness in switch.
 * - State machine: union discriminata di stati + reducer puro con Result.
 * - experimentalDecorators=FALSE: @decorator solo nei commenti, non compila.
 * - Import/export: solo simboli locali (export / export type).
 * ==========================================================================
 */
