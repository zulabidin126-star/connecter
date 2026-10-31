use crate::gui_state::{AppViewModel, ConnectionStatus, Tab};
use crate::ipc_worker::{spawn_ipc_worker, IpcWorkerHandle, WorkerCommand, WorkerEvent};
use eframe::egui::{self, Color32, FontId, RichText, Rounding, Stroke, Vec2};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

const BG_OBSIDIAN: Color32 = Color32::from_rgb(17, 18, 25);
const PANEL_SURFACE: Color32 = Color32::from_rgb(24, 25, 37);
const CARD_SURFACE: Color32 = Color32::from_rgb(31, 33, 48);
const CARD_HOVER: Color32 = Color32::from_rgb(38, 41, 60);
const BORDER_SUBTLE: Color32 = Color32::from_rgb(46, 50, 75);
const ACCENT_PRIMARY: Color32 = Color32::from_rgb(122, 162, 247);
const COLOR_SUCCESS: Color32 = Color32::from_rgb(158, 206, 106);
const COLOR_WARNING: Color32 = Color32::from_rgb(224, 175, 104);
const COLOR_DANGER: Color32 = Color32::from_rgb(247, 118, 142);
const TEXT_PRIMARY: Color32 = Color32::from_rgb(192, 202, 245);
const TEXT_MUTED: Color32 = Color32::from_rgb(121, 130, 169);

pub struct LokSyncGuiApp {
    model: AppViewModel,
    worker: IpcWorkerHandle,
}

impl LokSyncGuiApp {
    pub fn new(cc: &eframe::CreationContext<'_>) -> Self {
        // Configure Custom Dark Theme Aesthetics
        let mut visuals = egui::Visuals::dark();
        visuals.panel_fill = BG_OBSIDIAN;
        visuals.window_fill = PANEL_SURFACE;
        visuals.extreme_bg_color = BG_OBSIDIAN;
        visuals.window_rounding = Rounding::same(12.0);
        visuals.widgets.noninteractive.bg_fill = CARD_SURFACE;
        visuals.widgets.noninteractive.rounding = Rounding::same(8.0);
        visuals.widgets.noninteractive.bg_stroke = Stroke::new(1.0_f32, BORDER_SUBTLE);
        visuals.widgets.inactive.bg_fill = CARD_SURFACE;
        visuals.widgets.inactive.rounding = Rounding::same(8.0);
        visuals.widgets.hovered.bg_fill = CARD_HOVER;
        visuals.widgets.hovered.rounding = Rounding::same(8.0);
        visuals.widgets.active.bg_fill = ACCENT_PRIMARY;
        visuals.widgets.active.rounding = Rounding::same(8.0);

        cc.egui_ctx.set_visuals(visuals);

        let worker = spawn_ipc_worker();

        Self {
            model: AppViewModel::default(),
            worker,
        }
    }

