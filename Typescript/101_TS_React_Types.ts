/**
 * File 101 - TS with React (props/state types)
 * Livello: ECOSYSTEM/EXTRA
 * Come tipizzare props e state di componenti React SENZA scrivere JSX:
 * ci concentriamo sui TIPI (props, state, event, useState<T>) usando
 * componenti-funzione tipizzati come normali funzioni TypeScript.
 * NB: React NON e' importato: definiamo interfacce/tipi MOCK nel file.
 * Il JSX vero e' mostrato SOLO nei commenti (// JSX: ...).
 */

// ============================================================
// 0) MOCK dei tipi React (niente import npm, niente librerie)
// ============================================================
// In un progetto reale importeresti: import React, { useState } from "react".
// Qui ricreiamo a mano i tipi minimi che ci servono per compilare.

// Un nodo renderizzabile: stringa, numero, elemento, lista, niente...
// (React.ReactNode reale e' piu' ampio, questa e' una versione didattica).
type ReactNode = string | number | boolean | null | undefined | ReactElement | ReactNode[];

// Un elemento React (il risultato di createElement / JSX).
interface ReactElement {
  readonly type: string;
  readonly props: Record<string, unknown>;
}

// Un componente-funzione: prende props di tipo P e ritorna un ReactElement.
// Questa e' l'essenza di React.FC<P> (Function Component).
type FC<P = Record<string, never>> = (props: P) => ReactElement;

// createElement MOCK: nella realta' e' React.createElement.
function createElement(type: string, props: Record<string, unknown>): ReactElement {
  return { type, props };
}

// ============================================================
// 1) React.FC "a parole": cos'e' e perche' basta una funzione tipizzata
// ============================================================
// React.FC<Props> e' solo un alias per "funzione che prende Props e
// ritorna un elemento". Non serve un tipo speciale: basta tipizzare
// il parametro props. Molti team oggi EVITANO React.FC ed usano una
// semplice function con props tipizzate (piu' esplicito, meno magia).

// Props del nostro badge dipendente.
interface BadgeProps {
  nome: string;
  badge: string; // formato "UP-001"
}

// Componente come funzione tipizzata (stile consigliato):
function Badge(props: BadgeProps): ReactElement {
  // JSX: return <span className="badge">{props.badge} - {props.nome}</span>;
  return createElement("span", { className: "badge", text: `${props.badge} - ${props.nome}` });
}

// Stesso componente usando l'alias FC (stile React.FC):
const BadgeFC: FC<BadgeProps> = (props) => {
  // props e' inferito come BadgeProps grazie a FC<BadgeProps>
  return createElement("span", { text: `${props.badge} - ${props.nome}` });
};

// Uso (nella realta' sarebbe <Badge nome="Rossi" badge="UP-001" />):
const el1 = Badge({ nome: "Rossi", badge: "UP-001" });
const el2 = BadgeFC({ nome: "Bianchi", badge: "UP-002" });
// el1, el2 -> tipo: ReactElement

// ERRORE TS: manca la prop obbligatoria "badge"
// Badge({ nome: "Verdi" });

// ============================================================
// 2) Props: obbligatorie, opzionali, default, children
// ============================================================

// Ruoli dell'ERP: union di string literal (esaustiva e sicura).
type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

interface DipendenteCardProps {
  id: number;
  nome: string;
  ruolo: Ruolo;
  reparto?: string;        // opzionale: puo' mancare -> string | undefined
  attivo?: boolean;        // opzionale con default gestito nel body
  children?: ReactNode;    // il classico "children" di React
}

// Default per le opzionali tramite destructuring:
function DipendenteCard({
  nome,
  ruolo,
  reparto = "Non assegnato",
  attivo = true,
  children,
}: DipendenteCardProps): ReactElement {
  // reparto -> tipo: string (il default rimuove undefined)
  // attivo  -> tipo: boolean
  return createElement("div", {
    text: `${nome} [${ruolo}] @ ${reparto} ${attivo ? "ON" : "OFF"}`,
    children,
  });
}

// Uso valido: reparto/attivo omessi, children passato.
const card1 = DipendenteCard({ id: 1, nome: "Rossi", ruolo: "Operatore", children: "extra" });

// ERRORE TS: "Capo" non e' un Ruolo valido
// DipendenteCard({ id: 2, nome: "Neri", ruolo: "Capo" });

