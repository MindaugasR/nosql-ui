# NoSQL Manager

A lightweight web-based GUI for MongoDB — aggregation pipeline builder, collection browser, and document editor.

[![CI](https://github.com/MindaugasR/nosql-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/MindaugasR/nosql-ui/actions/workflows/ci.yml)
[![Release](https://github.com/MindaugasR/nosql-ui/actions/workflows/release.yml/badge.svg)](https://github.com/MindaugasR/nosql-ui/actions/workflows/release.yml)
[![Docker](https://img.shields.io/badge/ghcr.io-nosql--ui-blue?logo=docker)](https://github.com/MindaugasR/nosql-ui/pkgs/container/nosql-ui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

- Visual aggregation pipeline builder with drag-and-drop stage reordering
- Collection browser with document viewer
- Query editor with BSON syntax and autocomplete
- Self-hostable via Docker

## Quick start

```bash
docker run -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017 \
  ghcr.io/mindaugasr/nosql-ui:latest
```

Then open [http://localhost:3000](http://localhost:3000).

## Development

**Prerequisites:** Node 22+, MongoDB instance

```bash
git clone https://github.com/MindaugasR/nosql-ui.git
cd nosql-ui
npm install
npm run dev
```

Client runs on `http://localhost:5173`, server on `http://localhost:3000`.

## Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | Vue 3, TypeScript, Tailwind CSS 4 |
| Backend  | Fastify, MongoDB driver           |
| Infra    | Docker, GitHub Actions, GHCR      |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — all contributions welcome, PRs require review and CI to pass.

## License

MIT
