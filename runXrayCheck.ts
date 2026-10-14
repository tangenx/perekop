import { DIAGNOSTICS_CHECKS_MAP } from './contstants';
import { PerekopShellMethods } from '../../../methods';
import { updateCheckStore } from './updateCheckStore';
import { getMeta } from '../helpers/getMeta';

export async function runXrayCheck() {
  const { order, title, code } = DIAGNOSTICS_CHECKS_MAP.XRAY;
  updateCheckStore({ order, code, title, description: _('Checking, please wait'), state: 'loading', items: [] });
  const xrayChecks = await PerekopShellMethods.checkXray();
  if (!xrayChecks.success) {
    updateCheckStore({ order, code, title, description: _('Cannot receive checks result'), state: 'error', items: [] });
    throw new Error('Xray checks failed');
  }
  const data = xrayChecks.data;
  const checks = [
    [data.xray_installed, _('Xray installed')],
    [data.xray_version_ok, _('Xray version is compatible (newer than 25.1.30)')],
    [data.xray_service_exist, _('Xray service exist')],
    [data.xray_autostart_disabled, _('Xray autostart disabled')],
    [data.xray_process_running, _('Xray process running')],
    [data.xray_ports_listening, _('Xray listening ports')],
  ] as const;
  const allGood = checks.every(([value]) => Boolean(value));
  const atLeastOneGood = checks.some(([value]) => Boolean(value));
  const { state, description } = getMeta({ atLeastOneGood, allGood });
  updateCheckStore({
    order,
    code,
    title,
    description,
    state,
    items: checks.map(([value, key]) => ({ state: value ? 'success' : 'error', key, value: '' })),
  });
  if (!atLeastOneGood || !data.xray_process_running) throw new Error('Xray checks failed');
}
