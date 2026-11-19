#!/usr/bin/env bash
set -euo pipefail

app_dir="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
export LBUNS_DATA_DIR="${LBUNS_DATA_DIR:-$HOME/.local/share/LBUNS-Linux/Data}"
export LBUNS_QUIZ_DIR="${LBUNS_QUIZ_DIR:-$app_dir/quiz}"
export LD_LIBRARY_PATH="$app_dir/bin${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

mkdir -p "$LBUNS_DATA_DIR"
cd "$app_dir/bin"
exec "$app_dir/bin/launcher"
