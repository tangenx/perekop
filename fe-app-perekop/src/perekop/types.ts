// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Perekop {
  export enum AvailableMethods {
    CHECK_DNS_AVAILABLE = 'check_dns_available',
    CHECK_FAKEIP = 'check_fakeip',
    CHECK_NFT_RULES = 'check_nft_rules',
    GET_STATUS = 'get_status',
    CHECK_XRAY = 'check_xray',
    GET_XRAY_STATUS = 'get_xray_status',
    XRAY_API = 'xray_api',
    RESTART = 'restart',
    START = 'start',
    STOP = 'stop',
    ENABLE = 'enable',
    DISABLE = 'disable',
    GLOBAL_CHECK = 'global_check',
    SHOW_XRAY_CONFIG = 'show_xray_config',
    CHECK_LOGS = 'check_logs',
    GET_SYSTEM_INFO = 'get_system_info',
    GET_XRAY_FEATURES = 'get_xray_features',
  }

  export enum AvailableXrayAPIMethods {
    GET_TRAFFIC = 'get_traffic',
    GET_PROXIES = 'get_proxies',
    SET_GROUP_PROXY = 'set_group_proxy',
    GET_RUNTIME_INFO = 'get_runtime_info',
    TEST_GROUP_DELAY = 'test_group_delay',
  }

  export interface XrayTraffic {
    uplink: number;
    downlink: number;
    outbound: Record<string, { uplink: number; downlink: number }>;
  }

  export interface XrayRuntimeInfo {
    memory: number;
    uptime: number;
    connections: number;
  }
  export interface XrayProxyGroup {
    outbounds: string[];
    selected: string;
  }

  export type XrayProxies = Record<string, XrayProxyGroup>;

  export interface Outbound {
    code: string;
    displayName: string;
    type: string;
    selected: boolean;
    latency?: number | null;
  }

  export interface OutboundGroup {
    withTagSelect: boolean;
    code: string;
    displayName: string;
    outbounds: Outbound[];
  }

  export interface ConfigProxyUrlTestSection {
    connection_type: 'proxy';
    proxy_config_type: 'urltest';
    urltest_proxy_links: string[];
    urltest_fallback_links?: string[];
  }

  export interface ConfigProxySelectorSection {
    connection_type: 'proxy';
    proxy_config_type: 'selector';
    selector_proxy_links: string[];
  }

  export interface ConfigProxyUrlSection {
    connection_type: 'proxy';
    proxy_config_type: 'url';
    proxy_string: string;
  }

  export interface ConfigProxyOutboundSection {
    connection_type: 'proxy';
    proxy_config_type: 'outbound';
    outbound_json: string;
  }

  export interface ConfigVpnSection {
    connection_type: 'vpn';
    interface: string;
  }

  export interface ConfigBlockSection {
    connection_type: 'block';
  }
  export interface ConfigExclusionSection {
    connection_type: 'exclusion';
  }

  export type ConfigBaseSection =
    | ConfigProxyUrlTestSection
    | ConfigProxySelectorSection
    | ConfigProxyUrlSection
    | ConfigProxyOutboundSection
    | ConfigVpnSection
    | ConfigBlockSection
    | ConfigExclusionSection;

  export type ConfigSection = ConfigBaseSection & {
    '.name': string;
    '.type': 'settings' | 'section';
  };

  export interface MethodSuccessResponse<T> {
    success: true;
    data: T;
  }
  export interface MethodFailureResponse {
    success: false;
    error: string;
  }
  export type MethodResponse<T> =
    | MethodSuccessResponse<T>
    | MethodFailureResponse;

  export interface DnsCheckResult {
    dns_type: 'udp' | 'doh';
    dns_server: string;
    dns_status: 0 | 1;
    dns_on_router: 0 | 1;
    bootstrap_dns_server: string;
    bootstrap_dns_status: 0 | 1;
    dhcp_config_status: 0 | 1;
  }
  export interface NftRulesCheckResult {
    table_exist: 0 | 1;
    rules_mangle_exist: 0 | 1;
    rules_mangle_counters: 0 | 1;
    rules_mangle_output_exist: 0 | 1;
    rules_mangle_output_counters: 0 | 1;
    rules_proxy_exist: 0 | 1;
    rules_proxy_counters: 0 | 1;
    rules_other_mark_exist: 0 | 1;
  }
  export interface XrayCheckResult {
    xray_installed: 0 | 1;
    xray_version_ok: 0 | 1;
    xray_service_exist: 0 | 1;
    xray_autostart_disabled: 0 | 1;
    xray_process_running: 0 | 1;
    xray_ports_listening: 0 | 1;
  }
  export interface FakeIPCheckResult {
    fakeip: boolean;
    IP: string;
  }
  export interface GetStatus {
    enabled: number;
    status: string;
  }
  export interface GetXrayStatus {
    running: number;
    enabled: number;
    status: string;
  }
  export interface GetSystemInfo {
    perekop_version: string;
    perekop_latest_version: string;
    luci_app_version: string;
    xray_version: string;
    openwrt_version: string;
    device_model: string;
  }
}
