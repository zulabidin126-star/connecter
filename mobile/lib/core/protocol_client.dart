import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'constants.dart';
import 'framing.dart';

enum ConnectionStatus {
  disconnected,
  connecting,
  connected,
  failed,
}

class LaptopBatteryStatus {
  final int percent;
  final bool isCharging;

  const LaptopBatteryStatus({
    required this.percent,
    required this.isCharging,
  });
}

class ProtocolClient {
  Socket? _socket;
  final FrameAccumulator _accumulator = FrameAccumulator();
  Timer? _heartbeatTimer;

  final _statusController = StreamController<ConnectionStatus>.broadcast();
  final _batteryController = StreamController<LaptopBatteryStatus>.broadcast();
  final _incomingTextController = StreamController<String>.broadcast();

  Stream<ConnectionStatus> get statusStream => _statusController.stream;
  Stream<LaptopBatteryStatus> get batteryStream => _batteryController.stream;
  Stream<String> get incomingTextStream => _incomingTextController.stream;

  ConnectionStatus _currentStatus = ConnectionStatus.disconnected;
  ConnectionStatus get status => _currentStatus;

  Future<bool> connect(String host, int port) async {
    _updateStatus(ConnectionStatus.connecting);
    try {
      _socket = await Socket.connect(
        host,
        port,
        timeout: const Duration(seconds: 4),
      );

      // Disable Nagle's algorithm for instant line-speed latency
      _socket!.setOption(SocketOption.tcpNoDelay, true);

      _socket!.listen(
        _onDataReceived,
        onError: (err) {
          disconnect();
        },
        onDone: () {
          disconnect();
        },
      );

      _updateStatus(ConnectionStatus.connected);
      _startHeartbeat();
      return true;
    } catch (e) {
      _updateStatus(ConnectionStatus.failed);
      return false;
    }
  }

  void _onDataReceived(Uint8List data) {
    _accumulator.addBytes(data);
    while (true) {
      final frame = _accumulator.nextFrame();
      if (frame == null) break;
      _handleFrame(frame);
    }
  }

  void _handleFrame(Uint8List frame) {
    if (frame.isEmpty) return;
    final msgType = frame[0];
    final payload = frame.sublist(1);

    switch (msgType) {
      case LokConstants.typePong:
        // Heartbeat acknowledged
        break;

      case LokConstants.typeBatteryUpdate:
        if (payload.length >= 2) {
          final percent = payload[0];
          final charging = payload[1] == 1;
          _batteryController.add(LaptopBatteryStatus(
            percent: percent,
            isCharging: charging,
          ));
        }
        break;

      case LokConstants.typeNotifPost:
        try {
          final text = utf8.decode(payload, allowMalformed: true);
          _incomingTextController.add(text);
        } catch (_) {}
        break;

      default:
        break;
    }
  }

  /// Sends a raw frame body prefixed with 2-byte length.
  void sendFrame(int type, Uint8List body) {
    if (_socket == null || _currentStatus != ConnectionStatus.connected) return;

    final packet = Uint8List(1 + body.length);
    packet[0] = type;
    packet.setRange(1, packet.length, body);

    final wire = LokFraming.encode(packet);
    _socket!.add(wire);
  }

  /// Sends phone battery update to laptop.
  void sendBatteryUpdate(int percent, bool isCharging) {
    final payload = Uint8List(2);
    payload[0] = percent.clamp(0, 100);
    payload[1] = isCharging ? 1 : 0;
    sendFrame(LokConstants.typeBatteryUpdate, payload);
  }

  /// Sends shared clipboard or note to laptop.
  void sendClipboardText(String text) {
    final bytes = utf8.encode(text);
    sendFrame(LokConstants.typeNotifPost, Uint8List.fromList(bytes));
  }

  /// Sends multimedia playback command (play-pause, next, prev, volume-up, volume-down).
  void sendMediaCommand(String action) {
    final jsonCmd = jsonEncode({
      'action': action,
      'ts': DateTime.now().millisecondsSinceEpoch,
    });
    sendFrame(LokConstants.typeCmdRun, Uint8List.fromList(utf8.encode(jsonCmd)));
  }

  /// Sends a mirrored or test notification to the laptop desktop.
  void sendNotification(String title, String body, {String app = 'LokSync Mobile'}) {
    final notifJson = jsonEncode({
      'id': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      'app': app,
      'title': title,
      'body': body,
      'ts': DateTime.now().millisecondsSinceEpoch,
    });
    sendFrame(LokConstants.typeNotifPost, Uint8List.fromList(utf8.encode(notifJson)));
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      final nonce = ByteData(8)..setUint64(0, DateTime.now().millisecondsSinceEpoch);
      sendFrame(LokConstants.typePing, nonce.buffer.asUint8List());
    });
  }

  void disconnect() {
    _heartbeatTimer?.cancel();
    _socket?.destroy();
    _socket = null;
    _updateStatus(ConnectionStatus.disconnected);
  }

  void _updateStatus(ConnectionStatus newStatus) {
    _currentStatus = newStatus;
    _statusController.add(newStatus);
  }
}
