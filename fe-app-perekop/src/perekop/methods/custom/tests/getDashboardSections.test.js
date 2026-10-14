import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDashboardSections } from '../getDashboardSections';
import { getConfigSections } from '../getConfigSections';
import { PerekopShellMethods } from '../../shell';

vi.mock('../getConfigSections', () => ({ getConfigSections: vi.fn() }));
vi.mock('../../../../helpers', async () => ({
  getProxyUrlName: (await import('../../../../helpers/getProxyUrlName'))
    .getProxyUrlName,
  splitProxyString: (await import('../../../../helpers/splitProxyString'))
    .splitProxyString,
}));
vi.mock('../../shell', () => ({
  PerekopShellMethods: { getXrayProxies: vi.fn() },
}));

function mockUrlTest(section, outbounds, selected = '') {
  getConfigSections.mockResolvedValue([section]);
  PerekopShellMethods.getXrayProxies.mockResolvedValue({
    success: true,
    data: { main: { outbounds, selected } },
  });
}

describe('getDashboardSections, Xray groups', () => {
  beforeEach(() => vi.clearAllMocks());
  it('names proxy and fallback links in order', async () => {
    mockUrlTest(
      {
        '.name': 'main',
        connection_type: 'proxy',
        proxy_config_type: 'urltest',
        urltest_proxy_links: ['socks5://1.1.1.1:80#A', 'socks5://1.1.1.2:80#B'],
        urltest_fallback_links: ['socks5://1.1.1.3:80#Fallback'],
      },
      ['main-1-out', 'main-2-out', 'main-fallback-1-out'],
    );
    const result = await getDashboardSections();
    expect(result.data[0].outbounds.map((item) => item.displayName)).toEqual([
      'Auto',
      'A',
      'B',
      'Fallback',
    ]);
  });
  it('marks selected outbound', async () => {
    mockUrlTest(
      {
        '.name': 'main',
        connection_type: 'proxy',
        proxy_config_type: 'selector',
        selector_proxy_links: ['socks5://1.1.1.1:80#A'],
      },
      ['main-1-out'],
      'main-1-out',
    );
    const result = await getDashboardSections();
    expect(result.data[0].outbounds[1].selected).toBe(true);
  });
});
