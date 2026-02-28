import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { $getNodeByKey } from "lexical";
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { FabricCanvasModal } from "@memosuite/shared-drawing";
import { FiPenTool } from "react-icons/fi";
// import { useLanguage } from "../../../../i18n"; // Adjust path as needed
import { useLanguage } from "../../../i18n";

import { $isHandwritingNode } from "../nodes/HandwritingNode";

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

export default function HandwritingComponent({
    nodeKey,
    data,
}: {
    nodeKey: string;
    data: string;
}): React.ReactNode {
    const [editor] = useLexicalComposerContext();
    const [isSelected] = useLexicalNodeSelection(nodeKey);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);
    const { language } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!data) {
            setPreviewSrc(null);
            return;
        }

        setIsLoading(true);
        const tempCanvasEl = document.createElement("canvas");
        import("fabric").then(({ fabric }) => {
            try {
                const staticCanvas = new fabric.StaticCanvas(tempCanvasEl);
                staticCanvas.loadFromJSON(data, () => {
                    const objects = staticCanvas.getObjects().filter((obj: any) =>
                        obj.visible &&
                        !(obj as any).isPageBackground &&
                        !(obj as any).isPixelEraser &&
                        !(obj as any).isObjectEraser &&
                        !(obj as any).excludeFromExport
                    );

                    if (objects.length > 0) {
                        let maxY = 0;
                        objects.forEach((obj: any) => {
                            const bound = obj.getBoundingRect(true);
                            maxY = Math.max(maxY, bound.top + bound.height);
                        });

                        const PADDING_BOTTOM = 40;
                        const MIN_HEIGHT = 100;
                        const originalWidth = staticCanvas.getWidth() || 800;
                        const tightHeight = Math.max(MIN_HEIGHT, maxY + PADDING_BOTTOM);

                        staticCanvas.setDimensions({
                            width: originalWidth,
                            height: tightHeight
                        });

                        staticCanvas.backgroundColor = undefined;
                        staticCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
                        staticCanvas.renderAll();

                        setPreviewSrc(staticCanvas.toDataURL({
                            format: "png",
                            quality: 1,
                            enableRetinaScaling: true
                        }));
                    } else {
                        setPreviewSrc(null);
                    }
                    staticCanvas.dispose();
                    setIsLoading(false);
                });
            } catch (e) {
                console.error("Fabric load preview error:", e);
                setIsLoading(false);
            }
        }).catch(err => {
            console.error("Fabric import error:", err);
            setIsLoading(false);
        });
    }, [data]);

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleSave = (json: string) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if ($isHandwritingNode(node)) {
                node.setData(json);
            }
        });
    };

    const handleClose = () => {
        setIsModalOpen(false);
    };



    return (
        <>
            <DrawingWidget onClick={handleOpenModal} className={isSelected ? "selected" : ""}>
                {isLoading ? (
                    <div style={{ padding: "20px", color: "#adb5bd", fontSize: "0.8rem", fontStyle: "italic" }}>
                        {language === "ko" ? "불러오는 중..." : "Loading..."}
                    </div>
                ) : previewSrc ? (
                    <PreviewImage src={previewSrc} alt="Handwriting Preview" />
                ) : (
                    <div style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", color: "#868e96" }}>
                        <FiPenTool size={24} />
                        <span style={{ fontSize: "13px" }}>
                            {language === "ko" ? "기록된 필기 없음 (클릭하여 시작)" : "No handwriting (Click to start)"}
                        </span>
                    </div>
                )}
                <EditOverlay className="edit-overlay">
                    {language === "ko" ? "수정" : "Edit"}
                </EditOverlay>
            </DrawingWidget>

            {isModalOpen && (
                <FabricCanvasModal
                    initialData={data}
                    onSave={handleSave}
                    onAutosave={handleSave}
                    onClose={handleClose}
                    language={language as any}
                />
            )}
        </>
    );
}
