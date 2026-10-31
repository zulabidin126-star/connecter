self: { config, lib, pkgs, ... }:
let
  cfg = config.services.lok-sync;
  tomlFormat = pkgs.formats.toml { };
in {
  options.services.lok-sync = {
    enable = lib.mkEnableOption "LokSync daemon";
    package = lib.mkOption {
      type = lib.types.package;
      default = self.packages.${pkgs.system}.default;
    };
    gui.tray = lib.mkEnableOption "LokSync tray icon";
    openFirewall = lib.mkOption { type = lib.types.bool; default = true; };
    port = lib.mkOption { type = lib.types.port; default = 47100; };
    settings = lib.mkOption {
      type = tomlFormat.type;
      default = { };
      description = "Contents of config.toml";
    };
  };

  config = lib.mkIf cfg.enable {
    environment.systemPackages = [ cfg.package ];
    environment.etc."lok-sync/config.toml".source =
      tomlFormat.generate "lok-sync.toml" (lib.recursiveUpdate { network.port = cfg.port; } cfg.settings);

    # Ship the user units and start them for every user session.
    systemd.packages = [ cfg.package ];
    systemd.user.services.lok-sync.wantedBy = [ "default.target" ];
    systemd.user.services.lok-sync-gui.wantedBy =
      lib.mkIf cfg.gui.tray [ "graphical-session.target" ];

    networking.firewall = lib.mkIf cfg.openFirewall {
      allowedTCPPorts = [ cfg.port ];
      allowedUDPPorts = [ 5353 ];   # mDNS
    };
  };
}
