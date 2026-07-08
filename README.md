# Corso JavaScript 

Raccolta di script didattici in JavaScript moderno (ES2020+), eseguibili con **Node.js**.
Ogni file è autonomo, commentato in italiano, con `console.log` che mostra l'**output atteso**.
Il filo conduttore degli esempi è un **gestionale aziendale (ERP)**: dipendenti, timbrature, reparti, report.

> **Come eseguire:** `node NN_nome_file.js`
> **Test (file 124):** `node --test 124_JS_ADV_Node_Testing.js`

---

## 🟢 PARTE 1 — Fondamenti (file 1–47)

I mattoni del linguaggio. Riassunto per gruppi:

| File | Argomento | In una riga |
|------|-----------|-------------|
| 1–6 | Introduzione, dove scrivere JS, output, statements, sintassi, commenti | Come si scrive ed esegue JavaScript |
| 7–9 | Variabili, `let`/`const`, tipi di dato | `var` vs `let`/`const`, primitivi vs oggetti |
| 10–13 | Operatori, aritmetica, assegnazione, confronto | `=== vs ==`, precedenze, operatori |
| 14–18 | Condizioni, `switch`, cicli `for`/`while`, `break`/`continue` | Controllo del flusso |
| 19–22 | Stringhe, metodi, ricerca, template literals | Manipolazione testo, `` `${...}` `` |
| 23–26 | Numeri, metodi, `Math`, booleani | Calcoli e valori logici |
| 27–34 | Funzioni, parametri, arrow, closure, callback, HOF, ricorsione, IIFE | Cuore della logica riutilizzabile |
| 35–41 | Oggetti, metodi, destructuring, spread, `this`, optional chaining, JSON | Strutture dati chiave |
| 42–47 | Scope, hoisting, strict mode, date e formattazione | Regole del linguaggio e tempo |

---

## 🟡 PARTE 2 — Strutture dati e array (file 48–70)

| File | Argomento | In una riga |
|------|-----------|-------------|
| 48–49 | Array e metodi | Creazione e operazioni base |
| 50–58 | `map`, `filter`, `reduce`, `find`, `sort`, `some`/`every`, `flatMap`, spread, destructuring | I metodi funzionali che userai ogni giorno |
| 59–64 | `Set`, `Map`, `WeakMap`/`WeakSet`, iterables, generators, `Symbol` | Strutture avanzate e iterazione |
| 65–70 | Conversione tipi, RegExp, errori, error handling, debugging | Robustezza e strumenti |

---

## 🔵 PARTE 3 — DOM e Browser (file 71–78)

| File | Argomento |
|------|-----------|
| 71–76 | DOM: intro, selezione, manipolazione, creazione elementi, eventi, form |
| 77–78 | BOM (`window`), timer (`setTimeout`/`setInterval`) |

> ⚠️ Questi file riguardano il **browser**: alcune API (`document`, `window`) non esistono in Node puro.

---

## 🔴 PARTE 4 — JavaScript AVANZATO (file 79–114)

Qui si entra nel serio. Dettaglio per file:

### Funzioni e closure di alto livello
- **79 · ADV Functions** — Currying, partial application, memoization, `compose`/`pipe`. Pattern per pipeline di trasformazione.
- **80 · ADV Closures** — Variabili private, module pattern, factory configurabili, contatori isolati.
- **81 · ADV This/Bind** — `call`, `apply`, `bind`; come `this` cambia nei vari contesti (il tranello classico di JS).

### Oggetti, prototipi, classi
- **82 · ADV Prototypes** — L'ereditarietà *vera* di JS: catena `[[Prototype]]`, `__proto__`, `Object.create`.
- **83 · ADV Classes** — Sintassi `class`, costruttori, metodi, `static`.
- **84 · ADV Class Inheritance** — `extends`, `super`, override dei metodi.
- **85 · ADV Class Private** — Campi privati `#campo`, incapsulamento reale.
- **98 · ADV Getters/Setters** — Proprietà calcolate, validazione in lettura/scrittura.
- **99 · ADV Descriptors** — `Object.defineProperty`: `writable`, `enumerable`, `configurable`.

