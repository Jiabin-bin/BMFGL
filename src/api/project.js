import request from "@/utils/request";

const PROJECT_BASE_URL = "/api/v1/projects";

const ProjectAPI = {
  getPage(queryParams) {
    return request({
      url: PROJECT_BASE_URL,
      method: "get",
      params: queryParams,
    });
  },

  create(data) {
    return request({
      url: PROJECT_BASE_URL,
      method: "post",
      data,
    });
  },

  getFormData(id) {
    return request({
      url: `${PROJECT_BASE_URL}/${id}/form`,
      method: "get",
    });
  },

  update(id, data) {
    return request({
      url: `${PROJECT_BASE_URL}/${id}`,
      method: "put",
      data,
    });
  },

  inspectCodeFile(data) {
    return request({
      url: `${PROJECT_BASE_URL}/code-files/inspect`,
      method: "post",
      data,
    });
  },

  deleteByIds(ids) {
    return request({
      url: `${PROJECT_BASE_URL}/${ids}`,
      method: "delete",
    });
  },
};

export default ProjectAPI;
