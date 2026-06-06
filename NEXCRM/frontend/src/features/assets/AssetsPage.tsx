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
} from "lucide-react";

export default function AssetsPage() {
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [folderName, setFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");

  const { data: projects } = useQuery({
    queryKey: ["asset-projects"],
    queryFn: () => api.get("/assets/projects").then((r) => r.data),
  });

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
      toast.success("File uploaded.");
    },
  });

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
                <button
                  onClick={() => handleUpload(folder.id)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" /> Upload
                </button>
              </div>
              <div className="space-y-2">
                {(folder.assets || [])
                  .filter((a: any) => a.is_active)
                  .map((asset: any) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        {getFileIcon(asset.mime_type)}
                        <div>
                          <p className="text-xs font-medium text-gray-900 truncate max-w-[150px]">
                            {asset.original_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {(asset.size_bytes / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">
                          {asset.total_downloads} dl
                        </span>
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
    </div>
  );
}
