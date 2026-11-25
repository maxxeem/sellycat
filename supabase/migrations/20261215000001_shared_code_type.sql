-- One code for all buyers of a deal (own file: a new enum value cannot be used in its transaction).
alter type public.code_source add value if not exists 'shared';
