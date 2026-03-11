# Page Builder API Contract

## Entities
- **Page**: slug, name, status (draft/published/archived), current_version_id
- **PageVersion**: versioned definition (path, layout_json, components_json, permissions_json, visibility_rules_json)
- **Menu**: key, name, description, permissions_json
- **MenuItem**: menu_id, label, icon, display_order, target_type (page|url|group), target_ref, children_json, permissions_json, visibility_expr
- **Audit**: actions on pages/versions

## Admin Endpoints (protected, 2FA & role checks)
### Pages
- `GET /admin/pages?status=&q=&limit=&offset=` → list latest version snapshot
- `POST /admin/pages` → create page `{ slug, name, path, layout_json, components_json, permissions_json, visibility_rules_json }` (creates version=1 draft)
- `GET /admin/pages/:id` → page + current_version
- `PUT /admin/pages/:id` → update meta `{ name, status }`
- `DELETE /admin/pages/:id` → archive (status=archived)

### Page Versions
- `GET /admin/pages/:id/versions` → list versions
- `POST /admin/pages/:id/versions` → new draft version `{ path, layout_json, components_json, permissions_json?, visibility_rules_json? }`
- `GET /admin/pages/:id/versions/:version` → specific version
- `POST /admin/pages/:id/publish` (body `{ version }`) → set pages.current_version_id, status=published, set published_at
- `POST /admin/pages/:id/revert` (body `{ version }`) → copy version -> new draft

### Menus
- `GET /admin/menus` → list
- `POST /admin/menus` → create `{ key, name, description?, permissions_json? }`
- `GET /admin/menus/:id` → detail with items
- `PUT /admin/menus/:id` → update meta
- `DELETE /admin/menus/:id` → delete

### Menu Items
- `POST /admin/menus/:id/items` → add item `{ label, icon?, display_order?, target_type, target_ref, children_json?, permissions_json?, visibility_expr? }`
- `PUT /admin/menu-items/:itemId` → update item
- `DELETE /admin/menu-items/:itemId` → delete item
- `POST /admin/menus/:id/reorder` → bulk reorder `[ {id, display_order} ]`

### Support
- `GET /admin/page-schema` → JSON schema for layout/components
- `GET /admin/component-library` → supported component types + prop schema
- `GET /admin/page-audit?pageId=` → audit trail

## Runtime Endpoints
- `GET /pages/:slug` → returns published page definition (layout + components) after server-side permission filter
- `GET /menus/:key` → returns menu items filtered by role/permissions

## Permission Rules (server-side)
- `canViewPage` → role in page.permissions_json OR wildcard `*`
- `canEditPage`/`canPublishPage` → admin/developer (configurable) with 2FA
- `canViewMenu` / `canRenderMenuItem` → role against permissions_json / visibility_expr
- Component-level visibility (optional) via expressions in components_json

## Validation Notes
- Enforce JSON schema for layout/components at write time
- Slug/path uniqueness; version is auto-increment per page
- layout_json/components_json must be JSON (not TEXT)

## Migration Summary
- Tables: pages, page_versions, menus, menu_items, page_audit_logs (see schema.sql)
- Indexes on slug/status, page_id/version, menu_id, key
