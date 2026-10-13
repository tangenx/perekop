include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-perekop

PKG_VERSION := $(if $(PEREKOP_VERSION),$(PEREKOP_VERSION),0.$(shell date +%d%m%Y))

PKG_RELEASE:=1

LUCI_TITLE:=LuCI perekop app
LUCI_DEPENDS:=+luci-base +perekop
LUCI_PKGARCH:=all
LUCI_LANG.ru:=Русский (Russian)
LUCI_LANG.en:=English

PKG_LICENSE:=GPL-2.0-or-later
PKG_MAINTAINER:=ITDog <perekop@itdog.info>

LUCI_LANGUAGES:=en ru

include $(TOPDIR)/feeds/luci/luci.mk

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)$(HTDOCS)
	$(CP) $(PKG_BUILD_DIR)/htdocs/* $(1)$(HTDOCS)/
	$(INSTALL_DIR) $(1)/
	$(CP) $(PKG_BUILD_DIR)/root/* $(1)/
	sed -i -e 's/__COMPILED_VERSION_VARIABLE__/$(PKG_VERSION)/g' $(1)$(HTDOCS)/luci-static/resources/view/perekop/main.js || true
endef

$(eval $(call BuildPackage,$(PKG_NAME)))