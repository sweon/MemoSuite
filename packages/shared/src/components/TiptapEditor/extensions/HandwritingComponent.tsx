import React, { useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import styled from 'styled-components';
import { FabricCanvasModal } from '@memosuite/shared-drawing';
import { useLanguage } from '../../../i18n';

const DrawingWidget = styled.div`
  background: #fcfcfd;
  border: 1px solid #edf2f7;
  border-left: 4px solid #4c6ef5;
  border-radius: 8px;
  padding: 8px;
  margin: 12px 0;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  position: relative;
  min-height: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #f8f9fa;
    border-color: #cbd5e0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);

    .edit-overlay {
      opacity: 1;
    }
  }
`;

const PreviewImage = styled.img`
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  display: block;
`;


const EditOverlay = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #4c6ef5;
  font-weight: 600;
  border: 1px solid #edf2f7;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
`;

const HandwritingComponent: React.FC<NodeViewProps> = ({ node, updateAttributes }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const { language } = useLanguage();
  const data = node.attrs.data;

  React.useEffect(() => {
    if (!data) {
      setPreviewSrc(null);
      return;
    }

    const tempCanvasEl = document.createElement('canvas');
    import('fabric').then(({ fabric }) => {
      const staticCanvas = new fabric.StaticCanvas(tempCanvasEl);
      staticCanvas.loadFromJSON(data, () => {
        // Filter out background, erasers, and other non-content objects
        const objects = staticCanvas.getObjects().filter((obj: any) =>
          obj.visible &&
          !(obj as any).isPageBackground &&
          !(obj as any).isPixelEraser &&
          !(obj as any).isObjectEraser &&
          !(obj as any).excludeFromExport
        );

        if (objects.length > 0) {
          // Calculate maxY of actual content
          let maxY = 0;

          objects.forEach((obj: any) => {
            const bound = obj.getBoundingRect(true);
            maxY = Math.max(maxY, bound.top + bound.height);
          });

          // Unified Logic: full width, top at 0, only cut bottom.
          const PADDING_BOTTOM = 40;
          const MIN_HEIGHT = 100;
          const originalWidth = staticCanvas.getWidth() || 800;
          const tightHeight = Math.max(MIN_HEIGHT, maxY + PADDING_BOTTOM);

          staticCanvas.setDimensions({
            width: originalWidth,
            height: tightHeight
          });

          staticCanvas.backgroundColor = null;
          staticCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
          staticCanvas.renderAll();

          setPreviewSrc(staticCanvas.toDataURL({
            format: 'png',
            quality: 1,
            enableRetinaScaling: true
          }));
        } else {
          setPreviewSrc(null);
        }
        staticCanvas.dispose();
      });
    });
  }, [data]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleSave = (json: string) => {
    updateAttributes({ data: json });
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  return (
    <NodeViewWrapper style={{ width: '100%' }}>
      {previewSrc ? (
        <DrawingWidget onClick={handleOpenModal}>
          <PreviewImage src={previewSrc} alt="Handwriting Preview" />
          <EditOverlay className="edit-overlay">
            {language === 'ko' ? '수정' : 'Edit'}
          </EditOverlay>
        </DrawingWidget>
      ) : null}

      {isModalOpen && (
        <FabricCanvasModal
          initialData={data}
          onSave={handleSave}
          onClose={handleClose}
          language={language as any}
        />
      )}
    </NodeViewWrapper>
  );
};

export default HandwritingComponent;
