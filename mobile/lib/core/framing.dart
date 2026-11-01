import 'dart:typed_data';

/// Outer 2-byte big-endian framing matching `lok-proto/src/frame.rs`.
class LokFraming {
  static const int maxFrameSize = 65000;

  /// Encodes raw payload into a 2-byte big-endian length-prefixed frame.
  static Uint8List encode(Uint8List payload) {
    if (payload.length > maxFrameSize) {
      throw Exception('Payload exceeds max frame size: ${payload.length} > $maxFrameSize');
    }
    final len = payload.length;
    final bdata = ByteData(2 + len);
    bdata.setUint16(0, len, Endian.big);
    final result = bdata.buffer.asUint8List();
    result.setRange(2, 2 + len, payload);
    return result;
  }
}

/// Accumulator for assembling full frames from chunked TCP stream data.
class FrameAccumulator {
  final BytesBuilder _buffer = BytesBuilder(copy: false);

  void addBytes(Uint8List data) {
    _buffer.add(data);
  }

  /// Drains and returns the next complete frame body if available.
  Uint8List? nextFrame() {
    final bytes = _buffer.toBytes();
    if (bytes.length < 2) return null;

    final view = ByteData.sublistView(bytes);
    final frameLen = view.getUint16(0, Endian.big);
    final totalLen = 2 + frameLen;

    if (bytes.length < totalLen) {
      // Need more bytes from network
      return null;
    }

    final frameBody = bytes.sublist(2, totalLen);
    _buffer.clear();
    if (bytes.length > totalLen) {
      _buffer.add(bytes.sublist(totalLen));
    }
    return frameBody;
  }
}
