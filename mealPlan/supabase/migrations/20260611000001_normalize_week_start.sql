-- Normalize meal_plans.week_start from Monday to Sunday.
-- The calendar uses getSunday() (day - getDay()) as week start.
-- Legacy rows stored the Monday of the week instead.
update public.meal_plans
set week_start = week_start - interval '1 day'
where extract(dow from week_start) = 1; -- 1 = Monday in PostgreSQL dow
