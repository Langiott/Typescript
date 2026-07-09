/**
 * 090_TS_ADV_State_Machine.ts
 * File 90 - ADV: State machine typed (macchina a stati tipizzata)
 *
 * Come modellare stati + transizioni a livello di type system in modo che il
 * compilatore VIETI le transizioni invalide. Applichiamo il pattern a due macchine
 * del dominio ERP Polyuretech: RichiestaFerie (workflow approvazione) e Timbratura
 * (entrata/uscita). Vedremo discriminated union, mappe di transizione type-level,
 * guardie (type guard + guardie runtime) e helper di type-testing Equal/Expect.
 */

// ============================================================================
// 0) HELPER DI TYPE-TESTING (definiti in-file, nessuna libreria esterna)
// ============================================================================

// Equal<A, B> e' true solo se A e B sono lo stesso tipo. Usa il trucco delle
// funzioni condizionali: due tipi sono uguali sse le loro forme condizionali
// coincidono. E' il modo standard "type-level" per confrontare tipi in modo
// esatto (piu' stretto di extends, distingue anche any da unknown).
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Expect accetta solo il letterale true: se un test di tipo fallisce, la riga
// non compila e vediamo subito l'errore. Serve a "asserire" a compile-time.
type Expect<T extends true> = T;

// Esempio d'uso degli helper (i test vivono nei tipi, zero costo a runtime):
type _t0 = Expect<Equal<"UP-001", "UP-001">>; // ok
// type _t0bad = Expect<Equal<1, 2>>; // ERRORE TS: Type 'false' does not satisfy 'true'

// ============================================================================
// 1) DOMINIO ERP: tipi di base riusati sotto
// ============================================================================

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
type Badge = `UP-${number}`; // pattern template literal, es. "UP-001"
type OrarioHHMM = `${number}:${number}`; // approssimazione di /^\d{2}:\d{2}$/

interface Dipendente {
  readonly id: number;
  readonly nome: string;
  readonly badge: Badge;
  readonly ruolo: Ruolo;
}

// ============================================================================
// 2) STATI COME DISCRIMINATED UNION
// ============================================================================

// La macchina RichiestaFerie: ogni stato e' un oggetto con campo discriminante
// "stato". I dati trasportati variano per stato (es. motivo di rifiuto esiste
// solo in "Rifiutata"). Questo e' il cuore: lo stato NON e' solo una stringa,
// porta con se' i dati validi in quel preciso momento.
type RichiestaFerie =
  | { stato: "Bozza"; richiedente: Badge; giorni: number }
  | { stato: "Inviata"; richiedente: Badge; giorni: number; inviataAlle: OrarioHHMM }
  | { stato: "Approvata"; richiedente: Badge; giorni: number; approvataDa: Badge }
  | { stato: "Rifiutata"; richiedente: Badge; giorni: number; motivo: string }
  | { stato: "Annullata"; richiedente: Badge };

// Estraiamo l'unione dei nomi di stato con un indexed access type.
type StatoFerie = RichiestaFerie["stato"];
// => "Bozza" | "Inviata" | "Approvata" | "Rifiutata" | "Annullata"

type _t1 = Expect<
  Equal<StatoFerie, "Bozza" | "Inviata" | "Approvata" | "Rifiutata" | "Annullata">
>; // ok

// Narrowing: dentro un blocco che controlla lo stato, TS restringe il tipo e
// rende accessibili SOLO i campi di quello stato (control flow analysis).
function descrivi(r: RichiestaFerie): string {
  switch (r.stato) {
    case "Bozza":
      return `Bozza di ${r.richiedente}, ${r.giorni}gg`;
    case "Inviata":
      return `Inviata alle ${r.inviataAlle}`;
    case "Approvata":
      return `Approvata da ${r.approvataDa}`;
    case "Rifiutata":
      return `Rifiutata: ${r.motivo}`; // r.motivo visibile solo qui
    case "Annullata":
      return `Annullata`;
    // Nessun default: l'exhaustiveness check sotto garantisce copertura totale.
  }
  // Se aggiungiamo un nuovo stato e dimentichiamo un case, r qui non e' never
  // e la funzione non ritorna sempre string -> errore. Vedi exhaustive() sotto.
  return assertNever(r);
}

