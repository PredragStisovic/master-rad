#!/usr/bin/env python3
"""
Turn the frozen history into one self-contained evaluation input per PR.

Implements the input contract from METHODOLOGY.md §10.1: the model sees the diff
(with docs/ stripped), the branch name and the PR title — nothing else. It never
sees commit messages, the backlog, the category table, or any L/M/H label.

Layout:
  <out>/PR-<n>/meta.json     LLM-visible metadata
  <out>/PR-<n>/changes.diff  LLM-visible diff
  <out>/manifest.json        join back to the key — NOT given to the model

Usage:
  python3 docs/thesis-tools/extract_eval_inputs.py [--ref freeze/v1] [--out eval-input]
"""
import argparse, json, re, subprocess, sys, shutil
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
# §10.1 — docs/ holds the key; package-lock.json is machine-generated churn no
# reviewer reads, and on three PRs it is over 90% of the diff.
EXCLUDE = [":(exclude)docs/", ":(exclude)package-lock.json"]
MERGE_RE = re.compile(r"Merge pull request #(\d+) from \S+?/(\S+)")

# Patterns that must never appear in a generated input file.
LEAK_RE = re.compile(
    r"Risk:\s*[LMH]\b|Risk rationale|Rizik ostaje|^\+.*Category:\s*"
    r"(Feature|Security|Bug fix|Refactoring|Performance|DB migration|Infrastructure)",
    re.M | re.I)


def git(*args: str) -> str:
    r = subprocess.run(["git", "-C", str(REPO), *args],
                       capture_output=True, text=True)
    if r.returncode != 0 and not r.stdout:
        sys.exit(f"git {' '.join(args)} failed:\n{r.stderr}")
    return r.stdout


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", default="freeze/v1", help="frozen ref to extract from")
    ap.add_argument("--out", default="eval-input", help="output directory")
    args = ap.parse_args()

    git("rev-parse", "--verify", f"{args.ref}^{{commit}}")  # fail fast if missing

    out = REPO / args.out
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    manifest, leaks, sizes, skipped = [], [], [], []
    for line in git("log", "--merges", "--format=%H\x1f%s\x1f%aI", args.ref).splitlines():
        sha, subj, date = line.split("\x1f")
        m = MERGE_RE.search(subj)
        if not m:
            continue                       # "Merge branch 'main' into ..." — not a PR
        pr, branch = int(m.group(1)), m.group(2)

        rng = f"{sha}^1...{sha}^2"
        diff = git("diff", rng, "--", ".", *EXCLUDE)
        stat = git("diff", "--numstat", rng, "--", ".", *EXCLUDE)

        files, ins, dele = [], 0, 0
        for row in stat.splitlines():
            parts = row.split("\t")
            if len(parts) == 3:
                a, d, path = parts
                files.append(path)
                ins += int(a) if a.isdigit() else 0
                dele += int(d) if d.isdigit() else 0

        # The PR title is the merge-commit body's first line (GitHub puts it there).
        title = git("log", "-1", "--format=%b", sha).strip().splitlines()
        title = title[0] if title else branch

        # A PR whose entire diff was excluded has nothing to evaluate. PR #13 is
        # lockfile-only; its key row "13+14" is still covered by PR #14.
        if not diff.strip():
            skipped.append({"pr": pr, "branch": branch,
                            "reason": "diff empty after exclusions"})
            continue

        d = out / f"PR-{pr}"
        d.mkdir()
        (d / "changes.diff").write_text(diff)
        (d / "meta.json").write_text(json.dumps({
            "pr": pr,
            "branch": branch,
            "title": title,
            "merged_at": date[:10],
            "files_changed": len(files),
            "insertions": ins,
            "deletions": dele,
            "files": files,
        }, indent=2, ensure_ascii=False) + "\n")

        for f in ("changes.diff", "meta.json"):
            hit = LEAK_RE.search((d / f).read_text())
            if hit:
                leaks.append(f"PR-{pr}/{f}: {hit.group(0)[:60]}")

        sizes.append((len(diff), pr, branch))
        # 13 and 14 are the same logical PR in the key (see METHODOLOGY deviation log).
        manifest.append({"pr": pr, "branch": branch, "key_row": "13+14"
                         if pr in (13, 14) else str(pr), "sha": sha})

    (out / "manifest.json").write_text(json.dumps(
        {"ref": args.ref, "generated_from": git("rev-parse", args.ref).strip(),
         "count": len(manifest), "skipped": skipped, "prs": manifest}, indent=2) + "\n")

    print(f"{len(manifest)} evaluation inputs written to {out.relative_to(REPO)}/")
    for s_ in skipped:
        print(f"skipped PR-{s_['pr']} ({s_['branch']}): {s_['reason']}")
    print(f"leak check: {'CLEAN' if not leaks else str(len(leaks)) + ' PROBLEMS'}")
    for l in leaks:
        print("  !", l)
    sizes.sort(reverse=True)
    print("largest diffs (bytes):")
    for n, pr, br in sizes[:5]:
        print(f"  PR-{pr:<3} {n:>9,}  {br}")
    return 1 if leaks else 0


if __name__ == "__main__":
    sys.exit(main())
