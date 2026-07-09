/**
 * 105_TS_Testing_Types.ts
 * Testing types (test a livello di tipo, non a runtime).
 * Impariamo a scrivere "type-level tests": helper Expect/Equal, expectType,
 * assert basati su conditional types e a testare le utility ERP (Dipendente,
 * Timbratura, Reparto, Turno, ruoli, badge "UP-001", orario "HH:MM").
 * Livello: ECOSYSTEM/EXTRA. Il file compila con tsc --strict, noEmit.
 */

// ============================================================================
// 1) L'IDEA: testare i tipi a compile-time
// ============================================================================
// I test tradizionali (Jest/Vitest) girano a runtime e verificano VALORI.
// I "type-level tests" verificano TIPI: se il tipo e' sbagliato, tsc fallisce.
// Non serve alcuna libreria: bastano conditional types e un po' di disciplina.
// Il pattern e' quello usato da librerie come "tsd" o "expect-type".

// Helper base: forza a compile-time che T sia esattamente `true`.
type Expect<T extends true> = T;

// Se scrivi Expect<false> ottieni un errore di tipo:
// ERRORE TS: Type 'false' does not satisfy the constraint 'true'.
// type _Fallisce = Expect<false>;

// ============================================================================
// 2) Equal<A, B>: uguaglianza STRETTA tra due tipi
// ============================================================================
// Il trucco classico (usato in "type-challenges"): due funzioni generiche
// identiche sono assegnabili solo se A e B sono ESATTAMENTE lo stesso tipo.
// Questo distingue anche `any` da `unknown` e da tipi con readonly diversi.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

// Uguaglianza rilassata (assignability nei due versi). Utile ma NON distingue
// tutti i casi limite (es. any). La teniamo per confronto didattico.
type Equivalent<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;

// Prove veloci:
type _Eq1 = Expect<Equal<string, string>>; // ok
type _Eq2 = Expect<Equal<{ a: 1 }, { a: 1 }>>; // ok
// ERRORE TS: Type 'false' does not satisfy the constraint 'true'.
// type _Eq3 = Expect<Equal<string, number>>;

// Equal e' piu' severo di Equivalent con `any`:
type _AnyVsUnknown = Equal<any, unknown>; // => false (li distingue!)
type _AnyEquiv = Equivalent<any, unknown>; // => true (li confonde)

// ============================================================================
// 3) NotEqual, Extends, IsAny, IsNever: mattoncini di supporto
// ============================================================================
type NotEqual<A, B> = Equal<A, B> extends true ? false : true;

// Extends<A, B>: A e' assegnabile a B?
type Extends<A, B> = [A] extends [B] ? true : false;

// IsAny sfrutta il fatto che `any` "assorbe" ogni intersezione/estensione.
type IsAny<T> = 0 extends 1 & T ? true : false;

// IsNever: never non e' distribuibile, va isolato in tupla.
type IsNever<T> = [T] extends [never] ? true : false;

type _NotEq = Expect<NotEqual<string, number>>; // ok
type _Ext1 = Expect<Extends<'UP-001', string>>; // ok
type _IsAny = Expect<IsAny<any>>; // ok
type _IsNotAny = Expect<Equal<IsAny<string>, false>>; // ok
type _IsNever = Expect<IsNever<never>>; // ok

// ============================================================================
// 4) expectType: assert a livello di tipo su un VALORE inferito
// ============================================================================
// A volte hai un valore e vuoi "fissare" il suo tipo inferito. La funzione
// non fa nulla a runtime: serve solo a far scattare tsc se il tipo cambia.
// Firma: expectType<Atteso>()(valore) accetta solo se typeof valore === Atteso.
function expectType<Expected>() {
  return <Actual>(_actual: Equal<Expected, Actual> extends true ? Actual : never): void => {
    // no-op: il controllo e' tutto nella firma
  };
}

// Uso: il badge inferito e' `string`
const badgeInferito = 'UP-001';
expectType<string>()(badgeInferito); // ok

// Se ti aspetti un literal ma ottieni string, l'assert fallisce:
// ERRORE TS: Argument of type 'string' is not assignable to parameter of type 'never'.
// expectType<'UP-001'>()(badgeInferito);

// Con `as const` il literal viene preservato:
const badgeLiteral = 'UP-001' as const;
expectType<'UP-001'>()(badgeLiteral); // ok

// ============================================================================
// 5) assertType inline via conditional (variante "assert nella dichiarazione")
// ============================================================================
// Un pattern compatto: dichiara una costante il cui tipo forza il check.
// AssertEqual<A,B> vale `A` se A==B, altrimenti `never` -> rompe l'assegnazione.
type AssertEqual<A, B> = Equal<A, B> extends true ? A : never;

