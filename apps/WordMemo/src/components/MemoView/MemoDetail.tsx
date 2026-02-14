import React, { useState, useEffect, useRef } from "react";
import {
  SyncModal,
  useModal,
  useLanguage,
  prepareThreadForNewItem,
  buildThreadNavigationUrl,
  extractThreadContext,
  PrintSettingsModal,
} from "@memosuite/shared";

import styled from "styled-components";
import {
  useParams,
  useNavigate,
  useSearchParams,
  useOutletContext,
  useLocation,
} from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type CommentDraft } from "../../db";
import { useSearch } from "../../contexts/SearchContext";
import { useStudyMode } from "../../contexts/StudyModeContext";

import { MarkdownEditor } from "../Editor/MarkdownEditor";
import { MarkdownView } from "../Editor/MarkdownView";
import { BlurredText } from "../UI/BlurredText";

import { wordMemoSyncAdapter } from "../../utils/backupAdapter";
import {
  FiEdit2,
  FiTrash2,
  FiSave,
  FiX,
  FiShare2,
  FiBookOpen,
  FiCoffee,
  FiStar,
  FiList,
  FiPlus,
  FiFolder,
  FiGitMerge,
  FiArrowRightCircle,
  FiArrowUp,
  FiArrowDown,
  FiPrinter,
} from "react-icons/fi";
import {
  useExitGuard,
  ExitGuardResult,
  FabricCanvasModal,
} from "@memosuite/shared-drawing";
import { SpreadsheetModal } from "@memosuite/shared-spreadsheet";
import { BulkAddModal } from "./BulkAddModal";
import { FolderMoveModal } from "../FolderView/FolderMoveModal";
import { useFolder } from "../../contexts/FolderContext";
import { format } from "date-fns";
import { CommentsSection } from "./CommentsSection";
import { DeleteChoiceModal } from "./DeleteChoiceModal";
import { StarButton } from "../Sidebar/itemStyles";

import { Toast } from "../UI/Toast";
import { FiAlertTriangle } from "react-icons/fi";

const MainWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
`;

const ScrollContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  width: 100%;
  background-color: ${({ theme }) => theme.colors.background};
  scroll-padding-top: var(--sticky-offset, 0px);
`;

const GoToTopButton = styled.button<{ $show: boolean }>`
  position: absolute;
  bottom: 32px;
  right: 32px;
  width: 52px;
  height: 52px;
  border-radius: 26px;
  background: ${({ theme }) =>
    `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryHover || theme.colors.primary})`};
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${({ theme }) =>
    theme.shadows.large || "0 8px 25px rgba(0, 0, 0, 0.2)"};
  z-index: 10000;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  opacity: ${({ $show }) => ($show ? 1 : 0)};
  transform: scale(${({ $show }) => ($show ? 1 : 0.5)})
    translateY(${({ $show }) => ($show ? "0" : "30px")});
  pointer-events: ${({ $show }) => ($show ? "auto" : "none")};

  &:hover {
    transform: scale(1.1) translateY(-4px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
  }

  &:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    bottom: 24px;
    right: 20px;
    width: 48px;
    height: 48px;
  }
`;

const Header = styled.div`
  margin: 0;
  padding: ${({ theme }) =>
    `${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.sm}`};
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 768px) {
    padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.xs}`};
  }
`;

const ContentPadding = styled.div`
  padding: ${({ theme }) => `0 ${theme.spacing.md}`};
  flex: 1;

  @media (max-width: 768px) {
    padding: 0 ${({ theme }) => theme.spacing.xs};
  }
`;

const CommentsWrapper = styled.div`
  padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.md}`};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing.sm}
      ${({ theme }) => theme.spacing.xs};
  }
`;

const TitleInput = styled.input`
  font-size: 2.25rem;
  font-weight: 800;
  width: 100%;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  letter-spacing: -0.04em;

  &:focus {
    outline: none;
  }

  &::placeholder {
    opacity: 0.3;
  }
`;

const TitleDisplay = styled.h1`
  font-size: 2.25rem;
  font-weight: 900;
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: -0.04em;
  background: ${({ theme }) =>
    `linear-gradient(135deg, ${theme.colors.text}, ${theme.colors.primary})`};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.9rem;
  flex-wrap: wrap;
  font-weight: 500;
`;

const TagInput = styled.input`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.medium};
  font-size: 0.85rem;
  transition: ${({ theme }) => theme.effects.transition};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}22;
  }
`;

const ActionBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.md}`};
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: sticky;
  top: 0;
  z-index: 5;

  @media (max-width: 768px) {
    padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.xs}`};
  }

  @media (max-width: 480px) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: ${({ theme }) => theme.spacing.xs};
    height: auto;
  }
`;

const ResponsiveGroup = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    display: contents;
  }
`;

const ButtonGroup = styled.div<{ $flex?: number }>`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  ${({ $flex }) => $flex !== undefined && `flex: ${$flex};`}

  @media (max-width: 480px) {
    display: contents;
  }
`;

const ActionButton = styled.button<{
  $variant?: "primary" | "danger" | "cancel";
  $mobileOrder?: number;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: ${({ theme }) => theme.radius.small};
  border: 1px solid
    ${({ theme, $variant }) =>
    $variant === "primary"
      ? theme.colors.primary
      : $variant === "danger"
        ? theme.colors.border
        : theme.colors.border};
  background: ${({ theme, $variant }) =>
    $variant === "primary"
      ? theme.colors.primary
      : $variant === "danger"
        ? "transparent"
        : $variant === "cancel"
          ? "transparent"
          : "transparent"};
  color: ${({ theme, $variant }) =>
    $variant === "primary"
      ? "#fff"
      : $variant === "danger"
        ? theme.colors.danger
        : $variant === "cancel"
          ? theme.colors.textSecondary
          : theme.colors.text};
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  transition: ${({ theme }) => theme.effects.transition};

  @media (max-width: 480px) {
    ${({ $mobileOrder }) =>
    $mobileOrder !== undefined && `order: ${$mobileOrder};`}
    &.hide-on-mobile {
      display: none !important;
    }
  }

  &:hover {
    background: ${({ theme, $variant }) =>
    $variant === "primary"
      ? theme.colors.primaryHover
      : $variant === "danger"
        ? `${theme.colors.danger}08`
        : $variant === "cancel"
          ? `${theme.colors.textSecondary}08`
          : theme.colors.background};
    transform: translateY(-1px);
    ${({ theme, $variant }) =>
    $variant === "danger" && `border-color: ${theme.colors.danger};`}
    ${({ theme, $variant }) =>
    $variant === "cancel" && `border-color: ${theme.colors.textSecondary};`}
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
`;

const SourceSelect = styled.select`
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.medium};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: ${({ theme }) => theme.effects.transition};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const GoToBottomButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.small};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  transition: ${({ theme }) => theme.effects.transition};
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    color: white;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ContentWrapper = styled.div<{ $isBlurred?: boolean }>`
  position: relative;
  transition:
    filter 0.4s ease,
    opacity 0.4s ease;

  ${({ $isBlurred }) =>
    $isBlurred &&
    `
    filter: blur(20px);
    opacity: 0.4;
    cursor: pointer;
    
    &:hover {
      filter: blur(0);
      opacity: 1;
    }
  `}
`;

