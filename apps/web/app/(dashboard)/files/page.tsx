"use client";

import { useEffect, useState } from "react";
import { CloudUpload, FileText, RefreshCw, Trash2 } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Row } from "@/components/shared/row";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { filesService } from "@/lib/services/files";
import { timeAgo } from "@/lib/data/providers";
import type { FileWithRagStatus } from "@layerflow/contracts";

function statusBadge(f: FileWithRagStatus) {
  switch (f.ragStatus) {
    case "indexed":
      return (
        <Badge tone="green">
          RAG · {f.chunkCount} chunk{f.chunkCount === 1 ? "" : "s"}
        </Badge>
      );
    case "pending":
      return <Badge tone="amber">pending</Badge>;
    case "unsupported":
      return <Badge tone="neutral">not ingestible</Badge>;
    default:
      return <Badge tone="neutral">unindexed</Badge>;
  }
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileWithRagStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    void (async () => {
      try {
        const res = await filesService.list();
        if (!ignore) {
          setFiles(res.files);
          setError(null);
        }
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : "Could not load files.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [retryKey]);

  async function reindex(file: FileWithRagStatus) {
    setBusyId(file.id);
    try {
      const res = await filesService.reindex(file.id);
      setFiles((prev) => prev.map((f) => (f.id === file.id ? res.file : f)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-index failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(file: FileWithRagStatus) {
    if (!window.confirm(`Delete "${file.fileName}" and its RAG chunks?`)) return;
    setBusyId(file.id);
    try {
      await filesService.delete(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Files"
        description="Uploaded knowledge files and their RAG index state."
      />

      <Panel>
        <PanelHeader
          title="Uploaded files"
          description="Text files (.txt, .md, .json, code) are chunked into searchable memory"
          action={
            <a
              href="/search"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border-strong px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-2"
            >
              <CloudUpload className="h-3.5 w-3.5" /> Find files
            </a>
          }
        />
        <PanelBody className="p-0">
          {loading ? (
            <div className="space-y-1 p-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-2/60" />
              ))}
            </div>
          ) : error ? (
            <div className="p-5">
              <ErrorState title="Files failed to load" description={error} onRetry={() => setRetryKey((k) => k + 1)} />
            </div>
          ) : files.length === 0 ? (
            <div className="px-5 py-10">
              <EmptyState
                icon={<FileText className="h-5 w-5" />}
                title="No uploaded files"
                description="Upload a knowledge file and LayerFlow chunks + indexes it for retrieval."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {files.map((f) => (
                <li key={f.id} className="px-3 py-1.5">
                  <Row
                    title={
                      <span className="inline-flex items-center gap-2">
                        <span className="truncate">{f.fileName}</span>
                        {statusBadge(f)}
                      </span>
                    }
                    subtitle={`${f.mimeType} · ${(f.sizeBytes / 1024).toFixed(1)} KB · ${timeAgo(f.createdAt)}`}
                    trailing={
                      <span className="flex items-center gap-1">
                        <IconButton
                          label="Re-index into RAG"
                          disabled={busyId === f.id}
                          onClick={() => void reindex(f)}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${busyId === f.id ? "animate-spin" : ""}`} />
                        </IconButton>
                        <IconButton
                          label="Delete file"
                          disabled={busyId === f.id}
                          onClick={() => void remove(f)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                      </span>
                    }
                    className="rounded-lg"
                  />
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}