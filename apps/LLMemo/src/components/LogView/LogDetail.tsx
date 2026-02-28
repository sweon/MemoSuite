import React, { useState, useEffect, useRef } from "react";
import {
  SyncModal,
  useModal,
  useLanguage,
  prepareThreadForNewItem,
  buildThreadNavigationUrl,
  extractThreadContext,
  PrintSettingsModal,
  useColorTheme,
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

import { MarkdownEditor } from "../Editor/MarkdownEditor";
import { MarkdownView } from "../Editor/MarkdownView";
import {
  FiEdit2,
  FiTrash2,
  FiShare2,
  FiGitMerge,
  FiFolder,
  FiArrowUp,
  FiArrowDown,
  FiPrinter,
  FiCopy,
  FiArrowRightCircle,
} from "react-icons/fi";
import { useExitGuard, ExitGuardResult } from "@memosuite/shared-drawing";
import { FolderMoveModal } from "../FolderView/FolderMoveModal";
import { useFolder } from "../../contexts/FolderContext";
import { format } from "date-fns";
import { CommentsSection } from "./CommentsSection";
import { Toast } from "../UI/Toast";
import { FiAlertTriangle } from "react-icons/fi";

import { llmemoSyncAdapter } from "../../utils/backupAdapter";

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
  font-size: 1.75rem;
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
  font-size: 1.75rem;
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

const ActionBar = styled.div<{ $isEditing?: boolean }>`
  display: flex;
  flex-wrap: wrap;
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

const ActionButton = styled.button<{
  $variant?: "primary" | "danger" | "cancel";
  $mobileOrder?: number;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 8px;
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
  font-size: 12px;
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

  @media (max-width: 768px) {
    &.hide-on-mobile {
      display: none !important;
    }
  }
`;

const ModelSelect = styled.select`
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

export const LogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { t, language } = useLanguage();
  const { confirm, choice } = useModal();
  const { fontSize } = useColorTheme();

  // Guard Hook
  const { registerGuard, unregisterGuard } = useExitGuard();
  const [showExitToast, setShowExitToast] = useState(false);
  const lastBackPress = useRef(0);
  const isClosingRef = useRef(false);

  const isNew = id === undefined || id === "new";

  const [isEditing, setIsEditing] = useState(isNew);
  const [showGoToTop, setShowGoToTop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
  }, [isEditing]);

  const handleStartEdit = () => {
    lastSavedState.current = {
      title,
      content,
      tags,
      modelId,
      commentDraft,
    };
    setIsEditing(true);
    window.history.pushState({ editing: true, isGuard: true }, "");
  };

  const currentAutosaveIdRef = useRef<number | undefined>(undefined);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState(""); // Comma separated for editing
  const [modelId, setModelId] = useState<number | undefined>(undefined);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFolderMoveModalOpen, setIsFolderMoveModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { currentFolderId } = useFolder();

  const [commentDraft, setCommentDraft] = useState<CommentDraft | null>(null);
  const commentDraftRef = useRef<CommentDraft | null>(null);
  useEffect(() => {
    commentDraftRef.current = commentDraft;
  }, [commentDraft]);
  const restoredIdRef = useRef<string | null>(null);
  const loadedIdRef = useRef<string | null>(null);

  const lastSavedState = useRef({
    title: "",
    content: "",
    tags: "",
    modelId: undefined as number | undefined,
    commentDraft: null as CommentDraft | null,
  });

  const log = useLiveQuery(() => {
    if (!id || id === "new") return undefined;
    const numericId = Number(id);
    if (isNaN(numericId)) return undefined;
    return db.logs.get(numericId);
  }, [id]);

  const { setIsDirty, setAppIsEditing, setSidebarOpen, isSidebarOpen, movingLogId, setMovingLogId } =
    useOutletContext<{
      setIsDirty: (d: boolean) => void;
      setAppIsEditing: (e: boolean) => void;
      setSidebarOpen: (open: boolean) => void;
      isSidebarOpen: boolean;
      movingLogId?: number | null;
      setMovingLogId?: (id: number | null) => void;
    }>() || {};

  const isCurrentlyDirty = !!(
    (title || "").trim() !== (lastSavedState.current.title || "").trim() ||
    (content || "") !== (lastSavedState.current.content || "") ||
    (tags || "").trim() !== (lastSavedState.current.tags || "").trim() ||
    (modelId || null) !== (lastSavedState.current.modelId || null) ||
    JSON.stringify(commentDraft) !== JSON.stringify(lastSavedState.current.commentDraft)
  );

  useEffect(() => {
    loadedIdRef.current = null;
    setTitle("");
    setContent("");
    setTags("");
    setCommentDraft(null);
    lastSavedState.current = {
      title: "",
      content: "",
      tags: "",
      modelId: undefined,
      commentDraft: null,
    };
    setIsEditing(id === undefined || id === "new");
    isClosingRef.current = false;
  }, [id]);

  useEffect(() => {
    if (id && id !== "new") {
      localStorage.setItem("llmemo_last_log_id", id);
    }
  }, [id]);

  useEffect(() => {
    if (isEditing) {
      const guardId = "log-edit-guard";
      registerGuard(guardId, () => {
        if (isShareModalOpen || isFolderMoveModalOpen) {
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
    isCurrentlyDirty,
    registerGuard,
    unregisterGuard,
    isShareModalOpen,
    isFolderMoveModalOpen,
  ]);

  useEffect(() => {
    if (setIsDirty) setIsDirty(isEditing || !!commentDraft);
    if (setAppIsEditing) setAppIsEditing(isEditing);
    return () => {
      if (setIsDirty) setIsDirty(false);
      if (setAppIsEditing) setAppIsEditing(false);
    };
  }, [isEditing, commentDraft, setIsDirty, setAppIsEditing]);

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
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowGoToTop(container.scrollTop > 300);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [log]);

  const models = useLiveQuery(() => db.models.orderBy("order").toArray());

  useEffect(() => {
    let isCurrent = true;

    if (id && log && log.id !== Number(id)) return;

    if (log && log.id === Number(id) && loadedIdRef.current !== id) {
      const loadData = async () => {
        const tagsStr = log.tags.join(", ");

        const existing = await db.autosaves
          .where("originalId")
          .equals(Number(id))
          .reverse()
          .sortBy("createdAt");

        if (!isCurrent) return;

        let initialTitle = log.title;
        let initialContent = log.content;
        let initialTagsStr = tagsStr;
        let initialModelId = log.modelId;
        let initialCommentDraft: CommentDraft | null = null;

        if (existing.length > 0) {
          const draft = existing[0];
          initialTitle = draft.title;
          initialContent = draft.content;
          initialTagsStr = draft.tags.join(", ");
          initialModelId = draft.modelId;
          initialCommentDraft = draft.commentDraft || null;

          currentAutosaveIdRef.current = draft.id;
          restoredIdRef.current = id || null;
        }

        setTitle(initialTitle);
        setContent(initialContent);
        setTags(initialTagsStr);
        setModelId(initialModelId);
        setCommentDraft(initialCommentDraft);

        lastSavedState.current = {
          title: initialTitle,
          content: initialContent,
          tags: initialTagsStr,
          modelId: initialModelId,
          commentDraft: initialCommentDraft,
        };
        loadedIdRef.current = id || null;
      };
      loadData();
    }

    if (log) {
      const shouldEdit = searchParams.get("edit") === "true";
      if (shouldEdit && !isEditing) {
        lastSavedState.current = {
          title,
          content,
          tags,
          modelId,
          commentDraft,
        };
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

      const checkExistingAutosave = async () => {
        if (
          !isEditing &&
          !shouldEdit &&
          !searchParams.get("comment") &&
          searchParams.get("restore") !== "true"
        )
          return;
        if (isEditing && restoredIdRef.current === id) return;

        const existing = await db.autosaves
          .where("originalId")
          .equals(Number(id))
          .reverse()
          .sortBy("createdAt");

        if (!isCurrent) return;

        if (existing.length > 0) {
          const draft = existing[0];
          const hasLogChanges =
            draft.content !== log.content || draft.title !== log.title;
          const hasCommentDraft = !!draft.commentDraft;

          if (hasLogChanges || hasCommentDraft) {
            setTitle(draft.title);
            setContent(draft.content);
            const tagsStr = draft.tags.join(", ");
            setTags(tagsStr);
            setModelId(draft.modelId);
            if (draft.commentDraft) {
              setCommentDraft(draft.commentDraft);
            }

            lastSavedState.current = {
              title: draft.title,
              content: draft.content,
              tags: tagsStr,
              modelId: draft.modelId,
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
      setCommentDraft(null);
      setIsEditing(true);
      loadedIdRef.current = "new";
      setModelId(threadContext?.inheritedModelId || undefined);

      const checkNewAutosave = async () => {
        const latest = await db.autosaves
          .filter((a) => a.originalId === undefined)
          .reverse()
          .sortBy("createdAt");

        if (!isCurrent) return;

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
            setModelId(draft.modelId);
            if (draft.commentDraft) {
              setCommentDraft(draft.commentDraft);
            }

            lastSavedState.current = {
              title: draft.title,
              content: draft.content,
              tags: tagsStr,
              modelId: draft.modelId,
              commentDraft: draft.commentDraft || null,
            };
          }
        }
      };
      checkNewAutosave();
    }

    return () => {
      isCurrent = false;
    };
  }, [log, isNew, id, searchParams, isEditing, location.pathname, navigate]);

  useEffect(() => {
    if (isNew && !modelId && models && models.length > 0) {
      const defaultModelId = models[0].id;
      setModelId(defaultModelId);
      // Sync lastSavedState so Rule 1 holds for newly created logs
      if (lastSavedState.current.modelId === undefined) {
        lastSavedState.current.modelId = defaultModelId;
      }
    }
  }, [isNew, modelId, models]);


  const currentStateRef = useRef({
    title,
    content,
    tags,
    modelId,
    commentDraft,
  });
  useEffect(() => {
    currentStateRef.current = { title, content, tags, modelId, commentDraft };
  }, [title, content, tags, modelId, commentDraft]);

  useEffect(() => {
    const isEditingAnything = isEditing || !!commentDraft;
    if (!isEditingAnything) return;

    let idleCallbackId: number;
    let intervalId: ReturnType<typeof setInterval>;

    const performAutosave = async () => {
      const {
        title: cTitle,
        content: cContent,
        tags: cTags,
        modelId: cModelId,
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
        String(cModelId) !== String(lastSavedState.current.modelId) ||
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
        modelId: cModelId ? Number(cModelId) : undefined,
        commentDraft: cCommentDraft || undefined,
        createdAt: new Date(),
      };

      if (currentAutosaveIdRef.current) {
        autosaveData.id = currentAutosaveIdRef.current;
      }

      const newId = await db.autosaves.put(autosaveData);
      currentAutosaveIdRef.current = newId;

      const allAutosaves = await db.autosaves.orderBy("createdAt").toArray();
      if (allAutosaves.length > 20) {
        const toDelete = allAutosaves.slice(0, allAutosaves.length - 20);
        await db.autosaves.bulkDelete(toDelete.map((a) => a.id!));
      }
    };

    const scheduleAutosave = () => {
      if (typeof requestIdleCallback !== 'undefined') {
        idleCallbackId = requestIdleCallback(() => {
          performAutosave();
        }, { timeout: 15000 });
      } else {
        performAutosave();
      }
    };

    intervalId = setInterval(scheduleAutosave, 7000);

    return () => {
      clearInterval(intervalId);
      if (typeof cancelIdleCallback !== 'undefined' && idleCallbackId) {
        cancelIdleCallback(idleCallbackId);
      }
    };
  }, [id, isEditing, !!commentDraft]);

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
    const untitled = t.log_detail.untitled;

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

    if (id && id !== "new") {
      await db.logs.update(Number(id), {
        title: finalTitle,
        content: currentContent,
        tags: tagArray,
        modelId: modelId ? Number(modelId) : undefined,
        updatedAt: now,
      });

      await db.autosaves.where("originalId").equals(Number(id)).delete();
      currentAutosaveIdRef.current = undefined;
      restoredIdRef.current = null;
      setCommentDraft(null);

      setToastMessage(language === "ko" ? "저장되었습니다!" : "Saved!");
      lastSavedState.current = {
        title: finalTitle,
        content: currentContent,
        tags: tagArray.join(", "),
        modelId: modelId ? Number(modelId) : undefined,
        commentDraft: null,
      };
    } else {
      const threadContext = extractThreadContext(searchParams);

      const newId = await db.logs.add({
        folderId:
          threadContext?.inheritedFolderId ?? currentFolderId ?? undefined,
        title: finalTitle,
        content: currentContent,
        tags: threadContext?.inheritedTags || tagArray,
        modelId: modelId
          ? Number(modelId)
          : threadContext?.inheritedModelId || undefined,
        threadId: threadContext?.threadId ?? undefined,
        threadOrder: threadContext?.threadOrder ?? undefined,
        createdAt: now,
        updatedAt: now,
      });

      await db.autosaves.filter((a) => a.originalId === undefined).delete();
      currentAutosaveIdRef.current = undefined;
      restoredIdRef.current = null;
      setCommentDraft(null);

      setToastMessage(language === "ko" ? "저장되었습니다!" : "Saved!");
      lastSavedState.current = {
        title: finalTitle,
        content: currentContent,
        tags: tagArray.join(", "),
        modelId: modelId ? Number(modelId) : undefined,
        commentDraft: null,
      };

      navigate(`/log/${newId}?edit=true`, {
        replace: true,
        state: { ...overrideState },
      });
    }
  };

  const handleExit = async () => {
    if (!isCurrentlyDirty) {
      currentAutosaveIdRef.current = undefined;
      restoredIdRef.current = null;
      isClosingRef.current = true;
      setIsEditing(false);

      if (isNew) {
        navigate("/", { replace: true });
      } else {
        navigate(`/log/${id}`, { replace: true });
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
      if (isNew) {
        navigate("/", { replace: true });
      } else {
        navigate(`/log/${id}`, { replace: true });
      }
    } else if (result === "neutral") {
      if (id && id !== "new") {
        await db.autosaves.where("originalId").equals(Number(id)).delete();
      } else {
        await db.autosaves.filter((a) => a.originalId === undefined).delete();
      }
      currentAutosaveIdRef.current = undefined;
      restoredIdRef.current = null;
      isClosingRef.current = true;
      setIsEditing(false);

      if (isNew) {
        navigate("/", { replace: true });
      } else {
        if (log) {
          setTitle(log.title);
          setContent(log.content);
          setTags(log.tags.join(", "));
          setModelId(log.modelId);
          setCommentDraft(null);
        }
        if (searchParams.get("edit")) {
          navigate(`/log/${id}`, { replace: true });
        } else {
          window.history.back();
        }
      }
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const result = await (choice as any)({
      message:
        language === "ko"
          ? "이 로그를 어떻게 삭제하시겠습니까?"
          : "How would you like to delete this log?",
      confirmText:
        language === "ko" ? "전체 스레드 삭제" : "Delete entire thread",
      neutralText:
        language === "ko" ? "이 로그만 삭제" : "Delete only this log",
      cancelText: language === "ko" ? "취소" : "Cancel",
    });

    if (result === "confirm") {
      await performDeleteThread();
    } else if (result === "neutral") {
      await performDeleteLogOnly();
    }
  };

  const performDeleteLogOnly = async () => {
    if (!id) return;
    const logToDelete = await db.logs.get(Number(id));
    if (!logToDelete) return;

    setIsDeleting(true);
    try {
      await db.logs.delete(Number(id));
      await db.comments.where("logId").equals(Number(id)).delete();
      await db.autosaves.where("originalId").equals(Number(id)).delete();

      const remainingInThread = await db.logs
        .where("threadId")
        .equals(logToDelete.threadId || -1)
        .toArray();
      if (remainingInThread.length > 0) {
        const sorted = remainingInThread.sort(
          (a, b) => (b.threadOrder || 0) - (a.threadOrder || 0),
        );
        navigate(`/log/${sorted[0].id}`);
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  const performDeleteThread = async () => {
    if (!id) return;
    const logToDelete = await db.logs.get(Number(id));
    if (!logToDelete || !logToDelete.threadId) return;

    setIsDeleting(true);
    try {
      const threadLogs = await db.logs
        .where("threadId")
        .equals(logToDelete.threadId)
        .toArray();
      const threadLogIds = threadLogs.map((l) => l.id!);

      await db.logs.bulkDelete(threadLogIds);
      for (const logId of threadLogIds) {
        await db.comments.where("logId").equals(logId).delete();
        await db.autosaves.where("originalId").equals(logId).delete();
      }
      navigate("/");
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  const handleAddThread = async () => {
    if (!id || !log) return;

    try {
      const context = await prepareThreadForNewItem({
        currentItem: log,
        currentId: Number(id),
        table: db.logs,
      });

      const url = buildThreadNavigationUrl("/log/new", context, {
        edit: "true",
      });
      navigate(url, { replace: true, state: { isGuard: true } });
    } catch (error) {
      console.error("Failed to add thread:", error);
    }
  };

  const handleCopy = async () => {
    if (!log || !id) return;

    try {
      const context = await prepareThreadForNewItem({
        currentItem: log,
        currentId: Number(id),
        table: db.logs,
      });

      const now = new Date();
      const newId = await db.logs.add({
        folderId: log.folderId,
        title: log.title,
        content: log.content,
        tags: [...log.tags],
        modelId: log.modelId,
        createdAt: now,
        updatedAt: now,
        threadId: context.threadId,
        threadOrder: context.threadOrder
      });

      // Copy comments
      const comments = await db.comments.where('logId').equals(Number(id)).toArray();
      for (const comment of comments) {
        await db.comments.add({
          logId: newId,
          content: comment.content,
          createdAt: now,
          updatedAt: now
        });
      }

      navigate(`/log/${newId}`);
    } catch (error) {
      console.error("Failed to copy log:", error);
      await confirm("Failed to copy log. Please try again.");
    }
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const currentModelName =
    models?.find((m) => m.id === modelId)?.name || t.log_detail.untitled_model;

  if (isDeleting || (!isNew && !log)) {
    if (isDeleting) return null;
    return <ScrollContainer>{t.log_detail.loading}</ScrollContainer>;
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
              placeholder={t.log_detail.title_placeholder}
              autoFocus
            />
          ) : (
            <TitleDisplay>{title || t.log_detail.untitled}</TitleDisplay>
          )}

          <HeaderRow>
            <MetaRow>
              {isEditing ? (
                <>
                  <ModelSelect
                    value={modelId || ""}
                    onChange={(e) => setModelId(Number(e.target.value))}
                  >
                    {models?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </ModelSelect>
                  <TagInput
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder={t.log_detail.tags_placeholder}
                  />
                </>
              ) : (
                <>
                  <span>{currentModelName}</span>
                  <span>•</span>
                  <span>
                    {log &&
                      format(
                        log.createdAt,
                        language === "ko" ? "yyyy. MM. dd." : "yyyy-MM-dd",
                      )}
                  </span>
                  {log && log.tags.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{log.tags.join(", ")}</span>
                    </>
                  )}
                </>
              )}
            </MetaRow>
            {!isEditing && (
              <GoToBottomButton
                title={t.log_detail.go_to_bottom}
                onClick={handleGoToBottom}
              >
                <FiArrowDown />
              </GoToBottomButton>
            )}
          </HeaderRow>
        </Header>

        <ActionBar ref={actionBarRef} $isEditing={isEditing}>
          {isEditing ? (
            <div id="lexical-toolbar-portal" style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px' }} />
          ) : (
            <>
              <ActionButton onClick={handleStartEdit} $mobileOrder={1}>
                <FiEdit2 size={16} />
                <span className="hide-on-mobile">{t.log_detail.edit}</span>
              </ActionButton>
              <ActionButton onClick={handleAddThread} $mobileOrder={2}>
                <FiGitMerge size={16} />
                <span className="hide-on-mobile">
                  {t.log_detail.add_thread}
                </span>
              </ActionButton>
              <ActionButton
                onClick={() => setIsFolderMoveModalOpen(true)}
                $mobileOrder={3}
              >
                <FiFolder size={16} />
                <span className="hide-on-mobile">
                  {t.log_detail.move_folder}
                </span>
              </ActionButton>
              <ActionButton onClick={handleCopy} $mobileOrder={4}>
                <FiCopy size={16} />
                <span className="hide-on-mobile">{t.log_detail.copy}</span>
              </ActionButton>
              <ActionButton
                $variant={movingLogId === Number(id) ? "primary" : undefined}
                onClick={() => {
                  if (movingLogId === Number(id)) {
                    setMovingLogId?.(null);
                  } else {
                    setMovingLogId?.(Number(id));
                  }
                }}
                $mobileOrder={5}
              >
                <FiArrowRightCircle size={16} />
                <span className="hide-on-mobile">
                  {movingLogId === Number(id) ? t.log_detail.moving : t.log_detail.move}
                </span>
              </ActionButton>
              <ActionButton
                onClick={() => setIsShareModalOpen(true)}
                $mobileOrder={6}
              >
                <FiShare2 size={16} />
                <span className="hide-on-mobile">{t.log_detail.share}</span>
              </ActionButton>
              <ActionButton onClick={handlePrint} $mobileOrder={7}>
                <FiPrinter size={16} />
                <span className="hide-on-mobile">{t.log_detail.print || "Print"}</span>
              </ActionButton>
              <ActionButton
                $variant="danger"
                onClick={handleDelete}
                $mobileOrder={8}
              >
                <FiTrash2 size={16} />
                <span className="hide-on-mobile">{t.log_detail.delete}</span>
              </ActionButton>
            </>
          )}
        </ActionBar>

        <ContentPadding>
          {isEditing ? (
            <MarkdownEditor
              value={content}
              onChange={setContent}
              onToggleSidebar={() => setSidebarOpen?.(!isSidebarOpen)}
              spellCheck={localStorage.getItem("spellCheck") !== "false"}
              markdownShortcuts={
                localStorage.getItem("editor_markdown_shortcuts") !== "false"
              }
              autoLink={localStorage.getItem("editor_auto_link") !== "false"}
              tabIndentation={
                localStorage.getItem("editor_tab_indentation") !== "false"
              }
              tabSize={Number(localStorage.getItem("editor_tab_size") || "4")}
              fontSize={fontSize}
              onSave={() => handleSave()}
              onExit={handleExit}
              saveLabel={t.log_detail.save}
              exitLabel={t.log_detail.exit}
              saveDisabled={!isCurrentlyDirty}
              stickyOffset={headerHeight}
            />
          ) : (
            <MarkdownView
              content={content}
              memoId={Number(id)}
              fontSize={fontSize}
            />
          )}
        </ContentPadding>

        {!isEditing && !isNew && log && (
          <CommentsWrapper className="print-comments-section">
            <CommentsSection logId={Number(id)} />
          </CommentsWrapper>
        )}
        <PrintSettingsModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          appName="LLMemo"
          language={language}
          title={title}
        />
      </ScrollContainer>

      <GoToTopButton
        $show={showGoToTop}
        onClick={handleGoToTop}
        title={t.log_detail.go_to_top}
      >
        <FiArrowUp size={24} />
      </GoToTopButton>

      {isShareModalOpen && (
        <SyncModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          adapter={llmemoSyncAdapter}
          initialItemId={log?.id}
          t={t}
          language={language}
        />
      )}

      {isFolderMoveModalOpen && log?.id && (
        <FolderMoveModal
          memoId={log.id}
          currentFolderId={log.folderId || null}
          onClose={() => setIsFolderMoveModalOpen(false)}
          onSuccess={(msg) => {
            setToastMessage(msg);
            setTimeout(() => setToastMessage(null), 500);
          }}
        />
      )}

      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
          duration={500}
        />
      )}

      {showExitToast && (
        <Toast
          variant="warning"
          position="centered"
          icon={<FiAlertTriangle size={14} />}
          message={t.log_detail.exit_warning || "Press back again to exit"}
          onClose={() => setShowExitToast(false)}
          duration={2000}
        />
      )}
    </MainWrapper>
  );
};
