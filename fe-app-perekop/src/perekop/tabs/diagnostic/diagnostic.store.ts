import {
  DIAGNOSTICS_CHECKS,
  DIAGNOSTICS_CHECKS_MAP,
} from './checks/contstants';
import { StoreType } from '../../services';

function checks(description: string, state: 'skipped') {
  return Object.values(DIAGNOSTICS_CHECKS).map((code) => ({
    code,
    title: DIAGNOSTICS_CHECKS_MAP[code].title,
    order: DIAGNOSTICS_CHECKS_MAP[code].order,
    description: _(description),
    items: [],
    state,
  }));
}

export const initialDiagnosticStore: Pick<
  StoreType,
  | 'diagnosticsChecks'
  | 'diagnosticsRunAction'
  | 'diagnosticsActions'
  | 'diagnosticsSystemInfo'
> = {
  diagnosticsSystemInfo: {
    loading: true,
    perekop_version: 'loading',
    perekop_latest_version: 'loading',
    luci_app_version: 'loading',
    xray_version: 'loading',
    openwrt_version: 'loading',
    device_model: 'loading',
  },
  diagnosticsActions: {
    restart: { loading: false },
    start: { loading: false },
    stop: { loading: false },
    enable: { loading: false },
    disable: { loading: false },
    globalCheck: { loading: false },
    viewLogs: { loading: false },
    showXrayConfig: { loading: false },
  },
  diagnosticsRunAction: { loading: false },
  diagnosticsChecks: checks('Not running', 'skipped'),
};

export const loadingDiagnosticsChecksStore: Pick<
  StoreType,
  'diagnosticsChecks'
> = {
  diagnosticsChecks: checks('Pending', 'skipped'),
};
