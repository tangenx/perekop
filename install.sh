#!/bin/sh
# shellcheck shell=dash

REPO="https://api.github.com/repos/tangenx/perekop/releases/latest"
DOWNLOAD_DIR="/tmp/perekop"
COUNT=3
XRAY_LATEST=0
[ "$1" = "--xray-latest" ] && XRAY_LATEST=1

# Cached flag to switch between ipk or apk package managers
PKG_IS_APK=0
command -v apk >/dev/null 2>&1 && PKG_IS_APK=1

rm -rf "$DOWNLOAD_DIR"
mkdir -p "$DOWNLOAD_DIR"

msg() {
    printf "\033[32;1m%s\033[0m\n" "$1"
}

pkg_is_installed () {
    local pkg_name="$1"

    if [ "$PKG_IS_APK" -eq 1 ]; then
        # grep -q should work without change based on example from documentation
        # apk list --installed --providers dnsmasq
        # <dnsmasq> dnsmasq-full-2.90-r3 x86_64 {feeds/base/package/network/services/dnsmasq} (GPL-2.0) [installed]
        apk list --installed | grep -q "$pkg_name"
    else
        opkg list-installed | grep -q "$pkg_name"
    fi
}

pkg_remove() {
    local pkg_name="$1"

    if [ "$PKG_IS_APK" -eq 1 ]; then
        # TODO: check --force-depends flag
        # Nothing here: https://openwrt.org/docs/guide-user/additional-software/opkg-to-apk-cheatsheet
        apk del "$pkg_name"
    else
        opkg remove --force-depends "$pkg_name"
    fi
}

pkg_list_update() {
    if [ "$PKG_IS_APK" -eq 1 ]; then
        apk update
    else
        opkg update
    fi
}

pkg_install() {
    local pkg_file="$1"

    if [ "$PKG_IS_APK" -eq 1 ]; then
        # Can't install without flag based on info from documentation
        # If you're installing a non-standard (self-built) package, use the --allow-untrusted option:
        apk add --allow-untrusted "$pkg_file"
    else
        opkg install "$pkg_file"
    fi
}

update_config() {
    printf "\033[48;5;196m\033[1m╔══════════════════════════════════════════════════════════════════════╗\033[0m\n"
    printf "\033[48;5;196m\033[1m║ ! Обнаружена старая версия perekop.                                   ║\033[0m\n"
    printf "\033[48;5;196m\033[1m║ Если продолжите обновление, вам потребуется настроить Perekop заново. ║\033[0m\n"
    printf "\033[48;5;196m\033[1m║ Старая конфигурация будет сохранена в /etc/config/perekop-070         ║\033[0m\n"
    printf "\033[48;5;196m\033[1m║ Подробности: https://github.com/tangenx/perekop                     ║\033[0m\n"
    printf "\033[48;5;196m\033[1m║ Точно хотите продолжить?                                             ║\033[0m\n"
    printf "\033[48;5;196m\033[1m╚══════════════════════════════════════════════════════════════════════╝\033[0m\n"

    echo ""

    printf "\033[48;5;196m\033[1m╔══════════════════════════════════════════════════════════════════════╗\033[0m\n"
    printf "\033[48;5;196m\033[1m║ ! Detected old perekop version.                                       ║\033[0m\n"
    printf "\033[48;5;196m\033[1m║ If you continue the update, you will need to RECONFIGURE perekop.     ║\033[0m\n"
    printf "\033[48;5;196m\033[1m║ Your old configuration will be saved to /etc/config/perekop-070       ║\033[0m\n"
    printf "\033[48;5;196m\033[1m║ Details: https://github.com/tangenx/perekop                         ║\033[0m\n"
    printf "\033[48;5;196m\033[1m║ Are you sure you want to continue?                                   ║\033[0m\n"
    printf "\033[48;5;196m\033[1m╚══════════════════════════════════════════════════════════════════════╝\033[0m\n"

    msg "Continue? (yes/no)"

    while true; do
            read -r -p '' CONFIG_UPDATE
            case $CONFIG_UPDATE in

            yes|y|Y)
                mv /etc/config/perekop /etc/config/perekop-070
                wget -O /etc/config/perekop https://raw.githubusercontent.com/tangenx/perekop/refs/heads/main/perekop/files/etc/config/perekop
                msg "Perekop config has been reset to default. Your old config saved in /etc/config/perekop-070"
                break
                ;;
            *)
                msg "Exit"
                exit 1
                ;;
        esac
    done
}

