/**
 * Hooks for working with the virtual `fs` module in the UI.
 *
 * These underlying data for the filesystem is not reactive,
 * since DuckDB doesn't provide events when things change.
 * Therefore, we provide "refresh" methods to allow the UI
 * to trigger update calls when necessary.
 */

import { useState, useCallback, useEffect } from "react";
import { ChatCraftChat } from "../lib/ChatCraftChat";
import { ls, getFile, VirtualFile } from "../lib/fs";

export function useFiles(chat: ChatCraftChat) {
  const [files, setFiles] = useState<VirtualFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshFiles = useCallback(async () => {
    try {
      setLoading(true);
      const fileList = await ls(chat);
      setFiles(fileList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown fs error"));
    } finally {
      setLoading(false);
    }
  }, [chat]);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  return { files, loading, error, refreshFiles };
}

export function useFile(path: string, chat: ChatCraftChat) {
  const [file, setFile] = useState<VirtualFile | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadFile = useCallback(async () => {
    try {
      setLoading(true);

      const file = await getFile(path, chat);
      setFile(file);

      const fileUrl = await file.toURL();
      setUrl(fileUrl);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [path, chat]);

  useEffect(() => {
    loadFile();
    return () => {
      // Cleanup URL on unmount
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [loadFile, url]);

  return {
    file,
    url,
    exists: !!file,
    loading,
    error,
    refresh: loadFile,
  };
}