    fn poll_worker_events(&mut self) {
        while let Ok(evt) = self.worker.evt_rx.try_recv() {
            match evt {
                WorkerEvent::Connected => {
                    self.model.connection_status = ConnectionStatus::Connected;
                }
                WorkerEvent::Disconnected => {
                    self.model.connection_status = ConnectionStatus::Disconnected;
                }
                WorkerEvent::Snapshot(snap) => {
                    self.model.snapshot = Some(snap);
                }
                WorkerEvent::Battery { peer, percent, charging } => {
                    if let Some(ref mut snap) = self.model.snapshot {
                        for p in &mut snap.peers {
                            if p.id == peer {
                                p.battery = Some(lok_proto::ipc::PeerBattery {
                                    percent,
                                    charging,
                                    ts: SystemTime::now()
                                        .duration_since(UNIX_EPOCH)
                                        .map(|d| d.as_secs())
                                        .unwrap_or(0),
                                });
                            }
                        }
                    }
                }
                WorkerEvent::PeerOnline { peer, name } => {
                    if let Some(ref mut snap) = self.model.snapshot {
                        for p in &mut snap.peers {
                            if p.id == peer {
                                p.online = true;
                            }
                        }
                    }
                    self.model.set_toast(format!("Device '{name}' connected"));
                }
                WorkerEvent::PeerOffline { peer } => {
                    if let Some(ref mut snap) = self.model.snapshot {
                        for p in &mut snap.peers {
                            if p.id == peer {
                                p.online = false;
                            }
                        }
                    }
                }
                WorkerEvent::PairPin { pin, qr, expires_in_secs } => {
                    self.model.pairing_dialog.is_open = true;
                    self.model.pairing_dialog.pin = pin;
                    self.model.pairing_dialog.qr_data = qr;
                    self.model.pairing_dialog.started_at = Instant::now();
                    self.model.pairing_dialog.total_seconds = expires_in_secs;
                    self.model.pairing_dialog.status_message =
                        "Waiting for phone to scan QR or enter PIN...".into();
                }
                WorkerEvent::PairDone { peer: _peer, name } => {
                    self.model.pairing_dialog.is_open = false;
                    self.model.set_toast(format!("Successfully paired with {name}!"));
                    let _ = self.worker.cmd_tx.try_send(WorkerCommand::Refresh);
                }
                WorkerEvent::PairFailed { reason } => {
                    self.model.pairing_dialog.status_message = format!("Pairing failed: {reason}");
                }
                WorkerEvent::PairCancelled => {
                    self.model.pairing_dialog.is_open = false;
                }
                WorkerEvent::Toast(msg) => {
                    self.model.set_toast(msg);
                }
            }
        }
    }
}

impl eframe::App for LokSyncGuiApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        self.poll_worker_events();
        ctx.request_repaint_after(std::time::Duration::from_millis(500));

        // Toast message rendering
        if let Some((ref msg, time)) = self.model.toast_message {
            if time.elapsed().as_secs() > 4 {
                self.model.toast_message = None;
            } else {
                egui::TopBottomPanel::bottom("toast_panel")
                    .frame(
                        egui::Frame::none()
                            .fill(CARD_SURFACE)
                            .stroke(Stroke::new(1.0_f32, ACCENT_PRIMARY))
                            .rounding(Rounding::same(8.0))
                            .inner_margin(8.0),
                    )
                    .show(ctx, |ui| {
                        ui.horizontal(|ui| {
                            ui.label(RichText::new("ℹ ").color(ACCENT_PRIMARY).strong());
                            ui.label(RichText::new(msg).color(TEXT_PRIMARY));
                        });
                    });
            }
        }

        // Top Navigation & Header Panel
        egui::TopBottomPanel::top("top_bar")
            .frame(
                egui::Frame::none()
                    .fill(PANEL_SURFACE)
                    .stroke(Stroke::new(0.0_f32, Color32::TRANSPARENT))
                    .inner_margin(egui::Margin::symmetric(16.0, 12.0)),
            )
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    // App Logo & Title
                    ui.horizontal(|ui| {
                        ui.label(
                            RichText::new("󰄜")
                                .font(FontId::proportional(22.0))
                                .color(ACCENT_PRIMARY),
                        );
                        ui.heading(
                            RichText::new("LokSync")
                                .color(TEXT_PRIMARY)
                                .font(FontId::proportional(19.0))
                                .strong(),
                        );
                    });

                    ui.add_space(24.0);

                    // Tab Selector
                    ui.horizontal(|ui| {
                        render_tab_button(ui, &mut self.model.current_tab, Tab::Dashboard, "󰋜 Dashboard");
                        render_tab_button(
                            ui,
                            &mut self.model.current_tab,
                            Tab::Notifications,
                            &format!("󰂚 Notifications ({})", self.model.notifications.len()),
                        );
                        render_tab_button(ui, &mut self.model.current_tab, Tab::Settings, "󰒓 Settings");
                    });

                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        // Connection Status Pill
                        match self.model.connection_status {
                            ConnectionStatus::Connected => {
                                ui.label(
                                    RichText::new("● Daemon Active")
                                        .color(COLOR_SUCCESS)
                                        .font(FontId::proportional(12.0)),
                                );
                            }
                            ConnectionStatus::Connecting => {
                                ui.label(
                                    RichText::new("◌ Connecting...")
                                        .color(COLOR_WARNING)
                                        .font(FontId::proportional(12.0)),
                                );
                            }
                            ConnectionStatus::Disconnected => {
                                if ui
                                    .button(
                                        RichText::new("⟳ Reconnect")
                                            .color(COLOR_DANGER)
                                            .font(FontId::proportional(12.0)),
                                    )
                                    .clicked()
                                {
                                    let _ = self.worker.cmd_tx.try_send(WorkerCommand::Refresh);
                                }
                            }
                        }
                    });
                });
            });

        // Main Content Area
        egui::CentralPanel::default()
            .frame(
                egui::Frame::none()
                    .fill(BG_OBSIDIAN)
                    .inner_margin(egui::Margin::same(20.0)),
            )
            .show(ctx, |ui| match self.model.current_tab {
                Tab::Dashboard => render_dashboard_tab(ui, &mut self.model, &self.worker),
                Tab::Notifications => render_notifications_tab(ui, &mut self.model),
                Tab::Settings => render_settings_tab(ui, &mut self.model, &self.worker),
            });

        // Pairing Modal Dialog
        if self.model.pairing_dialog.is_open {
            render_pairing_modal(ctx, &mut self.model, &self.worker);
        }
    }
}

