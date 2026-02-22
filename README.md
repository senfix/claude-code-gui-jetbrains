# Claude Code with GUI

The same Claude Code GUI you use in Cursor and VS Code, now available in JetBrains IDEs.

[![JetBrains Marketplace](https://img.shields.io/jetbrains/plugin/v/30313?label=Marketplace)](https://plugins.jetbrains.com/plugin/30313-claude-code-with-gui)
![JetBrains IDE](https://img.shields.io/badge/JetBrains%20IDE-2025.3.x-000000?logo=jetbrains)
![Claude Code](https://img.shields.io/badge/Claude%20Code%20CLI-%3E%3D1.0.0-blueviolet)

---

<!-- TODO: Add screenshots -->

## Overview

**Claude Code with GUI** embeds the Claude Code CLI agent directly inside your JetBrains IDE as a first-class editor panel. Get real-time streaming responses, interactive tool-call cards, one-click diff review, and permission dialogs — without leaving your editor.

Works with IntelliJ IDEA, PyCharm, WebStorm, GoLand, Rider, CLion, and any other JetBrains IDE on the 2025.3.x platform.

---

## Features

- Streaming chat with real-time Markdown rendering and syntax highlighting
- Tool call cards for file reads/writes, bash commands, search results, and more
- Diff cards with one-click Apply / Reject actions
- Permission dialogs for file and bash operations
- Multiple concurrent sessions with tab support and a session dropdown
- Settings panel for CLI path, theme, font size, permission policy, and log level

---

## Requirements

- JetBrains IDE 2025.3.x
- Claude Code CLI >= 1.0.0, installed and authenticated
- JVM 21

---

## Installation

Search **"Claude Code with GUI"** in your IDE's plugin marketplace (**Settings > Plugins > Marketplace**), or install directly from the JetBrains Marketplace:

[Install from Marketplace](https://plugins.jetbrains.com/plugin/30313-claude-code-with-gui)

---

## Quick Start

1. Make sure `claude` CLI is installed and authenticated (`claude --version`).
2. Install the plugin from the Marketplace.
3. Open the panel via **Tools > Open Claude Code** or press `Ctrl+Shift+C`.
4. Type your first message and press Enter.

| Action | Shortcut |
|---|---|
| Open Claude Code panel | `Ctrl+Shift+C` |
| New session tab | `Cmd+N` / `Ctrl+N` (panel focused) |

---

## Changelog

### v0.2.0

- Chat interface with streaming Markdown responses
- Tool call visualization: file read/write, bash, search, and skill cards
- Diff cards with Apply / Reject actions
- Permission management dialogs
- Session management with multiple editor tabs and session dropdown
- Image attachment rendering
- Settings panel via **Tools** menu
- `workingDir` unified as a single source of truth via URL parameter

---

## Contributing

Contributions are welcome. Please open an issue first to discuss larger changes. Pull requests should include a clear description and updated tests where relevant.

---

## License

No license has been specified for this project yet.
