/**
 * File 103 - TS with Prisma types
 *
 * Livello ECOSYSTEM/EXTRA: come Prisma genera i tipi TypeScript dal
 * modello dati e come simularli senza dipendenze npm. Vediamo il modello
 * Dipendente, i tipi derivati da select/include (mock con interfacce),
 * il pattern naive-UTC per DateTime e i tipi payload parametrici.
 * Dominio ERP Polyuretech (Dipendente, Timbratura, Reparto, Turno).
 */

// =============================================================================
// 1. IL CONCETTO: TIPI GENERATI DA PRISMA
// =============================================================================
//
// Prisma, dato uno schema.prisma, genera un client tipizzato: per ogni
// model crea un tipo TypeScript che rispecchia le colonne del DB.
// NON usiamo la libreria: qui RIPRODUCIAMO il pattern con interfacce mock,
// cosi' il file compila senza import npm. L'idea da estrarre e' che i tipi
// del DB diventano tipi statici verificati da tsc a compile-time.
//
// schema.prisma (a solo scopo illustrativo, NON e' codice TS):
//
//   model Dipendente {
//     id        Int         @id @default(autoincrement())
//     nome      String
//     badge     String      @unique   // formato "UP-001"
//     ruolo     Ruolo
//     repartoId Int
//     reparto   Reparto     @relation(fields: [repartoId], references: [id])
//     timbrature Timbratura[]
//   }

// Ruolo: in Prisma sarebbe un enum del DB. Qui union di string literal.
export type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Turno usato nei reparti produzione.
export type Turno = "P4" | "P2" | "STD";

// -----------------------------------------------------------------------------
// Tipo "base" generato: il model Dipendente cosi' com'e' sul DB (scalari + FK).
// In Prisma reale questo e' il tipo esportato con il nome del model.
// -----------------------------------------------------------------------------
export interface Dipendente {
  id: number;
  nome: string;
  badge: string; // pattern /^UP-\d{3}$/, es. "UP-001"
  ruolo: Ruolo;
  repartoId: number; // FK verso Reparto
}

export interface Reparto {
  id: number;
  nome: string;
  turno: Turno;
}

// Timbratura: orari NAIVE-UTC come stringa "HH:MM" (vedi sezione 4).
export interface Timbratura {
  id: number;
  dipendenteId: number;
  data: string; // "YYYY-MM-DD"
  entrata: string; // "HH:MM" naive-UTC, pattern /^\d{2}:\d{2}$/
  uscita: string | null; // null se il dipendente non ha ancora timbrato l'uscita
}

// Esempio di record base (nessuna relazione caricata):
const dipBase: Dipendente = {
  id: 1,
  nome: "Mario Rossi",
  badge: "UP-001",
  ruolo: "Operatore",
  repartoId: 7,
};
// dipBase.reparto  // ERRORE TS: la relazione NON esiste sul tipo base
// tipo di dipBase.ruolo: Ruolo (union), non semplice string

// =============================================================================
// 2. SIMULARE select: RESTRINGERE I CAMPI (Pick)
// =============================================================================
//
// In Prisma: prisma.dipendente.findMany({ select: { id: true, nome: true } })
// restituisce oggetti con SOLO i campi selezionati. Il tipo derivato e'
// esattamente un Pick sul model. Riproduciamo il pattern con Pick<>.

// Equivalente di select: { id: true, nome: true, badge: true }
export type DipendenteAnagrafica = Pick<Dipendente, "id" | "nome" | "badge">;

const anagrafica: DipendenteAnagrafica = {
  id: 1,
  nome: "Mario Rossi",
  badge: "UP-001",
};
// anagrafica.ruolo  // ERRORE TS: 'ruolo' non e' nel select -> non esiste nel tipo

// Helper generico che riproduce la firma di un "select" tipizzato.
// Restituisce un tipo che ha solo le chiavi richieste, come farebbe Prisma.
export type Select<T, K extends keyof T> = Pick<T, K>;

type SoloBadge = Select<Dipendente, "badge">; // { badge: string }
const b: SoloBadge = { badge: "UP-042" };
// tipo di b: { badge: string }

// =============================================================================
// 3. SIMULARE include: CARICARE LE RELAZIONI
// =============================================================================
//
// In Prisma: findMany({ include: { reparto: true } }) aggiunge la proprieta'
// 'reparto' con il tipo del model correlato. Il tipo risultante e' il model
// base PIU' le relazioni incluse. Usiamo un intersection type (&).

// Dipendente con il reparto caricato (include: { reparto: true }).
export type DipendenteConReparto = Dipendente & { reparto: Reparto };

