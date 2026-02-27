import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { $getNodeByKey } from "lexical";
import React, { useState, Suspense } from "react";
import { SpreadsheetModal } from "@memosuite/shared-spreadsheet";
import { useLanguage } from "../../../i18n";
import { $isSpreadsheetNode } from "../nodes/SpreadsheetNode";
import { SpreadsheetPreviewWidget } from "../../SpreadsheetPreviewWidget";

export default function SpreadsheetComponent({
    nodeKey,
    data,
}: {
    nodeKey: string;
    data: string;
}): React.ReactNode {
    const [editor] = useLexicalComposerContext();
    const [isSelected] = useLexicalNodeSelection(nodeKey);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { language } = useLanguage();

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleSave = (dataValue: any) => {
        const json = typeof dataValue === 'string' ? dataValue : JSON.stringify(dataValue);
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if ($isSpreadsheetNode(node)) {
                node.setData(json);
            }
        });
    };

    const handleClose = () => {
        setIsModalOpen(false);
    };

    return (
        <Suspense fallback={null}>
            <div className={isSelected ? "selected" : ""}>
                <SpreadsheetPreviewWidget
                    data={data}
                    onClick={handleOpenModal}
                    language={language}
                />
            </div>

            {isModalOpen && (
                <SpreadsheetModal
                    isOpen={isModalOpen}
                    initialData={(() => {
                        try { return data ? JSON.parse(data) : undefined; } catch { return undefined; }
                    })()}
                    onSave={handleSave}
                    onClose={handleClose}
                    language={language as any}
                />
            )}
        </Suspense>
    );
}
