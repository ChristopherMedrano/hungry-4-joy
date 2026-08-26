#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
functions_path="$repository_root/wordpress/bin/render-wordpress-functions.sh"
config_path="$repository_root/wordpress/wp-config-render.php"
test_directory="$(mktemp -d)"
capture_path="$test_directory/captured-output"
arguments_path="$test_directory/captured-arguments"

cleanup() {
    rm -rf -- "$test_directory"
}
trap cleanup EXIT

fail() {
    printf 'WordPress runtime security check failed: %s\n' "$1" >&2
    exit 1
}

# shellcheck source=/dev/null
source "$functions_path"

for wordpress_secret_key in "${H4J_WORDPRESS_SECRET_KEYS[@]}"; do
    printf -v "$wordpress_secret_key" '%s' "provided-$wordpress_secret_key"
    export "${wordpress_secret_key?}"
done

h4j_prepare_wordpress_secrets >"$capture_path" 2>&1
[[ ! -s "$capture_path" ]] || fail 'provided values produced output'

for wordpress_secret_key in "${H4J_WORDPRESS_SECRET_KEYS[@]}"; do
    [[ "${!wordpress_secret_key}" == "provided-$wordpress_secret_key" ]] \
        || fail 'a provided authentication value was replaced'
    unset "$wordpress_secret_key"
done

h4j_prepare_wordpress_secrets >"$capture_path" 2>&1
[[ ! -s "$capture_path" ]] || fail 'generated values produced output'

declare -A generated_values=()
for wordpress_secret_key in "${H4J_WORDPRESS_SECRET_KEYS[@]}"; do
    generated_value="${!wordpress_secret_key:-}"
    [[ "$generated_value" =~ ^[0-9a-f]{64}$ ]] \
        || fail 'a generated authentication value lacked the expected entropy'
    [[ ! -v "generated_values[$generated_value]" ]] \
        || fail 'generated authentication values were not independent'
    generated_values["$generated_value"]=1
    unset "$wordpress_secret_key"
done
unset generated_value generated_values

# shellcheck disable=SC2329 # invoked indirectly by the sourced helper
php() {
    return 23
}

if h4j_prepare_wordpress_secrets >"$capture_path" 2>&1; then
    fail 'generation failure did not abort'
fi
unset -f php

grep -Fq 'Unable to generate a required WordPress authentication value.' "$capture_path" \
    || fail 'generation failure lacked a safe diagnostic'

expected_password='safe synthetic password with spaces !@#$%^&*()'
mock_wp() {
    printf '%s\n' "$@" >"$arguments_path"
    IFS= read -r received_password
    [[ "$received_password" == "$expected_password" ]] || return 24
    printf 'mock install complete\n'
}

h4j_wordpress_core_install "$expected_password" mock_wp core install \
    --url=https://example.test \
    --admin_user=demo \
    --admin_email=demo@example.test \
    --skip-email >"$capture_path" 2>&1

grep -Fxq -- '--prompt=admin_password' "$arguments_path" \
    || fail 'WP-CLI password prompt was not requested'
captured_install_data="$(<"$arguments_path")$(<"$capture_path")"
if [[ "$captured_install_data" == *"$expected_password"* ]]; then
    fail 'administrator password appeared in arguments or output'
fi
unset captured_install_data expected_password

touch "$test_directory/wp-settings.php"
# shellcheck disable=SC2016 # PHP variables are intentionally literal here.
php_runner='define("ABSPATH", $argv[1] . "/"); require $argv[2];'
unset_arguments=()
for wordpress_secret_key in "${H4J_WORDPRESS_SECRET_KEYS[@]}"; do
    unset_arguments+=( -u "$wordpress_secret_key" )
done

if env "${unset_arguments[@]}" php -r "$php_runner" \
    "$test_directory" "$config_path" >"$capture_path" 2>&1; then
    fail 'wp-config accepted missing authentication values'
fi

# shellcheck disable=SC2016 # PHP variables are intentionally literal here.
php_assertions='define("ABSPATH", $argv[1] . "/"); require $argv[2];
$mapping = [
    "AUTH_KEY" => "WP_AUTH_KEY",
    "SECURE_AUTH_KEY" => "WP_SECURE_AUTH_KEY",
    "LOGGED_IN_KEY" => "WP_LOGGED_IN_KEY",
    "NONCE_KEY" => "WP_NONCE_KEY",
    "AUTH_SALT" => "WP_AUTH_SALT",
    "SECURE_AUTH_SALT" => "WP_SECURE_AUTH_SALT",
    "LOGGED_IN_SALT" => "WP_LOGGED_IN_SALT",
    "NONCE_SALT" => "WP_NONCE_SALT",
];
foreach ($mapping as $constant => $environment) {
    if (constant($constant) !== getenv($environment)) {
        exit(25);
    }
}'

env \
    WP_AUTH_KEY='safe-auth-key' \
    WP_SECURE_AUTH_KEY='safe-secure-auth-key' \
    WP_LOGGED_IN_KEY='safe-logged-in-key' \
    WP_NONCE_KEY='safe-nonce-key' \
    WP_AUTH_SALT='safe-auth-salt' \
    WP_SECURE_AUTH_SALT='safe-secure-auth-salt' \
    WP_LOGGED_IN_SALT='safe-logged-in-salt' \
    WP_NONCE_SALT='safe-nonce-salt' \
    php -r "$php_assertions" "$test_directory" "$config_path" \
    >"$capture_path" 2>&1

[[ ! -s "$capture_path" ]] || fail 'wp-config acceptance check produced output'

printf 'WordPress runtime security checks passed\n'
