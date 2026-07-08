# JavaScript 

Raccolta di **126 script didattici** in JavaScript moderno (ES2020+), eseguibili con **Node.js**.
Ogni file è autonomo, commentato in italiano, con `console.log` che mostra l'**output atteso**.
Il filo conduttore degli esempi è un **gestionale aziendale (ERP Polyuretech)**: dipendenti, timbrature, reparti, turni, report.


---

## 🟢 Parte 1 — Fondamenti (001–047)

I mattoni del linguaggio.

| File | Argomento | In una riga |
|------|-----------|-------------|
| 001–006 | Introduzione, dove scrivere JS, output, statements, sintassi, commenti | Come si scrive ed esegue JavaScript |
| 007–009 | Variabili, `let`/`const`, tipi di dato | `var` vs `let`/`const`, primitivi vs oggetti |
| 010–013 | Operatori, aritmetica, assegnazione, confronto | `===` vs `==`, precedenze |
| 014–018 | Condizioni, `switch`, cicli `for`/`while`, `break`/`continue` | Controllo del flusso |
| 019–022 | Stringhe, metodi, ricerca, template literals | Manipolazione del testo |
| 023–026 | Numeri, metodi, `Math`, booleani | Calcoli e valori logici |
| 027–034 | Funzioni, parametri, arrow, closure, callback, HOF, ricorsione, IIFE | Il cuore della logica riutilizzabile |
| 035–041 | Oggetti, metodi, destructuring, spread, `this`, optional chaining, JSON | Strutture dati chiave |
| 042–047 | Scope, hoisting, strict mode, date e formattazione | Regole del linguaggio e gestione del tempo |

---

## 🟡 Parte 2 — Strutture dati e array (048–070)

| File | Argomento | In una riga |
|------|-----------|-------------|
| 048–049 | Array e loro metodi | Creazione e operazioni di base |
| 050–058 | `map`, `filter`, `reduce`, `find`, `sort`, `some`/`every`, `flatMap`, spread, destructuring | I metodi funzionali di uso quotidiano |
| 059–064 | `Set`, `Map`, `WeakMap`/`WeakSet`, iterables, generators, `Symbol` | Strutture avanzate e iterazione |
| 065–070 | Conversione tipi, RegExp, errori, error handling, debugging | Robustezza e strumenti |

---

## 🔵 Parte 3 — DOM e Browser (071–078)

> ⚠️ Riguardano il **browser**: API come `document` e `window` non esistono in Node puro.

| File | Argomento | In una riga |
|------|-----------|-------------|
| 071–076 | DOM: intro, selezione, manipolazione, creazione elementi, eventi, form | Interagire con la pagina |
| 077–078 | BOM (`window`), timer (`setTimeout`/`setInterval`) | Ambiente del browser e temporizzazione |

---

## 🔴 Parte 4 — JavaScript avanzato (079–114)

| File | Argomento | In una riga |
|------|-----------|-------------|
| 079–081 | Funzioni avanzate, closure, `this`/`bind` | Currying, memoization, module pattern, `call`/`apply`/`bind` |
| 082–085 | Prototipi, classi, ereditarietà, campi privati | OOP di JavaScript, dalla catena `[[Prototype]]` a `#campo` |
| 086–089 | Promise, `async`/`await`, pattern async, async iteration | Asincronia: stati, `try/catch`, sequenziale vs parallelo, `for await` |
| 090–091 | Moduli e pattern di modulo | `import`/`export`, barrel file, singleton |
| 092–095 | Destructuring/spread avanzati, immutabilità, FP | Copie vs mutazioni, pure function, composizione |
| 096–097 | Proxy e Reflect | Intercettare le operazioni sugli oggetti (meta-programmazione) |
| 098–100 | Getter/setter, property descriptor, TypedArray | Proprietà calcolate, `defineProperty`, buffer binari |
| 101–107 | DOM navigation, `window`, `fetch`, Storage, AJAX, JSON, Canvas | Le Web API del browser |
| 108–110 | Event loop, performance, design pattern | Microtask vs macrotask, ottimizzazione, pattern idiomatici |
| 111–112 | TypeScript: basics e generics | Primo assaggio di tipizzazione statica |
| 113–114 | Error handling professionale, validazione | Custom Error, pattern Result/Either, type guard e schema |
| 115 | Esempi pratici end-to-end | Caso ERP: ore da timbrature, badge, report per reparto |

