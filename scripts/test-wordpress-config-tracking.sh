#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repository_root"

fail() {
    printf 'WordPress config tracking check failed: %s\n' "$1" >&2
    exit 1
}

while IFS= read -r tracked_config; do
    [[ "$tracked_config" == wordpress/wp-config-render.php ]] \
        || fail 'a local or generated wp-config file is tracked'
done < <(git ls-files 'wordpress/wp-config*.php')

git ls-files --error-unmatch wordpress/wp-config-render.php >/dev/null 2>&1 \
    || fail 'the Render wp-config template is not tracked'

for local_config in wordpress/wp-config.php wordpress/wp-config-ddev.php; do
    git check-ignore -q --no-index "$local_config" \
        || fail 'a local or DDEV wp-config file is not ignored'
done

fixed_auth_pattern="define[[:space:]]*\\([[:space:]]*['\"](AUTH_KEY|SECURE_AUTH_KEY|LOGGED_IN_KEY|NONCE_KEY|AUTH_SALT|SECURE_AUTH_SALT|LOGGED_IN_SALT|NONCE_SALT)['\"][[:space:]]*,[[:space:]]*['\"][^'\"]+['\"]"
if git grep -qIE -e "$fixed_auth_pattern" -- wordpress; then
    fail 'a tracked WordPress file contains a fixed authentication key or salt'
fi

git grep -qF 'COPY wp-config-render.php /usr/src/wordpress/wp-config.php' -- wordpress/Dockerfile \
    || fail 'the Render image no longer installs wp-config-render.php'

printf 'WordPress config tracking checks passed\n'
