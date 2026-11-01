import 'package:flutter/material.dart';
import '../../models/peer_device.dart';
import '../widgets/device_header.dart';
import '../widgets/kde_action_card.dart';

class HomeScreen extends StatefulWidget {
  final VoidCallback onToggleTheme;
  final bool isDark;

  const HomeScreen({
    super.key,
    required this.onToggleTheme,
    required this.isDark,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  PeerDevice? _connectedDevice = const PeerDevice(
    id: 'nixos-3eae2431',
    name: 'nixos',
    ip: '192.168.100.155',
    port: 7100,
    isOnline: true,
    batteryPercent: 72,
    isCharging: false,
    deviceType: 'computer',
  );

  bool _notificationSyncEnabled = true;
  String _lastSharedClipboard = 'https://github.com/loksync/loksync';

  void _showSendFileDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _buildSendFileSheet(),
    );
  }

  void _showClipboardDialog() {
    final textController = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          top: 20,
          left: 20,
          right: 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Send to Laptop',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Text(
              'Type or paste text to send to ${_connectedDevice?.name ?? "laptop"}',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: textController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Paste link, OTP code, or note here...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: () {
                    if (textController.text.trim().isNotEmpty) {
                      setState(() {
                        _lastSharedClipboard = textController.text.trim();
                      });
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('✔ Sent to laptop clipboard!'),
                          backgroundColor: Color(0xFF10B981),
                        ),
                      );
                    }
                  },
                  icon: const Icon(Icons.send, size: 16),
                  label: const Text('Send'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF211C19),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showMediaControlDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Multimedia Control',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Controlling media playback on ${_connectedDevice?.name ?? "laptop"}',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton.filledTonal(
                  onPressed: () {},
                  icon: const Icon(Icons.skip_previous),
                  iconSize: 28,
                ),
                const SizedBox(width: 20),
                IconButton.filled(
                  onPressed: () {},
                  icon: const Icon(Icons.play_arrow),
                  iconSize: 36,
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                  ),
                ),
                const SizedBox(width: 20),
                IconButton.filledTonal(
                  onPressed: () {},
                  icon: const Icon(Icons.skip_next),
                  iconSize: 28,
                ),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                const Icon(Icons.volume_down, size: 20),
                Expanded(
                  child: Slider(
                    value: 0.7,
                    activeColor: const Color(0xFF10B981),
                    onChanged: (val) {},
                  ),
                ),
                const Icon(Icons.volume_up, size: 20),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showDevicesSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Nearby Wi-Fi Devices',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            const Text(
              'Devices detected on your local network (192.168.100.x)',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0x1A10B981),
                child: Icon(Icons.laptop, color: Color(0xFF10B981)),
              ),
              title: const Text('nixos (Linux Host)', style: TextStyle(fontWeight: FontWeight.bold)),
              subtitle: const Text('192.168.100.155 • Port 7100'),
              trailing: const Chip(
                label: Text('Connected', style: TextStyle(fontSize: 11, color: Color(0xFF10B981))),
                backgroundColor: Color(0x1A10B981),
              ),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSendFileSheet() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Send to Laptop',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            'Transfer files directly over local Wi-Fi at maximum speed',
            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: _buildFileTypeButton(
                  icon: Icons.photo_library_outlined,
                  label: 'Photos & Videos',
                  color: Colors.pink,
                  onTap: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Opening Gallery...')),
                    );
                  },
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: _buildFileTypeButton(
                  icon: Icons.folder_open_outlined,
                  label: 'Files & Docs',
                  color: Colors.sky,
                  onTap: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Opening File Manager...')),
                    );
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFileTypeButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 10),
            Text(
              label,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.sync,
                color: Color(0xFF10B981),
                size: 20,
              ),
            ),
            const SizedBox(width: 10),
            const Text('LokSync'),
          ],
        ),
        actions: [
          IconButton(
            onPressed: widget.onToggleTheme,
            icon: Icon(isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined),
            tooltip: 'Toggle Theme',
          ),
          IconButton(
            onPressed: _showDevicesSheet,
            icon: const Icon(Icons.wifi_find_outlined),
            tooltip: 'Scan Wi-Fi Devices',
          ),
        ],
      ),
      body: ListView(
        children: [
          // 1. Device Header Status Card (KDE Connect style)
          DeviceHeader(
            device: _connectedDevice,
            onSelectDevice: _showDevicesSheet,
          ),

          const SizedBox(height: 12),

          // 2. Section Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
            child: Text(
              'PLUGINS & ACTIONS',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.1,
                color: isDark ? Colors.grey[500] : const Color(0xFF8B827A),
              ),
            ),
          ),

          // 3. Action Cards (KDE Connect Style)
          KdeActionCard(
            icon: Icons.upload_file_outlined,
            iconColor: const Color(0xFF0284C7),
            iconBgColor: const Color(0xFF0284C7).withOpacity(0.12),
            title: 'Send Files',
            subtitle: 'Share photos, videos, and documents to laptop',
            onTap: _showSendFileDialog,
          ),

          KdeActionCard(
            icon: Icons.content_paste_outlined,
            iconColor: const Color(0xFF10B981),
            iconBgColor: const Color(0xFF10B981).withOpacity(0.12),
            title: 'Send Clipboard',
            subtitle: 'Last synced: $_lastSharedClipboard',
            onTap: _showClipboardDialog,
          ),

          KdeActionCard(
            icon: Icons.play_circle_outline,
            iconColor: const Color(0xFF8B5CF6),
            iconBgColor: const Color(0xFF8B5CF6).withOpacity(0.12),
            title: 'Multimedia Control',
            subtitle: 'Control media playback on laptop remotely',
            onTap: _showMediaControlDialog,
          ),

          KdeActionCard(
            icon: Icons.notifications_active_outlined,
            iconColor: const Color(0xFFEC4899),
            iconBgColor: const Color(0xFFEC4899).withOpacity(0.12),
            title: 'Notification Mirroring',
            subtitle: _notificationSyncEnabled ? 'Mirroring phone alerts to laptop' : 'Disabled',
            onTap: () {
              setState(() {
                _notificationSyncEnabled = !_notificationSyncEnabled;
              });
            },
            trailing: Switch(
              value: _notificationSyncEnabled,
              activeColor: const Color(0xFF10B981),
              onChanged: (val) {
                setState(() {
                  _notificationSyncEnabled = val;
                });
              },
            ),
          ),

          KdeActionCard(
            icon: Icons.wifi_tethering,
            iconColor: const Color(0xFFF59E0B),
            iconBgColor: const Color(0xFFF59E0B).withOpacity(0.12),
            title: 'Wi-Fi Discovery',
            subtitle: 'Scan and pair devices without codes or PINs',
            onTap: _showDevicesSheet,
          ),

          const SizedBox(height: 30),
        ],
      ),
    );
  }
}
