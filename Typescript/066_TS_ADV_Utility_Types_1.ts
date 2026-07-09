/**
 * File 066 - ADV Utility Types (1): Partial / Required / Pick / Omit
 * Corso TypeScript avanzato - Modulo Utility Types.
 * Questo file spiega le 4 utility types fondamentali per trasformare gli object
 * type: Partial<T>, Required<T>, Pick<T, K>, Omit<T, K>. Vedremo come usarle
 * nei DTO (create/update) sull'entita' Dipendente dell'ERP Polyuretech, come
 * sono implementate internamente (mapped type + modificatori + key remapping) e
 * quali sono le trappole comuni. Tutto compila con tsc --strict.
 */

// ============================================================================
// SEZIONE 0 - Helper di test a livello di tipo (type-level testing)
// ============================================================================
// Molti esempi qui sotto verificano l'uguaglianza tra due type SENZA runtime.
// Equal<A, B> restituisce true solo se A e B sono lo stesso type (bidirezionale).
// Il trucco dei due conditional identici forza il compilatore a confrontare le
// due firme in modo "esatto" (piu' stretto di A extends B && B extends A).
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect accetta solo il literal true: se il test fallisce, il tipo diventa
// false e la riga NON compila (errore a compile-time = test rosso).
type Expect<T extends true> = T;

// NotEqual utile per asserire che due type sono diversi.
type NotEqual<A, B> = Equal<A, B> extends true ? false : true;

// ============================================================================
// SEZIONE 1 - L'entita' di dominio: Dipendente
// ============================================================================
// Union dei ruoli applicativi (string literal union).
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

// Turni possibili in fabbrica.
type Turno = "P4" | "P2" | "STD";

// Entita' principale. Il badge segue il pattern "UP-001" (regex /^UP-\d{3}$/),
// gli orari sono stringhe naive-UTC "HH:MM" (regex /^\d{2}:\d{2}$/).
interface Dipendente {
  id: number;
  nome: string;
  badge: string;        // es. "UP-001"
  ruolo: Ruolo;
  reparto: string;
  turno: Turno;
  attivo: boolean;
  assunzione: string;   // data ISO "YYYY-MM-DD"
}

// ============================================================================
// SEZIONE 2 - Partial<T>: rende TUTTE le proprieta' opzionali
// ============================================================================
// Utile per un DTO di update dove il client invia solo i campi da modificare.
type DipendenteUpdateDTO = Partial<Dipendente>;
// Equivale (a mano) a: { id?: number; nome?: string; badge?: string; ... }

// Un update legittimo: cambio solo reparto e turno, gli altri campi mancano.
const patch1: DipendenteUpdateDTO = {
  reparto: "Estrusione",
  turno: "P4",
};
// Anche l'oggetto vuoto e' valido, perche' TUTTO e' opzionale.
const patch2: DipendenteUpdateDTO = {};

// Come e' implementato Partial nella lib standard (mapped type):
//   type Partial<T> = { [P in keyof T]?: T[P] };
// - [P in keyof T] itera su ogni chiave di T (mapped type)
// - il "?" e' il modificatore che AGGIUNGE l'opzionalita'
// - T[P] e' l'indexed access: mantiene il type originale di ogni proprieta'
type MioPartial<T> = { [P in keyof T]?: T[P] };

// Test di tipo: la nostra reimplementazione coincide con Partial nativo.
type _P1 = Expect<Equal<MioPartial<Dipendente>, Partial<Dipendente>>>;

// GOTCHA: Partial e' "shallow" (un solo livello). Le proprieta' annidate NON
// diventano opzionali. Serve una DeepPartial ricorsiva (vedi sezione 7).
interface DipendenteAnnidato {
  id: number;
  contatti: { email: string; telefono: string };
}
type ShallowPatch = Partial<DipendenteAnnidato>;
// contatti e' opzionale, ma se lo passi DEVE avere email E telefono:
// ERRORE TS: Property 'telefono' is missing ...
// const p: ShallowPatch = { contatti: { email: "a@b.it" } };

// ============================================================================
// SEZIONE 3 - Required<T>: rende TUTTE le proprieta' obbligatorie
// ============================================================================
// E' l'inverso di Partial: rimuove il "?" da ogni proprieta'.
interface ConfigMacchina {
  id: number;
  soglia?: number;      // opzionale in ingresso
  etichetta?: string;   // opzionale in ingresso
}

