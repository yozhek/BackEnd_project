# BleskShop Marketplace Backend

## Overview

This repository contains my solo backend project for a small marketplace application with fixed-price products, orders, auctions, real-time auction updates, user registration, and Telegram notifications.

The backend is split into several Node.js/TypeScript services:

- `product-service` for products and orders
- `bidding-service` for auctions and bids
- `gateway-service` for real-time event broadcasting over WebSocket
- `auth-service` for user registration through Keycloak
- `notification-service` for Telegram linking and message delivery
- `telegram-bot` for completing Telegram account linking and unlinking

The repository also includes a frontend used as the client application, but the main focus of this project is the backend architecture and service implementation.

## Main Functionality

- Product CRUD API for sellers
- Order CRUD API for buyers
- Auction creation, bidding, closing, reopening after payment expiry, and deletion
- Role-based route protection for buyers and sellers using Keycloak JWTs
- User registration flow backed by the Keycloak Admin API
- Real-time auction event delivery through WebSocket subscriptions
- Telegram account linking and unlinking
- Telegram notifications for auction creation, bids, outbid events, auction wins, auction closure, and completed orders
- Swagger documentation for all backend services
- Automated API/service tests for the main backend services

## Tech Stack

- Node.js
- TypeScript
- Express
- MongoDB
- Keycloak
- WebSocket (`ws`)
- `jose` for JWT verification
- Swagger UI Express
- Vitest
- Supertest
- Docker and Docker Compose

## My Role

This was a solo project fully implemented by me. I was responsible for the complete backend implementation, including service design, API routing, request validation, business logic, MongoDB data handling, JWT-based authorization with Keycloak, Telegram integration, WebSocket event flow, Swagger documentation, Docker setup, and automated tests for the main services.

## API / Backend Architecture

The project uses a lightweight service-based architecture. Each backend service has a clear responsibility and communicates over HTTP.

### `product-service`

- Exposes REST endpoints for `products` and `orders`
- Uses controllers, DTO validation helpers, service-layer functions, MongoDB persistence, auth middleware, and centralized error handling
- Protects seller product routes and buyer order routes with Keycloak JWT verification
- Calculates discounted prices for products
- Enriches order items with product title and price from the database and computes total order price

### `bidding-service`

- Exposes REST endpoints for `auctions`, bid placement, auction closing, status updates, expiry handling, and deletion
- Stores auctions and bid history in MongoDB
- Applies business rules such as minimum increment, seller cannot bid on own auction, and automatic transition to `awaiting_payment`
- Sends event payloads to the gateway service and notification payloads to the notification service
- Supports reopening auctions if payment expires

### `gateway-service`

- Provides an HTTP `/events` endpoint and a WebSocket `/ws` endpoint
- Broadcasts marketplace events to subscribed clients
- Supports filtering by `auctionId` so clients can subscribe to a specific auction stream

### `auth-service`

- Provides a registration endpoint
- Validates registration input
- Uses the Keycloak Admin API to create users, set passwords, and assign `buyer` or `seller` realm roles

### `notification-service`

- Accepts notification events from backend services
- Sends Telegram messages to linked users
- Manages Telegram linking tokens and user-chat bindings
- Persists Telegram binding data in JSON files inside a local `data` directory

### `telegram-bot`

- Completes Telegram account linking via `/start <token>`
- Supports unlinking via `/unlink`
- Calls the notification service to finalize linking and unlinking

## Database / Persistence Layer

- MongoDB is used by `product-service` and `bidding-service`
- The main MongoDB database name is taken from the `MONGO_URL` connection string
- Main collections inferred from the code:
  - `products`
  - `orders`
  - `auctions`
- `notification-service` uses simple JSON file persistence for Telegram bindings and pending link tokens
- Keycloak stores authentication and role data outside the application services

## Installation

### Option 1: Run the full stack with Docker Compose

Requirements:

- Docker
- Docker Compose

Steps:

1. Clone the repository.
2. Create a root `.env` file with Telegram bot credentials.
3. Run:

```bash
docker compose up --build
```

This starts MongoDB, Keycloak, all backend services, the Telegram bot, and the frontend.

### Option 2: Run services locally

Requirements:

- Node.js 20+
- npm
- MongoDB
- Keycloak

