
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.method === 'POST' && url.pathname.endsWith('/share-target/')) {
        event.respondWith(handleShare(event.request));
    }
});

async function handleShare(request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('files');
        const data = {
            title: formData.get('title') || '',
            text: formData.get('text') || '',
            url: formData.get('url') || '',
            files: files.map(f => ({ name: f.name, type: f.type, blob: f })),
            timestamp: Date.now()
        };

        await storeShare(data);

        // Redirect to root with query param
        const baseUrl = request.url.substring(0, request.url.indexOf('/share-target/'));
        return Response.redirect(baseUrl + '/?share-target=true', 303);
    } catch (err) {
        console.error('Share handling failed', err);
        return Response.redirect('./?error=share_failed', 303);
    }
}

function storeShare(data) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('handmemo-share-db', 1);
        request.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('shares')) {
                db.createObjectStore('shares', { keyPath: 'id' });
            }
        };
        request.onsuccess = e => {
            const db = e.target.result;
            const tx = db.transaction('shares', 'readwrite');
            const store = tx.objectStore('shares');
            store.put({ id: 'latest', ...data });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
    });
}
