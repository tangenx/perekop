import { callBaseMethod } from './callBaseMethod';
import { ClashAPI, Perekop } from '../../types';

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
  checkSingBox: async () =>
    callBaseMethod<Perekop.SingBoxCheckResult>(
      Perekop.AvailableMethods.CHECK_SING_BOX,
    ),
  getSingBoxStatus: async () =>
    callBaseMethod<Perekop.GetSingBoxStatus>(
      Perekop.AvailableMethods.GET_SING_BOX_STATUS,
    ),
  getClashApiProxies: async () =>
    callBaseMethod<ClashAPI.Proxies>(Perekop.AvailableMethods.CLASH_API, [
      Perekop.AvailableClashAPIMethods.GET_PROXIES,
    ]),
  getClashApiProxyLatency: async (tag: string) =>
    callBaseMethod<Perekop.GetClashApiProxyLatency>(
      Perekop.AvailableMethods.CLASH_API,
      [Perekop.AvailableClashAPIMethods.GET_PROXY_LATENCY, tag, '5000'],
    ),
  getClashApiGroupLatency: async (tag: string) =>
    callBaseMethod<Perekop.GetClashApiGroupLatency>(
      Perekop.AvailableMethods.CLASH_API,
      [Perekop.AvailableClashAPIMethods.GET_GROUP_LATENCY, tag, '10000'],
    ),
  setClashApiGroupProxy: async (group: string, proxy: string) =>
    callBaseMethod<unknown>(Perekop.AvailableMethods.CLASH_API, [
      Perekop.AvailableClashAPIMethods.SET_GROUP_PROXY,
      group,
      proxy,
    ]),
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
  showSingBoxConfig: async () =>
    callBaseMethod<unknown>(Perekop.AvailableMethods.SHOW_SING_BOX_CONFIG),
  checkLogs: async () =>
    callBaseMethod<unknown>(Perekop.AvailableMethods.CHECK_LOGS),
  getSystemInfo: async () =>
    callBaseMethod<Perekop.GetSystemInfo>(
      Perekop.AvailableMethods.GET_SYSTEM_INFO,
    ),
  getSingBoxFeatures: async () =>
    callBaseMethod<string[]>(Perekop.AvailableMethods.GET_SING_BOX_FEATURES),
};
