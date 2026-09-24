#!/usr/bin/env sh
set -eu

# Hosted demo storage is an ephemeral SQLite file. A leftover DB_URL from the
# retired Render Postgres reference would override DB_DATABASE.
if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
  unset DB_URL || true
  db_path="${DB_DATABASE:-/tmp/hungry-4-joy-middleware/demo.sqlite}"
  mkdir -p "$(dirname "$db_path")"
  if [ ! -f "$db_path" ]; then
    touch "$db_path"
  fi
fi

php artisan migrate --force
php artisan serve --host=0.0.0.0 --port="${PORT:-10000}"
