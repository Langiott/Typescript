/**
 * File 032 - Class fields & access modifiers (INTERMEDIATE)
 * Argomento: incapsulamento nelle classi TypeScript.
 * Vediamo i modificatori public/private/protected di TS, i campi
 * private ECMAScript (#field) e la differenza con il private di TS,
 * parameter properties, readonly, getter/setter, static e campi.
 * Dominio ERP Polyuretech: badge "UP-001", password, timbrature naive-UTC.
 * Tutto compila con: tsc --strict, target ES2022, lib ES2022+DOM, noEmit.
 */

// ============================================================
// 1) public: il default. Accessibile ovunque.
// ============================================================

// Se non scrivi nulla, un membro e' public in TypeScript.
class RepartoBase {
  nome: string; // implicitamente public
  public codice: string; // esplicito, equivalente

  constructor(nome: string, codice: string) {
    this.nome = nome;
    this.codice = codice;
  }
}

const rep = new RepartoBase("Produzione", "PROD");
// tipo: string
const n1 = rep.nome; // accesso libero dall'esterno
const c1 = rep.codice; // => "PROD"

// ============================================================
// 2) private (TS): visibile solo dentro la classe.
// ============================================================

// Il private di TypeScript e' un controllo SOLO in fase di compilazione:
// a runtime il campo esiste comunque come proprieta' normale.
class Dipendente {
  private password: string; // non accessibile dall'esterno

  constructor(
    public readonly id: number,
    public nome: string,
    password: string,
  ) {
    this.password = password;
  }

  // metodo pubblico che usa il campo private
  verificaPassword(tentativo: string): boolean {
    return this.password === tentativo;
  }
}

const dip = new Dipendente(1, "Mario Rossi", "segreta123");
// => true
const ok = dip.verificaPassword("segreta123");
// ERRORE TS: Property 'password' is private and only accessible within class 'Dipendente'.
// const p = dip.password;

// ============================================================
// 3) parameter properties: dichiarare e assegnare in un colpo solo.
// ============================================================

// Mettendo un modificatore (public/private/protected/readonly) davanti
// al parametro del constructor, TS crea e assegna il campo per te.
class Timbratura {
  constructor(
    public readonly dipendenteId: number,
    private entrata: string, // "HH:MM" naive-UTC
    private uscita: string,
  ) {}

  // durata "grezza" in minuti tra entrata e uscita
  durataMinuti(): number {
    const [h1, m1] = this.entrata.split(":").map(Number);
    const [h2, m2] = this.uscita.split(":").map(Number);
    return h2 * 60 + m2 - (h1 * 60 + m1);
  }
}

const t = new Timbratura(1, "08:00", "17:00");
// => 540
const durata = t.durataMinuti();
// ERRORE TS: Property 'entrata' is private...
// t.entrata;

// ============================================================
// 4) protected: come private, ma visibile anche nelle sottoclassi.
// ============================================================

class Persona {
  protected badge: string; // visibile qui e nelle classi derivate

  constructor(badge: string) {
    this.badge = badge;
  }
}

class Operatore extends Persona {
  // la sottoclasse PUO' leggere badge perche' e' protected
  descriviBadge(): string {
    return `Badge operatore: ${this.badge}`;
  }
}

const op = new Operatore("UP-042");
// => "Badge operatore: UP-042"
const desc = op.descriviBadge();
// ERRORE TS: Property 'badge' is protected and only accessible within class 'Persona' and its subclasses.
// op.badge;

// ============================================================
// 5) private ECMAScript (#field): incapsulamento VERO a runtime.
// ============================================================

// Il #campo e' privato anche a runtime: non e' accessibile in alcun modo
// dall'esterno, nemmeno con trucchi come obj["#campo"] o Object.keys.
// A differenza del private TS, e' hard-private (imposto dal motore JS).
class Account {
  #hashPassword: string; // vero private ES2022

  constructor(
    public badge: string,
    hashPassword: string,
  ) {
    this.#hashPassword = hashPassword;
  }

  autentica(hash: string): boolean {
    return this.#hashPassword === hash;
  }

  // metodo helper che usa il brand check con "in" (novita' moderna)
  static isAccount(x: unknown): x is Account {
    return typeof x === "object" && x !== null && #hashPassword in x;
  }
}

const acc = new Account("UP-001", "abc123hash");
// => true
const auth = acc.autentica("abc123hash");
// => true (grazie al brand check con #hashPassword in x)
const branded = Account.isAccount(acc);
// ERRORE TS: Property '#hashPassword' is not accessible outside class 'Account'...
// acc.#hashPassword;
// Nota: nemmeno acc["#hashPassword"] funziona: quella e' una chiave stringa diversa.

// ============================================================
// 6) private TS vs private # : la differenza pratica.
// ============================================================

