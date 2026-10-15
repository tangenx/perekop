#
# Module: xray_config_facade.sh
#
# Purpose:
#   High-level helpers that translate perekop concepts (proxy links, DNS
#   servers, interface outbounds) into Xray configuration via the
#   xray_cm_* low-level functions.
#
# Usage:
#   Include this script in your ash script with:
#     . /usr/lib/perekop/xray_config_facade.sh

XRAY_CF_LIB="/usr/lib/perekop"
# shellcheck disable=SC1091
[ -f "$XRAY_CF_LIB/helpers.sh" ] && . "$XRAY_CF_LIB/helpers.sh"
# shellcheck disable=SC1091
[ -f "$XRAY_CF_LIB/xray_config_manager.sh" ] && . "$XRAY_CF_LIB/xray_config_manager.sh"

#######################################
# Add the bootstrap and main DNS servers to the DNS section.
# Arguments:
#   config: string (JSON), configuration to modify
#   dns_type: string, "udp" | "doh"
#   dns_server: string, IP or DoH URL
#   bootstrap_dns_server: string, IP of the bootstrap DNS server
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cf_add_dns_servers() {
    local config="$1"
    local dns_type="$2"
    local dns_server="$3"
    local bootstrap_dns_server="$4"

    local main_server

    case "$dns_type" in
    udp)
        local host port
        host=$(url_get_host "$dns_server")
        port=$(url_get_port "$dns_server")
        [ -z "$port" ] && port=53

        main_server=$(jq -n --arg address "$host" --argjson port "$port" \
            '{"address": $address, "port": $port}')
        ;;
    doh)
        # "+local": the DOH request bypasses the routing component and is sent
        # directly via the Freedom outbound, matching the sing-box detour-less
        # configuration
        main_server=$(jq -n --arg address "$dns_server" \
            '{"address": ("https+local://" + $address)}')
        ;;
    *)
        log "Unsupported DNS server type: $dns_type. Aborted." "fatal"
        exit 1
        ;;
    esac

    config=$(xray_cm_add_dns_server "$config" \
        "$(jq -n --arg address "$bootstrap_dns_server" '{"address": $address}')")

    # Main server is last: unmatched domains fall back to it after fakedns
    config=$(xray_cm_add_dns_server "$config" "$main_server")

    echo "$config"
}

#######################################
# Add the FakeDNS server with a domain whitelist.
# Arguments:
#   config: string (JSON), configuration to modify
#   domains_json: string (JSON), array of domain rules
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cf_add_fakedns_server() {
    local config="$1"
    local domains_json="$2"

    # skipFallback: only whitelisted (routed) domains resolve to fake IPs
    local server
    server=$(jq -n --argjson domains "$domains_json" \
        '{"address": "fakedns", "domains": $domains, "skipFallback": true}')

    # fakedns comes first: its "domains" match takes priority over real servers
    printf '%s\n' "$config" | jq --argjson server "$server" '.dns.servers = [$server] + .dns.servers'
}

#######################################
# Add a SOCKS inbound for the local proxy of a section.
# Arguments:
#   config: string (JSON), configuration to modify
#   tag: string, inbound tag
#   listen_address: string, IP to listen on
#   listen_port: integer, port to listen on
#   outbound: string, outbound tag for the route rule
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cf_add_socks_inbound_and_route_rule() {
    local config="$1"
    local tag="$2"
    local listen_address="$3"
    local listen_port="$4"
    local outbound="$5"

    config=$(xray_cm_add_inbound "$config" "$(jq -n \
        --arg tag "$tag" --arg listen "$listen_address" --argjson port "$listen_port" \
        '{
            "listen": $listen,
            "port": $port,
            "protocol": "socks",
            "settings": {"auth": "noauth", "udp": true},
            "tag": $tag
        }')")

    config=$(xray_cm_add_route_rule "$config" "$(jq -n \
        --arg tag "$tag" --arg outbound "$outbound" \
        '{"inboundTag": [$tag], "outboundTag": $outbound}')")

    echo "$config"
}

