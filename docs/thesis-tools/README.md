# thesis-tools

Skripte koje proizvode podatke za master rad iz **lokalne git istorije** — bez GitHub API-ja.
Nisu deo aplikacije; ne ulaze u build ni u testove.

## Redosled

```bash
# 1. spoji merge-ovane PR-ove sa redovima iz BACKLOG.md (po imenu grane) -> pr-key.json
python3 docs/thesis-tools/join.py docs/thesis-tools/pr-key.json > /tmp/join-report.md

# 2. generiši/osveži docs/CATEGORIES.md iz pr-key.json
python3 docs/thesis-tools/build_categories.py docs/thesis-tools/pr-key.json

# 3. (opciono) HTML pregled ključa
python3 docs/thesis-tools/build_page.py docs/thesis-tools/pr-key.json /tmp/ledger.html

# --- posle zamrzavanja istorije (git tag freeze/v1) ---

# 4. napravi 60 ulaza za LLM iz zamrznute istorije (v. §10.1)
python3 docs/thesis-tools/extract_eval_inputs.py

# 5. šablon za predikcije, pa ocenjivanje
python3 docs/thesis-tools/score.py --template predictions.json
python3 docs/thesis-tools/score.py predictions.json --out docs/RESULTS.md
```

## Šta koja radi

| Skripta               | Uloga                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `join.py`             | Spaja 61 merge commit sa redovima `BACKLOG.md` **po imenu grane** (BL# ≠ GitHub PR#). Računa diff statistiku, proverava da nijedna pre-registrovana `Risk` oznaka nije menjana, i ispisuje sporne redove. |
| `build_categories.py` | Piše `docs/CATEGORIES.md`. **Ne uništava ručni rad** — postojeće vrednosti iz kolone `Kategorija` imaju prednost nad svim ostalim. Zbir se računa iz tabele, pa dve tabele ne mogu da se raziđu. |
| `build_page.py`       | HTML pregled istog ključa, za čitanje.                                                                                                          |
| `pr-key.json`         | Mašinski čitljiv ključ (izlaz `join.py`).                                                                                                       |
| `extract_eval_inputs.py` | Iz `freeze/v1` pravi `eval-input/PR-<n>/{meta.json,changes.diff}` po pravilu iz §10.1. Skenira svaki generisani fajl na oznake rizika i **vraća izlazni kod 1** ako ijedna prođe. `manifest.json` (spoj sa ključem) se modelu **ne daje**. |
| `score.py`            | Poredi predikcije sa ključem: tačnost, **baseline**, Cohen's κ, matrica konfuzije, recall po nivou, tačnost po kategoriji, tabela po PR-u. |

## Napomene

- `REPO` putanja je hardkodirana na vrhu svake skripte — promeniti ako se repo premesti.
- Markdown koji skripte pišu nije poravnat; prettier ga poravna pri sledećem formatiranju.
  Poravnanje je jedino što se menja — sadržaj ćelija ostaje isti.
- `build_categories.py` upozorava ako se u koloni `Kategorija` pojavi vrednost izvan §2
  taksonomije (npr. `CI` umesto `Infrastructure / CI`).

## Ulaz za LLM ocenjivanje (v. §10.1 METHODOLOGY.md)

Ključ živi u `docs/`, pa `docs/` **nikada** ne sme ući u kontekst modela koji ocenjuje PR:

```bash
git diff <merge>^1...<merge>^2 -- . ':(exclude)docs/'
```

Bez checkout-a repozitorijuma, bez `git log` (19 commit poruka sadrži oznaku rizika).