// Dopo la normalizzazione vogliamo la certezza che TUTTO sia valorizzato.
type ConfigMacchinaCompleta = Required<ConfigMacchina>;
// => { id: number; soglia: number; etichetta: string }  (niente piu' "?")

// Ora l'oggetto DEVE avere ogni campo, altrimenti errore:
const cfg: ConfigMacchinaCompleta = { id: 1, soglia: 80, etichetta: "linea A" };
// ERRORE TS: Property 'soglia' is missing ...
// const cfgBad: ConfigMacchinaCompleta = { id: 1 };

// Implementazione: il "-?" RIMUOVE il modificatore opzionale.
//   type Required<T> = { [P in keyof T]-?: T[P] };
// Il segno "-" davanti a "?" (mapping modifier) toglie l'opzionalita'.
type MioRequired<T> = { [P in keyof T]-?: T[P] };
type _R1 = Expect<Equal<MioRequired<ConfigMacchina>, Required<ConfigMacchina>>>;

// Nota bene: Required NON rimuove undefined dal type UNION di una proprieta'.
// Rimuove solo il modificatore "?". Se il type e' "number | undefined"
// esplicito, undefined resta.
interface HaUndefinedEsplicito {
  valore: number | undefined;  // opzionalita' NON tramite "?" ma tramite union
}
type StillUndefined = Required<HaUndefinedEsplicito>;
// => { valore: number | undefined }  <-- undefined NON e' sparito!
type _R2 = Expect<Equal<StillUndefined["valore"], number | undefined>>;

// ============================================================================
// SEZIONE 4 - Pick<T, K>: seleziona un SOTTOINSIEME di chiavi
// ============================================================================
// K deve essere un sottoinsieme di keyof T (vincolo K extends keyof T).
// Utile per esporre solo alcuni campi (es. una "card" ridotta del dipendente).
type DipendenteCard = Pick<Dipendente, "id" | "nome" | "badge">;
// => { id: number; nome: string; badge: string }

const card: DipendenteCard = { id: 1, nome: "Rossi", badge: "UP-001" };
// I campi non selezionati NON esistono nel type:
// ERRORE TS: Object literal may only specify known properties ('ruolo' ...)
// const cardBad: DipendenteCard = { id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Admin" };

// Implementazione: mapped type che itera SOLO sulle chiavi K.
//   type Pick<T, K extends keyof T> = { [P in K]: T[P] };
// - il vincolo "K extends keyof T" impedisce di chiedere chiavi inesistenti
// - si itera su K (non su keyof T), quindi si prendono solo quelle proprieta'
type MioPick<T, K extends keyof T> = { [P in K]: T[P] };
type _K1 = Expect<Equal<MioPick<Dipendente, "id" | "nome">, Pick<Dipendente, "id" | "nome">>>;

// GOTCHA: chiave inesistente => errore immediato sul parametro K.
// ERRORE TS: Type '"email"' does not satisfy the constraint 'keyof Dipendente'.
// type Sbagliato = Pick<Dipendente, "email">;

// Pick preserva opzionalita' e readonly delle proprieta' originali (homomorphic).
interface ConReadonly {
  readonly id: number;
  nome?: string;
}
type PickPreserva = Pick<ConReadonly, "id" | "nome">;
// => { readonly id: number; nome?: string }  <-- readonly e "?" mantenuti
type _K2 = Expect<Equal<PickPreserva, ConReadonly>>;

// ============================================================================
// SEZIONE 5 - Omit<T, K>: rimuove un sottoinsieme di chiavi
// ============================================================================
// E' il "complemento" di Pick: tieni tutto TRANNE le chiavi indicate.
// Caso classico: il DTO di CREATE non ha ancora "id" (lo genera il DB).
type DipendenteCreateDTO = Omit<Dipendente, "id">;
// => tutti i campi di Dipendente tranne id

const nuovo: DipendenteCreateDTO = {
  nome: "Bianchi",
  badge: "UP-042",
  ruolo: "Operatore",
  reparto: "Assemblaggio",
  turno: "STD",
  attivo: true,
  assunzione: "2026-01-15",
};

// Si possono rimuovere piu' chiavi con una union.
type DipendenteCreatePubblico = Omit<Dipendente, "id" | "attivo" | "assunzione">;

