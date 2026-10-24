#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
container_name="safereserve-sql-test-$$"
docker_local() { env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock "$@"; }
cleanup() { docker_local rm -f "$container_name" >/dev/null; }
trap cleanup EXIT
docker_local run --detach --name "$container_name" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
for attempt in {1..30}; do
 if docker_local exec "$container_name" pg_isready -h 127.0.0.1 -U postgres >/dev/null; then break; fi
 sleep 1
done
for sql in tests/sql/bootstrap.sql supabase/migrations/*.sql supabase/seed.sql tests/sql/security.sql tests/sql/onboarding.sql tests/sql/appearance.sql tests/sql/management.sql; do
 docker_local exec -i "$container_name" psql -h 127.0.0.1 -q -U postgres -v ON_ERROR_STOP=1 < "$sql"
done

# Separate transactions compete for the same slot. Exactly one must commit.
work_dir=$(mktemp -d /tmp/safereserve-concurrency.XXXXXX)
trap 'rm -rf "$work_dir"; cleanup' EXIT
cat > "$work_dir/reserve.sql" <<'SQL'
set role anon;
select public.create_booking(
 '11111111-1111-4111-8111-111111111111',
 array['22222222-2222-4222-8222-222222222221']::uuid[],
 '33333333-3333-4333-8333-333333333331',
 (select (d::date+time '10:00') at time zone 'America/Sao_Paulo' from generate_series(current_date+1,current_date+7,interval '1 day') d where extract(dow from d) between 1 and 6 limit 1),
 'Concurrency test','+5511666666666',gen_random_uuid());
SQL
docker_local exec -i "$container_name" psql -h 127.0.0.1 -q -U postgres -v ON_ERROR_STOP=1 < "$work_dir/reserve.sql" > "$work_dir/one.log" 2>&1 &
one_pid=$!
docker_local exec -i "$container_name" psql -h 127.0.0.1 -q -U postgres -v ON_ERROR_STOP=1 < "$work_dir/reserve.sql" > "$work_dir/two.log" 2>&1 &
two_pid=$!
one_status=0; two_status=0
wait "$one_pid" || one_status=$?
wait "$two_pid" || two_status=$?
if ! { [ "$one_status" -eq 0 ] && [ "$two_status" -eq 3 ]; } && ! { [ "$one_status" -eq 3 ] && [ "$two_status" -eq 0 ]; }; then
 cat "$work_dir/one.log" "$work_dir/two.log"
 echo 'FAIL: expected exactly one concurrent reservation' >&2
 exit 1
fi
count=$(docker_local exec "$container_name" psql -h 127.0.0.1 -qAt -U postgres -c 'select count(*) from public.bookings;')
[ "$count" = 1 ] || { echo 'FAIL: concurrent reservation count'; exit 1; }
echo 'PASS: concurrent reservation requests commit exactly one booking.'
