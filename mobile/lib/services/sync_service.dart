import 'dart:async';
import 'package:battery_plus/battery_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/protocol_client.dart';
import '../models/peer_device.dart';
import 'file_transfer_service.dart';

class SyncService extends ChangeNotifier {
  final ProtocolClient client = ProtocolClient();
  late final FileTransferService fileTransfer;
  final Battery _battery = Battery();

  PeerDevice? connectedDevice;
  bool isConnected = false;
  bool isConnecting = false;
  String? lastSentClipboard;
  TransferProgress? activeTransfer;

  StreamSubscription? _statusSub;
  StreamSubscription? _batterySub;
  StreamSubscription? _transferSub;

  String savedIp = '192.168.100.155';

  SyncService() {
    fileTransfer = FileTransferService(client);
    _initSubscriptions();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      savedIp = prefs.getString('last_host_ip') ?? '192.168.100.155';
      notifyListeners();
    } catch (_) {}
  }

  Future<void> saveIp(String ip) async {
    savedIp = ip.trim();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('last_host_ip', savedIp);
    } catch (_) {}
    notifyListeners();
  }

  void _initSubscriptions() {
    _statusSub = client.statusStream.listen((status) {
      isConnecting = status == ConnectionStatus.connecting;
      isConnected = status == ConnectionStatus.connected;
      if (status == ConnectionStatus.connected) {
        _syncLocalPhoneBattery();
      }
      notifyListeners();
    });

    _batterySub = client.batteryStream.listen((bat) {
      if (connectedDevice != null) {
        connectedDevice = connectedDevice!.copyWith(
          batteryPercent: bat.percent,
          isCharging: bat.isCharging,
        );
        notifyListeners();
      }
    });

    _transferSub = fileTransfer.progressStream.listen((progress) {
      activeTransfer = progress;
      notifyListeners();
    });
  }

  /// Connects to Linux laptop over local Wi-Fi.
  Future<bool> connect(String ip, [int port = 7100]) async {
    isConnecting = true;
    notifyListeners();

    await saveIp(ip);

    final success = await client.connect(ip.trim(), port);
    if (success) {
      connectedDevice = PeerDevice(
        id: 'nixos-host',
        name: 'nixos (Linux Host)',
        ip: ip.trim(),
        port: port,
        isOnline: true,
        batteryPercent: 72,
        isCharging: false,
      );
    }
    isConnecting = false;
    notifyListeners();
    return success;
  }

  /// Disconnects from active session.
  void disconnect() {
    client.disconnect();
    isConnected = false;
    isConnecting = false;
    connectedDevice = null;
    notifyListeners();
  }

  /// Sends text note or clipboard content to laptop.
  void sendClipboard(String text) {
    if (!isConnected || text.trim().isEmpty) return;
    client.sendClipboardText(text.trim());
    lastSentClipboard = text.trim();
    notifyListeners();
  }

  /// Streams selected files to laptop at full Wi-Fi line-speed.
  Future<void> sendFile(String filePath, String fileName) async {
    if (!isConnected) return;
    await fileTransfer.sendFile(filePath, fileName);
  }

  /// Clears active file transfer progress indicator.
  void clearActiveTransfer() {
    activeTransfer = null;
    notifyListeners();
  }

  /// Controls laptop multimedia playback.
  void mediaControl(String action) {
    if (!isConnected) return;
    client.sendMediaCommand(action);
  }

  /// Mirrors or sends a test notification to the desktop.
  void sendNotification(String title, String body, {String app = 'LokSync Mobile'}) {
    if (!isConnected) return;
    client.sendNotification(title, body, app: app);
  }

  Future<void> _syncLocalPhoneBattery() async {
    try {
      final level = await _battery.batteryLevel;
      final state = await _battery.batteryState;
      final isCharging = state == BatteryState.charging || state == BatteryState.full;
      client.sendBatteryUpdate(level, isCharging);
    } catch (_) {}
  }

  @override
  void dispose() {
    _statusSub?.cancel();
    _batterySub?.cancel();
    _transferSub?.cancel();
    client.disconnect();
    super.dispose();
  }
}