// Implementazione: Omit e' definito in termini di Pick + Exclude.
//   type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
// - Exclude<keyof T, K> = tutte le chiavi di T che NON sono in K
// - poi Pick tiene solo quelle
// Nota: qui K e' "keyof any" (string | number | symbol), NON "keyof T":
// questo e' voluto e ha un effetto collaterale (vedi GOTCHA sotto).
type MioExclude<U, M> = U extends M ? never : U;
type MioOmit<T, K extends keyof any> = MioPick<T, MioExclude<keyof T, K> & keyof T>;
type _O1 = Expect<Equal<MioOmit<Dipendente, "id">, Omit<Dipendente, "id">>>;

// GOTCHA importante: a differenza di Pick, Omit NON controlla che K sia una
// chiave reale di T (accetta "keyof any"). Quindi un typo passa SILENZIOSO:
type OmitTypo = Omit<Dipendente, "idd">;   // "idd" non esiste ma NON da' errore
// Risultato: non rimuove nulla, OmitTypo == Dipendente.
type _O2 = Expect<Equal<OmitTypo, Dipendente>>;
// SOLUZIONE: usare una variante "strict" di Omit vincolata a keyof T:
type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
// ERRORE TS: Type '"idd"' does not satisfy the constraint 'keyof Dipendente'.
// type OmitTypoStrict = StrictOmit<Dipendente, "idd">;

// ============================================================================
// SEZIONE 6 - Composizione: costruire DTO reali passo dopo passo
// ============================================================================
// Obiettivo ERP: DTO di update dove l'id e' OBBLIGATORIO (serve per la WHERE)
// ma tutti gli altri campi sono opzionali (patch parziale).
// Passo 1: rimuovo id dall'entita' e lo rendo parziale.
type CampiModificabili = Partial<Omit<Dipendente, "id">>;
// Passo 2: reintroduco id come obbligatorio, in intersezione.
type DipendentePatchConId = { id: number } & CampiModificabili;

// Uso reale: id sempre presente, il resto a scelta.
const richiestaPatch: DipendentePatchConId = { id: 7, turno: "P2" };
// ERRORE TS: Property 'id' is missing ...
// const richiestaPatchBad: DipendentePatchConId = { turno: "P2" };

// Variante piu' pulita con una utility generica "SetRequired" fatta in casa:
// prende T e rende obbligatorie SOLO le chiavi K (le altre restano com'erano).
type SetRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
type DipendentePatch2 = SetRequired<Partial<Dipendente>, "id">;
// id obbligatorio, tutto il resto opzionale.
type _C1 = Expect<Equal<DipendentePatch2["id"], number>>;

// Simmetrica: SetOptional rende opzionali solo alcune chiavi.
type SetOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
// Esempio: un Dipendente dove badge e reparto possono ancora mancare in bozza.
type DipendenteBozza = SetOptional<Dipendente, "badge" | "reparto">;
const bozza: DipendenteBozza = {
  id: 0,
  nome: "Verdi",
  ruolo: "Operatore",
  turno: "STD",
  attivo: false,
  assunzione: "2026-07-01",
  // badge e reparto omessi: OK perche' resi opzionali
};

// ============================================================================
// SEZIONE 7 - DeepPartial: il caso ricorsivo (perche' Partial non basta)
// ============================================================================
// Come visto nella sezione 2, Partial e' shallow. Per configurazioni annidate
// (es. impostazioni di reparto con sotto-oggetti) serve la ricorsione.
type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;
// - se T e' un object, mappa ogni chiave e RICORRE su DeepPartial<T[P]>
// - se T e' un primitivo (string, number...), lo lascia com'e' (caso base)

interface ImpostazioniReparto {
  nome: string;
  soglie: { min: number; max: number };
  turnoDefault: Turno;
}
type ImpostazioniPatch = DeepPartial<ImpostazioniReparto>;
// Ora anche il sotto-oggetto e' parzializzato: posso passare solo soglie.min.
const impPatch: ImpostazioniPatch = { soglie: { min: 10 } };
// Con Partial normale questo darebbe ERRORE (max mancante). Con DeepPartial no.

// ============================================================================
// SEZIONE 8 - Esempio ERP realistico: un Repository generico type-safe
// ============================================================================
// Definiamo un mock di Repository (nessuna libreria: e' un'interfaccia nostra).
// Mostra come Omit/Partial/Pick modellano le firme create/update/find.
interface Repository<T extends { id: number }> {
  // create: riceve l'entita' SENZA id (lo genera il DB) e ritorna l'entita' piena.
  create(dto: Omit<T, "id">): T;
  // update: riceve id + patch parziale dei restanti campi, ritorna l'entita'.
  update(id: number, patch: Partial<Omit<T, "id">>): T;
  // findProjection: ritorna solo un sottoinsieme di colonne (Pick dinamico).
  findProjection<K extends keyof T>(id: number, keys: K[]): Pick<T, K> | undefined;
}