const dipConReparto: DipendenteConReparto = {
  id: 1,
  nome: "Mario Rossi",
  badge: "UP-001",
  ruolo: "Operatore",
  repartoId: 7,
  reparto: { id: 7, nome: "Stampaggio", turno: "P4" },
};
// tipo di dipConReparto.reparto.turno: Turno
// dipConReparto.reparto.nome // tipo: string  => "Stampaggio"

// include: { timbrature: true } -> array della relazione uno-a-molti.
export type DipendenteConTimbrature = Dipendente & {
  timbrature: Timbratura[];
};

const dipTimb: DipendenteConTimbrature = {
  id: 1,
  nome: "Mario Rossi",
  badge: "UP-001",
  ruolo: "Operatore",
  repartoId: 7,
  timbrature: [
    { id: 100, dipendenteId: 1, data: "2026-07-08", entrata: "08:00", uscita: "17:00" },
    { id: 101, dipendenteId: 1, data: "2026-07-09", entrata: "08:05", uscita: null },
  ],
};
// tipo di dipTimb.timbrature: Timbratura[]
// dipTimb.timbrature[0].uscita // tipo: string | null

// include annidato: reparto + timbrature insieme.
export type DipendenteCompleto = Dipendente & {
  reparto: Reparto;
  timbrature: Timbratura[];
};

// -----------------------------------------------------------------------------
// Helper generico "Include": aggiunge chiavi-relazione al model base.
// R e' una mappa { nomeRelazione: TipoRelazione }.
// -----------------------------------------------------------------------------
export type Include<T, R extends object> = T & R;

type DipConReparto2 = Include<Dipendente, { reparto: Reparto }>;
const d2: DipConReparto2 = { ...dipBase, reparto: { id: 7, nome: "Stampaggio", turno: "P4" } };
// tipo di d2.reparto: Reparto

// =============================================================================
// 4. NAIVE-UTC DateTime: IL PATTERN ORARI
// =============================================================================
//
// Regola ERP Polyuretech: gli orari sono NAIVE-UTC. Il server gira in UTC,
// quindi salvare 'new Date()' introdurrebbe uno shift di fuso. La convenzione
// e' salvare l'orario "come lo vede l'operatore" in formato stringa "HH:MM"
// (naive: senza offset, senza timezone). tsc puo' aiutarci con branded types
// per non confondere una stringa qualsiasi con un orario valido.

// Branded type: una stringa che rappresenta un orario "HH:MM" validato.
// Il campo __brand non esiste a runtime, serve solo a tsc per distinguere.
export type OrarioNaive = string & { readonly __brand: "OrarioNaive" };

const RE_ORARIO = /^\d{2}:\d{2}$/;
const RE_BADGE = /^UP-\d{3}$/;

// Costruttore/validatore: unico punto che "conia" un OrarioNaive.
export function toOrarioNaive(raw: string): OrarioNaive {
  if (!RE_ORARIO.test(raw)) {
    throw new Error(`Orario non valido (atteso HH:MM): ${raw}`);
  }
  return raw as OrarioNaive; // cast lecito solo dopo la validazione
}

const ingresso: OrarioNaive = toOrarioNaive("08:30");
// tipo di ingresso: OrarioNaive
// const ko: OrarioNaive = "08:30"; // ERRORE TS: string non e' assegnabile a OrarioNaive senza brand

// Funzione che accetta solo orari validati: nessuno puo' passare una string grezza.
export function differenzaMinuti(a: OrarioNaive, b: OrarioNaive): number {
  const [ha, ma] = a.split(":").map(Number);
  const [hb, mb] = b.split(":").map(Number);
  return hb * 60 + mb - (ha * 60 + ma);
}

const minuti = differenzaMinuti(toOrarioNaive("08:00"), toOrarioNaive("17:00"));
// => 540
// differenzaMinuti("08:00", "17:00"); // ERRORE TS: string non e' OrarioNaive

// Perche' NON new Date(): il server e' UTC, quindi
//   new Date("2026-07-08T08:00")  // interpretato come locale del server -> shift
// mentre la stringa "08:00" resta stabile. Da qui la scelta naive-UTC.

// Variante del model Timbratura che usa il branded type invece di string.
export interface TimbraturaTipizzata {
  id: number;
  dipendenteId: number;
  data: string; // "YYYY-MM-DD"
  entrata: OrarioNaive;
  uscita: OrarioNaive | null;
}

const t: TimbraturaTipizzata = {
  id: 200,
  dipendenteId: 1,
  data: "2026-07-08",
  entrata: toOrarioNaive("08:00"),
  uscita: null,
};
// tipo di t.entrata: OrarioNaive

