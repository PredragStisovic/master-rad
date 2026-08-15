#!/usr/bin/env python3
"""Join merged PRs (git) against the pre-registered backlog rows, on branch name."""
import re, subprocess, json, sys
from collections import OrderedDict

REPO = "/Users/predrag/Dev/master-rad"

def git(*args):
    return subprocess.run(["git", "-C", REPO, *args], capture_output=True, text=True).stdout

# ---------- 1. backlog rows (current HEAD) ----------
ROW = re.compile(r"^\|\s*(\d+)\s*\|\s*([A-Za-z0-9/_-]+)\s*\|\s*(.*?)\s*\|\s*\**([LMH](?:→[LMH])?)\**\s*\|"
                 r"\s*(\S+)\s*\|\s*(\S+)\s*\|\s*(.*?)\s*\|\s*(\S+)\s*\|")
backlog = OrderedDict()
with open(f"{REPO}/docs/BACKLOG.md") as f:
    for line in f:
        m = ROW.match(line)
        if m:
            n, branch, goal, risk, cx, size, deps, own = m.groups()
            backlog[branch] = dict(no=int(n), branch=branch, goal=goal, risk=risk,
                                   cx=cx, size=size, deps=deps, own=own)

# which rows existed in the initial (pre-registration) commit?
first = git("log", "--diff-filter=A", "--format=%H", "--", "docs/BACKLOG.md").split()[-1]
orig_src = git("show", f"{first}:docs/BACKLOG.md")
orig = {m.group(2): m.group(4) for m in (ROW.match(l) for l in orig_src.splitlines()) if m}

# ---------- 2. merged PRs ----------
MERGE = re.compile(r"Merge pull request #(\d+) from PredragStisovic/(\S+)")
prs = []
for line in git("log", "--merges", "--format=%H\x1f%s\x1f%aI").splitlines():
    sha, subj, date = line.split("\x1f")
    m = MERGE.search(subj)
    if m:
        prs.append(dict(pr=int(m.group(1)), branch=m.group(2), sha=sha, date=date[:10]))
prs.sort(key=lambda p: p["pr"])

# ---------- 3. alias map for renamed / typo'd branches ----------
ALIAS = {
    "feature/auth-refesh-token":    "feature/auth-refresh-token",   # typo in branch
    "feature/registration-endpoint": "feature/auth-register",       # renamed
}

# ---------- 4. per-PR facts from the diff ----------
NOISE = [":(exclude)docs/", ":(exclude)package-lock.json"]

def diffstats(sha, exclude_docs):
    spec = [f"{sha}^1...{sha}^2", "--", "."] + (NOISE if exclude_docs else [])
    out = git("diff", "--numstat", *spec)
    files = ins = dele = 0
    paths = []
    for l in out.splitlines():
        parts = l.split("\t")
        if len(parts) == 3:
            a, d, p = parts
            files += 1
            ins += int(a) if a.isdigit() else 0
            dele += int(d) if d.isdigit() else 0
            paths.append(p)
    return files, ins, dele, paths

KEYPAT = re.compile(r"^Category:|risk rationale|Risk: [LMH]", re.I | re.M)

rows = []
for p in prs:
    bl_branch = ALIAS.get(p["branch"], p["branch"])
    bl = backlog.get(bl_branch)
    files, ins, dele, paths = diffstats(p["sha"], exclude_docs=True)
    _, _, _, paths_all = diffstats(p["sha"], exclude_docs=False)
    body = git("log", "--format=%b", f"{p['sha']}^1..{p['sha']}^2")
    flags = []
    if any("prisma/migrations" in x for x in paths): flags.append("migration")
    if any(re.search(r"(auth|guard|strateg|permission|role)", x, re.I) for x in paths): flags.append("authz")
    if any(x.startswith("docs/") for x in paths_all): flags.append("docs-touched")
    if any(x.startswith(".github/") or "sonar" in x for x in paths): flags.append("ci")
    if KEYPAT.search(body): flags.append("KEY-IN-COMMIT")
    rows.append(dict(
        pr=p["pr"], date=p["date"], branch=p["branch"],
        bl_no=bl["no"] if bl else None,
        risk=bl["risk"] if bl else None,
        size_planned=bl["size"] if bl else None,
        own=bl["own"] if bl else None,
        prereg="pre-registered" if bl and bl_branch in orig else ("added-during-dev" if bl else "NO ROW"),
        files=files, ins=ins, dele=dele,
        size_actual="S" if ins < 150 else ("M" if ins <= 400 else "L"),
        flags=",".join(flags) or "-",
        alias=bl_branch if bl_branch != p["branch"] else "",
    ))

json.dump(rows, open(sys.argv[1], "w"), indent=1)

# ---------- 5. markdown ----------
out = ["| PR | date | branch | BL# | risk | prereg | plan→actual size | files | +/- | flags |",
       "|---:|------|--------|----:|:----:|--------|------------------|------:|-----|-------|"]
for r in rows:
    size = f"{r['size_planned']}→{r['size_actual']}" if r["size_planned"] else f"?→{r['size_actual']}"
    mismatch = "" if r["size_planned"] == r["size_actual"] else " ⚠"
    out.append(f"| {r['pr']} | {r['date']} | `{r['branch']}` | {r['bl_no'] or '—'} | "
               f"{r['risk'] or '**?**'} | {r['prereg']} | {size}{mismatch} | {r['files']} | "
               f"+{r['ins']}/-{r['dele']} | {r['flags']} |")
print("\n".join(out))

# ---------- 6. judgement calls ----------
print("\n\n## Rows needing your decision\n")
for r in rows:
    if r["prereg"] == "NO ROW":
        print(f"- **PR #{r['pr']} `{r['branch']}`** — no backlog row at all; needs a risk label.")
    if r["risk"] and "→" in r["risk"]:
        print(f"- **PR #{r['pr']} `{r['branch']}`** — backlog risk is a range `{r['risk']}`; must resolve to one letter.")
    if r["alias"]:
        print(f"- PR #{r['pr']} `{r['branch']}` joined to backlog row via alias → `{r['alias']}` (confirm).")

merged_branches = {ALIAS.get(p["branch"], p["branch"]) for p in prs}
print("\n### Backlog rows never merged under their planned branch name\n")
for b, d in backlog.items():
    if b not in merged_branches:
        state = "pre-registered" if b in orig else "added-during-dev"
        print(f"- BL#{d['no']} `{b}` (risk {d['risk']}, {state}) — {d['goal']}")
