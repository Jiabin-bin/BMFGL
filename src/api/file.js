import request from "@/utils/request";

const FileAPI = {
  /** 上传文件 （传入 FormData，上传进度回调） */
  upload(formData, onProgress) {
    return request({
      url: "/api/v1/files",
      method: "post",
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress?.(percent);
        }
      },
    });
  },

  /**
   * 上传文件
   */
  uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    return request({
      url: "/api/v1/files",
      method: "post",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  /**
   * 删除文件
   *
   * @param filePath 文件完整路径
   */
  delete(filePath) {
    return request({
      url: "/api/v1/files",
      method: "delete",
      params: { filePath },
    });
  },

  /**
   * 下载文件
   * @param url
   * @param fileName
   */
  async download(url, fileName) {
    const isStaticFileUrl = /^https?:\/\//i.test(url) || url.startsWith("/uploads/");

    if (isStaticFileUrl) {
      try {
        const response = await fetch(url, { mode: "cors" });
        if (!response.ok) {
          throw new Error("File download failed");
        }
        const blob = await response.blob();
        triggerDownload(window.URL.createObjectURL(blob), fileName || "download", true);
      } catch {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      return;
    }

    return request({
      url,
      method: "get",
      responseType: "blob",
    }).then((res) => {
      const blob = new Blob([res.data]);
      triggerDownload(window.URL.createObjectURL(blob), fileName || "download", true);
    });
  },
};

function triggerDownload(href, fileName, revokeObjectUrl = false) {
  const a = document.createElement("a");
  a.href = href;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (revokeObjectUrl) {
    window.URL.revokeObjectURL(href);
  }
}

export default FileAPI;