// assertNever: se raggiunto, il tipo di x deve essere never. Se un case manca,
// x non sara' never e il compilatore segnala l'errore. Pattern di esaustivita'.
function assertNever(x: never): never {
  throw new Error(`Stato non gestito: ${JSON.stringify(x)}`);
}

// ============================================================================
// 3) TRANSIZIONI VALIDE A LIVELLO DI TIPO
// ============================================================================

// Definiamo, PER OGNI stato, l'insieme degli stati raggiungibili. E' una mappa
// type-level: le chiavi sono gli stati, i valori sono union di stati target.
// Questa e' la "single source of truth" del grafo delle transizioni.
type TransizioniFerie = {
  Bozza: "Inviata" | "Annullata";
  Inviata: "Approvata" | "Rifiutata" | "Annullata";
  Approvata: never; // stato finale: nessuna transizione uscente
  Rifiutata: "Bozza"; // si puo' ricreare una bozza correggendo
  Annullata: never; // stato finale
};

// Vincolo strutturale: la mappa DEVE coprire esattamente gli stati esistenti.
// Se dimentichiamo una chiave o ne aggiungiamo una inesistente, errore.
type _t2 = Expect<Equal<keyof TransizioniFerie, StatoFerie>>; // ok

// ProssimiStati<S>: dato uno stato S, restituisce l'union dei suoi target.
// E' un semplice indexed access con generico.
type ProssimiStati<S extends StatoFerie> = TransizioniFerie[S];

type _t3 = Expect<Equal<ProssimiStati<"Bozza">, "Inviata" | "Annullata">>; // ok
type _t4 = Expect<Equal<ProssimiStati<"Approvata">, never>>; // ok, stato finale

// PuoTransire<Da, A>: true se la transizione Da -> A e' permessa dal grafo.
// [A] extends [TransizioniFerie[Da]] usa tuple-wrapping per DISABILITARE la
// distributivita' delle conditional type sulle union (altrimenti valuterebbe
// membro per membro e il risultato sarebbe un'union di boolean, non un bool).
type PuoTransire<Da extends StatoFerie, A extends StatoFerie> =
  [A] extends [TransizioniFerie[Da]] ? true : false;

type _t5 = Expect<Equal<PuoTransire<"Bozza", "Inviata">, true>>; // ok
type _t6 = Expect<Equal<PuoTransire<"Bozza", "Approvata">, false>>; // salto vietato
type _t7 = Expect<Equal<PuoTransire<"Approvata", "Bozza">, false>>; // da finale: no

// ============================================================================
// 4) UNA transition() CHE VIETA STATICAMENTE LE TRANSIZIONI INVALIDE
// ============================================================================

// Il generico A e' vincolato a ProssimiStati<Da>: il compilatore accetta come
// stato target SOLO uno di quelli raggiungibili. Passare un target invalido e'
// un errore di tipo, non un controllo runtime.
function transitionFerie<Da extends StatoFerie, A extends ProssimiStati<Da>>(
  da: Da,
  a: A,
): { da: Da; a: A } {
  return { da, a };
}

const ok1 = transitionFerie("Bozza", "Inviata"); // ok
const ok2 = transitionFerie("Inviata", "Rifiutata"); // ok
// const ko1 = transitionFerie("Bozza", "Approvata");
// ERRORE TS: Argument of type '"Approvata"' is not assignable to parameter of type '"Inviata" | "Annullata"'
// const ko2 = transitionFerie("Approvata", "Bozza");
// ERRORE TS: Argument of type '"Bozza"' is not assignable to parameter of type 'never'
//   (da uno stato finale non parte alcuna transizione: il target atteso e' never)

