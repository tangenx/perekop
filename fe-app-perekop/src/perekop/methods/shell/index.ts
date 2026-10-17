import { callBaseMethod } from './callBaseMethod';
import { Perekop } from '../../types';

export const PerekopShellMethods = {
  checkDNSAvailable: async () =>
    callBaseMethod<Perekop.DnsCheckResult>(
      Perekop.AvailableMethods.CHECK_DNS_AVAILABLE,
    ),
  checkFakeIP: async () =>
    callBaseMethod<Perekop.FakeIPCheckResult>(
      Perekop.AvailableMethods.CHECK_FAKEIP,
    ),
  checkNftRules: async () =>
    callBaseMethod<Perekop.NftRulesCheckResult>(
      Perekop.AvailableMethods.CHECK_NFT_RULES,
    ),
  getStatus: async () =>
    callBaseMethod<Perekop.GetStatus>(Perekop.AvailableMethods.GET_STATUS),
  checkXray: async () =>
    callBaseMethod<Perekop.XrayCheckResult>(
      Perekop.AvailableMethods.CHECK_XRAY,
    ),
  getXrayStatus: async () =>
    callBaseMethod<Perekop.GetXrayStatus>(
      Perekop.AvailableMethods.GET_XRAY_STATUS,
    ),
  getXrayTraffic: async () =>
    callBaseMethod<Perekop.XrayTraffic>(Perekop.AvailableMethods.XRAY_API, [
      Perekop.AvailableXrayAPIMethods.GET_TRAFFIC,
    ]),
  getXrayProxies: async () =>
    callBaseMethod<Perekop.XrayProxies>(Perekop.AvailableMethods.XRAY_API, [
      Perekop.AvailableXrayAPIMethods.GET_PROXIES,
    ]),
  setGroupProxy: async (group: string, proxy: string) =>
    callBaseMethod<unknown>(Perekop.AvailableMethods.XRAY_API, [
      Perekop.AvailableXrayAPIMethods.SET_GROUP_PROXY,
      group,
      proxy,
    ]),
  getXrayRuntimeInfo: async () =>
    callBaseMethod<Perekop.XrayRuntimeInfo>(Perekop.AvailableMethods.XRAY_API, [
      Perekop.AvailableXrayAPIMethods.GET_RUNTIME_INFO,
    ]),
  testGroupDelay: async (group: string) =>
    callBaseMethod<Record<string, number>>(
      Perekop.AvailableMethods.XRAY_API,
      [Perekop.AvailableXrayAPIMethods.TEST_GROUP_DELAY, group],
      '/usr/bin/perekop',
      60000,
    ),
  restart: async () =>
    callBaseMethod<unknown>(
      Perekop.AvailableMethods.RESTART,
      [],
      '/etc/init.d/perekop',
    ),
  start: async () =>
    callBaseMethod<unknown>(
      Perekop.AvailableMethods.START,
      [],
      '/etc/init.d/perekop',
    ),
  stop: async () =>
    callBaseMethod<unknown>(
      Perekop.AvailableMethods.STOP,
      [],
      '/etc/init.d/perekop',
    ),
  enable: async () =>
    callBaseMethod<unknown>(
      Perekop.AvailableMethods.ENABLE,
      [],
      '/etc/init.d/perekop',
    ),
  disable: async () =>
    callBaseMethod<unknown>(
      Perekop.AvailableMethods.DISABLE,
      [],
      '/etc/init.d/perekop',
    ),
  globalCheck: async () =>
    callBaseMethod<unknown>(Perekop.AvailableMethods.GLOBAL_CHECK),
  showXrayConfig: async () =>
    callBaseMethod<unknown>(Perekop.AvailableMethods.SHOW_XRAY_CONFIG),
  checkLogs: async () =>
    callBaseMethod<unknown>(Perekop.AvailableMethods.CHECK_LOGS),
  getSystemInfo: async () =>
    callBaseMethod<Perekop.GetSystemInfo>(
      Perekop.AvailableMethods.GET_SYSTEM_INFO,
    ),
  getXrayFeatures: async () =>
    callBaseMethod<string[]>(Perekop.AvailableMethods.GET_XRAY_FEATURES),
};
