-- Own shop fonts in more formats: woff and ttf/otf besides woff2 (the browser loads all four).
-- The dashboard checks the file's first bytes and stores it with its real type.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon',
                               'font/woff2', 'application/font-woff2', 'font/woff', 'font/ttf', 'font/otf']
where id = 'shop-media';
