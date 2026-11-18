-- Business already says "Auf Anfrage" as its price: no extra badge.
update public.plans set marketing = jsonb_set(jsonb_set(marketing, '{de,badge}', '""'), '{en,badge}', '""') where id = 'business';
