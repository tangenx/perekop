import { normalizeCompiledVersion } from '../../../../helpers/normalizeCompiledVersion';
import { removeVersionPrefix } from '../../../../helpers/removeVersionPrefix';
import type { StoreType } from '../../../services/store.service';
import type { IRenderSystemInfoRow } from '../partials';

function isUnknownVersion(version?: string | null): boolean {
  return version === 'unknown' || version === _('unknown');
}

export function getPerekopVersionRow(
  diagnosticsSystemInfo: StoreType['diagnosticsSystemInfo'],
): IRenderSystemInfoRow {
  const loading = diagnosticsSystemInfo.loading;
  const unknown = isUnknownVersion(diagnosticsSystemInfo.perekop_version);
  const hasActualVersion =
    Boolean(diagnosticsSystemInfo.perekop_latest_version) &&
    !isUnknownVersion(diagnosticsSystemInfo.perekop_latest_version);
  const version = normalizeCompiledVersion(
    diagnosticsSystemInfo.perekop_version,
  );
  const isDevVersion = version === 'dev';

  if (loading || unknown || !hasActualVersion || isDevVersion) {
    return {
      key: 'Perekop',
      value: version,
    };
  }

  if (
    removeVersionPrefix(version) !==
    removeVersionPrefix(diagnosticsSystemInfo.perekop_latest_version)
  ) {
    return {
      key: 'Perekop',
      value: version,
      tag: {
        label: _('Outdated'),
        kind: 'warning',
      },
    };
  }

  return {
    key: 'Perekop',
    value: version,
    tag: {
      label: _('Latest'),
      kind: 'success',
    },
  };
}
