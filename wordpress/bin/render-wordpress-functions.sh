#!/usr/bin/env bash

# Shared startup helpers live separately so their secret-handling behavior can
# be tested without booting WordPress or touching its runtime filesystem.

readonly -a H4J_WORDPRESS_SECRET_KEYS=(
    WP_AUTH_KEY
    WP_SECURE_AUTH_KEY
    WP_LOGGED_IN_KEY
    WP_NONCE_KEY
    WP_AUTH_SALT
    WP_SECURE_AUTH_SALT
    WP_LOGGED_IN_SALT
    WP_NONCE_SALT
)

h4j_prepare_wordpress_secrets() {
    local wordpress_secret_key generated_value

    for wordpress_secret_key in "${H4J_WORDPRESS_SECRET_KEYS[@]}"; do
        if [[ -n "${!wordpress_secret_key:-}" ]]; then
            continue
        fi

        if ! generated_value="$(php -r 'echo bin2hex(random_bytes(32));')"; then
            printf 'Unable to generate a required WordPress authentication value.\n' >&2
            return 1
        fi

        if [[ ! "$generated_value" =~ ^[0-9a-f]{64}$ ]]; then
            printf 'Generated WordPress authentication value failed validation.\n' >&2
            return 1
        fi

        printf -v "$wordpress_secret_key" '%s' "$generated_value"
        export "${wordpress_secret_key?}"
    done
}

h4j_wordpress_core_install() {
    local admin_password="$1"
    shift

    # WP-CLI reads this one prompted argument from standard input. The value is
    # therefore absent from the process argument list and is never echoed here.
    "$@" --prompt=admin_password <<<"$admin_password"
}