// Esempio: verifichiamo che l'union dei ruoli sia esattamente quella attesa.
type RuoloAtteso = 'SuperAdmin' | 'Admin' | 'Operatore' | 'QrDisplay';
const _ruoli: AssertEqual<Ruolo, RuoloAtteso> = 'Admin'; // ok se Ruolo == atteso
void _ruoli;

// ============================================================================
// 6) DOMINIO ERP: i tipi che vogliamo testare
// ============================================================================
type Ruolo = 'SuperAdmin' | 'Admin' | 'Operatore' | 'QrDisplay';
type Turno = 'P4' | 'P2' | 'STD';

// Orario naive-UTC in formato "HH:MM" (validazione a runtime: /^\d{2}:\d{2}$/).
type Orario = `${number}:${number}`; // approssimazione a livello di tipo
// Badge "UP-001": template literal type che vincola il prefisso.
type Badge = `UP-${number}`;

interface Reparto {
  id: number;
  nome: string;
  turno: Turno;
}

interface Dipendente {
  id: number;
  nome: string;
  badge: Badge;
  ruolo: Ruolo;
  repartoId: number;
}

interface Timbratura {
  dipendenteId: number;
  entrata: Orario; // "08:00"
  uscita: Orario | null; // null se turno aperto
}

// Test rapidi sui template literal type:
type _BadgeOk = Expect<Extends<'UP-001', Badge>>; // ok
type _BadgeKo = Expect<Equal<Extends<'X-001', Badge>, false>>; // ok
type _OrarioOk = Expect<Extends<'08:30', Orario>>; // ok

// ============================================================================
// 7) TESTARE UTILITY GENERICHE SU TIPI ERP
// ============================================================================
// Utility 1: rendere opzionali solo alcune chiavi (per le PATCH parziali).
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Ci aspettiamo che uscita e entrata diventino opzionali, dipendenteId no.
type TimbraturaPatch = PartialBy<Timbratura, 'entrata' | 'uscita'>;
type _PatchTest = Expect<
  Equal<
    TimbraturaPatch,
    { dipendenteId: number } & { entrata?: Orario; uscita?: Orario | null }
  >
>; // ok

// Utility 2: estrarre le chiavi di un certo tipo (es. tutte le chiavi string).
type KeysOfType<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never;
}[keyof T];

type _ChiaviStringaDip = Expect<
  Equal<KeysOfType<Dipendente, string>, 'nome' | 'badge' | 'ruolo'>
>;
// Nota: `badge` (`UP-${number}`) e `ruolo` (union di string literal) estendono
// entrambi `string`, quindi rientrano insieme a `nome`. ok
type _ChiaviNumeriche = Expect<Equal<KeysOfType<Dipendente, number>, 'id' | 'repartoId'>>;

// Utility 3: DeepReadonly (immutabilita' ricorsiva delle entita' ERP).
type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

type RepartoRO = DeepReadonly<Reparto>;
type _RO = Expect<
  Equal<RepartoRO, { readonly id: number; readonly nome: string; readonly turno: Turno }>
>; // ok

// Utility 4: type guard testabile. La funzione e' runtime, ma il suo effetto
// di narrowing e' verificabile a livello di tipo con `infer` sul predicato.
function isSuperAdmin(d: Dipendente): d is Dipendente & { ruolo: 'SuperAdmin' } {
  return d.ruolo === 'SuperAdmin';
}
// Estraiamo il tipo "narrowed" dal predicato per testarlo:
type Narrowed<F> = F extends (x: any) => x is infer R ? R : never;
type _GuardTest = Expect<
  Equal<Narrowed<typeof isSuperAdmin>, Dipendente & { ruolo: 'SuperAdmin' }>
>; // ok

// ============================================================================
// 8) TESTARE FUNZIONI: parametri e valore di ritorno
// ============================================================================
// Funzione ERP che calcola i minuti lavorati tra due orari "HH:MM".
function minutiLavorati(entrata: Orario, uscita: Orario): number {
  const [eh, em] = entrata.split(':').map(Number);
  const [uh, um] = uscita.split(':').map(Number);
  return uh * 60 + um - (eh * 60 + em);
}

// Testiamo la firma con ReturnType e Parameters (utility built-in).
type _Ret = Expect<Equal<ReturnType<typeof minutiLavorati>, number>>; // ok
type _Par = Expect<Equal<Parameters<typeof minutiLavorati>, [Orario, Orario]>>; // ok

// Se qualcuno cambiasse il ritorno a string, questo test scatterebbe:
// ERRORE TS: Type 'false' does not satisfy the constraint 'true'.
// type _RetKo = Expect<Equal<ReturnType<typeof minutiLavorati>, string>>;

// ============================================================================
// 9) TESTARE TIPI DISCRIMINATI (union con tag) - eventi ERP
// ============================================================================
type EventoTimbratura =
  | { tipo: 'ENTRATA'; dipendenteId: number; ora: Orario }
  | { tipo: 'USCITA'; dipendenteId: number; ora: Orario }
  | { tipo: 'PAUSA'; dipendenteId: number; durataMin: number };

