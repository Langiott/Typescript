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





