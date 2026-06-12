import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import Modal from "../../components/Modal";
import {
  FolderPlus,
  Upload,
  FileText,
  Image,
  File,
  Download,
  Trash2,
  Info,
} from "lucide-react";

// ── types ─────────────────────────────────────────────────────────────────────
interface AssetItem {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  total_downloads: number;
  is_active: boolean;
}

interface Folder {
  id: string;
  name: string;
  assets: AssetItem[];
}

interface Project {
  id: string;
  name: string;
  tenant_id: string;
  folders: Folder[];
}

// ── helpers ───────────────────────────────────────────────────────────────────
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType?.includes("image"))
    return <Image className="w-5 h-5 text-purple-500" />;
  if (mimeType?.includes("pdf"))
    return <FileText className="w-5 h-5 text-red-500" />;
  return <File className="w-5 h-5 text-gray-500" />;
}

// ── component ─────────────────────────────────────────────────────────────────
export default function AssetsPage() {
  const queryClient = useQueryClient();

  const [selectedProject, setSelectedProject] = useState<string>("");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [folderName, setFolderName] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{
    type: "folder" | "asset";
    id: string;
    name: string;
  } | null>(null);

  const [exportFolder, setExportFolder] = useState<Folder | null>(null);
  const [exportMode, setExportMode] = useState<"asset" | null>(null);

  // ── queries ──────────────────────────────────────────────────────────────────
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["asset-projects"],
    queryFn: () => api.get("/assets/projects").then((r) => r.data),
  });

  // ── mutations ─────────────────────────────────────────────────────────────────
  const createProjectMutation = useMutation({
    mutationFn: (data: any) =>
      api.post("/assets/projects", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-projects"] });
      toast.success("Project created.");
      setShowCreateProject(false);
      setProjectName("");
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (data: any) =>
      api.post("/assets/folders", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-projects"] });
      toast.success("Folder created.");
      setShowCreateFolder(false);
      setFolderName("");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) =>
      api
        .post("/assets/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-projects"] });
      toast.success("File uploaded successfully.");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || "Upload failed."),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/assets/folders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-projects"] });
      toast.success("Folder deleted.");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete folder."),
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-projects"] });
      toast.success("Asset deleted.");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete asset."),
  });

  // ── handlers ──────────────────────────────────────────────────────────────────
  const handleUpload = (folderId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.docx,.pptx,.jpg,.jpeg,.png";
    input.onchange = (e: any) => {
      const file: File = e.target.files[0];
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) {
        toast.error("File exceeds the 25 MB maximum upload size.");
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder_id", folderId);
      uploadMutation.mutate(formData);
    };
    input.click();
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAsset = async (assetId: string, filename?: string) => {
    try {
      const response = await api.get(`/assets/${assetId}/download`, {
        responseType: "blob",
      });
      const disposition = response.headers["content-disposition"];
      const name =
        disposition?.match(/filename="?([^"]+)"?/)?.[1] ||
        filename ||
        "download";
      triggerBlobDownload(response.data, name);
    } catch {
      toast.error("Download failed.");
    }
  };

  const handleExportFolderZip = async (folder: Folder) => {
    try {
      const response = await api.get(`/assets/folders/${folder.id}/export`, {
        responseType: "blob",
      });
      triggerBlobDownload(response.data, `${folder.name}.zip`);
      setExportFolder(null);
      setExportMode(null);
    } catch {
      toast.error("Export failed.");
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "folder") {
      deleteFolderMutation.mutate(deleteTarget.id);
    } else {
      deleteAssetMutation.mutate(deleteTarget.id);
    }
  };

  const activeAssets = (folder: Folder) =>
    (folder.assets || []).filter((a) => a.is_active);

  const currentProject =
    projects.find((p) => p.id === selectedProject) || projects[0];

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset Library</h1>
          <p className="text-gray-500 mt-1">
            Manage marketing assets, brochures, and documents
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateFolder(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <FolderPlus className="w-4 h-4" /> New Folder
          </button>
          <button
            onClick={() => setShowCreateProject(true)}
            className="btn-primary flex items-center gap-2"
          >
            New Project
          </button>
        </div>
      </div>

      {/* Upload size notice */}
      <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          <strong>Recommended upload size: up to 5 MB</strong> for optimal
          performance. Files up to 25 MB are accepted. Supported formats: PDF,
          DOCX, PPTX, JPG, PNG.
        </span>
      </div>

      {/* New Project Modal */}
      <Modal
        isOpen={showCreateProject}
        onClose={() => { setShowCreateProject(false); setProjectName(""); }}
        title="Create New Project"
        size="sm"
      >
        <div className="space-y-4">
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project name"
            className="input-field w-full"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && projectName.trim())
                createProjectMutation.mutate({ name: projectName });
            }}
          />
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setShowCreateProject(false); setProjectName(""); }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => createProjectMutation.mutate({ name: projectName })}
              disabled={!projectName.trim() || createProjectMutation.isPending}
              className="btn-primary disabled:opacity-50"
            >
              {createProjectMutation.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      {/* New Folder Modal */}
      <Modal
        isOpen={showCreateFolder}
        onClose={() => { setShowCreateFolder(false); setFolderName(""); }}
        title="Create New Folder"
        size="sm"
      >
        <div className="space-y-4">
          <input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            className="input-field w-full"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && folderName.trim() && currentProject)
                createFolderMutation.mutate({ name: folderName, project_id: currentProject.id });
            }}
          />
          {!currentProject && (
            <p className="text-sm text-amber-600">Create a project first before adding folders.</p>
          )}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setShowCreateFolder(false); setFolderName(""); }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                createFolderMutation.mutate({
                  name: folderName,
                  project_id: currentProject!.id,
                })
              }
              disabled={!folderName.trim() || !currentProject || createFolderMutation.isPending}
              className="btn-primary disabled:opacity-50"
            >
              {createFolderMutation.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Project Tabs */}
      {projects.length > 0 && (
        <div className="flex gap-2 border-b overflow-x-auto">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                (selectedProject || projects[0]?.id) === project.id
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {project.name}
            </button>
          ))}
        </div>
      )}

      {/* Folders grid */}
      {currentProject && (
        <FolderGrid
          folders={currentProject.folders || []}
          onUpload={handleUpload}
          onDelete={(type, id, name) => setDeleteTarget({ type, id, name })}
          onExport={(folder) => {
            setExportFolder(folder);
            setExportMode(null);
          }}
          onDownloadAsset={handleDownloadAsset}
          activeAssets={activeAssets}
        />
      )}

      {projects.length === 0 && (
        <div className="card text-center py-12">
          <FolderPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            No asset projects yet. Create one to get started.
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.type === "folder" ? "Folder" : "Asset"}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900">
              "{deleteTarget?.name}"
            </span>
            ?
            {deleteTarget?.type === "folder" && (
              <span className="block mt-1 text-sm text-red-500">
                This will also delete all assets inside the folder.
              </span>
            )}
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setDeleteTarget(null)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={
                deleteFolderMutation.isPending || deleteAssetMutation.isPending
              }
              className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {deleteFolderMutation.isPending || deleteAssetMutation.isPending
                ? "Deleting…"
                : "Delete"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal
        isOpen={!!exportFolder}
        onClose={() => {
          setExportFolder(null);
          setExportMode(null);
        }}
        title={`Export — ${exportFolder?.name}`}
        size="md"
      >
        {exportFolder && (
          <div className="space-y-4">
            {!exportMode && (
              <>
                <p className="text-sm text-gray-500">
                  What would you like to export?
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setExportMode("asset")}
                    className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-colors text-left"
                  >
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        Export a specific asset
                      </p>
                      <p className="text-sm text-gray-500">
                        Download a single file from this folder
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExportFolderZip(exportFolder)}
                    disabled={activeAssets(exportFolder).length === 0}
                    className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Download className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        Export whole folder as ZIP
                      </p>
                      <p className="text-sm text-gray-500">
                        Download all {activeAssets(exportFolder).length} asset
                        {activeAssets(exportFolder).length !== 1 ? "s" : ""} in
                        one archive
                      </p>
                    </div>
                  </button>
                </div>
              </>
            )}

            {exportMode === "asset" && (
              <>
                <button
                  onClick={() => setExportMode(null)}
                  className="text-xs text-brand-600 hover:underline"
                >
                  ← Back
                </button>
                <p className="text-sm text-gray-500">
                  Select an asset to download:
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activeAssets(exportFolder).length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">
                      No assets in this folder.
                    </p>
                  )}
                  {activeAssets(exportFolder).map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => {
                        handleDownloadAsset(asset.id, asset.original_name);
                        setExportFolder(null);
                        setExportMode(null);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-brand-50 border border-transparent hover:border-brand-200 transition-colors text-left"
                    >
                      <FileIcon mimeType={asset.mime_type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {asset.original_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatBytes(asset.size_bytes)}
                        </p>
                      </div>
                      <Download className="w-4 h-4 text-gray-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── FolderGrid ────────────────────────────────────────────────────────────────
interface FolderGridProps {
  folders: Folder[];
  onUpload: (folderId: string) => void;
  onDelete: (type: "folder" | "asset", id: string, name: string) => void;
  onExport: (folder: Folder) => void;
  onDownloadAsset: (assetId: string, filename?: string) => void;
  activeAssets: (folder: Folder) => AssetItem[];
}

function FolderGrid({
  folders,
  onUpload,
  onDelete,
  onExport,
  onDownloadAsset,
  activeAssets,
}: FolderGridProps) {
  if (folders.length === 0)
    return (
      <div className="card text-center py-8">
        <p className="text-gray-400 text-sm">
          No folders yet. Use "New Folder" to create one.
        </p>
      </div>
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {folders.map((folder) => {
        const assets = activeAssets(folder);
        return (
          <div key={folder.id} className="card">
            {/* Folder header */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                📁 {folder.name}
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onExport(folder)}
                  className="text-xs text-gray-500 hover:text-brand-600 font-medium flex items-center gap-1 transition-colors"
                  title="Export folder"
                >
                  <Download className="w-3 h-3" />
                  Export
                </button>
                <button
                  onClick={() => onUpload(folder.id)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                  title="Upload file"
                >
                  <Upload className="w-3 h-3" /> Upload
                </button>
                <button
                  onClick={() => onDelete("folder", folder.id, folder.name)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                  title="Delete folder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Assets list */}
            <div className="space-y-2">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileIcon mimeType={asset.mime_type} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate max-w-[140px]">
                        {asset.original_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatBytes(asset.size_bytes)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-gray-400">
                      {asset.total_downloads} dl
                    </span>
                    <button
                      onClick={() =>
                        onDownloadAsset(asset.id, asset.original_name)
                      }
                      className="text-gray-400 hover:text-brand-600 transition-colors"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        onDelete("asset", asset.id, asset.original_name)
                      }
                      className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {assets.length === 0 && (
                <p className="text-xs text-gray-400 py-3 text-center">
                  No assets yet.{" "}
                  <button
                    onClick={() => onUpload(folder.id)}
                    className="text-brand-600 hover:underline"
                  >
                    Upload a file.
                  </button>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
