/**
 * useCopyMode — Galaxy Tab 전용 복사/붙여넣기 우회
 *
 * CodeMirror의 contenteditable 버그를 완전 우회합니다.
 * 활성화하면 네이티브 <textarea>가 전체 화면을 덮어,
 * 일반적인 long-press → 선택 → 복사/붙여넣기가 정상 작동합니다.
 */
export declare const useCopyMode: (value: string, onChange: (value: string) => void, language: string) => {
    isCopyMode: boolean;
    enterCopyMode: () => void;
    renderOverlay: () => import("react/jsx-runtime").JSX.Element | null;
};