fn render_tab_button(ui: &mut egui::Ui, current_tab: &mut Tab, target_tab: Tab, label: &str) {
    let is_active = *current_tab == target_tab;
    let text = RichText::new(label).font(FontId::proportional(14.0)).color(if is_active {
        Color32::WHITE
    } else {
        TEXT_MUTED
    });

    let btn = egui::Button::new(text)
        .fill(if is_active {
            ACCENT_PRIMARY
        } else {
            Color32::TRANSPARENT
        })
        .rounding(Rounding::same(6.0))
        .stroke(Stroke::NONE);

    if ui.add(btn).clicked() {
        *current_tab = target_tab;
    }
}

fn render_dashboard_tab(ui: &mut egui::Ui, model: &mut AppViewModel, worker: &IpcWorkerHandle) {
    ui.vertical(|ui| {
        ui.label(RichText::new("System Overview").color(TEXT_MUTED).font(FontId::proportional(13.0)));
        ui.heading(RichText::new("Dashboard").color(TEXT_PRIMARY).font(FontId::proportional(22.0)).strong());
        ui.add_space(16.0);

        // Three Main Status Cards Grid
        ui.columns(3, |columns| {
            // Card 1: Laptop Battery
            columns[0].vertical(|ui| {
                render_card(ui, "Laptop Battery", |ui| {
                    if let Some(ref snap) = model.snapshot {
                        if let Some(bat) = snap.local_battery {
                            ui.horizontal(|ui| {
                                let (icon, color) = if bat.charging {
                                    ("󰂄", COLOR_SUCCESS)
                                } else if bat.percent <= 20 {
                                    ("󰂃", COLOR_DANGER)
                                } else {
                                    ("󰁹", ACCENT_PRIMARY)
                                };
                                ui.label(RichText::new(icon).font(FontId::proportional(32.0)).color(color));
                                ui.label(RichText::new(format!("{}%", bat.percent)).font(FontId::proportional(30.0)).strong().color(TEXT_PRIMARY));
                            });
                            ui.add_space(4.0);

                            // Battery Bar
                            let progress = (bat.percent as f32) / 100.0;
                            ui.add(egui::ProgressBar::new(progress).desired_height(8.0).show_percentage());

                            ui.add_space(6.0);
                            let status_text = if bat.charging { "⚡ Charging (AC Connected)" } else { "🔋 Discharging on Battery" };
                            ui.label(RichText::new(status_text).font(FontId::proportional(12.0)).color(TEXT_MUTED));
                        } else {
                            ui.label(RichText::new("No Battery Detected").color(TEXT_MUTED));
                            ui.label(RichText::new("Desktop / AC Power").font(FontId::proportional(12.0)).color(TEXT_MUTED));
                        }
                    } else {
                        ui.label(RichText::new("Reading sysfs...").color(TEXT_MUTED));
                    }
                });
            });

            // Card 2: Phone Battery & Device
            columns[1].vertical(|ui| {
                render_card(ui, "Connected Phone", |ui| {
                    let online_peer = model.snapshot.as_ref().and_then(|s| s.peers.iter().find(|p| p.online));

                    if let Some(peer) = online_peer {
                        ui.horizontal(|ui| {
                            ui.label(RichText::new("󰄜").font(FontId::proportional(32.0)).color(COLOR_SUCCESS));
                            ui.vertical(|ui| {
                                ui.label(RichText::new(&peer.name).font(FontId::proportional(16.0)).strong().color(TEXT_PRIMARY));
                                ui.label(RichText::new(format!("ID: {}", &peer.id[..peer.id.len().min(8)])).font(FontId::proportional(11.0)).color(TEXT_MUTED));
                            });
                        });
                        ui.add_space(8.0);

                        if let Some(bat) = peer.battery {
                            ui.horizontal(|ui| {
                                ui.label(RichText::new(format!("{}%", bat.percent)).font(FontId::proportional(22.0)).strong().color(TEXT_PRIMARY));
                                let charge_pill = if bat.charging { "⚡ Charging" } else { "Discharging" };
                                ui.label(RichText::new(charge_pill).font(FontId::proportional(11.0)).color(if bat.charging { COLOR_SUCCESS } else { TEXT_MUTED }));
                            });
                            ui.add(egui::ProgressBar::new((bat.percent as f32) / 100.0).desired_height(6.0));
                        } else {
                            ui.label(RichText::new("Battery data pending...").color(TEXT_MUTED));
                        }
                    } else {
                        ui.vertical_centered(|ui| {
                            ui.label(RichText::new("󰄜").font(FontId::proportional(28.0)).color(BORDER_SUBTLE));
                            ui.label(RichText::new("No Phone Connected").color(TEXT_MUTED).font(FontId::proportional(13.0)));
                            ui.add_space(8.0);
                            if ui.button(RichText::new("Pair Phone").color(Color32::WHITE)).clicked() {
                                let _ = worker.cmd_tx.try_send(WorkerCommand::PairStart);
                            }
                        });
                    }
                });
            });

            // Card 3: Security & Network
            columns[2].vertical(|ui| {
                render_card(ui, "Local Bridge Security", |ui| {
                    if let Some(ref snap) = model.snapshot {
                        ui.label(RichText::new(format!("Local ID: {}", snap.device_id)).font(FontId::monospace(13.0)).color(ACCENT_PRIMARY));
                        ui.label(RichText::new(format!("Device: {}", snap.device_name)).font(FontId::proportional(12.0)).color(TEXT_PRIMARY));
                        ui.add_space(6.0);
                        ui.label(RichText::new("🔒 AES-128-GCM + SPAKE2").font(FontId::proportional(12.0)).color(COLOR_SUCCESS));
                        ui.label(RichText::new("🌐 Local Wi-Fi (No Cloud)").font(FontId::proportional(12.0)).color(TEXT_MUTED));
                        ui.label(RichText::new(format!("👥 Paired Devices: {}", snap.peers.len())).font(FontId::proportional(12.0)).color(TEXT_MUTED));
                    } else {
                        ui.label(RichText::new("Connecting to daemon...").color(TEXT_MUTED));
                    }
                });
            });
        });

        ui.add_space(24.0);

        // Quick Actions & Paired Devices Section
        ui.label(RichText::new("Quick Actions").color(TEXT_PRIMARY).font(FontId::proportional(16.0)).strong());
        ui.add_space(8.0);

        ui.horizontal(|ui| {
            if ui.button(RichText::new("󰐕 Pair New Device").strong().color(Color32::WHITE)).clicked() {
                let _ = worker.cmd_tx.try_send(WorkerCommand::PairStart);
            }
            if ui.button(RichText::new("⟳ Refresh Daemon State")).clicked() {
                let _ = worker.cmd_tx.try_send(WorkerCommand::Refresh);
            }
        });

        ui.add_space(20.0);

        // Paired Peers Table Card
        render_card(ui, "Paired Peer Devices", |ui| {
            let peers = model.all_peers().to_vec();
            if peers.is_empty() {
                ui.label(RichText::new("No devices paired yet. Click 'Pair New Device' to generate a PIN.").color(TEXT_MUTED));
            } else {
                for peer in peers {
                    ui.horizontal(|ui| {
                        let status_dot = if peer.online { "●" } else { "○" };
                        let status_color = if peer.online { COLOR_SUCCESS } else { TEXT_MUTED };
                        ui.label(RichText::new(status_dot).color(status_color));
                        ui.label(RichText::new(&peer.name).strong().color(TEXT_PRIMARY));
                        ui.label(RichText::new(format!("[{}]", &peer.id[..peer.id.len().min(8)])).font(FontId::monospace(11.0)).color(TEXT_MUTED));

                        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                            if ui.button(RichText::new("Unpair").color(COLOR_DANGER).font(FontId::proportional(12.0))).clicked() {
                                let _ = worker.cmd_tx.try_send(WorkerCommand::Unpair(peer.id.clone()));
                            }
                        });
                    });
                    ui.separator();
                }
            }
        });
    });
}