// Implementazione mock in-memory del repository dei Dipendenti.
class DipendenteRepo implements Repository<Dipendente> {
  private store = new Map<number, Dipendente>();
  private seq = 0;

  create(dto: Omit<Dipendente, "id">): Dipendente {
    const entita: Dipendente = { id: ++this.seq, ...dto };
    this.store.set(entita.id, entita);
    return entita;
  }

  update(id: number, patch: Partial<Omit<Dipendente, "id">>): Dipendente {
    const attuale = this.store.get(id);
    if (!attuale) throw new Error("Dipendente non trovato: " + id);
    // Merge: i campi presenti nel patch sovrascrivono, gli altri restano.
    const aggiornato: Dipendente = { ...attuale, ...patch };
    this.store.set(id, aggiornato);
    return aggiornato;
  }

  findProjection<K extends keyof Dipendente>(
    id: number,
    keys: K[],
  ): Pick<Dipendente, K> | undefined {
    const entita = this.store.get(id);
    if (!entita) return undefined;
    // Costruiamo la proiezione copiando solo le chiavi richieste.
    const out = {} as Pick<Dipendente, K>;
    for (const k of keys) out[k] = entita[k];
    return out;
  }
}

// Uso del repository: i type guidano l'IDE e bloccano gli errori.
const repo = new DipendenteRepo();
const creato = repo.create({
  nome: "Neri",
  badge: "UP-007",
  ruolo: "Admin",
  reparto: "Qualita'",   // apostrofo ASCII, niente accenti
  turno: "P4",
  attivo: true,
  assunzione: "2026-03-01",
});
// creato.id e' valorizzato dal repo (=> 1)
const modificato = repo.update(creato.id, { turno: "P2", attivo: false });
// findProjection: il type di ritorno e' ESATTAMENTE Pick sulle chiavi passate.
const proj = repo.findProjection(creato.id, ["nome", "badge"]);
// proj ha type: { nome: string; badge: string } | undefined
// proj?.ruolo NON esiste (non era tra le keys):
// ERRORE TS: Property 'ruolo' does not exist on type 'Pick<Dipendente, "nome" | "badge">'.

// ============================================================================
// SEZIONE 9 - Esempio ERP: validazione di una Timbratura con DTO derivati
// ============================================================================
interface Timbratura {
  id: number;
  dipendenteId: number;
  entrata: string;   // "HH:MM" naive-UTC
  uscita: string;    // "HH:MM" naive-UTC
  reparto: string;
}

// Il DTO di inserimento non ha id; l'uscita puo' mancare (timbri l'entrata ora,
// l'uscita a fine turno). Usiamo Omit + SetOptional definito prima.
type TimbraturaCreateDTO = SetOptional<Omit<Timbratura, "id">, "uscita">;

// Validatore: sfrutta la regex orario /^\d{2}:\d{2}$/ e badge /^UP-\d{3}$/.
const RE_ORARIO = /^\d{2}:\d{2}$/;
const RE_BADGE = /^UP-\d{3}$/;

function validaTimbratura(dto: TimbraturaCreateDTO): string[] {
  const errori: string[] = [];
  if (!RE_ORARIO.test(dto.entrata)) errori.push("entrata non valida");
  // uscita e' opzionale: controlla solo se presente (narrowing su undefined).
  if (dto.uscita !== undefined && !RE_ORARIO.test(dto.uscita)) {
    errori.push("uscita non valida");
  }
  return errori;
}

// Esempio d'uso del validatore (nessun DOM, pura logica).
const esitoOk = validaTimbratura({ dipendenteId: 1, entrata: "08:00", reparto: "Estrusione" });
// esitoOk => []  (uscita omessa, entrata valida)
const esitoKo = validaTimbratura({ dipendenteId: 1, entrata: "8:0", uscita: "zz", reparto: "Estrusione" });
// esitoKo => ["entrata non valida", "uscita non valida"]

// ============================================================================
// SEZIONE 10 - GOTCHA / PITFALLS (trappole comuni e soluzioni)
// ============================================================================