// ============================================================================
// 5) EVENTI + REDUCER: la transizione produce il NUOVO oggetto stato completo
// ============================================================================

// Il grafo type-level dice "quali stati", ma una macchina reale produce il
// prossimo oggetto stato a partire da un EVENTO. Modelliamo gli eventi come
// discriminated union e scriviamo un reducer esaustivo.
type EventoFerie =
  | { tipo: "INVIA"; alle: OrarioHHMM }
  | { tipo: "APPROVA"; da: Badge }
  | { tipo: "RIFIUTA"; motivo: string }
  | { tipo: "ANNULLA" }
  | { tipo: "RIAPRI" }; // Rifiutata -> Bozza

// reducer: (stato corrente, evento) -> nuovo stato. Le combinazioni non valide
// (evento che non ha senso nello stato corrente) restituiscono lo stato
// invariato: rimaniamo type-safe perche' ogni ramo costruisce un oggetto
// che appartiene all'union RichiestaFerie.
function reducerFerie(r: RichiestaFerie, ev: EventoFerie): RichiestaFerie {
  switch (r.stato) {
    case "Bozza":
      if (ev.tipo === "INVIA") {
        return {
          stato: "Inviata",
          richiedente: r.richiedente,
          giorni: r.giorni,
          inviataAlle: ev.alle,
        };
      }
      if (ev.tipo === "ANNULLA") {
        return { stato: "Annullata", richiedente: r.richiedente };
      }
      return r; // evento ignorato in questo stato
    case "Inviata":
      if (ev.tipo === "APPROVA") {
        return {
          stato: "Approvata",
          richiedente: r.richiedente,
          giorni: r.giorni,
          approvataDa: ev.da,
        };
      }
      if (ev.tipo === "RIFIUTA") {
        return {
          stato: "Rifiutata",
          richiedente: r.richiedente,
          giorni: r.giorni,
          motivo: ev.motivo,
        };
      }
      if (ev.tipo === "ANNULLA") {
        return { stato: "Annullata", richiedente: r.richiedente };
      }
      return r;
    case "Rifiutata":
      if (ev.tipo === "RIAPRI") {
        return { stato: "Bozza", richiedente: r.richiedente, giorni: r.giorni };
      }
      return r;
    case "Approvata":
    case "Annullata":
      return r; // stati finali: nessun evento li muove
    default:
      return assertNever(r); // esaustivita': se manca un case, errore di tipo
  }
}

// Uso del reducer: la sequenza di stati e' completamente tipizzata.
const iniziale: RichiestaFerie = {
  stato: "Bozza",
  richiedente: "UP-001",
  giorni: 5,
};
const dopoInvio = reducerFerie(iniziale, { tipo: "INVIA", alle: "09:30" });
// dopoInvio: RichiestaFerie (a runtime stato === "Inviata")
const dopoApprovazione = reducerFerie(dopoInvio, { tipo: "APPROVA", da: "UP-002" });
// dopoApprovazione: RichiestaFerie (stato === "Approvata")

// ============================================================================
// 6) TYPE GUARD: restringere l'union a UN singolo stato
// ============================================================================

// isStato: type guard generica che restringe RichiestaFerie al membro con lo
// stato richiesto. Il return type "r is Extract<...>" istruisce il control flow
// analysis: dopo un true, TS sa esattamente quale variante abbiamo.
function isStato<S extends StatoFerie>(
  r: RichiestaFerie,
  s: S,
): r is Extract<RichiestaFerie, { stato: S }> {
  return r.stato === s;
}

function leggiApprovatore(r: RichiestaFerie): Badge | null {
  if (isStato(r, "Approvata")) {
    return r.approvataDa; // ok: qui r ha tipo { stato:"Approvata"; ...; approvataDa }
  }
  // r.approvataDa; // ERRORE TS: Property 'approvataDa' does not exist on ...
  return null;
}

