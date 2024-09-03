#!/bin/bash
# To be used in conjunction with `test-template.sh`. 
# This script copies all snapshot directories from the tmp directory to the template directory.

set -e

tmp_dir="$1"
template="$2"

# Loops through tmp directory created in test-template.sh, ignoring node_modules and only looks at __snapshots__ directories.
find ../${tmp_dir}/tmp-${template} -path '*/node_modules' -prune -o -type d -name '__snapshots__' -print | while read -r src_dir; do
  dest_dir=$(echo "$src_dir" | sed "s|../${tmp_dir}/tmp-${template}|template/${template}|")
  cp -r $src_dir/ $dest_dir/
done

echo "All snapshot directories have been copied successfully."
