
import { encryptData, decryptData } from '../utils/crypto';
import type { SyncServiceOptions } from './types';

export const cleanRoomId = (roomId: string): string => {
    return roomId.trim().replace(/[^a-zA-Z0-9_-]/g, '-').toUpperCase();
};

const RELAY_BASE = 'https://ntfy.sh';
const WS_BASE = 'wss://ntfy.sh';

export class SyncService {
    private options: SyncServiceOptions;
    private ws: WebSocket | null = null;
    private roomId: string | null = null;
    private isHost: boolean = false;
    private lastMessageId: string | null = null;
    private isSyncing: boolean = false;
    private instanceId: string = Math.random().toString(36).substring(2, 10);

    constructor(options: SyncServiceOptions) {
        this.options = options;
    }

    public async initialize(roomId: string): Promise<string> {
        this.isHost = true;
        this.roomId = cleanRoomId(roomId);

        await this.analyzeSyncData();

        this.options.onStatusChange('connecting', 'Connecting to relay...');
        await this.connectRelay();

        this.options.onStatusChange('ready', `Room ID: ${this.roomId}`);
        return this.roomId;
    }

    private async analyzeSyncData() {
        if (!this.options.onSyncInfo) return;

        try {
            const info = await this.options.adapter.analyzeSyncData(this.options.initialDataLogId);
            this.options.onSyncInfo(info);
        } catch (e) {
            console.error('Failed to analyze sync data', e);
        }
    }

    public async connect(targetRoomId: string) {
        this.isHost = false;
        this.roomId = cleanRoomId(targetRoomId);

        this.options.onStatusChange('connecting', 'Connecting to relay...');
        await this.connectRelay();

        // Notify host that we are ready
        await this.sendRelayMessage({ type: 'join' });
        this.options.onStatusChange('connected', 'Waiting for host data...');
    }