main() {
    check_system
    xray_core

    /usr/sbin/ntpd -q -p 194.190.168.1 -p 216.239.35.0 -p 216.239.35.4 -p 162.159.200.1 -p 162.159.200.123

    pkg_list_update || { echo "Packages list update failed"; exit 1; }

    if [ -f "/etc/init.d/perekop" ]; then
        msg "Perekop is already installed. Upgrading..."
    else
        msg "Installing perekop..."
    fi
    if command -v curl >/dev/null 2>&1; then
        check_response=$(curl -s "https://api.github.com/repos/tangenx/perekop/releases/latest")

        if echo "$check_response" | grep -q 'API rate limit '; then
            msg "You've reached the GitHub rate limit. Repeat in five minutes."
            exit 1
        fi
    fi

    local grep_url_pattern
    if [ "$PKG_IS_APK" -eq 1 ]; then
        grep_url_pattern='https://[^"[:space:]]*\.apk'
    else
        grep_url_pattern='https://[^"[:space:]]*\.ipk'
    fi

    wget -qO- "$REPO" | grep -o "$grep_url_pattern" | while read -r url; do
        filename=$(basename "$url")
        filepath="$DOWNLOAD_DIR/$filename"

        attempt=0
        while [ $attempt -lt $COUNT ]; do
            msg "Download $filename (count $((attempt+1)))..."
            if wget -q -O "$filepath" "$url"; then
                if [ -s "$filepath" ]; then
                    msg "$filename successfully downloaded"
                    break
                fi
            fi
            msg "Download error for $filename. Retrying..."
            rm -f "$filepath"
            attempt=$((attempt+1))
        done

        if [ $attempt -eq $COUNT ]; then
            msg "Failed to download $filename after $COUNT attempts"
        fi
    done

    # Check if any files were downloaded
    if ! ls "$DOWNLOAD_DIR"/*perekop* >/dev/null 2>&1; then
        msg "No packages were downloaded successfully"
        exit 1
    fi

    for pkg in perekop luci-app-perekop; do
        file=""
        for f in "$DOWNLOAD_DIR"/"$pkg"*; do
            if [ -f "$f" ]; then
                file=$(basename "$f")
                break
            fi
        done
        if [ -n "$file" ]; then
            msg "Installing $file..."
            pkg_install "$DOWNLOAD_DIR/$file"
            sleep 3
        fi
    done

    xray_latest
    ru=""
    for f in "$DOWNLOAD_DIR"/luci-i18n-perekop-ru*; do
        if [ -f "$f" ]; then
            ru=$(basename "$f")
            break
        fi
    done
    if [ -n "$ru" ]; then
        if pkg_is_installed luci-i18n-perekop-ru; then
            msg "Upgrading Russian translation..."
            pkg_remove luci-i18n-perekop*
            pkg_install "$DOWNLOAD_DIR/$ru"
        else
            msg "Русский язык интерфейса ставим? y/n (Install the Russian interface language?)"
            while true; do
                read -r RUS
                case $RUS in
                    y) pkg_remove luci-i18n-perekop*; pkg_install "$DOWNLOAD_DIR/$ru"; break ;;
                    n) break ;;
                    *) echo "Введите y или n" ;;
                esac
            done
        fi
    fi


    find "$DOWNLOAD_DIR" -type f -name '*perekop*' -exec rm {} \;
}

check_system() {
    # Get router model
    MODEL=$(cat /tmp/sysinfo/model)
    msg "Router model: $MODEL"

    # Check OpenWrt version
    openwrt_version=$(cat /etc/openwrt_release | grep DISTRIB_RELEASE | cut -d"'" -f2 | cut -d'.' -f1)
    if [ "$openwrt_version" = "23" ]; then
        msg "OpenWrt 23.05 не поддерживается начиная с perekop 0.5.0"
        msg "Для OpenWrt 23.05 используйте perekop версии 0.4.11 или устанавливайте зависимости и perekop вручную"
        msg "Подробности: https://github.com/tangenx/perekop"
        exit 1
    fi

    # Check available space
    AVAILABLE_SPACE=$(df /overlay | awk 'NR==2 {print $4}')
    REQUIRED_SPACE=15360 # 15MB in KB

    if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
        msg "Error: Insufficient space in flash"
        msg "Available: $((AVAILABLE_SPACE/1024))MB"
        msg "Required: $((REQUIRED_SPACE/1024))MB"
        exit 1
    fi

    if ! nslookup google.com >/dev/null 2>&1; then
        msg "DNS is not working."
        exit 1
    fi

    # Check version
    if command -v perekop > /dev/null 2>&1; then
        local version
        version=$(/usr/bin/perekop show_version 2> /dev/null)
        if [ -n "$version" ]; then
            version=$(echo "$version" | sed 's/^v//')
            local major
            local minor
            local patch
            major=$(echo "$version" | cut -d. -f1)
            minor=$(echo "$version" | cut -d. -f2)
            patch=$(echo "$version" | cut -d. -f3)

            # Compare version: must be >= 0.7.0
            if [ "$major" -gt 0 ] ||
                [ "$major" -eq 0 ] && [ "$minor" -gt 7 ] ||
                [ "$major" -eq 0 ] && [ "$minor" -eq 7 ] && [ "$patch" -ge 0 ]; then
                msg "Perekop version >= 0.7.0"
                break
            else
                msg "Perekop version < 0.7.0"
                update_config
            fi
        else
            msg "Unknown perekop version"
            update_config
        fi
    fi

    if pkg_is_installed https-dns-proxy; then
        msg "Conflicting package detected: https-dns-proxy. Remove?"

        while true; do
                read -r -p '' DNSPROXY
                case $DNSPROXY in

                yes|y|Y)
                    pkg_remove luci-app-https-dns-proxy
                    pkg_remove https-dns-proxy
                    pkg_remove luci-i18n-https-dns-proxy*
                    break
                    ;;
                *)
                    msg "Exit"
                    exit 1
                    ;;
        esac
    done
    fi
}

xray_core() {
    # xray-core is managed by the OpenWrt package manager and is retained.
    if ! pkg_is_installed "^xray-core"; then
        msg "xray-core package is not installed; perekop will install it as a dependency."
    fi
}

xray_latest() {
    if [ "$XRAY_LATEST" -eq 0 ]; then
        msg "Install the latest Xray binary from XTLS releases (needed for Hysteria2, Xray >= 26.1.13)? y/n"
        read -r XRAY_ANSWER
        [ "$XRAY_ANSWER" = "y" ] || [ "$XRAY_ANSWER" = "Y" ] || return 0
    fi

    local arch asset url tmpdir
    if [ "$PKG_IS_APK" -eq 1 ]; then
        arch=$(apk print-arch 2>/dev/null | head -n 1)
    else
        arch=$(opkg print-architecture 2>/dev/null | awk '$1 == "arch" {print $2}' | tail -n 1)
    fi
    case "$arch" in
        x86_64) asset="Xray-linux-64.zip" ;;
        aarch64) asset="Xray-linux-arm64-v8a.zip" ;;
        arm_cortex-a7*|arm_cortex-a15*) asset="Xray-linux-arm32-v7a.zip" ;;
        mips*) msg "No official XTLS Xray binary matches $arch (24kc). Keeping stock xray-core."; return 0 ;;
        *) msg "Unsupported architecture $arch for XTLS Xray binary. Keeping stock xray-core."; return 0 ;;
    esac
    if ! command -v unzip >/dev/null 2>&1; then
        msg "unzip is required to install the Xray binary. Installing it..."
        pkg_list_update && pkg_install unzip || { msg "Cannot install unzip; keeping stock xray-core."; return 0; }
    fi
    url=$(wget -qO- https://api.github.com/repos/XTLS/Xray-core/releases/latest | grep -o "https:[^\" ]*/$asset" | head -n 1)
    [ -n "$url" ] || { msg "Could not find $asset in XTLS releases; keeping stock xray-core."; return 0; }
    msg "Downloading latest Xray ($asset)..."
    wget -qO /tmp/xray-latest.zip "$url" || { msg "Xray download failed; keeping stock xray-core."; return 0; }
    tmpdir=$(mktemp -d /tmp/xray-latest.XXXXXX)
    unzip -qo /tmp/xray-latest.zip -d "$tmpdir" || { rm -rf "$tmpdir"; msg "Xray archive extraction failed; keeping stock xray-core."; return 0; }
    [ -f "$tmpdir/xray" ] || { rm -rf "$tmpdir"; msg "Xray archive has no binary; keeping stock xray-core."; return 0; }
    [ -e /usr/bin/xray.opkg.bak ] || cp /usr/bin/xray /usr/bin/xray.opkg.bak
    cp "$tmpdir/xray" /usr/bin/xray && chmod +x /usr/bin/xray
    rm -rf "$tmpdir" /tmp/xray-latest.zip
    if [ -x /etc/init.d/xray ] && /etc/init.d/xray status >/dev/null 2>&1; then
        /etc/init.d/xray restart
    fi
    msg "Latest Xray installed. opkg/apk upgrade xray-core will overwrite this binary — run install.sh --xray-latest again."
}

main