// Pattern "PropsWithChildren": helper che aggiunge children a qualsiasi P.
type PropsWithChildren<P> = P & { children?: ReactNode };

type PannelloProps = PropsWithChildren<{ titolo: string }>;

function Pannello({ titolo, children }: PannelloProps): ReactElement {
  return createElement("section", { titolo, children });
}
// Uso: Pannello({ titolo: "Reparti", children: [card1] });

// ============================================================
// 3) Props readonly e discriminated union (varianti di componente)
// ============================================================
// Le props NON vanno mutate: modellale readonly per bloccare gli errori.
interface TurnoProps {
  readonly turno: "P4" | "P2" | "STD";
  readonly ore: number;
}

function TurnoLabel(props: TurnoProps): ReactElement {
  // ERRORE TS: Cannot assign to 'turno' because it is a read-only property.
  // props.turno = "STD";
  return createElement("b", { text: `${props.turno} (${props.ore}h)` });
}

// Discriminated union sulle props: il campo "stato" seleziona la forma.
type StatoTimbraturaProps =
  | { stato: "presente"; entrata: string }              // "HH:MM"
  | { stato: "uscito"; entrata: string; uscita: string }
  | { stato: "assente" };

function StatoTimbratura(props: StatoTimbraturaProps): ReactElement {
  // Narrowing sul discriminante "stato":
  switch (props.stato) {
    case "presente":
      return createElement("span", { text: `Dentro dalle ${props.entrata}` });
    case "uscito":
      // qui TS SA che esiste props.uscita
      return createElement("span", { text: `${props.entrata} -> ${props.uscita}` });
    case "assente":
      // ERRORE TS: Property 'entrata' does not exist on this branch.
      // return createElement("span", { text: props.entrata });
      return createElement("span", { text: "Assente" });
  }
}

// ============================================================
// 4) useState<T>: il CONCETTO (senza runtime React reale)
// ============================================================
// useState ritorna una coppia [valore, setter]. Il setter accetta o un
// nuovo valore, o una funzione (prev) => next. Tipizziamo un MOCK per
// vedere l'inferenza di T e la firma del setter.

// Il setter di useState: nuovo valore diretto o updater funzionale.
type SetState<T> = (next: T | ((prev: T) => T)) => void;

// Firma di useState: dato uno stato iniziale T -> [T, SetState<T>].
// (MOCK: non gestiamo davvero lo stato, serve solo per i TIPI.)
declare function useState<T>(initial: T): [T, SetState<T>];

// Inferenza dal valore iniziale:
function EsempioContatore(): void {
  const [count, setCount] = useState(0);
  // count   -> tipo: number (inferito da 0)
  // setCount-> tipo: SetState<number>
  setCount(count + 1);          // valore diretto
  setCount((prev) => prev + 1); // updater funzionale
  // ERRORE TS: Argument of type 'string' is not assignable to 'number'.
  // setCount("2");
}

// Tipo esplicito quando l'iniziale non basta (es. puo' diventare non-null):
function EsempioSelezione(): void {
  // Senza il generic il tipo sarebbe "null" e non accetterebbe un numero.
  const [selId, setSelId] = useState<number | null>(null);
  // selId -> tipo: number | null
  setSelId(42);   // ok
  setSelId(null); // ok
}

// Stato oggetto: sempre creare un NUOVO oggetto nel setter (immutabilita').
interface FiltroState {
  reparto: string | null;
  soloAttivi: boolean;
}

function EsempioFiltro(): void {
  const [filtro, setFiltro] = useState<FiltroState>({ reparto: null, soloAttivi: true });
  // Aggiornamento immutabile con spread:
  setFiltro((prev) => ({ ...prev, soloAttivi: false }));
  // filtro -> tipo: FiltroState
  void filtro;
}

// ============================================================
// 5) Event types: tipizzare gli handler DOM/React
// ============================================================
// I tipi DOM (Event, HTMLInputElement...) vengono dalla lib "DOM".
// React reale ha wrapper "SyntheticEvent"; qui usiamo i tipi DOM nativi
// + un mock generico ChangeEvent per mostrare il pattern.

// Mock del ChangeEvent React (target tipizzato sull'elemento):
interface ChangeEvent<T> {
  readonly target: T;
  preventDefault(): void;
}

// Handler di un input: leggiamo target.value (string).
function onCambiaNome(e: ChangeEvent<HTMLInputElement>): void {
  const valore: string = e.target.value; // value -> tipo: string
  void valore;
  // JSX: <input onChange={onCambiaNome} />
}