---

## ⭐ Parte 5 — Approfondimenti avanzati (116–125)

Gli script più recenti, ognuno un caso reale da gestionale, verificati su Node 24.

| File | Argomento | Cosa mostra |
|------|-----------|-------------|
| 116 | **State Machine** | FSM per una richiesta ferie (`bozza → inviata → approvata/rifiutata → archiviata`): transizioni come unica fonte di verità, blocco di quelle illegali, audit trail immutabile |
| 117 | **Event Emitter** | Pattern publish/subscribe da zero: `on`/`off`/`once`/`emit`, unsubscribe via closure, disaccoppiamento produttore/consumatore |
| 118 | **Async Concurrency** | Sync di massa con rate limit: `all` vs `allSettled`, timeout con `race`, retry con backoff esponenziale, pool di concorrenza |
| 119 | **Pipeline Functional** | Da timbrature grezze a report per reparto: `pipe`/`compose`, currying, `groupBy` con `reduce`, immutabilità |
| 120 | **LRU Cache** | Cache Least Recently Used sfruttando l'ordine di inserimento della `Map`; memoizzazione e `hitRate` |
| 121 | **Node Core** | Moduli fondamentali: `fs`, `path`, `process` (`argv`, `env`), sincrono vs `fs/promises`, codici errore (`ENOENT`) |
| 122 | **Node Streams** | Elaborare dati a chunk a memoria costante: Buffer, `readline` su CSV, Transform stream, `pipeline()` e backpressure |
| 123 | **Intl Formatting** | Formattazione internazionale nativa: euro, date italiane, tempo relativo, `Collator`, `ListFormat` |
| 124 | **Node Testing** | Testing nativo con `node:test`/`node:assert`: `deepEqual`, `throws`, `mock.fn`, `beforeEach` |
| 125 | **AbortController** | Annullare operazioni async in modo pulito: `signal`, `AbortSignal.timeout`/`any`, pattern search-as-you-type |

---

## 🧭 Percorso consigliato per l'avanzato

1. **Asincronia** → 086 → 087 → 108 (event loop) → 118 (concorrenza) → 125 (abort)
2. **Funzionale** → 079 → 095 → 119 (pipeline) → 094 (immutabilità)
3. **OOP e meta** → 082 (prototipi) → 083–085 (classi) → 096–097 (proxy/reflect)
4. **Backend Node** → 121 (core) → 122 (streams) → 123 (Intl) → 124 (testing)
5. **Architettura** → 116 (state machine) → 117 (event emitter) → 120 (LRU cache) → 113 (error handling)

---

## 🗂️ Indice completo dei file

<details>
<summary>Espandi tutti i file</summary>

