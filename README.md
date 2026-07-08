# Typescript

Raccolta di **115 script didattici** in TypeScript moderno (target ES2022, `strict`).
Ogni file è autonomo, commentato in italiano e pensato per essere **verificato con `tsc --noEmit`** (non produce output runtime, ma type-check).
Il filo conduttore degli esempi è un **gestionale aziendale (ERP Polyuretech)**: `Dipendente`, `Timbratura`, `Reparto`, `Turno`, badge `UP-001`, turni `P4`/`P2`/`STD`, orari `"HH:MM"`.

> **Come verificare un file:** `npx tsc --noEmit NN_nome_file.ts`
> **Verificare tutto il progetto:** `npx tsc` (usa il [tsconfig.json](tsconfig.json) — `strict: true`, `noEmit: true`)

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

---

## 🗂️ Indice completo dei file

<details>
<summary>Espandi tutti i 115 file</summary>

| # | File | Sezione |
|---|------|---------|
| 001 | `001_TS_Introduction.ts` | Fondamenti |
| 002 | `002_TS_Setup_tsconfig.ts` | Fondamenti |
| 003 | `003_TS_Compiler_tsc_watch_strict.ts` | Fondamenti |
| 004 | `004_TS_Basic_Types.ts` | Fondamenti |
| 005 | `005_TS_any_unknown_never.ts` | Fondamenti |
| 006 | `006_TS_Arrays_Tuples.ts` | Fondamenti |
| 007 | `007_TS_Objects.ts` | Fondamenti |
| 008 | `008_TS_Type_Aliases.ts` | Fondamenti |
| 009 | `009_TS_Interfaces.ts` | Fondamenti |
| 010 | `010_TS_Type_vs_Interface.ts` | Fondamenti |
| 011 | `011_TS_Union_Types.ts` | Fondamenti |
| 012 | `012_TS_Intersection_Types.ts` | Fondamenti |
| 013 | `013_TS_Literal_Types.ts` | Fondamenti |
| 014 | `014_TS_Enums.ts` | Fondamenti |
| 015 | `015_TS_Functions.ts` | Fondamenti |
| 016 | `016_TS_Optional_Default_Params.ts` | Fondamenti |
| 017 | `017_TS_Rest_Params_Tuples.ts` | Fondamenti |
| 018 | `018_TS_Function_Types_Call_Signatures.ts` | Fondamenti |
| 019 | `019_TS_void_never_returns.ts` | Fondamenti |
| 020 | `020_TS_Type_Inference.ts` | Fondamenti |
| 021 | `021_TS_Type_Assertions.ts` | Fondamenti |
| 022 | `022_TS_Type_Narrowing.ts` | Fondamenti |
| 023 | `023_TS_Truthiness_Narrowing.ts` | Fondamenti |
| 024 | `024_TS_Discriminated_Unions.ts` | Fondamenti |
| 025 | `025_TS_null_undefined.ts` | Fondamenti |
| 026 | `026_TS_Optional_Chaining_Nullish.ts` | Fondamenti |
| 027 | `027_TS_readonly.ts` | Fondamenti |
| 028 | `028_TS_Index_Signatures.ts` | Fondamenti |
| 029 | `029_TS_keyof.ts` | Fondamenti |
| 030 | `030_TS_typeof_operator.ts` | Fondamenti |
| 031 | `031_TS_Classes.ts` | Classi & Generics |
| 032 | `032_TS_Access_Modifiers.ts` | Classi & Generics |
| 033 | `033_TS_readonly_fields.ts` | Classi & Generics |
| 034 | `034_TS_Getters_Setters.ts` | Classi & Generics |
| 035 | `035_TS_Static_Members.ts` | Classi & Generics |
| 036 | `036_TS_Abstract_Classes.ts` | Classi & Generics |
| 037 | `037_TS_Inheritance_super.ts` | Classi & Generics |
| 038 | `038_TS_Implements_Interface.ts` | Classi & Generics |
| 039 | `039_TS_Parameter_Properties.ts` | Classi & Generics |
| 040 | `040_TS_this_types.ts` | Classi & Generics |
| 041 | `041_TS_Generics_Intro.ts` | Classi & Generics |
| 042 | `042_TS_Generic_Functions.ts` | Classi & Generics |
| 043 | `043_TS_Generic_Constraints.ts` | Classi & Generics |
| 044 | `044_TS_Generic_Classes.ts` | Classi & Generics |
| 045 | `045_TS_Generic_Interfaces.ts` | Classi & Generics |
| 046 | `046_TS_Default_Type_Params.ts` | Classi & Generics |
| 047 | `047_TS_keyof_Generics.ts` | Classi & Generics |
| 048 | `048_TS_Indexed_Access_Types.ts` | Classi & Generics |
| 049 | `049_TS_Modules.ts` | Moduli & stdlib |
| 050 | `050_TS_Namespaces.ts` | Moduli & stdlib |
| 051 | `051_TS_Declaration_Files.ts` | Moduli & stdlib |
| 052 | `052_TS_Ambient_Declarations.ts` | Moduli & stdlib |
| 053 | `053_TS_Type_Only_Imports.ts` | Moduli & stdlib |
| 054 | `054_TS_Working_With_JSON.ts` | Moduli & stdlib |
| 055 | `055_TS_Arrays_Methods_Typed.ts` | Moduli & stdlib |
| 056 | `056_TS_Iterators_Generators.ts` | Moduli & stdlib |
| 057 | `057_TS_Error_Handling_Typed.ts` | Moduli & stdlib |
| 058 | `058_TS_Async_Await_Typed.ts` | Moduli & stdlib |
| 059 | `059_TS_Working_With_Date.ts` | Moduli & stdlib |
| 060 | `060_TS_Regex_Typed.ts` | Moduli & stdlib |
| 061 | `061_TS_ADV_Generics_Deep.ts` | Avanzato |
| 062 | `062_TS_ADV_Conditional_Types.ts` | Avanzato |
| 063 | `063_TS_ADV_infer.ts` | Avanzato |
| 064 | `064_TS_ADV_Mapped_Types.ts` | Avanzato |
| 065 | `065_TS_ADV_Template_Literal_Types.ts` | Avanzato |
| 066 | `066_TS_ADV_Utility_Types_1.ts` | Avanzato |
| 067 | `067_TS_ADV_Utility_Types_2.ts` | Avanzato |
| 068 | `068_TS_ADV_Recursive_Types.ts` | Avanzato |
| 069 | `069_TS_ADV_Branded_Nominal.ts` | Avanzato |
| 070 | `070_TS_ADV_Type_Guards_Predicates.ts` | Avanzato |
| 071 | `071_TS_ADV_Assertion_Functions.ts` | Avanzato |
| 072 | `072_TS_ADV_Variance.ts` | Avanzato |
| 073 | `073_TS_ADV_Overloads.ts` | Avanzato |
| 074 | `074_TS_ADV_Decorators.ts` | Avanzato |
| 075 | `075_TS_ADV_Decorator_Metadata.ts` | Avanzato |
| 076 | `076_TS_ADV_Mixins.ts` | Avanzato |
| 077 | `077_TS_ADV_Module_Augmentation.ts` | Avanzato |
| 078 | `078_TS_ADV_Declaration_Merging.ts` | Avanzato |
| 079 | `079_TS_ADV_satisfies.ts` | Avanzato |
| 080 | `080_TS_ADV_const_assertions.ts` | Avanzato |
| 081 | `081_TS_ADV_Discriminated_Unions_Adv.ts` | Avanzato |
| 082 | `082_TS_ADV_Exhaustiveness_Check.ts` | Avanzato |
| 083 | `083_TS_ADV_Generic_Factories.ts` | Avanzato |
| 084 | `084_TS_ADV_Builder_Pattern.ts` | Avanzato |
| 085 | `085_TS_ADV_Result_Either.ts` | Avanzato |
| 086 | `086_TS_ADV_FP_Typed.ts` | Avanzato |
| 087 | `087_TS_ADV_Immutability.ts` | Avanzato |
| 088 | `088_TS_ADV_Async_Patterns.ts` | Avanzato |
| 089 | `089_TS_ADV_Event_Emitter.ts` | Avanzato |
| 090 | `090_TS_ADV_State_Machine.ts` | Avanzato |
| 091 | `091_TS_ADV_Dependency_Injection.ts` | Avanzato |
| 092 | `092_TS_ADV_Repository_Pattern.ts` | Avanzato |
| 093 | `093_TS_ADV_DTO_Mapping.ts` | Avanzato |
| 094 | `094_TS_ADV_Validation_Schema.ts` | Avanzato |
| 095 | `095_TS_ADV_Type_Safe_API_Client.ts` | Avanzato |
| 096 | `096_TS_ADV_tsconfig_strict_flags.ts` | Avanzato |
| 097 | `097_TS_ADV_Performance_Complexity.ts` | Avanzato |
| 098 | `098_TS_ADV_Common_Pitfalls.ts` | Avanzato |
| 099 | `099_TS_ADV_Design_Patterns.ts` | Avanzato |
| 100 | `100_TS_ADV_Generics_keyof_Mapped_Combo.ts` | Avanzato |
| 101 | `101_TS_React_Types.ts` | Ecosistema |
| 102 | `102_TS_Node_Express.ts` | Ecosistema |
| 103 | `103_TS_Prisma_Types.ts` | Ecosistema |
| 104 | `104_TS_Typed_Env_Config.ts` | Ecosistema |
| 105 | `105_TS_Testing_Types.ts` | Ecosistema |
| 106 | `106_TS_Migrating_JS_TS.ts` | Ecosistema |
| 107 | `107_TS_JSDoc_in_JS.ts` | Ecosistema |
| 108 | `108_TS_Type_Level_Programming.ts` | Ecosistema |
| 109 | `109_TS_Utility_Types_Manual.ts` | Ecosistema |
| 110 | `110_TS_Recursive_Generics_Adv.ts` | Ecosistema |
| 111 | `111_TS_Working_With_unknown.ts` | Ecosistema |
| 112 | `112_TS_Narrowing_Advanced.ts` | Ecosistema |
| 113 | `113_TS_Error_Classes_Typed.ts` | Ecosistema |
| 114 | `114_TS_Input_Validation_Typed.ts` | Ecosistema |
| 115 | `115_TS_End_To_End_ERP.ts` | Ecosistema |

</details>

---

## ℹ️ Note

- **Convenzione nomi:** `NNN_TS_Argomento.ts` (numero progressivo + prefisso `TS` + tema). Il prefisso `ADV_` indica la sezione avanzata.
- **Dominio esempi:** ERP Polyuretech — gli stessi tipi (`Dipendente`, `Timbratura`, `Reparto`…) ricorrono in tutto il corso per mostrare i concetti su un caso reale.
- **Compilazione:** i file usano `strict: true` e `noEmit: true`; servono a essere **type-checkati**, non eseguiti.
- Vedi anche il [Corso JavaScript](../Javascript/README.md) come base propedeutica.
