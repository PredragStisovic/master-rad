#!/usr/bin/env python3
"""
Score LLM risk predictions against the pre-registered key (METHODOLOGY.md §10).

  key         docs/CATEGORIES.md      (Rizik column — the answer)
  join        docs/eval-input/manifest.json (PR number -> key row)
  prediction  a JSON file you supply

Prediction file — either form:
  [{"pr": 11, "risk": "H", "confidence": 8, "rationale": "..."}, ...]
  {"11": "H", "12": "H", ...}

Usage:
  python3 docs/thesis-tools/score.py predictions.json [--out docs/RESULTS.md]
  python3 docs/thesis-tools/score.py --template predictions-template.json
"""
import argparse, json, re, sys
from collections import Counter, defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
LEVELS = ["L", "M", "H"]
ORD = {l: i for i, l in enumerate(LEVELS)}


def load_key():
    """key_row -> (risk, category, branch)"""
    key = {}
    for line in (REPO / "docs/CATEGORIES.md").read_text().splitlines():
        m = re.match(r"^\|\s*([0-9+]+)\s*\|\s*`([^`]+)`\s*\|[^|]*\|\s*([LMH])\s*\|[^|]*\|\s*([^|]*?)\s*\|", line)
        if m:
            key[m.group(1)] = (m.group(3), m.group(4), m.group(2))
    return key


MANIFEST_CANDIDATES = ["docs/eval-input/manifest.json", "eval-input/manifest.json"]


def load_manifest(explicit=None):
    """pr number -> key_row"""
    if explicit:
        cands = [Path(explicit)]
    else:
        cands = [REPO / c for c in MANIFEST_CANDIDATES]
    for p in cands:
        if p.exists():
            return {e["pr"]: e["key_row"] for e in json.loads(p.read_text())["prs"]}
    sys.exit("manifest.json not found in " + ", ".join(str(c) for c in cands)
             + " — run extract_eval_inputs.py first (or pass --manifest)")


def load_predictions(path):
    raw = json.loads(Path(path).read_text())
    preds = {}
    if isinstance(raw, dict):
        for k, v in raw.items():
            preds[int(k)] = {"risk": (v if isinstance(v, str) else v.get("risk", "")).strip().upper()}
    else:
        for e in raw:
            preds[int(e["pr"])] = {"risk": str(e.get("risk", "")).strip().upper(),
                                   "confidence": e.get("confidence"),
                                   "rationale": e.get("rationale")}
    bad = {p: d["risk"] for p, d in preds.items() if d["risk"] not in LEVELS}
    if bad:
        sys.exit(f"predictions contain values outside L/M/H: {bad}")
    return preds


def kappa(pairs):
    """Cohen's kappa — agreement corrected for chance."""
    n = len(pairs)
    if not n:
        return 0.0
    po = sum(1 for a, b in pairs if a == b) / n
    ka, kb = Counter(a for a, _ in pairs), Counter(b for _, b in pairs)
    pe = sum((ka[l] / n) * (kb[l] / n) for l in LEVELS)
    return 0.0 if pe == 1 else (po - pe) / (1 - pe)