// private TS: soft-private, sparisce dopo la compilazione, resta una prop normale.
// Puoi barare con un cast e leggerlo (sconsigliato, ma possibile):
class ConfigTS {
  private token: string = "xyz";
}
const cfgTs = new ConfigTS();
// A runtime il campo esiste: questo cast COMPILA e legge il valore.
// tipo: string
const rubato = (cfgTs as unknown as { token: string }).token; // => "xyz"

// private #: hard-private, non c'e' cast che tenga; il campo non e' proprio
// una proprieta' enumerabile/accessibile. Piu' sicuro per dati sensibili.
class ConfigES {
  #token: string = "xyz";
  leggi(): string {
    return this.#token;
  }
}
const cfgEs = new ConfigES();
// ERRORE TS: Private field '#token' must be declared in an enclosing class...
// (cfgEs as any).#token;  // non compila e comunque non esisterebbe
const soloConMetodo = cfgEs.leggi(); // => "xyz"

// ============================================================
// 7) readonly: assegnabile solo in dichiarazione o nel constructor.
// ============================================================

class DipendenteImmutabile {
  readonly id: number;
  readonly badge: string;

  constructor(id: number, badge: string) {
    this.id = id; // ok: dentro il constructor
    this.badge = badge;
  }

  rinomina(nuovo: string): void {
    // ERRORE TS: Cannot assign to 'badge' because it is a read-only property.
    // this.badge = nuovo;
  }
}

const di = new DipendenteImmutabile(7, "UP-007");
// ERRORE TS: Cannot assign to 'id' because it is a read-only property.
// di.id = 99;

// ============================================================
// 8) getter / setter: incapsulare con logica di validazione.
// ============================================================

// Regex del dominio ERP.
const BADGE_RE = /^UP-\d{3}$/;
const ORARIO_RE = /^\d{2}:\d{2}$/;

class Badge {
  #valore: string;

  constructor(valore: string) {
    if (!BADGE_RE.test(valore)) {
      throw new Error(`Badge non valido: ${valore}`);
    }
    this.#valore = valore;
  }

  // getter: si legge come una proprieta', ma esegue codice
  get valore(): string {
    return this.#valore;
  }

  // setter: valida prima di assegnare
  set valore(nuovo: string) {
    if (!BADGE_RE.test(nuovo)) {
      throw new Error(`Badge non valido: ${nuovo}`);
    }
    this.#valore = nuovo;
  }
}

const b = new Badge("UP-001");
// tipo: string
const bv = b.valore; // => "UP-001" (chiamata al getter, senza parentesi)
b.valore = "UP-999"; // chiama il setter, validazione ok
// A runtime lancerebbe: b.valore = "XX-1"; // Error: Badge non valido: XX-1

// ============================================================
// 9) static: membri della classe, non dell'istanza.
// ============================================================

class RegistroBadge {
  // campo static condiviso da tutti
  static prefisso = "UP-";
  static #contatore = 0; // static private #

  static prossimo(): string {
    RegistroBadge.#contatore += 1;
    const num = String(RegistroBadge.#contatore).padStart(3, "0");
    return `${RegistroBadge.prefisso}${num}`;
  }
}

// => "UP-001"
const primo = RegistroBadge.prossimo();
// => "UP-002"
const secondo = RegistroBadge.prossimo();
// tipo: string
const pref = RegistroBadge.prefisso; // => "UP-"

// ============================================================
// 10) private + protected nelle gerarchie: esempio combinato.
// ============================================================

type Ruolo = "SuperAdmin" | "Admin" | "Operatore" | "QrDisplay";

abstract class UtenteBase {
  protected constructor(
    public readonly badge: string,
    protected ruolo: Ruolo,
    // ERRORE TS 18009: Private identifiers cannot be used as parameters.
    // #pinInterno?: string,   // NB: NON si puo' usare '#' nei parametri (vedi nota sotto)
    pinInterno?: string, // versione valida: parametro normale (il '#' non c'entra qui)
  ) {
    // pinInterno andrebbe salvato in un campo private nel corpo classe (vedi esempi 5, 8, 9)
    void pinInterno;
  }

  // metodo astratto: le sottoclassi devono implementarlo
  abstract puoAccedere(sezione: string): boolean;

  // protected: usabile dalle sottoclassi
  protected haRuolo(r: Ruolo): boolean {
    return this.ruolo === r;
  }
}
// Nota: il parametro "#pinInterno" sopra e' in realta' un normale parametro,
// il cancelletto NON crea un campo privato nei parametri. Per un vero campo
// private # va dichiarato nel corpo della classe (come negli esempi 5, 8, 9).

class Amministratore extends UtenteBase {
  constructor(badge: string) {
    super(badge, "Admin");
  }

