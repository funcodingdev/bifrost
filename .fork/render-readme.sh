#!/usr/bin/env bash
set -euo pipefail

# Compose README.md and README.en.md from a fork-owned header plus upstream's
# own README body.
#
#   .fork/render-readme.sh [ref]     ref defaults to HEAD
#
# The body is taken verbatim from upstream so it keeps improving with upstream,
# rather than being a snapshot that quietly rots. Only the header above the rule
# belongs to this fork.
#
# README.md is marked `merge=ours` in .gitattributes precisely because it is
# generated: a merge conflict in a generated file is noise, and the sync workflow
# re-renders it from the newly merged upstream README anyway.

REF="${1:-HEAD}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# `git show <ref>:README.md` rather than reading the working tree: at this point
# in a sync the working tree's README.md is still the previous render (merge=ours
# kept ours), while the ref carries upstream's current text.
if ! BODY="$(git show "${REF}:README.md" 2>/dev/null)"; then
	echo "error: no README.md at ${REF}" >&2
	exit 1
fi

# Upstream's README is the source of the body; if it ever starts with our own
# header we would be compounding renders, so refuse rather than nest them.
if printf '%s' "$BODY" | head -1 | grep -q "Bifrost 中文版\|Bifrost, localised"; then
	echo "error: ${REF}:README.md is already a rendered README — pass an upstream ref" >&2
	exit 1
fi

render() {
	local header="$1" out="$2"
	{
		cat "$header"
		printf '\n'
		printf '%s\n' "$BODY"
	} > "$out"
	echo "wrote ${out} ($(wc -l < "$out" | tr -d ' ') lines)"
}

render .fork/readme-header.zh.md README.md
render .fork/readme-header.en.md README.en.md
