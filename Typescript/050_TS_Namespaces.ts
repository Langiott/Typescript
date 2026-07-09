/**
 * File 050 - TS Namespaces
 * Corso TypeScript - livello INTERMEDIATE
 * Argomento: Namespaces (namespace, export interno, nested namespace),
 * quando usarli (codice legacy / global scripts) rispetto ai moduli ES,
 * e un esempio ERP con ERP.Timbrature per organizzare tipi e funzioni.
 * Nota: i namespace sono un costrutto storico di TS; oggi si preferiscono i moduli.
 */

// ---------------------------------------------------------------------------
// 1) COS'E' UN NAMESPACE
// ---------------------------------------------------------------------------
// Un namespace e' un contenitore con nome che raggruppa tipi, funzioni e
// costanti sotto un unico identificatore, evitando di "sporcare" lo scope
// globale. Nasce prima dei moduli ES (era chiamato "internal module").
// Solo cio' che e' marcato con 'export' e' visibile dall'esterno.

namespace Geometria {
  // NON esportato: visibile solo dentro il namespace.
  const PI = 3.14159;

  // Esportato: accessibile come Geometria.areaCerchio.
  export function areaCerchio(r: number): number {
    return PI * r * r;
  }

  // Anche i tipi possono essere esportati.
  export interface Punto {
    x: number;
    y: number;
  }
}

const area = Geometria.areaCerchio(2); // tipo: number  // => circa 12.566
const p: Geometria.Punto = { x: 1, y: 2 }; // uso del type qualificato
// ERRORE TS: 'PI' non e' esportato -> Geometria.PI non e' accessibile.
// const errore = Geometria.PI;

// ---------------------------------------------------------------------------
// 2) EXPORT INTERNO E MEMBRI PRIVATI
// ---------------------------------------------------------------------------
// Dentro un namespace si possono chiamare i membri non esportati direttamente,
// senza qualificarli. Verso l'esterno serve invece il prefisso NomeNamespace.

namespace Valuta {
  const SIMBOLO = "EUR";

  function formatta(n: number): string {
    // 'SIMBOLO' e' privato ma qui e' visibile senza prefisso.
    return `${n.toFixed(2)} ${SIMBOLO}`;
  }

  export function stipendioLordo(base: number, bonus: number): string {
    return formatta(base + bonus); // uso interno diretto
  }
}

const busta = Valuta.stipendioLordo(1500, 200); // tipo: string  // => "1700.00 EUR"

// ---------------------------------------------------------------------------
// 3) NESTED NAMESPACE (namespace annidati)
// ---------------------------------------------------------------------------
// Un namespace puo' contenerne altri, creando una gerarchia di nomi.
// Per essere raggiungibile dall'esterno, ogni livello va esportato.

namespace Azienda {
  export namespace Contatti {
    export interface Email {
      indirizzo: string;
      certificata: boolean;
    }

    export function dominio(e: Email): string {
      return e.indirizzo.split("@")[1] ?? "";
    }
  }
}

const mail: Azienda.Contatti.Email = {
  indirizzo: "info@polyuretech.com",
  certificata: false,
};
const dom = Azienda.Contatti.dominio(mail); // tipo: string  // => "polyuretech.com"

// ---------------------------------------------------------------------------
// 4) ALIAS DI NAMESPACE CON 'import ='
// ---------------------------------------------------------------------------
// Per accorciare percorsi lunghi si usa 'import Alias = Percorso.Namespace'.
// Non e' un import da file: e' un alias locale (funziona anche in global script).

import Contatti = Azienda.Contatti;
const dom2 = Contatti.dominio(mail); // tipo: string  // => "polyuretech.com"

// ---------------------------------------------------------------------------
// 5) MERGING: piu' blocchi 'namespace' con lo stesso nome si fondono
// ---------------------------------------------------------------------------
// TS unisce dichiarazioni namespace omonime. Utile per estendere in piu' punti.

namespace Utils {
  export function trim(s: string): string {
    return s.trim();
  }
}

namespace Utils {
  // Questo blocco si fonde col precedente: entrambe le funzioni convivono.
  export function upper(s: string): string {
    return s.toUpperCase();
  }
}

const pulito = Utils.upper(Utils.trim("  ciao  ")); // tipo: string  // => "CIAO"

// ---------------------------------------------------------------------------
// 6) ESEMPIO ERP: namespace ERP.Timbrature
// ---------------------------------------------------------------------------
// Raggruppiamo tipi e logica di dominio del modulo timbrature sotto un
// namespace annidato ERP.Timbrature. Gli orari sono stringhe naive-UTC "HH:MM".

namespace ERP {
  // Tipi condivisi a livello ERP, riusabili dai sotto-namespace.
  export type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";
  export type Turno = "P4" | "P2" | "STD";

  export interface Dipendente {
    id: number;
    nome: string;
    badge: string; // formato "UP-001"
    ruolo: Ruolo;
  }