// Extract e' l'inverso concettuale di narrowing manuale: filtra dall'union i
// membri assegnabili al pattern. Verifichiamo il risultato con un type-test.
type SoloApprovata = Extract<RichiestaFerie, { stato: "Approvata" }>;
type _t8 = Expect<
  Equal<
    SoloApprovata,
    { stato: "Approvata"; richiedente: Badge; giorni: number; approvataDa: Badge }
  >
>; // ok

// ============================================================================
// 7) SECONDA MACCHINA: TIMBRATURA (entrata/uscita) con GUARDIE runtime
// ============================================================================

// Stati della giornata di timbratura. "InServizio" porta l'orario di entrata,
// utile per calcolare la durata all'uscita.
type Timbratura =
  | { stato: "FuoriServizio"; badge: Badge }
  | { stato: "InServizio"; badge: Badge; entrata: OrarioHHMM }
  | { stato: "GiornataChiusa"; badge: Badge; entrata: OrarioHHMM; uscita: OrarioHHMM };

type StatoTimbratura = Timbratura["stato"];

// Grafo delle transizioni della timbratura.
type TransizioniTimbratura = {
  FuoriServizio: "InServizio"; // TIMBRA_ENTRATA
  InServizio: "GiornataChiusa"; // TIMBRA_USCITA
  GiornataChiusa: never; // stato finale della giornata
};
type _t9 = Expect<Equal<keyof TransizioniTimbratura, StatoTimbratura>>; // ok

// Guardia runtime: una transizione puo' avere PRE-CONDIZIONI che non si esprimono
// solo col grafo (es. l'uscita deve essere dopo l'entrata). La guardia e' una
// funzione boolean che validiamo prima di applicare la transizione.
type Guardia<Ctx> = (ctx: Ctx) => boolean;

function minuti(hhmm: OrarioHHMM): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Guardia: uscita valida solo se strettamente successiva all'entrata (orari
// naive-UTC "HH:MM", nessun fuso applicato, coerente con la convenzione ERP).
const uscitaDopoEntrata: Guardia<{ entrata: OrarioHHMM; uscita: OrarioHHMM }> = (c) =>
  minuti(c.uscita) > minuti(c.entrata);

// Il risultato di una transizione con guardia: successo col nuovo stato, oppure
// fallimento con motivo. E' un "result type" (discriminated union), niente eccezioni.
type Risultato<T> =
  | { ok: true; valore: T }
  | { ok: false; errore: string };

function timbraUscita(
  t: Extract<Timbratura, { stato: "InServizio" }>,
  uscita: OrarioHHMM,
): Risultato<Extract<Timbratura, { stato: "GiornataChiusa" }>> {
  // La guardia protegge l'invariante di dominio prima di cambiare stato.
  if (!uscitaDopoEntrata({ entrata: t.entrata, uscita })) {
    return { ok: false, errore: `Uscita ${uscita} non dopo entrata ${t.entrata}` };
  }
  return {
    ok: true,
    valore: { stato: "GiornataChiusa", badge: t.badge, entrata: t.entrata, uscita },
  };
}

// Uso: il parametro e' gia' ristretto a InServizio, quindi t.entrata esiste.
const inServizio: Extract<Timbratura, { stato: "InServizio" }> = {
  stato: "InServizio",
  badge: "UP-007",
  entrata: "08:00",
};
const rUscita = timbraUscita(inServizio, "17:00");
if (rUscita.ok) {
  // rUscita.valore: { stato:"GiornataChiusa"; ...; uscita }
  const _durata = minuti(rUscita.valore.uscita) - minuti(rUscita.valore.entrata); // 540
}
const rUscitaKo = timbraUscita(inServizio, "07:30"); // ok:false, guardia fallita

// ============================================================================
// 8) ESEMPIO ERP: repository con controllo di autorizzazione per stato
// ============================================================================

