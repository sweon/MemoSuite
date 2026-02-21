import React from "react";
interface YouTubeComponentProps {
    videoId: string;
    startTimestamp?: number;
    isShort?: boolean;
    nodeKey: string;
}
declare const YouTubeComponent: React.FC<YouTubeComponentProps>;
export default YouTubeComponent;
