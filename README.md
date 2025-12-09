# Marketplace Backend (WAB – Semester Project)

## Quick Start

- Prerequisites: Node.js 18+, Docker Desktop
- Run MongoDB: `docker compose up -d`
- Configure env: `.env` with `PORT=3000` and `MONGO_URL=mongodb://localhost:27018/marketplace`
- Install deps: `npm install`
- Start API: `npm run start`
- Run tests: `npm test`
- API docs (swagger UI): `http://localhost:3000/docs`

## Requirements + Implementation Notes

1) Includes at least 4 endpoints (at least 1 GET, 1 POST, 1 PUT and 1 DELETE endpoint)
- Implementováno v Express routeru viz soubor [src/api/server.ts](src/api/server.ts). Konkrétně: `GET /health`, `GET /products`, `GET /products/:id`, `POST /products`, `PUT /products/:id`, `DELETE /products/:id`. Pro ruční ověření jsou připraveny HTTP dotazy v [debug-requests/health.http](debug-requests/health.http) a [debug-requests/products.http](debug-requests/products.http).

2) Uses 1 communication protocol (e.g. REST API)
- Použito REST API nad knihovnou Express. Vstup/ výstup je JSON. Viz [src/api/server.ts](src/api/server.ts).

3) Includes 1 backend service
- Jediná backend služba „Product Service“ běžící jako Node.js/Express aplikace. Spuštění viz [src/app.ts](src/app.ts) a směrování v [src/api/server.ts](src/api/server.ts).

4) Uses a NoSQL database for data persistence
- Persistenci zajišťuje MongoDB. Konfigurace v `.env` (`MONGO_URL`) a připojení přes oficiální driver viz [src/database/mongo.ts](src/database/mongo.ts). Pro lokální vývoj je připraven [docker-compose.yaml](docker-compose.yaml) (Mongo na portu 27018 s persistentním volume).

5) Validates all input data (types, empty values, ranges, etc.)
- Vstupní validace probíhá pro body (create/update) i query (paginace):
  - Produkty: [src/types/dto/product.dto.ts](src/types/dto/product.dto.ts) – funkce `validateProductCreate` a `validateProductUpdate` validují `title`, `price`, volitelný `discountPercent` (> 0 a ≤ 100 pokud je zadán) a `category`.
  - Paginace: [src/types/dto/pagination.dto.ts](src/types/dto/pagination.dto.ts) – `page` (≥1) a `limit` (1–100). Chybný vstup vrací HTTP 400.

6) Includes integration tests for all endpoints
- Integrační testy jsou napsány pomocí Vitest + Supertest:
  - Zdraví služby: [test/health.test.ts](test/health.test.ts)
  - Produkty (CRUD a validace): [test/products.test.ts](test/products.test.ts)
  - Testovací prostředí (separátní DB): [test/setup.ts](test/setup.ts), konfigurace [vitest.config.mts](vitest.config.mts), `.env.test`.

7) Code follows DRY principle
- Sdílené pomocné funkce a mapování pro zamezení duplicit:
  - Validace: pomocné funkce `readNonEmptyString`, `readNumber`, `readDiscount` v [src/types/dto/product.dto.ts](src/types/dto/product.dto.ts).
  - Mapování a výpočty: `mapProduct`, `calcDiscountedPrice`, `buildProductDoc` v [src/services/product.service.ts](src/services/product.service.ts).
  - Centrální error handler: [src/middleware/error.middleware.ts](src/middleware/error.middleware.ts).

8) One method is always doing one thing
- Tenké routy v [src/api/server.ts](src/api/server.ts) pouze delegují; doménová logika je v malých, jednoúčelových funkcích ve službě a validátorech.

9) Method should not exceed 20 lines and 2 indentations
- Dlouhé validátory byly refaktorovány do malých helperů (viz [src/types/dto/product.dto.ts](src/types/dto/product.dto.ts)). Služby `createProduct`/`updateProduct` používají pomocné funkce pro výpočet slevy a stavbu dokumentu (viz [src/services/product.service.ts](src/services/product.service.ts)), aby zůstaly krátké a přehledné.

10) Work on project is versioned in the given university Bitbucket repository
- Projekt je verzován v Gitu a průběžně commitován v malých krocích (viz historie).

## API Summary

- Health: `GET /health` – rychlá kontrola dostupnosti
- Products:
  - `POST /products` – vytvoření produktu (volitelný `discountPercent`), cena po slevě se počítá automaticky
  - `GET /products?page&limit` – seznam s stránkováním
  - `GET /products/:id` – detail
  - `PUT /products/:id` – dílčí aktualizace (přepočet `discountedPrice`)
  - `DELETE /products/:id` – smazání
- Orders:
  - `POST /orders` – vytvoření objednávky
  - `GET /orders?page&limit` – seznam objednávek s stránkováním
  - `GET /orders/:id` – detail objednávky
  - `PUT /orders/:id` – aktualizace (např. status)
  - `DELETE /orders/:id` – smazání

## Testing

- Test DB: `.env.test` (např. `mongodb://localhost:27018/marketplace_test`)
- Spuštění: `npm test`
- Vyčistění mezi testy zajišťuje [test/setup.ts](test/setup.ts)
