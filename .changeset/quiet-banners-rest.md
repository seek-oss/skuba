---
'skuba': patch
---

help, init: Use a legible logo when running under an AI agent

skuba prints a multi-line ASCII art banner at startup which AI agents are unable to read. It now detects when it's running under an AI agent and replaces the ASCII art with the word `skuba` inlined on the version line.

Interactive (human) usage is unchanged.
