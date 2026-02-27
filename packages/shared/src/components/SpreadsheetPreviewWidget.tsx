import React, { useMemo } from 'react';
import styled from 'styled-components';

interface SpreadsheetPreviewWidgetProps {
    data: string;
    onClick?: () => void;
    language?: string;
}

const WidgetContainer = styled.div<{ $interactive: boolean }>`
  background: transparent;
  border: 1px solid #edf2f7;
  border-left: 4px solid #00acc1;
  border-radius: 8px;
  margin: 12px 0;
  padding: 0 !important;
  cursor: ${props => props.$interactive ? 'pointer' : 'default'};
  user-select: none;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    ${props => props.$interactive && `
      background: #f8f9fa;
      border-color: #cbd5e0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);

      .edit-overlay {
        opacity: 1;
      }
    `}
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

const TableContainer = styled.div`
  width: 100%;
  overflow: hidden;
  background-color: transparent;
  margin: 0 !important;
  padding: 0 !important;
`;

const StyledTable = styled.table`
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: normal;
  margin: 0 !important;
  padding: 0 !important;
`;

const Th = styled.th`
  background: #f8f9fa;
  border: 1px solid #d1d5db;
  height: 22px;
  padding: 0 4px;
  font-weight: 500;
  color: #666;
  text-align: center;
`;

const Td = styled.td`
  border: 1px solid #d1d5db;
  height: 22px;
  padding: 0 4px;
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

export const SpreadsheetPreviewWidget: React.FC<SpreadsheetPreviewWidgetProps> = ({
    data,
    onClick,
    language = 'en'
}) => {
    const preview = useMemo(() => {
        if (!data) return null;
        try {
            // Clean data: remove ZWSP and trim
            const cleanData = data.replace(/\u200B/g, '').trim();
            const parsed = JSON.parse(cleanData);

            // Support both array and single object formats
            const sheet = Array.isArray(parsed) ? parsed[0] : parsed;
            if (!sheet) return null;

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
                        if (cell !== null && cell !== undefined) {
                            if (typeof cell === 'object') {
                                grid[r][c] = cell.m ?? cell.v ?? "";
                            } else {
                                grid[r][c] = String(cell);
                            }
                        } else {
                            grid[r][c] = "";
                        }
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
                        const val = cell.v?.m ?? cell.v?.v ?? String(cell.v ?? "");
                        grid[cell.r][cell.c] = val;
                    }
                });

                maxRow = displayMaxRow;
                maxCol = displayMaxCol;
            }

            return { grid, maxRow, maxCol };
        } catch (e) {
            console.error('SpreadsheetPreviewWidget parsing error:', e);
            return null;
        }
    }, [data]);

    return (
        <WidgetContainer $interactive={!!onClick} onClick={onClick}>
            {preview ? (
                <TableContainer>
                    <StyledTable>
                        <thead>
                            <tr>
                                <Th style={{ width: "36px", minWidth: "36px" }}>#</Th>
                                {Array.from({ length: preview.maxCol + 1 }).map((_, c) => (
                                    <Th key={c}>{String.fromCharCode(65 + c)}</Th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {preview.grid.map((row, r) => (
                                <tr key={r}>
                                    <Td style={{ background: "#f8f9fa", textAlign: "center", fontSize: "11px", color: "#666", width: "36px", minWidth: "36px" }}>{r + 1}</Td>
                                    {row.map((val, c) => (
                                        <Td key={c}>{val}</Td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </StyledTable>
                </TableContainer>
            ) : (
                <EmptyState>
                    <div style={{ fontSize: "20px" }}>📊</div>
                    <div>
                        <div style={{ fontWeight: 600, color: "#343a40" }}>
                            {language === "ko" ? "스프레드시트 (비어 있음)" : "Spreadsheet (Empty)"}
                        </div>
                        <div style={{ fontSize: "11px", color: "#868e96" }}>
                            {onClick ? (language === "ko" ? "클릭하여 편집" : "Click to open editor") : (language === "ko" ? "데이터 없음" : "No data")}
                        </div>
                    </div>
                </EmptyState>
            )}
            {onClick && (
                <EditOverlay className="edit-overlay">
                    {language === "ko" ? "수정" : "Edit"}
                </EditOverlay>
            )}
        </WidgetContainer>
    );
};
