#!/usr/bin/env python3
"""Bundle the prototype into one self-contained HTML file for offline demos.

    python3 scripts/build_standalone.py                      -> dist/takenote-ipad.html
    python3 scripts/build_standalone.py --apple-emoji DIR    -> dist/takenote-ipad.apple.html

The default build uses the device's emoji font and is safe to share.
--apple-emoji embeds Apple emoji images (WebP or PNG named by code point, e.g. 1f60a.png
from the emoji-datasource-apple package). Apple's artwork is not licensed for
redistribution: keep that build on your own devices. *.apple.html is git-ignored.

Standard library only. Inline <script> cannot run under the folder's strict CSP, so the
bundle drops the CSP <meta>; it has no network access to protect apart from Google Fonts.
"""
import argparse
import base64
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def emoji_map(folder, wanted):
    out = {}
    for code in wanted:
        for ext, mime in (("webp", "image/webp"), ("png", "image/png")):
            p = folder / f"{code}.{ext}"
            if p.is_file():
                out[code] = f"data:{mime};base64," + base64.b64encode(p.read_bytes()).decode()
                break
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apple-emoji", type=Path, metavar="DIR", help="folder of Apple emoji images (private builds only)")
    ap.add_argument("--out", type=Path, help="output file (default: dist/takenote-ipad[.apple].html)")
    a = ap.parse_args()

    html = read("index.html")
    data = json.loads(read("data/emoji-all.json"))
    app = read("js/app.js")
    emoji_js = "const EMOJI = {};"

    if a.apple_emoji:
        if not a.apple_emoji.is_dir():
            sys.exit(f"not a folder: {a.apple_emoji}")
        codes = {row[0] for _, rows in data["cats"] for row in rows}
        codes |= set(re.findall(r"'(1f[0-9a-f-]+|2[0-9a-f]{3}(?:-[0-9a-f]+)*)'", app))
        imgs = emoji_map(a.apple_emoji, sorted(codes))
        if not imgs:
            sys.exit("no emoji images found; expected files like 1f60a.png")
        emoji_js = "const EMOJI = " + json.dumps(imgs, separators=(",", ":")) + ";"
        print(f"embedded {len(imgs)} of {len(codes)} emoji images", file=sys.stderr)

    # the list is inlined, so the app no longer needs to fetch it
    inline_data = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    app = app.replace("fetch('data/emoji-all.json')",
                      f"Promise.resolve({{ok:true,json:()=>({inline_data})}})")
    if "fetch('data/emoji-all.json')" in app:
        sys.exit("could not inline the emoji list")

    safe = lambda s: s.replace("</script", "<\\/script")
    html = re.sub(r'\s*<meta http-equiv="Content-Security-Policy"[^>]*>', "", html)
    html = re.sub(r"<!-- Security:.*?-->\n", "", html)
    html = html.replace('<link rel="stylesheet" href="css/app.css">', lambda_style(read("css/app.css")))
    html = html.replace('<script src="js/emoji.js"></script>', f"<script>\n{safe(emoji_js)}\n</script>")
    html = html.replace('<script src="js/app.js"></script>', f"<script>\n{safe(app)}\n</script>")
    if 'src="js/' in html or 'href="css/' in html:
        sys.exit("a local file reference was left in the bundle")

    out = a.out or ROOT / "dist" / ("takenote-ipad.apple.html" if a.apple_emoji else "takenote-ipad.html")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size // 1024} KB)")


def lambda_style(css):
    return "<style>\n" + css.replace("</style", "<\\/style") + "</style>"


if __name__ == "__main__":
    main()
