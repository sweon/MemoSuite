export const isMobileDevice = (): boolean => {
    const userAgent = navigator.userAgent.toLowerCase();

    // Check if it's a mobile device (phone or tablet)
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

    // Also check for iPadOS 13+ which identifies as Macintosh but has touch points
    const isIpadOS = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    return isMobile || isIpadOS;
};
