#!/bin/bash

# Default values
INPUT_DIR="."
OUTPUT_DIR="./webp"
QUALITY="80"
LOSSESS=false
VERBOSE=false
PRESET="default"
WIDTH=""
HEIGHT=""

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -i, --input DIR      Input directory (default: current directory)"
    echo "  -o, --output DIR     Output directory (default: ./webp)"
    echo "  -q, --quality N      Quality factor 0-100 (default: 80)"
    echo "  -l, --lossless       Use lossless compression"
    echo "  -p, --preset TYPE    Preset: default, photo, picture, drawing, icon, text (default: default)"
    echo "  -w, --width N        Target width in pixels"
    echo "  -h, --height N       Target height in pixels"
    echo "  -v, --verbose        Verbose output"
    echo "  --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -i ./images -o ./webp -q 85"
    echo "  $0 -i ./photos -o ./compressed -l -p photo"
    echo "  $0 -i ./images -w 800 -h 600 -q 90"
    echo "  $0 -i ./images -w 1920 -q 85  # resize to 1920px width, auto height"
    echo ""
}

# Function to convert to lowercase (compatible with older bash versions)
to_lowercase() {
    echo "$1" | tr '[:upper:]' '[:lower:]'
}

# Function to check if file is an image
is_image() {
    local file="$1"
    local ext="${file##*.}"
    local ext_lower=$(to_lowercase "$ext")
    case "$ext_lower" in
        png|jpg|jpeg|tiff|tif|bmp|gif)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Function to convert single file
convert_file() {
    local input_file="$1"
    local output_file="$2"
    
    # Get filename without extension
    local basename=$(basename "$input_file")
    local name_without_ext="${basename%.*}"
    
    # Create output filename
    local output_path="$OUTPUT_DIR/${name_without_ext}.webp"
    
    # Build cwebp command
    local cmd="cwebp"
    
    # Add preset if specified
    if [[ "$PRESET" != "default" ]]; then
        cmd="$cmd -preset $PRESET"
    fi
    
    # Add size parameters if specified
    if [[ -n "$WIDTH" ]] || [[ -n "$HEIGHT" ]]; then
        local size_width="${WIDTH:-0}"
        local size_height="${HEIGHT:-0}"
        cmd="$cmd -resize ${size_width} ${size_height}"
    fi
    
    # Add quality or lossless flag
    if [[ "$LOSSESS" == true ]]; then
        cmd="$cmd -lossless"
    else
        cmd="$cmd -q $QUALITY"
    fi
    
    # Add verbose flag
    if [[ "$VERBOSE" == true ]]; then
        cmd="$cmd -v"
    fi
    
    # Add input and output
    cmd="$cmd \"$input_file\" -o \"$output_path\""
    
    # Execute command
    if [[ "$VERBOSE" == true ]]; then
        echo "Converting: $input_file -> $output_path"
        echo "Command: $cmd"
    fi
    
    if eval $cmd; then
        echo "✓ Converted: $basename -> ${name_without_ext}.webp"
    else
        echo "✗ Failed to convert: $basename"
        return 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--input)
            INPUT_DIR="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -q|--quality)
            QUALITY="$2"
            shift 2
            ;;
        -l|--lossless)
            LOSSESS=true
            shift
            ;;
        -p|--preset)
            PRESET="$2"
            shift 2
            ;;
        -w|--width)
            WIDTH="$2"
            shift 2
            ;;
        -h|--height)
            HEIGHT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate quality
if ! [[ "$QUALITY" =~ ^[0-9]+$ ]] || [ "$QUALITY" -lt 0 ] || [ "$QUALITY" -gt 100 ]; then
    echo "Error: Quality must be a number between 0 and 100"
    exit 1
fi

# Validate width
if [[ -n "$WIDTH" ]] && (! [[ "$WIDTH" =~ ^[0-9]+$ ]] || [ "$WIDTH" -lt 0 ]); then
    echo "Error: Width must be a positive number"
    exit 1
fi

# Validate height
if [[ -n "$HEIGHT" ]] && (! [[ "$HEIGHT" =~ ^[0-9]+$ ]] || [ "$HEIGHT" -lt 0 ]); then
    echo "Error: Height must be a positive number"
    exit 1
fi

# Validate preset
case "$PRESET" in
    default|photo|picture|drawing|icon|text)
        ;;
    *)
        echo "Error: Invalid preset '$PRESET'. Valid presets: default, photo, picture, drawing, icon, text"
        exit 1
        ;;
esac

# Check if input directory exists
if [[ ! -d "$INPUT_DIR" ]]; then
    echo "Error: Input directory '$INPUT_DIR' does not exist"
    exit 1
fi

# Create output directory if it doesn't exist
if [[ ! -d "$OUTPUT_DIR" ]]; then
    mkdir -p "$OUTPUT_DIR"
    if [[ $? -ne 0 ]]; then
        echo "Error: Failed to create output directory '$OUTPUT_DIR'"
        exit 1
    fi
fi

# Check if cwebp is available
if ! command -v cwebp &> /dev/null; then
    echo "Error: cwebp command not found. Please install WebP tools."
    echo "On macOS: brew install webp"
    echo "On Ubuntu/Debian: sudo apt-get install webp"
    exit 1
fi

# Initialize counters
total_files=0
converted_files=0
failed_files=0

echo "Starting WebP conversion..."
echo "Input directory: $INPUT_DIR"
echo "Output directory: $OUTPUT_DIR"
echo "Quality: $QUALITY"
echo "Lossless: $LOSSESS"
echo "Preset: $PRESET"
if [[ -n "$WIDTH" ]] || [[ -n "$HEIGHT" ]]; then
    echo "Size: ${WIDTH:-auto} x ${HEIGHT:-auto}"
fi
echo ""

# Loop through all files in input directory
while IFS= read -r -d '' file; do
    if is_image "$file"; then
        ((total_files++))
        if convert_file "$file" "$OUTPUT_DIR"; then
            ((converted_files++))
        else
            ((failed_files++))
        fi
    fi
done < <(find "$INPUT_DIR" -maxdepth 1 -type f -print0)

echo ""
echo "Conversion complete!"
echo "Total image files found: $total_files"
echo "Successfully converted: $converted_files"
echo "Failed conversions: $failed_files"

if [[ $failed_files -gt 0 ]]; then
    exit 1
fi
