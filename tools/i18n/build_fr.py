"""Builds the French site (/fr/*.html) from the English pages.

    python3 tools/i18n/build_fr.py           # writes fr/*.html, lists any English text without a translation
    python3 tools/i18n/build_fr.py --check   # only lists missing translations
    python3 tools/i18n/build_fr.py --check --missing-json missing.json   # same, saved for translate_missing.py

On GitHub this runs by itself (.github/workflows/french-site.yml) after every change to an English page.

How it works
- The English page is the source of truth: layout, images, scripts and styles are copied as they are.
- Every visible piece of English (text, alt, title, placeholder, aria-label, meta descriptions,
  JSON-LD names / descriptions / FAQ answers) is looked up in tools/i18n/fr.json and replaced.
- The top menu comes from header.py, links point to /fr/, and lang / canonical / hreflang / og:url are set.
- <option> values and radio values stay in English, so the office keeps receiving the same names.
- fr/privacy.html is written by hand (it covers PIPEDA in more detail) and is not generated.

After changing an English page: run the script, add the strings it reports to fr.json, run it again.
"""
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)

from extract import norm, segments  # noqa: E402
from header import PAGES, header, url  # noqa: E402

SITE = "https://northcrescentcleaning.com"
HAND_WRITTEN = {"privacy.html"}
TM = json.load(open(os.path.join(HERE, "fr.json"), encoding="utf-8"))
STRINGS, LINES = TM["strings"], TM["lines"]

PAGE_SET = set(PAGES)
missing = {}


def translate(key, page):
    if key in STRINGS:
        return STRINGS[key]
    missing.setdefault(page, []).append(key)
    return None


def translate_lines(raw, page):
    """Long legal paragraphs: one translation per line, layout kept."""
    out = []
    for line in raw.split("\n"):
        key = norm(line)
        if not key:
            out.append(line)
            continue
        fr = STRINGS.get(key) or LINES.get(key)
        if fr is None:
            missing.setdefault(page, []).append(key)
            out.append(line)
            continue
        lead = line[: len(line) - len(line.lstrip())]
        out.append(lead + html.escape(fr, quote=False))
    return "\n".join(out)


def keep_space(raw, text):
    lead = raw[: len(raw) - len(raw.lstrip())]
    trail = raw[len(raw.rstrip()):]
    return lead + text + trail


def body_text(src, page):
    spans = list(segments(src))
    for kind, start, end, key in reversed(spans):
        raw = src[start:end]
        fr = STRINGS.get(key)
        if fr is None and kind == "text" and "\n" in raw.strip():
            src = src[:start] + translate_lines(raw, page) + src[end:]
            continue
        if fr is None:
            translate(key, page)
            continue
        if kind == "attr":
            src = src[:start] + html.escape(fr, quote=True) + src[end:]
        else:
            src = src[:start] + keep_space(raw, html.escape(fr, quote=False)) + src[end:]
    return src


JSON_STR = re.compile(r'("(?:name|description|text|headline|alternateName|serviceType|caption|slogan|reviewBody|'
                      r'disambiguatingDescription|category|areaServed)"\s*:\s*)"((?:[^"\\]|\\.)*)"')


def jsonld(src, page):
    def fix_block(m):
        block = m.group(0)

        def fix_value(v):
            raw = json.loads('"' + v.group(2) + '"')
            fr = STRINGS.get(norm(raw))
            if fr is None:
                if re.search(r"[a-z]{3,} [a-z]{3,}", raw):
                    missing.setdefault(page, []).append(norm(raw))
                return v.group(0)
            return v.group(1) + json.dumps(fr, ensure_ascii=False)

        block = JSON_STR.sub(fix_value, block)
        block = re.sub(r'("inLanguage"\s*:\s*)"en(-CA)?"', r'\1"fr-CA"', block)
        return block

    return re.sub(r'<script type="application/ld\+json">.*?</script>', fix_block, src, flags=re.S)


def fr_href(target):
    """English link → French link (pages only; files, anchors and other sites are kept)."""
    if re.match(r"^(#|mailto:|tel:|sms:|javascript:|data:)", target):
        return target
    absolute = target.startswith(SITE)
    path = target[len(SITE):] if absolute else target
    if re.match(r"^[a-z]+:", path) or path.startswith("//"):
        return target
    if path.startswith("/fr/") or path == "/fr":
        return target
    bare = path.lstrip("/")
    page, rest = re.match(r"^([^?#]*)(.*)$", bare, re.S).groups()
    if page in ("", "index.html"):
        new = "/fr/" + rest
    elif page in PAGE_SET:
        new = "/fr/" + page + rest
    else:
        # a file (styles.css, a pdf...) written relative to the English page
        return target if path.startswith("/") or absolute else "/" + path
    return SITE + new if absolute else new


def links(src):
    def fix(m):
        return m.group(1) + fr_href(m.group(2)) + m.group(3)

    # protect the hreflang / canonical lines (rewritten in head())
    return re.sub(r'(\b(?:href|src)=")([^"]*)(")', fix, src)


def hreflang(page):
    en = SITE + url("en", page)
    fr = SITE + url("fr", page)
    return (f'<link rel="alternate" hreflang="en-CA" href="{en}">\n'
            f'<link rel="alternate" hreflang="fr-CA" href="{fr}">\n'
            f'<link rel="alternate" hreflang="x-default" href="{en}">')


