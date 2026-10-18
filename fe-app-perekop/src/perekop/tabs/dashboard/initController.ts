import { Perekop } from '../../types';
import { onMount, preserveScrollForPage } from '../../../helpers';
import { prettyBytes } from '../../../helpers/prettyBytes';
import { CustomPerekopMethods, PerekopShellMethods } from '../../methods';
import { logger, store, StoreType } from '../../services';
import { renderSections, renderWidget } from './partials';
import { fetchServicesInfo } from '../../fetchers';

let trafficTimer: number | undefined;
let systemInfoTimer: number | undefined;
let dashboardMounted = false;
let previousTraffic:
  | { uplink: number; downlink: number; at: number }
  | undefined;

async function fetchDashboardSections() {
  const previous = store.get().sectionsWidget;
  store.set({ sectionsWidget: { ...previous, failed: false } });
  const { data, success } = await CustomPerekopMethods.getDashboardSections();
  if (!success)
    logger.error('[DASHBOARD]', 'fetchDashboardSections: failed to fetch');
  store.set({ sectionsWidget: { loading: false, failed: !success, data } });
}

async function fetchTraffic() {
  const result = await PerekopShellMethods.getXrayTraffic();
  if (!result.success) {
    previousTraffic = undefined;
    store.set({
      bandwidthWidget: {
        loading: false,
        failed: true,
        data: { up: 0, down: 0 },
      },
      trafficTotalWidget: {
        loading: false,
        failed: true,
        data: { uploadTotal: 0, downloadTotal: 0 },
      },
    });
    return false;
  }
  const now = Date.now();
  const current = {
    uplink: result.data.uplink,
    downlink: result.data.downlink,
    at: now,
  };
  let up = 0;
  let down = 0;
  if (
    previousTraffic &&
    now > previousTraffic.at &&
    current.uplink >= previousTraffic.uplink &&
    current.downlink >= previousTraffic.downlink
  ) {
    const elapsed = (now - previousTraffic.at) / 1000;
    up = (current.uplink - previousTraffic.uplink) / elapsed;
    down = (current.downlink - previousTraffic.downlink) / elapsed;
  }
  previousTraffic = current;
  store.set({
    bandwidthWidget: { loading: false, failed: false, data: { up, down } },
    trafficTotalWidget: {
      loading: false,
      failed: false,
      data: { uploadTotal: current.uplink, downloadTotal: current.downlink },
    },
  });
  return true;
}

async function pollTraffic() {
  if (!dashboardMounted) return;
  try {
    const success = await fetchTraffic();
    if (!dashboardMounted) return;
    // Keep polling on failures too: the core may just be restarting,
    // freezing the widgets forever is worse than a retry
    trafficTimer = setTimeout(pollTraffic, success ? 1500 : 5000);
  } catch (error) {
    logger.error('[DASHBOARD]', 'pollTraffic: failed to fetch', error);
    if (dashboardMounted) trafficTimer = setTimeout(pollTraffic, 5000);
  }
}

async function fetchSystemInfo() {
  const result = await PerekopShellMethods.getXrayRuntimeInfo();
  store.set({
    systemInfoWidget: result.success
      ? { loading: false, failed: false, data: result.data }
      : {
          loading: false,
          failed: true,
          data: { memory: 0, uptime: 0, connections: 0 },
        },
  });
}

async function pollSystemInfo() {
  if (!dashboardMounted) return;
  try {
    await fetchSystemInfo();
  } catch (error) {
    logger.error('[DASHBOARD]', 'pollSystemInfo: failed to fetch', error);
  }
  if (dashboardMounted) systemInfoTimer = setTimeout(pollSystemInfo, 5000);
}

async function handleChooseOutbound(selector: string, tag: string) {
  const result = await PerekopShellMethods.setGroupProxy(selector, tag);
  if (!result.success)
    logger.error(
      '[DASHBOARD]',
      'handleChooseOutbound: failed to set proxy',
      result,
    );
  await fetchDashboardSections();
}

async function handleTestLatency(section: string) {
  store.set({ latencyFetching: true });
  const result = await PerekopShellMethods.testGroupDelay(section);
  if (result.success) {
    store.set({ dashboardLatency: result.data });
  } else {
    logger.error('[DASHBOARD]', 'handleTestLatency: failed', result);
    store.set({ dashboardLatency: {} });
  }
  store.set({ latencyFetching: false });
}

function renderSectionsWidget() {
  const sectionsWidget = store.get().sectionsWidget;
  const latency = store.get().dashboardLatency;
  const latencyFetching = store.get().latencyFetching;
  const container = document.getElementById('dashboard-sections-grid');
  if (!container) return;

  const withLatency = (outbound: Perekop.Outbound): Perekop.Outbound => ({
    ...outbound,
    latency: outbound.code ? (latency[outbound.code] ?? null) : null,
  });

  const sectionList =
    sectionsWidget.loading || sectionsWidget.failed
      ? [
          renderSections({
            loading: sectionsWidget.loading,
            failed: sectionsWidget.failed,
            section: {
              code: '',
              displayName: '',
              outbounds: [],
              withTagSelect: false,
            },
            onChooseOutbound: () => {},
            onTestLatency: () => {},
            latencyFetching,
          }),
        ]
      : sectionsWidget.data.map((section) =>
          renderSections({
            loading: false,
            failed: false,
            section: {
              ...section,
              outbounds: section.outbounds.map(withLatency),
            },
            onChooseOutbound: handleChooseOutbound,
            onTestLatency: handleTestLatency,
            latencyFetching,
          }),
        );
  preserveScrollForPage(() => container.replaceChildren(...sectionList));
}

