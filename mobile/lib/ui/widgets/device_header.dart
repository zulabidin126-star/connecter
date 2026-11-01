import 'package:flutter/material.dart';
import '../../models/peer_device.dart';

class DeviceHeader extends StatelessWidget {
  final PeerDevice? device;
  final VoidCallback onSelectDevice;

  const DeviceHeader({
    super.key,
    required this.device,
    required this.onSelectDevice,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isConnected = device?.isOnline ?? false;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E24) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.06),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: isConnected
                      ? const Color(0xFF10B981).withOpacity(0.12)
                      : Colors.grey.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  Icons.laptop_chromebook,
                  color: isConnected ? const Color(0xFF10B981) : Colors.grey,
                  size: 26,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      device?.name ?? 'No Device Connected',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : const Color(0xFF211C19),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isConnected ? const Color(0xFF10B981) : Colors.grey,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          isConnected ? 'Connected • Local Wi-Fi' : 'Not Connected',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: isDark ? Colors.grey[400] : const Color(0xFF615A54),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: onSelectDevice,
                icon: const Icon(Icons.swap_horiz),
                tooltip: 'Switch or Pair Device',
                style: IconButton.styleFrom(
                  backgroundColor: isDark ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.04),
                ),
              ),
            ],
          ),
          if (isConnected && device != null) ...[
            const SizedBox(height: 14),
            const Divider(height: 1),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildInfoBadge(
                  icon: Icons.battery_charging_full,
                  label: '${device!.batteryPercent ?? 72}%',
                  sub: device!.isCharging == true ? 'Charging' : 'Discharging',
                  isDark: isDark,
                  color: const Color(0xFF10B981),
                ),
                _buildInfoBadge(
                  icon: Icons.wifi,
                  label: device!.ip,
                  sub: 'Port ${device!.port}',
                  isDark: isDark,
                  color: const Color(0xFF0284C7),
                ),
                _buildInfoBadge(
                  icon: Icons.shield_outlined,
                  label: 'Encrypted',
                  sub: 'SPAKE2/AEAD',
                  isDark: isDark,
                  color: const Color(0xFF8B5CF6),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoBadge({
    required IconData icon,
    required String label,
    required String sub,
    required bool isDark,
    required Color color,
  }) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 6),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: isDark ? Colors.white : const Color(0xFF211C19),
              ),
            ),
            Text(
              sub,
              style: TextStyle(
                fontSize: 10,
                color: isDark ? Colors.grey[500] : Colors.grey[600],
              ),
            ),
          ],
        ),
      ],
    );
  }
}