fn render_notifications_tab(ui: &mut egui::Ui, model: &mut AppViewModel) {
    ui.vertical(|ui| {
        ui.horizontal(|ui| {
            ui.vertical(|ui| {
                ui.label(RichText::new("Live Feed").color(TEXT_MUTED).font(FontId::proportional(13.0)));
                ui.heading(RichText::new("Synced Notifications").color(TEXT_PRIMARY).font(FontId::proportional(22.0)).strong());
            });
            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                if !model.notifications.is_empty() && ui.button("Clear Feed").clicked() {
                    model.notifications.clear();
                }
            });
        });

        ui.add_space(16.0);

        if model.notifications.is_empty() {
            render_card(ui, "Notifications", |ui| {
                ui.vertical_centered(|ui| {
                    ui.add_space(20.0);
                    ui.label(RichText::new("󰂚").font(FontId::proportional(40.0)).color(BORDER_SUBTLE));
                    ui.add_space(8.0);
                    ui.label(RichText::new("All caught up!").font(FontId::proportional(16.0)).strong().color(TEXT_PRIMARY));
                    ui.label(RichText::new("Notifications pushed from your phone will stream here in real-time.").color(TEXT_MUTED));
                    ui.add_space(20.0);
                });
            });
        } else {
            // Search / filter bar
            ui.horizontal(|ui| {
                ui.label(RichText::new("🔍").color(TEXT_MUTED));
                ui.add(egui::TextEdit::singleline(&mut model.search_query).hint_text("Filter by app, title, or body..."));
                if !model.search_query.is_empty() && ui.small_button("✕").clicked() {
                    model.search_query.clear();
                }
            });
            ui.add_space(10.0);

            let query = model.search_query.to_lowercase();
            let filtered: Vec<_> = model
                .notifications
                .iter()
                .filter(|n| {
                    if query.is_empty() {
                        true
                    } else {
                        n.app.to_lowercase().contains(&query)
                            || n.title.to_lowercase().contains(&query)
                            || n.body.to_lowercase().contains(&query)
                    }
                })
                .collect();

            egui::ScrollArea::vertical().show(ui, |ui| {
                for notif in filtered {
                    egui::Frame::none()
                        .fill(CARD_SURFACE)
                        .stroke(Stroke::new(1.0_f32, BORDER_SUBTLE))
                        .rounding(Rounding::same(8.0))
                        .inner_margin(12.0)
                        .show(ui, |ui| {
                            ui.horizontal(|ui| {
                                // App badge
                                egui::Frame::none()
                                    .fill(ACCENT_PRIMARY)
                                    .rounding(Rounding::same(4.0))
                                    .inner_margin(egui::Margin::symmetric(6.0, 2.0))
                                    .show(ui, |ui| {
                                        ui.label(RichText::new(&notif.app).font(FontId::proportional(11.0)).color(Color32::BLACK).strong());
                                    });

                                ui.label(RichText::new(format!("via {}", notif.peer_name)).font(FontId::proportional(11.0)).color(TEXT_MUTED));

                                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                                    ui.label(RichText::new(&notif.time_str).font(FontId::proportional(11.0)).color(TEXT_MUTED));
                                });
                            });

                            ui.add_space(4.0);
                            ui.label(RichText::new(&notif.title).font(FontId::proportional(14.0)).strong().color(TEXT_PRIMARY));
                            ui.label(RichText::new(&notif.body).font(FontId::proportional(13.0)).color(TEXT_MUTED));
                        });
                    ui.add_space(8.0);
                }
            });
        }
    });
}

