'use strict';

/**
 * Strings a seoEnabled path locale must be able to render:
 * navigation, footer, primary CTA, and the language/market labels.
 */

const CHROME = Object.freeze({
  en: Object.freeze({
    languageLabel: 'Language',
    marketLabel: 'Market',
    home: 'My Starday',
    primaryCta: 'Get My Starday',
    footer: 'Home',
  }),
  nl: Object.freeze({
    languageLabel: 'Taal',
    marketLabel: 'Markt',
    home: 'My Starday',
    primaryCta: 'Zo werkt het',
    footer: 'Start',
    guides: 'Gidsen',
    faq: 'Veelgestelde vragen',
    privacy: 'Privacy',
    terms: 'Voorwaarden',
    backHome: 'Terug naar My Starday',
    notFoundTitle: 'Pagina niet gevonden',
    notFoundH1: 'Pagina niet gevonden',
    notFoundLink: 'Naar de Nederlandstalige site',
  }),
  de: Object.freeze({
    languageLabel: 'Sprache',
    marketLabel: 'Markt',
    home: 'My Starday',
    primaryCta: 'So funktioniert es',
    footer: 'Start',
    guides: 'Ratgeber',
    faq: 'Fragen',
    privacy: 'Datenschutz',
    terms: 'Bedingungen',
    backHome: 'Zurück zu My Starday',
    notFoundTitle: 'Seite nicht gefunden',
    notFoundH1: 'Seite nicht gefunden',
    notFoundLink: 'Zur deutschsprachigen Startseite',
  }),
  fr: Object.freeze({
    languageLabel: 'Langue',
    marketLabel: 'Marché',
    home: 'My Starday',
    primaryCta: 'Comment ça marche',
    footer: 'Accueil',
    guides: 'Guides',
    faq: 'Questions',
    privacy: 'Confidentialité',
    terms: 'Conditions',
    backHome: 'Retour à My Starday',
    notFoundTitle: 'Page introuvable',
    notFoundH1: 'Page introuvable',
    notFoundLink: 'Vers le site en français',
  }),
  es: Object.freeze({
    languageLabel: 'Idioma',
    marketLabel: 'Mercado',
    home: 'My Starday',
    primaryCta: 'Cómo funciona',
    footer: 'Inicio',
    guides: 'Guías',
    faq: 'Preguntas',
    privacy: 'Privacidad',
    terms: 'Condiciones',
    backHome: 'Volver a My Starday',
    notFoundTitle: 'Página no encontrada',
    notFoundH1: 'Página no encontrada',
    notFoundLink: 'A la web en español',
  }),
  it: Object.freeze({
    languageLabel: 'Lingua',
    marketLabel: 'Mercato',
    home: 'My Starday',
    primaryCta: 'Come funziona',
    footer: 'Inizio',
    guides: 'Guide',
    faq: 'Domande',
    privacy: 'Privacy',
    terms: 'Condizioni',
    backHome: 'Torna a My Starday',
    notFoundTitle: 'Pagina non trovata',
    notFoundH1: 'Pagina non trovata',
    notFoundLink: 'Al sito in italiano',
  }),
  pl: Object.freeze({
    languageLabel: 'Język',
    marketLabel: 'Rynek',
    home: 'My Starday',
    primaryCta: 'Jak to działa',
    footer: 'Start',
    guides: 'Poradniki',
    faq: 'Pytania',
    privacy: 'Prywatność',
    terms: 'Regulamin',
    backHome: 'Wróć do My Starday',
    notFoundTitle: 'Nie znaleziono strony',
    notFoundH1: 'Nie znaleziono strony',
    notFoundLink: 'Do strony po polsku',
  }),
});

function chromeFor(localeCode) {
  return CHROME[localeCode] || null;
}

module.exports = {
  CHROME,
  chromeFor,
};