// Mock dei tipi che in produzione verrebbero da Prisma/Express. Definiti qui
// perche' non importiamo librerie esterne (regola del corso).
interface FerieRepositoryMock {
  salva(r: RichiestaFerie): void;
  perBadge(b: Badge): RichiestaFerie[];
}

// Solo Admin/SuperAdmin possono approvare. Uniamo autorizzazione (ruolo) e
// transizione type-safe. La firma impedisce di chiamare approva su uno stato
// che non sia "Inviata".
function approva(
  attore: Dipendente,
  r: Extract<RichiestaFerie, { stato: "Inviata" }>,
): Risultato<Extract<RichiestaFerie, { stato: "Approvata" }>> {
  const puoApprovare = attore.ruolo === "Admin" || attore.ruolo === "SuperAdmin";
  if (!puoApprovare) {
    return { ok: false, errore: `Ruolo ${attore.ruolo} non autorizzato` };
  }
  return {
    ok: true,
    valore: {
      stato: "Approvata",
      richiedente: r.richiedente,
      giorni: r.giorni,
      approvataDa: attore.badge,
    },
  };
}

const admin: Dipendente = { id: 2, nome: "Bianchi", badge: "UP-002", ruolo: "Admin" };
const richiestaInviata: Extract<RichiestaFerie, { stato: "Inviata" }> = {
  stato: "Inviata",
  richiedente: "UP-001",
  giorni: 5,
  inviataAlle: "09:30",
};
const esitoApprova = approva(admin, richiestaInviata);
// const esitoKo = approva(admin, iniziale);
// ERRORE TS: 'iniziale' ha stato "Bozza", non assegnabile a { stato: "Inviata" }

// ============================================================================
// 9) DERIVARE L'ELENCO DI TUTTE LE TRANSIZIONI VALIDE (type-level)
// ============================================================================

// TransizioneEdge<S>: per ogni stato S produce l'union di coppie [S, target].
// Iteriamo con mapped type + distribuzione su TransizioniFerie[S]; l'accesso
// [keyof ...] "collassa" l'oggetto mappato nell'union dei suoi valori.
type TransizioneEdge<Map, S extends keyof Map> =
  Map[S] extends infer T
    ? T extends string
      ? { da: S; a: T }
      : never
    : never;

type TutteLeTransizioniFerie = {
  [S in StatoFerie]: TransizioneEdge<TransizioniFerie, S>;
}[StatoFerie];
// L'union risultante enumera TUTTI gli archi validi del grafo:
// { da:"Bozza"; a:"Inviata" } | { da:"Bozza"; a:"Annullata" }
// | { da:"Inviata"; a:"Approvata" } | { da:"Inviata"; a:"Rifiutata" }
// | { da:"Inviata"; a:"Annullata" } | { da:"Rifiutata"; a:"Bozza" }
// (Approvata e Annullata hanno target never -> nessun arco: T extends string filtra via)

type _t10 = Expect<
  Equal<
    TutteLeTransizioniFerie,
    | { da: "Bozza"; a: "Inviata" }
    | { da: "Bozza"; a: "Annullata" }
    | { da: "Inviata"; a: "Approvata" }
    | { da: "Inviata"; a: "Rifiutata" }
    | { da: "Inviata"; a: "Annullata" }
    | { da: "Rifiutata"; a: "Bozza" }
  >
>; // ok

// ============================================================================
// 10) GOTCHA / PITFALLS
// ============================================================================

// GOTCHA 1 - Distributivita' delle conditional type.
// Se scrivo la guardia SENZA il tuple-wrapping, l'union si distribuisce e ottengo
// un boolean "sbagliato" (union di true|false), non un singolo risultato:
type PuoTransireBuggy<Da extends StatoFerie, A extends StatoFerie> =
  A extends TransizioniFerie[Da] ? true : false; // distribuisce su A
