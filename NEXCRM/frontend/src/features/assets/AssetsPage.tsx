import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  FolderPlus,
  Upload,
  FileText,
  Image,
  File,
  Download,
  Trash2,
  X,
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

interface S3AssetItem {
  id: string;
  original_name: string;
  s3_key: string;
  mime_type: string;
  size_bytes: number;
  total_downloads: number;
  created_at: string;
  presigned_url: string;
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

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
  const [selectedFolder, setSelectedFolder] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{
    type: "folder" | "asset";
    id: string;
    name: string;
    source?: "s3" | "local";
  } | null>(null);

  const [exportFolder, setExportFolder] = useState<Folder | null>(null);
  const [exportMode, setExportMode] = useState<"asset" | null>(null);

  // ── queries ──────────────────────────────────────────────────────────────────
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["asset-projects"],
    queryFn: () => api.get("/assets/projects").then((r) => r.data),
  });

  const { data: s3Assets = [] } = useQuery<S3AssetItem[]>({
    queryKey: ["s3-assets"],
    queryFn: () => api.get("/uploads").then((r) => r.data),
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
        .post("/uploads/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["s3-assets"] });
      if (data?.duplicate) {
        toast.success("File already in library — reusing existing asset.");
      } else {
        toast.success("File uploaded to S3 successfully.");
      }
    },
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

  const deleteS3AssetMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/uploads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["s3-assets"] });
      toast.success("File removed from S3 library.");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to remove file."),
  });

  // ── handlers ──────────────────────────────────────────────────────────────────
  const handleUpload = (folderId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.docx,.pptx,.jpg,.jpeg,.png";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder_id", folderId);
        uploadMutation.mutate(formData);
      }
    };
    input.click();
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes("image"))
      return <Image className="w-5 h-5 text-purple-500" />;
    if (mimeType?.includes("pdf"))
      return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
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
    } else if (deleteTarget.source === "s3") {
      deleteS3AssetMutation.mutate(deleteTarget.id);
    } else {
      deleteAssetMutation.mutate(deleteTarget.id);
    }
  };

  const activeAssets = (folder: Folder) =>
    (folder.assets || []).filter((a) => a.is_active);

  const currentProject =
    projects?.find((p: any) => p.id === selectedProject) || projects?.[0];

  return (
    <div className="space-y-6">
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

      {showCreateProject && (
        <div className="card flex items-center gap-4">
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project name"
            className="input-field flex-1"
          />
          <button
            onClick={() => createProjectMutation.mutate({ name: projectName })}
            className="btn-primary"
          >
            Create
          </button>
          <button
            onClick={() => setShowCreateProject(false)}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      )}

      {showCreateFolder && currentProject && (
        <div className="card flex items-center gap-4">
          <input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            className="input-field flex-1"
          />
          <button
            onClick={() =>
              createFolderMutation.mutate({
                name: folderName,
                project_id: currentProject.id,
              })
            }
            className="btn-primary"
          >
            Create
          </button>
          <button
            onClick={() => setShowCreateFolder(false)}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Project Tabs */}
      {projects && projects.length > 0 && (
        <div className="flex gap-2 border-b">
          {projects.map((project: any) => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${(selectedProject || projects[0]?.id) === project.id ? "border-brand-600 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {project.name}
            </button>
          ))}
        </div>
      )}

      {/* Folders & Assets */}
      {currentProject && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {(currentProject.folders || []).map((folder: any) => (
            <div key={folder.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  📁 {folder.name}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setExportFolder(folder);
                      setExportMode(null);
                    }}
                    className="text-xs text-gray-500 hover:text-brand-600 font-medium flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Export
                  </button>
                  <button
                    onClick={() => handleUpload(folder.id)}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" /> Upload
                  </button>
                  <button
                    onClick={() =>
                      setDeleteTarget({
                        type: "folder",
                        id: folder.id,
                        name: folder.name,
                      })
                    }
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {(folder.assets || [])
                  .filter((a: any) => a.is_active)
                  .map((asset: any) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(asset.mime_type)}
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
                            handleDownloadAsset(asset.id, asset.original_name)
                          }
                          className="text-gray-400 hover:text-brand-600 transition-colors"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({
                              type: "asset",
                              id: asset.id,
                              name: asset.original_name,
                              source: "local",
                            })
                          }
                          className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                {(!folder.assets ||
                  folder.assets.filter((a: any) => a.is_active).length ===
                    0) && (
                  <p className="text-xs text-gray-400 py-3 text-center">
                    No assets yet. Upload a file.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(!projects || projects.length === 0) && (
        <div className="card text-center py-12">
          <FolderPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            No asset projects yet. Create one to get started.
          </p>
        </div>
      )}

      {/* S3 File Library */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">S3 File Library</h2>
          <span className="text-xs text-gray-400">
            {s3Assets.length} file{s3Assets.length !== 1 ? "s" : ""}
          </span>
        </div>

        {s3Assets.length === 0 ? (
          <div className="card text-center py-8">
            <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">
              No S3 files yet. Use "Upload" on a folder above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {s3Assets.map((asset) => (
              <div
                key={asset.id}
                className="card flex items-center gap-3 group"
              >
                <div className="p-2 bg-gray-100 rounded-lg shrink-0">
                  <FileIcon mimeType={asset.mime_type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {asset.original_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatBytes(asset.size_bytes)} ·{" "}
                    {asset.total_downloads} download
                    {asset.total_downloads !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-gray-300">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={async () => {
                      try {
                        const { data } = await api.get(
                          `/uploads/${asset.id}/url`
                        );
                        window.open(data.presigned_url, "_blank");
                      } catch {
                        toast.error("Download failed.");
                      }
                    }}
                    className="text-gray-400 hover:text-brand-600 transition-colors p-1"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setDeleteTarget({
                        type: "asset",
                        id: asset.id,
                        name: asset.original_name,
                        source: "s3",
                      })
                    }
                    className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                Delete {deleteTarget.type === "folder" ? "Folder" : "Asset"}
              </h3>
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-1">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900">
                "{deleteTarget.name}"
              </span>
              ?
            </p>
            {deleteTarget.type === "folder" && (
              <p className="text-sm text-red-500 mb-4">
                This will also delete all assets inside the folder.
              </p>
            )}
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={
                  deleteFolderMutation.isPending ||
                  deleteAssetMutation.isPending ||
                  deleteS3AssetMutation.isPending
                }
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {deleteFolderMutation.isPending ||
                deleteAssetMutation.isPending ||
                deleteS3AssetMutation.isPending
                  ? "Deleting…"
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportFolder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                Export — {exportFolder.name}
              </h3>
              <button
                onClick={() => {
                  setExportFolder(null);
                  setExportMode(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!exportMode && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  What would you like to export?
                </p>
                <button
                  onClick={() => setExportMode("asset")}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-colors text-left"
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
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
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
            )}

            {exportMode === "asset" && (
              <div className="space-y-3">
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
