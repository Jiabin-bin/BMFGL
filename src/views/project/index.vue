<template>
  <div class="page-container">
    <el-card class="page-search" shadow="never">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="关键字">
          <el-input
            v-model="queryParams.keywords"
            placeholder="项目名称/地点"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="阶段">
          <DictSelect v-model="queryParams.stage" code="project_stage" placeholder="全部" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">
        <div class="page-toolbar__left">
          <el-button v-hasPerm="['project:create']" type="primary" @click="openDrawer()">
            新增项目
          </el-button>
        </div>
        <div class="page-toolbar__right">
          <el-tooltip content="刷新" placement="top">
            <el-button class="page-icon-btn" @click="handleQuery">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <el-table v-loading="loading" border :data="projectList" style="width: 100%">
        <el-table-column prop="name" label="项目名称" min-width="160" />
        <el-table-column prop="location" label="地点" min-width="180" show-overflow-tooltip />
        <el-table-column label="产品经理" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ formatNames(row.productManagerNames) }}</template>
        </el-table-column>
        <el-table-column label="开发人员" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ formatNames(row.developerNames) }}</template>
        </el-table-column>
        <el-table-column label="开发阶段" width="110" align="center">
          <template #default="{ row }">
            <DictTag v-model="row.stage" code="project_stage" />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column fixed="right" label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button
              v-hasPerm="['project:update']"
              type="primary"
              link
              @click="openDrawer(row.id)"
            >
              编辑
            </el-button>
            <el-button
              v-hasPerm="['project:delete']"
              type="danger"
              link
              @click="handleDelete(row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination
        v-if="total > 0"
        v-model:total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="fetchProjectList"
      />
    </el-card>

    <el-drawer
      v-model="drawer.visible"
      :title="drawer.title"
      size="560px"
      append-to-body
      @closed="resetForm"
    >
      <el-form ref="projectFormRef" :model="formData" :rules="rules" label-width="110px">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="地点" prop="location">
          <el-input v-model="formData.location" placeholder="请输入地点" />
        </el-form-item>
        <el-form-item label="产品经理" prop="productManagerIds">
          <el-select
            v-model="formData.productManagerIds"
            multiple
            filterable
            clearable
            placeholder="请选择产品经理"
            style="width: 100%"
          >
            <el-option
              v-for="user in productManagerOptions"
              :key="user.value"
              :label="user.label"
              :value="String(user.value)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="开发人员" prop="developerIds">
          <el-select
            v-model="formData.developerIds"
            multiple
            filterable
            clearable
            placeholder="请选择开发人员"
            style="width: 100%"
          >
            <el-option
              v-for="user in developerOptions"
              :key="user.value"
              :label="user.label"
              :value="String(user.value)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="开发阶段" prop="stage">
          <DictSelect v-model="formData.stage" code="project_stage" placeholder="请选择开发阶段" />
        </el-form-item>
        <el-form-item label="简介" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="4"
            placeholder="请输入简介"
          />
        </el-form-item>
        <el-form-item label="文档">
          <FileUpload
            v-model="formData.documents"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            :max-file-size="50"
            upload-btn-text="上传文档"
            :style="{ width: '100%' }"
          />
        </el-form-item>
        <el-form-item label="代码上传">
          <FileUpload
            v-model="formData.codeFiles"
            accept=".zip,.rar,.7z"
            :max-file-size="200"
            upload-btn-text="上传代码包"
            :style="{ width: '100%' }"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="drawer.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { Refresh } from "@element-plus/icons-vue";
import ProjectAPI from "@/api/project";
import UserAPI from "@/api/system/user";
import DictSelect from "@/components/DictSelect/index.vue";
import DictTag from "@/components/DictTag/index.vue";
import FileUpload from "@/components/Upload/FileUpload.vue";

const loading = ref(false);
const submitLoading = ref(false);
const total = ref(0);
const projectList = ref([]);
const productManagerOptions = ref([]);
const developerOptions = ref([]);
const projectFormRef = ref();

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  keywords: "",
  stage: "",
});

const initialFormData = {
  id: undefined,
  name: "",
  location: "",
  productManagerIds: [],
  developerIds: [],
  stage: "",
  description: "",
  documents: [],
  codeFiles: [],
};

const formData = reactive({ ...initialFormData });

const drawer = reactive({
  visible: false,
  title: "新增项目",
});

const rules = {
  name: [{ required: true, message: "请输入项目名称", trigger: "blur" }],
  location: [{ required: true, message: "请输入地点", trigger: "blur" }],
  productManagerIds: [{ required: true, message: "请选择产品经理", trigger: "change" }],
  developerIds: [{ required: true, message: "请选择开发人员", trigger: "change" }],
  stage: [{ required: true, message: "请选择开发阶段", trigger: "change" }],
};

function resetForm() {
  Object.keys(formData).forEach((key) => delete formData[key]);
  Object.assign(formData, structuredClone(initialFormData));
  projectFormRef.value?.clearValidate();
}

async function fetchProjectList() {
  loading.value = true;
  try {
    const { list, total: totalCount } = await ProjectAPI.getPage(queryParams);
    projectList.value = list || [];
    total.value = totalCount || 0;
  } finally {
    loading.value = false;
  }
}

async function fetchUserOptions() {
  const [productManagers, developers] = await Promise.all([
    UserAPI.getOptions({ roleCode: "PRODUCT_MANAGER" }),
    UserAPI.getOptions({ roleCode: "DEVELOPER" }),
  ]);
  productManagerOptions.value = productManagers;
  developerOptions.value = developers;
}

function handleQuery() {
  queryParams.pageNum = 1;
  fetchProjectList();
}

function handleReset() {
  queryParams.pageNum = 1;
  queryParams.keywords = "";
  queryParams.stage = "";
  fetchProjectList();
}

async function openDrawer(id) {
  resetForm();
  await fetchUserOptions();
  if (id) {
    drawer.title = "编辑项目";
    const data = await ProjectAPI.getFormData(id);
    Object.assign(formData, {
      ...data,
      productManagerIds: (data.productManagerIds || []).map(String),
      developerIds: (data.developerIds || []).map(String),
      documents: data.documents || [],
      codeFiles: data.codeFiles || [],
    });
  } else {
    drawer.title = "新增项目";
  }
  drawer.visible = true;
}

async function handleSubmit() {
  const valid = await projectFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitLoading.value = true;
  try {
    if (formData.id) {
      await ProjectAPI.update(formData.id, formData);
      ElMessage.success("修改成功");
    } else {
      await ProjectAPI.create(formData);
      ElMessage.success("新增成功");
    }
    drawer.visible = false;
    fetchProjectList();
  } finally {
    submitLoading.value = false;
  }
}

async function handleDelete(id) {
  await ElMessageBox.confirm("确认删除该项目吗？", "提示", { type: "warning" });
  await ProjectAPI.deleteByIds(id);
  ElMessage.success("删除成功");
  fetchProjectList();
}

function formatNames(names) {
  return Array.isArray(names) && names.length ? names.join("、") : "-";
}

onMounted(() => {
  fetchProjectList();
});
</script>
