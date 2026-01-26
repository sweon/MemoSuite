import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { FiX, FiCheck } from 'react-icons/fi';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 11000;
  padding: 20px;
`;

const Container = styled.div`
  background: #ffffff;
  width: 95%;
  max-width: 600px;
  height: 90vh;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
`;

const Header = styled.div`
  padding: 1rem;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: #333;
`;

const Content = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f1f3f5;
`;

const ScrollContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3rem;
  
  &::-webkit-scrollbar {
    width: 10px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f3f5;
  }
  &::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 5px;
    border: 2px solid #f1f3f5;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #bbb;
  }
`;

const PageWrapper = styled.div<{ $isSelected: boolean }>`
  position: relative;
  background: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border: 4px solid ${props => props.$isSelected ? '#333' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  }
`;

const PageLabel = styled.div`
  position: absolute;
  bottom: -28px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.8rem;
  color: #666;
  font-weight: 700;
  background: rgba(255,255,255,0.8);
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
`;

const Canvas = styled.canvas`
  display: block;
  max-width: 100%;
  height: auto !important;
`;

const Footer = styled.div`
  padding: 1rem;
  border-top: 1px solid #eee;
  display: flex;
  align-items: center;
  gap: 1rem;
  background: white;
  flex-shrink: 0;
`;

const PageInputContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: auto;
`;

const Input = styled.input`
  width: 55px;
  padding: 0.4rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 700;

  &:focus {
    outline: none;
    border-color: #333;
  }
`;

const Button = styled.button<{ $primary?: boolean }>`
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border: 1px solid ${props => props.$primary ? '#333' : '#dee2e6'};
  background: ${props => props.$primary ? '#333' : '#fff'};
  color: ${props => props.$primary ? '#fff' : '#495057'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${props => props.$primary ? '#000' : '#f8f9fa'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Placeholder = styled.div`
  width: 300px;
  max-width: 80vw;
  aspect-ratio: 1/1.414;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 0.8rem;