#######################################
# Add a proxy outbound decoded from a link.
# Arguments:
#   config: string (JSON), configuration to modify
#   section: string, the section the outbound tag is derived from
#   url: string, the link
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cf_add_proxy_outbound() {
    local config="$1"
    local section="$2"
    local url="$3"

    url=$(url_decode "$url")
    url=$(url_strip_fragment "$url")

    local scheme tag host port
    scheme="$(url_get_scheme "$url")"
    tag=$(get_outbound_tag_by_section "$section")
    host=$(url_get_host "$url")
    port=$(url_get_port "$url")

    case "$scheme" in
    socks4 | socks4a | socks5)
        # Xray supports SOCKS5 servers only
        local userinfo username password
        userinfo=$(url_get_userinfo "$url")
        if [ -n "$userinfo" ]; then
            username="${userinfo%%:*}"
            password="${userinfo#*:}"
        fi
        config=$(xray_cm_add_outbound "$config" \
            "$(xray_cm_build_socks_outbound "$tag" "$host" "$port" "$username" "$password")")
        ;;
    vless)
        local uuid flow
        uuid=$(url_get_userinfo "$url")
        flow=$(url_get_query_param "$url" "flow")

        config=$(xray_cm_add_outbound "$config" \
            "$(xray_cm_build_vless_outbound "$tag" "$host" "$port" "$uuid" "$flow")")
        config=$(_add_outbound_security "$config" "$tag" "$url" "$scheme")
        config=$(_add_outbound_transport "$config" "$tag" "$url")
        ;;
    ss)
        local userinfo method password
        userinfo=$(url_get_userinfo "$url")
        if ! is_shadowsocks_userinfo_format "$userinfo"; then
            userinfo=$(base64_decode "$userinfo")
            if [ $? -ne 0 ]; then
                log "Cannot decode shadowsocks userinfo or it does not match the expected format. Aborted." "fatal"
                exit 1
            fi
        fi

        method="${userinfo%%:*}"
        password="${userinfo#*:}"

        config=$(xray_cm_add_outbound "$config" \
            "$(xray_cm_build_shadowsocks_outbound "$tag" "$host" "$port" "$method" "$password")")
        ;;
    trojan)
        local password
        password=$(url_get_userinfo "$url")

        config=$(xray_cm_add_outbound "$config" \
            "$(xray_cm_build_trojan_outbound "$tag" "$host" "$port" "$password")")
        config=$(_add_outbound_security "$config" "$tag" "$url" "$scheme")
        config=$(_add_outbound_transport "$config" "$tag" "$url")
        ;;
    hysteria2 | hy2)
        if ! xray_has_feature "proxy.hysteria2"; then
            log "The installed Xray does not support Hysteria2 (26.1.13 or newer is required). Run install.sh --xray-latest or remove the hysteria2 link of the $section section. Aborted." "fatal"
            exit 1
        fi

        local password obfs obfs_password
        password=$(url_get_userinfo "$url")
        obfs=$(url_get_query_param "$url" "obfs")
        obfs_password=$(url_get_query_param "$url" "obfs-password")

        config=$(xray_cm_add_outbound "$config" \
            "$(xray_cm_build_hysteria2_outbound "$tag" "$host" "$port" "$password" "$obfs" "$obfs_password")")
        config=$(_add_outbound_security "$config" "$tag" "$url" "$scheme")
        ;;
    *)
        log "Unsupported proxy $scheme type. Aborted." "fatal"
        exit 1
        ;;
    esac

    echo "$config"
}