| # | File | Parte |
|---|------|-------|
| 000 | `000_TESTING.js` | Utility |
| 001 | `001_JS_Introduction.js` | Fondamenti |
| 002 | `002_JS_WhereTo.js` | Fondamenti |
| 003 | `003_JS_Output.js` | Fondamenti |
| 004 | `004_JS_Statements.js` | Fondamenti |
| 005 | `005_JS_Syntax.js` | Fondamenti |
| 006 | `006_JS_Comments.js` | Fondamenti |
| 007 | `007_JS_Variables.js` | Fondamenti |
| 008 | `008_JS_LetConst.js` | Fondamenti |
| 009 | `009_JS_DataTypes.js` | Fondamenti |
| 010 | `010_JS_Operators.js` | Fondamenti |
| 011 | `011_JS_Arithmetic.js` | Fondamenti |
| 012 | `012_JS_Assignment.js` | Fondamenti |
| 013 | `013_JS_Comparison.js` | Fondamenti |
| 014 | `014_JS_Conditions.js` | Fondamenti |
| 015 | `015_JS_Switch.js` | Fondamenti |
| 016 | `016_JS_Loops_For.js` | Fondamenti |
| 017 | `017_JS_Loops_While.js` | Fondamenti |
| 018 | `018_JS_Break_Continue.js` | Fondamenti |
| 019 | `019_JS_Strings.js` | Fondamenti |
| 020 | `020_JS_String_Methods.js` | Fondamenti |
| 021 | `021_JS_String_Search.js` | Fondamenti |
| 022 | `022_JS_Template_Literals.js` | Fondamenti |
| 023 | `023_JS_Numbers.js` | Fondamenti |
| 024 | `024_JS_Number_Methods.js` | Fondamenti |
| 025 | `025_JS_Math.js` | Fondamenti |
| 026 | `026_JS_Booleans.js` | Fondamenti |
| 027 | `027_JS_Functions.js` | Fondamenti |
| 028 | `028_JS_Function_Params.js` | Fondamenti |
| 029 | `029_JS_Arrow_Functions.js` | Fondamenti |
| 030 | `030_JS_Closures.js` | Fondamenti |
| 031 | `031_JS_Callbacks.js` | Fondamenti |
| 032 | `032_JS_HigherOrder.js` | Fondamenti |
| 033 | `033_JS_Recursion.js` | Fondamenti |
| 034 | `034_JS_IIFE.js` | Fondamenti |
| 035 | `035_JS_Objects.js` | Fondamenti |
| 036 | `036_JS_Object_Methods.js` | Fondamenti |
| 037 | `037_JS_Object_Destructuring.js` | Fondamenti |
| 038 | `038_JS_Object_Spread.js` | Fondamenti |
| 039 | `039_JS_This.js` | Fondamenti |
| 040 | `040_JS_Optional_Chaining.js` | Fondamenti |
| 041 | `041_JS_JSON.js` | Fondamenti |
| 042 | `042_JS_Scope.js` | Fondamenti |
| 043 | `043_JS_Hoisting.js` | Fondamenti |
| 044 | `044_JS_Strict_Mode.js` | Fondamenti |
| 045 | `045_JS_Dates.js` | Fondamenti |
| 046 | `046_JS_Date_Methods.js` | Fondamenti |
| 047 | `047_JS_Date_Formatting.js` | Fondamenti |
| 048 | `048_JS_Arrays.js` | Array & strutture dati |
| 049 | `049_JS_Array_Methods.js` | Array & strutture dati |
| 050 | `050_JS_Array_Map.js` | Array & strutture dati |
| 051 | `051_JS_Array_Filter.js` | Array & strutture dati |
| 052 | `052_JS_Array_Reduce.js` | Array & strutture dati |
| 053 | `053_JS_Array_Find.js` | Array & strutture dati |
| 054 | `054_JS_Array_Sort.js` | Array & strutture dati |
| 055 | `055_JS_Array_Some_Every.js` | Array & strutture dati |
| 056 | `056_JS_Array_FlatMap.js` | Array & strutture dati |
| 057 | `057_JS_Array_Spread.js` | Array & strutture dati |
| 058 | `058_JS_Array_Destructuring.js` | Array & strutture dati |
| 059 | `059_JS_Sets.js` | Array & strutture dati |
| 060 | `060_JS_Maps.js` | Array & strutture dati |
| 061 | `061_JS_WeakMap_WeakSet.js` | Array & strutture dati |
| 062 | `062_JS_Iterables.js` | Array & strutture dati |
| 063 | `063_JS_Generators.js` | Array & strutture dati |
| 064 | `064_JS_Symbols.js` | Array & strutture dati |
| 065 | `065_JS_TypeConversion.js` | Array & strutture dati |
| 066 | `066_JS_RegExp.js` | Array & strutture dati |
| 067 | `067_JS_RegExp_Methods.js` | Array & strutture dati |
| 068 | `068_JS_Errors.js` | Array & strutture dati |
| 069 | `069_JS_Error_Handling.js` | Array & strutture dati |
| 070 | `070_JS_Debugging.js` | Array & strutture dati |
| 071 | `071_JS_Dom_Intro.js` | DOM & Browser |
| 072 | `072_JS_Dom_Select.js` | DOM & Browser |
| 073 | `073_JS_Dom_Manipulation.js` | DOM & Browser |
| 074 | `074_JS_Dom_Create.js` | DOM & Browser |
| 075 | `075_JS_Dom_Events.js` | DOM & Browser |
| 076 | `076_JS_Dom_Forms.js` | DOM & Browser |
| 077 | `077_JS_BOM_Window.js` | DOM & Browser |
| 078 | `078_JS_Timers.js` | DOM & Browser |
| 079 | `079_JS_ADV_Functions.js` | Avanzato |
| 080 | `080_JS_ADV_Closures.js` | Avanzato |
| 081 | `081_JS_ADV_This_Bind.js` | Avanzato |
| 082 | `082_JS_ADV_Prototypes.js` | Avanzato |
| 083 | `083_JS_ADV_Classes.js` | Avanzato |
| 084 | `084_JS_ADV_Class_Inheritance.js` | Avanzato |
| 085 | `085_JS_ADV_Class_Private.js` | Avanzato |
| 086 | `086_JS_ADV_Async_Promises.js` | Avanzato |
| 087 | `087_JS_ADV_Async_AwaitAsync.js` | Avanzato |
| 088 | `088_JS_ADV_Async_Patterns.js` | Avanzato |
| 089 | `089_JS_ADV_Async_Iteration.js` | Avanzato |
| 090 | `090_JS_ADV_Modules.js` | Avanzato |
| 091 | `091_JS_ADV_Modules_Patterns.js` | Avanzato |
| 092 | `092_JS_ADV_Destructuring_Deep.js` | Avanzato |
| 093 | `093_JS_ADV_Spread_Rest_Deep.js` | Avanzato |
| 094 | `094_JS_ADV_Immutability.js` | Avanzato |
| 095 | `095_JS_ADV_FP.js` | Avanzato |
| 096 | `096_JS_ADV_Meta_Proxy.js` | Avanzato |
| 097 | `097_JS_ADV_Meta_Reflect.js` | Avanzato |
| 098 | `098_JS_ADV_Getters_Setters.js` | Avanzato |
| 099 | `099_JS_ADV_Descriptors.js` | Avanzato |
| 100 | `100_JS_ADV_TypedArrays.js` | Avanzato |
| 101 | `101_JS_ADV_DOM_Navigation.js` | Avanzato |
| 102 | `102_JS_ADV_Windows.js` | Avanzato |
| 103 | `103_JS_ADV_WebAPI_Fetch.js` | Avanzato |
| 104 | `104_JS_ADV_WebAPI_Storage.js` | Avanzato |
| 105 | `105_JS_ADV_AJAX.js` | Avanzato |
| 106 | `106_JS_ADV_JSON_Deep.js` | Avanzato |
| 107 | `107_JS_ADV_Graphics_Canvas.js` | Avanzato |
| 108 | `108_JS_ADV_EventLoop.js` | Avanzato |
| 109 | `109_JS_ADV_Performance.js` | Avanzato |
| 110 | `110_JS_ADV_DesignPatterns.js` | Avanzato |
| 111 | `111_JS_ADV_TS_Basics.js` | Avanzato |
| 112 | `112_JS_ADV_TS_Generics.js` | Avanzato |
| 113 | `113_JS_ADV_ErrorHandling_Pro.js` | Avanzato |
| 114 | `114_JS_ADV_Validation.js` | Avanzato |
| 115 | `115_JS_Examples_Practical.js` | Avanzato |
| 116 | `116_JS_ADV_StateMachine.js` | Approfondimenti |
| 117 | `117_JS_ADV_EventEmitter.js` | Approfondimenti |
| 118 | `118_JS_ADV_Async_Concurrency.js` | Approfondimenti |
| 119 | `119_JS_ADV_Pipeline_Functional.js` | Approfondimenti |
| 120 | `120_JS_ADV_LRU_Cache.js` | Approfondimenti |
| 121 | `121_JS_ADV_Node_Core.js` | Approfondimenti |
| 122 | `122_JS_ADV_Node_Streams.js` | Approfondimenti |
| 123 | `123_JS_ADV_Intl_Formatting.js` | Approfondimenti |
| 124 | `124_JS_ADV_Node_Testing.js` | Approfondimenti |
| 125 | `125_JS_ADV_AbortController.js` | Approfondimenti |

