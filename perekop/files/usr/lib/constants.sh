# shellcheck disable=SC2034

PEREKOP_VERSION="__COMPILED_VERSION_VARIABLE__"
## Common
PEREKOP_CONFIG="/etc/config/perekop"
RESOLV_CONF="/etc/resolv.conf"
DNS_RESOLVERS="1.1.1.1 1.0.0.1 8.8.8.8 8.8.4.4 9.9.9.9 9.9.9.11 94.140.14.14 94.140.15.15 208.67.220.220 208.67.222.222 77.88.8.1 77.88.8.8"
CHECK_PROXY_IP_DOMAIN="ip.podkop.fyi"
FAKEIP_TEST_DOMAIN="fakeip.podkop.fyi"
FAKEIP_TEST_LOCAL_IP="198.18.255.254"
TMP_XRAY_FOLDER="/tmp/perekop"
TMP_LISTS_FOLDER="$TMP_XRAY_FOLDER/lists"
TMP_RULESET_FOLDER="$TMP_XRAY_FOLDER/rulesets"
GEOFILES_STATE="$TMP_XRAY_FOLDER/geofiles.state"
CLOUDFLARE_OCTETS="8.47 162.159 188.114" # Endpoints https://github.com/ampetelin/warp-endpoint-checker
JQ_REQUIRED_VERSION="1.7.1"
COREUTILS_BASE64_REQUIRED_VERSION="9.7"
RT_TABLE_NAME="perekop"

## nft
NFT_TABLE_NAME="PerekopTable"
NFT_LOCALV4_SET_NAME="localv4"
NFT_COMMON_SET_NAME="perekop_subnets"
NFT_DISCORD_SET_NAME="perekop_discord_subnets"
NFT_INTERFACE_SET_NAME="interfaces"
NFT_FAKEIP_MARK="0x00100000"
NFT_OUTBOUND_MARK="0x00200000"

## xray
XRAY_REQUIRED_VERSION="25.1.30"
XRAY_HYSTERIA_MIN_VERSION="26.1.13"
XRAY_ECH_MIN_VERSION="25.7.26"
# DNS
XRAY_DNS_TAG="perekop-dns"
XRAY_FAKEIP_INET4_RANGE="198.18.0.0/15"
XRAY_FAKEIP_POOL_SIZE=65535
# Inbounds
XRAY_TPROXY_INBOUND_TAG="tproxy-in"
XRAY_TPROXY_INBOUND_ADDRESS="127.0.0.1"
XRAY_TPROXY_INBOUND_PORT=1602
XRAY_DNS_INBOUND_TAG="dns-in"
XRAY_DNS_INBOUND_ADDRESS="127.0.0.42"
XRAY_DNS_INBOUND_PORT=53
XRAY_SERVICE_SOCKS_INBOUND_TAG="service-socks-in"
XRAY_SERVICE_SOCKS_INBOUND_ADDRESS="127.0.0.1"
XRAY_SERVICE_SOCKS_INBOUND_PORT=4534
XRAY_LATENCY_SOCKS_INBOUND_ADDRESS="127.0.0.1"
XRAY_LATENCY_SOCKS_BASE_PORT=4600
XRAY_LATENCY_TEST_URL="https://www.gstatic.com/generate_204"
# Outbounds
XRAY_DIRECT_OUTBOUND_TAG="direct-out"
XRAY_BLACKHOLE_OUTBOUND_TAG="blackhole-out"
XRAY_DNS_OUTBOUND_TAG="dns-out"
XRAY_FAKEIP_TEST_OUTBOUND_TAG="fakeip-test-out"
# Route
XRAY_EXCLUSION_RULE_TAG="exclusion-rule-tag"
XRAY_API_LISTEN_ADDRESS="127.0.0.1"
XRAY_API_LISTEN_PORT=10085

## Lists
GITHUB_RAW_URL="https://raw.githubusercontent.com/itdoginfo/allow-domains/main"
SRS_MAIN_URL="https://github.com/itdoginfo/allow-domains/releases/latest/download"
GEOSITE_URL="$SRS_MAIN_URL/geosite.dat"
SUBNETS_TWITTER="${GITHUB_RAW_URL}/Subnets/IPv4/twitter.lst"
SUBNETS_META="${GITHUB_RAW_URL}/Subnets/IPv4/meta.lst"
SUBNETS_DISCORD="${GITHUB_RAW_URL}/Subnets/IPv4/discord.lst"
SUBNETS_ROBLOX="${GITHUB_RAW_URL}/Subnets/IPv4/roblox.lst"
SUBNETS_TELERAM="${GITHUB_RAW_URL}/Subnets/IPv4/telegram.lst"
SUBNETS_CLOUDFLARE="${GITHUB_RAW_URL}/Subnets/IPv4/cloudflare.lst"
SUBNETS_HETZNER="${GITHUB_RAW_URL}/Subnets/IPv4/hetzner.lst"
SUBNETS_OVH="${GITHUB_RAW_URL}/Subnets/IPv4/ovh.lst"
SUBNETS_DIGITALOCEAN="${GITHUB_RAW_URL}/Subnets/IPv4/digitalocean.lst"
SUBNETS_CLOUDFRONT="${GITHUB_RAW_URL}/Subnets/IPv4/cloudfront.lst"
COMMUNITY_SERVICES="russia_inside russia_outside ukraine_inside geoblock block porn news anime youtube hdrezka tiktok google_ai google_play hodca discord meta twitter cloudflare cloudfront digitalocean hetzner ovh telegram roblox"

# geosite.dat tags are uppercase with dashes: russia_inside -> RUSSIA-INSIDE
community_geosite_tag() {
    echo "$1" | tr 'a-z_' 'A-Z-'
}
