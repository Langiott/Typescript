# 📘 Corso TypeScript 

Raccolta di **115 script didattici** in TypeScript moderno (target ES2022, `strict`).
Ogni file è autonomo, commentato in italiano e pensato per essere **verificato con `tsc --noEmit`** (non produce output runtime, ma type-check).
Il filo conduttore degli esempi è un **gestionale aziendale (ERP Polyuretech)**: `Dipendente`, `Timbratura`, `Reparto`, `Turno`, badge `UP-001`, turni `P4`/`P2`/`STD`, orari `"HH:MM"`.

---

## 🟢 PARTE 1 — Fondamenti dei tipi (file 001–030)

Il sistema di tipi di base: come TS controlla il codice prima dell'esecuzione.

| File | Argomento | In una riga |
|------|-----------|-------------|
| 001–003 | Introduzione, `tsconfig`, compilatore (`tsc`/`--watch`/`strict`) | Cos'è TS e come si compila |
| 004–007 | Tipi base, `any`/`unknown`/`never`, array/tuple, oggetti | I mattoni del type system |
| 008–014 | Type alias, interface, `type` vs `interface`, union, intersection, literal, enum | Modellare le forme dei dati |
| 015–019 | Funzioni, parametri opzionali/default, rest, call signatures, `void`/`never` | Tipizzare le funzioni |
| 020–026 | Inferenza, type assertion, narrowing, truthiness, discriminated union, `null`/`undefined`, optional chaining | Come TS restringe i tipi |
| 027–030 | `readonly`, index signature, `keyof`, `typeof` | Tipi da chiavi e strutture esistenti |

---

## 🟡 PARTE 2 — Classi e Generics (file 031–048)

| File | Argomento | In una riga |
|------|-----------|-------------|
| 031–040 | Classi, access modifier, `readonly`, getter/setter, `static`, classi astratte, ereditarietà, `implements`, parameter properties, `this` types | OOP tipizzata |
| 041–048 | Generics: intro, funzioni, constraint, classi, interfacce, default type param, `keyof` con generics, indexed access | Codice riutilizzabile e type-safe |

---

## 🟠 PARTE 3 — Moduli e librerie standard (file 049–060)

| File | Argomento | In una riga |
|------|-----------|-------------|
| 049–053 | Moduli, namespace, `.d.ts`, ambient declaration, `import type` | Organizzare e dichiarare i tipi |
| 054–060 | JSON tipizzato, array tipizzati, iterator/generator, error handling, `async`/`await`, `Date`, RegExp | Standard library con i tipi |

---

## 🔴 PARTE 4 — TypeScript avanzato (file 061–100)

Il cuore "Advanced": type-level programming e pattern professionali.

| File | Argomento | In una riga |
|------|-----------|-------------|
| 061–065 | Generics avanzati, conditional types, `infer`, mapped types, template literal types | Costruire tipi a partire da altri tipi |
| 066–069 | Utility types (built-in e ricorsivi), branded/nominal types | `Partial`/`Pick`/`Record`… e tipi "nominali" |
| 070–073 | Type guard/predicates, assertion functions, varianza, overload | Restringere e firmare con precisione |
| 074–080 | Decorator (+ metadata), mixin, module augmentation, declaration merging, `satisfies`, `const` assertion | Meta-programmazione sui tipi |
| 081–085 | Discriminated union avanzate, exhaustiveness check, generic factory, builder, `Result`/`Either` | Pattern di modellazione robusti |
| 086–093 | FP tipizzata, immutabilità, async patterns, event emitter, state machine, DI, repository, DTO mapping | Architettura type-safe |
| 094–100 | Validation schema, API client type-safe, flag `strict`, performance, pitfall comuni, design pattern, combo generics+`keyof`+mapped | Sintesi dei concetti avanzati |

---

## 🟣 PARTE 5 — Ecosistema e mondo reale (file 101–115)

| File | Argomento | In una riga |
|------|-----------|-------------|
| 101–105 | Tipi React, Node/Express, Prisma, env config tipizzato, testing dei tipi | TS nei framework reali |
| 106–110 | Migrazione JS→TS, JSDoc in `.js`, type-level programming, utility types "a mano", generics ricorsivi | Portare TS su codice esistente |
| 111–114 | `unknown`, narrowing avanzato, classi d'errore tipizzate, validazione input | Robustezza in produzione |
| 115 | **End-to-end ERP** | Mini-dominio che unisce union, branded id, repository, service, DTO e state machine |







