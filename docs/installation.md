---
layout: default
title: Установка
---

# Установка

Пакет собирается автоматически из исходного кода. Готовые пакеты — в [релизах](https://github.com/tangenx/perekop/releases).

Пакет написан на `ash`, файлы `perekop_*.ipk` и `luci-app-perekop_*.ipk` подходят для всех архитектур.

Тестировался на **ванильной** OpenWrt 24.10.

## Требования

- OpenWrt 24.10 или выше
- Минимум 25 МБ свободного места на overlay
- Устройства с флеш-памятью 16 МБ не поддерживаются
- Если `xray-core` ещё не установлен — минимум 40 МБ в `/overlay`

## Автоматическая установка и обновление

Вставьте в консоль роутера:

```sh
sh -c "$(wget -O - https://raw.githubusercontent.com/tangenx/perekop/main/install.sh)" -- --xray-latest
```

Если Perekop уже установлен, произойдёт обновление. Флаг `--xray-latest` устанавливает свежий бинарник Xray из XTLS (нужен для Hysteria2, Xray >= 26.1.13). Без флага скрипт спросит, ставить ли latest Xray.

## Ручная установка из пакетов

1. `opkg update` (или `apk update` на 25.12), чтобы установились зависимости.
2. Скачайте пакеты `perekop-*.ipk` и `luci-app-perekop-*.ipk` из релиза.
3. Установите: `opkg install <путь-до-пакета>` (первым `perekop`, потом `luci-app-perekop`).
4. Если нужен русский язык LuCI — дополнительно `luci-i18n-perekop-ru-*.ipk`.

На OpenWrt 25.12 (apk):

```sh
apk update
apk add --allow-untrusted <путь-до-пакета>
```

## После установки

1. Очистите кэш LuCI в браузере (см. «Сброс кэша»).
2. Проверьте конфигурацию в LuCI → Services → Perekop.
3. Убедитесь, что Dnsmasq настроен корректно (см. «Диагностика»).

## Сброс кэша браузера после обновления

LuCI-часть часто меняется — после обновления обязательно очистите кэш, иначе может что-то не работать. Кэш может не очищаться, если открыта ещё одна вкладка LuCI. Если не помогает — попробуйте режим инкогнито.

- **Chrome**: F12 → правая кнопка по кнопке обновления → «Отчистить кэш и жёсткая перезагрузка».
- **Firefox**: клик по «Не защищено» → «Удалить куки и данные сайта» → `Ctrl+R`.
- **Яндекс Браузер**: `Ctrl+H` → «Очистить историю» → оставить только «Файлы, сохранённые в кеше».

## Обновление

Та же команда, что и установка:

```sh
sh -c "$(wget -O - https://raw.githubusercontent.com/tangenx/perekop/main/install.sh)" -- --xray-latest
```

Скрипт сам обновит `perekop` и `luci-app-perekop`.

> **Важно при обновлении с версии < 0.7.0:** конфиг будет сброшен в дефолт, старый сохранится в `/etc/config/perekop-070` — потребуется настроить Perekop заново. Скрипт предупредит и попросит подтверждение.

Обновление Xray вручную (если нужно latest):

```sh
service perekop stop   # или /etc/init.d/xray stop
opkg update
opkg upgrade xray-core
service perekop start  # или /etc/init.d/xray start
```

После `opkg/apk upgrade xray-core` latest-бинарник будет перезаписан — запустите `install.sh --xray-latest` снова.

## Удаление

```sh
opkg remove luci-i18n-perekop-ru luci-app-perekop perekop
```

На apk-системах:

```sh
apk del luci-i18n-perekop-ru luci-app-perekop perekop
```

## Обновление OpenWrt

Перед обновлением OpenWrt остановите Perekop (из LuCI или):

```sh
service perekop stop
```

Если вы уже обновились без стопа и столкнулись с отсутствующим DNS:

```sh
service perekop stop

uci -q delete dhcp.@dnsmasq[0].server
uci add_list dhcp.@dnsmasq[0].server="8.8.8.8"
uci commit dhcp
service dnsmasq restart
ntpd -q -p ptbtime1.ptb.de

service perekop start
```

## Несовместимость

- **Podkop** несовместим: перед установкой удалите `podkop` и `luci-app-podkop` (`opkg remove podkop luci-app-podkop`).
- **GetDomains** несовместим — удалите скриптом из [domain-routing-openwrt](https://github.com/itdoginfo/domain-routing-openwrt) (`getdomains-uninstall.sh`).
- **https-dns-proxy** перезаписывает `/etc/config/dhcp` → конфликт. Установщик предложит удалить. Вручную:
  ```sh
  opkg remove --force-depends luci-app-https-dns-proxy https-dns-proxy luci-i18n-https-dns-proxy*
  ```
- **Legacy iptables** (`iptables-mod-extra`) мешает `tproxy` — удалите пакет.
