class PeerDevice {
  final String id;
  final String name;
  final String ip;
  final int port;
  final bool isOnline;
  final int? batteryPercent;
  final bool? isCharging;
  final String deviceType;

  const PeerDevice({
    required this.id,
    required this.name,
    required this.ip,
    this.port = 7100,
    this.isOnline = true,
    this.batteryPercent,
    this.isCharging,
    this.deviceType = 'computer',
  });

  PeerDevice copyWith({
    String? id,
    String? name,
    String? ip,
    int? port,
    bool? isOnline,
    int? batteryPercent,
    bool? isCharging,
    String? deviceType,
  }) {
    return PeerDevice(
      id: id ?? this.id,
      name: name ?? this.name,
      ip: ip ?? this.ip,
      port: port ?? this.port,
      isOnline: isOnline ?? this.isOnline,
      batteryPercent: batteryPercent ?? this.batteryPercent,
      isCharging: isCharging ?? this.isCharging,
      deviceType: deviceType ?? this.deviceType,
    );
  }
}