  export namespace Timbrature {
    // Regex private al sotto-namespace: dettaglio implementativo nascosto.
    const RE_ORARIO = /^\d{2}:\d{2}$/;
    const RE_BADGE = /^UP-\d{3}$/;

    export interface Timbratura {
      badge: string;
      entrata: string; // "HH:MM" naive-UTC
      uscita: string; // "HH:MM" naive-UTC
      turno: ERP.Turno; // riuso del type del namespace padre
    }

    // Validazione formato orario: type predicate per narrowing.
    export function isOrarioValido(s: string): boolean {
      return RE_ORARIO.test(s);
    }

    export function isBadgeValido(b: string): boolean {
      return RE_BADGE.test(b);
    }

    // Converte "HH:MM" in minuti dalla mezzanotte (naive, nessun fuso).
    function toMinuti(hhmm: string): number {
      const [h, m] = hhmm.split(":").map(Number);
      return h * 60 + m;
    }

    // Durata in minuti tra entrata e uscita di una timbratura.
    export function durataMinuti(t: Timbratura): number {
      if (!isOrarioValido(t.entrata) || !isOrarioValido(t.uscita)) {
        throw new Error("Orario non valido");
      }
      return toMinuti(t.uscita) - toMinuti(t.entrata);
    }

    // Factory con validazione del badge.
    export function crea(
      badge: string,
      entrata: string,
      uscita: string,
      turno: ERP.Turno
    ): Timbratura {
      if (!isBadgeValido(badge)) {
        throw new Error(`Badge non valido: ${badge}`);
      }
      return { badge, entrata, uscita, turno };
    }
  }
}

// Uso del modulo ERP.Timbrature dall'esterno, con nomi qualificati.
const t1: ERP.Timbrature.Timbratura = ERP.Timbrature.crea(
  "UP-001",
  "08:00",
  "17:00",
  "P4"
);
const minuti = ERP.Timbrature.durataMinuti(t1); // tipo: number  // => 540
const okOrario = ERP.Timbrature.isOrarioValido("8:00"); // tipo: boolean  // => false (manca lo zero)

// Alias per accorciare l'accesso ripetuto.
import Timb = ERP.Timbrature;
const t2 = Timb.crea("UP-042", "06:00", "10:00", "P2");
const minuti2 = Timb.durataMinuti(t2); // tipo: number  // => 240
// ERRORE TS: badge fuori formato lancia a runtime, ma il type resta string;
// il namespace NON garantisce a compile-time il pattern "UP-\d{3}".
// const brutto = Timb.crea("X1", "06:00", "10:00", "STD"); // compila, ma throw

// ---------------------------------------------------------------------------
// 7) NAMESPACE vs MODULI: quando usarli
// ---------------------------------------------------------------------------
// - MODULI ES (import/export tra file): scelta di DEFAULT per codice moderno.
//   Ogni file e' gia' un modulo isolato, con tree-shaking e dipendenze esplicite.
// - NAMESPACE: utili in scenari LEGACY o particolari:
//     * script globali caricati con <script> senza bundler / module loader;
//     * declaration merging su librerie (es. estendere tipi globali);
//     * organizzare tipi in file .d.ts di ambient declarations.
// - REGOLA PRATICA: in un progetto con moduli ES, NON mischiare 'namespace'
//   per organizzare il codice applicativo; preferire cartelle + file + import.
//   Nota: in un modulo, un 'namespace' e' comunque locale al file, non globale.

// Esempio (concettuale, come sarebbe con i moduli invece del namespace):
// // file timbrature.ts
// export interface Timbratura { /* ... */ }
// export function durataMinuti(t: Timbratura): number { /* ... */ }
// // file main.ts
// import { durataMinuti } from "./timbrature";

// ---------------------------------------------------------------------------
// 8) EXPORT DEI SIMBOLI LOCALI (per rendere questo file un modulo)
// ---------------------------------------------------------------------------
// Rendiamo esportabili alcuni simboli definiti QUI (solo locali a questo file).
// Attenzione: aggiungere un 'export' trasforma il file in un modulo ES; i
// namespace dichiarati sopra restano validi ma NON sono piu' globali.
export { Geometria, ERP };
export type Ruolo = ERP.Ruolo; // re-export di un type interno al namespace

// ---------------------------------------------------------------------------
// RIEPILOGO COMANDI / CONCETTI
// ---------------------------------------------------------------------------
// - namespace X { ... }        contenitore con nome, evita l'inquinamento globale.
// - export dentro namespace    solo i membri 'export' sono visibili all'esterno.
// - membri non esportati       privati; visibili internamente senza prefisso.
// - X.membro                   accesso qualificato dall'esterno.
// - namespace annidati         X.Y.Z, ogni livello va esportato per l'esterno.
// - import Alias = X.Y         alias locale (NON un import da file).
// - declaration merging        namespace omonimi si fondono automaticamente.
// - ERP.Timbrature             esempio: tipi + validazione orari/badge + factory.
// - namespace vs moduli        default = moduli ES; namespace solo legacy/.d.ts.
// - export {...} nel file       trasforma il file in modulo (namespace non globali).