export const MemoDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { setSearchQuery } = useSearch();
  const { t, language } = useLanguage();
  const { confirm, choice, prompt: modalPrompt } = useModal();

  // Guard Hook
  const { registerGuard, unregisterGuard } = useExitGuard();
  const [showExitToast, setShowExitToast] = useState(false);
  const lastBackPress = useRef(0);
  const isClosingRef = useRef(false);

  const isNew = id === undefined;

  // Track Sidebar interactions via t parameter to ensure stable modal opening
  const tParam = searchParams.get("t");
  const prevTParam = useRef<string | null>(null);
  const currentAutosaveIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    currentAutosaveIdRef.current = undefined;
    restoredIdRef.current = null;
    setCommentDraft(null);
    setIsEditing(id === undefined);
    if (id) {
      localStorage.setItem("wordmemo_last_word_id", id);
    }
    isClosingRef.current = false;

    // Reset state to avoid stale data when switching words
    setTitle("");
    setContent("");
    setTags("");
  }, [id]);

  const [isEditing, setIsEditing] = useState(isNew);
  const [showGoToTop, setShowGoToTop] = useState(false);
  const [prevScrollRatio, setPrevScrollRatio] = useState<number | undefined>(
    undefined,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [folderMoveToast, setFolderMoveToast] = useState<string | null>(null);

  const [headerHeight, setHeaderHeight] = useState(0);
  const actionBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!actionBarRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeaderHeight(entry.contentRect.height);
      }
    });
    observer.observe(actionBarRef.current);
    return () => observer.disconnect();
  }, [isEditing]); // re-observe when editing toggles as action bar content changes

  const handleGoToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    if (tParam && tParam !== prevTParam.current) {
      prevTParam.current = tParam;

      // Reset editing states for fresh requests
      setEditingDrawingData(undefined);
      setEditingSpreadsheetData(undefined);

      if (isNew) {
        setContent("");
        setTitle("");
        setTags("");
        setSourceId(undefined);
      }

      // Re-trigger modal if URL state indicates it should be open
      if (searchParams.get("drawing") === "true") {
        fabricCheckpointRef.current = content;
        setIsFabricModalOpen(true);
      }
      if (searchParams.get("spreadsheet") === "true") {
        setIsSpreadsheetModalOpen(true);
      }
    }
  }, [tParam, searchParams, isNew]);

  // Recover spreadsheet data from navigation state if available (e.g. after initial save of new memo)
  useEffect(() => {
    if (location.state?.spreadsheetData && location.state?.spreadsheetJson) {
      setEditingSpreadsheetData(location.state.spreadsheetData);
      originalSpreadsheetJsonRef.current = location.state.spreadsheetJson;
      setIsSpreadsheetModalOpen(true);
    }
  }, [location.state]);

  const handleStartEdit = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const ratio = scrollTop / (scrollHeight - clientHeight || 1);
      setPrevScrollRatio(ratio);
    }
    setIsEditing(true);
    window.history.pushState({ editing: true, isGuard: true }, "");
  };
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState(""); // Comma separated for editing
  const [sourceId, setSourceId] = useState<number | undefined>(undefined);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingThreadHead, setIsDeletingThreadHead] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingDrawingData, setEditingDrawingData] = useState<
    string | undefined
  >(undefined);
  const [editingSpreadsheetData, setEditingSpreadsheetData] =
    useState<any>(undefined);
  const originalSpreadsheetJsonRef = useRef<string | null>(null); // Store original JSON string for accurate matching
  const [isDeleting, setIsDeleting] = useState(false);
  const fabricCheckpointRef = useRef<string | null>(null);
  const spreadsheetCheckpointRef = useRef<string | null>(null);
  const [isFolderMoveModalOpen, setIsFolderMoveModalOpen] = useState(false);
  const { currentFolder, currentFolderId } = useFolder();
  const isReadOnly = currentFolder?.isReadOnly || false;

  const [commentDraft, setCommentDraft] = useState<CommentDraft | null>(null);
  const commentDraftRef = useRef<CommentDraft | null>(null);
  useEffect(() => {
    commentDraftRef.current = commentDraft;
  }, [commentDraft]);
  const restoredIdRef = useRef<string | null>(null);

  const [prevId, setPrevId] = useState(id);
  if (id !== prevId) {
    setPrevId(id);
    setTitle("");
    setContent("");
    setTags("");
    setSourceId(undefined);
    setCommentDraft(null);
    setIsEditing(id === undefined);
    isClosingRef.current = false;
  }

  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (isEditing) {
      const guardId = "word-edit-guard";
      registerGuard(guardId, () => {
        // If any modal is open, let its own guard handle the back navigation
        if (
          isFabricModalOpen ||
          isSpreadsheetModalOpen ||
          showShareModal ||
          isDeleteModalOpen ||
          showBulkAdd
        ) {
          return ExitGuardResult.CONTINUE;
        }

        if (isClosingRef.current || !isCurrentlyDirty) {
          setIsEditing(false);
          currentAutosaveIdRef.current = undefined;
          restoredIdRef.current = null;
          return ExitGuardResult.ALLOW_NAVIGATION;
        }

        const now = Date.now();
        if (now - lastBackPress.current < 2000) {
          isClosingRef.current = true;
          setIsEditing(false);
          currentAutosaveIdRef.current = undefined;
          restoredIdRef.current = null;
          return ExitGuardResult.ALLOW_NAVIGATION;
        } else {
          lastBackPress.current = now;
          setShowExitToast(true);
          return ExitGuardResult.PREVENT_NAVIGATION;
        }
      });

      return () => unregisterGuard(guardId);
    }
  }, [
    isEditing,
    registerGuard,
    unregisterGuard,
    isFabricModalOpen,
    showShareModal,
    isDeleteModalOpen,
    isSpreadsheetModalOpen,
    showBulkAdd,
  ]);

  // Memoize drawing data extraction to prevent unnecessary re-computations or modal glitches
  const contentDrawingData = React.useMemo(() => {
    const match = content.match(/```fabric\s*([\s\S]*?)\s*```/);
    return match ? match[1] : undefined;
  }, [content]);
  const { studyMode } = useStudyMode();

  const lastSavedState = useRef({
    title,
    content,
    tags,
    sourceId,
    commentDraft,
  });

  const word = useLiveQuery(
    () => (id ? db.words.get(Number(id)) : undefined),
    [id],
  );

  const { setIsDirty, setAppIsEditing, movingWordId, setMovingWordId } =
    useOutletContext<{
      setIsDirty: (d: boolean) => void;
      setAppIsEditing: (e: boolean) => void;
      movingWordId?: number | null;
      setMovingWordId?: (id: number | null) => void;
    }>() || {};

  const hasDraftChanges = !!commentDraft;
  const isCurrentlyDirty = !!(isNew
    ? title.trim() || content.trim() || tags.trim() || hasDraftChanges
    : !!word &&
    ((title || "").trim() !== (word.title || "").trim() ||
      (content || "") !== (word.content || "") ||
      (tags || "").trim() !== (word.tags.join(", ") || "").trim() ||
      (sourceId || null) !== (word.sourceId || null) ||
      hasDraftChanges));

  useEffect(() => {
    setIsDirty(isEditing || hasDraftChanges);
    if (setAppIsEditing) setAppIsEditing(isEditing);
    return () => {
      setIsDirty(false);
      if (setAppIsEditing) setAppIsEditing(false);
    };
  }, [isEditing, hasDraftChanges, setIsDirty, setAppIsEditing]);

  // scroll 이벤트 리스너 등록 (log가 로드된 후)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowGoToTop(container.scrollTop > 300);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [word]);

  const isPlaceholder = !isNew && id && !word?.title && !word?.content;

  const handleToggleStar = async () => {
    if (!id || !word) return;
    await db.words.update(Number(id), { isStarred: word.isStarred ? 0 : 1 });
  };

  const handleBulkConfirm = async (
    items: { word: string; meaning: string }[],
    createAsThread: boolean,
  ) => {
    const now = new Date();
    const baseSourceId = sourceId || sources?.[0]?.id;
    const tagsToUse = word?.tags || [];

    let targetThreadId = word?.threadId;
    let nextOrder = 0;

    if (createAsThread) {
      // Force create a new thread with these items
      targetThreadId = crypto.randomUUID();
      nextOrder = 0;
    } else if (targetThreadId) {
      // Append to existing thread context
      const members = await db.words
        .where("threadId")
        .equals(targetThreadId)
        .toArray();
      nextOrder = Math.max(...members.map((m) => m.threadOrder || 0)) + 1;
    }

    await db.transaction("rw", db.words, async () => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await db.words.add({
          title: item.word,
          content: `> ${item.meaning}`,
          tags: tagsToUse,
          sourceId: baseSourceId,
          createdAt: new Date(now.getTime() + i),
          updatedAt: new Date(now.getTime() + i),
          isStarred: 1,
          threadId: targetThreadId,
          threadOrder: targetThreadId ? nextOrder + i : undefined,
        });
      }
    });

    if (isPlaceholder) {
      // Delete the placeholder word as it was just a container for the 'Add Thread' action
      await db.words.delete(Number(id));
      await db.comments.where("wordId").equals(Number(id)).delete();
    }

    setShowBulkAdd(false);
    setToastMessage(`${items.length} items added`);
    if (isNew || isPlaceholder) {
      navigate("/", { replace: true });
    }
  };

  const sources = useLiveQuery(() => db.sources.orderBy("order").toArray());
  const llmProviders = useLiveQuery(() => db.llmProviders.toArray());

  const loadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Ensure word.id matches current URL id to prevent showing stale data
    if (id && word && word.id !== Number(id)) return;
    if (word && word.id === Number(id) && loadedIdRef.current !== id) {
      const loadData = async () => {
        const tagsStr = word.tags.join(", ");

        // Check for autosave for initial display
        const existing = await db.autosaves
          .where("originalId")
          .equals(Number(id))
          .reverse()
          .sortBy("createdAt");

        let initialTitle = word.title;
        let initialContent = word.content;
        let initialTagsStr = tagsStr;
        let initialSourceId = word.sourceId;
        let initialCommentDraft: CommentDraft | null = null;

        if (existing.length > 0) {
          const draft = existing[0];
          initialTitle = draft.title;
          initialContent = draft.content;
          initialTagsStr = draft.tags.join(", ");
          initialSourceId = draft.sourceId;
          initialCommentDraft = draft.commentDraft || null;

          // Resume autosave session and mark as restored
          currentAutosaveIdRef.current = draft.id;
          restoredIdRef.current = id || null;
        }

        setTitle(initialTitle);
        setContent(initialContent);
        setTags(initialTagsStr);
        setSourceId(initialSourceId);
        setCommentDraft(initialCommentDraft);

        // Initialize lastSavedState with initial values
        lastSavedState.current = {
          title: initialTitle,
          content: initialContent,
          tags: initialTagsStr,
          sourceId: initialSourceId,
          commentDraft: initialCommentDraft,
        };
        loadedIdRef.current = id || null;
      };
      loadData();
    }

    if (word) {
      const shouldEdit = searchParams.get("edit") === "true";
      if (shouldEdit && !isEditing) {
        setIsEditing(true);
        const params = new URLSearchParams(searchParams);
        params.delete("edit");
        const search = params.toString();
        navigate(
          {
            pathname: location.pathname,
            search: search ? `?${search}` : "",
          },
          { replace: true, state: { editing: true, isGuard: true } },
        );
      }

      // Restoration prompt for existing word
      const checkExistingAutosave = async () => {
        if (
          !isEditing &&
          !shouldEdit &&
          !searchParams.get("comment") &&
          searchParams.get("restore") !== "true"
        )
          return;

        // Don't restore if we already restored/checked in this edit session
        if (isEditing && restoredIdRef.current === id) return;

        const existing = await db.autosaves
          .where("originalId")
          .equals(Number(id))
          .reverse()
          .sortBy("createdAt");

        if (existing.length > 0) {
          const draft = existing[0];
          const hasLogChanges =
            draft.content !== word.content || draft.title !== word.title;
          const hasCommentDraft = !!draft.commentDraft;

          if (hasLogChanges || hasCommentDraft) {
            setTitle(draft.title);
            setContent(draft.content);
            const tagsStr = draft.tags.join(", ");
            setTags(tagsStr);
            setSourceId(draft.sourceId);
            if (draft.commentDraft) {
              setCommentDraft(draft.commentDraft);
            }

            // Also update lastSavedState to match the restored draft
            lastSavedState.current = {
              title: draft.title,
              content: draft.content,
              tags: tagsStr,
              sourceId: draft.sourceId,
              commentDraft: draft.commentDraft || null,
            };
          }
        }
        if (isEditing) restoredIdRef.current = id || null;
      };
      checkExistingAutosave();
    } else if (isNew && loadedIdRef.current !== "new") {
      const threadContext = extractThreadContext(searchParams);
      setTitle("");
      setContent("");
      setTags(threadContext?.inheritedTags?.join(", ") || "");
      setEditingDrawingData(undefined);
      setEditingSpreadsheetData(undefined);
      setSourceId(threadContext?.inheritedSourceId || undefined);
      setCommentDraft(null);
      setIsEditing(true);
      loadedIdRef.current = "new";

      if (searchParams.get("drawing") === "true") {
        setIsFabricModalOpen(true);
      }

      // Restoration for new word: Automatically restore without asking
      const checkNewAutosave = async () => {
        const latest = await db.autosaves
          .filter((a) => a.originalId === undefined)
          .reverse()
          .sortBy("createdAt");

        if (latest.length > 0) {
          const draft = latest[0];
          if (
            draft.content.trim() ||
            draft.title.trim() ||
            draft.commentDraft
          ) {
            setTitle(draft.title);
            setContent(draft.content);
            const tagsStr = draft.tags.join(", ");
            setTags(tagsStr);
            setSourceId(draft.sourceId);
            if (draft.commentDraft) {
              setCommentDraft(draft.commentDraft);
            }

            // Also update lastSavedState to match the restored draft
            lastSavedState.current = {
              title: draft.title,
              content: draft.content,
              tags: tagsStr,
              sourceId: draft.sourceId,
              commentDraft: draft.commentDraft || null,
            };
          }
        }
      };
      checkNewAutosave();
    }
  }, [word, isNew, id, searchParams, isEditing]);

  useEffect(() => {
    const initSource = async () => {
      if (isNew && !sourceId && sources && sources.length > 0) {
        const lastIdStr = localStorage.getItem("wm_last_source_id");
        const lastId = lastIdStr ? Number(lastIdStr) : null;
        const lastFound = lastId ? sources.find((s) => s.id === lastId) : null;

        if (lastFound) {
          setSourceId(lastFound.id);
        } else {
          const defaultName = t.word_detail.unknown_source;
          const unknown = sources.find((s) => s.name === defaultName);
          if (unknown) {
            setSourceId(unknown.id);
          } else {
            // Create default source if it doesn't exist
            const newId = await db.sources.add({
              name: defaultName,
              order: 999,
            });
            setSourceId(newId as number);
          }
        }
      }
    };
    initSource();
  }, [isNew, sourceId, sources]);

  const currentStateRef = useRef({
    title,
    content,
    tags,
    sourceId,
    commentDraft,
  });
  useEffect(() => {
    currentStateRef.current = { title, content, tags, sourceId, commentDraft };
  }, [title, content, tags, sourceId, commentDraft]);

  useEffect(() => {
    const isEditingAnything =
      isEditing ||
      isFabricModalOpen ||
      isSpreadsheetModalOpen ||
      !!commentDraft;
    if (!isEditingAnything) return;

    const interval = setInterval(async () => {
      const {
        title: cTitle,
        content: cContent,
        tags: cTags,
        sourceId: cSourceId,
        commentDraft: cCommentDraft,
      } = currentStateRef.current;
      const currentTagArray = cTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const lastTagArray = lastSavedState.current.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const hasChanged =
        cTitle !== lastSavedState.current.title ||
        cContent !== lastSavedState.current.content ||
        String(cSourceId) !== String(lastSavedState.current.sourceId) ||
        JSON.stringify(currentTagArray) !== JSON.stringify(lastTagArray) ||
        JSON.stringify(cCommentDraft) !==
        JSON.stringify(lastSavedState.current.commentDraft);

      if (!hasChanged) return;
      if (!cTitle.trim() && !cContent.trim() && !cCommentDraft) return;

      const numericOriginalId = id ? Number(id) : undefined;

      if (numericOriginalId && !currentAutosaveIdRef.current) {
        await db.autosaves
          .where("originalId")
          .equals(numericOriginalId)
          .delete();
      }

      const autosaveData: any = {
        originalId: numericOriginalId,
        title: cTitle,
        content: cContent,
        tags: currentTagArray,
        sourceId: cSourceId ? Number(cSourceId) : undefined,
        commentDraft: cCommentDraft || undefined,
        createdAt: new Date(),
      };

      if (currentAutosaveIdRef.current) {
        autosaveData.id = currentAutosaveIdRef.current;
      }

      const newId = await db.autosaves.put(autosaveData);
      currentAutosaveIdRef.current = newId;
      lastSavedState.current = {
        title: cTitle,
        content: cContent,
        tags: cTags,
        sourceId: cSourceId,
        commentDraft: cCommentDraft,
      };

      // Keep only latest 20 autosaves
      const allAutosaves = await db.autosaves.orderBy("createdAt").toArray();
      if (allAutosaves.length > 20) {
        const toDelete = allAutosaves.slice(0, allAutosaves.length - 20);
        await db.autosaves.bulkDelete(toDelete.map((a) => a.id!));
      }
    }, 7000); // 7 seconds

    return () => clearInterval(interval);
  }, [
    id,
    isEditing,
    isFabricModalOpen,
    isSpreadsheetModalOpen,
    !!commentDraft,
  ]); // Removed word dependency to prevent interval reset on DB updates

  const handleSave = async (
    overrideTitle?: string,
    overrideContent?: string,
    _overrideSearch?: string,
    overrideState?: any,
  ) => {
    const tagArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const now = new Date();
    const currentContent =
      overrideContent !== undefined ? overrideContent : content;
    const currentTitle = (
      overrideTitle !== undefined ? overrideTitle : title
    ).trim();
    const untitled = t.word_detail.untitled;

    // Treat as untitled if empty OR matches the placeholder
    const isCurrentlyUntitled = !currentTitle || currentTitle === untitled;

    let finalTitle = currentTitle;
    if (isCurrentlyUntitled) {
      const contentFallback = currentContent
        .split("\n")[0]
        .replace(/[#*`\s]/g, " ")
        .trim()
        .substring(0, 50);
      finalTitle = contentFallback || untitled;
    }

    const derivedTitle = finalTitle;

    // Remember the last used source
    if (sourceId) {
      localStorage.setItem("wm_last_source_id", String(sourceId));
    }

    if (id) {
      await db.words.update(Number(id), {
        title: derivedTitle,
        content: currentContent,
        tags: tagArray,
        sourceId: sourceId ? Number(sourceId) : undefined,
        updatedAt: now,
      });

      // Clear edit param if present to prevent re-entering edit mode
      if (
        searchParams.get("edit") &&
        !isFabricModalOpen &&
        !isSpreadsheetModalOpen
      ) {
        navigate(`/word/${id}`, { replace: true });
      }

      // Cleanup autosaves for this word
      await db.autosaves.where("originalId").equals(Number(id)).delete();
      currentAutosaveIdRef.current = undefined;
      restoredIdRef.current = null;
      // setIsEditing(false); // Do not exit edit mode on save
    } else {
      // Extract thread context from URL params if present (from Append button)
      const threadContext = extractThreadContext(searchParams);

      const newId = await db.words.add({
        folderId:
          threadContext?.inheritedFolderId ?? currentFolderId ?? undefined,
        title: derivedTitle,
        content: currentContent,
        tags: threadContext?.inheritedTags ?? tagArray,
        sourceId:
          threadContext?.inheritedSourceId ??
          (sourceId ? Number(sourceId) : undefined),
        createdAt: now,
        updatedAt: now,
        isStarred: 1,
        threadId: threadContext?.threadId,
        threadOrder: threadContext?.threadOrder,
      });

      // Cleanup all new word autosaves
      await db.autosaves.filter((a) => a.originalId === undefined).delete();

      // Navigate without thread params to avoid re-applying on subsequent saves
      navigate(`/word/${newId}`, { replace: true, state: overrideState });
    }
  };

  const handleDelete = async () => {
    if (!id || !word) return;

    // Check if it's a thread head and has other logs
    const isHead = !!(word.threadId && word.threadOrder === 0);
    let hasOthers = false;

    if (isHead && word.threadId) {
      const threadLogs = await db.words
        .where("threadId")
        .equals(word.threadId)
        .toArray();
      hasOthers = threadLogs.length > 1;
    }

    setIsDeletingThreadHead(isHead && hasOthers);
    setIsDeleteModalOpen(true);
  };

  const performDeleteLogOnly = async () => {
    if (!id || !word) return;
    setIsDeleting(true);

    const threadId = word.threadId;
    const currentId = Number(id);

    await db.words.delete(currentId);
    await db.comments.where("wordId").equals(currentId).delete();

    if (threadId) {
      const remainingLogs = await db.words
        .where("threadId")
        .equals(threadId)
        .toArray();
      remainingLogs.sort((a, b) => (a.threadOrder || 0) - (b.threadOrder || 0));

      if (remainingLogs.length > 0) {
        // Re-sequence remaining logs to ensure there's a 0 order and it's contiguous
        await db.transaction("rw", db.words, async () => {
          for (let i = 0; i < remainingLogs.length; i++) {
            await db.words.update(remainingLogs[i].id!, { threadOrder: i });
          }
        });
      }
    }

    // Always clear last word ID and navigate to empty state after deletion as requested
    localStorage.removeItem("wordmemo_last_word_id");
    setIsDeleteModalOpen(false);
    navigate("/", { replace: true });
  };

  const performDeleteThread = async () => {
    if (!word || !word.threadId) return;
    setIsDeleting(true);

    const threadId = word.threadId;
    const threadLogs = await db.words
      .where("threadId")
      .equals(threadId)
      .toArray();
    const wordIds = threadLogs.map((l) => l.id!);

    await db.transaction("rw", [db.words, db.comments], async () => {
      await db.words.bulkDelete(wordIds);
      for (const lid of wordIds) {
        await db.comments.where("wordId").equals(lid).delete();
      }
    });

    // Clear last word ID to prevent auto-redirect by EmptyState
    localStorage.removeItem("wordmemo_last_word_id");

    setIsDeleteModalOpen(false);
    navigate("/", { replace: true });
  };
  const handleAddThread = async () => {
    if (!word || !id) return;

    try {
      const context = await prepareThreadForNewItem({
        currentItem: word,
        currentId: Number(id),
        table: db.words,
      });

      // Add sourceId to context for WordMemo-specific inheritance
      const enrichedContext = {
        ...context,
        inheritedSourceId: word.sourceId,
      };

      // Navigate to new word page with thread context (same pattern as sidebar)
      const url = buildThreadNavigationUrl("/word/new", enrichedContext, {
        edit: "true",
      });
      navigate(url, { replace: true, state: { isGuard: true } });
    } catch (error) {
      console.error("Failed to add thread:", error);
      await confirm({
        message: "Failed to add thread. Please try again.",
        cancelText: null,
      });
    }
  };

  const handleRandomWord = async () => {
    const savedLevel = localStorage.getItem("wordLevel");
    const level = savedLevel !== null ? Number(savedLevel) : 1;
    const provider = localStorage.getItem("llm_provider") || "ChatGPT";

    const levels = {
      0: "Elementary (Basic English for young learners)",
      1: "Beginner (Common daily words and simple phrases)",
      2: "Intermediate (Useful vocabulary for conversation and general reading)",
      3: "Advanced (Academic, professional, or complex literary terms)",
    };
    const levelStr = levels[level as keyof typeof levels] || levels[1];

    const recentLogs = await db.words
      .orderBy("createdAt")
      .reverse()
      .limit(100)
      .toArray();
    const recentWords = recentLogs
      .map((l) => l.title)
      .filter(Boolean)
      .join(", ");
    const exclusionClause = recentWords
      ? `\n\n(IMPORTANT: DO NOT recommend any of these words as I already have them in my list: ${recentWords})`
      : "";

    const prompt = `Recommend one English word or idiom for my level: ${levelStr}.${exclusionClause}
Please provide a detailed and friendly explanation for it.
Include:
1. Basic meaning and nuances
2. Usage context
3. A few more examples if possible

Please respond in Korean. Start directly with the word/idiom on the first line, followed by the explanation. Skip any introductory or concluding remarks (e.g., "Of course!", "Here is the word...").`;

    const providerObj = llmProviders?.find((p) => p.name === provider);
    const targetUrl = providerObj?.url || "https://chatgpt.com/";

    try {
      await navigator.clipboard.writeText(prompt);
      setToastMessage(
        `${provider} 프롬프트가 복사되었습니다! 새 창에 붙여넣어 주세요.`,
      );

      // Automatically set source to 'Random' if it exists
      const randomSource = sources?.find((s) => s.name === "Random");
      if (randomSource) {
        setSourceId(randomSource.id);
      }

      setTimeout(() => {
        window.open(targetUrl, "_blank");
      }, 1000);
    } catch (err) {
      console.error(err);
      setToastMessage("클립보드 복사에 실패했습니다.");
    }
  };

  const handleExample = async () => {
    const wordToUse = title || word?.title;
    if (!wordToUse) {
      setToastMessage("단어를 먼저 입력해 주세요.");
      return;
    }

    const provider = localStorage.getItem("llm_provider") || "ChatGPT";
    const prompt = `Please provide one natural and useful example sentence for the English word: "${wordToUse}".
Please provide the response in this exact format (no numbering, no extra text):

Example sentence in English
Korean translation of the sentence

Skip any introductory or concluding remarks.`;

    const providerObj = llmProviders?.find((p) => p.name === provider);
    const targetUrl = providerObj?.url || "https://chatgpt.com/";

    try {
      await navigator.clipboard.writeText(prompt);
      setToastMessage(
        `예문 프롬프트가 복사되었습니다! ${provider}에서 확인해 주세요.`,
      );

      setTimeout(() => {
        window.open(targetUrl, "_blank");
      }, 1000);
    } catch (err) {
      console.error(err);
      setToastMessage("클립보드 복사에 실패했습니다.");
    }
  };

  const handleMeaning = async () => {
    const wordToUse = title || word?.title;
    if (!wordToUse) {
      setToastMessage("단어를 먼저 입력해 주세요.");
      return;
    }

    const provider = localStorage.getItem("llm_provider") || "ChatGPT";
    const prompt = `Please provide a detailed and friendly explanation for the English word/idiom: "${wordToUse}".
Include:
1. Basic meaning and nuances
2. Usage context
3. A few more examples if possible
Please respond in Korean. Skip any introductory or concluding remarks (e.g., "Of course!", "Here is the explanation...").`;

    const providerObj = llmProviders?.find((p) => p.name === provider);
    const targetUrl = providerObj?.url || "https://chatgpt.com/";

    try {
      await navigator.clipboard.writeText(prompt);
      setToastMessage(
        `설명 프롬프트가 복사되었습니다! ${provider}에서 확인해 주세요.`,
      );

      setTimeout(() => {
        window.open(targetUrl, "_blank");
      }, 1000);
    } catch (err) {
      console.error(err);
      setToastMessage("클립보드 복사에 실패했습니다.");
    }
  };

  const handleExit = async () => {
    if (!isCurrentlyDirty) {
      currentAutosaveIdRef.current = undefined;
      restoredIdRef.current = null;
      isClosingRef.current = true;
      setIsEditing(false);

      if (isPlaceholder || isNew) {
        navigate("/", { replace: true });
      } else if (searchParams.get("edit")) {
        navigate(`/word/${id}`, { replace: true });
      } else {
        window.history.back();
      }
      return;
    }

    const result = await (choice as any)({
      message:
        language === "ko"
          ? "저장되지 않은 변경사항이 있습니다. 어떻게 할까요?"
          : "You have unsaved changes. What would you like to do?",
      confirmText: language === "ko" ? "저장 및 종료" : "Save and Exit",
      neutralText:
        language === "ko" ? "저장하지 않고 종료" : "Exit without Saving",
      cancelText: language === "ko" ? "취소" : "Cancel",
    });

    if (result === "confirm") {
      await handleSave();
      isClosingRef.current = true;
      setIsEditing(false);
      if (isPlaceholder || isNew) {
        navigate("/", { replace: true });
      } else if (searchParams.get("edit")) {
        navigate(`/word/${id}`, { replace: true });
      } else {
        window.history.back();
      }
    } else if (result === "neutral") {
      if (id) {
        await db.autosaves.where("originalId").equals(Number(id)).delete();
      } else {
        await db.autosaves.filter((a) => a.originalId === undefined).delete();
      }
      currentAutosaveIdRef.current = undefined;
      restoredIdRef.current = null;
      isClosingRef.current = true;
      setIsEditing(false);

      if (isPlaceholder || isNew) {
        navigate("/", { replace: true });
      } else {
        if (word) {
          setTitle(word.title);
          setContent(word.content);
          setTags(word.tags.join(", "));
          setSourceId(word.sourceId);
          setCommentDraft(null);
        }
        if (searchParams.get("edit")) {
          navigate(`/word/${id}`, { replace: true });
        } else {
          window.history.back();
        }
      }
    }
  };

  if (isDeleting || (!isNew && !word)) {
    if (isDeleting) return null;
    return <ScrollContainer>{t.word_detail.loading}</ScrollContainer>;
  }

  return (
    <MainWrapper>
      <ScrollContainer
        ref={containerRef}
        style={
          {
            "--sticky-offset": headerHeight ? `${headerHeight}px` : undefined,
          } as React.CSSProperties
        }
      >
        <Header>
          {isEditing ? (
            <TitleInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.word_detail.title_placeholder}
            />
          ) : (
            <TitleDisplay>
              <BlurredText $isBlurred={studyMode === "hide-words"}>
                {word?.title}
              </BlurredText>
            </TitleDisplay>
          )}
          <HeaderRow>
            <MetaRow>
              {isEditing ? (
                <>
                  <SourceSelect
                    value={sourceId || ""}
                    onChange={(e) => setSourceId(Number(e.target.value))}
                  >
                    {sources?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </SourceSelect>
                  <TagInput
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder={t.word_detail.tags_placeholder}
                  />
                </>
              ) : (
                <>
                  <span>
                    {sources?.find((s) => s.id === sourceId)?.name ||
                      t.word_detail.unknown_source}
                  </span>
                  <span>•</span>
                  <span>
                    {word &&
                      format(
                        word.createdAt,
                        language === "ko" ? "yyyy년 M월 d일" : "MMM d, yyyy",
                      )}
                  </span>
                  {word?.tags.map((t) => (
                    <span
                      key={t}
                      onClick={() => setSearchQuery(`tag:${t} `)}
                      style={{
                        background: "#eee",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        color: "#333",
                        cursor: "pointer",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </>
              )}
            </MetaRow>
            <GoToBottomButton onClick={handleGoToBottom} title="Go to Bottom">
              <FiArrowDown size={16} />
            </GoToBottomButton>
          </HeaderRow>
        </Header>

        <ActionBar ref={actionBarRef}>
          {isEditing ? (
            <>
              <ActionButton
                $variant="primary"
                onClick={() => handleSave()}
                disabled={!isCurrentlyDirty}
                style={{
                  opacity: !isCurrentlyDirty ? 0.5 : 1,
                  cursor: !isCurrentlyDirty ? "not-allowed" : "pointer",
                }}
              >
                <FiSave size={14} /> {t.word_detail.save}
              </ActionButton>
              <ActionButton $variant="cancel" onClick={handleExit}>
                <FiX size={14} /> {t.word_detail.exit}
              </ActionButton>
              <ActionButton onClick={handleRandomWord}>
                <FiList size={14} /> {t.word_detail.random_word}
              </ActionButton>
              <ActionButton onClick={() => setShowBulkAdd(true)}>
                <FiPlus size={14} /> {t.word_detail.bulk_add}
              </ActionButton>
            </>
          ) : (
            <ResponsiveGroup>
              {/* Group 1: Edit, Meaning, Example, Join/Append */}
              <ButtonGroup>
                <ActionButton onClick={handleMeaning} $mobileOrder={7}>
                  <FiBookOpen size={14} /> {t.word_detail.meaning_button}
                </ActionButton>
                <ActionButton onClick={handleExample} $mobileOrder={8}>
                  <FiCoffee size={14} /> {t.word_detail.example_button}
                </ActionButton>
                <ActionButton onClick={handleAddThread} $mobileOrder={2}>
                  <FiGitMerge size={14} /> {t.word_detail.append}
                </ActionButton>

                <ActionButton
                  onClick={() => setIsFolderMoveModalOpen(true)}
                  $mobileOrder={4}
                >
                  <FiFolder size={13} />{" "}
                  {language === "ko" ? "폴더 이동" : "Folder"}
                </ActionButton>
              </ButtonGroup>

              {/* Group 2: Share, Delete, Print ... Star */}
              <ButtonGroup $flex={1}>
                {!isReadOnly && (
                  <ActionButton onClick={handleStartEdit} $mobileOrder={1}>
                    <FiEdit2 size={13} /> {t.word_detail.edit || "Edit"}
                  </ActionButton>
                )}
                <ActionButton
                  $variant={movingWordId === Number(id) ? "primary" : undefined}
                  onClick={() => {
                    if (movingWordId === Number(id)) {
                      setMovingWordId?.(null);
                    } else {
                      setMovingWordId?.(Number(id));
                    }
                  }}
                  $mobileOrder={6}
                >
                  <FiArrowRightCircle size={14} />
                  {movingWordId === Number(id)
                    ? t.word_detail.moving
                    : t.word_detail.move}
                </ActionButton>
                <ActionButton
                  onClick={() => setShowShareModal(true)}
                  $mobileOrder={5}
                >
                  <FiShare2 size={13} /> {t.word_detail.share_word}
                </ActionButton>
                <ActionButton
                  onClick={() => setIsPrintModalOpen(true)}
                  $mobileOrder={7}
                >
                  <FiPrinter size={14} /> {language === "ko" ? "인쇄" : "Print"}
                </ActionButton>
                {!isReadOnly && (
                  <ActionButton
                    $variant="danger"
                    onClick={handleDelete}
                    $mobileOrder={11}
                  >
                    <FiTrash2 size={13} /> {t.word_detail.delete}
                  </ActionButton>
                )}

                <StarButton
                  $active={!!word?.isStarred}
                  onClick={handleToggleStar}
                  style={{ padding: "6px", marginLeft: "auto", order: 9 }}
                >
                  <FiStar
                    fill={word?.isStarred ? "currentColor" : "none"}
                    size={15}
                  />
                </StarButton>
              </ButtonGroup>
            </ResponsiveGroup>
          )}
        </ActionBar>

        {isEditing ? (
          <ContentPadding>
            <MarkdownEditor
              key={id || "new"}
              value={content}
              onChange={setContent}
              initialScrollPercentage={prevScrollRatio}
              spellCheck={localStorage.getItem("spellCheck") !== "false"}
              markdownShortcuts={
                localStorage.getItem("editor_markdown_shortcuts") !== "false"
              }
              autoLink={localStorage.getItem("editor_auto_link") !== "false"}
              tabIndentation={
                localStorage.getItem("editor_tab_indentation") !== "false"
              }
              tabSize={Number(localStorage.getItem("editor_tab_size") || "4")}
              fontSize={Number(localStorage.getItem("editor_font_size") || "11")}
            />
          </ContentPadding>
        ) : (
          <ContentPadding>
            <ContentWrapper $isBlurred={studyMode === "hide-meanings"}>
              <MarkdownView
                content={content}
                wordTitle={word?.title}
                studyMode={studyMode}
                isReadOnly={isReadOnly}
                fontSize={Number(localStorage.getItem('editor_font_size') || '11')}
                onEditDrawing={(json) => {
                  if (isReadOnly) return;
                  fabricCheckpointRef.current = content;
                  setEditingDrawingData(json);
                  setIsFabricModalOpen(true);
                }}
                onEditSpreadsheet={(json) => {
                  if (isReadOnly) return;
                  spreadsheetCheckpointRef.current = content;
                  originalSpreadsheetJsonRef.current = json; // Store original JSON string
                  try {
                    setEditingSpreadsheetData(JSON.parse(json));
                    setIsSpreadsheetModalOpen(true);
                  } catch (e) {
                    console.error(
                      "Failed to parse spreadsheet JSON for editing",
                      e,
                    );
                  }
                }}
              />
            </ContentWrapper>
          </ContentPadding>
        )}
        {!isEditing && !isNew && word && (
          <CommentsWrapper>
            <CommentsSection
              wordId={word.id!}
              initialEditingState={commentDraft}
              onEditingChange={setCommentDraft}
            />
          </CommentsWrapper>
        )}

        {isFabricModalOpen && (
          <FabricCanvasModal
            key={tParam || "default"} // Force re-mount on new requests
            language={language}
            initialData={
              editingDrawingData ||
              (searchParams.get("drawing") === "true" && isNew
                ? undefined
                : contentDrawingData)
            }
            onSave={async (json: string) => {
              const fabricRegex = /```fabric\s*([\s\S]*?)\s*```/g;
              let found = false;
              let newContent = content;
              if (editingDrawingData) {
                newContent = content.replace(fabricRegex, (match, p1) => {
                  if (!found && p1.trim() === editingDrawingData.trim()) {
                    found = true;
                    return `\`\`\`fabric\n${json}\n\`\`\``;
                  }
                  return match;
                });
              }

              if (!found) {
                const matches = content.match(fabricRegex);
                if (matches && matches.length === 1) {
                  newContent = content.replace(
                    fabricRegex,
                    `\`\`\`fabric\n${json}\n\`\`\``,
                  );
                  found = true;
                } else if (!content.includes("```fabric")) {
                  newContent = content.trim()
                    ? `${content}\n\n\`\`\`fabric\n${json}\n\`\`\``
                    : `\`\`\`fabric\n${json}\n\`\`\``;
                  found = true;
                }
              }

              setContent(newContent);
              setEditingDrawingData(json);
              fabricCheckpointRef.current = newContent;
              if (id) {
                await db.words.update(Number(id), {
                  content: newContent,
                  updatedAt: new Date(),
                });
              }
            }}
            onAutosave={(json) => {
              const fabricRegex = /```fabric\s*([\s\S]*?)\s*```/g;
              let found = false;
              let newContent = content;
              if (editingDrawingData) {
                newContent = content.replace(fabricRegex, (match, p1) => {
                  if (!found && p1.trim() === editingDrawingData.trim()) {
                    found = true;
                    return `\`\`\`fabric\n${json}\n\`\`\``;
                  }
                  return match;
                });
                if (!found) {
                  const matches = content.match(fabricRegex);
                  if (matches && matches.length === 1) {
                    newContent = content.replace(
                      fabricRegex,
                      `\`\`\`fabric\n${json}\n\`\`\``,
                    );
                  }
                }
              }
              if (newContent !== content) {
                setContent(newContent);
                setEditingDrawingData(json);
              }
            }}
            onClose={() => {
              if (fabricCheckpointRef.current !== null) {
                setContent(fabricCheckpointRef.current);
                fabricCheckpointRef.current = null;
              }
              setIsFabricModalOpen(false);
              setEditingDrawingData(undefined);
            }}
          />
        )}

        <SpreadsheetModal
          isOpen={isSpreadsheetModalOpen}
          onClose={() => {
            if (spreadsheetCheckpointRef.current !== null) {
              setContent(spreadsheetCheckpointRef.current);
              spreadsheetCheckpointRef.current = null;
            }
            setIsSpreadsheetModalOpen(false);
            setEditingSpreadsheetData(undefined);
          }}
          onSave={async (data: any) => {
            const json = JSON.stringify(data);
            let newContent = `\`\`\`spreadsheet\n${json}\n\`\`\``;
            const spreadsheetRegex = /```spreadsheet\s*([\s\S]*?)\s*```/g;
            // Use the original JSON string for accurate matching (before Fortune-sheet transforms it)
            const targetRaw = originalSpreadsheetJsonRef.current?.trim() || "";

            if (targetRaw) {
              let found = false;
              newContent = content.replace(spreadsheetRegex, (match, p1) => {
                const p1Trimmed = p1.trim();
                if (!found && p1Trimmed === targetRaw) {
                  found = true;
                  return `\`\`\`spreadsheet\n${json}\n\`\`\``;
                }
                return match;
              });

              // Update the ref to the new JSON so subsequent saves can find it
              if (found) {
                originalSpreadsheetJsonRef.current = json;
              }
            } else if (content.includes("```spreadsheet")) {
              newContent = content.replace(
                spreadsheetRegex,
                `\`\`\`spreadsheet\n${json}\n\`\`\``,
              );
              originalSpreadsheetJsonRef.current = json;
            } else if (content.trim()) {
              newContent = `${content}\n\n\`\`\`spreadsheet\n${json}\n\`\`\``;
              originalSpreadsheetJsonRef.current = json;
            }

            setContent(newContent);
            spreadsheetCheckpointRef.current = newContent;

            const isInitialSpreadsheet =
              searchParams.get("spreadsheet") === "true";

            // If it's a new spreadsheet memo from sidebar, ask for title and auto-save
            if (isNew && isInitialSpreadsheet) {
              const inputTitle = await modalPrompt({
                message: t.memo_detail.title_prompt,
                placeholder: t.memo_detail.untitled,
              });
              const finalTitle = inputTitle?.trim() || t.memo_detail.untitled;

              setTags("");
              setTitle(finalTitle);

              // Trigger save with new content and title
              // Keep spreadsheet=true and pass data in state to prevent "empty sheet" bug on remount
              await handleSave(
                finalTitle,
                newContent,
                searchParams.toString(),
                {
                  spreadsheetData: data,
                  spreadsheetJson: json,
                },
              );
            } else {
              if (id) {
                // Trigger save with new content
                // Use handleSave to update lastSavedState and avoid race conditions with main Save button
                await handleSave(undefined, newContent);
              }
            }
          }}
          onAutosave={(data) => {
            const json = JSON.stringify(data);
            let newContent = content;
            const spreadsheetRegex = /```spreadsheet\s*([\s\S]*?)\s*```/g;

            // Use original JSON string for accurate matching
            const targetRaw = originalSpreadsheetJsonRef.current?.trim() || "";
            if (targetRaw) {
              let found = false;
              newContent = content.replace(spreadsheetRegex, (match, p1) => {
                if (!found && p1.trim() === targetRaw) {
                  found = true;
                  return `\`\`\`spreadsheet\n${json}\n\`\`\``;
                }
                return match;
              });
              // Update ref for subsequent autosaves
              if (found && newContent !== content) {
                originalSpreadsheetJsonRef.current = json;
                setContent(newContent);
              }
            } else if (content.includes("```spreadsheet")) {
              newContent = content.replace(
                spreadsheetRegex,
                `\`\`\`spreadsheet\n${json}\n\`\`\``,
              );
              if (newContent !== content) {
                originalSpreadsheetJsonRef.current = json;
                setContent(newContent);
              }
            } else if (
              searchParams.get("spreadsheet") === "true" ||
              content.trim().startsWith("```spreadsheet")
            ) {
              newContent = `\`\`\`spreadsheet\n${json}\n\`\`\``;
              originalSpreadsheetJsonRef.current = json;
              setContent(newContent);
            } else if (content.trim()) {
              newContent = `${content}\n\n\`\`\`spreadsheet\n${json}\n\`\`\``;
              originalSpreadsheetJsonRef.current = json;
              setContent(newContent);
            } else {
              newContent = `\`\`\`spreadsheet\n${json}\n\`\`\``;
              originalSpreadsheetJsonRef.current = json;
              setContent(newContent);
            }
          }}
          initialData={editingSpreadsheetData}
          language={language as "en" | "ko"}
        />

        {isDeleteModalOpen && (
          <DeleteChoiceModal
            onClose={() => setIsDeleteModalOpen(false)}
            onDeleteWordOnly={performDeleteLogOnly}
            onDeleteThread={performDeleteThread}
            isThreadHead={isDeletingThreadHead}
          />
        )}
        {toastMessage && (
          <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
        )}
        {folderMoveToast && (
          <Toast
            message={folderMoveToast}
            onClose={() => setFolderMoveToast(null)}
            duration={3000}
          />
        )}

        {showBulkAdd && (
          <BulkAddModal
            onClose={() => setShowBulkAdd(false)}
            onConfirm={handleBulkConfirm}
            isInThread={!!word?.threadId}
          />
        )}
        {showShareModal && word?.id && (
          <SyncModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            adapter={wordMemoSyncAdapter}
            initialItemId={word.id}
            t={t}
            language={language}
          />
        )}
        {isFolderMoveModalOpen && word?.id && (
          <FolderMoveModal
            memoId={word.id}
            currentFolderId={word.folderId || null}
            onClose={() => setIsFolderMoveModalOpen(false)}
            onSuccess={(msg) => setToastMessage(msg)}
          />
        )}
        {showExitToast && (
          <Toast
            variant="warning"
            position="centered"
            icon={<FiAlertTriangle size={14} />}
            message={t.word_detail?.exit_toast || "Press back again to exit"}
            onClose={() => setShowExitToast(false)}
          />
        )}
        <PrintSettingsModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          appName="WordMemo"
          language={language}
          title={title}
        />
      </ScrollContainer>
      <GoToTopButton
        $show={showGoToTop}
        onClick={handleGoToTop}
        aria-label="Go to top"
      >
        <FiArrowUp size={24} />
      </GoToTopButton>
    </MainWrapper>
  );
};