  puoAccedere(sezione: string): boolean {
    // usa il metodo protected della base
    return this.haRuolo("Admin") || sezione === "pubblica";
  }
}

const admin = new Amministratore("UP-010");
// => true
const accesso = admin.puoAccedere("report");
// ERRORE TS: Property 'ruolo' is protected...
// admin.ruolo;

// ============================================================
// 11) incapsulamento completo: entita' Dipendente con password sicura.
// ============================================================

// Mock: interfaccia dati grezzi che arriverebbero dal DB (nessuna libreria).
interface DipendenteDTO {
  id: number;
  nome: string;
  badge: string;
  ruolo: Ruolo;
  hashPassword: string;
}

class DipendenteSicuro {
  readonly id: number;
  readonly badge: string;
  nome: string;
  #ruolo: Ruolo;
  #hashPassword: string; // hard-private: mai esposto

  constructor(dto: DipendenteDTO) {
    if (!BADGE_RE.test(dto.badge)) {
      throw new Error(`Badge non valido: ${dto.badge}`);
    }
    this.id = dto.id;
    this.badge = dto.badge;
    this.nome = dto.nome;
    this.#ruolo = dto.ruolo;
    this.#hashPassword = dto.hashPassword;
  }

  // espone il ruolo in sola lettura tramite getter
  get ruolo(): Ruolo {
    return this.#ruolo;
  }

  // cambio password: valida ma non espone mai l'hash
  cambiaPassword(nuovoHash: string): void {
    if (nuovoHash.length < 6) {
      throw new Error("Hash troppo corto");
    }
    this.#hashPassword = nuovoHash;
  }

  verifica(hash: string): boolean {
    return this.#hashPassword === hash;
  }

  // serializzazione SICURA: l'hash non finisce mai nel JSON
  toSafeJSON(): Omit<DipendenteDTO, "hashPassword"> {
    return {
      id: this.id,
      nome: this.nome,
      badge: this.badge,
      ruolo: this.#ruolo,
    };
  }
}

const ds = new DipendenteSicuro({
  id: 1,
  nome: "Anna Bianchi",
  badge: "UP-001",
  ruolo: "Operatore",
  hashPassword: "hash-super-segreto",
});
// tipo: Ruolo => "Operatore"
const r = ds.ruolo;
// => true
const v = ds.verifica("hash-super-segreto");
// safe: nessun hashPassword nel risultato
const safe = ds.toSafeJSON(); // { id, nome, badge, ruolo }

// ============================================================
// 12) validazione orario naive-UTC con campo private #.
// ============================================================

class OrarioTimbratura {
  #hhmm: string; // "HH:MM" naive-UTC, hard-private

  constructor(hhmm: string) {
    if (!ORARIO_RE.test(hhmm)) {
      throw new Error(`Orario non valido: ${hhmm}`);
    }
    this.#hhmm = hhmm;
  }

  get valore(): string {
    return this.#hhmm;
  }

  // minuti dalla mezzanotte, utile per confronti
  get minuti(): number {
    const [h, m] = this.#hhmm.split(":").map(Number);
    return h * 60 + m;
  }
}

const o1 = new OrarioTimbratura("08:30");
const o2 = new OrarioTimbratura("17:00");
// => 510
const start = o1.minuti;
// => 1020
const end = o2.minuti;
// => 510 (differenza in minuti)
const diff = end - start;

// ============================================================
// 13) NOTA su decorator (@access) - solo commento.
// ============================================================

// Con experimentalDecorators=FALSE la sintassi @decorator NON compila.
// A titolo informativo, un decorator per loggare gli accessi si scriverebbe:
//
//   class Foo {
//     @logAccess
//     private segreto = "x";
//   }
//
// ma qui e' SOLO un commento: non lo attiviamo.

// ============================================================
// Export di simboli locali per riuso didattico.
// ============================================================

export {
  Dipendente,
  Timbratura,
  Account,
  Badge,
  RegistroBadge,
  DipendenteSicuro,
  OrarioTimbratura,
};
export type { Ruolo, DipendenteDTO };

/*
============================================================
RIEPILOGO COMANDI / CONCETTI
============================================================
- public: default, accesso ovunque; si puo' scrivere esplicito.
- private (TS): soft-private, solo compile-time; a runtime la prop esiste ancora.
- protected: come private ma visibile nelle sottoclassi.
- #campo (ES2022): hard-private, imposto dal motore JS; nessun cast lo aggira.
- private TS vs #: usa # per dati sensibili (password/hash), e' davvero nascosto.
- Brand check: "#campo in oggetto" verifica l'appartenenza alla classe (type guard).
- parameter properties: modificatore nel constructor -> crea e assegna il campo.
- readonly: assegnabile solo in dichiarazione o nel constructor.
- get/set: incapsulano la logica; il getter si legge senza parentesi.
- static: membri della classe; esiste anche static #campo e static get/set.
- Il "#" nei parametri NON crea un campo privato: va dichiarato nel corpo.
- Pattern sicuro: hash in #campo + toSafeJSON con Omit<DTO,"hashPassword">.
- @decorator NON compila con experimentalDecorators=FALSE (solo nei commenti).
- Regex dominio: badge /^UP-\d{3}$/, orario /^\d{2}:\d{2}$/.
============================================================
*/
