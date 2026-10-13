#
# Module: xray_config_manager.sh
#
# Purpose:
#   This script provides a set of helper functions to simplify creation and management
#   of Xray configuration.
#
# Conventions:
#   - All functions are prefixed with: xray_cm_*
#   - "cm" stands for "config manager", shortened by convention
#
# Usage:
#   Include this script in your ash script with:
#     . /usr/lib/perekop/xray_config_manager.sh
#
#   After that, xray_cm_* functions are available for generating
#   and modifying Xray JSON configuration.
#
# Every function takes the current configuration as the first argument and
# writes the updated configuration to stdout, so calls can be chained:
#   CONFIG=$(xray_cm_configure_log "$CONFIG" "warning")

#######################################
# Print the skeleton of an Xray JSON configuration.
# The first outbound is the default one: unmatched traffic goes there,
# which mirrors sing-box "route.final".
#######################################
xray_cm_init_config() {
    echo '{"log":{},"dns":{},"fakeDns":{},"inbounds":[],"outbounds":[],"routing":{"domainStrategy":"AsIs","rules":[]},"balancers":[],"policy":{"system":{"statsInboundUplink":true,"statsInboundDownlink":true,"statsOutboundUplink":true,"statsOutboundDownlink":true}},"api":{}}'
}

#######################################
# Configure the log section of an Xray JSON configuration.
# Arguments:
#   config: string, JSON configuration
#   level: string, log level. One of: debug info warning error none.
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cm_configure_log() {
    local config="$1"
    local level="$2"

    jq --arg level "$level" '.log = {"loglevel": $level}' <<< "$config"
}

#######################################
# Set common DNS section properties.
# Arguments:
#   config: string (JSON), configuration to modify
#   tag: string, tag of the DNS module; its own queries carry it as inboundTag
#   query_strategy: string, "UseIP" | "UseIPv4" | "UseIPv6"
#   hosts_json: string, JSON object of static hosts (optional, "{}" when empty)
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cm_configure_dns() {
    local config="$1"
    local tag="$2"
    local query_strategy="$3"
    local hosts_json="$4"

    [ -z "$hosts_json" ] && hosts_json="{}"

    jq --arg tag "$tag" \
        --arg strategy "$query_strategy" \
        --argjson hosts "$hosts_json" '
        .dns = ((.dns // {}) + {
            "tag": $tag,
            "queryStrategy": $strategy,
            "hosts": $hosts,
            "servers": []
        })' <<< "$config"
}

#######################################
# Append a DNS server object to the DNS section.
# Arguments:
#   config: string (JSON), configuration to modify
#   server_json: string (JSON), DnsServerObject
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cm_add_dns_server() {
    local config="$1"
    local server_json="$2"

    jq --argjson server "$server_json" '.dns.servers += [$server]' <<< "$config"
}

#######################################
# Configure the FakeDNS pool.
# Arguments:
#   config: string (JSON), configuration to modify
#   ip_pool: string, CIDR of the fake IP pool
#   pool_size: integer, maximum number of stored mappings
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cm_configure_fakedns() {
    local config="$1"
    local ip_pool="$2"
    local pool_size="$3"

    jq --arg pool "$ip_pool" --argjson size "$pool_size" \
        '.fakeDns = {"ipPool": $pool, "poolSize": $size}' <<< "$config"
}

#######################################
# Append an inbound object to the inbounds section.
# Arguments:
#   config: string (JSON), configuration to modify
#   inbound_json: string (JSON), full inbound object
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cm_add_inbound() {
    local config="$1"
    local inbound_json="$2"

    jq --argjson inbound "$inbound_json" '.inbounds += [$inbound]' <<< "$config"
}

#######################################
# Append an outbound object to the outbounds section.
# Arguments:
#   config: string (JSON), configuration to modify
#   outbound_json: string (JSON), full outbound object
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cm_add_outbound() {
    local config="$1"
    local outbound_json="$2"

    jq --argjson outbound "$outbound_json" '.outbounds += [$outbound]' <<< "$config"
}

