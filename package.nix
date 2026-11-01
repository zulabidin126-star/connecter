{ pkgs ? import <nixpkgs> {} }:

let
  src = ./.;
in
pkgs.stdenv.mkDerivation rec {
  pname = "lok-sync";
  version = "0.1.0";

  inherit src;

  nativeBuildInputs = with pkgs; [
    makeWrapper
    pkg-config
  ];

  buildInputs = with pkgs; [
    gtk3
    webkitgtk_4_1
    glib
    libsoup_3
    dbus
    openssl
    vulkan-loader
  ];

  dontBuild = true;

  installPhase = ''
    mkdir -p $out/bin
    mkdir -p $out/lib/systemd/user
    mkdir -p $out/share/applications

    # Install executables
    cp target/release/lok-sync-d $out/bin/lok-sync-d
    cp target/release/lok-sync $out/bin/lok-sync
    cp target/release/lok-sync-gui $out/bin/lok-sync-gui
    chmod +x $out/bin/lok-sync-d $out/bin/lok-sync $out/bin/lok-sync-gui
    ln -s $out/bin/lok-sync $out/bin/loksync

    # Install systemd user service units
    cp dist/systemd/lok-sync.service $out/lib/systemd/user/
    cp dist/systemd/lok-sync.slice $out/lib/systemd/user/
    cp dist/systemd/lok-sync-gui.service $out/lib/systemd/user/

    # Fix systemd unit paths to point to this derivation in /nix/store
    substituteInPlace $out/lib/systemd/user/lok-sync.service \
      --replace-fail "%h/.local/bin/lok-sync-d" "$out/bin/lok-sync-d"

    substituteInPlace $out/lib/systemd/user/lok-sync-gui.service \
      --replace-fail "%h/.local/bin/lok-sync-gui" "$out/bin/lok-sync-gui"

    # Install desktop launcher
    cp dist/desktop/lok-sync-gui.desktop $out/share/applications/

    # Wrap GUI with required runtime graphical & webkit libraries
    wrapProgram $out/bin/lok-sync-gui \
      --prefix LD_LIBRARY_PATH : ${pkgs.lib.makeLibraryPath buildInputs}
  '';

  meta = with pkgs.lib; {
    description = "Ultra-lightweight local phone <-> Linux bridge (KDE Connect & LocalSend alternative)";
    homepage = "https://github.com/loksync/loksync";
    license = licenses.mit;
    platforms = platforms.linux;
  };
}
