export declare const ToolbarButton: import("node_modules/styled-components/dist/types").IStyledComponentBase<"web", import("styled-components").FastOmit<import("react").DetailedHTMLProps<import("react").ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>, never>> & string;
export declare function ToolbarPlugin(props: {
    onToggleSidebar?: () => void;
    defaultFontSize?: number;
    onSave?: () => void;
    onExit?: () => void;
    onDelete?: () => void;
    saveLabel?: string;
    exitLabel?: string;
    deleteLabel?: string;
    saveDisabled?: boolean;
    stickyOffset?: number;
    customButtons?: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
