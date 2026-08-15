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
```

## Šta koja radi

| Skripta               | Uloga                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `join.py`             | Spaja 61 merge commit sa redovima `BACKLOG.md` **po imenu grane** (BL# ≠ GitHub PR#). Računa diff statistiku, proverava da nijedna pre-registrovana `Risk` oznaka nije menjana, i ispisuje sporne redove. |
| `build_categories.py` | Piše `docs/CATEGORIES.md`. **Ne uništava ručni rad** — postojeće vrednosti iz kolone `Kategorija` imaju prednost nad svim ostalim. Zbir se računa iz tabele, pa dve tabele ne mogu da se raziđu. |
| `build_page.py`       | HTML pregled istog ključa, za čitanje.                                                                                                          |
| `pr-key.json`         | Mašinski čitljiv ključ (izlaz `join.py`).                                                                                                       |

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