fn render_settings_tab(ui: &mut egui::Ui, model: &mut AppViewModel, _worker: &IpcWorkerHandle) {
    ui.vertical(|ui| {
        ui.label(RichText::new("Preferences & Configuration").color(TEXT_MUTED).font(FontId::proportional(13.0)));
        ui.heading(RichText::new("Settings").color(TEXT_PRIMARY).font(FontId::proportional(22.0)).strong());
        ui.add_space(16.0);

        render_card(ui, "Device Naming & Identity", |ui| {
            ui.horizontal(|ui| {
                ui.label("Advertised Name:");
                ui.add(egui::TextEdit::singleline(&mut model.settings.device_name));
            });
            ui.add_space(4.0);
            ui.label(RichText::new("This name is broadcast over mDNS (_loksync._tcp.local.) for phone peer discovery.").font(FontId::proportional(11.0)).color(TEXT_MUTED));
        });

        ui.add_space(12.0);

        render_card(ui, "System Integration", |ui| {
            ui.checkbox(&mut model.settings.autostart, "Start LokSync daemon on login (systemd user unit)");
            ui.add_space(4.0);
            ui.label(RichText::new("Runs 'lok-sync-d' automatically as a systemd user service within the resource-restricted slice.").font(FontId::proportional(11.0)).color(TEXT_MUTED));
        });

        ui.add_space(12.0);

        render_card(ui, "Notification Privacy & Hygiene", |ui| {
            ui.checkbox(&mut model.settings.plain_text_only, "Plain text only (strip HTML and markup)");
            ui.add_space(4.0);
            ui.checkbox(&mut model.settings.hide_body_when_locked, "Hide notification body when screen is locked");
            ui.add_space(4.0);
            ui.label(RichText::new("Rate Limit: 10 notifications per 10 seconds (prevents phone notification spam).").font(FontId::proportional(11.0)).color(TEXT_MUTED));
        });

        ui.add_space(12.0);

        render_card(ui, "End-to-End Encryption & Security Keys", |ui| {
            ui.horizontal(|ui| {
                ui.label("Identity Algorithm:");
                ui.label(RichText::new("Ed25519 (256-bit signatures)").strong().color(ACCENT_PRIMARY));
            });
            ui.horizontal(|ui| {
                ui.label("Key Exchange:");
                ui.label(RichText::new("X25519 + HKDF-SHA256").strong().color(ACCENT_PRIMARY));
            });
            ui.horizontal(|ui| {
                ui.label("Transport Cipher:");
                ui.label(RichText::new("AES-128-GCM (Zero-overhead implicit nonce)").strong().color(COLOR_SUCCESS));
            });
            ui.horizontal(|ui| {
                ui.label("Key Storage:");
                ui.label(RichText::new("$XDG_CONFIG_HOME/lok-sync/key.bin").font(FontId::monospace(11.0)).color(TEXT_MUTED));
            });
        });

        ui.add_space(12.0);

        render_card(ui, "Network & Discovery", |ui| {
            ui.horizontal(|ui| {
                ui.label("Daemon TCP Port:");
                ui.label(RichText::new(format!("{}", model.settings.port)).strong().color(ACCENT_PRIMARY));
            });
            ui.label(RichText::new("mDNS Service Type: _loksync._tcp.local.").font(FontId::monospace(11.0)).color(TEXT_MUTED));
            ui.label(RichText::new("Local Socket: $XDG_RUNTIME_DIR/lok-sync/ctl.sock").font(FontId::monospace(11.0)).color(TEXT_MUTED));
        });

        ui.add_space(12.0);

        render_card(ui, "Allow-listed Phone Commands", |ui| {
            ui.label(RichText::new("Only pre-approved commands can be triggered remotely:").font(FontId::proportional(12.0)).color(TEXT_MUTED));
            ui.add_space(4.0);
            ui.label("• lock-screen: loginctl lock-session");
            ui.label("• volume-up: wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+");
            ui.label("• play-pause: playerctl play-pause");
            ui.label("• suspend: systemctl suspend (confirmation required)");
        });
    });
}

