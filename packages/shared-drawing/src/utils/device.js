export const isMobileDevice = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    // Check if it's a mobile device (phone or tablet)
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    // Also check for iPadOS 13+ which identifies as Macintosh but has touch points
    const isIpadOS = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    // Windows Touch Devices (Like Galaxy Book 360)
    const isWindowsTouch = userAgent.includes('windows') && navigator.maxTouchPoints > 1;
    // Detection for any device with significant touch points (Tablet / Hybrid)
    // Most tablets and touch laptops report 5 or 10+ touch points
    const hasManyTouchPoints = navigator.maxTouchPoints > 2;
    return isMobile || isIpadOS || isWindowsTouch || hasManyTouchPoints;
};