// Handler di un click su bottone (tipo DOM nativo MouseEvent):
function onClickSalva(e: MouseEvent): void {
  e.preventDefault();
  // JSX: <button onClick={onClickSalva}>Salva</button>
}

// Handler di submit form: preventDefault e' d'obbligo.
function onSubmitForm(e: ChangeEvent<HTMLFormElement>): void {
  e.preventDefault();
  // JSX: <form onSubmit={onSubmitForm}> ... </form>
}

// Tipo alias per un handler generico (comodo nelle props):
type EventHandler<E> = (e: E) => void;

interface RicercaProps {
  valore: string;
  onChange: EventHandler<ChangeEvent<HTMLInputElement>>;
  onClear: EventHandler<MouseEvent>;
}

function BarraRicerca(props: RicercaProps): ReactElement {
  // JSX: <input value={props.valore} onChange={props.onChange} />
  //      <button onClick={props.onClear}>x</button>
  return createElement("div", { valore: props.valore });
}

// ============================================================
// 6) Props di callback: sollevare eventi verso il padre ("lift state up")
// ============================================================
interface Dipendente {
  id: number;
  nome: string;
  badge: string; // "UP-001"
  ruolo: Ruolo;
}

// Il componente figlio NON gestisce lo stato: chiama onSeleziona del padre.
interface RigaDipendenteProps {
  dip: Dipendente;
  selezionato: boolean;
  onSeleziona: (id: number) => void; // callback tipizzata
}

function RigaDipendente({ dip, selezionato, onSeleziona }: RigaDipendenteProps): ReactElement {
  // JSX: <tr onClick={() => onSeleziona(dip.id)} className={selezionato ? "sel" : ""}>
  //        <td>{dip.badge}</td><td>{dip.nome}</td>
  //      </tr>
  return createElement("tr", {
    text: `${dip.badge} ${dip.nome}`,
    selezionato,
    onClick: () => onSeleziona(dip.id),
  });
}

// ============================================================
// 7) Props derivate: Pick / Omit / Partial dal modello di dominio
// ============================================================
// Riusare il tipo di dominio evita duplicazioni tra model e props.

// Solo alcune chiavi del Dipendente come props:
type MiniDipProps = Pick<Dipendente, "nome" | "badge">;
function MiniDip(props: MiniDipProps): ReactElement {
  return createElement("span", { text: `${props.badge} ${props.nome}` });
}

// Tutte le props tranne "id" (es. form di creazione, id lo assegna il server):
type NuovoDipProps = Omit<Dipendente, "id">;
const bozza: NuovoDipProps = { nome: "Gialli", badge: "UP-009", ruolo: "Operatore" };
void bozza;

// Props parziali per un form "modifica" (tutti i campi opzionali):
type ModificaDipProps = Partial<Dipendente>;
const patch: ModificaDipProps = { ruolo: "Admin" };
void patch;

// ============================================================
// 8) Componente generico: una lista tipizzata riusabile
// ============================================================
// Un componente-funzione puo' essere generico su T (utile per liste).

interface ListaProps<T> {
  items: readonly T[];
  render: (item: T, index: number) => ReactNode;
}

function Lista<T>(props: ListaProps<T>): ReactElement {
  const nodi: ReactNode[] = props.items.map((it, i) => props.render(it, i));
  // JSX: <ul>{props.items.map((it, i) => <li key={i}>{props.render(it, i)}</li>)}</ul>
  return createElement("ul", { children: nodi });
}

// Uso con Dipendente: T e' inferito come Dipendente.
const dipendenti: Dipendente[] = [
  { id: 1, nome: "Rossi", badge: "UP-001", ruolo: "Operatore" },
  { id: 2, nome: "Bianchi", badge: "UP-002", ruolo: "Admin" },
];
const listaEl = Lista({
  items: dipendenti,
  render: (d) => `${d.badge} - ${d.nome}`, // d -> tipo: Dipendente
});
void listaEl;

// ============================================================
// 9) Validazione dominio nei tipi + refinement a runtime
// ============================================================
// I tipi non validano i FORMATI a runtime: usa regex nelle funzioni.
const RE_ORARIO = /^\d{2}:\d{2}$/;   // "HH:MM"
const RE_BADGE = /^UP-\d{3}$/;       // "UP-001"