### Asincronia (fondamentale)
- **86 · ADV Async Promises** — I 3 stati (pending/fulfilled/rejected), `then`/`catch`, `Promise.all`/`race`/`allSettled`.
- **87 · ADV Async/Await** — Sintassi `async`/`await`, `try/catch` asincrono.
- **88 · ADV Async Patterns** — Sequenziale vs parallelo, gestione errori, orchestrazione.
- **89 · ADV Async Iteration** — `for await...of`, async generators.
- **108 · ADV Event Loop** — 🌟 Call stack, **microtask** (Promise) vs **macrotask** (setTimeout), l'ordine di esecuzione.

### Moduli e organizzazione
- **90 · ADV Modules** — `import`/`export`, named vs default.
- **91 · ADV Modules Patterns** — Barrel files, singleton, incapsulamento a modulo.

### Programmazione funzionale e immutabilità
- **92 · ADV Destructuring Deep** — Nested, default, alias, rest nei parametri.
- **93 · ADV Spread/Rest Deep** — Copie, merge, argomenti variabili.
- **94 · ADV Immutability** — Copie invece di mutazioni (base di React/Redux), `Object.freeze`.
- **95 · ADV FP** — Pure functions, composizione, currying, stile point-free.

### Meta-programmazione
- **96 · ADV Proxy** — Intercettare operazioni su oggetti (trap `get`/`set`/`has`...).
- **97 · ADV Reflect** — API companion di Proxy per operazioni di default.

### Performance ed errori pro
- **109 · ADV Performance** — Misurare, ottimizzare, evitare colli di bottiglia.
- **110 · ADV Design Patterns** — Pattern creazionali/strutturali idiomatici in JS.
- **113 · ADV Error Handling Pro** — Custom Error classes (`status`, `code`), pattern **Result/Either**, retry con backoff.
- **114 · ADV Validation** — Guard functions, type guards, schema validation manuale.

### TypeScript e Web API
- **111–112 · ADV TS** — Basics e Generics di TypeScript.
- **100–107 · ADV Web** — TypedArrays, DOM navigation, `fetch`, Storage, AJAX, JSON deep, Canvas.
- **115 · Examples Practical** — Caso end-to-end: calcolo ore da timbrature, badge, report per reparto.

---

## ⭐ PARTE 5 — Approfondimenti avanzati recenti (file 116–125)

Gli script più recenti, con **casi reali da gestionale** e verificati (girano su Node 24).

### 116 · ADV State Machine 🔧
Macchina a stati finiti (FSM) per il ciclo di vita di una **richiesta ferie** (`bozza → inviata → approvata/rifiutata → archiviata`).
**Concetti:** mappa delle transizioni come unica fonte di verità · blocco delle transizioni illegali · closure per incapsulare lo stato · **audit trail immutabile** · dry-run funzionale per validare un percorso senza effetti.

### 117 · ADV Event Emitter 📡
Pattern **publish/subscribe** costruito da zero (come `events` di Node, `addEventListener` del DOM, Redux, RxJS).
**Concetti:** `on`/`off`/`once`/`emit` · `on()` ritorna un *unsubscribe* (closure) · un listener che lancia **non blocca gli altri** · `Map<string, Set<fn>>` per evitare duplicati · **disaccoppiamento** produttore/consumatore.

### 118 · ADV Async Concurrency ⚡
Controllo della concorrenza async per un **sync di massa** (es. 100 dipendenti verso un server con rate limit).
**Concetti:** `Promise.all` (tutto-o-niente) vs **`allSettled`** (report completo) · **timeout** con `Promise.race` · **retry con backoff esponenziale** (20→40→80ms) · **pool di concorrenza** (max N richieste in parallelo con "operai").

### 119 · ADV Pipeline Functional 🔗
Pipeline di trasformazione dati in stile funzionale: da timbrature grezze a **report per reparto**.
**Concetti:** `pipe`/`compose` · **currying** (`filterBy`, `groupBy` preconfigurati) · **pure functions** come mattoncini · immutabilità (spread/map) · `groupBy` con `reduce` · una pipeline è una funzione riusabile su qualsiasi dato.

