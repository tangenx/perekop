import { Perekop } from '../../../types';

interface IRenderSectionsProps {
  loading: boolean;
  failed: boolean;
  section: Perekop.OutboundGroup;
  onChooseOutbound: (selector: string, tag: string) => void;
}

function renderFailedState() {
  return E(
    'div',
    { class: 'pdk_dashboard-page__outbound-section centered' },
    _('Dashboard currently unavailable'),
  );
}

function renderLoadingState() {
  return E(
    'div',
    {
      class: 'pdk_dashboard-page__outbound-section skeleton',
      style: 'height: 128px',
    },
    '',
  );
}

export function renderDefaultState({
  section,
  onChooseOutbound,
}: IRenderSectionsProps) {
  function renderOutbound(outbound: Perekop.Outbound) {
    const control = section.withTagSelect
      ? E('input', {
          type: 'radio',
          name: `pdk-${section.code}`,
          value: outbound.code,
          checked: outbound.selected,
          onchange: (event: Event) =>
            onChooseOutbound(
              section.code,
              (event.target as HTMLInputElement).value,
            ),
        })
      : null;
    return E('div', { class: 'pdk_dashboard-page__outbound-grid__item' }, [
      ...(control ? [control] : []),
      E('span', {}, outbound.displayName),
    ]);
  }

  return E('div', { class: 'pdk_dashboard-page__outbound-section' }, [
    E(
      'div',
      { class: 'pdk_dashboard-page__outbound-section__title-section' },
      E('b', {}, section.displayName),
    ),
    E(
      'div',
      { class: 'pdk_dashboard-page__outbound-grid' },
      section.outbounds.map(renderOutbound),
    ),
  ]);
}

export function renderSections(props: IRenderSectionsProps) {
  if (props.failed) return renderFailedState();
  if (props.loading) return renderLoadingState();
  return renderDefaultState(props);
}