interface Timbratura {
  dipId: number;
  entrata: string; // naive-UTC "HH:MM"
  uscita: string | null;
}

// Type guard: da string generica a "orario valido" (documentato dal branch).
function isOrario(v: string): boolean {
  return RE_ORARIO.test(v);
}
function isBadge(v: string): boolean {
  return RE_BADGE.test(v);
}

// Handler che accetta un input e valida prima di salvare nello state.
function onSalvaEntrata(e: ChangeEvent<HTMLInputElement>, setT: SetState<Timbratura>): void {
  const val = e.target.value; // string
  if (isOrario(val)) {
    setT((prev) => ({ ...prev, entrata: val }));
  }
  // else: mostrare errore (branch UI), qui omesso
}
void onSalvaEntrata;
void isBadge;

// ============================================================
// 10) Ref e "controlled vs uncontrolled" (solo tipi)
// ============================================================
// useRef reale ritorna { current: T }. MOCK per mostrare il tipo.
interface RefObject<T> {
  current: T | null;
}
declare function useRef<T>(initial: T | null): RefObject<T>;

function EsempioRef(): void {
  const inputRef = useRef<HTMLInputElement>(null);
  // inputRef -> tipo: RefObject<HTMLInputElement>
  // JSX: <input ref={inputRef} />
  // Accesso sicuro (current puo' essere null finche' non montato):
  const el = inputRef.current;
  if (el !== null) {
    // el -> tipo: HTMLInputElement (narrowing rimuove null)
    void el.value;
  }
}
void EsempioRef;

// ============================================================
// 11) Esempio browser (NON eseguito): montaggio finto
// ============================================================
// Esempio browser: questa funzione NON viene chiamata a runtime.
function esempioBrowser(): void {
  // Nel vero React: ReactDOM.createRoot(document.getElementById("root")!).render(<App/>);
  const root = document.getElementById("root");
  if (root) {
    root.textContent = "montato (finto)";
  }
}
void esempioBrowser;

// ============================================================
// 12) Export locali (solo simboli definiti in QUESTO file)
// ============================================================
export {
  Badge,
  BadgeFC,
  DipendenteCard,
  Pannello,
  TurnoLabel,
  StatoTimbratura,
  BarraRicerca,
  RigaDipendente,
  MiniDip,
  Lista,
  useState,
  useRef,
  createElement,
};

export type {
  ReactNode,
  ReactElement,
  FC,
  BadgeProps,
  DipendenteCardProps,
  PropsWithChildren,
  Ruolo,
  StatoTimbraturaProps,
  SetState,
  ChangeEvent,
  EventHandler,
  Dipendente,
  Timbratura,
  RefObject,
  ListaProps,
};

/*
 * ============================================================
 * RIEPILOGO COMANDI / CONCETTI
 * ============================================================
 * - React.FC<P>: alias per (props: P) => ReactElement; spesso sostituito
 *   da una semplice function con props tipizzate (piu' esplicito).
 * - Props: interface con campi obbligatori/opzionali (?), default via
 *   destructuring, children?: ReactNode.
 * - PropsWithChildren<P> = P & { children?: ReactNode }.
 * - Props readonly: bloccano la mutazione (le props sono immutabili).
 * - Discriminated union sulle props: un campo "kind/stato" abilita il
 *   narrowing con switch/case.
 * - useState<T>(initial): [T, SetState<T>]; T inferito dall'iniziale o
 *   forzato col generic (es. useState<number | null>(null)).
 * - SetState<T>: accetta T oppure (prev: T) => T (updater funzionale).
 * - Immutabilita' state: sempre nuovo oggetto ({ ...prev, campo }).
 * - Event types: ChangeEvent<HTMLInputElement>.target.value: string;
 *   MouseEvent, preventDefault(). React usa SyntheticEvent (qui MOCK).
 * - EventHandler<E> = (e: E) => void: comodo alias per props di callback.
 * - Lift state up: il figlio riceve onX(id) e non gestisce lo stato.
 * - Props derivate dal dominio: Pick / Omit / Partial sul model.
 * - Componente generico: function Comp<T>(props: Props<T>).
 * - useRef<T>(null): RefObject<T> con current: T | null (narrowing).
 * - Tipi != validazione runtime: usare regex (RE_ORARIO, RE_BADGE).
 * - tsc --strict, target ES2022, lib ES2022+DOM, noEmit.
 */
