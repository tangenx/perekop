# Determines the list format by file extension: json lists (sing-box source
# rule sets) are converted to plain lists at download time, everything else is
# used as a plain list. The .srs binary format is not supported: Xray cannot
# read sing-box rule sets
get_ruleset_format_by_file_extension() {
    local file_extension="$1"

    local format
    case "$file_extension" in
    json | srs) echo "unsupported" ;;
    *) echo "plain" ;;
    esac
}

# Extracts all ip_cidr entries from a JSON ruleset file and writes them to an output file.
extract_ip_cidr_from_json_ruleset_to_file() {
    local json_file="$1"
    local output_file="$2"

    log "Extracting ip_cidr entries from $json_file to $output_file" "debug"
    jq -r '.rules[].ip_cidr[]' "$json_file" > "$output_file"
}