#######################################
# Build a Freedom (direct) outbound JSON.
# Arguments:
#   tag: string, outbound tag
#   interface: string, network interface to bind (optional)
#   domain_strategy: string, sockopt.domainStrategy (optional)
#   redirect: string, "host:port" destination override (optional)
# Outputs:
#   Outbound JSON object
#######################################
xray_cm_build_freedom_outbound() {
    local tag="$1"
    local interface="$2"
    local domain_strategy="$3"
    local redirect="$4"

    local json='{"protocol":"freedom","tag":"'"$tag"'","settings":{}}'

    if [ -n "$redirect" ]; then
        json=$(jq --arg redirect "$redirect" '.settings.redirect = $redirect' <<< "$json")
    fi

    if [ -n "$domain_strategy" ] || [ -n "$interface" ]; then
        json=$(jq --arg ds "$domain_strategy" --arg iface "$interface" '
            .streamSettings = ((.streamSettings // {}) + {"sockopt": {}}) |
            (if $ds != "" then .streamSettings.sockopt.domainStrategy = $ds else . end) |
            (if $iface != "" then .streamSettings.sockopt.interface = $iface else . end)
        ' <<< "$json")
    fi

    echo "$json"
}

#######################################
# Build a Blackhole (reject) outbound JSON.
# Arguments:
#   tag: string, outbound tag
# Outputs:
#   Outbound JSON object
#######################################
xray_cm_build_blackhole_outbound() {
    local tag="$1"

    echo '{"protocol":"blackhole","tag":"'"$tag"'","settings":{}}'
}

#######################################
# Build a DNS outbound JSON. It answers DNS queries received by inbounds
# routed to it, using the built-in DNS module.
# Arguments:
#   tag: string, outbound tag
# Outputs:
#   Outbound JSON object
#######################################
xray_cm_build_dns_outbound() {
    local tag="$1"

    # nonIPQuery "drop": HTTPS (type 65) and other non-A/AAAA queries are
    # discarded, same as the sing-box query_type HTTPS reject rules
    echo '{"protocol":"dns","tag":"'"$tag"'","settings":{"nonIPQuery":"drop"}}'
}

#######################################
# Build a SOCKS outbound JSON. Only SOCKS5 is supported by Xray.
# Arguments:
#   tag: string, outbound tag
#   host: string, server address
#   port: integer, server port
#   username: string (optional)
#   password: string (optional)
# Outputs:
#   Outbound JSON object
#######################################
xray_cm_build_socks_outbound() {
    local tag="$1"
    local host="$2"
    local port="$3"
    local username="$4"
    local password="$5"

    local server='{"address":"'"$host"'","port":'"$port"',"users":[]}'

    if [ -n "$username" ]; then
        server=$(jq --arg user "$username" --arg pass "$password" \
            '.users = [{"user": $user, "pass": $pass}]' <<< "$server")
    else
        server=$(jq 'del(.users)' <<< "$server")
    fi

    echo '{"protocol":"socks","tag":"'"$tag"'","settings":{"servers":['"$server"']}}'
}

#######################################
# Build a Shadowsocks outbound JSON.
# Arguments:
#   tag: string, outbound tag
#   host: string, server address
#   port: integer, server port
#   method: string, encryption method
#   password: string, password
# Outputs:
#   Outbound JSON object
#######################################
xray_cm_build_shadowsocks_outbound() {
    local tag="$1"
    local host="$2"
    local port="$3"
    local method="$4"
    local password="$5"

    local server
    server=$(jq -n --arg host "$host" --argjson port "$port" \
        --arg method "$method" --arg password "$password" \
        '{"address": $host, "port": $port, "method": $method, "password": $password}')

    echo '{"protocol":"shadowsocks","tag":"'"$tag"'","settings":{"servers":['"$server"']}}'
}

#######################################
# Build a VLESS outbound JSON.
# Arguments:
#   tag: string, outbound tag
#   host: string, server address
#   port: integer, server port
#   uuid: string, user id
#   flow: string, flow control (optional)
# Outputs:
#   Outbound JSON object
#######################################
xray_cm_build_vless_outbound() {
    local tag="$1"
    local host="$2"
    local port="$3"
    local uuid="$4"
    local flow="$5"

    local user
    user=$(jq -n --arg id "$uuid" --arg flow "$flow" '
        {"id": $id, "encryption": "none"} +
        (if $flow != "" then {"flow": $flow} else {} end)')

    local vnext
    vnext=$(jq -n --arg host "$host" --argjson port "$port" --argjson users "[$user]" \
        '{"address": $host, "port": $port, "users": $users}')

    echo '{"protocol":"vless","tag":"'"$tag"'","settings":{"vnext":['"$vnext"']}}'
}

#######################################
# Build a Trojan outbound JSON.
# Arguments:
#   tag: string, outbound tag
#   host: string, server address
#   port: integer, server port
#   password: string, password
# Outputs:
#   Outbound JSON object
#######################################
xray_cm_build_trojan_outbound() {
    local tag="$1"
    local host="$2"
    local port="$3"
    local password="$4"

    local server
    server=$(jq -n --arg host "$host" --argjson port "$port" --arg password "$password" \
        '{"address": $host, "port": $port, "password": $password}')

    echo '{"protocol":"trojan","tag":"'"$tag"'","settings":{"servers":['"$server"']}}'
}

#######################################
# Build a Hysteria2 outbound JSON. Requires Xray 26.1.13 or newer.
# Arguments:
#   tag: string, outbound tag
#   host: string, server address
#   port: integer, server port
#   password: string, auth password
#   obfs: string, obfuscation type (optional, "salamander")
#   obfs_password: string, obfuscation password (optional)
# Outputs:
#   Outbound JSON object
#######################################
xray_cm_build_hysteria2_outbound() {
    local tag="$1"
    local host="$2"
    local port="$3"
    local password="$4"
    local obfs="$5"
    local obfs_password="$6"

    local json
    json=$(jq -n --arg tag "$tag" --arg host "$host" --argjson port "$port" \
        --arg password "$password" '
        {
            "protocol": "hysteria",
            "tag": $tag,
            "settings": {"version": 2, "address": $host, "port": $port},
            "streamSettings": {
                "network": "hysteria",
                "hysteriaSettings": {"version": 2, "auth": $password}
            }
        }')

    if [ -n "$obfs" ] && [ "$obfs" = "salamander" ] && [ -n "$obfs_password" ]; then
        json=$(jq --arg password "$obfs_password" '
            .streamSettings.udpmasks = [{
                "type": "salamander",
                "settings": {"password": $password}
            }]' <<< "$json")
    fi

    echo "$json"
}

#######################################
# Set TLS settings for an outbound.
# Arguments:
#   config: string (JSON), configuration to modify
#   tag: string, outbound tag
#   server_name: string, SNI (optional)
#   insecure: "true"/"false" (optional)
#   alpn: string, JSON array or "" (optional)
#   fingerprint: string, uTLS fingerprint (optional)
#   ech_config: string, ECHConfigList value (optional, requires Xray 25.7.26+)
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cm_set_tls_for_outbound() {
    local config="$1"
    local tag="$2"
    local server_name="$3"
    local insecure="$4"
    local alpn="$5"
    local fingerprint="$6"
    local ech_config="$7"

    local tls='{}'

    [ -n "$server_name" ] && tls=$(jq --arg sni "$server_name" '.serverName = $sni' <<< "$tls")
    [ "$insecure" = "true" ] && tls=$(jq '.allowInsecure = true' <<< "$tls")
    if [ -n "$alpn" ] && [ "$alpn" != "[]" ]; then
        tls=$(jq --argjson alpn "$alpn" '.alpn = $alpn' <<< "$tls")
    fi
    [ -n "$fingerprint" ] && tls=$(jq --arg fp "$fingerprint" '.fingerprint = $fp' <<< "$tls")
    [ -n "$ech_config" ] && tls=$(jq --arg ech "$ech_config" '.echConfigList = $ech' <<< "$tls")

    jq --arg tag "$tag" --argjson tls "$tls" '
        (.outbounds[] | select(.tag == $tag) | .streamSettings) |=
            ((. // {}) + {"network": "raw", "security": "tls", "tlsSettings": $tls})
    ' <<< "$config"
}

#######################################
# Set REALITY settings for an outbound.
# Arguments:
#   config: string (JSON), configuration to modify
#   tag: string, outbound tag
#   server_name: string, SNI
#   fingerprint: string, uTLS fingerprint (optional)
#   public_key: string, REALITY public key
#   short_id: string, REALITY short id (optional)
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cm_set_reality_for_outbound() {
    local config="$1"
    local tag="$2"
    local server_name="$3"
    local fingerprint="$4"
    local public_key="$5"
    local short_id="$6"

    local reality='{}'

    [ -n "$server_name" ] && reality=$(jq --arg sni "$server_name" '.serverName = $sni' <<< "$reality")
    [ -n "$fingerprint" ] && reality=$(jq --arg fp "$fingerprint" '.fingerprint = $fp' <<< "$reality")
    [ -n "$public_key" ] && reality=$(jq --arg pk "$public_key" '.publicKey = $pk' <<< "$reality")
    [ -n "$short_id" ] && reality=$(jq --arg sid "$short_id" '.shortId = $sid' <<< "$reality")

    jq --arg tag "$tag" --argjson reality "$reality" '
        (.outbounds[] | select(.tag == $tag) | .streamSettings) |=
            ((. // {}) + {"network": "raw", "security": "reality", "realitySettings": $reality})
    ' <<< "$config"
}

#######################################
# Set a transport for an outbound. Only sets the settings object; the caller
# is responsible for the correct "network" value.
# Arguments:
#   config: string (JSON), configuration to modify
#   tag: string, outbound tag
#   network: string, Xray network name ("websocket", "grpc", "mkcp", "httpupgrade", "splithttp")
#   settings_key: string, key of the settings object ("wsSettings" etc.)
#   settings_json: string (JSON), transport settings object
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cm_set_transport_for_outbound() {
    local config="$1"
    local tag="$2"
    local network="$3"
    local settings_key="$4"
    local settings_json="$5"

    jq --arg tag "$tag" --arg network "$network" --arg key "$settings_key" \
        --argjson settings "$settings_json" '
        (.outbounds[] | select(.tag == $tag) | .streamSettings) |=
            ((. // {}) + {"network": $network} + {($key): $settings})
    ' <<< "$config"
}

#######################################
# Add a routing rule to the route section.
# Arguments:
#   config: string (JSON), configuration to modify
#   rule_json: string (JSON), full routing rule object
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cm_add_route_rule() {
    local config="$1"
    local rule_json="$2"

    jq --argjson rule "$rule_json" '.routing.rules += [$rule]' <<< "$config"
}

#######################################
# Add a balancer to the routing section.
# Arguments:
#   config: string (JSON), configuration to modify
#   tag: string, balancer tag
#   selector_prefix: string, prefix matched against outbound tags
#   strategy: string, "random" | "leastPing" | "leastLoad" | "roundRobin"
#   fallback_tag: string, outbound used when nothing is alive (optional)
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cm_add_balancer() {
    local config="$1"
    local tag="$2"
    local selector_prefix="$3"
    local strategy="$4"
    local fallback_tag="$5"

    jq --arg tag "$tag" --arg prefix "$selector_prefix" --arg strategy "$strategy" \
        --arg fallback "$fallback_tag" '
        .routing.balancers = ((.routing.balancers // []) + [
            {"tag": $tag, "selector": [$prefix], "strategy": {"type": $strategy}} +
            (if $fallback != "" then {"fallbackTag": $fallback} else {} end)
        ])
    ' <<< "$config"
}

#######################################
# Configure the burstObservatory for balancer strategies.
# Arguments:
#   config: string (JSON), configuration to modify
#   subject_prefix: string, prefix matched against outbound tags
#   destination: string, probe URL
#   interval: string, probe interval ("3m")
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cm_configure_burst_observatory() {
    local config="$1"
    local subject_prefix="$2"
    local destination="$3"
    local interval="$4"

    jq --arg prefix "$subject_prefix" --arg destination "$destination" \
        --arg interval "$interval" '
        .burstObservatory = {
            "subjectSelector": [$prefix],
            "pingConfig": {
                "destination": $destination,
                "connectivity": "",
                "interval": $interval,
                "sampling": 2,
                "timeout": "5s",
                "httpMethod": "HEAD"
            }
        }
    ' <<< "$config"
}

#######################################
# Enable the gRPC API on the loopback interface.
# Arguments:
#   config: string (JSON), configuration to modify
#   tag: string, api tag
#   listen: string, "address:port"
# Outputs:
#   Writes updated JSON configuration to stdout
#######################################
xray_cm_configure_api() {
    local config="$1"
    local tag="$2"
    local listen="$3"

    jq --arg tag "$tag" --arg listen "$listen" '
        .api = {
            "tag": $tag,
            "listen": $listen,
            "services": ["HandlerService", "StatsService", "RoutingService"]
        }
    ' <<< "$config"
}

#######################################
# Save an Xray JSON configuration to a file.
# Arguments:
#   config: string (JSON), configuration to save
#   file_path: string, path to save the configuration file
#######################################
xray_cm_save_config_to_file() {
    local config="$1"
    local file_path="$2"

    jq . > "$file_path" <<< "$config"
}

#######################################
# Validate an Xray JSON configuration file with the Xray binary.
# Arguments:
#   config_path: string, path to the configuration file
#######################################
xray_cm_check_config() {
    local config_path="$1"

    if ! xray run -test -c "$config_path" > /dev/null 2>&1; then
        log "Xray configuration $config_path is invalid. Aborted." "fatal"
        exit 1
    fi
}