`;

// Individual page item component
const PdfPageItem = React.memo(({
    pdfDoc,
    pageNo,
    isSelected,
    onSelect,
    onRendered
}: {
    pdfDoc: any,
    pageNo: number,
    isSelected: boolean,
    onSelect: (pageNo: number) => void,
    onRendered: (pageNo: number, canvas: HTMLCanvasElement) => void
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isRendered, setIsRendered] = useState(false);
    const renderTaskRef = useRef<any>(null);

    useEffect(() => {
        setIsRendered(false);
    }, [pdfDoc, pageNo]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { rootMargin: '400px' }
        );

        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [pdfDoc, pageNo]);

    useEffect(() => {
        if (isVisible && !isRendered && pdfDoc) {
            renderPage();
        }
        return () => {
            if (renderTaskRef.current) renderTaskRef.current.cancel();
        };
    }, [isVisible, isRendered, pdfDoc, pageNo]);

    const renderPage = async () => {
        if (!pdfDoc || !canvasRef.current) return;
        try {
            if (renderTaskRef.current) renderTaskRef.current.cancel();

            const page = await pdfDoc.getPage(pageNo);
            const viewport = page.getViewport({ scale: 2.5 });
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d', { alpha: false });

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                // Pre-fill with pure white for maximum contrast
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, canvas.width, canvas.height);

                const renderTask = page.render({ canvasContext: context, viewport });
                renderTaskRef.current = renderTask;
                await renderTask.promise;
                setIsRendered(true);
                renderTaskRef.current = null;
                onRendered(pageNo, canvas);
            }
        } catch (err: any) {
            if (err.name !== 'RenderingCancelledException') {
                console.error(`Page ${pageNo} render failed:`, err);
            }
        }
    };

    return (
        <PageWrapper
            ref={containerRef}
            $isSelected={isSelected}
            onClick={() => isRendered && canvasRef.current && onSelect(pageNo)}
        >
            <Canvas ref={canvasRef} style={{ display: isRendered ? 'block' : 'none' }} />
            {!isRendered && <Placeholder>Page {pageNo}</Placeholder>}
            <PageLabel>Page {pageNo}</PageLabel>
        </PageWrapper>
    );
});

interface Props {
    pdfDoc: any;
    t: any;
    onSelect: (canvas: HTMLCanvasElement) => void;
    onCancel: () => void;
}

export const PdfPageSelector: React.FC<Props> = ({ pdfDoc, t, onSelect, onCancel }) => {
    const [selectedPage, setSelectedPage] = useState<number>(1);
    const [inputPage, setInputPage] = useState<string>('1');
    const scrollRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const canvasCache = useRef<Map<number, HTMLCanvasElement>>(new Map());

    const numPages = pdfDoc?.numPages || 0;
    const pages = Array.from({ length: numPages }, (_, i) => i + 1);

    const handlePageRendered = useCallback((pageNo: number, canvas: HTMLCanvasElement) => {
        canvasCache.current.set(pageNo, canvas);
    }, []);

    // Track scroll to update the page number in footer
    useEffect(() => {
        const currentScrollRef = scrollRef.current;
        if (!currentScrollRef) return;

        const handleScroll = () => {
            const containerTop = currentScrollRef.getBoundingClientRect().top;
            const containerHeight = currentScrollRef.clientHeight;
            const containerCenter = containerTop + containerHeight / 2;

            let closestPage = 1;
            let minDistance = Infinity;

            pageRefs.current.forEach((el, p) => {
                const rect = el.getBoundingClientRect();
                const center = rect.top + rect.height / 2;
                const distance = Math.abs(center - containerCenter);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPage = p;
                }
            });

            setInputPage(String(closestPage));
            setSelectedPage(closestPage);
        };

        currentScrollRef.addEventListener('scroll', handleScroll, { passive: true });
        return () => currentScrollRef.removeEventListener('scroll', handleScroll);
    }, [numPages]);

    const handlePageClick = (pageNo: number) => {
        setSelectedPage(pageNo);
        setInputPage(String(pageNo));
    };

    const handleJump = (e: React.FormEvent) => {
        e.preventDefault();
        const p = parseInt(inputPage);
        if (p >= 1 && p <= numPages) {
            setSelectedPage(p);
            const target = pageRefs.current.get(p);
            if (target && scrollRef.current) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    const handleConfirm = () => {
        const canvas = canvasCache.current.get(selectedPage);
        if (canvas) {
            onSelect(canvas);
        } else {
            // If user clicks before render is finish
            alert(t.drawing?.pdf_not_loaded || "This page is still loading. Please wait a moment.");
        }
    };

    return (
        <Overlay onClick={onCancel}>
            <Container onClick={e => e.stopPropagation()}>
                <Header>
                    <Title>{t.drawing.pdf_select_title || "Select PDF Page"}</Title>
                    <Button onClick={onCancel} style={{ padding: '8px', border: 'none' }}>
                        <FiX size={20} />
                    </Button>
                </Header>
                <Content>
                    <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#666', textAlign: 'center', background: 'white', borderBottom: '1px solid #eee' }}>
                        {t.drawing.pdf_select_desc || "Scroll and click a page to use as background."}
                    </div>

                    <ScrollContainer ref={scrollRef}>
                        {pages.map(p => (
                            <div key={p} ref={el => { if (el) pageRefs.current.set(p, el); else pageRefs.current.delete(p); }}>
                                <PdfPageItem
                                    pdfDoc={pdfDoc}
                                    pageNo={p}
                                    isSelected={selectedPage === p}
                                    onSelect={handlePageClick}
                                    onRendered={handlePageRendered}
                                />
                            </div>
                        ))}
                    </ScrollContainer>
                </Content>
                <Footer>
                    <PageInputContainer>
                        <form onSubmit={handleJump} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <Input
                                type="number"
                                min="1"
                                max={numPages}
                                value={inputPage}
                                onChange={e => setInputPage(e.target.value)}
                            />
                            <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 600 }}>/ {numPages}</span>
                        </form>
                    </PageInputContainer>

                    <Button onClick={onCancel}>{t.drawing.cancel}</Button>
                    <Button
                        $primary
                        onClick={handleConfirm}
                    >
                        <FiCheck size={18} />
                        {t.drawing.pdf_button_select || "Use this Page"}
                    </Button>
                </Footer>
            </Container>
        </Overlay>
    );
};