### 120 · ADV LRU Cache 🗃️
Cache **Least Recently Used**: quando è piena, sfratta l'elemento usato meno di recente.
**Concetti:** la `Map` **ricorda l'ordine di inserimento** (base del trucco) · "promuovere" = `delete` + `set` · la prima chiave è sempre la LRU · **memoizzazione** di funzioni costose (query DB) · statistiche `hitRate`.

### 121 · ADV Node Core 🖥️
I moduli fondamentali di **Node.js**: `fs`, `path`, `process`.
**Concetti:** `process` (`version`, `platform`, `cwd`, **`argv`** per la CLI, **`env`** per la config) · `path` per percorsi **portabili** (Windows/Linux) · `fs` **sincrono** (blocca → solo per script) vs **`fs/promises`** (non blocca → per i server) · errori con `.code` (`ENOENT`) · codici di uscita (0 = ok).

### 122 · ADV Node Streams 🌊
**Stream**: elaborare dati a "pezzi" (chunk) a **memoria costante**, anche su file da GB.
**Concetti:** perché lo streaming batte `readFile` su file enormi · **Buffer** (i byte grezzi, UTF-8) · `readline` + `for await` per leggere **CSV riga per riga** · **Transform** stream (modifica i dati in transito, `objectMode`) · `pipeline()` gestisce errori, chiusura e **backpressure**.

### 123 · ADV Intl Formatting 🌍
`Intl`: formattazione internazionale **nativa** (niente moment/date-fns).
**Concetti:** `NumberFormat` per **euro** (`1.234,56 €`), percentuali, unità · `DateTimeFormat` per **date italiane** (7 luglio 2026, formato 24h) · `RelativeTimeFormat` ("ieri", "tra 2 ore") · **`Collator`** per ordinare testo con accenti come un umano · `ListFormat` ("Mario, Anna e Luca") · crea il formatter **una volta** e riusalo.

### 124 · ADV Node Testing ✅
Testing **nativo** con `node:test` e `node:assert` (zero librerie).
**Concetti:** `test`/`describe`/`it` · `assert.equal` (usa `===`) vs **`assert.deepEqual`** (confronta il *contenuto*, non l'identità) · **`assert.throws`** per verificare che il codice fallisca quando deve · **`mock.fn`** per sostituire dipendenze e tracciare chiamate · `beforeEach` per stato pulito.
> Lancialo con: `node --test 124_JS_ADV_Node_Testing.js`

### 125 · ADV AbortController 🛑
Annullare operazioni asincrone in modo pulito.
**Concetti:** `AbortController` (telecomando) + `signal` (ricevitore) · l'operazione deve **ascoltare** il signal e liberare le risorse · `AbortError` come errore convenzionale · **`AbortSignal.timeout(ms)`** (auto-abort) · **`AbortSignal.any([...])`** (combina più signal) · pattern **search-as-you-type** (una nuova richiesta annulla la precedente) · stesso meccanismo di `fetch(url, { signal })`.

---

## 🧭 Percorso consigliato per l'avanzato

Se vuoi consolidare il livello avanzato, un ordine sensato:

1. **Asincronia** → 86 → 87 → 108 (event loop) → 118 (concorrenza) → 125 (abort)
2. **Funzionale** → 79 → 95 → 119 (pipeline) → 94 (immutabilità)
3. **OOP e meta** → 82 (prototypes) → 83–85 (classi) → 96–97 (proxy/reflect)
4. **Backend Node** → 121 (core) → 122 (streams) → 123 (Intl) → 124 (testing)
5. **Architettura** → 116 (state machine) → 117 (event emitter) → 120 (LRU cache) → 113 (error handling)

---

## 📌 Note

- Tutti gli esempi sono **eseguibili** e verificati su **Node.js v24**.
- Nessuna dipendenza esterna: solo JavaScript e moduli core di Node.
- Dominio ricorrente: **gestionale/ERP** (dipendenti, timbrature, reparti) per esempi concreti.
