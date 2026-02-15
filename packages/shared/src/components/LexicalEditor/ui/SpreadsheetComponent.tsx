import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { $getNodeByKey } from "lexical";
import { useState, useMemo } from "react";
import styled from "styled-components";
import { SpreadsheetModal } from "@memosuite/shared-spreadsheet";
import { useLanguage } from "../../../i18n";
import { $isSpreadsheetNode } from "../nodes/SpreadsheetNode";

const SpreadsheetWidget = styled.div`
  background: #fcfcfd;
  border: 1px solid #edf2f7;
  border-left: 4px solid #00acc1;
  border-radius: 8px;
  margin: 12px 0;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    background: #f8f9fa;
    border-color: #cbd5e0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);

    .edit-overlay {
      opacity: 1;
    }
  }
`;

const EditOverlay = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #00acc1;
  font-weight: 600;
  border: 1px solid #edf2f7;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
`;

const PreviewContainer = styled.div`
  overflow: auto;
  max-height: 400px;
  background-color: #fff;
`;

const Table = styled.table`
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 20px;
`;

const Th = styled.th`
  background: #f8f9fa;
  border: 1px solid #d1d5db;
  height: 20px;
  padding: 0 8px;
  font-weight: 500;
  color: #666;
  text-align: center;
`;

const Td = styled.td`
  border: 1px solid #d1d5db;
  height: 20px;
  padding: 0 6px;
  min-width: 60px;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
  vertical-align: middle;
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  color: #868e96;
  font-size: 14px;
`;

export default function SpreadsheetComponent({
    nodeKey,
    data,
}: {
    nodeKey: string;
    data: string;
}): JSX.Element {
    const [editor] = useLexicalComposerContext();
    const [isSelected] = useLexicalNodeSelection(nodeKey);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { language } = useLanguage();

    const preview = useMemo(() => {
        if (!data) return null;
        try {
            const parsed = JSON.parse(data);
            if (!Array.isArray(parsed) || parsed.length === 0) return null;

            const sheet = parsed[0];
            const celldata = sheet.celldata || [];
            const matrixData = sheet.data;

            const hasCelldata = Array.isArray(celldata) && celldata.length > 0;
            const hasMatrixData = Array.isArray(matrixData) && matrixData.length > 0;

            if (!hasCelldata && !hasMatrixData) return null;

            let maxRow = 0;
            let maxCol = 0;
            const grid: any[][] = [];

            if (hasMatrixData) {
                maxRow = Math.min(matrixData.length - 1, 30);
                for (let r = 0; r <= maxRow; r++) {
                    grid[r] = [];
                    const row = matrixData[r] || [];
                    maxCol = Math.max(maxCol, row.length - 1);
                    for (let c = 0; c < row.length && c <= 10; c++) {
                        const cell = row[c];
                        grid[r][c] = cell?.m || cell?.v || "";
                    }
                }
                maxCol = Math.min(maxCol, 10);
            } else if (hasCelldata) {
                celldata.forEach((cell: any) => {
                    if (cell.r > maxRow) maxRow = cell.r;
                    if (cell.c > maxCol) maxCol = cell.c;
                });

                const displayMaxRow = Math.min(maxRow, 30);
                const displayMaxCol = Math.min(maxCol, 10);

                for (let r = 0; r <= displayMaxRow; r++) {
                    grid[r] = [];
                    for (let c = 0; c <= displayMaxCol; c++) {
                        grid[r][c] = "";
                    }
                }

                celldata.forEach((cell: any) => {
                    if (cell.r <= displayMaxRow && cell.c <= displayMaxCol) {
                        const val = cell.v?.m || cell.v?.v || "";
                        grid[cell.r][cell.c] = val;
                    }
                });

                maxRow = displayMaxRow;
                maxCol = displayMaxCol;
            }

            return { grid, maxRow: Math.min(maxRow, 30), maxCol: Math.min(maxCol, 10) };
        } catch (e) {
            return null;
        }
    }, [data]);

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleSave = (data: any) => {
        const json = typeof data === 'string' ? data : JSON.stringify(data);
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
        <>
            <SpreadsheetWidget onClick={handleOpenModal} className={isSelected ? "selected" : ""}>
                {preview ? (
                    <PreviewContainer>
                        <Table>
                            <thead>
                                <tr>
                                    <Th style={{ width: "32px" }}>#</Th>
                                    {Array.from({ length: preview.maxCol + 1 }).map((_, c) => (
                                        <Th key={c}>{String.fromCharCode(65 + c)}</Th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.grid.map((row, r) => (
                                    <tr key={r}>
                                        <Td style={{ background: "#f8f9fa", textAlign: "center", fontSize: "11px", color: "#666" }}>{r + 1}</Td>
                                        {row.map((val, c) => (
                                            <Td key={c}>{val}</Td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </PreviewContainer>
                ) : (
                    <EmptyState>
                        <div style={{ fontSize: "20px" }}>📊</div>
                        <div>
                            <div style={{ fontWeight: 600, color: "#343a40" }}>
                                {language === "ko" ? "스프레드시트 (비어 있음)" : "Spreadsheet (Empty)"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#868e96" }}>
                                {language === "ko" ? "클릭하여 편집" : "Click to open editor"}
                            </div>
                        </div>
                    </EmptyState>
                )}
                <EditOverlay className="edit-overlay">
                    {language === "ko" ? "수정" : "Edit"}
                </EditOverlay>
            </SpreadsheetWidget>

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
        </>
    );
}
