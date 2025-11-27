#!/bin/bash

# Check if file path is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <input_file>"
    echo "Example: $0 ./public/images/bg-landing.webp"
    exit 1
fi

input_file="$1"

# Check if input file exists
if [ ! -f "$input_file" ]; then
    echo "Error: File '$input_file' does not exist"
    exit 1
fi

# Get directory and basename of input file
input_dir=$(dirname "$input_file")
input_basename=$(basename "$input_file")
name_without_ext="${input_basename%.*}"

# Sizes to generate
SIZES=(
    # 1920
    # 1536
    # 1280
    # 1024
    # 768
    # 640

    # 704
    # 512
    # 384
    # 256
    # 192
    # 128

    # 720
    # 512
    # 384
    # 256
    # 128
    # 64

    100
    120
    180
    200
    240
    360
)

# Generate responsive images
for width in "${SIZES[@]}"; do
    output_file="${input_dir}/${name_without_ext}-${width}.webp"
    
    echo "Generating ${width}w: $output_file"
    
    cwebp "$input_file" -o "$output_file" -resize "$width" 0
    
    if [ $? -eq 0 ]; then
        echo "✓ Successfully created $output_file"
    else
        echo "✗ Failed to create $output_file"
        exit 1
    fi
done

echo ""
echo "✅ All responsive images generated successfully!"