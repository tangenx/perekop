import { onMount, preserveScrollForPage } from '../../../helpers';
import { runDnsCheck } from './checks/runDnsCheck';
import { runXrayCheck } from './checks/runXrayCheck';
import { runNftCheck } from './checks/runNftCheck';
import { runFakeIPCheck } from './checks/runFakeIPCheck';
import { runSectionsCheck } from './checks/runSectionsCheck';
import { loadingDiagnosticsChecksStore } from './diagnostic.store';
import { logger, store, StoreType } from '../../services';
import {
  renderAvailableActions,
  renderCheckSection,
  renderRunAction,
  renderSystemInfo,
  renderWikiDisclaimer,
} from './partials';
import { PerekopShellMethods } from '../../methods';
import { fetchServicesInfo } from '../../fetchers';
import { normalizeCompiledVersion } from '../../../helpers/normalizeCompiledVersion';
import { renderModal } from '../../../partials';
import { PEREKOP_LUCI_APP_VERSION } from '../../../constants';
import { showToast } from '../../../helpers/showToast';
import { getPerekopVersionRow } from './helpers/getPerekopVersionRow';

async function fetchSystemInfo() {
  const result = await PerekopShellMethods.getSystemInfo();
  store.set({
    diagnosticsSystemInfo: result.success
      ? { loading: false, ...result.data }
      : {
          loading: false,
          perekop_version: _('unknown'),
          perekop_latest_version: _('unknown'),
          luci_app_version: _('unknown'),
          xray_version: _('unknown'),
          openwrt_version: _('unknown'),
          device_model: _('unknown'),
        },
  });
}
function renderDiagnosticsChecks() {
  const container = document.getElementById('pdk_diagnostic-page-checks');
  if (!container) return;
  const checks = [...store.get().diagnosticsChecks]
    .sort((a, b) => a.order - b.order)
    .map(renderCheckSection);
  preserveScrollForPage(() => container.replaceChildren(...checks));
}
function renderDiagnosticRunActionWidget() {
  const container = document.getElementById('pdk_diagnostic-page-run-check');
  if (container)
    container.replaceChildren(
      renderRunAction({
        loading: store.get().diagnosticsRunAction.loading,
        click: runChecks,
      }),
    );
}
async function runAction(
  key: 'restart' | 'start' | 'stop' | 'enable' | 'disable',
  action: () => Promise<unknown>,
) {
  const actions = store.get().diagnosticsActions;
  store.set({ diagnosticsActions: { ...actions, [key]: { loading: true } } });
  try {
    await action();
  } catch (error) {
    logger.error('[DIAGNOSTIC]', key, error);
  } finally {
    await fetchServicesInfo();
    store.set({
      diagnosticsActions: { ...actions, [key]: { loading: false } },
    });
  }
}
async function handleShowGlobalCheck() {
  const result = await PerekopShellMethods.globalCheck();
  if (result.success)
    ui.showModal(
      _('Global check'),
      renderModal(result.data as string, 'global_check'),
    );
  else showToast(_('Failed to execute!'), 'error');
}
async function handleViewLogs() {
  const result = await PerekopShellMethods.checkLogs();
  if (result.success)
    ui.showModal(
      _('View logs'),
      renderModal(result.data as string, 'view_logs'),
    );
  else showToast(_('Failed to execute!'), 'error');
}
async function handleShowXrayConfig() {
  const actions = store.get().diagnosticsActions;
  store.set({
    diagnosticsActions: { ...actions, showXrayConfig: { loading: true } },
  });
  try {
    const result = await PerekopShellMethods.showXrayConfig();
    if (result.success)
      ui.showModal(
        _('Show Xray config'),
        renderModal(JSON.stringify(result.data, null, 2), 'show_xray_config'),
      );
    else showToast(_('Failed to execute!'), 'error');
  } finally {
    store.set({
      diagnosticsActions: { ...actions, showXrayConfig: { loading: false } },
    });
  }
}
function renderDiagnosticAvailableActionsWidget() {
  const { diagnosticsActions: actions, servicesInfoWidget: services } =
    store.get();
  const container = document.getElementById('pdk_diagnostic-page-actions');
  if (!container) return;
  const busy =
    services.loading ||
    actions.restart.loading ||
    actions.start.loading ||
    actions.stop.loading;
  const xrayRunning = Boolean(services.data.xray);
  container.replaceChildren(
    renderAvailableActions({
      restart: {
        loading: actions.restart.loading,
        visible: true,
        onClick: () => runAction('restart', PerekopShellMethods.restart),
        disabled: busy,
      },
      start: {
        loading: actions.start.loading,
        visible: !xrayRunning,
        onClick: () => runAction('start', PerekopShellMethods.start),
        disabled: busy,
      },
      stop: {
        loading: actions.stop.loading,
        visible: xrayRunning,
        onClick: () => runAction('stop', PerekopShellMethods.stop),
        disabled: busy,
      },
      enable: {
        loading: actions.enable.loading,
        visible: !services.data.perekop,
        onClick: () => runAction('enable', PerekopShellMethods.enable),
        disabled: busy,
      },
      disable: {
        loading: actions.disable.loading,
        visible: Boolean(services.data.perekop),
        onClick: () => runAction('disable', PerekopShellMethods.disable),
        disabled: busy,
      },
      globalCheck: {
        loading: false,
        visible: true,
        onClick: handleShowGlobalCheck,
        disabled: busy,
      },
      viewLogs: {
        loading: false,
        visible: true,
        onClick: handleViewLogs,
        disabled: busy,
      },
      showXrayConfig: {
        loading: actions.showXrayConfig.loading,
        visible: true,
        onClick: handleShowXrayConfig,
        disabled: busy,
      },
    }),
  );
}
function renderDiagnosticSystemInfoWidget() {
  const info = store.get().diagnosticsSystemInfo;
  const container = document.getElementById('pdk_diagnostic-page-system-info');
  if (!container) return;
  container.replaceChildren(
    renderSystemInfo({
      items: [
        getPerekopVersionRow(info),
        {
          key: 'Luci App',
          value: normalizeCompiledVersion(PEREKOP_LUCI_APP_VERSION),
        },
        { key: 'Xray', value: info.xray_version },
        { key: 'OS', value: info.openwrt_version },
        { key: 'Device', value: info.device_model },
      ],
    }),
  );
}
function renderWiki() {
  const container = document.getElementById('pdk_diagnostic-page-wiki');
  if (container)
    container.replaceChildren(
      renderWikiDisclaimer(
        store.get().diagnosticsChecks.some((check) => check.state === 'error')
          ? 'error'
          : 'default',
      ),
    );
}
function onStoreUpdate(
  _next: StoreType,
  _prev: StoreType,
  diff: Partial<StoreType>,
) {
  if (diff.diagnosticsChecks) {
    renderDiagnosticsChecks();
    renderWiki();
  }
  if (diff.diagnosticsRunAction) renderDiagnosticRunActionWidget();
  if (diff.diagnosticsActions || diff.servicesInfoWidget)
    renderDiagnosticAvailableActionsWidget();
  if (diff.diagnosticsSystemInfo) renderDiagnosticSystemInfoWidget();
}
async function runChecks() {
  store.set({
    diagnosticsRunAction: { loading: true },
    diagnosticsChecks: loadingDiagnosticsChecksStore.diagnosticsChecks,
  });
  try {
    await runDnsCheck();
    await runXrayCheck();
    await runNftCheck();
    await runSectionsCheck();
    await runFakeIPCheck();
  } catch (error) {
    logger.error('[DIAGNOSTIC]', 'runChecks - e', error);
  } finally {
    store.set({ diagnosticsRunAction: { loading: false } });
  }
}
function onPageUnmount() {
  store.unsubscribe(onStoreUpdate);
  store.reset([
    'diagnosticsActions',
    'diagnosticsSystemInfo',
    'diagnosticsChecks',
    'diagnosticsRunAction',
  ]);
}
function onPageMount() {
  onPageUnmount();
  store.subscribe(onStoreUpdate);
  renderDiagnosticsChecks();
  renderDiagnosticRunActionWidget();
  renderDiagnosticAvailableActionsWidget();
  renderDiagnosticSystemInfoWidget();
  renderWiki();
  void fetchServicesInfo();
  void fetchSystemInfo();
}
export async function initController(): Promise<void> {
  onMount('diagnostic-status').then(() => {
    onPageMount();
    store.subscribe((next, prev, diff) => {
      if (
        diff.tabService &&
        next.tabService.current !== prev.tabService.current
      ) {
        if (next.tabService.current === 'diagnostic') onPageMount();
        else onPageUnmount();
      }
    });
  });
}
