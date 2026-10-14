import { DIAGNOSTICS_CHECKS_MAP } from './contstants';
import { updateCheckStore } from './updateCheckStore';
import { getMeta } from '../helpers/getMeta';
import { getDashboardSections } from '../../../methods/custom/getDashboardSections';
import { IDiagnosticsChecksItem } from '../../../services';

export async function runSectionsCheck() {
  const { order, title, code } = DIAGNOSTICS_CHECKS_MAP.OUTBOUNDS;
  updateCheckStore({
    order,
    code,
    title,
    description: _('Checking, please wait'),
    state: 'loading',
    items: [],
  });
  const sections = await getDashboardSections();
  if (!sections.success) {
    updateCheckStore({
      order,
      code,
      title,
      description: _('Cannot receive checks result'),
      state: 'error',
      items: [],
    });
    throw new Error('Sections checks failed');
  }
  const items = sections.data.map(
    (section): IDiagnosticsChecksItem => ({
      state: section.outbounds.length ? 'success' : 'error',
      key: section.displayName,
      value: section.outbounds.length ? _('Available') : _('No outbounds'),
    }),
  );
  const allGood =
    items.length > 0 && items.every((item) => item.state === 'success');
  const atLeastOneGood = items.some((item) => item.state === 'success');
  const { state, description } = getMeta({ atLeastOneGood, allGood });
  updateCheckStore({ order, code, title, description, state, items });
  if (!atLeastOneGood) throw new Error('Sections checks failed');
}
