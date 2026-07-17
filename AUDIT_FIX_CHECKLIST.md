# Tân Đô Audit Fix Checklist

## 1. Vietnamese encoding and typography

- [x] Fix corrupted Vietnamese text on login
- [x] Fix customer account text
- [x] Fix customer setup text
- [x] Fix sales account text
- [x] Fix notification bell text and icon
- [x] Fix PWA install button text
- [x] Fix backend notification text
- [x] Add one global Vietnamese-compatible font
- [x] Preserve current authentication behavior
- [x] Run typecheck
- [x] Run production build

## 2. Product variant cart identity

- [x] Hide generic add button for products that require variants
- [x] Add selected variant correctly
- [x] Increase correct variant cart row
- [x] Decrease correct variant cart row
- [x] Remove correct variant cart row
- [x] Preserve variantId, SKU, options and unitPrice
- [x] Verify products without variants still work
- [x] Run typecheck
- [x] Run production build

## 3. Server pricing and customer setup

- [x] Validate quantity on server
- [x] Resolve product variants on server
- [x] Read price and SKU from database
- [x] Reject variant not belonging to product
- [x] Stop trusting client unitPrice and SKU
- [x] Send authenticated request from customer setup
- [x] Align contact field names
- [x] Handle API and geolocation errors
- [x] Redirect only after successful save
- [x] Run typecheck
- [x] Run production build

## Final verification

- [x] Customer email login
- [x] Sales email login
- [x] Google OAuth callback
- [x] Customer setup save
- [x] Product without variants
- [x] Product with variants
- [x] Cart increase/decrease/remove
- [x] Customer order creation
- [x] Server-calculated total
- [x] Final production build

## Completion report

- Commit 1: fix(ui): normalize Vietnamese text and typography
- Commit 2: fix(cart): preserve product variant identity
- Commit 3: fix(api): validate pricing and customer setup
- Typecheck: passed
- Production build: passed
- Remaining issues: none