    private async connectRelay() {
        if (this.ws) {
            this.ws.close();
        }

        return new Promise<void>((resolve, reject) => {
            const url = `${WS_BASE}/${this.roomId}/ws`;
            const timeout = setTimeout(() => {
                if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
                    this.ws.close();
                    reject(new Error('Relay connection timeout'));
                }
            }, 10000);

            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                clearTimeout(timeout);
                console.log('Relay connected');
                resolve();
            };

            this.ws.onmessage = async (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.event === 'message') {
                        if (msg.id === this.lastMessageId) return;
                        this.lastMessageId = msg.id;

                        await this.handleRelayMessage(msg);
                    }
                } catch (e) {
                }
            };

            this.ws.onerror = (err) => {
                clearTimeout(timeout);
                console.error('Relay error:', err);
                this.options.onStatusChange('error', 'Relay connection failed');
                reject(err);
            };

            this.ws.onclose = () => {
                clearTimeout(timeout);
                console.log('Relay disconnected');
                if (this.roomId) {
                    this.options.onStatusChange('disconnected', 'Relay disconnected');
                }
            };
        });
    }

    private async handleRelayMessage(msg: any) {
        if (msg.attachment) {
            // Check if this is an attachment we sent ourselves
            if (msg.tags && msg.tags.includes(`inst_${this.instanceId}`)) {
                console.log('Ignoring own attachment');
                return;
            }
            console.log('Received attachment:', msg.attachment.url);
            this.options.onStatusChange('syncing', 'Found data package on server...');
            await this.downloadAndProcessAttachment(msg.attachment.url);
            return;
        }

        let payload: any;
        try {
            payload = JSON.parse(msg.message || msg);
        } catch (e) {
            return; // Not a message for us
        }

        // Check if this is a message we sent ourselves
        if (payload.instanceId === this.instanceId) {
            return;
        }

        console.log('Received relay message:', payload.type);

        switch (payload.type) {
            case 'join':
                if (this.isHost) {
                    console.log('Client joined, preparing to send data...');
                    this.options.onStatusChange('connected', 'Peer connected! Sharing data...');
                    // Longer delay to ensure client is ready and stable
                    setTimeout(() => this.syncData(), 1500);
                }
                break;
            case 'sync_data':
                if (payload.data) {
                    this.options.onStatusChange('syncing', 'Receiving direct message data...');
                    await this.processReceivedEncodedData(payload.data);
                }
                break;
            case 'ping':
                break;
        }
    }

    public async syncData() {
        if (!this.roomId || this.isSyncing) {
            console.log('Already syncing or no room, skipping syncData');
            return;
        }

        try {
            this.isSyncing = true;
            this.options.onStatusChange('syncing', 'Scanning items for sync...');

            const targetLogIds = await this.options.adapter.getSyncTargetIds(this.options.initialDataLogId);

            this.options.onStatusChange('syncing', 'Packaging data for encryption...');
            const data = await this.options.adapter.getBackupData(targetLogIds);
            const jsonStr = JSON.stringify(data);

            this.options.onStatusChange('syncing', 'Encrypting contents...');
            const encrypted = await encryptData(jsonStr, this.roomId);
            const finalData = (targetLogIds ? "PARTIAL:" : "FULL:") + encrypted;

            if (finalData.length > 2000) {
                this.options.onStatusChange('syncing', 'Uploading large package (attachments)...');
                await this.sendRelayAttachment(finalData);
            } else {
                this.options.onStatusChange('syncing', 'Sending sync message...');
                await this.sendRelayMessage({
                    type: 'sync_data',
                    data: finalData
                });
            }

            console.log('Sync data sent');
            if (this.options.initialDataLogId) {
                this.options.onStatusChange('completed', 'Shared successfully!');
            } else {
                // For host, show "Sent" and wait for reply. For client, show "Sent" then complete.
                this.options.onStatusChange('connected', 'Data package sent! Waiting for peer...');
            }
        } catch (err: any) {
            console.error('Sync failed:', err);
            this.options.onStatusChange('error', `Sync failed: ${err.message}`);
        } finally {
            this.isSyncing = false;
        }
    }

    private async sendRelayAttachment(encryptedData: string) {
        if (!this.roomId) return;
        const tags = [this.isHost ? 'host' : 'client', `inst_${this.instanceId}`];

        await fetch(`${RELAY_BASE}/${this.roomId}`, {
            method: 'PUT',
            body: encryptedData,
            headers: {
                'Filename': 'sync.enc',
                'Title': 'MemoSuite Sync Data',
                'Tags': tags.join(',')
            }
        });
    }

    private async sendRelayMessage(payload: any) {
        if (!this.roomId) return;

        try {
            const tags = [this.isHost ? 'host' : 'client', `inst_${this.instanceId}`];
            payload.sender = this.isHost ? 'host' : 'client';
            payload.instanceId = this.instanceId;

            await fetch(`${RELAY_BASE}/${this.roomId}`, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {
                    'Tags': tags.join(',')
                }
            });
        } catch (e: any) {
            console.error('Failed to send relay message:', e);
            throw e;
        }
    }


    private async downloadAndProcessAttachment(url: string) {
        try {
            console.log('Downloading attachment...');
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to download attachment: ${response.status}`);
            }
            const encodedData = await response.text();
            console.log('Download complete, processing...');
            await this.processReceivedEncodedData(encodedData);
        } catch (e: any) {
            console.error('Download error:', e);
            this.options.onStatusChange('error', `Download failed: ${e.message || e}`);
        }
    }

    private async processReceivedEncodedData(encodedData: string) {
        let realEncodedData = encodedData;
        let isPartial = false;

        try {
            if (encodedData.startsWith("PARTIAL:")) {
                isPartial = true;
                realEncodedData = encodedData.substring(8);
            } else if (encodedData.startsWith("FULL:")) {
                isPartial = false;
                realEncodedData = encodedData.substring(5);
            }
        } catch (e: any) {
            this.options.onStatusChange('error', `Pre-processing failed: ${e.message}`);
            return;
        }

        let decrypted = '';
        try {
            this.options.onStatusChange('syncing', 'Decrypting data package...');
            decrypted = await decryptData(realEncodedData, this.roomId!);
        } catch (e: any) {
            console.error('Decryption error:', e);
            this.options.onStatusChange('error', `Decryption failed. Check room ID (Case-sensitive).`);
            return;
        }

        let data: any;
        try {
            data = JSON.parse(decrypted);
            if (this.options.onSyncInfo) {
                let count = 0;
                let label = 'Remote items';

                if (data.logs && Array.isArray(data.logs)) {
                    count = data.logs.length;
                    label = data.logs[0]?.title || 'Combined Logs';
                } else if (data.memos && Array.isArray(data.memos)) {
                    count = data.memos.length;
                    label = data.memos[0]?.title || 'Combined Memos';
                }

                if (!isPartial) {
                    this.options.onSyncInfo({ type: 'full', count: count, label: 'Full Sync Payload' });
                } else {
                    this.options.onSyncInfo({ type: count > 1 ? 'thread' : 'single', count: count, label: label });
                }
            }
        } catch (e: any) {
            this.options.onStatusChange('error', `Data parsing failed: ${e.message}`);
            return;
        }

        try {
            // Check if we should skip merge (e.g. Host just sharing one specific item)
            if (this.options.initialDataLogId && this.isHost) {
                console.log("Single item share successful.");
                this.options.onStatusChange('completed', 'Item Shared Successfully!');
                return;
            }

            this.options.onStatusChange('syncing', 'Merging remote items into local database...');
            await this.options.adapter.mergeBackupData(data);

            if (this.isHost) {
                // Host received data (Final step of bidirectional sync)
                this.options.onStatusChange('completed', 'Sync completed! All data merged.');
                this.options.onDataReceived();
            } else {
                // Client received data (Intermediate step)
                if (!isPartial) {
                    this.options.onStatusChange('syncing', 'Sending local updates back to peer...');
                    // Small delay to ensure DB locks are released before sending
                    setTimeout(async () => {
                        await this.syncData();
                        this.options.onStatusChange('completed', 'Sync completed! Exchange finished.');
                        this.options.onDataReceived();
                    }, 500);
                } else {
                    this.options.onStatusChange('completed', 'Sync completed!');
                    this.options.onDataReceived();
                }
            }
        } catch (e: any) {
            console.error('Merge error:', e);
            this.options.onStatusChange('error', `Local storage merge failed: ${e.message}`);
        }
    }

    public destroy() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.roomId = null;
    }
}
