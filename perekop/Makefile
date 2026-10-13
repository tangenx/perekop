include $(TOPDIR)/rules.mk

PKG_NAME:=perekop

PKG_VERSION := $(if $(PEREKOP_VERSION),$(PEREKOP_VERSION),0.$(shell date +%d%m%Y))

PKG_RELEASE:=1

PKG_MAINTAINER:=tangenx <perekop@tangenx.dev>
PKG_LICENSE:=GPL-2.0-or-later

include $(INCLUDE_DIR)/package.mk

define Package/perekop
	SECTION:=net
	CATEGORY:=Network
	DEPENDS:=+xray-core +curl +jq +kmod-nft-tproxy +coreutils-base64 +bind-dig
	CONFLICTS:=https-dns-proxy nextdns luci-app-passwall luci-app-passwall2 podkop luci-app-podkop
	TITLE:=Domain routing app based on Xray
	URL:=https://github.com/tangenx/perekop
	PKGARCH:=all

define Package/perekop/description
	Domain routing via Xray. Use of VLESS, Shadowsocks, Trojan, SOCKS and Hysteria2 technologies. Based on Podkop (https://github.com/itdoginfo/podkop)
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/perekop/prerm
#!/bin/sh

grep -q "105 perekop" /etc/iproute2/rt_tables && sed -i "/105 perekop/d" /etc/iproute2/rt_tables

/etc/init.d/perekop stop

exit 0
endef

define Package/perekop/conffiles
/etc/config/perekop
endef

define Package/perekop/install
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/perekop $(1)/etc/init.d/perekop

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/perekop $(1)/etc/config/perekop

	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./files/usr/bin/perekop $(1)/usr/bin/perekop

	$(INSTALL_DIR) $(1)/usr/lib/perekop
	$(CP) ./files/usr/lib/* $(1)/usr/lib/perekop/

	sed -i -e 's/__COMPILED_VERSION_VARIABLE__/$(PKG_VERSION)/g' $(1)/usr/lib/perekop/constants.sh
endef

$(eval $(call BuildPackage,perekop))