#######################################
# Add TLS or REALITY settings decoded from link parameters.
# Arguments:
#   config: string (JSON), configuration to modify
#   outbound_tag: string, the outbound to modify
#   url: string, the link
#   scheme: string, the link scheme
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
_add_outbound_security() {
    local config="$1"
    local outbound_tag="$2"
    local url="$3"
    local scheme="$4"

    local security
    security=$(url_get_query_param "$url" "security")

    if [ -z "$security" ]; then
        if [ "$scheme" = "hysteria2" ] || [ "$scheme" = "hy2" ]; then
            security="tls"
        fi
    fi

    case "$security" in
    tls | reality)
        local sni insecure alpn fingerprint public_key short_id ech
        sni=$(url_get_query_param "$url" "sni")
        insecure=$(_get_insecure_query_param_from_url "$url")
        alpn=$(comma_string_to_json_array "$(url_get_query_param "$url" "alpn")")
        fingerprint=$(url_get_query_param "$url" "fp")
        public_key=$(url_get_query_param "$url" "pbk")
        short_id=$(url_get_query_param "$url" "sid")
        ech=$(url_get_query_param "$url" "ech")

        if [ "$scheme" = "hysteria2" ] || [ "$scheme" = "hy2" ]; then
            fingerprint=""
        fi

        if [ -n "$ech" ]; then
            if xray_has_feature "tls.ech"; then
                log "Using ECH config from the link of $outbound_tag" "debug"
            else
                log "The installed Xray does not support ECH (25.7.26 or newer is required). The ech parameter of $outbound_tag is ignored" "warn"
                ech=""
            fi
        fi

        if [ "$security" = "reality" ]; then
            config=$(xray_cm_set_reality_for_outbound "$config" "$outbound_tag" "$sni" "$fingerprint" "$public_key" "$short_id")
        else
            config=$(xray_cm_set_tls_for_outbound "$config" "$outbound_tag" "$sni" \
                "$([ "$insecure" == "1" ] && echo true)" \
                "$([ "$alpn" == "[]" ] && echo "" || echo "$alpn")" \
                "$fingerprint" "$ech")
        fi
        ;;
    none) ;;
    *)
        log "Unknown security '$security' detected." "error"
        ;;
    esac

    echo "$config"
}

_get_insecure_query_param_from_url() {
    local url="$1"

    local insecure
    insecure=$(url_get_query_param "$url" "allowInsecure")
    if [ -z "$insecure" ]; then
        insecure=$(url_get_query_param "$url" "insecure")
    fi

    echo "$insecure"
}

#######################################
# Add transport settings decoded from link parameters.
# Arguments:
#   config: string (JSON), configuration to modify
#   outbound_tag: string, the outbound to modify
#   url: string, the link
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
_add_outbound_transport() {
    local config="$1"
    local outbound_tag="$2"
    local url="$3"

    local transport
    transport=$(url_get_query_param "$url" "type")
    case "$transport" in
    tcp | raw | "") ;;
    ws)
        local ws_path ws_host
        ws_path=$(url_get_query_param "$url" "path")
        ws_host=$(url_get_query_param "$url" "host")

        # Xray parses the "ed" parameter from the ws path itself
        config=$(xray_cm_set_transport_for_outbound "$config" "$outbound_tag" \
            "websocket" "wsSettings" \
            "$(jq -n --arg path "$ws_path" --arg host "$ws_host" \
                '{path: $path} + (if $host != "" then {host: $host} else {} end)')")
        ;;
    grpc)
        local grpc_service_name
        grpc_service_name=$(url_get_query_param "$url" "serviceName")

        config=$(xray_cm_set_transport_for_outbound "$config" "$outbound_tag" \
            "grpc" "grpcSettings" \
            "$(jq -n --arg name "$grpc_service_name" '{serviceName: $name}')")
        ;;
    kcp)
        local kcp_header kcp_seed
        kcp_header=$(url_get_query_param "$url" "headerType")
        kcp_seed=$(url_get_query_param "$url" "seed")

        config=$(xray_cm_set_transport_for_outbound "$config" "$outbound_tag" \
            "mkcp" "kcpSettings" \
            "$(jq -n --arg header "$kcp_header" --arg seed "$kcp_seed" '
                {} + (if $header != "" then {header: {type: $header}} else {} end)
                   + (if $seed != "" then {seed: $seed} else {} end)')")
        ;;
    httpupgrade)
        local hu_path hu_host
        hu_path=$(url_get_query_param "$url" "path")
        hu_host=$(url_get_query_param "$url" "host")

        config=$(xray_cm_set_transport_for_outbound "$config" "$outbound_tag" \
            "httpupgrade" "httpupgradeSettings" \
            "$(jq -n --arg path "$hu_path" --arg host "$hu_host" \
                '{path: $path} + (if $host != "" then {host: $host} else {} end)')")
        ;;
    xhttp | splithttp)
        local x_path x_host x_mode
        x_path=$(url_get_query_param "$url" "path")
        x_host=$(url_get_query_param "$url" "host")
        x_mode=$(url_get_query_param "$url" "mode")

        config=$(xray_cm_set_transport_for_outbound "$config" "$outbound_tag" \
            "splithttp" "xhttpSettings" \
            "$(jq -n --arg path "$x_path" --arg host "$x_host" --arg mode "$x_mode" '
                {path: $path}
                + (if $host != "" then {host: $host} else {} end)
                + (if $mode != "" then {mode: $mode} else {} end)')")
        ;;
    *)
        log "Unknown transport '$transport' detected." "error"
        ;;
    esac

    echo "$config"
}

