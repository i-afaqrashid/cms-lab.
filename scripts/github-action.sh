#!/usr/bin/env bash
set -euo pipefail

args=(scan --ci)

append_value() {
  local flag="$1"
  local value="$2"

  if [[ -n "$value" ]]; then
    args+=("$flag" "$value")
  fi
}

append_switch() {
  local flag="$1"
  local value="$2"

  case "$(normalize_bool "$value")" in
    true | "1" | yes)
      args+=("$flag")
      ;;
    "" | false | "0" | no)
      ;;
    *)
      echo "cms-lab action input for $flag must be true or false." >&2
      exit 2
      ;;
  esac
}

append_output() {
  local flag="$1"
  local enabled="$2"
  local path="$3"

  case "$(normalize_bool "$enabled")" in
    true | "1" | yes)
      args+=("$flag" "$path")
      ;;
    "" | false | "0" | no)
      ;;
    *)
      echo "cms-lab action input for $flag must be true or false." >&2
      exit 2
      ;;
  esac
}

normalize_bool() {
  printf "%s" "$1" | tr "[:upper:]" "[:lower:]"
}

absolute_path() {
  local value="$1"

  if [[ "$value" = /* ]]; then
    printf "%s\n" "$value"
  else
    printf "%s/%s\n" "$PWD" "$value"
  fi
}

CMS_LAB_VERSION="${CMS_LAB_VERSION:-latest}"

append_value --config "${CMS_LAB_CONFIG:-}"
append_value --url "${CMS_LAB_URL:-}"
append_value --fail-on "${CMS_LAB_FAIL_ON:-error}"
append_value --only "${CMS_LAB_ONLY:-}"
append_value --skip "${CMS_LAB_SKIP:-}"
append_value --type "${CMS_LAB_TYPE:-}"
append_value --timeout "${CMS_LAB_TIMEOUT:-10000}"
append_value --retries "${CMS_LAB_RETRIES:-1}"
append_value --concurrency "${CMS_LAB_CONCURRENCY:-}"
append_value --max-warnings "${CMS_LAB_MAX_WARNINGS:-}"
append_value --max-info "${CMS_LAB_MAX_INFO:-}"
append_output --report "${CMS_LAB_REPORT:-true}" "${CMS_LAB_REPORT_PATH:-.cms-lab/report.html}"
append_output --markdown "${CMS_LAB_MARKDOWN:-false}" "${CMS_LAB_MARKDOWN_PATH:-.cms-lab/summary.md}"
append_output --junit "${CMS_LAB_JUNIT:-false}" "${CMS_LAB_JUNIT_PATH:-.cms-lab/junit.xml}"
append_switch --strict "${CMS_LAB_STRICT:-false}"

npx -y "@cms-lab/cli@${CMS_LAB_VERSION}" "${args[@]}"

{
  echo "report-path=$(absolute_path "${CMS_LAB_REPORT_PATH:-.cms-lab/report.html}")"
  echo "summary-path=$(absolute_path "${CMS_LAB_MARKDOWN_PATH:-.cms-lab/summary.md}")"
  echo "junit-path=$(absolute_path "${CMS_LAB_JUNIT_PATH:-.cms-lab/junit.xml}")"
} >>"$GITHUB_OUTPUT"
