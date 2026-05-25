# HTTP API Standards

These rules apply to all HTTP APIs in `apps/api/`.

## REST Conventions

- Follow REST standards when defining API endpoints.
- Model endpoints around resources, not actions.
- Use HTTP methods consistently:
  - `GET` for reading resources.
  - `POST` for creating resources.
  - `PUT` or `PATCH` for updating resources.
  - `DELETE` for removing resources.

## Resource Names

- Use plural resource names.
- Use kebab-case for compound resource names.
- Avoid more than three nested resources in a URL path.

Bad:

```text
GET /user
GET /orderItems
GET /customers/1/orders/2/items/3/discounts
```

Good:

```text
GET /users
GET /order-items
GET /customers/1/orders/2/items
```

## Payloads

- Use JSON for request payloads.
- Use JSON for response payloads.
- Set response content type to `application/json`.

## Status Codes

- Return `200` for successful requests.
- Return `422` for business rule errors.
- Return `500` for unexpected or infrastructure errors.
