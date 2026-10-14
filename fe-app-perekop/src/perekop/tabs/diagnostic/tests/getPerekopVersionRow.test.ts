import { describe, expect, it } from 'vitest';
import { getPerekopVersionRow } from '../helpers/getPerekopVersionRow';
import type { StoreType } from '../../../services/store.service';

function makeDiagnosticsSystemInfo(
  patch: Partial<StoreType['diagnosticsSystemInfo']> = {},
): StoreType['diagnosticsSystemInfo'] {
  return {
    loading: false,
    perekop_version: '1.2.3',
    perekop_latest_version: '1.2.3',
    luci_app_version: '1.0.0',
    xray_version: '25.1.30',
    openwrt_version: 'OpenWrt 25.12',
    device_model: 'Test Router',
    ...patch,
  };
}

describe('getPerekopVersionRow', () => {
  it('returns Latest when versions differ only by leading v', () => {
    const row = getPerekopVersionRow(
      makeDiagnosticsSystemInfo({
        perekop_version: 'v1.2.3',
        perekop_latest_version: '1.2.3',
      }),
    );

    expect(row).toEqual({
      key: 'Perekop',
      value: 'v1.2.3',
      tag: {
        label: 'Latest',
        kind: 'success',
      },
    });
  });

  it('returns Outdated when versions differ', () => {
    const row = getPerekopVersionRow(
      makeDiagnosticsSystemInfo({
        perekop_version: '1.2.2',
        perekop_latest_version: '1.2.3',
      }),
    );

    expect(row).toEqual({
      key: 'Perekop',
      value: '1.2.2',
      tag: {
        label: 'Outdated',
        kind: 'warning',
      },
    });
  });

  it('returns plain row without tag for dev build', () => {
    const row = getPerekopVersionRow(
      makeDiagnosticsSystemInfo({
        perekop_version: 'COMPILED_VERSION',
      }),
    );

    expect(row).toEqual({
      key: 'Perekop',
      value: 'dev',
    });
  });
});
