"""Pack the caregiver dashboard page for the cloud relay: relay/src/page.html.

Same idea as firmware/door_sensor/scripts/embed_dashboard.py: read the page
the laptop serves (dashboard/static/v2), inline its CSS and JS into one file,
and apply the few relay-only changes below - each checked to have applied, so
an edit of the page that moves the text fails loudly instead of shipping an
unpatched page. Run before every deploy (npm run deploy does it).
"""

from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE_DIR = os.path.normpath(os.path.join(HERE, "..", "dashboard", "static", "v2"))
OUT = os.path.join(HERE, "src", "page.html")

# (file, find, replace, why)
PATCHES = [
    ("index.html", '<a href="/classic">Classic view</a>',
     "Remote view through the SESEMSG cloud relay.",
     "the relay has no classic page"),
    # The relay's data changes when the hub pushes, every 3 s: polling faster
    # only spends the free plan's daily request allowance.
    ("home.js", "const POLL_MS = 1000;", "const POLL_MS = 3000;",
     "poll at the hub's push rate"),
]
CSS_LINK = '<link rel="stylesheet" href="/static/v2/home.css">'
JS_TAG = '<script src="/static/v2/home.js"></script>'


def replace_once(text: str, find: str, repl: str, why: str) -> str:
    n = text.count(find)
    if n != 1:
        sys.exit(f"build_page: expected exactly one '{find}' ({why}), found {n}. "
                 "The dashboard page changed - update PATCHES in this script.")
    return text.replace(find, repl)


def main() -> None:
    files = {}
    for name in ("index.html", "home.css", "home.js"):
        with open(os.path.join(PAGE_DIR, name), "r", encoding="utf-8") as fh:
            files[name] = fh.read()
    for name, find, repl, why in PATCHES:
        files[name] = replace_once(files[name], find, repl, why)
    if "</script" in files["home.js"].lower():
        sys.exit("build_page: home.js contains '</script' - cannot inline it safely")
    html = replace_once(files["index.html"], CSS_LINK, "<style>" + files["home.css"] + "</style>", "inline CSS")
    html = replace_once(html, JS_TAG, "<script>" + files["home.js"] + "</script>", "inline JS")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(html)
    print(f"build_page: {PAGE_DIR} -> relay/src/page.html ({len(html)} chars)")


if __name__ == "__main__":
    main()
