{
  description = "LokSync - Ultra-lightweight phone <-> Linux bridge (KDE Connect & LocalSend alternative)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    let
      eachSystem = flake-utils.lib.eachDefaultSystem (system:
        let
          pkgs = import nixpkgs { inherit system; };
          lok-sync-pkg = pkgs.callPackage ./package.nix { inherit pkgs; };
        in
        {
          packages = {
            default = lok-sync-pkg;
            lok-sync = lok-sync-pkg;
          };

          apps = {
            default = {
              type = "app";
              program = "${lok-sync-pkg}/bin/lok-sync-gui";
            };
            gui = {
              type = "app";
              program = "${lok-sync-pkg}/bin/lok-sync-gui";
            };
            daemon = {
              type = "app";
              program = "${lok-sync-pkg}/bin/lok-sync-d";
            };
          };

          devShells.default = pkgs.mkShell {
            buildInputs = with pkgs; [
              cargo
              rustc
              rustfmt
              clippy
              nodejs
              webkitgtk_4_1
              gtk3
              glib
              libsoup_3
              pkg-config
              openssl
              dbus
              udev
              alsa-lib
              vulkan-loader
            ];

            shellHook = ''
              echo "✨ LokSync Nix Development Environment Loaded!"
            '';
          };
        }
      );
    in
    eachSystem // {
      nixosModules.default = import ./dist/nix/module.nix self;
      nixosModules.lok-sync = import ./dist/nix/module.nix self;
    };
}