// Stesso pattern per il badge "UP-001".
export type Badge = string & { readonly __brand: "Badge" };
export function toBadge(raw: string): Badge {
  if (!RE_BADGE.test(raw)) throw new Error(`Badge non valido (atteso UP-000): ${raw}`);
  return raw as Badge;
}
const badgeOk = toBadge("UP-007");
// tipo di badgeOk: Badge
// toBadge("X-1"); // a runtime lancia; a compile-time il tipo e' comunque Badge

// =============================================================================
// 5. IL PATTERN GetPayload: TIPI PARAMETRICI DA UN "ARG"
// =============================================================================
//
// Prisma espone tipi come Prisma.DipendenteGetPayload<{ include: ... }> che,
// dato un oggetto-argomento, calcolano il tipo esatto del risultato. Ne diamo
// una versione mock: partendo dal model, applichiamo select e/o include.

// Descrittore di una query: quali campi selezionare (K) e quali relazioni (R).
export interface QueryArgs<T, K extends keyof T = keyof T, R extends object = {}> {
  select?: readonly K[];
  include?: R;
}

// GetPayload: se c'e' select restringe con Pick, poi aggiunge le relazioni R.
// Nota: e' una semplificazione didattica del comportamento reale di Prisma.
export type GetPayload<
  T,
  K extends keyof T = keyof T,
  R extends object = {}
> = Pick<T, K> & R;

// Uso 1: solo select
type P1 = GetPayload<Dipendente, "id" | "nome">;
const p1: P1 = { id: 1, nome: "Mario Rossi" };
// tipo di p1: { id: number; nome: string }

// Uso 2: select + include del reparto
type P2 = GetPayload<Dipendente, "id" | "nome", { reparto: Reparto }>;
const p2: P2 = { id: 1, nome: "Mario Rossi", reparto: { id: 7, nome: "Stampaggio", turno: "P4" } };
// tipo di p2.reparto.turno: Turno

// Uso 3: model completo + timbrature (K default = tutte le chiavi)
type P3 = GetPayload<Dipendente, keyof Dipendente, { timbrature: Timbratura[] }>;
const p3: P3 = { ...dipBase, timbrature: [] };
// tipo di p3.timbrature: Timbratura[]

// =============================================================================
// 6. TIPI PER CREATE / UPDATE (input types)
// =============================================================================
//
// Prisma genera anche tipi di input: DipendenteCreateInput (senza id, che e'
// autoincrement) e DipendenteUpdateInput (tutti opzionali). Riproduciamoli con
// utility type Omit e Partial.

// Create: manca 'id' perche' generato dal DB (@default(autoincrement())).
export type DipendenteCreateInput = Omit<Dipendente, "id">;

const nuovo: DipendenteCreateInput = {
  nome: "Lucia Bianchi",
  badge: "UP-002",
  ruolo: "Admin",
  repartoId: 3,
};
// nuovo.id // ERRORE TS: 'id' non esiste su DipendenteCreateInput

// Update: ogni campo e' opzionale (aggiorni solo cio' che cambia).
// Manteniamo 'id' obbligatorio come chiave di ricerca (pattern WHERE).
export type DipendenteUpdateInput = { id: number } & Partial<Omit<Dipendente, "id">>;

const patch: DipendenteUpdateInput = { id: 1, ruolo: "SuperAdmin" };
// tipo di patch: { id: number; nome?: string; badge?: string; ruolo?: Ruolo; repartoId?: number }

// Funzione repository mock che consuma i tipi input.
export function creaDipendente(input: DipendenteCreateInput): Dipendente {
  return { id: Math.floor(Math.random() * 1000), ...input };
}
const creato = creaDipendente(nuovo);
// tipo di creato: Dipendente

// =============================================================================
// 7. WHERE type: FILTRI TIPIZZATI (Partial + operatori)
// =============================================================================
//
// findMany({ where: { ruolo: "Operatore" } }): il where accetta i campi del
// model in forma parziale. Prisma aggiunge operatori (in, contains...). Qui una
// versione minimale con Partial piu' un operatore 'in'.

export type WhereDipendente = Partial<{
  id: number;
  ruolo: Ruolo | { in: Ruolo[] };
  repartoId: number;
}>;

const w1: WhereDipendente = { ruolo: "Operatore" };
const w2: WhereDipendente = { ruolo: { in: ["Admin", "SuperAdmin"] } };
// const w3: WhereDipendente = { ruolo: "Capo" }; // ERRORE TS: "Capo" non e' un Ruolo

