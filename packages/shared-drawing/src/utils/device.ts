export const isMobileDevice = (): boolean => {
    const userAgent = navigator.userAgent.toLowerCase();

    // Check if it's a mobile device (phone or tablet)
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

    // Also check for iPadOS 13+ which identifies as Macintosh but has touch points
    const isIpadOS = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Samsung Galaxy Book 360 / Windows Touch Devices
    // Heuristic: Windows + Multi-touch support
    const isWindowsTouch = userAgent.includes('windows') && navigator.maxTouchPoints > 1;

    return isMobile || isIpadOS || isWindowsTouch;
};