Install dependencies in each service directory you want to run:

```bash
cd product-service && npm install
cd ../bidding-service && npm install
cd ../gateway-service && npm install
cd ../auth-service && npm install
cd ../notification-service && npm install
cd ../telegram-bot && npm install
```

## Environment Variables / Setup

The project is configured per service. The most important variables inferred from the repository are:

### Root `.env`

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username
```

### `product-service`

```env
PORT=3000
MONGO_URL=mongodb://localhost:27017/marketplace
KEYCLOAK_ISSUER=http://localhost:8080/realms/marketplace
KEYCLOAK_JWKS_URL=http://localhost:8080/realms/marketplace/protocol/openid-connect/certs
KEYCLOAK_AUDIENCE=account
```

### `bidding-service`

```env
PORT=3001
MONGO_URL=mongodb://localhost:27017/marketplace
GATEWAY_URL=http://localhost:3002/events
NOTIFY_URL=http://localhost:4005/notify
KEYCLOAK_ISSUER=http://localhost:8080/realms/marketplace
KEYCLOAK_JWKS_URL=http://localhost:8080/realms/marketplace/protocol/openid-connect/certs
KEYCLOAK_AUDIENCE=account
```

### `gateway-service`

```env
PORT=3002
```

### `auth-service`

```env
PORT=3003
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=marketplace
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=admin
```

### `notification-service`

```env
PORT=4005
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username
```

### `telegram-bot`

```env
TELEGRAM_BOT_TOKEN=your_bot_token
NOTIFY_CALLBACK_URL=http://localhost:4005/auth/telegram/bot-callback
NOTIFY_UNLINK_URL=http://localhost:4005/auth/telegram/bot-unlink
```

### Keycloak setup

The repository includes a preconfigured realm export in `keycloak/realm-export.json` with:

- realm: `marketplace`
- roles: `buyer`, `seller`
- frontend client: `frontend`
- sample users for local testing

## How to Run

### Docker Compose

```bash
docker compose up --build
```

Useful local URLs:

- Product service docs: `http://localhost:3000/docs`
- Bidding service docs: `http://localhost:3001/docs`
- Gateway service docs: `http://localhost:3002/docs`
- Auth service docs: `http://localhost:3003/docs`
- Notification service docs: `http://localhost:4005/docs`
- Keycloak: `http://localhost:8080`
- Frontend: `http://localhost:5002`

### Local development

Run each service in its own terminal:

```bash
cd product-service && npm run dev
cd bidding-service && npm run dev
cd gateway-service && npm run dev
cd auth-service && npm run dev
cd notification-service && npm run dev
cd telegram-bot && npm start
```

### Tests

Run per service:

```bash
cd product-service && npm test
cd bidding-service && npm test
cd gateway-service && npm test
cd auth-service && npm test
cd notification-service && npm test
```

Or use the provided PowerShell helper:

```powershell
./run-all-tests.ps1
```

## Project Structure Summary

```text
auth-service/
  src/api
  src/services
  src/types/dto
  src/middleware

bidding-service/
  src/api
  src/services
  src/database
  src/types/dto
  src/middleware

gateway-service/
  src/api
  src/services
  src/ws

notification-service/
  src
    app.ts
    telegram.ts
    store.ts
    docs/

product-service/
  src/api/controllers
  src/services
  src/database
  src/types/dto
  src/middleware

telegram-bot/
  bot.js

keycloak/
  realm-export.json

frontend/
  client application for the marketplace UI
```

## Possible Future Improvements

- Add stronger inter-service contracts and more explicit shared types
- Introduce database schemas or an ODM for clearer model constraints
- Add authentication and authorization to the gateway and notification flows where needed
- Replace file-based Telegram binding storage with database persistence
- Add more integration and end-to-end tests for service communication
- Improve observability with structured logging, metrics, and tracing
- Add CI automation for test execution and container builds

## CV Bullet Points

- Designed and implemented a multi-service backend for a marketplace application using Node.js, TypeScript, Express, MongoDB, and Keycloak.
- Built REST APIs for products, orders, and auctions, including validation, role-based authorization, business logic, and database persistence.
- Implemented real-time auction updates via WebSocket and Telegram notification flows, and documented/tested the services with Swagger, Vitest, and Supertest.
