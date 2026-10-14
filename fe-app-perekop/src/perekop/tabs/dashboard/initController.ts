import { onMount, preserveScrollForPage } from '../../../helpers';
import { prettyBytes } from '../../../helpers/prettyBytes';
import { CustomPerekopMethods, PerekopShellMethods } from '../../methods';
import { logger, store, StoreType } from '../../services';
import { renderSections, renderWidget } from './partials';
import { fetchServicesInfo } from '../../fetchers';
let trafficTimer: number | undefined;
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
    if (!success || !dashboardMounted) return;
    trafficTimer = setTimeout(pollTraffic, 1500);
  } catch (error) {
    logger.error('[DASHBOARD]', 'pollTraffic: failed to fetch', error);
  }
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

function renderSectionsWidget() {
  const sectionsWidget = store.get().sectionsWidget;
  const container = document.getElementById('dashboard-sections-grid');
  if (!container) return;
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
          }),
        ]
      : sectionsWidget.data.map((section) =>
          renderSections({
            loading: false,
            failed: false,
            section,
            onChooseOutbound: handleChooseOutbound,
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
  if (diff.sectionsWidget) renderSectionsWidget();
  if (diff.bandwidthWidget) renderBandwidthWidget();
  if (diff.trafficTotalWidget) renderTrafficTotalWidget();
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
}

function onPageUnmount() {
  dashboardMounted = false;
  store.unsubscribe(onStoreUpdate);
  clearTimeout(trafficTimer);
  trafficTimer = undefined;
  previousTraffic = undefined;
  store.reset([
    'bandwidthWidget',
    'trafficTotalWidget',
    'servicesInfoWidget',
    'sectionsWidget',
  ]);
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
