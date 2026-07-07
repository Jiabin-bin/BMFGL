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
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("File download failed");
      }
      const blob = await response.blob();
      const a = document.createElement("a");
      const objectUrl = window.URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = fileName || "download";
      a.click();
      window.URL.revokeObjectURL(objectUrl);
      return;
    }

    return request({
      url,
      method: "get",
      responseType: "blob",
    }).then((res) => {
      const blob = new Blob([res.data]);
      const a = document.createElement("a");
      const objectUrl = window.URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = fileName || "download";
      a.click();
      window.URL.revokeObjectURL(objectUrl);
    });
  },
};

export default FileAPI;
