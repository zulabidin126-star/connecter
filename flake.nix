{
  description = "LokSync Nix Flake Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Rust toolchain
            cargo
            rustc
            rustfmt
            clippy
            
            # Node.js & npm for frontend UI build
            nodejs

            # Tauri dependencies / GTK / WebKitGTK
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
            echo "Node version: $(node -v)"
            echo "npm version: $(npm -v)"
          '';
        };
      }
    );
}