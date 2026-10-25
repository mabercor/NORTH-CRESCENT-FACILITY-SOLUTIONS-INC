"""Translates English strings that fr.json does not have yet, and saves them in fr.json.

    python3 tools/i18n/translate_missing.py missing.json

Needs the ANTHROPIC_API_KEY environment variable (a GitHub secret in the workflow).
Without it, nothing is translated and the new text stays in English on the French pages
until someone adds it to fr.json.
"""
import json
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
TM_PATH = os.path.join(HERE, "fr.json")
MODEL = os.environ.get("TRANSLATE_MODEL", "claude-sonnet-5-5")
BATCH = 40

STYLE = """You translate website text for North Crescent Facility Solutions Inc., a professional cleaning
company in Moncton, New Brunswick, Canada, into Canadian French as written in New Brunswick (Acadian region).
Keep the tone professional, warm and clear. Use these terms consistently:
quote → soumission; cookies → témoins (cookies); email → courriel; Contact (menu) → Nous joindre;
Reviews → Avis; Our Work → Réalisations; janitorial services → services d’entretien ménager;
post-construction → après construction; snow removal → déneigement; Booking → Réservation;
move-in / move-out → emménagement / déménagement; Southeast New Brunswick → sud-est du Nouveau-Brunswick.
Use the typographic apostrophe ’, French spacing before : ; ! ? (normal space), and « » for quotes.
Keep unchanged: the company name, place names, phone numbers, emails, prices, emoji and anything that looks like code.
Keep the same meaning and roughly the same length; do not add or drop information."""


def translate(batch):
    key = os.environ["ANTHROPIC_API_KEY"]
    prompt = (STYLE + "\n\nTranslate each string of this JSON array. Answer with only a JSON array of the "
              "translations, same order, same length.\n\n" + json.dumps(batch, ensure_ascii=False, indent=0))
    body = json.dumps({"model": MODEL, "max_tokens": 8000,
                       "messages": [{"role": "user", "content": prompt}]}).encode()
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body, headers={
        "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01"})
    with urllib.request.urlopen(req, timeout=180) as res:
        data = json.load(res)
    text = "".join(part.get("text", "") for part in data.get("content", []))
    text = text[text.index("["): text.rindex("]") + 1]
    out = json.loads(text)
    if len(out) != len(batch) or not all(isinstance(x, str) and x.strip() for x in out):
        raise ValueError("translation does not match the request")
    return out


def main():
    missing = json.load(open(sys.argv[1], encoding="utf-8"))
    if not missing:
        print("nothing to translate")
        return
    if not os.environ.get("ANTHROPIC_API_KEY") and not os.environ.get("TRANSLATE_DRY_RUN"):
        print(f"{len(missing)} strings need French, but ANTHROPIC_API_KEY is not set: they stay in English for now")
        return
    tm = json.load(open(TM_PATH, encoding="utf-8"))
    done = 0
    for i in range(0, len(missing), BATCH):
        batch = missing[i:i + BATCH]
        fr = ["[FR] " + s for s in batch] if os.environ.get("TRANSLATE_DRY_RUN") else translate(batch)
        for en, f in zip(batch, fr):
            tm["strings"][en] = f
            done += 1
    tm["strings"] = dict(sorted(tm["strings"].items()))
    json.dump(tm, open(TM_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"translated {done} strings")


if __name__ == "__main__":
    main()
