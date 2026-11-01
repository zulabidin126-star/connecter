import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import 'package:provider/provider.dart';
import '../../services/sync_service.dart';
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
  bool _notificationSyncEnabled = true;

  void _showConnectDialog(BuildContext context) {
    final sync = Provider.of<SyncService>(context, listen: false);
    final ipController = TextEditingController(text: sync.savedIp);
    final portController = TextEditingController(text: '7100');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          final isConnecting = sync.isConnecting;
          final isConnected = sync.isConnected;

          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              top: 24,
              left: 20,
              right: 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Wi-Fi Device Connection',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Connect directly to your Linux laptop over local Wi-Fi. No QR code or 6-digit PIN required.',
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
                const SizedBox(height: 18),

                if (isConnected) ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle, color: Color(0xFF10B981)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                sync.connectedDevice?.name ?? 'Connected Device',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              Text(
                                '${sync.connectedDevice?.ip ?? ''}:${sync.connectedDevice?.port ?? 7100} • Online',
                                style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                              ),
                            ],
                          ),
                        ),
                        ElevatedButton(
                          onPressed: () {
                            sync.disconnect();
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Disconnected from laptop')),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red.withOpacity(0.12),
                            foregroundColor: Colors.red,
                            elevation: 0,
                          ),
                          child: const Text('Disconnect'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                ] else ...[
                  // IP Input
                  TextField(
                    controller: ipController,
                    keyboardType: TextInputType.datetime,
                    decoration: InputDecoration(
                      labelText: 'Laptop Wi-Fi IP Address',
                      hintText: 'e.g. 192.168.100.155',
                      prefixIcon: const Icon(Icons.lan_outlined),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Port Input
                  TextField(
                    controller: portController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'Port',
                      hintText: '7100',
                      prefixIcon: const Icon(Icons.numbers_outlined),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Quick Suggestion Chip
                  Wrap(
                    spacing: 8,
                    children: [
                      ActionChip(
                        avatar: const Icon(Icons.history, size: 16),
                        label: const Text('Last: 192.168.100.155'),
                        onPressed: () {
                          ipController.text = '192.168.100.155';
                        },
                      ),
                      ActionChip(
                        avatar: const Icon(Icons.computer, size: 16),
                        label: const Text('Auto-Detect nixos'),
                        onPressed: () {
                          ipController.text = sync.savedIp;
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      onPressed: isConnecting
                          ? null
                          : () async {
                              final ip = ipController.text.trim();
                              final port = int.tryParse(portController.text.trim()) ?? 7100;
                              if (ip.isEmpty) return;

                              setSheetState(() {});
                              final ok = await sync.connect(ip, port);
                              setSheetState(() {});

                              if (context.mounted) {
                                Navigator.pop(ctx);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(ok
                                        ? '✔ Successfully connected to $ip:$port'
                                        : '✖ Could not connect to $ip:$port. Check that LokSync is running on laptop.'),
                                    backgroundColor: ok ? const Color(0xFF10B981) : Colors.red,
                                  ),
                                );
                              }
                            },
                      icon: isConnecting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.link),
                      label: Text(isConnecting ? 'Connecting...' : 'Connect to Laptop'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  void _showSendFileDialog(BuildContext context) {
    final sync = Provider.of<SyncService>(context, listen: false);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Send Files to Laptop',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Text(
              'High-speed chunked TCP streaming directly over Wi-Fi without cloud relay.',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: _buildFileTypeButton(
                    icon: Icons.photo_library_outlined,
                    label: 'Media',
                    subtitle: 'Photos / Videos',
                    color: Colors.pink,
                    onTap: () async {
                      Navigator.pop(ctx);
                      await _pickAndSendFiles(context, FileType.media);
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildFileTypeButton(
                    icon: Icons.folder_open_outlined,
                    label: 'Any Files',
                    subtitle: 'Docs / Archives',
                    color: const Color(0xFF0284C7),
                    onTap: () async {
                      Navigator.pop(ctx);
                      await _pickAndSendFiles(context, FileType.any);
                    },
                  ),
                ),
              ],
            ),
            if (!sync.isConnected) ...[
              const SizedBox(height: 14),
              Text(
                'Note: Laptop is not connected yet. Connect first to stream.',
                style: TextStyle(fontSize: 11, color: Colors.orange[800], fontStyle: FontStyle.italic),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _pickAndSendFiles(BuildContext context, FileType type) async {
    final sync = Provider.of<SyncService>(context, listen: false);
    if (!sync.isConnected) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please connect to your laptop before sending files.'),
          backgroundColor: Colors.orange,
        ),
      );
      _showConnectDialog(context);
      return;
    }

    try {
      final result = await FilePicker.platform.pickFiles(
        allowMultiple: true,
        type: type,
      );

      if (result != null && result.files.isNotEmpty) {
        for (final file in result.files) {
          if (file.path != null) {
            await sync.sendFile(file.path!, file.name);
          }
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('File pick error: $e')),
        );
      }
    }
  }

  void _showClipboardDialog(BuildContext context) {
    final sync = Provider.of<SyncService>(context, listen: false);
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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Send to Laptop Clipboard',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                TextButton.icon(
                  onPressed: () async {
                    final data = await Clipboard.getData(Clipboard.kTextPlain);
                    if (data?.text != null) {
                      textController.text = data!.text!;
                    }
                  },
                  icon: const Icon(Icons.content_paste, size: 16),
                  label: const Text('Paste'),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Instantly synchronize text, OTP codes, or URLs to your Linux desktop clipboard.',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: textController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Type note or paste text here...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
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
                    final text = textController.text.trim();
                    if (text.isNotEmpty) {
                      sync.sendClipboard(text);
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
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showMediaControlDialog(BuildContext context) {
    final sync = Provider.of<SyncService>(context, listen: false);

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
              'Control MPRIS media players (Spotify, YouTube, MPV, Firefox) on laptop',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton.filledTonal(
                  onPressed: () => sync.mediaControl('prev'),
                  icon: const Icon(Icons.skip_previous),
                  iconSize: 28,
                  tooltip: 'Previous Track',
                ),
                const SizedBox(width: 20),
                IconButton.filled(
                  onPressed: () => sync.mediaControl('play-pause'),
                  icon: const Icon(Icons.play_arrow),
                  iconSize: 36,
                  style: IconButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                  tooltip: 'Play / Pause',
                ),
                const SizedBox(width: 20),
                IconButton.filledTonal(
                  onPressed: () => sync.mediaControl('next'),
                  icon: const Icon(Icons.skip_next),
                  iconSize: 28,
                  tooltip: 'Next Track',
                ),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ActionChip(
                  avatar: const Icon(Icons.volume_down, size: 18),
                  label: const Text('Vol -'),
                  onPressed: () => sync.mediaControl('volume-down'),
                ),
                const SizedBox(width: 14),
                ActionChip(
                  avatar: const Icon(Icons.volume_mute, size: 18),
                  label: const Text('Mute'),
                  onPressed: () => sync.mediaControl('mute'),
                ),
                const SizedBox(width: 14),
                ActionChip(
                  avatar: const Icon(Icons.volume_up, size: 18),
                  label: const Text('Vol +'),
                  onPressed: () => sync.mediaControl('volume-up'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showNotificationSheet(BuildContext context) {
    final sync = Provider.of<SyncService>(context, listen: false);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Notification Mirroring',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Text(
              'Mirrors incoming WhatsApp, Signal, SMS, and phone alerts to your Linux desktop.',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 18),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const CircleAvatar(
                backgroundColor: Color(0x1AEC4899),
                child: Icon(Icons.notifications_active, color: Color(0xFFEC4899)),
              ),
              title: const Text('Notification Access'),
              subtitle: Text(
                _notificationSyncEnabled ? 'Service Active • Listening' : 'Disabled',
                style: const TextStyle(fontSize: 12),
              ),
              trailing: Switch(
                value: _notificationSyncEnabled,
                activeColor: const Color(0xFF10B981),
                onChanged: (val) {
                  setState(() {
                    _notificationSyncEnabled = val;
                  });
                  Navigator.pop(ctx);
                },
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  sync.sendNotification(
                    'LokSync Phone Bridge',
                    'Test notification sent from your Android phone! Wi-Fi bridge is active.',
                    app: 'LokSync',
                  );
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('✔ Test notification dispatched to laptop!'),
                      backgroundColor: Color(0xFF10B981),
                    ),
                  );
                },
                icon: const Icon(Icons.send, size: 18),
                label: const Text('Send Test Notification to Desktop'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFileTypeButton({
    required IconData icon,
    required String label,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
            ),
            Text(
              subtitle,
              style: TextStyle(fontSize: 11, color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveTransferCard(SyncService sync, bool isDark) {
    final transfer = sync.activeTransfer;
    if (transfer == null) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E24) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: transfer.isCompleted
              ? const Color(0xFF10B981).withOpacity(0.5)
              : const Color(0xFF0284C7).withOpacity(0.5),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                transfer.isCompleted ? Icons.check_circle : Icons.upload_file,
                color: transfer.isCompleted ? const Color(0xFF10B981) : const Color(0xFF0284C7),
                size: 22,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  transfer.fileName,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (transfer.isCompleted)
                IconButton(
                  icon: const Icon(Icons.close, size: 18),
                  onPressed: () => sync.clearActiveTransfer(),
                  tooltip: 'Dismiss',
                ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: transfer.isCompleted ? 1.0 : (transfer.progressPercent / 100.0).clamp(0.0, 1.0),
              backgroundColor: Colors.grey.withOpacity(0.15),
              valueColor: AlwaysStoppedAnimation<Color>(
                transfer.isCompleted ? const Color(0xFF10B981) : const Color(0xFF0284C7),
              ),
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                transfer.isCompleted
                    ? 'Transfer Complete (${(transfer.totalBytes / (1024 * 1024)).toStringAsFixed(1)} MB)'
                    : '${(transfer.bytesSent / (1024 * 1024)).toStringAsFixed(1)} / ${(transfer.totalBytes / (1024 * 1024)).toStringAsFixed(1)} MB',
                style: TextStyle(fontSize: 11, color: Colors.grey[600]),
              ),
              Text(
                transfer.isCompleted
                    ? '100%'
                    : '${transfer.progressPercent.toStringAsFixed(1)}% • ${transfer.speedMBps.toStringAsFixed(1)} MB/s',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: transfer.isCompleted ? const Color(0xFF10B981) : const Color(0xFF0284C7),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;

    return Consumer<SyncService>(
      builder: (context, sync, _) {
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
                onPressed: () => _showConnectDialog(context),
                icon: Icon(
                  sync.isConnected ? Icons.wifi : Icons.wifi_find_outlined,
                  color: sync.isConnected ? const Color(0xFF10B981) : null,
                ),
                tooltip: sync.isConnected ? 'Connected Devices' : 'Connect to Laptop',
              ),
            ],
          ),
          body: ListView(
            children: [
              // 1. Device Header Status Card (KDE Connect style)
              DeviceHeader(
                device: sync.connectedDevice,
                onSelectDevice: () => _showConnectDialog(context),
              ),

              // 2. Active File Transfer Progress Card
              _buildActiveTransferCard(sync, isDark),

              const SizedBox(height: 8),

              // 3. Section Header
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

              // 4. KDE Action Cards
              KdeActionCard(
                icon: Icons.upload_file_outlined,
                iconColor: const Color(0xFF0284C7),
                iconBgColor: const Color(0xFF0284C7).withOpacity(0.12),
                title: 'Send Files',
                subtitle: 'Share photos, videos, and documents to laptop',
                onTap: () => _showSendFileDialog(context),
              ),

              KdeActionCard(
                icon: Icons.content_paste_outlined,
                iconColor: const Color(0xFF10B981),
                iconBgColor: const Color(0xFF10B981).withOpacity(0.12),
                title: 'Send Clipboard',
                subtitle: sync.lastSentClipboard != null
                    ? 'Last: ${sync.lastSentClipboard}'
                    : 'Sync text or clipboard note to desktop',
                onTap: () => _showClipboardDialog(context),
              ),

              KdeActionCard(
                icon: Icons.play_circle_outline,
                iconColor: const Color(0xFF8B5CF6),
                iconBgColor: const Color(0xFF8B5CF6).withOpacity(0.12),
                title: 'Multimedia Control',
                subtitle: 'Control media playback on laptop remotely',
                onTap: () => _showMediaControlDialog(context),
              ),

              KdeActionCard(
                icon: Icons.notifications_active_outlined,
                iconColor: const Color(0xFFEC4899),
                iconBgColor: const Color(0xFFEC4899).withOpacity(0.12),
                title: 'Notification Mirroring',
                subtitle: _notificationSyncEnabled ? 'Mirroring phone alerts to desktop' : 'Disabled',
                onTap: () => _showNotificationSheet(context),
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
                title: 'Wi-Fi Discovery & Pairing',
                subtitle: sync.isConnected
                    ? 'Connected to ${sync.connectedDevice?.ip ?? ''}'
                    : 'Tap to connect to laptop Wi-Fi',
                onTap: () => _showConnectDialog(context),
              ),

              const SizedBox(height: 30),
            ],
          ),
        );
      },
    );
  }
}
