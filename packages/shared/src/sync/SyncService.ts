
import { encryptData, decryptData } from '../utils/crypto';
import type { SyncServiceOptions, SyncStatus } from './types';

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
    private hasSentInitialSync: boolean = false;


    constructor(options: SyncServiceOptions) {
        this.options = options;
    }

    private setStatus(status: SyncStatus, message: string) {

        this.options.onStatusChange(status, message);
    }

    public async initialize(roomId: string): Promise<string> {
        this.isHost = true;
        this.roomId = cleanRoomId(roomId);

        await this.analyzeSyncData();

        this.setStatus('connecting', 'Connecting to relay server...');
        await this.connectRelay();

        this.setStatus('ready', `Room ID: ${this.roomId} - Waiting for peer...`);
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

        this.setStatus('connecting', 'Connecting to relay server...');
        await this.connectRelay();

        // Notify host that we are ready to receive
        console.log('Sending join message...');
        await this.sendRelayMessage({ type: 'join' });

        this.setStatus('connected', 'Found peer! Waiting for source data...');
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
                        // Dedup by msg ID if needed
                        if (msg.id === this.lastMessageId) return;
                        this.lastMessageId = msg.id;

                        await this.handleRelayMessage(msg);
                    }
                } catch (e) {
                    console.error('Failed to parse message', e);
                }
            };

            this.ws.onerror = (e) => {
                console.error('WebSocket error:', e);
                this.setStatus('error', 'Relay connection error');
            };

            this.ws.onclose = () => {
                console.log('Relay connection closed');
            };
        });
    }

    private async handleRelayMessage(msg: any) {
        // Attachment handling (Large Payload)
        if (msg.attachment) {
            // Self-message check
            if (msg.tags && msg.tags.includes(`inst_${this.instanceId}`)) {
                return;
            }
            console.log('Received attachment data');
            await this.downloadAndProcessAttachment(msg.attachment.url);
            return;
        }

        // JSON message handling (Small Payload or Commands)
        let payload: any;
        try {
            payload = JSON.parse(msg.message);
        } catch (e) {
            return;
        }

        // Self-message check
        if (payload.instanceId === this.instanceId) {
            return;
        }

        switch (payload.type) {
            case 'join':
                if (this.isHost) {
                    console.log('Peer joined, starting Host -> Client transfer');
                    this.setStatus('syncing', 'Peer joined! Packaging local data...');
                    // Host sends data first
                    setTimeout(() => this.syncData(), 500);
                }
                break;
            case 'sync_data':
                if (payload.data) {
                    console.log('Received sync_data JSON payload');
                    await this.processReceivedEncodedData(payload.data);
                }
                break;
            case 'sync_complete_ack':
                if (!this.isHost) {
                    this.setStatus('completed', 'Sync completed! Exchange verified.');
                    this.options.onDataReceived();
                } else {
                    this.setStatus('completed', 'Sync completed! Peer verified.');
                }
                break;
        }
    }

    public async syncData() {
        if (!this.roomId || this.isSyncing) {
            console.log('Skip syncData: Room not set or already syncing');
            return;
        }

        try {
            this.isSyncing = true;
            this.hasSentInitialSync = true;

            this.setStatus('syncing', 'Scanning items to share...');
            const targetLogIds = await this.options.adapter.getSyncTargetIds(this.options.initialDataLogId);

            this.setStatus('syncing', 'Encrypting contents...');
            const data = await this.options.adapter.getBackupData(targetLogIds);
            const jsonStr = JSON.stringify(data);
            const encrypted = await encryptData(jsonStr, this.roomId);
            const finalData = (targetLogIds ? "PARTIAL:" : "FULL:") + encrypted;

            if (finalData.length > 2000) {
                this.setStatus('syncing', 'Uploading large package (E2EE)...');
                await this.sendRelayAttachment(finalData);
            } else {
                this.setStatus('syncing', 'Sharing encrypted data...');
                await this.sendRelayMessage({
                    type: 'sync_data',
                    data: finalData
                });
            }

            console.log('Data transfer initiated');

            if (this.options.initialDataLogId) {
                // If this was a targeted share (not full sync), we can end here
                this.setStatus('completed', 'Item shared successfully!');
                this.options.onDataReceived();
            } else {
                // For full bidirectional sync
                if (this.isHost) {
                    this.setStatus('syncing', 'Data sent! Waiting for peer updates...');
                } else {
                    this.setStatus('syncing', 'Local data sent! Finalizing connection...');
                }
            }
        } catch (err: any) {
            console.error('Sync execution failed:', err);
            this.setStatus('error', `Sync error: ${err.message}`);
        } finally {
            this.isSyncing = false;
        }
    }

    private async sendRelayAttachment(encryptedData: string) {
        if (!this.roomId) return;
        const tags = [this.isHost ? 'host' : 'client', `inst_${this.instanceId}`];

        const response = await fetch(`${RELAY_BASE}/${this.roomId}`, {
            method: 'PUT',
            body: encryptedData,
            headers: {
                'Filename': 'sync.enc',
                'Tags': tags.join(',')
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to upload attachment: ${response.statusText}`);
        }
    }

    private async sendRelayMessage(payload: any) {
        if (!this.roomId) return;
        payload.instanceId = this.instanceId;
        const message = JSON.stringify(payload);

        const response = await fetch(`${RELAY_BASE}/${this.roomId}`, {
            method: 'POST',
            body: message
        });

        if (!response.ok) {
            throw new Error(`Failed to send message: ${response.statusText}`);
        }
    }

    private async downloadAndProcessAttachment(url: string) {
        try {
            this.setStatus('syncing', 'Downloading data package (E2EE)...');
            const response = await fetch(url);
            if (!response.ok) throw new Error('Download failed');
            const encodedData = await response.text();
            await this.processReceivedEncodedData(encodedData);
        } catch (err: any) {
            console.error('Attachment processing failed:', err);
            this.setStatus('error', `Data download error: ${err.message}`);
        }
    }

    private async processReceivedEncodedData(encodedData: string) {
        let isPartial = false;
        let realEncodedData = encodedData;

        if (encodedData.startsWith("PARTIAL:")) {
            isPartial = true;
            realEncodedData = encodedData.substring(8);
        } else if (encodedData.startsWith("FULL:")) {
            isPartial = false;
            realEncodedData = encodedData.substring(5);
        }

        let decrypted = '';
        try {
            this.setStatus('syncing', 'Decrypting data package...');
            decrypted = await decryptData(realEncodedData, this.roomId!);
        } catch (e: any) {
            console.error('Decryption error:', e);
            this.setStatus('error', 'Decryption failed. Check room ID.');
            return;
        }

        let data: any;
        try {
            data = JSON.parse(decrypted);
            this.updateSyncInfoMeta(data, isPartial);
        } catch (e: any) {
            this.setStatus('error', 'Failed to parse decrypted data.');
            return;
        }

        try {
            this.setStatus('merging', 'Merging items into database...');
            await this.options.adapter.mergeBackupData(data);

            if (this.isHost) {
                // Host received data (Final step)
                await this.sendRelayMessage({ type: 'sync_complete_ack' });
                this.setStatus('completed', 'Sync completed! Exchange verified.');
                this.options.onDataReceived();
            } else {
                // Client received data (Step 2 of Host -> Client -> Host)
                if (!isPartial) {
                    if (!this.hasSentInitialSync) {
                        this.setStatus('syncing', 'Updating peer with local changes...');
                        await this.syncData(); // Phone sends its data BACK to Mac
                    } else {
                        // Already sharing, notify host we are done
                        await this.sendRelayMessage({ type: 'sync_complete_ack' });
                        this.setStatus('completed', 'Sync completed! Data mirrored.');
                        this.options.onDataReceived();
                    }
                } else {
                    this.setStatus('completed', 'Item received successfully!');
                    this.options.onDataReceived();
                }
            }
        } catch (err: any) {
            console.error('Merge execution failed:', err);
            this.setStatus('error', `Merge error: ${err.message}`);
        }
    }

    private updateSyncInfoMeta(data: any, isPartial: boolean) {
        if (!this.options.onSyncInfo) return;

        let count = 0;
        let label = 'Remote items';

        if (data.memos && Array.isArray(data.memos)) {
            count = data.memos.length;
            label = data.memos[0]?.title || 'Combined Memos';
        } else if (data.logs && Array.isArray(data.logs)) {
            count = data.logs.length;
            label = data.logs[0]?.title || 'Combined Logs';
        } else if (data.words && Array.isArray(data.words)) {
            count = data.words.length;
            label = data.words[0]?.title || 'Combined Words';
        }

        if (!isPartial) {
            this.options.onSyncInfo({ type: 'full', count: count || 0, label: 'Full Sync Payload' });
        } else {
            this.options.onSyncInfo({ type: count > 1 ? 'thread' : 'single', count: count, label: label });
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
