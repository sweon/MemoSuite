
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
    private hasSentInitialSync: boolean = false;
    private currentStatus: string = 'idle';

    constructor(options: SyncServiceOptions) {
        this.options = options;
    }

    private setStatus(status: 'idle' | 'connecting' | 'ready' | 'connected' | 'syncing' | 'merging' | 'completed' | 'error', message: string) {
        this.currentStatus = status;
        this.options.onStatusChange(status, message);
    }

    public async initialize(roomId: string): Promise<string> {
        this.isHost = true;
        this.roomId = cleanRoomId(roomId);

        await this.analyzeSyncData();

        this.setStatus('connecting', 'Connecting to relay...');
        await this.connectRelay();

        this.setStatus('ready', `Room ID: ${this.roomId}`);
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

        this.setStatus('connecting', 'Connecting to relay...');
        await this.connectRelay();

        // Notify host that we are ready
        await this.sendRelayMessage({ type: 'join' });

        // Immediately start sending our local data for bidirectional sync
        this.syncData();

        this.setStatus('connected', 'Waiting for host data...');
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
        if (msg.attachment) {
            // Self-message check for attachments (inst_ID tag)
            if (msg.tags && msg.tags.includes(`inst_${this.instanceId}`)) {
                console.log('Ignoring own attachment');
                return;
            }
            await this.downloadAndProcessAttachment(msg.attachment.url);
            return;
        }

        let payload: any;
        try {
            payload = JSON.parse(msg.message);
        } catch (e) {
            return;
        }

        if (payload.instanceId === this.instanceId) {
            return;
        }

        switch (payload.type) {
            case 'join':
                if (this.isHost) {
                    console.log('Client joined, preparing to send host data...');
                    this.setStatus('connected', 'Peer connected! Sharing host data...');
                    // Longer delay to ensure client is ready and stable
                    setTimeout(() => this.syncData(), 1500);
                }
                break;
            case 'sync_data':
                if (payload.data) {
                    this.setStatus('syncing', 'Receiving items from peer...');
                    await this.processReceivedEncodedData(payload.data);
                }
                break;
            case 'sync_complete_ack':
                if (this.isHost) {
                    this.setStatus('completed', 'Sync completed! Exchange verified.');
                    this.options.onDataReceived();
                }
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
            this.hasSentInitialSync = true;
            this.setStatus('syncing', 'Scanning items for sync...');

            const targetLogIds = await this.options.adapter.getSyncTargetIds(this.options.initialDataLogId);

            this.setStatus('syncing', 'Packaging data for encryption...');
            const data = await this.options.adapter.getBackupData(targetLogIds);
            const jsonStr = JSON.stringify(data);

            this.setStatus('syncing', 'Encrypting contents...');
            const encrypted = await encryptData(jsonStr, this.roomId);
            const finalData = (targetLogIds ? "PARTIAL:" : "FULL:") + encrypted;

            if (finalData.length > 2000) {
                this.setStatus('syncing', 'Uploading large package...');
                await this.sendRelayAttachment(finalData);
            } else {
                this.setStatus('syncing', 'Sending sync message...');
                await this.sendRelayMessage({
                    type: 'sync_data',
                    data: finalData
                });
            }

            console.log('Sync data sent');

            if (this.options.initialDataLogId) {
                this.setStatus('completed', 'Shared successfully!');
            } else {
                // IMPORTANT: Only update status if we haven't already finished the reverse sync (completed/error)
                // This prevents race conditions where 'Sync completed' is overwritten by 'Data package sent'
                if (this.currentStatus !== 'completed' && this.currentStatus !== 'error') {
                    if (this.isHost) {
                        this.setStatus('connected', 'Source data sent! Waiting for peer data...');
                    } else {
                        this.setStatus('connected', 'Data package sent to peer!');
                    }
                }
            }
        } catch (err: any) {
            console.error('Sync failed:', err);
            this.setStatus('error', `Sync failed: ${err.message}`);
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
                'Tags': tags.join(',')
            }
        });
    }

    private async sendRelayMessage(payload: any) {
        if (!this.roomId) return;
        payload.instanceId = this.instanceId;
        const message = JSON.stringify(payload);

        await fetch(`${RELAY_BASE}/${this.roomId}`, {
            method: 'POST',
            body: message
        });
    }

    private async downloadAndProcessAttachment(url: string) {
        try {
            console.log('Downloading attachment...');
            const response = await fetch(url);
            if (!response.ok) throw new Error('Attachment download failed');
            const encodedData = await response.text();
            await this.processReceivedEncodedData(encodedData);
        } catch (err: any) {
            console.error('Attachment processing failed:', err);
            this.setStatus('error', `Download failed: ${err.message}`);
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
            this.setStatus('error', `Decryption failed. Check room ID.`);
            return;
        }

        let data: any;
        try {
            data = JSON.parse(decrypted);
            if (this.options.onSyncInfo) {
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
                    this.options.onSyncInfo({ type: 'full', count: count, label: 'Full Sync Payload' });
                } else {
                    this.options.onSyncInfo({ type: count > 1 ? 'thread' : 'single', count: count, label: label });
                }
            }
        } catch (e: any) {
            this.setStatus('error', `Data parsing failed: ${e.message}`);
            return;
        }

        try {
            this.setStatus('merging', 'Merging items into database...');
            await this.options.adapter.mergeBackupData(data);

            if (this.isHost) {
                // Host received data (Final step of bidirectional sync)
                this.setStatus('completed', 'Sync completed! All data merged.');
                this.options.onDataReceived();
            } else {
                // Client received data (Intermediate step)
                if (!isPartial) {
                    if (!this.hasSentInitialSync) {
                        this.setStatus('syncing', 'Sending local updates back to peer...');
                        await this.syncData();
                    } else {
                        // We already sent our data, so just notify host we are finished
                        await this.sendRelayMessage({ type: 'sync_complete_ack' });
                        this.setStatus('completed', 'Sync completed! Local data shared.');
                    }
                } else {
                    this.setStatus('completed', 'Share received successfully!');
                    this.options.onDataReceived();
                }
            }
        } catch (err: any) {
            console.error('Merge failed:', err);
            this.setStatus('error', `Merge error: ${err.message}`);
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
