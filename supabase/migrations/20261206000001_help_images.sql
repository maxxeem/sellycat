-- Help articles with pictures: a screenshot of the matching dashboard page after the first
-- paragraph, per language (files in public/help-img, so they work on every environment).

create or replace function pg_temp.with_image(p_body text, p_img text) returns text language sql immutable as $$
  select case
    when p_body is null or p_body = '' or position(p_img in p_body) > 0 then p_body
    when position(E'\n\n' in p_body) = 0 then p_body || E'\n\n' || p_img
    else substring(p_body from 1 for position(E'\n\n' in p_body) - 1) || E'\n\n' || p_img || E'\n\n' || substring(p_body from position(E'\n\n' in p_body) + 2)
  end
$$;

update public.help_article_versions v set body = pg_temp.with_image(v.body, '![Ansicht im Dashboard](/help-img/shop-starten-de.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![Ansicht im Dashboard](/help-img/shop-starten-de.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'shop-starten' and v.locale = 'de';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![View in the dashboard](/help-img/shop-starten-en.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![View in the dashboard](/help-img/shop-starten-en.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'shop-starten' and v.locale = 'en';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![Ansicht im Dashboard](/help-img/rechtstexte-de.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![Ansicht im Dashboard](/help-img/rechtstexte-de.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'rechtstexte' and v.locale = 'de';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![View in the dashboard](/help-img/rechtstexte-en.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![View in the dashboard](/help-img/rechtstexte-en.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'rechtstexte' and v.locale = 'en';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![Ansicht im Dashboard](/help-img/shop-gestalten-de.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![Ansicht im Dashboard](/help-img/shop-gestalten-de.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'shop-gestalten' and v.locale = 'de';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![View in the dashboard](/help-img/shop-gestalten-en.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![View in the dashboard](/help-img/shop-gestalten-en.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'shop-gestalten' and v.locale = 'en';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![Ansicht im Dashboard](/help-img/gutschein-pdf-wallet-de.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![Ansicht im Dashboard](/help-img/gutschein-pdf-wallet-de.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'gutschein-pdf-wallet' and v.locale = 'de';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![View in the dashboard](/help-img/gutschein-pdf-wallet-en.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![View in the dashboard](/help-img/gutschein-pdf-wallet-en.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'gutschein-pdf-wallet' and v.locale = 'en';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![Ansicht im Dashboard](/help-img/deal-erstellen-de.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![Ansicht im Dashboard](/help-img/deal-erstellen-de.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'deal-erstellen' and v.locale = 'de';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![View in the dashboard](/help-img/deal-erstellen-en.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![View in the dashboard](/help-img/deal-erstellen-en.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'deal-erstellen' and v.locale = 'en';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![Ansicht im Dashboard](/help-img/partner-und-orte-de.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![Ansicht im Dashboard](/help-img/partner-und-orte-de.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'partner-und-orte' and v.locale = 'de';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![View in the dashboard](/help-img/partner-und-orte-en.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![View in the dashboard](/help-img/partner-und-orte-en.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'partner-und-orte' and v.locale = 'en';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![Ansicht im Dashboard](/help-img/archivieren-loeschen-de.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![Ansicht im Dashboard](/help-img/archivieren-loeschen-de.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'archivieren-loeschen' and v.locale = 'de';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![View in the dashboard](/help-img/archivieren-loeschen-en.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![View in the dashboard](/help-img/archivieren-loeschen-en.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'archivieren-loeschen' and v.locale = 'en';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![Ansicht im Dashboard](/help-img/stripe-verbinden-de.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![Ansicht im Dashboard](/help-img/stripe-verbinden-de.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'stripe-verbinden' and v.locale = 'de';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![View in the dashboard](/help-img/stripe-verbinden-en.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![View in the dashboard](/help-img/stripe-verbinden-en.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'stripe-verbinden' and v.locale = 'en';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![Ansicht im Dashboard](/help-img/bestellungen-rueckerstattung-de.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![Ansicht im Dashboard](/help-img/bestellungen-rueckerstattung-de.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'bestellungen-rueckerstattung' and v.locale = 'de';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![View in the dashboard](/help-img/bestellungen-rueckerstattung-en.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![View in the dashboard](/help-img/bestellungen-rueckerstattung-en.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'bestellungen-rueckerstattung' and v.locale = 'en';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![Ansicht im Dashboard](/help-img/partner-abrechnung-de.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![Ansicht im Dashboard](/help-img/partner-abrechnung-de.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'partner-abrechnung' and v.locale = 'de';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![View in the dashboard](/help-img/partner-abrechnung-en.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![View in the dashboard](/help-img/partner-abrechnung-en.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'partner-abrechnung' and v.locale = 'en';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![Ansicht im Dashboard](/help-img/gutscheine-einloesen-de.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![Ansicht im Dashboard](/help-img/gutscheine-einloesen-de.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'gutscheine-einloesen' and v.locale = 'de';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![View in the dashboard](/help-img/gutscheine-einloesen-en.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![View in the dashboard](/help-img/gutscheine-einloesen-en.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'gutscheine-einloesen' and v.locale = 'en';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![Ansicht im Dashboard](/help-img/code-pools-de.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![Ansicht im Dashboard](/help-img/code-pools-de.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'code-pools' and v.locale = 'de';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![View in the dashboard](/help-img/code-pools-en.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![View in the dashboard](/help-img/code-pools-en.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'code-pools' and v.locale = 'en';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![Ansicht im Dashboard](/help-img/team-einladen-de.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![Ansicht im Dashboard](/help-img/team-einladen-de.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'team-einladen' and v.locale = 'de';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![View in the dashboard](/help-img/team-einladen-en.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![View in the dashboard](/help-img/team-einladen-en.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'team-einladen' and v.locale = 'en';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![Ansicht im Dashboard](/help-img/api-webhooks-de.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![Ansicht im Dashboard](/help-img/api-webhooks-de.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'api-webhooks' and v.locale = 'de';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![View in the dashboard](/help-img/api-webhooks-en.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![View in the dashboard](/help-img/api-webhooks-en.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'api-webhooks' and v.locale = 'en';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![Ansicht im Dashboard](/help-img/eigene-domain-de.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![Ansicht im Dashboard](/help-img/eigene-domain-de.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'eigene-domain' and v.locale = 'de';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![View in the dashboard](/help-img/eigene-domain-en.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![View in the dashboard](/help-img/eigene-domain-en.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'eigene-domain' and v.locale = 'en';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![Ansicht im Dashboard](/help-img/auswertungen-de.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![Ansicht im Dashboard](/help-img/auswertungen-de.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'auswertungen' and v.locale = 'de';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![View in the dashboard](/help-img/auswertungen-en.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![View in the dashboard](/help-img/auswertungen-en.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'auswertungen' and v.locale = 'en';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![Ansicht im Dashboard](/help-img/plaene-gebuehren-de.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![Ansicht im Dashboard](/help-img/plaene-gebuehren-de.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'plaene-gebuehren' and v.locale = 'de';
update public.help_article_versions v set body = pg_temp.with_image(v.body, '![View in the dashboard](/help-img/plaene-gebuehren-en.jpg)'), draft_body = pg_temp.with_image(v.draft_body, '![View in the dashboard](/help-img/plaene-gebuehren-en.jpg)')
from public.help_articles a where a.id = v.article_id and a.slug = 'plaene-gebuehren' and v.locale = 'en';