function renderBandwidthWidget() {
  const traffic = store.get().bandwidthWidget;
  const container = document.getElementById('dashboard-widget-traffic');
  if (!container) return;
  container.replaceChildren(
    renderWidget({
      loading: traffic.loading,
      failed: traffic.failed,
      title: _('Traffic'),
      items:
        traffic.loading || traffic.failed
          ? []
          : [
              { key: _('Uplink'), value: `${prettyBytes(traffic.data.up)}/s` },
              {
                key: _('Downlink'),
                value: `${prettyBytes(traffic.data.down)}/s`,
              },
            ],
    }),
  );
}

function renderTrafficTotalWidget() {
  const traffic = store.get().trafficTotalWidget;
  const container = document.getElementById('dashboard-widget-traffic-total');
  if (!container) return;
  container.replaceChildren(
    renderWidget({
      loading: traffic.loading,
      failed: traffic.failed,
      title: _('Traffic Total'),
      items:
        traffic.loading || traffic.failed
          ? []
          : [
              {
                key: _('Uplink'),
                value: prettyBytes(traffic.data.uploadTotal),
              },
              {
                key: _('Downlink'),
                value: prettyBytes(traffic.data.downloadTotal),
              },
            ],
    }),
  );
}

function renderSystemInfoWidget() {
  const systemInfo = store.get().systemInfoWidget;
  const container = document.getElementById('dashboard-widget-system-info');
  if (!container) return;
  container.replaceChildren(
    renderWidget({
      loading: systemInfo.loading,
      failed: systemInfo.failed,
      title: _('System info'),
      items:
        systemInfo.loading || systemInfo.failed
          ? []
          : [
              {
                key: _('Connections'),
                value: String(systemInfo.data.connections),
              },
              { key: _('Memory'), value: prettyBytes(systemInfo.data.memory) },
              {
                key: _('Uptime'),
                value: `${Math.floor(systemInfo.data.uptime / 60)} ${_('min')}`,
              },
            ],
    }),
  );
}

function renderServicesInfoWidget() {
  const services = store.get().servicesInfoWidget;
  const container = document.getElementById('dashboard-widget-service-info');
  if (!container) return;
  container.replaceChildren(
    renderWidget({
      loading: services.loading,
      failed: services.failed,
      title: _('Services info'),
      items:
        services.loading || services.failed
          ? []
          : [
              {
                key: _('Perekop'),
                value: services.data.perekop
                  ? _('✔ Enabled')
                  : _('✘ Disabled'),
                attributes: {
                  class: services.data.perekop
                    ? 'pdk_dashboard-page__widgets-section__item__row--success'
                    : 'pdk_dashboard-page__widgets-section__item__row--error',
                },
              },
              {
                key: _('Xray'),
                value: services.data.xray ? _('✔ Running') : _('✘ Stopped'),
                attributes: {
                  class: services.data.xray
                    ? 'pdk_dashboard-page__widgets-section__item__row--success'
                    : 'pdk_dashboard-page__widgets-section__item__row--error',
                },
              },
            ],
    }),
  );
}

function onStoreUpdate(
  _next: StoreType,
  _prev: StoreType,
  diff: Partial<StoreType>,
) {
  if (diff.sectionsWidget || diff.dashboardLatency || diff.latencyFetching)
    renderSectionsWidget();
  if (diff.bandwidthWidget) renderBandwidthWidget();
  if (diff.trafficTotalWidget) renderTrafficTotalWidget();
  if (diff.systemInfoWidget) renderSystemInfoWidget();
  if (diff.servicesInfoWidget) renderServicesInfoWidget();
}

async function onPageMount() {
  onPageUnmount();
  dashboardMounted = true;
  store.subscribe(onStoreUpdate);
  await Promise.all([fetchDashboardSections(), fetchServicesInfo()]);
  if (!dashboardMounted) return;
  previousTraffic = undefined;
  void pollTraffic();
  void pollSystemInfo();
}

function onPageUnmount() {
  dashboardMounted = false;
  store.unsubscribe(onStoreUpdate);
  clearTimeout(trafficTimer);
  clearTimeout(systemInfoTimer);
  trafficTimer = undefined;
  systemInfoTimer = undefined;
  previousTraffic = undefined;
  store.reset([
    'bandwidthWidget',
    'trafficTotalWidget',
    'servicesInfoWidget',
    'systemInfoWidget',
    'sectionsWidget',
    'latencyFetching',
  ]);
  // dashboardLatency is kept: measured delays stay valid across
  // tab switches and the diagnostics round trip
}

function registerLifecycleListeners() {
  store.subscribe((next, prev, diff) => {
    if (!diff.tabService || next.tabService.current === prev.tabService.current)
      return;
    if (next.tabService.current === 'dashboard') void onPageMount();
    else onPageUnmount();
  });
}

export async function initController(): Promise<void> {
  onMount('dashboard-status').then(() => {
    onPageMount();
    registerLifecycleListeners();
  });
}