// findMany mock: filtra un array in memoria rispettando WhereDipendente.
export function findMany(rows: readonly Dipendente[], where: WhereDipendente): Dipendente[] {
  return rows.filter((r) => {
    if (where.id !== undefined && r.id !== where.id) return false;
    if (where.repartoId !== undefined && r.repartoId !== where.repartoId) return false;
    if (where.ruolo !== undefined) {
      if (typeof where.ruolo === "string") {
        if (r.ruolo !== where.ruolo) return false;
      } else {
        if (!where.ruolo.in.includes(r.ruolo)) return false;
      }
    }
    return true;
  });
}

const risultati = findMany([dipBase], { ruolo: { in: ["Operatore"] } });
// tipo di risultati: Dipendente[]

// =============================================================================
// 8. ESEMPIO INTEGRATO: un "client" mock end-to-end
// =============================================================================
//
// Mettiamo insieme select, include e GetPayload in un finto client, per
// mostrare come i tipi fluiscono dalla query al risultato. NON usa Prisma:
// e' tutto simulato con le interfacce definite sopra.

const DB_DIPENDENTI: Dipendente[] = [
  { id: 1, nome: "Mario Rossi", badge: "UP-001", ruolo: "Operatore", repartoId: 7 },
  { id: 2, nome: "Lucia Bianchi", badge: "UP-002", ruolo: "Admin", repartoId: 3 },
];
const DB_REPARTI: Reparto[] = [
  { id: 3, nome: "Qualita'", turno: "STD" },
  { id: 7, nome: "Stampaggio", turno: "P4" },
];

// Simula findMany con include: { reparto: true } -> tipo DipendenteConReparto[].
export function findConReparto(): DipendenteConReparto[] {
  return DB_DIPENDENTI.map((d) => {
    const reparto = DB_REPARTI.find((r) => r.id === d.repartoId);
    if (!reparto) throw new Error(`Reparto ${d.repartoId} mancante`);
    return { ...d, reparto };
  });
}

const conReparto = findConReparto();
// tipo di conReparto[0].reparto.turno: Turno
// conReparto[0].reparto.nome // => "Stampaggio"

// Simula select: { badge: true } -> tipo DipendenteAnagrafica[] (solo id/nome/badge).
export function selectAnagrafica(): DipendenteAnagrafica[] {
  return DB_DIPENDENTI.map(({ id, nome, badge }) => ({ id, nome, badge }));
}
const soloAnagrafiche = selectAnagrafica();
// tipo di soloAnagrafiche[0]: DipendenteAnagrafica
// soloAnagrafiche[0].ruolo // ERRORE TS: 'ruolo' non selezionato

// =============================================================================
// 9. NOTE SU DECORATOR (solo commento: experimentalDecorators = FALSE)
// =============================================================================
//
// Alcuni ORM (TypeORM, non Prisma) usano decorator sui model. Con
// experimentalDecorators=FALSE la sintassi @decorator NON compila, quindi la
// mostriamo SOLO come commento illustrativo:
//
//   // @Entity()
//   // class DipendenteEntity {
//   //   @PrimaryGeneratedColumn() id!: number;
//   //   @Column() nome!: string;
//   // }
//
// Prisma NON usa decorator: genera i tipi da schema.prisma, come simulato qui.

// Export centralizzati dei tipi principali del file.
export type {
  DipendenteConReparto as DipendenteConRepartoT,
  DipendenteCompleto as DipendenteCompletoT,
};

// =============================================================================
// RIEPILOGO COMANDI / CONCETTI
// =============================================================================
// - Prisma genera tipi TS dal model: qui simulati con interfacce mock (no npm).
// - Model base: interface con scalari + FK (repartoId), senza relazioni.
// - select  -> Pick<T, K> (restringe i campi del risultato).
// - include -> T & { relazione: TipoRelazione } (aggiunge relazioni; array per 1-N).
// - Include<T,R> / Select<T,K>: helper generici che replicano il pattern.
// - GetPayload<T,K,R> = Pick<T,K> & R: tipo del risultato da un arg di query.
// - CreateInput -> Omit<T,"id"> (id autoincrement dal DB).
// - UpdateInput -> { id } & Partial<Omit<T,"id">> (campi opzionali).
// - WhereDipendente -> Partial<...> + operatore { in: [...] } tipizzato.
// - Naive-UTC: orari "HH:MM" come stringa, MAI new Date() (server UTC -> shift).
// - Branded types: OrarioNaive / Badge = string & { __brand } + validatore.
// - RE_ORARIO /^\d{2}:\d{2}$/, RE_BADGE /^UP-\d{3}$/.
// - experimentalDecorators=FALSE: @decorator solo nei commenti (Prisma non li usa).
// - Ruolo: "SuperAdmin"|"Admin"|"Operatore"|"QrDisplay"; Turno: "P4"|"P2"|"STD".
