#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cache_dir="$repo_dir/linux/.cache"
output_dir="${1:-$repo_dir/linux/dist/LBUNS-v1.4.5-linux.1}"

if [[ -e "$output_dir" ]]; then
  echo "Output already exists: $output_dir" >&2
  exit 1
fi

for command_name in curl unzip zstd tar sha256sum node; do
  command -v "$command_name" >/dev/null || {
    echo "Missing build tool: $command_name" >&2
    exit 1
  }
done

mkdir -p "$cache_dir" "$(dirname "$output_dir")"
release_zip="$cache_dir/lbuns-v1.4.5-windows-x64-portable.zip"
core_tar="$cache_dir/electrobun-core-linux-x64-v1.15.1.tar.gz"
curl -fL --retry 3 -o "$release_zip" \
  'https://github.com/cecon123/lbuns/releases/download/v1.4.5/lbuns-v1.4.5-windows-x64-portable.zip'
curl -fL --retry 3 -o "$core_tar" \
  'https://github.com/blackboardsh/electrobun/releases/download/v1.15.1/electrobun-core-linux-x64.tar.gz'

printf '%s  %s\n' \
  '18e826c5f7f45347a0535b2bfd6a9bc04dbaabcee1bc159dbc9ff9311b166272' "$release_zip" \
  '829df41d028f80efd7412405fca2dfb8d2e180f3ab85e67b069c5d59414adc5c' "$core_tar" \
  | sha256sum --check --status

scratch_dir="$(mktemp -d)"
trap 'rm -rf -- "$scratch_dir"' EXIT
mkdir -p "$scratch_dir/release" "$scratch_dir/extracted" "$scratch_dir/core"
unzip -q "$release_zip" -d "$scratch_dir/release"
tar -xzf "$core_tar" -C "$scratch_dir/core"

# The tagged Windows EXE contains one zstd tar frame at this exact offset.
# Verify the compressed payload before extracting any files from it.
dd if="$scratch_dir/release/LBUNS-v1.4.5/LBUNS.exe" \
  of="$scratch_dir/payload.zst" bs=4M iflag=skip_bytes,count_bytes \
  skip=6356 count=32242438 status=none
printf '%s  %s\n' \
  '75ed535c12a13e8ce4c2a6479db91d9066974b7e47ad8883dadc48c11af850c9' \
  "$scratch_dir/payload.zst" | sha256sum --check --status
zstd -q -dc "$scratch_dir/payload.zst" | tar -x -C "$scratch_dir/extracted"

mkdir -p "$output_dir/bin"
cp -a "$scratch_dir/extracted/LBUNS/Resources" "$output_dir/"
cp -a "$scratch_dir/release/LBUNS-v1.4.5/quiz" "$output_dir/"
for binary_name in bun launcher libNativeWrapper.so libasar.so process_helper zig-zstd bspatch; do
  cp "$scratch_dir/core/$binary_name" "$output_dir/bin/"
done
cp "$repo_dir/linux/run.sh" "$output_dir/run.sh"
chmod +x "$output_dir/run.sh" "$output_dir/bin/bun" "$output_dir/bin/launcher"
node "$repo_dir/linux/patch.mjs" "$output_dir"
node --check "$output_dir/Resources/app/bun/index.js"
node --check "$repo_dir/docs/token-console.js"
node --test "$repo_dir/tests/token-console.test.mjs"
echo "Built $output_dir"