#######################################
# Add an outbound from a raw JSON provided by the user.
# Arguments:
#   config: string (JSON), configuration to modify
#   section: string, the section the outbound tag is derived from
#   json_outbound: string (JSON), the raw outbound configuration
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cf_add_json_outbound() {
    local config="$1"
    local section="$2"
    local json_outbound="$3"

    local tag
    tag=$(get_outbound_tag_by_section "$section")

    # The tag must match the perekop tag layout, the rest is passed as-is
    local outbound
    outbound=$(printf '%s\n' "$json_outbound" | jq --arg tag "$tag" '.tag = $tag')

    config=$(xray_cm_add_outbound "$config" "$outbound")

    echo "$config"
}

#######################################
# Add a Freedom outbound bound to a network interface (VPN connection type).
# Arguments:
#   config: string (JSON), configuration to modify
#   section: string, the section the outbound tag is derived from
#   interface_name: string, network interface to bind
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cf_add_interface_outbound() {
    local config="$1"
    local section="$2"
    local interface_name="$3"

    local tag
    tag=$(get_outbound_tag_by_section "$section")

    config=$(xray_cm_add_outbound "$config" \
        "$(xray_cm_build_freedom_outbound "$tag" "$interface_name" "" "")")

    echo "$config"
}

#######################################
# Build a routing rule JSON for the given section.
# Arguments:
#   inbound_tag: string, tproxy inbound tag
#   outbound: string, outbound or balancer tag
#   match_key: string, "domain" or "ip"
#   match_json: string (JSON), array of match values
#   use_balancer: "1" to target a balancer, "0" for an outbound
# Outputs:
#   Rule JSON object
#######################################
xray_cf_build_section_rule() {
    local inbound_tag="$1"
    local outbound="$2"
    local match_key="$3"
    local match_json="$4"
    local use_balancer="$5"

    local target_key="outboundTag"
    [ "$use_balancer" = "1" ] && target_key="balancerTag"

    jq -n --arg inbound "$inbound_tag" --arg outbound "$outbound" \
        --arg key "$target_key" --argjson match "$match_json" \
        --arg mkey "$match_key" \
        '{"inboundTag": [$inbound]} + {($key): $outbound} + {($mkey): $match}'
}

#######################################
# Build a Freedom outbound redirecting to the FakeIP check service.
# The redirect address is resolved to a real IP at configuration time, so the
# core never dials a fake IP.
# Arguments:
#   real_ip: string, resolved real IP of the FakeIP check domain
# Outputs:
#   Outbound JSON object, or empty string when the IP is missing
#######################################
xray_cf_build_fakeip_test_outbound() {
    local real_ip="$1"

    [ -z "$real_ip" ] && return 0

    xray_cm_build_freedom_outbound "$XRAY_FAKEIP_TEST_OUTBOUND_TAG" "" "" "$real_ip:8443"
}
