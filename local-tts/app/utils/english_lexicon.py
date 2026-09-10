import os
import re
from typing import Set


class EnglishLexicon:
    _words: Set[str] = set()
    _initialized: bool = False

    @classmethod
    def initialize(cls) -> None:
        if cls._initialized:
            return

        words_set: Set[str] = set()

        # 1. Load System English Dictionary if available (Mac OS / Linux /usr/share/dict/words)
        dict_paths = [
            "/usr/share/dict/words",
            "/usr/dict/words",
        ]
        for path in dict_paths:
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        for line in f:
                            w = line.strip().lower()
                            if w and len(w) >= 2:
                                words_set.add(w)
                except Exception:
                    pass
                break

        # 2. Add high-frequency SaaS, AI, Business, Tech, & Conversational English Vocabulary
        built_in_vocab = {
            "hi", "hello", "today", "actually", "first", "try", "important", "feature",
            "test", "result", "useful", "work", "working", "message", "send", "topic", "businesses",
            "business", "especially", "everyone", "ready", "model", "use", "using", "system", "project",
            "user", "users", "admin", "dashboard", "audio", "sound", "player", "welcome",
            "to", "the", "platform", "speech", "voice", "cloning", "studio", "quality",
            "natural", "clear", "good", "morning", "evening", "night", "thank", "you",
            "please", "life", "future", "technology", "indic", "language", "generator",
            "voiceover", "management", "service", "services", "version", "update", "upgrades",
            "app", "application", "data", "database", "ai", "api", "whatsapp", "qwen", "rag",
            "tts", "http", "url", "pdf", "status", "ok", "best", "great", "now", "here",
            "there", "this", "that", "these", "those", "is", "are", "was", "were", "been",
            "being", "have", "has", "had", "do", "does", "did", "doing", "can", "could",
            "should", "would", "may", "might", "must", "shall", "will", "and", "but", "or",
            "so", "if", "then", "than", "with", "without", "for", "from", "in", "out",
            "on", "off", "over", "under", "let", "us", "synthesis", "new", "world",
            "friends", "one", "two", "three", "four", "five", "six", "seven", "eight",
            "nine", "ten", "like", "just", "more", "some", "all", "any", "how", "what",
            "when", "where", "why", "who", "which", "way", "well", "make", "get", "see",
            "customer", "customers", "agent", "agents", "software", "website", "integration",
            "plan", "plans", "subscription", "payment", "invoice", "pricing", "create",
            "created", "creating", "generate", "generated", "generating", "process",
            "processed", "processing", "code", "coding", "developer", "development",
            "tool", "tools", "support", "help", "contact", "email", "phone", "number",
            "time", "day", "week", "month", "year", "date", "name", "title", "description",
            "value", "key", "type", "file", "folder", "list", "view", "show", "hide",
            "open", "close", "save", "delete", "remove", "add", "edit", "change",
            "select", "option", "setting", "settings", "profile", "account", "login",
            "logout", "signup", "register", "password", "token", "auth", "security",
            "privacy", "terms", "policy", "company", "organization", "team", "member",
            "role", "permission", "access", "request", "response", "status", "error",
            "success", "failed", "warning", "info", "debug", "log", "logs", "event",
            "click", "button", "screen", "page", "home", "main", "top", "bottom",
            "left", "right", "center", "table", "chart", "graph", "report", "analytics",
            "insights", "overview", "summary", "detail", "details", "item", "items",
            "card", "modal", "dialog", "icon", "image", "video", "media", "link",
            "url", "path", "route", "server", "client", "host", "port", "network",
            "cloud", "storage", "disk", "memory", "cpu", "gpu", "speed", "performance",
        }

        words_set.update(built_in_vocab)
        cls._words = words_set
        cls._initialized = True

    @classmethod
    def is_english_word(cls, word: str) -> bool:
        if not cls._initialized:
            cls.initialize()

        clean = word.lower().strip()
        if not clean or not clean.isalpha():
            return False

        # Direct dictionary match
        if clean in cls._words:
            return True

        # Morphological inflection stemming checks (handling plurals, -ing, -ed, -ly, -es)
        if len(clean) > 3:
            # Plurals: -s, -es, -ies
            if clean.endswith("ies") and (clean[:-3] + "y") in cls._words:
                return True
            if clean.endswith("es") and (clean[:-2] in cls._words or clean[:-1] in cls._words):
                return True
            if clean.endswith("s") and clean[:-1] in cls._words:
                return True

            # Past tense / Participle: -ed
            if clean.endswith("ed"):
                if clean[:-2] in cls._words or clean[:-1] in cls._words:
                    return True

            # Continuous tense: -ing
            if clean.endswith("ing"):
                if clean[:-3] in cls._words or (clean[:-3] + "e") in cls._words:
                    return True

            # Adverbs: -ly
            if clean.endswith("ly"):
                if clean[:-2] in cls._words:
                    return True

        return False

