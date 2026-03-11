# Frontend Plan: Page Builder & Runtime

## Goals (MVP)
- Sayfa/menü metadata’yı API’den dinamik alıp permission-aware render etmek.
- Builder ekranıyla sayfa oluşturma/draft/publish, menü item düzenleme.
- Komponent registry (form, table, chart, card, html, tabs, button, modal) için ortak prop/validation şeması.

## Runtime Mimarisi
- Routes: `/pages/:slug` (published versiyon fetch); admin tarafında builder `/admin/pages` ve `/admin/menus` zaten mevcut router gövdesine eklenecek.
- Data fetch: `GET /pages/:slug` → `{ layout, components, permissions }`; `GET /menus/:key` → menü item listesi (permission süzülmüş).
- Permission enforcement: route guard (role + page.permissions), renderer seviyesinde komponent visibility; 403 ekranı fallback.
- State: React Query (veya basit fetch hook) + SWR tarzı cache; auth context mevcut yapıyla entegre.
- Layout renderer: grid tabanlı (rows -> cols -> components[]), tailwind + responsive breakpoints; boş/invalid durumda graceful fallback.
- Menu renderer: side/top nav için metadata -> filtered items -> router link; accordion for groups.
- Error/loading: skeleton + hata kartı; publish edilmeyen sayfa için 404/403 ayrımı.

## Component Registry (MVP props)
- `card`: title, subtitle?, body (md/html), actions[].
- `html`: raw HTML (sanitize) veya markdown.
- `table`: dataSourceId/endpointId, columns[{key,title,format,sortable}], filters, pagination, actions (link/callEndpoint/openModal).
- `chart`: chartType(line/bar/pie), data bindings (x,y[]), dataSourceId/endpointId, options.
- `form`: fields[{name,label,type,required,options,default}], submit action (callEndpoint), success/error handling, validation.
- `tabs`: tabs[{id,title,components[]}].
- `button`: label, action (navigate/callEndpoint/openModal), variant.
- `modal`: trigger (external action) + inner components.
- Ortak: `visibility` (role list veya expression), `className` override, `dataBindings` (param eşlemesi).

## Schema Beklentisi (backend ile hizalı)
- `layout_json`: `{ type: "grid", rows:[{ cols:[{ span:12, components:["hero"] }]}] }`.
- `components_json`: id->component config. Component config, tip bazlı JSON schema ile valide edilecek (backend destek uçları: `/admin/page-schema`, `/admin/component-library`).
- Path/slug benzersiz; version publish edildiğinde `current_version` döner.

## Builder UI (MVP)
- Sayfa listesi: status, current version, publish tarihi, search/filter.
- Page editor: temel grid layout editörü (row/col span), component picker, prop form (schema-driven), canlı önizleme, draft kaydet, publish, revert to version.
- Menü editor: menü seç/oluştur, item ekle/sil/sırala, page/url/group seçici, ikon seçici, permission/visibility ayarları.
- Validation: client-side schema + server-side validation hatalarını göster; draft/publish aksiyonlarında 2FA requirement.

## Router / UI Entegrasyonu
- `App.jsx`: admin altına yeni rotalar: `/pages`, `/pages/:id/edit`, `/menus`, `/menus/:id/edit`, `/pages/preview/:slug` (opsiyonel preview token). Permission guard: `page:*` ve `menu:*` yetkileri.
- Navigation: admin menüsüne “Page Builder” ve “Menus” girişleri (permission-guarded).
- Theme: mevcut AdminLTE/Bootstrap uyumlu; layout grid Tailwind ile desteklenebilir (projede Tailwind hazır).

## Veri Erişimi & Servisler
- Yeni API client modülleri: `services/pages.js`, `services/menus.js` (CRUD, versions, publish, preview fetch).
- Hook’lar: `usePage(slug)`, `useMenu(key)`, `usePageEditor(id)`, `useMenuEditor(id)`; React Query ile cache + staleTime.

## Güvenlik / Sertleştirme
- Server-side filtre zaten yapacak; client ayrıca guard. 403 ekranı standardize.
- XSS: `html` component için sanitize; markdown render’da whitelist.
- Audit: publish/revert aksiyonlarında kullanıcı bilgisi UI’da göster.

## Teslimat Dilimleri (Frontend)
1) Renderer iskeleti + component registry (read-only render) + menu render.
2) Page list/detail fetch + draft/publish akışı; basic editor (form tabanlı config girişi).
3) Grid editor UX, component picker, menü editörü, validation/preview deneyimi.
4) Gelişmiş: component-level visibility expressions, modal/interaction akışları, optimistic UI/polish.
