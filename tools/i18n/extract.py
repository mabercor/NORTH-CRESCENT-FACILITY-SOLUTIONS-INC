"""Finds every piece of visible English text in a page (text, alt, title, placeholder, aria-label,
meta description / social titles). build_fr.py uses the same rules to put the French back."""
import html
import re

SKIP_BLOCKS = re.compile(r"<(script|style|svg|noscript|template)\b.*?</\1\s*>", re.S | re.I)
TAG = re.compile(r"<[^>]+>")
ATTR = re.compile(r'\b(alt|title|placeholder|aria-label|data-message|content)\s*=\s*"([^"]*)"', re.I)
META_KEYS = re.compile(r'(name|property)\s*=\s*"(description|og:title|og:description|og:image:alt|twitter:title|twitter:description)"', re.I)
WORDY = re.compile(r"[A-Za-zÀ-ÿ]{2}")


def norm(text):
    return " ".join(html.unescape(text).split())


def translatable_attr(tag, name, value):
    if name.lower() == "content":
        return bool(META_KEYS.search(tag)) and WORDY.search(value)
    return bool(WORDY.search(value))


def segments(src):
    """Yields (kind, start, end, key): kind 'text' or 'attr'; [start:end] is the raw span to replace."""
    protected = [(m.start(), m.end()) for m in SKIP_BLOCKS.finditer(src)]
    # the <head> title is a normal text node; header/nav are rebuilt by header.py and skipped
    hdr = re.search(r"<header>.*?</header>", src, re.S)
    if hdr:
        protected.append((hdr.start(), hdr.end()))
    protected.sort()

    def inside(i):
        return any(a <= i < b for a, b in protected)

    pos = 0
    for m in TAG.finditer(src):
        if m.start() > pos and not inside(pos):
            raw = src[pos:m.start()]
            key = norm(raw)
            if key and WORDY.search(key):
                yield ("text", pos, m.start(), key)
        tag = m.group(0)
        if not inside(m.start()) and not tag.startswith("</"):
            for a in ATTR.finditer(tag):
                if translatable_attr(tag, a.group(1), a.group(2)):
                    key = norm(a.group(2))
                    if key:
                        yield ("attr", m.start() + a.start(2), m.start() + a.end(2), key)
        pos = m.end()
