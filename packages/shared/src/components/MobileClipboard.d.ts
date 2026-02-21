import { MutableRefObject } from 'react';
/**
 * useMobileClipboard — Galaxy Tab 복사/붙여넣기 우회
 *
 * CodeMirror의 long-press 컨텍스트 메뉴 버그를 우회하기 위해
 * 에디터 툴바에 복사/잘라내기/붙여넣기 버튼을 추가합니다.
 * 클립보드 읽기 권한이 거부되면 붙여넣기용 바텀시트 다이얼로그를 표시합니다.
 */
export declare const useMobileClipboard: (cmRef: MutableRefObject<any>, language: string) => {
    clipboardButtons: {
        name: string;
        action: () => void;
        className: string;
        title: string;
    }[];
    renderPasteSheet: () => import("react/jsx-runtime").JSX.Element | null;
};
