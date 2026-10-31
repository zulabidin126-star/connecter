{
  description = "LokSync — local phone <-> Linux bridge";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    (flake-utils.lib.eachSystem [ "x86_64-linux" "aarch64-linux" ] (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        packages.default = pkgs.rustPlatform.buildRustPackage {
          pname = "lok-sync";
          version = "0.1.0";
          src = self;
          cargoLock.lockFile = ./Cargo.lock;
          cargoBuildFlags = [ "-p" "lok-sync-d" "-p" "lok-sync-gui" ];
          postInstall = ''
            install -Dm644 dist/systemd/lok-sync.service     $out/lib/systemd/user/lok-sync.service
            install -Dm644 dist/systemd/lok-sync.slice       $out/lib/systemd/user/lok-sync.slice
            install -Dm644 dist/systemd/lok-sync-gui.service $out/lib/systemd/user/lok-sync-gui.service
            install -Dm644 dist/desktop/lok-sync-gui.desktop $out/share/applications/lok-sync-gui.desktop
          '';
          meta = {
            description = "Ultra-lightweight local phone <-> Linux sync daemon & GUI";
            mainProgram = "lok-sync-gui";
            platforms = [ "x86_64-linux" "aarch64-linux" ];
          };
        };

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            cargo
            rustc
            clippy
            rustfmt
            pkg-config
            systemd
            dbus
            wayland
            libxkbcommon
            libglvnd
            xorg.libX11
            xorg.libXcursor
            xorg.libXrandr
            xorg.libXi
          ];
          LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath (with pkgs; [
            libglvnd
            wayland
            libxkbcommon
            xorg.libX11
            xorg.libXcursor
            xorg.libXrandr
            xorg.libXi
          ]);
        };
      })) // {
      nixosModules.default = import ./dist/nix/module.nix self;
    };
}
