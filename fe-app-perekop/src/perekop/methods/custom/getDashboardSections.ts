import { getConfigSections } from './getConfigSections';
import { Perekop } from '../../types';
import { getProxyUrlName, splitProxyString } from '../../../helpers';
import { PerekopShellMethods } from '../shell';

interface IGetDashboardSectionsResponse {
  success: boolean;
  data: Perekop.OutboundGroup[];
}

export async function getDashboardSections(): Promise<IGetDashboardSectionsResponse> {
  const configSections = await getConfigSections();
  const proxiesResponse = await PerekopShellMethods.getXrayProxies();

  if (!proxiesResponse.success) return { success: false, data: [] };
  const proxies = proxiesResponse.data;
  const data = configSections
    .filter(
      (section) =>
        section.connection_type !== 'block' &&
        section.connection_type !== 'exclusion' &&
        section['.type'] !== 'settings',
    )
    .map((section) => {
      const name = section['.name'];
      const proxyGroup = proxies[name];
      const groupOutbound = (
        tag: string,
        displayName: string,
        selected: boolean,
      ): Perekop.Outbound => ({
        code: tag,
        displayName,
        type: '',
        selected,
      });

      if (section.connection_type === 'proxy') {
        if (
          section.proxy_config_type === 'selector' ||
          section.proxy_config_type === 'urltest'
        ) {
          const links =
            section.proxy_config_type === 'selector'
              ? (section.selector_proxy_links ?? [])
              : [
                  ...(section.urltest_proxy_links ?? []),
                  ...(section.urltest_fallback_links ?? []),
                ];
          const outbounds = links.map((link, index) => {
            const code = `${name}-${index + 1}-out`;
            return groupOutbound(
              code,
              getProxyUrlName(link) || code,
              proxyGroup?.selected === code,
            );
          });
          return {
            withTagSelect: true,
            code: name,
            displayName: name,
            outbounds: [
              groupOutbound('', _('Auto'), !proxyGroup?.selected),
              ...outbounds,
            ],
          };
        }

        const code = `${name}-out`;
        let displayName = code;
        if (section.proxy_config_type === 'url') {
          displayName =
            getProxyUrlName(splitProxyString(section.proxy_string)?.[0]) ||
            code;
        } else if (section.proxy_config_type === 'outbound') {
          const parsedOutbound = JSON.parse(section.outbound_json);
          displayName = parsedOutbound?.tag
            ? decodeURIComponent(parsedOutbound.tag)
            : code;
        }
        return {
          withTagSelect: false,
          code: name,
          displayName: name,
          outbounds: [groupOutbound(code, displayName, true)],
        };
      }

      if (section.connection_type === 'vpn') {
        const code = `${name}-out`;
        return {
          withTagSelect: false,
          code: name,
          displayName: name,
          outbounds: [groupOutbound(code, section.interface || code, true)],
        };
      }

      return {
        withTagSelect: false,
        code: name,
        displayName: name,
        outbounds: [],
      };
    });

  return { success: true, data };
}