// Estrarre un membro dell'union per tag e testarne la forma.
type SoloPausa = Extract<EventoTimbratura, { tipo: 'PAUSA' }>;
type _PausaTest = Expect<
  Equal<SoloPausa, { tipo: 'PAUSA'; dipendenteId: number; durataMin: number }>
>; // ok

// Verificare l'esaustivita': se aggiungi un tag e non lo gestisci, `never` salta.
function descriviEvento(e: EventoTimbratura): string {
  switch (e.tipo) {
    case 'ENTRATA':
      return `Entrata ${e.ora}`;
    case 'USCITA':
      return `Uscita ${e.ora}`;
    case 'PAUSA':
      return `Pausa ${e.durataMin}m`;
    default: {
      // Se l'union cresce, `e` non e' piu' `never` e questa riga fallisce.
      const _exhaustive: never = e;
      return _exhaustive;
    }
  }
}
void descriviEvento;

// ============================================================================
// 10) CASI LIMITE DA CONOSCERE (perche' i test di tipo a volte "mentono")
// ============================================================================
// (a) `any` inquina: Equivalent lo confonde, Equal no. Preferisci Equal.
type _TrapAny = Expect<Equal<IsAny<Dipendente>, false>>; // ok, non e' any

// (b) Ottici opzionali vs `| undefined`: NON sono lo stesso tipo con Equal.
type ConOpzionale = { x?: number };
type ConUndefined = { x: number | undefined };
type _OptDiff = Expect<NotEqual<ConOpzionale, ConUndefined>>; // ok, diversi

// (c) readonly conta: array mutabile != ReadonlyArray.
type _ReadonlyConta = Expect<NotEqual<number[], readonly number[]>>; // ok

// (d) Tuple vs array: [number, number] != number[].
type _TuplaConta = Expect<NotEqual<[number, number], number[]>>; // ok

// (e) never come "test fallito": una utility che torna never va SEMPRE testata
// con IsNever, altrimenti Equal<..., never> puo' dare risultati sorprendenti.
type _NeverCheck = Expect<IsNever<Extract<Ruolo, 'Inesistente'>>>; // ok

// ============================================================================
// 11) MINI "SUITE" DI TEST RAGGRUPPATA (pattern organizzativo)
// ============================================================================
// Raggruppare i test in una tupla di `true` rende evidente il fallimento:
// se un elemento non e' `true`, l'intero tipo `Suite` non estende `true[]`.
type Suite = [
  Expect<Equal<Ruolo, RuoloAtteso>>,
  Expect<Extends<'UP-007', Badge>>,
  Expect<Equal<ReturnType<typeof minutiLavorati>, number>>,
  Expect<Equal<KeysOfType<Dipendente, number>, 'id' | 'repartoId'>>,
  Expect<IsNever<Extract<Turno, 'P9'>>>,
];
// Prova d'uso: se la Suite compila, i test passano.
type _SuiteOk = Expect<Equal<Suite extends true[] ? true : false, true>>; // ok

// ============================================================================
// 12) EXPORT dei simboli utili (solo simboli definiti in QUESTO file)
// ============================================================================
export { expectType, isSuperAdmin, minutiLavorati, descriviEvento };
export type {
  Expect,
  Equal,
  NotEqual,
  Equivalent,
  Extends,
  IsAny,
  IsNever,
  AssertEqual,
  PartialBy,
  KeysOfType,
  DeepReadonly,
  Narrowed,
  Ruolo,
  Turno,
  Orario,
  Badge,
  Reparto,
  Dipendente,
  Timbratura,
  EventoTimbratura,
};

// ============================================================================
// RIEPILOGO COMANDI / CONCETTI
// ============================================================================
// - Type-level test: verifiche a compile-time, tsc fallisce se il tipo e' errato.
// - Expect<T extends true>: forza un tipo a essere `true`.
// - Equal<A,B>: uguaglianza STRETTA (distingue any/unknown/readonly/opzionali).
// - Equivalent<A,B>: assignability bidirezionale (piu' lasca, confonde any).
// - NotEqual / Extends / IsAny / IsNever: mattoncini di supporto.
// - expectType<Expected>()(valore): assert sul tipo inferito di un valore.
// - AssertEqual<A,B>: pattern "assert nella dichiarazione" (never se diverso).
// - ReturnType / Parameters: testare firma di funzioni.
// - Extract / Omit / Pick / Partial: testare union discriminate e PATCH.
// - Esaustivita': `const _e: never = x` nel default dello switch.
// - Trappole: any inquina, opzionale != undefined, readonly conta, tupla != array.
// - Suite: tupla di Expect<...> per raggruppare i test.
// - Nessuna libreria: pattern ispirato a tsd / expect-type / type-challenges.
