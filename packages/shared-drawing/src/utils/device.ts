export const isTablet = (): boolean => {
    const userAgent = navigator.userAgent.toLowerCase();

    // Check for iPad
    // New iPads with iPadOS 13+ send "Macintosh" in user agent but have touch points
    const isIpad = /ipad/.test(userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Check for Android Tablet
    // Android tablets usually don't have "mobile" in user agent, or have "tablet"
    const isAndroid = /android/.test(userAgent);
    const isAndroidMobile = /mobile/.test(userAgent);
    const isAndroidTablet = isAndroid && !isAndroidMobile;

    return isIpad || isAndroidTablet;
};
