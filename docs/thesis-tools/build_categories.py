#!/usr/bin/env python3
"""Emit docs/CATEGORIES.md — one fillable row per merged PR."""
import json, subprocess, re, sys, collections

REPO = "/Users/predrag/Dev/master-rad"
rows = json.load(open(f"{sys.argv[1]}"))

def git(*a):
    return subprocess.run(["git", "-C", REPO, *a], capture_output=True, text=True).stdout

# categories already recorded in commit messages
recorded = {}
for m in git("log", "--merges", "--format=%H\x1f%s").splitlines():
    sha, subj = m.split("\x1f")
    pr = re.search(r"pull request #(\d+)", subj)
    if not pr:
        continue
    body = git("log", "--format=%b", f"{sha}^1..{sha}^2")
    # two formats in the history: "Category: Feature" on its own line, and the
    # later inline "Category: Feature. Risk: L." — stop at a period or end of line.
    c = re.search(r"^Category:\s*([A-Za-z][A-Za-z /-]*?)\s*(?:\.|$)", body, re.M)
    if c:
        name = c.group(1).strip()
        recorded[int(pr.group(1))] = "Infrastructure / CI" if name.replace(" ", "") in (
            "Infrastructure-CI", "Infrastructure/CI") else name

# Categories already filled in by hand in the existing CATEGORIES.md always win over
# anything recovered from commit messages — regenerating must never destroy manual work.
existing = {}
try:
    for line in open(f"{REPO}/docs/CATEGORIES.md"):
        m = re.match(r"^\|\s*([0-9]+)(?:\+[0-9]+)?\s*\|.*\|\s*([^|]*?)\s*\|\s*$", line)
        if m and m.group(2):
            existing[int(m.group(1))] = m.group(2).replace("`", "").strip()
except FileNotFoundError:
    pass
recorded.update(existing)

# --- researcher decisions, 2026-08-15 ---
RISK_OVERRIDE = {56: "H"}          # M→H range resolved to H (touches DB)
COLLAPSE = {14: 13}                # #13 and #14 are one logical PR

byno = {r["pr"]: r for r in rows}
out_rows = []
for r in rows:
    if r["pr"] in COLLAPSE:
        continue
    risk = RISK_OVERRIDE.get(r["pr"], r["risk"])
    label = f"13+14" if r["pr"] == 13 else str(r["pr"])
    sig = [f for f in r["flags"].split(",") if f in ("migration", "authz", "ci")]
    out_rows.append(dict(label=label, pr=r["pr"], branch=r["branch"], bl=r["bl_no"],
                         risk=risk, sig=", ".join(sig) or "—",
                         cat=recorded.get(r["pr"], "")))

filled = sum(1 for r in out_rows if r["cat"])
blank = len(out_rows) - filled

lines = [
    "# Semantičke kategorije po PR-u",
    "",
    "Radna tabela za §2 i §5 [`METHODOLOGY.md`](METHODOLOGY.md). Jedan red po realizovanom",
    "Pull Request-u. **Kolona `Kategorija` se popunjava ručno** — po _suštini promene_, ne po",
    "prefiksu grane (`feature/auth-login-jwt` je **Security**, ne Feature).",
    "",
    (f"Status: **popunjeno svih {filled} redova**." if blank == 0
     else f"Popunjeno: **{filled}**. Ostaje za popuniti: **{blank}**."),
    "",
    "Dozvoljene vrednosti (tačno jedna po PR-u):",
    "",
    "`Feature` · `Bug fix` · `Refactoring` · `Performance` · `Security` · `DB migration` · `Infrastructure / CI`",
    "",
    "Kolona `Rizik` je **pre-registrovani ključ** iz [`BACKLOG.md`](BACKLOG.md) — ne menjati je ovde.",
    "Kolona `Signali` je samo mehanički trag (koje su datoteke dirane), kao podsetnik — nije predlog kategorije.",
    "",
    "| PR | Grana | BL# | Rizik | Signali | Kategorija |",
    "| ---: | --- | ---: | :---: | --- | --- |",
]
for r in out_rows:
    lines.append(f"| {r['label']} | `{r['branch']}` | {r['bl'] or '—'} | {r['risk']} | {r['sig']} | {r['cat']} |")

# Zbir is computed from the table above, never hand-maintained — the two cannot drift apart.
TARGETS = [("Feature", 22), ("DB migration", 8), ("Security", 8), ("Infrastructure / CI", 12),
           ("Bug fix", 10), ("Refactoring", 8), ("Performance", 5)]
tally = collections.Counter(r["cat"] for r in out_rows if r["cat"])
lines += ["", "## Zbir", "",
          "| Kategorija | Ciljni broj (≈) | Realizovano | Razlika |",
          "| --- | ---: | ---: | ---: |"]
for name, target in TARGETS:
    got = tally.get(name, 0)
    d = got - target
    lines.append(f"| {name} | {target} | {got} | {'0' if d == 0 else f'{d:+d}'.replace('-', '−')} |")
tt = sum(t for _, t in TARGETS)
lines += [f"| **Ukupno** | **~73** | **{len(out_rows)}** | **{len(out_rows) - tt:+d}**".replace("-", "−") + " |", ""]

unknown = set(tally) - {n for n, _ in TARGETS}
if unknown:
    print(f"WARNING: categories outside the §2 taxonomy: {sorted(unknown)}")
open(f"{REPO}/docs/CATEGORIES.md", "w").write("\n".join(lines) + "\n")
print(f"{len(out_rows)} rows · {filled} prefilled · {blank} to fill")