fn render_card<F: FnOnce(&mut egui::Ui)>(ui: &mut egui::Ui, title: &str, add_contents: F) {
    egui::Frame::none()
        .fill(PANEL_SURFACE)
        .stroke(Stroke::new(1.0_f32, BORDER_SUBTLE))
        .rounding(Rounding::same(10.0))
        .inner_margin(16.0)
        .show(ui, |ui| {
            ui.label(RichText::new(title).font(FontId::proportional(14.0)).strong().color(TEXT_PRIMARY));
            ui.add_space(8.0);
            add_contents(ui);
        });
}

fn render_pairing_modal(ctx: &egui::Context, model: &mut AppViewModel, worker: &IpcWorkerHandle) {
    egui::Window::new("Device Pairing")
        .collapsible(false)
        .resizable(false)
        .anchor(egui::Align2::CENTER_CENTER, Vec2::ZERO)
        .frame(
            egui::Frame::none()
                .fill(PANEL_SURFACE)
                .stroke(Stroke::new(2.0_f32, ACCENT_PRIMARY))
                .rounding(Rounding::same(12.0))
                .inner_margin(24.0),
        )
        .show(ctx, |ui| {
            ui.set_width(380.0);
            ui.vertical_centered(|ui| {
                ui.heading(RichText::new("Pair Mobile Device").color(TEXT_PRIMARY).strong());
                ui.add_space(4.0);
                ui.label(RichText::new("Enter this 6-digit PIN in your mobile app:").color(TEXT_MUTED));

                ui.add_space(16.0);

                // Huge Glowing PIN Display
                egui::Frame::none()
                    .fill(BG_OBSIDIAN)
                    .stroke(Stroke::new(1.5_f32, ACCENT_PRIMARY))
                    .rounding(Rounding::same(8.0))
                    .inner_margin(egui::Margin::symmetric(24.0, 12.0))
                    .show(ui, |ui| {
                        ui.label(
                            RichText::new(&model.pairing_dialog.pin)
                                .font(FontId::monospace(36.0))
                                .strong()
                                .color(Color32::WHITE),
                        );
                    });

                ui.add_space(16.0);

                // Expiration progress countdown
                let elapsed = model.pairing_dialog.started_at.elapsed().as_secs();
                let remaining = model.pairing_dialog.total_seconds.saturating_sub(elapsed);
                let progress = (remaining as f32) / (model.pairing_dialog.total_seconds as f32);

                ui.add(egui::ProgressBar::new(progress).desired_height(6.0));
                ui.add_space(4.0);
                ui.label(RichText::new(format!("Window closes in {}s", remaining)).font(FontId::proportional(12.0)).color(TEXT_MUTED));

                ui.add_space(8.0);
                ui.label(RichText::new(&model.pairing_dialog.status_message).font(FontId::proportional(12.0)).color(COLOR_WARNING));

                ui.add_space(16.0);
                if ui.button(RichText::new("Cancel Pairing").color(COLOR_DANGER)).clicked() || remaining == 0 {
                    let _ = worker.cmd_tx.try_send(WorkerCommand::PairCancel);
                    model.pairing_dialog.is_open = false;
                }
            });
        });
}