def bar(x, width=28):
    return "█" * round(x * width) + "·" * (width - round(x * width))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("predictions", nargs="?")
    ap.add_argument("--out", help="also write the report to this path")
    ap.add_argument("--template", help="write a blank predictions template and exit")
    ap.add_argument("--manifest", help="path to eval-input manifest.json")
    args = ap.parse_args()

    key, manifest = load_key(), load_manifest(args.manifest)

    if args.template:
        tpl = [{"pr": pr, "risk": "", "confidence": None, "rationale": ""}
               for pr in sorted(manifest)]
        Path(args.template).write_text(json.dumps(tpl, indent=2) + "\n")
        print(f"template with {len(tpl)} entries -> {args.template}")
        return 0
    if not args.predictions:
        ap.error("predictions file required (or use --template)")

    preds = load_predictions(args.predictions)

    rows, missing, unknown = [], [], []
    for pr, row in sorted(manifest.items()):
        if row not in key:
            unknown.append(pr)
            continue
        truth, cat, branch = key[row]
        if pr not in preds:
            missing.append(pr)
            continue
        got = preds[pr]["risk"]
        rows.append(dict(pr=pr, branch=branch, cat=cat, truth=truth, pred=got,
                         ok=truth == got, dist=abs(ORD[truth] - ORD[got]),
                         conf=preds[pr].get("confidence")))

    extra = sorted(set(preds) - set(manifest))
    n = len(rows)
    if not n:
        sys.exit("no scoreable rows — check that PR numbers in the predictions match the manifest")

    acc = sum(r["ok"] for r in rows) / n
    severe = sum(1 for r in rows if r["dist"] == 2)
    k = kappa([(r["truth"], r["pred"]) for r in rows])

    # majority-class baseline: always answer with the commonest key label
    majority = Counter(r["truth"] for r in rows).most_common(1)[0]
    base = majority[1] / n

    out = [f"# Rezultati LLM procene rizika", "",
           f"Ključ: `docs/CATEGORIES.md` · Predikcije: `{args.predictions}` · "
           f"Ocenjeno **{n}** PR-ova.", ""]

    out += ["## Zbirno", "",
            "| Metrika | Vrednost |", "| --- | ---: |",
            f"| Tačnost (exact match) | **{acc:.1%}** ({sum(r['ok'] for r in rows)}/{n}) |",
            f"| Baseline (uvek „{majority[0]}\") | {base:.1%} |",
            f"| Poboljšanje nad baseline | {acc - base:+.1%} |",
            f"| Cohen's κ | {k:.3f} |",
            f"| Teške greške (L↔H) | {severe} |", ""]
    if acc <= base:
        out += ["> ⚠ Model ne nadmašuje trivijalni baseline koji uvek odgovara "
                f"„{majority[0]}\". Tačnost sama po sebi nije dokaz korisnosti.", ""]

    # confusion matrix
    cm = defaultdict(int)
    for r in rows:
        cm[(r["truth"], r["pred"])] += 1
    out += ["## Matrica konfuzije", "",
            "Redovi = ključ (tačan odgovor), kolone = LLM procena.", "",
            "| ključ \\ LLM | " + " | ".join(LEVELS) + " | ukupno |",
            "| --- | " + " | ".join("---:" for _ in LEVELS) + " | ---: |"]
    for t in LEVELS:
        tot = sum(cm[(t, p)] for p in LEVELS)
        cells = " | ".join(f"**{cm[(t,p)]}**" if t == p else str(cm[(t, p)]) for p in LEVELS)
        out.append(f"| **{t}** | {cells} | {tot} |")
    out.append("")

    # per-class recall — H recall is the thesis headline
    out += ["## Po nivou rizika", "",
            "| Nivo | U ključu | Pogođeno | Recall | |", "| --- | ---: | ---: | ---: | --- |"]
    for l in LEVELS:
        tot = sum(cm[(l, p)] for p in LEVELS)
        hit = cm[(l, l)]
        rec = hit / tot if tot else 0
        out.append(f"| {l} | {tot} | {hit} | {rec:.0%} | `{bar(rec)}` |")
    hrec = cm[("H", "H")] / max(1, sum(cm[("H", p)] for p in LEVELS))
    out += ["", f"**Recall na High = {hrec:.0%}.** To je ključna brojka rada: premisa je da "
            "„svi gejtovi zeleni, a PR i dalje rizičan\" — model je koristan tek ako te PR-ove "
            "prepoznaje.", ""]

    # per-category accuracy
    bycat = defaultdict(list)
    for r in rows:
        bycat[r["cat"]].append(r["ok"])
    out += ["## Po semantičkoj kategoriji", "",
            "| Kategorija | n | Tačnost |", "| --- | ---: | ---: |"]
    for c, v in sorted(bycat.items(), key=lambda x: -len(x[1])):
        out.append(f"| {c} | {len(v)} | {sum(v)/len(v):.0%} |")
    out.append("")

    # full table
    out += ["## Po PR-u", "",
            "| PR | Grana | Kategorija | Ključ | LLM | Poklapa se? |",
            "| ---: | --- | --- | :---: | :---: | :---: |"]
    for r in rows:
        mark = "✅" if r["ok"] else ("❌❌" if r["dist"] == 2 else "❌")
        out.append(f"| {r['pr']} | `{r['branch']}` | {r['cat']} | {r['truth']} | {r['pred']} | {mark} |")
    out.append("")

    if missing or extra or unknown:
        out += ["## Napomene o pokrivenosti", ""]
        if missing:
            out.append(f"- Bez predikcije ({len(missing)}): {missing}")
        if extra:
            out.append(f"- Predikcije za PR-ove van skupa ({len(extra)}): {extra}")
        if unknown:
            out.append(f"- Nema reda u ključu ({len(unknown)}): {unknown}")
        out.append("")

    text = "\n".join(out)
    if args.out:
        Path(args.out).write_text(text + "\n")
        print(f"report -> {args.out}")
    print(f"n={n}  accuracy={acc:.1%}  baseline={base:.1%}  kappa={k:.3f}  "
          f"H-recall={hrec:.0%}  severe={severe}")
    if missing:
        print(f"WARNING: {len(missing)} PRs have no prediction: {missing}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
