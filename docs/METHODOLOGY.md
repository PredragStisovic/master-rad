# Metodologija eksperimenta

Ovaj dokument definiše **eksperimentalni plan** za master rad o LLM-potpomognutoj proceni
rizika Pull Request zahteva. On je fiksni deo metodologije: kategorije PR-ova, njihova
očekivana (približna) raspodela i očekivani nivoi rizika definisani su **pre** početka
implementacije. Tokom razvoja plan se prilagođava, a sva odstupanja se beleže u
[Dnevniku odstupanja](#dnevnik-odstupanja).

Cilj je ravnoteža između **reproduktivnosti** (kontrolisani plan) i **realizma** (prirodan
razvojni proces), jer upravo realistične Pull Request zahteve LLM treba da procenjuje.

---

## 1. Pristup: hibridni (plan + prilagođavanje)

- **Pre razvoja:** definisane su kategorije PR-ova, približna ciljna raspodela i očekivani rizik.
- **Tokom razvoja:** implementacija teče prirodno. Veliki PR se deli na manje celine; više
  malih se spaja kada ima smisla; bugfix se pojavljuje usred razvoja; refaktorisanje postaje
  neophodno. Ovo se **ne** smatra greškom u planu — to je očekivano ponašanje.
- **Posle razvoja:** stvarna raspodela se meri i poredi sa planom; razlike se objašnjavaju.

> Formulacija za rad:
>
> „Pre početka implementacije definisan je eksperimentalni plan koji je sadržao kategorije
> Pull Request zahteva, njihovu približnu raspodelu i očekivani nivo rizika. Tokom razvoja
> aplikacije plan je prilagođavan u skladu sa potrebama implementacije, pri čemu su veći Pull
> Request zahtevi razlagani na manje celine ili spajani kada je to bilo opravdano. Ovakav
> pristup omogućio je ravnotežu između kontrolisanog eksperimenta i realističnog procesa
> razvoja softvera."

---

## 2. Taksonomija kategorija (semantička klasifikacija)

Svaki PR dobija **tačno jednu primarnu semantičku kategoriju** — prema _suštini promene_, ne
prema prefiksu grane. Npr. `feature/auth-login-jwt` je semantički **Security**, a ne Feature.
Branch-prefiks i dalje postoji radi čitljivosti istorije, ali **kategorija za analizu je
semantička.**

| Kategorija              | Definicija                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------- |
| **Feature**             | Nova poslovna funkcionalnost: endpoint, DTO, CRUD, upiti, izveštaji.                  |
| **Bug fix**             | Ispravka pogrešnog ponašanja otkrivenog tokom razvoja. _(rezervisani budžet — v. §4)_ |
| **Refactoring**         | Promena strukture koda bez promene ponašanja. _(rezervisani budžet — v. §4)_          |
| **Performance**         | Optimizacija: indeksi, keširanje, eliminacija N+1, tuning upita.                      |
| **Security**            | Autentifikacija, autorizacija, hešovanje, tokeni, rate-limiting, ojačavanje.          |
| **DB migration**        | Samostalna schema/data migracija. _(mešovito pravilo — v. §3)_                        |
| **Infrastructure / CI** | Skela, Docker, health, Swagger, lint, coverage, GitHub Actions, Sonar.                |

---

## 3. Pravilo za migracije (mešovito, po veličini/riziku)

- **Mala / bezopasna** migracija (npr. dodavanje nullable kolone uz novi feature) putuje sa
  feature-om koji je uvodi → kategorija ostaje **Feature**.
- **Velika ili rizična** migracija (nova osnovna tabela, data migration, index/tsvector,
  promena tipa, breaking izmena) ide kao **zaseban PR** → kategorija **DB migration**.

Razlog: rizik migracije se izoluje i lakše meri; migracije su jedan od ključnih _high-risk_
uzoraka za LLM, pa ih ne želimo „razblažene" unutar velikog feature diff-a.

---

## 4. Rezervisani budžet za Bug fix i Refactoring

Bugfix i refactoring se **ne mogu verodostojno isplanirati unapred** — bug koji „znaš" pre
razvoja nije realan bug. Zato plan **rezerviše budžet** (ciljni broj slotova) koji se puni
**organski**, kada:

- se tokom implementacije ili testiranja pojavi stvarna greška (→ `bugfix/...`), ili
- neka celina prirodno postane teška za održavanje i zahteva restrukturiranje (→ `refactor/...`).

Unapred napisani backlog ([`BACKLOG.md`](BACKLOG.md)) je zato namerno **feature/infra-težak**;
očekuje se da će realizovani broj bugfix/refactor PR-ova rasti tokom razvoja ka ciljnom budžetu.

---

## 5. Plan raspodele kategorija

Ciljevi su **približni** (deo metodologije, ne tvrda kvota). Kolona „u backlog-u sada" je
inicijalni, unapred napisani plan; kolona „realizovano" se popunjava u hodu.

| Kategorija                  | Ciljni broj (≈) | U backlog-u sada | Realizovano |
| --------------------------- | --------------: | ---------------: | ----------: |
| Feature                     |              22 |               22 |          21 |
| Infrastructure / CI         |              12 |               12 |           8 |
| Security                    |               8 |                8 |           8 |
| DB migration                |               8 |                9 |          14 |
| Bug fix _(rezervisano)_     |              10 |                1 |           5 |
| Refactoring _(rezervisano)_ |               8 |                2 |           3 |
| Performance                 |               5 |                3 |           1 |
| **Ukupno**                  |         **~73** |           **57** |      **60** |

Po-PR razrada je u [`CATEGORIES.md`](CATEGORIES.md). Tri odstupanja traže objašnjenje u radu:

- **DB migration 14 naspram cilja 8.** Mešovito pravilo iz §3 u praksi je skoro uvek odlučivalo
  u korist zasebnog PR-a: svaki model (`projects`, `project-members`, `tasks`, `task-comments`,
  `task-attachments`, `audit-log`, `notifications`) dobio je sopstvenu migraciju pre feature-a
  koji ga koristi. To je _povećalo_ izolaciju rizika, što je i bila namera pravila — ali je
  pomerilo raspodelu.
- **Infrastructure / CI 8 naspram cilja 12.** Cela razlika su pre-registrovani redovi koji nikada
  nisu merge-ovani (`ci/github-actions-build`, `ci/security-scan`, `feature/e2e-tests`,
  `feature/eslint-strict`, `feature/bootstrap-nestjs`); CI je sazrevao unutar drugih PR-ova
  umesto kroz zasebne.
- **Performance 1 naspram cilja 5.** Performansni rad je urađen, ali je po §2 semantički pao u
  druge kategorije: `performance/search-index` i `performance/query-optimization` su primarno
  **DB migration** (obe menjaju schemu i uvode indekse migracijom), pa je `performance/caching`
  ostao jedini PR čija je suština optimizacija bez promene schemе. Ovo je dobra ilustracija
  zašto §2 insistira na semantičkoj kategoriji umesto na prefiksu grane — sve tri grane nose
  prefiks `performance/`.
- **Bug fix 5 i Refactoring 3, naspram 10 i 8.** Rezervisani budžet iz §4 punjen je organski i
  jednostavno se nije napunio do cilja — realan projekat ove veličine nije proizveo više
  stvarnih bagova. To je nalaz, ne propust: budžet je bio gornja granica, a ne kvota.

> Napomena o obimu: inicijalni plan („40–60 PR") odnosio se na _unapred planirani feature rad_.
> Organski bugfix/refactor PR-ovi podižu realizovani ukupan broj na ~65–75, što je očekivano i
> deo realizma — a ne odstupanje koje treba „ispraviti".

---

## 6. Plan raspodele rizika (ciljne oznake)

Namerno oblikovano kao realan projekat: većina promena bezbedna, rizik koncentrisan u
security / authz / migracijama.

| Rizik  | Ciljni udeo |  Realizovano | Gde živi                                                                                                                |
| ------ | ----------: | -----------: | ----------------------------------------------------------------------------------------------------------------------- |
| Low    |        ~40% | 42% (25/60) | CRUD, DTO, paginacija, izveštaji, CI konfiguracija                                                                      |
| Medium |        ~45% | 47% (28/60) | migracije, refaktorisanja, keširanje, cross-cutting, search                                                             |
| High   |        ~15% | 12% (7/60)  | login/JWT, refresh tokeni, roles/permissions guard, project-access guard, refresh hardening, permission-system redesign |

Low i Medium su realizovani praktično po planu. High je nešto ispod cilja iz jednog razloga:
`refactor/permission-system` (BL#50) — jedan od pre-registrovanih **H** redova — nije bio potreban
jer je `resource:action` format usvojen odmah (v. Dnevnik odstupanja, 2026-08-15). Sedam
realizovanih **H** PR-ova živi u Security (6) i DB migration (1) — nijedan **H** nije klasifikovan
kao Feature, što je u skladu sa §6 („rizik koncentrisan u security / authz / migracijama").

_High_ PR-ovi su ključni „svi gejtovi zeleni, a i dalje rizično" slučajevi koje LLM treba da
prepozna. Puna po-PR razrada je u [`BACKLOG.md`](BACKLOG.md).

---

## 7. Validnost: autorstvo ne sme da korelira sa rizikom

PR-ove piše **mešovito** istraživač i Claude, namerno raspoređeno kroz **svaki** nivo rizika.
Ako bi autor korelirao sa rizikom (npr. svi high-risk PR-ovi ljudski pisani), evaluacija LLM-a
bi bila pristrasna (confounding). Kolona `Own` u backlog-u je podrazumevana raspodela — čuvaj
_rasprostranjenost_ oba autora kroz L/M/H.

---

## 8. Protokol beleženja po PR-u

Pri svakom PR-u zabeležiti (u opisu PR-a / commit poruci):

1. **Primarna semantička kategorija** (jedna od §2).
2. **Ground-truth nivo rizika** (L/M/H) + kratko obrazloženje _zašto_ — ovo je labela naspram
   koje se kasnije skoruje tačnost LLM procene.
3. Ako je PR nastao **deljenjem/spajanjem** planiranog PR-a ili je **neplaniran** (organski
   bugfix/refactor) → dodati red u [Dnevnik odstupanja](#dnevnik-odstupanja).

---

## 9. Vremenski raspored: kada uključiti CI/CD i LLM

CI/CD i LLM su **dve različite uloge** i uključuju se u **dva različita trenutka**:

- **CI/CD** = merni instrument (tradicionalni gejtovi: build, testovi, coverage, lint, Sonar,
  security scan). Uključuje se **rano** i sazreva inkrementalno, kao u svakom realnom projektu.
- **LLM** = instrument evaluacije (predmet merenja). Uključuje se **poslednji**, tek kad cela
  istorija PR-ova postoji.

Preporučeni redosled:

```
Faza 0–1:     minimalni CI (build + unit test)              ← live, rano
Faza 1–8:     inkrementalno: coverage, lint, Sonar, security scan
              + po PR-u snimati metrike (npr. docs/metrics/PR-XX.json)
kraj razvoja: FREEZE — tagovati finalno stanje istorije (git tag)
POSLE:        LLM prolazi kroz celu (zamrznutu) istoriju i ocenjuje svaki PR
              → poređenje sa ključem (v. §10)
(opciono):    live LLM demo na par poslednjih PR-ova, jasno odvojeno od analize
```

**Zašto CI rano:** premisa rada je „svi gejtovi zeleni, a PR i dalje rizičan" — da bi to
demonstrirao, gejtovi moraju postojati i biti zeleni već na high-risk PR-ovima (auth,
migracije), a ti počinju u Fazi 1–2.

**Praktična sloboda:** metrike su reproducibilne iz zamrznute istorije. Na kraju možeš proći
kroz svaki merge commit (`git checkout`), pokrenuti CI i **retroaktivno izračunati metrike** i
za rane PR-ove. Zato tačan trenutak uvođenja CI nije pitanje integriteta podataka, već realizma.

---

## 10. Protokol evaluacije LLM-a (ključ vs. predviđanje)

Merenje tačnosti LLM-a radi po principu **ispita sa ključem**:

1. **Ključ (ground truth):** _ja_ (istraživač) ocenjujem svaki PR rizikom (L/M/H) **dok ga
   pravim**, i to zapisujem u opis PR-a (v. §8). To je „tačan odgovor" i **čuva se sa strane**.
2. **Nezavisno ocenjivanje:** LLM na kraju ocenjuje svaki PR **sam**, gledajući **samo sam PR**
   (diff + CI metrike). **LLM-u se NE daje moj ključ** — inače bi ga samo prepisao.
3. **Bez kontaminacije:** LLM-ova procena se **ne prikazuje autoru pre/tokom pisanja PR-a** i
   **ne blokira merge** tokom prikupljanja podataka. Ako autor vidi procenu i promeni PR,
   eksperiment je pokvaren (feedback efekat).
4. **Poređenje:** na kraju se dve kolone porede → koliko se poklapaju = tačnost LLM-a. To je
   glavni rezultat rada.

| PR                   | Ključ (moja ocena) | LLM ocena    | Poklapa se? |
| -------------------- | ------------------ | ------------ | ----------- |
| auth-login-jwt       | HIGH               | HIGH (8/10)  | ✅          |
| task-sorting         | LOW                | LOW (2/10)   | ✅          |
| project-access-guard | HIGH               | MEDIUM (5/10)| ❌          |

**Savet:** pre početka definisati jasne **kriterijume** za L/M/H (npr. „dira auth/migracije =
High"), da ocene budu dosledne kroz ceo projekat, a ne po osećaju.

### 10.1 Konstrukcija ulaza za LLM (kontrola kontaminacije)

Tačka 2 gore („LLM-u se NE daje moj ključ") **ne sme se sprovoditi uputstvom modelu.** Reći
modelu „ne gledaj commit poruke" nije provereno niti dokazivo pred komisijom. Ključ se izostavlja
**konstrukcijom ulaza** — tako da nikada ne uđe u kontekst.

U ovom repozitorijumu ključ postoji na **tri** mesta, i sva tri moraju biti izvan ulaza:

| Kanal                                                                 | Zašto curi                                                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `docs/BACKLOG.md` (kolona `Risk`) i `docs/CATEGORIES.md`              | **jesu** ključ — L/M/H za svaki PR, u radnom stablu                                              |
| commit poruke                                                         | 19 PR-ova nosi `Category:` / `Risk rationale:` u telu commit-a                                    |
| `docs/` unutar samog diff-a                                           | 14 PR-ova menja `docs/`; kod #55 i #58 dodati red Dnevnika odstupanja doslovno sadrži oznaku rizika |

Zato je ulaz za ocenjivanje **isključivo diff, bez `docs/`**:

```bash
git diff <merge>^1...<merge>^2 -- . ':(exclude)docs/'
```

Uz to: LLM **ne dobija** checkout repozitorijuma, pristup datotečnom sistemu, niti `git log`
(commit poruke). Dozvoljeni su još samo naziv grane i CI metrike za taj PR — oba vidi i ljudski
recenzent, a nijedno ne nosi L/M/H oznaku.

**Posledica koju treba prijaviti u radu:** izostavljanjem `docs/` LLM kod 14 PR-ova ocenjuje
neznatno manji diff nego što je merge-ovan. Kod 12 je reč o uzgrednoj izmeni (čekiranje reda u
backlog-u); kod #55 i #58 red Dnevnika odstupanja jeste deo tog PR-a. Sužavanje je svesna cena
— alternativa je da model pročita tačan odgovor.

---

## 11. Eksterna validacija na realnom projektu (opciono, ali jako)

Tvoj projekat je kontrolisano okruženje — moguć prigovor: „sam si napravio projekat da LLM-u
odgovara." Zato je vredno LLM proveriti i na **jednom pravom open-source projektu** (eksterna
validnost — dokaz da radi i „u divljini").

Kvaka: na tuđem projektu nemaš svoj ključ. Ključ se pravi iz **objektivnih tragova iz istorije**:

| Znak u istoriji                                     | Stvarni rizik PR-a |
| --------------------------------------------------- | ------------------ |
| PR je kasnije **vraćen** (revert)                   | rizičan            |
| Odmah posle njega išao **hotfix / „fix"** PR        | rizičan            |
| PR je uveo bag koji je kasnije prijavljen           | rizičan            |
| PR živi dugo, niko ga ne dira, nema problema        | bezbedan           |

Podela uloga:

- **Glavni eksperiment** = ovaj projekat (čist ključ, ja ocenjujem svaki PR). **Obavezno.**
- **Dodatna provera** = jedan realan projekat (ključ iz revert-a/hotfix-eva). **Opciono**, ali
  je razlika između „solidnog" i „jakog" rada.

---

## Dnevnik odstupanja

Beleži razlike između plana i realizacije. Popunjava se u hodu. Primeri formata:

### Deljenja / spajanja / neplanirani PR-ovi

| Datum      | Planirano                           | Realizovano                                                                         | Razlog                                |
| ---------- | ----------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------- |
| _(primer)_ | `feature/project-management` (1 PR) | `feature/projects-crud`, `feature/project-members`, `feature/project-search` (3 PR) | PR prevelik, podeljen na manje celine |
| _(primer)_ | 3 mala PR-a za notifikacije         | 1 PR `feature/notifications`                                                        | Celine imale smisla zajedno           |
| 2026-08-02 | `feature/coverage-config` (#53, Faza 9) | Realizovan odmah posle Faze 3                                                   | §9 — CI sazreva inkrementalno; coverage gejt mora biti zelen već na high-risk PR-ovima Faza 4–8 (#48, #50), a ne tek posle njih |
| 2026-08-06 | —                                   | `ci/sonar-coverage-exclusions` (#65, neplanirano)                                   | Lista izuzetaka u `sonar-project.properties` nije pratila `collectCoverageFrom` iz `package.json`: kontroleri, repozitorijumi, DTO-ovi i entiteti ne stižu u `lcov.info`, pa ih SonarQube računa kao 0% i obara Coverage on New Code na svakom PR-u koji doda kontroler ili repozitorijum |
| 2026-08-10 | `refactor/task-service` (#44) — podela `TasksService` na use-case servise | `refactor/task-scope-guards` (#44) — objedinjavanje dupliranih guard klauzula za opseg projekta/task-a | Planirana akumulacija u `TasksService` se nije dogodila: #28 je isporučen kao `guard/task-transition.guard.ts`, a #30/#31 kao `buildWhere`/`buildOrderBy` u helperu, pa je servisu ostalo 7 orkestracionih metoda od po 2–4 linije — podela bi bila veštačka i dala bi lažnu M oznaku. Stvarna duplikacija je nastala organski kroz #24/#27/#43: provera postojanja projekta postojala je u **tri** varijante sa istom porukom ali različitim upitima — `tasks.helper.ts:21` preko `projectsRepository.findById`, `project-members.helper.ts:14` preko `membersRepository.projectExists` (COUNT), i `ProjectsHelper.getExistingProject`; provera „task pripada projektu" postojala je dvaput sa istom porukom (`tasks.helper.ts:70` vraća entitet, `task-comments.helper.ts:17` vraća `void`). Realizovano: projektni guard objedinjen u `ProjectsHelper.getExistingProject` (globalni `ProjectsModule`), task guard u novi `TasksScopeHelper`; usput uklonjen mrtvi `ProjectMembersRepository.projectExists` i neiskorišćene zavisnosti `TasksHelper`-a. Rizik ostaje **M** (dodiruje authz-susedne provere u tri modula, a prvi pokušaj je uveo ciklus modula `TasksModule` ↔ `ProjectMembersModule` koji je rušio bootstrap cele aplikacije — potvrda da oznaka M nije precenjena); §4 — refactoring slot popunjen organski umesto unapred |
| 2026-08-14 | `performance/query-optimization` (#47) — uklanjanje N+1 upita i sužavanje `select`-ova na listi taskova | `performance/query-optimization` (#47) — tri kompozitna indeksa nad `tasks` sa `project_id` kao vodećom kolonom | Planirana pretpostavka se nije ostvarila: N+1 na listi taskova ne postoji — `TasksService.findAll` izdaje tačno dva upita (`findMany` + `count`) paralelno, a `tasks.repository.ts` od #27 koristi eksplicitan `taskSelect` sa isključivo skalarnim poljima, bez ijednog `include`-a i bez upita po redu; sužavanje selekcija je dakle bilo urađeno već na izvoru. Stvarni trošak je bio drugde: Prisma na PostgreSQL-u **ne kreira indeks nad stranim ključem**, pa `tasks.project_id` nije imao nijedan indeks — svaki projektno-opsežen upit (lista, prateći `count(*)`, `groupBy` u izveštajima #42/#43, pretraga u okviru projekta #41) radio je sekvencijalno skeniranje cele tabele. Realizovano: `[projectId, id]`, `[projectId, status, id]`, `[projectId, assigneeId, id]` — `id` je poslednja kolona svakog indeksa da bi tie-breaker sortiranje iz #30/#31 bilo servisirano indeksom umesto sort čvorom. Samostalni `[assigneeId]` zadržan jer kompozitni vodi sa `projectId` i ne može da posluži `onDelete: SetNull` proveru pri brisanju korisnika. Indeks nad `priority` namerno izostavljen — enum niske kardinalnosti, a `(project_id, status, id)` suzi dovoljno da se `priority` filtrira u heap-u. Mereno na odvojenoj bazi (200.000 taskova, 500 projekata): `count(*)` 9,24 → 0,22 ms (Seq Scan → Bitmap Index Scan), filter po statusu 5,55 → 0,02 ms, `status + priority` 19,83 → 0,02 ms (199.981 → 60 odbačenih redova). **Incident koji potvrđuje oznaku M:** autogenerisana migracija (`prisma migrate dev`) sadržala je `DROP INDEX` nad oba GIN indeksa iz #45 i `ALTER COLUMN … DROP DEFAULT` nad `search` kolonama, jer `Unsupported("tsvector")` u schemi ne opisuje `GENERATED ALWAYS AS … STORED`; migracija je pukla na `ALTER`-u tek pošto su se oba `DROP INDEX`-a već iskomitovala, pa su GIN indeksi za pretragu nestali iz dev baze. Oporavak: indeksi ručno rekreirani po SQL-u iz #45, migracija označena `--rolled-back`, a `migration.sql` prepisan ručno tako da sadrži samo tri `CREATE INDEX` naredbe (primenjeno preko `migrate deploy`). Odstupanje u veličini: planirano M (150–400 LOC), realizovano S (~10 linija scheme + migracija) |
| 2026-08-15 | `performance/search-index` (BL#45, GitHub PR #56) — rizik pre-registrovan kao **raspon** `M→H` | Razrešeno u **H** | Jedini red ključa upisan kao raspon, a raspon se ne može skorovati naspram LLM procene — svaki drugi red je jedno slovo. Pre-registracija je ostavila `M→H` jer nije bilo odlučeno da li će pretraga biti rešena običnim indeksom nad `ILIKE` upitima ili punim full-text pristupom. Realizovano je ovo drugo: PR menja schemu i uvodi migraciju sa `GENERATED ALWAYS AS … STORED` kolonama i GIN indeksima, pa po kriterijumu „dira migracije = High" pada u **H**. Nezavisna potvrda: incident opisan u redu od 2026-08-14 — autogenerisana migracija je obrisala upravo ove GIN indekse iz dev baze — pokazuje da oznaka **H** nije precenjena |
| 2026-08-15 | `fix-package-discrepancy` (BL#60) — jedan neplanirani PR | Merge-ovan **dvaput**, kao GitHub PR #13 i #14, sa iste grane | U ključu se broji kao **jedan** logički PR (oznaka `13+14`, rizik **L**). Prvi merge nije do kraja usaglasio `package.json` i `package-lock.json`, pa je ista grana dopunjena i merge-ovana ponovo; obe promene su ista logička celina i deljenje bi veštački udvostručilo jedan **L** red. Posledica: broj realizovanih PR-ova je **60**, iako u istoriji postoji 61 merge commit sa `pull request #` u poruci |
| 2026-08-15 | `refactor/permission-system` (BL#50, rizik **H**) — redizajn dozvola u `resource:action` + data migracija | **Nije realizovan — nije ni bio potreban** | Format `resource:action` usvojen je odmah, u `feature/permissions-seed` (BL#17, GitHub PR #22): katalog dozvola je od prvog seed-a pisan u tom obliku, pa nikada nije postojao stariji format koji bi trebalo migrirati. Planirani PR je počivao na pretpostavci da će dozvole prvo biti uvedene u prostijem obliku (npr. ravna lista imena) i naknadno redizajnirane. Posledica po §6: ovo je bio jedan od pre-registrovanih **H** redova, pa realizovani udeo High iznosi ~12% (7/60) umesto ciljnih ~15%. Odstupanje **nije** „ispušten rizičan posao" nego rizik izbegnut ispravnim dizajnom na početku — što je samo po sebi nalaz vredan pominjanja u radu |
|            |                                     |                                                                                     |                                       |

> **Napomena o numeraciji:** brojevi u koloni „Planirano" su redovi iz [`BACKLOG.md`](BACKLOG.md)
> (`BL#`), a oni se **ne poklapaju** sa GitHub PR brojevima — npr. BL#44 je merge-ovan kao PR #55,
> BL#47 kao PR #58, BL#53 kao PR #33. Spajanje ta dva niza radi se isključivo **po imenu grane**.

### Zbirno odstupanje (popuniti na kraju)

| Metrika      | Planirano | Realizovano | Razlog                             |
| ------------ | --------: | ----------: | ---------------------------------- |
| Ukupno PR    |       ~73 |           _ | _                                  |
| Bug fix      |        10 |           _ | rezervisani budžet punjen organski |
| Refactoring  |         8 |           _ | _                                  |
| DB migration |         8 |           _ | _                                  |
| High-risk PR |      ~15% |           _ | _                                  |
