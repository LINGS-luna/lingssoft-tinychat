import os
import json
import logging
from typing import Dict, Any

logger = logging.getLogger("tinychat.i18n")

# Default language from environment variable (default to 'en')
DEFAULT_LANGUAGE = os.getenv("DEFAULT_LANGUAGE", "en").strip().lower()

LOCALES_DIR = os.path.join(os.path.dirname(__file__), "locales")

_translations: Dict[str, Dict[str, str]] = {}

def load_translations():
    global _translations
    if not os.path.exists(LOCALES_DIR):
        logger.warning(f"Locales directory not found: {LOCALES_DIR}")
        return
    
    for filename in os.listdir(LOCALES_DIR):
        if filename.endswith(".json"):
            lang = filename[:-5]
            filepath = os.path.join(LOCALES_DIR, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    _translations[lang] = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load translation file {filename}: {e}")

# Load translations on module import
load_translations()

def t(key: str, lang: str = None, **kwargs: Any) -> str:
    if lang is None:
        lang = DEFAULT_LANGUAGE
    
    # Fallback to en if requested language is not found, or use the key itself
    lang_dict = _translations.get(lang, _translations.get("en", {}))
    message_template = lang_dict.get(key, _translations.get("en", {}).get(key, key))
    
    if kwargs:
        try:
            return message_template.format(**kwargs)
        except KeyError as e:
            logger.warning(f"Missing translation variable {e} for key '{key}'")
            return message_template
    
    return message_template
