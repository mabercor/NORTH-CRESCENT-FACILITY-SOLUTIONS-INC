"""The site header (top menu), the same on every page, in English and French.

Used by build_fr.py. Run `python3 tools/i18n/build_fr.py` after changing an English page.
"""

# Pages that exist in both languages (same file name, French under /fr/).
PAGES = [
    "index.html", "services.html", "commercial-cleaning-moncton.html", "residential-cleaning-moncton.html",
    "office-cleaning-moncton.html", "airbnb-cleaning-moncton.html", "deep-cleaning-moncton.html",
    "janitorial-cleaning-moncton.html", "post-construction-cleaning-moncton.html", "snow-removal-moncton.html",
    "cleaning-concierge.html", "cleaning-booking-moncton.html", "process.html", "reviews.html", "work.html",
    "gallery.html", "contact.html", "privacy.html", "terms.html",
]

SERVICE_PAGES = [
    ("commercial-cleaning-moncton.html", "Commercial Cleaning", "Nettoyage commercial"),
    ("residential-cleaning-moncton.html", "Residential Cleaning", "Nettoyage résidentiel"),
    ("office-cleaning-moncton.html", "Office Cleaning", "Nettoyage de bureaux"),
    ("airbnb-cleaning-moncton.html", "Airbnb Cleaning", "Nettoyage Airbnb"),
    ("deep-cleaning-moncton.html", "Deep Cleaning", "Nettoyage en profondeur"),
    ("janitorial-cleaning-moncton.html", "Janitorial Services", "Services d’entretien ménager"),
    ("post-construction-cleaning-moncton.html", "Post-Construction Cleaning", "Nettoyage après construction"),
    ("snow-removal-moncton.html", "Seasonal Snow Removal", "Déneigement saisonnier"),
]

T = {
    "en": dict(home="Home", services="Services", concierge="Concierge", booking="Booking", process="Process",
               reviews="Reviews", work="Our Work", gallery="Gallery", contact="Contact",
               alt="North Crescent Facility Solutions — cleaning services in Moncton, NB", menu="Open the menu"),
    "fr": dict(home="Accueil", services="Services", concierge="Concierge", booking="Réservation", process="Processus",
               reviews="Avis", work="Réalisations", gallery="Galerie", contact="Nous joindre",
               alt="North Crescent Facility Solutions — services de nettoyage à Moncton (N.-B.)", menu="Ouvrir le menu"),
}


def url(lang, page):
    base = "/fr/" if lang == "fr" else "/"
    return base if page == "index.html" else base + page


def header(lang, page):
    t = T[lang]
    services_active = page == "services.html" or any(page == p for p, _, _ in SERVICE_PAGES)

    def cur(p):
        return ' aria-current="page"' if p == page else ""

    def cls(base, p, also=False):
        on = p == page or also
        c = (base + " active").strip() if on else base
        return f' class="{c}"' if c else ""

    items = "\n".join(
        f'            <a href="{url(lang, p)}"{cur(p)}>{fr if lang == "fr" else en}</a>' for p, en, fr in SERVICE_PAGES
    )
    return f'''<header>
  <div class="container header-inner">

    <div class="logo-container">
      <a href="{url(lang, "index.html")}">
        <img src="/images/logo.webp" alt="{t["alt"]}" width="70" height="70" decoding="async">
      </a>
      <div class="brand-title">
        NORTH CRESCENT <span>FACILITY SOLUTIONS</span>
      </div>
    </div>

    <div class="nav-wrapper">

      <div class="hamburger" id="menu-toggle" role="button" aria-label="{t["menu"]}" tabindex="0">
        <span></span><span></span><span></span>
      </div>

      <nav id="nav-menu">
        <a href="{url(lang, "index.html")}"{cls("", "index.html")}{cur("index.html")}>{t["home"]}</a>
        <div class="dropdown">
          <a href="{url(lang, "services.html")}"{cls("menu-link", "services.html", services_active)}{cur("services.html")}>
            {t["services"]} <span class="arrow">▾</span>
          </a>
          <div class="dropdown-menu">
{items}
          </div>
        </div>
        <a href="{url(lang, "cleaning-concierge.html")}"{cls("concierge-nav-link", "cleaning-concierge.html")}{cur("cleaning-concierge.html")}>
          <span class="concierge-nav-icon" aria-hidden="true">💬</span>
          <span>{t["concierge"]}</span>
        </a>
        <a href="{url(lang, "cleaning-booking-moncton.html")}"{cls("booking-nav-link", "cleaning-booking-moncton.html")}{cur("cleaning-booking-moncton.html")}>
          <span class="booking-nav-icon" aria-hidden="true">📅</span>
          <span>{t["booking"]}</span>
        </a>
        <a href="{url(lang, "process.html")}"{cls("", "process.html")}{cur("process.html")}>{t["process"]}</a>
        <a href="{url(lang, "reviews.html")}"{cls("", "reviews.html")}{cur("reviews.html")}>{t["reviews"]}</a>
        <a href="{url(lang, "work.html")}"{cls("", "work.html")}{cur("work.html")}>{t["work"]}</a>
        <a href="{url(lang, "gallery.html")}"{cls("", "gallery.html")}{cur("gallery.html")}>{t["gallery"]}</a>
        <a href="{url(lang, "contact.html")}" class="btn btn-primary"{cur("contact.html")}>{t["contact"]}</a>
      </nav>

      <div class="lang-switch">
        <a href="{url("en", page)}" lang="en" hreflang="en"{' aria-current="true"' if lang == "en" else ""}>EN</a>
        <a href="{url("fr", page)}" lang="fr" hreflang="fr"{' aria-current="true"' if lang == "fr" else ""}>FR</a>
      </div>

    </div>
  </div>
</header>'''
