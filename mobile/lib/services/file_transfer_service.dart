import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import '../core/constants.dart';
import '../core/protocol_client.dart';

class TransferProgress {
  final String fileName;
  final int bytesSent;
  final int totalBytes;
  final double progressPercent;
  final double speedMBps;
  final bool isCompleted;

  const TransferProgress({
    required this.fileName,
    required this.bytesSent,
    required this.totalBytes,
    required this.progressPercent,
    required this.speedMBps,
    this.isCompleted = false,
  });
}

class FileTransferService {
  final ProtocolClient client;
  final _progressController = StreamController<TransferProgress>.broadcast();

  Stream<TransferProgress> get progressStream => _progressController.stream;

  FileTransferService(this.client);

  /// Streams a file to the laptop at full Wi-Fi line-rate.
  Future<bool> sendFile(String filePath, String fileName) async {
    final file = File(filePath);
    if (!await file.exists()) return false;

    final totalBytes = await file.length();
    int bytesSent = 0;
    final startTime = DateTime.now();

    // 1. Send File Offer Header
    final headerJson = jsonEncode({
      'name': fileName,
      'size': totalBytes,
      'ts': DateTime.now().millisecondsSinceEpoch,
    });
    client.sendFrame(LokConstants.typeFileOffer, Uint8List.fromList(utf8.encode(headerJson)));

    // 2. Stream chunks (60 KB each)
    const chunkSize = 60 * 1024;
    final stream = file.openRead();

    try {
      await for (final chunk in stream) {
        client.sendFrame(LokConstants.typeFileChunk, Uint8List.fromList(chunk));
        bytesSent += chunk.length;

        final elapsedSecs = DateTime.now().difference(startTime).inMilliseconds / 1000.0;
        final speedMBps = elapsedSecs > 0 ? (bytesSent / (1024 * 1024)) / elapsedSecs : 0.0;
        final percent = totalBytes > 0 ? (bytesSent / totalBytes) * 100.0 : 100.0;

        _progressController.add(TransferProgress(
          fileName: fileName,
          bytesSent: bytesSent,
          totalBytes: totalBytes,
          progressPercent: percent,
          speedMBps: speedMBps,
        ));
      }

      // 3. Send Complete
      client.sendFrame(LokConstants.typeFileComplete, Uint8List(0));
      _progressController.add(TransferProgress(
        fileName: fileName,
        bytesSent: totalBytes,
        totalBytes: totalBytes,
        progressPercent: 100.0,
        speedMBps: 0.0,
        isCompleted: true,
      ));
      return true;
    } catch (_) {
      return false;
    }
  }
}