def head(src, page, lang):
    own = SITE + url(lang, page)
    src = re.sub(r'<html lang="[^"]*"', f'<html lang="{"fr-CA" if lang == "fr" else "en"}"', src, count=1)
    src = re.sub(r'\s*<!--\s*HREFLANG\s*-->', "", src)
    src = re.sub(r'[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*">\s*\n?', "", src)
    if re.search(r'<link rel="canonical"', src):
        src = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{own}">\n' + hreflang(page), src, count=1)
    else:
        src = src.replace("</title>", f'</title>\n<link rel="canonical" href="{own}">\n' + hreflang(page), 1)
    src = re.sub(r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1) + own + m.group(2), src)
    locale = "fr_CA" if lang == "fr" else "en_CA"
    if 'property="og:locale"' in src:
        src = re.sub(r'(<meta property="og:locale" content=")[^"]*(")', lambda m: m.group(1) + locale + m.group(2), src)
    elif 'property="og:url"' in src:
        src = re.sub(r'(<meta property="og:url"[^>]*>)', lambda m: m.group(1) + f'\n<meta property="og:locale" content="{locale}">', src, count=1)
    return src


def options(src):
    """<option>Text</option> → <option value="Text">Texte</option>: the form still sends the English name."""
    def fix(m):
        attrs, text = m.group(1), m.group(2)
        if "value=" in attrs or not norm(text):
            return m.group(0)
        value = html.escape(norm(text), quote=True)
        return f'<option{attrs} value="{value}">{text}</option>'

    return re.sub(r"<option([^>]*)>(.*?)</option>", fix, src, flags=re.S)


WIDGET_CSS = '<link rel="stylesheet" href="/concierge-widget.css">'
WIDGET_JS = '<script src="/concierge/concierge-widget.js" defer></script>'


def widget(src, page):
    if page == "cleaning-concierge.html":
        return src
    if "concierge-widget.css" not in src:
        src = src.replace("</head>", WIDGET_CSS + "\n</head>", 1)
    if "concierge-widget.js" not in src:
        src = src.replace("</body>", WIDGET_JS + "\n</body>", 1)
    return src


TERMS_NOTE = ('\n  <p class="legal-sub">\n'
              '    Traduction offerte pour votre commodité. En cas de divergence, la version anglaise prévaut.\n'
              '  </p>\n')


def build(page):
    src = open(os.path.join(ROOT, page), encoding="utf-8").read()
    src = options(src)
    src = body_text(src, page)
    src = jsonld(src, page)
    src = links(src)
    src = head(src, page, "fr")
    src = re.sub(r"<header>.*?</header>", lambda m: header("fr", page), src, count=1, flags=re.S)
    src = widget(src, page)
    if page == "terms.html":
        src = src.replace("Version : 2026\n  </p>\n", "Version : 2026\n  </p>\n" + TERMS_NOTE, 1)
    return src


def english_heads():
    """Keeps lang / canonical / hreflang right on the English pages too."""
    for page in PAGES:
        path = os.path.join(ROOT, page)
        src = open(path, encoding="utf-8").read()
        new = head(src, page, "en")
        if new != src:
            open(path, "w", encoding="utf-8").write(new)
    # the hand-written French pages get the same head tags and French links
    for page in HAND_WRITTEN:
        path = os.path.join(ROOT, "fr", page)
        src = open(path, encoding="utf-8").read()
        new = head(links(src), page, "fr")
        if new != src:
            open(path, "w", encoding="utf-8").write(new)


def sitemap():
    """sitemap.xml: every page in both languages, each pointing to its translation."""
    rows = []
    for page in PAGES:
        en, fr = SITE + url("en", page), SITE + url("fr", page)
        alt = (f'    <xhtml:link rel="alternate" hreflang="en-CA" href="{en}"/>\n'
               f'    <xhtml:link rel="alternate" hreflang="fr-CA" href="{fr}"/>\n'
               f'    <xhtml:link rel="alternate" hreflang="x-default" href="{en}"/>\n')
        for loc in (en, fr):
            rows.append(f"<url>\n    <loc>{loc}</loc>\n{alt}</url>\n")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
           '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n\n' + "\n".join(rows) + "\n</urlset>\n")
    open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write(xml)


def main():
    check = "--check" in sys.argv
    if not check:
        english_heads()
        sitemap()
    for page in PAGES:
        if page in HAND_WRITTEN:
            continue
        out = build(page)
        if not check:
            os.makedirs(os.path.join(ROOT, "fr"), exist_ok=True)
            open(os.path.join(ROOT, "fr", page), "w", encoding="utf-8").write(out)
    total = sum(len(set(v)) for v in missing.values())
    for page, keys in missing.items():
        for k in dict.fromkeys(keys):
            print(f"missing  {page}: {k[:110]}")
    print(f"{'checked' if check else 'built'} {len(PAGES) - len(HAND_WRITTEN)} French pages, {total} missing strings")
    if "--missing-json" in sys.argv:
        # list for translate_missing.py (one entry per English string, in page order)
        keys = list(dict.fromkeys(k for v in missing.values() for k in v))
        json.dump(keys, open(sys.argv[sys.argv.index("--missing-json") + 1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
