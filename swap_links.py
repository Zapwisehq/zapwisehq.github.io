#!/usr/bin/env python3
"""Replace PAYHIP_LINK_<slug> placeholders in every .html file with real URLs from payhip_links.json.
Usage: python3 swap_links.py            (apply; makes .bak copies first)
       python3 swap_links.py --check    (just list what's still a placeholder)
UTM tags already follow each placeholder (?utm_source=website&...), so paste bare Payhip URLs with no "?"."""
import json, re, sys, glob, shutil, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
links = {k: v.strip() for k, v in json.load(open("payhip_links.json")).items() if k.startswith("PAYHIP_LINK_")}
files = glob.glob("*.html") + glob.glob("p/*.html")
check = "--check" in sys.argv
for k, v in links.items():
    if v and ("?" in v or not v.startswith("https://payhip.com/")):
        sys.exit(f"{k}: expected a bare https://payhip.com/... URL without '?', got {v!r}")
left = set()
for f in files:
    s = open(f).read(); n = s
    for k, v in links.items():
        if v and not check: n = re.sub(re.escape(k) + r"(?![A-Za-z_])", v, n)
    left |= set(re.findall(r"PAYHIP_LINK_[a-z_]+", n))
    if n != s:
        shutil.copy(f, f + ".bak"); open(f, "w").write(n); print("updated", f)
print("still placeholders:", sorted(left) or "none (ready to push)")