// PITFALL 1: Partial NON e' ricorsivo (gia' visto). Non aspettarti che i
// sotto-oggetti diventino opzionali; usa DeepPartial se serve.

// PITFALL 2: Omit su una UNION "collassa" al set di chiavi comuni.
// Su una union discriminata, Omit distribuisce solo le chiavi condivise e
// perde le proprieta' specifiche del singolo membro.
type Evento =
  | { kind: "entrata"; ora: string }
  | { kind: "uscita"; ora: string; motivo: string };
type EventoSenzaKind = Omit<Evento, "kind">;
// Risultato: { ora: string }  <-- "motivo" e' SPARITO! (non e' comune a tutti)
type _G2 = Expect<Equal<EventoSenzaKind, { ora: string }>>;
// SOLUZIONE: applicare Omit a ogni membro con un conditional distributivo.
type DistributiveOmit<T, K extends keyof any> = T extends unknown
  ? Omit<T, K>
  : never;
type EventoSenzaKind2 = DistributiveOmit<Evento, "kind">;
// => { ora: string } | { ora: string; motivo: string }  <-- motivo preservato

// PITFALL 3: Omit accetta chiavi inesistenti (typo silenzioso). Gia' mostrato
// in sezione 5: usa StrictOmit vincolato a keyof T per intercettare i refusi.

// PITFALL 4: Pick/Omit NON aggiungono validazione runtime. Sono solo type-level:
// a runtime l'oggetto puo' comunque contenere chiavi extra (arrivate da JSON).
// Il type dice "queste chiavi", ma non "cancella" le altre a runtime.
function togliId(d: Dipendente): Omit<Dipendente, "id"> {
  return d; // <-- a runtime 'id' e' ANCORA presente nell'oggetto!
}
// A compile-time il chiamante non vede id; a runtime c'e'. Se serve rimuoverlo
// davvero, va fatto esplicitamente (destructuring):
function togliIdDavvero(d: Dipendente): Omit<Dipendente, "id"> {
  const { id: _scarto, ...resto } = d;
  return resto; // ora 'id' e' realmente assente
}

// ============================================================================
// SEZIONE 11 - Export dei simboli locali (solo simboli di questo file)
// ============================================================================
export {
  DipendenteRepo,
  validaTimbratura,
  togliId,
  togliIdDavvero,
  RE_ORARIO,
  RE_BADGE,
};
export type {
  Dipendente,
  Ruolo,
  Turno,
  DipendenteUpdateDTO,
  DipendenteCreateDTO,
  DipendenteCard,
  DipendentePatch2,
  DipendenteBozza,
  Timbratura,
  TimbraturaCreateDTO,
  SetRequired,
  SetOptional,
  StrictOmit,
  DeepPartial,
  DistributiveOmit,
  Repository,
};

/*
============================================================================
 RIEPILOGO COMANDI / CONCETTI (ripasso veloce)
============================================================================
 - Partial<T>        : { [P in keyof T]?: T[P] }      -> tutte opzionali
 - Required<T>       : { [P in keyof T]-?: T[P] }      -> tutte obbligatorie ("-?")
 - Pick<T,K>         : { [P in K]: T[P] }              -> tieni solo le chiavi K
 - Omit<T,K>         : Pick<T, Exclude<keyof T, K>>    -> togli le chiavi K
 - Modificatori mapped type: "?" aggiunge opz., "-?" toglie opz., "-readonly" toglie readonly
 - keyof T           : union delle chiavi di T
 - T[P] (indexed access): type della proprieta' P
 - Exclude<U,M>      : rimuove da U i membri assegnabili a M (conditional distributivo)
 - DTO create        : Omit<Entita, "id">             (id lo genera il DB)
 - DTO update        : Partial<Omit<Entita, "id">>    (patch parziale)
 - Homomorphic       : Pick/Partial/Required preservano readonly e "?" originali
 GOTCHA:
 - Partial e' SHALLOW -> usa DeepPartial<T> per gli oggetti annidati
 - Required NON rimuove undefined da "number | undefined" (toglie solo "?")
 - Omit accetta chiavi inesistenti (typo silenzioso) -> usa StrictOmit<T, keyof T>
 - Omit su UNION perde le proprieta' non comuni -> usa DistributiveOmit
 - Pick/Omit sono SOLO type-level: a runtime le chiavi extra restano
 Pattern utili fatti in casa: SetRequired, SetOptional, DistributiveOmit, DeepPartial
============================================================================
*/
