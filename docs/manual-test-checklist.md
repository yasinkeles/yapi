# Manual Test Checklist

## Setup
- Backend: `cd backend && npm install` then run `node src/database/init.js` (seeds admin/seller demo data) and start with `npm run dev`.
- Frontend: `cd frontend && npm install` then run `npm run dev -- --host`.
- Verify health: GET http://localhost:3000/health should return status OK.

## Auth
- Admin login: POST http://localhost:3000/admin/auth/login with { "username": "admin", "password": "admin123!" } → receive access token.
- Seller login: POST http://localhost:3000/admin/auth/login with { "username": "sellerdemo", "password": "seller123!" } → receive access token.
- Token check: GET http://localhost:3000/admin/auth/me with Authorization: Bearer <token> returns user profile.

## Catalog (seller)
- List products: GET http://localhost:3000/seller/products using seller token returns seeded products (Demo Smartphone X, ErgoFlex Demo Chair).
- Create product: POST http://localhost:3000/seller/products with minimal payload (name, slug, base_price, currency) using seller token → 201 and product echoed.
- Update product: PUT http://localhost:3000/seller/products/:id to change price/stock, verify GET list reflects change.

## Public storefront
- Categories: GET http://localhost:3000/store/categories returns seeded category slugs (electronics, home, etc.).
- Product list: GET http://localhost:3000/store/products shows seeded demo items with images/prices.
- Product detail: GET http://localhost:3000/store/products/demo-smartphone-x returns images, specs, pricing.

## Storefront seed sanity
- Database: ensure seller_stores has one row for sellerdemo with is_published = 1.
- Sections: seller_store_sections should have two rows (Featured Tech, Home Office Picks) tied to the demo store.
- Card style: seller_card_styles has one row for sellerdemo with template-1 colors.

## Smoke front-end
- Seller portal: sign in as sellerdemo and confirm product list shows seeded items.
- Public catalog: load /catalog page (or equivalent) and verify cards render with seeded data.
- Product detail page: open demo-smartphone-x and see image slider, specs, and campaign pricing.
