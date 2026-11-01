class LokConstants {
  static const int defaultPort = 7100;
  static const String mdnsServiceType = '_loksync._tcp';
  static const String protocolVersion = '1.0';

  // Message Types matching lok-proto
  static const int typePing = 0x01;
  static const int typePong = 0x02;
  static const int typeBatteryUpdate = 0x10;
  static const int typeNotifPost = 0x20;
  static const int typeNotifDismiss = 0x21;
  static const int typeNotifAction = 0x22;
  static const int typeCmdRun = 0x30;
  static const int typeCmdResult = 0x31;
  static const int typeFileOffer = 0x40;
  static const int typeFileChunk = 0x41;
  static const int typeFileComplete = 0x42;
}
