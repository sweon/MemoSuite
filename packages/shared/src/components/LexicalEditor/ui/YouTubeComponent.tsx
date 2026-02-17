import React, { useRef, useState, useEffect, useCallback } from "react";
import styled from "styled-components";

const Container = styled.div<{ $isShort?: boolean }>`
  width: ${props => props.$isShort ? '320px' : '100%'};
  max-width: ${props => props.$isShort ? '320px' : '560px'};
  aspect-ratio: ${props => props.$isShort ? '9/16' : '16/9'};
  margin: 1rem auto;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  transition: box-shadow 0.3s ease;
  user-select: none;

  &:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  }
`;

const Overlay = styled.div<{ $isPlaying?: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${props => props.$isPlaying ? 'transparent' : 'rgba(0, 0, 0, 0.35)'};
  cursor: pointer;
  transition: background 0.3s ease;
  z-index: 2;
  pointer-events: ${props => props.$isPlaying ? 'none' : 'auto'};
`;

const PlayButton = styled.div`
  width: 64px;
  height: 64px;
  background: rgba(255, 0, 0, 0.85);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, background 0.2s ease;

  &:hover {
    transform: scale(1.1);
    background: rgba(255, 0, 0, 1);
  }

  svg {
    width: 28px;
    height: 28px;
    fill: white;
    margin-left: 4px;
  }
`;

const Thumbnail = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  inset: 0;
`;

const VideoLabel = styled.div`
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  z-index: 3;
  pointer-events: none;

  .yt-icon {
    width: 20px;
    height: 14px;
    background: #FF0000;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg {
      width: 8px;
      height: 8px;
      fill: white;
    }
  }
`;

interface YouTubeComponentProps {
    videoId: string;
    startTimestamp?: number;
    isShort?: boolean;
    nodeKey: string;
}

const formatTime = (seconds: number) => {
    const val = Math.floor(seconds);
    const h = Math.floor(val / 3600);
    const m = Math.floor((val % 3600) / 60);
    const s = val % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const YouTubeComponent: React.FC<YouTubeComponentProps> = ({
    videoId,
    startTimestamp,
    isShort
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [thumbnailError, setThumbnailError] = useState(false);

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    const handlePlay = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsPlaying(true);
    }, []);

    // Stop playing when node is removed from DOM
    useEffect(() => {
        return () => {
            setIsPlaying(false);
        };
    }, []);

    const iframeSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&playsinline=1${startTimestamp ? `&start=${startTimestamp}` : ''}`;

    return (
        <Container $isShort={isShort} ref={containerRef}>
            {isPlaying ? (
                <iframe
                    src={iframeSrc}
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        position: 'absolute',
                        inset: 0,
                    }}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            ) : (
                <>
                    {!thumbnailError && (
                        <Thumbnail
                            src={thumbnailUrl}
                            alt="YouTube thumbnail"
                            onError={() => setThumbnailError(true)}
                        />
                    )}
                    {thumbnailError && (
                        <div style={{
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#666',
                            fontSize: '14px'
                        }}>
                            YouTube: {videoId}
                        </div>
                    )}
                    <Overlay onClick={handlePlay}>
                        <PlayButton>
                            <svg viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </PlayButton>
                    </Overlay>
                    <VideoLabel>
                        <span className="yt-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </span>
                        YouTube &middot; {videoId}
                        {startTimestamp ? ` · ${formatTime(startTimestamp)}` : ''}
                    </VideoLabel>
                </>
            )}
        </Container>
    );
};

export default YouTubeComponent;