type _bug = PuoTransireBuggy<"Bozza", "Inviata" | "Approvata">;
// => boolean (true per "Inviata", false per "Approvata", uniti in boolean!)
// Soluzione: wrappare in tuple [A] extends [TransizioniFerie[Da]] come in PuoTransire.
type _fix = PuoTransire<"Bozza", "Inviata" | "Approvata">; // => false (nessuna distribuzione)

// GOTCHA 2 - Dimenticare assertNever nel reducer/switch.
// Senza il ramo assertNever, aggiungere uno stato all'union NON provoca errori:
// il codice compila ma dimentica il nuovo stato a runtime. L'esaustivita' e'
// una scelta esplicita: assertNever(x: never) trasforma l'omissione in errore TS.

// GOTCHA 3 - Confondere lo stato-stringa con l'oggetto-stato.
// TransizioniFerie lavora sui NOMI degli stati (stringhe), ma reducerFerie
// costruisce OGGETTI completi. Il grafo dice "e' lecito Bozza->Inviata", il
// reducer garantisce che l'oggetto "Inviata" abbia davvero inviataAlle. Servono
// entrambi: il tipo vieta il salto, il reducer riempie i dati obbligatori.
// Errore tipico: restituire { stato:"Inviata", richiedente, giorni } senza inviataAlle
// ERRORE TS: Property 'inviataAlle' is missing in type ... required in ...

// GOTCHA 4 - Guardie NON esprimibili col grafo.
// Il grafo type-level cattura "quali stati", non "sotto quali condizioni di dato".
// "uscita > entrata" non e' un vincolo di stato ma di valore: va messo in una
// guardia runtime (uscitaDopoEntrata) che ritorna Risultato<...>, non nel tipo.
// Pretendere di codificarlo nei tipi con OrarioHHMM porta a template literal
// ingestibili: separare invariante-di-stato (tipo) da invariante-di-valore (guardia).

// ============================================================================
// 11) EXPORT locali (solo simboli definiti in questo file)
// ============================================================================

export {
  transitionFerie,
  reducerFerie,
  isStato,
  assertNever,
  timbraUscita,
  approva,
  minuti,
  uscitaDopoEntrata,
};

export type {
  Equal,
  Expect,
  Ruolo,
  Badge,
  OrarioHHMM,
  Dipendente,
  RichiestaFerie,
  StatoFerie,
  TransizioniFerie,
  ProssimiStati,
  PuoTransire,
  EventoFerie,
  Timbratura,
  StatoTimbratura,
  TransizioniTimbratura,
  Guardia,
  Risultato,
  TutteLeTransizioniFerie,
};

/*
 * ============================================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================================
 * - Discriminated union: campo "stato" come tag; i dati variano per variante.
 * - Indexed access: RichiestaFerie["stato"] estrae l'union dei nomi di stato.
 * - Mappa transizioni type-level: { Stato: union-target } = single source of truth.
 * - keyof Map === StatoX (Expect/Equal) forza la copertura di tutti gli stati.
 * - ProssimiStati<S> = Map[S]: target raggiungibili da S (never = stato finale).
 * - transition<Da, A extends ProssimiStati<Da>>: vieta STATICAMENTE il salto invalido.
 * - PuoTransire con [A] extends [Map[Da]]: no distributivita' -> boolean singolo.
 * - Reducer esaustivo (stato, evento) -> nuovo stato; costruisce oggetti completi.
 * - assertNever(x: never): esaustivita' dello switch, omissioni = errore di tipo.
 * - Type guard "r is Extract<Union, {stato:S}>": narrowing a una singola variante.
 * - Extract<Union, Pattern>: filtra i membri dell'union assegnabili al pattern.
 * - Guardie runtime (uscita>entrata, ruolo autorizzato) + Result type, no eccezioni.
 * - Enumerazione archi: mapped type + [keyof] collassa in union di { da; a }.
 * - Equal<A,B>/Expect<true>: type-testing a compile-time, costo runtime zero.
 * - Pitfalls: distributivita', assertNever mancante, stato-stringa vs oggetto, guardie di valore.
 */
