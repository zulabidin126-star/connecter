PREFIX ?= /usr/local
DESTDIR ?=

.PHONY: all frontend build release test clean install uninstall

all: release

frontend:
	cd crates/lok-sync-gui/ui && npm run build

build: frontend
	cargo build

release: frontend
	cargo build --release

test:
	cargo test --workspace

clean:
	cargo clean

install: release
	install -d $(DESTDIR)$(PREFIX)/bin
	install -m 755 target/release/lok-sync-d $(DESTDIR)$(PREFIX)/bin/lok-sync-d
	install -m 755 target/release/lok-sync $(DESTDIR)$(PREFIX)/bin/lok-sync
	install -m 755 target/release/lok-sync-gui $(DESTDIR)$(PREFIX)/bin/lok-sync-gui
	ln -sf $(DESTDIR)$(PREFIX)/bin/lok-sync $(DESTDIR)$(PREFIX)/bin/loksync
	install -d $(DESTDIR)$(PREFIX)/lib/systemd/user
	install -m 644 dist/systemd/lok-sync.service $(DESTDIR)$(PREFIX)/lib/systemd/user/lok-sync.service
	install -m 644 dist/systemd/lok-sync.slice $(DESTDIR)$(PREFIX)/lib/systemd/user/lok-sync.slice
	install -m 644 dist/systemd/lok-sync-gui.service $(DESTDIR)$(PREFIX)/lib/systemd/user/lok-sync-gui.service
	install -d $(DESTDIR)$(PREFIX)/share/applications
	install -m 644 dist/desktop/lok-sync-gui.desktop $(DESTDIR)$(PREFIX)/share/applications/lok-sync-gui.desktop
	install -d $(DESTDIR)/etc/lok-sync
	install -m 644 dist/config.toml $(DESTDIR)/etc/lok-sync/config.toml

install-user: release
	install -d $(HOME)/.local/bin
	install -m 755 target/release/lok-sync-d $(HOME)/.local/bin/lok-sync-d
	install -m 755 target/release/lok-sync $(HOME)/.local/bin/lok-sync
	install -m 755 target/release/lok-sync-gui $(HOME)/.local/bin/lok-sync-gui
	ln -sf $(HOME)/.local/bin/lok-sync $(HOME)/.local/bin/loksync
	install -d $(HOME)/.config/systemd/user
	install -m 644 dist/systemd/lok-sync.service $(HOME)/.config/systemd/user/lok-sync.service
	install -m 644 dist/systemd/lok-sync.slice $(HOME)/.config/systemd/user/lok-sync.slice
	install -m 644 dist/systemd/lok-sync-gui.service $(HOME)/.config/systemd/user/lok-sync-gui.service
	install -d $(HOME)/.local/share/applications
	install -m 644 dist/desktop/lok-sync-gui.desktop $(HOME)/.local/share/applications/lok-sync-gui.desktop
	systemctl --user daemon-reload || true

uninstall-user:
	rm -f $(HOME)/.local/bin/lok-sync-d
	rm -f $(HOME)/.local/bin/lok-sync-gui
	rm -f $(HOME)/.config/systemd/user/lok-sync.service
	rm -f $(HOME)/.config/systemd/user/lok-sync.slice
	rm -f $(HOME)/.config/systemd/user/lok-sync-gui.service
	rm -f $(HOME)/.local/share/applications/lok-sync-gui.desktop
	systemctl --user daemon-reload || true

uninstall:
	rm -f $(DESTDIR)$(PREFIX)/bin/lok-sync-d
	rm -f $(DESTDIR)$(PREFIX)/bin/lok-sync-gui
	rm -f $(DESTDIR)$(PREFIX)/lib/systemd/user/lok-sync.service
	rm -f $(DESTDIR)$(PREFIX)/lib/systemd/user/lok-sync.slice
	rm -f $(DESTDIR)$(PREFIX)/lib/systemd/user/lok-sync-gui.service
	rm -f $(DESTDIR)$(PREFIX)/share/applications/lok-sync-gui.desktop
