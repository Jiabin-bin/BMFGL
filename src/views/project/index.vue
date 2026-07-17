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
        <el-table-column prop="name" label="项目名称" min-width="150" />
        <el-table-column prop="location" label="地点" min-width="140" show-overflow-tooltip />
        <el-table-column label="产品经理" width="170">
          <template #default="{ row }">
            <el-tooltip
              :content="formatNames(row.productManagerNames)"
              placement="top"
              :disabled="!hasNames(row.productManagerNames)"
            >
              <span class="table-ellipsis">{{ formatNames(row.productManagerNames) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="开发人员" width="180">
          <template #default="{ row }">
            <el-tooltip
              :content="formatNames(row.developerNames)"
              placement="top"
              :disabled="!hasNames(row.developerNames)"
            >
              <span class="table-ellipsis">{{ formatNames(row.developerNames) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="开发阶段" width="110" align="center">
          <template #default="{ row }">
            <DictTag v-model="row.stage" code="project_stage" />
          </template>
        </el-table-column>
        <el-table-column label="知识产权" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.ipType" type="info">{{ row.ipType }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="申报状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.declarationStatus" :type="getDeclarationStatusTag(row)">
              {{ row.declarationStatus }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="申报完成" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.declarationCompleted ? 'success' : 'info'">
              {{ row.declarationCompleted ? "已完成" : "未完成" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="简介" width="110" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              :disabled="!hasDescription(row.description)"
              @click="openDescriptionDrawer(row)"
            >
              查看
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="文档" width="110" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              :disabled="!normalizeFiles(row.documents).length"
              @click="openDocumentDrawer(row)"
            >
              查看({{ normalizeFiles(row.documents).length }})
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="代码包" width="110" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              :disabled="!normalizeCodeFiles(row.codeFiles).length"
              @click="openCodeFileDrawer(row)"
            >
              查看({{ normalizeCodeFiles(row.codeFiles).length }})
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="项目图片" width="170" align="center">
          <template #default="{ row }">
            <div v-if="normalizeImageUrls(row.imageUrls).length" class="project-image-list">
              <el-image
                v-for="(url, index) in normalizeImageUrls(row.imageUrls).slice(0, 3)"
                :key="url"
                class="project-image-thumb"
                :src="url"
                fit="cover"
                :preview-src-list="normalizeImageUrls(row.imageUrls)"
                :initial-index="index"
                preview-teleported
              />
            </div>
            <span v-else>-</span>
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
      size="860px"
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
          <WangEditor v-model="formData.description" height="300px" />
        </el-form-item>
        <el-form-item label="申报信息">
          <div class="declaration-entry">
            <div class="declaration-entry__summary">
              <el-tag v-if="formData.ipType" type="info">{{ formData.ipType }}</el-tag>
              <el-tag v-if="formData.declarationStatus" :type="getDeclarationStatusTag(formData)">
                {{ formData.declarationStatus }}
              </el-tag>
              <el-tag :type="formData.declarationCompleted ? 'success' : 'info'">
                {{ formData.declarationCompleted ? "已完成" : "未完成" }}
              </el-tag>
              <span v-if="!hasDeclarationInfo(formData)" class="declaration-entry__empty">
                暂未维护申报信息
              </span>
            </div>
            <el-button type="primary" plain @click="declarationDrawer.visible = true">
              维护申报信息
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="文档">
          <div class="document-register">
            <div class="document-register__row">
              <DictSelect
                v-model="documentForm.stage"
                code="project_stage"
                placeholder="请选择文档阶段"
              />
              <el-button type="primary" @click="handleAddDocuments">添加到项目文档</el-button>
            </div>
            <FileUpload
              v-model="documentForm.files"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              :limit="10"
              :max-file-size="50"
              upload-btn-text="上传文档"
              :style="{ width: '100%' }"
            />
          </div>
          <div v-if="formData.documents.length" class="document-stage-list">
            <div
              v-for="(file, index) in formData.documents"
              :key="`${file.url}-${index}`"
              class="document-stage-item"
            >
              <div class="document-stage-item__main">
                <DictTag v-if="file.stage" v-model="file.stage" code="project_stage" />
                <el-tag v-else type="info">未标记阶段</el-tag>
                <span class="document-stage-item__name">{{ file.name }}</span>
              </div>
              <el-button type="danger" link @click="removeDocument(index)">删除</el-button>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="项目图片">
          <MultiImageUpload v-model="formData.imageUrls" :limit="10" :max-file-size="10" />
        </el-form-item>
        <el-form-item label="代码包登记">
          <div class="code-file-register">
            <el-input
              v-model="codeFileForm.localPath"
              placeholder="请输入代码包文件或源码目录路径，如 D:\projects\demo"
              clearable
            />
            <el-input v-model="codeFileForm.remark" placeholder="备注（非必填）" clearable />
            <el-button type="primary" :loading="codeFileLoading" @click="handleAddCodeFile">
              添加登记
            </el-button>
          </div>
          <div v-if="formData.codeFiles.length" class="code-file-list">
            <div
              v-for="(file, index) in formData.codeFiles"
              :key="`${file.localPath}-${index}`"
              class="code-file-item"
            >
              <div class="code-file-item__main">
                <div class="code-file-item__name">{{ file.name }}</div>
                <div class="code-file-item__meta">
                  {{ formatCodeFileKind(file) }} / {{ formatFileSize(file.size) }} /
                  {{ file.fileCount || 0 }} 个文件 / {{ file.localPath }}
                </div>
                <div v-if="file.remark" class="code-file-item__remark">{{ file.remark }}</div>
              </div>
              <el-button type="danger" link @click="removeCodeFile(index)">删除</el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="drawer.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-drawer>

    <el-drawer v-model="declarationDrawer.visible" title="申报信息维护" size="720px" append-to-body>
      <el-form :model="formData" label-width="130px">
        <div class="form-section-title">申报主体与对接单位</div>
        <el-form-item label="归属单位ID">
          <el-input v-model="formData.declarationUnitId" placeholder="请输入申报归属单位ID" />
        </el-form-item>
        <el-form-item label="单位全称">
          <el-input v-model="formData.declarationUnitName" placeholder="请输入完整工商名称" />
        </el-form-item>
        <el-form-item label="协作单位">
          <el-input
            v-model="formData.cooperationUnits"
            type="textarea"
            :rows="2"
            placeholder="请输入联合申报高校、外协企业、研究院等"
          />
        </el-form-item>
        <el-form-item label="对接经办人">
          <el-input
            v-model="formData.unitContactPerson"
            placeholder="请输入对方单位联络人和联系电话"
          />
        </el-form-item>

        <div class="form-section-title">知识产权申报状态</div>
        <el-form-item label="知识产权类型">
          <el-select
            v-model="formData.ipType"
            clearable
            placeholder="请选择知识产权类型"
            style="width: 100%"
          >
            <el-option
              v-for="item in ipTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="申报状态">
          <el-select
            v-model="formData.declarationStatus"
            clearable
            placeholder="请选择申报状态"
            style="width: 100%"
          >
            <el-option
              v-for="item in declarationStatusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="完成标记">
          <el-switch
            v-model="formData.declarationCompleted"
            active-text="已完成"
            inactive-text="未完成"
          />
        </el-form-item>
        <el-form-item label="受理号">
          <el-input v-model="formData.acceptanceNo" placeholder="请输入申报受理号" />
        </el-form-item>
        <el-form-item label="证书/授权号">
          <el-input v-model="formData.certificateNo" placeholder="请输入证书编号或授权号" />
        </el-form-item>
        <el-form-item label="提交日期">
          <el-date-picker
            v-model="formData.submitDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择申报提交日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="办结日期">
          <el-date-picker
            v-model="formData.completeDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择办结完成日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="内部承办人">
          <el-input v-model="formData.internalHandler" placeholder="请输入公司申报专员" />
        </el-form-item>
        <el-form-item label="费用归属单位">
          <el-input v-model="formData.feeUnit" placeholder="请输入申报费用归属单位" />
        </el-form-item>

        <div class="form-section-title">补充备注</div>
        <el-form-item label="申报备注">
          <el-input
            v-model="formData.declarationRemark"
            type="textarea"
            :rows="3"
            placeholder="请输入联合申报比例、权属约定、政府补贴对应项目、加急申报等"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button type="primary" @click="declarationDrawer.visible = false">完成</el-button>
      </template>
    </el-drawer>

    <el-drawer
      v-model="documentDrawer.visible"
      :title="documentDrawer.title"
      size="520px"
      append-to-body
    >
      <el-empty v-if="!documentDrawer.files.length" description="暂无文档" />
      <div v-else class="document-stage-group-list">
        <div
          v-for="group in groupedDocuments(documentDrawer.files)"
          :key="group.stage || 'unknown'"
          class="document-stage-group"
        >
          <div class="document-stage-group__title">
            <DictTag v-if="group.stage" v-model="group.stage" code="project_stage" />
            <el-tag v-else type="info">未标记阶段</el-tag>
            <span>{{ group.files.length }} 个文档</span>
          </div>
          <div class="document-list">
            <div v-for="file in group.files" :key="file.url" class="document-item">
              <div class="document-item__main">
                <el-icon><Document /></el-icon>
                <span class="document-item__name">{{ file.name }}</span>
              </div>
              <div class="document-item__actions">
                <el-button type="primary" link @click="previewFile(file)">预览</el-button>
                <el-button type="primary" link @click="downloadFile(file)">下载</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>

    <el-drawer
      v-model="descriptionDrawer.visible"
      :title="descriptionDrawer.title"
      size="620px"
      append-to-body
    >
      <el-empty v-if="!descriptionDrawer.content" description="暂无简介" />
      <div v-else class="project-description" v-html="descriptionDrawer.content"></div>
    </el-drawer>

    <el-drawer
      v-model="codeFileDrawer.visible"
      :title="codeFileDrawer.title"
      size="680px"
      append-to-body
    >
      <el-empty v-if="!codeFileDrawer.files.length" description="暂无代码包" />
      <div v-else class="code-file-list code-file-list--drawer">
        <div
          v-for="file in codeFileDrawer.files"
          :key="file.localPath"
          class="code-file-item code-file-item--detail"
        >
          <div class="code-file-item__main">
            <div class="code-file-item__name">{{ file.name }}</div>
            <div class="code-file-item__meta">
              {{ formatCodeFileKind(file) }} / {{ formatFileSize(file.size) }} /
              {{ file.fileCount || 0 }} 个文件
            </div>
            <div class="code-file-item__path">{{ file.localPath }}</div>
            <div v-if="file.remark" class="code-file-item__remark">备注：{{ file.remark }}</div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { Document, Refresh } from "@element-plus/icons-vue";
import ProjectAPI from "@/api/project";
import UserAPI from "@/api/system/user";
import FileAPI from "@/api/file";
import DictSelect from "@/components/DictSelect/index.vue";
import DictTag from "@/components/DictTag/index.vue";
import FileUpload from "@/components/Upload/FileUpload.vue";
import MultiImageUpload from "@/components/Upload/MultiImageUpload.vue";
import WangEditor from "@/components/WangEditor/index.vue";

const loading = ref(false);
const submitLoading = ref(false);
const codeFileLoading = ref(false);
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
  declarationUnitId: "",
  declarationUnitName: "",
  cooperationUnits: "",
  unitContactPerson: "",
  ipType: "",
  declarationStatus: "",
  declarationCompleted: false,
  acceptanceNo: "",
  certificateNo: "",
  submitDate: "",
  completeDate: "",
  internalHandler: "",
  feeUnit: "",
  declarationRemark: "",
  documents: [],
  imageUrls: [],
  codeFiles: [],
};

const formData = reactive({ ...initialFormData });

const codeFileForm = reactive({
  localPath: "",
  remark: "",
});

const ipTypeOptions = [
  { label: "发明专利", value: "发明专利" },
  { label: "实用新型", value: "实用新型" },
  { label: "外观专利", value: "外观专利" },
  { label: "软著", value: "软著" },
  { label: "商标", value: "商标" },
  { label: "集成电路布图", value: "集成电路布图" },
  { label: "植物新品种", value: "植物新品种" },
];

const declarationStatusOptions = [
  { label: "未启动申报", value: "未启动申报" },
  { label: "材料整理中", value: "材料整理中" },
  { label: "提交受理", value: "提交受理" },
  { label: "审查中", value: "审查中" },
  { label: "授权 / 登记", value: "授权 / 登记" },
  { label: "驳回", value: "驳回" },
  { label: "失效", value: "失效" },
];

const documentForm = reactive({
  stage: "",
  files: [],
});

const drawer = reactive({
  visible: false,
  title: "新增项目",
});

const declarationDrawer = reactive({
  visible: false,
});

const documentDrawer = reactive({
  visible: false,
  title: "项目文档",
  files: [],
});

const descriptionDrawer = reactive({
  visible: false,
  title: "项目简介",
  content: "",
});

const codeFileDrawer = reactive({
  visible: false,
  title: "代码包",
  files: [],
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
  codeFileForm.localPath = "";
  codeFileForm.remark = "";
  documentForm.stage = "";
  documentForm.files = [];
  declarationDrawer.visible = false;
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
      documents: normalizeFiles(data.documents),
      imageUrls: normalizeImageUrls(data.imageUrls),
      codeFiles: normalizeCodeFiles(data.codeFiles),
    });
  } else {
    drawer.title = "新增项目";
  }
  drawer.visible = true;
}

function openDocumentDrawer(row) {
  documentDrawer.title = `${row.name} - 项目文档`;
  documentDrawer.files = normalizeFiles(row.documents);
  documentDrawer.visible = true;
}

function openDescriptionDrawer(row) {
  descriptionDrawer.title = `${row.name} - 项目简介`;
  descriptionDrawer.content = row.description || "";
  descriptionDrawer.visible = true;
}

function openCodeFileDrawer(row) {
  codeFileDrawer.title = `${row.name} - 代码包`;
  codeFileDrawer.files = normalizeCodeFiles(row.codeFiles);
  codeFileDrawer.visible = true;
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

function previewFile(file) {
  if (!file?.url) return;
  window.open(file.url, "_blank", "noopener,noreferrer");
}

function downloadFile(file) {
  if (!file?.url) return;
  FileAPI.download(file.url, file.name);
}

function handleAddDocuments() {
  const files = normalizeFiles(documentForm.files);
  if (!documentForm.stage) {
    ElMessage.warning("请选择文档所属阶段");
    return;
  }
  if (!files.length) {
    ElMessage.warning("请先点击上传文档选择文件");
    return;
  }

  const nextFiles = files.map((file) => ({
    ...file,
    stage: documentForm.stage,
  }));
  const existsUrls = new Set(formData.documents.map((file) => file.url));
  formData.documents.push(...nextFiles.filter((file) => !existsUrls.has(file.url)));
  documentForm.stage = "";
  documentForm.files = [];
  ElMessage.success("文档添加成功");
}

function removeDocument(index) {
  formData.documents.splice(index, 1);
}

async function handleAddCodeFile() {
  if (!codeFileForm.localPath.trim()) {
    ElMessage.warning("请填写代码包本机路径");
    return;
  }

  codeFileLoading.value = true;
  try {
    const file = await ProjectAPI.inspectCodeFile({
      localPath: codeFileForm.localPath,
      remark: codeFileForm.remark,
    });
    const exists = formData.codeFiles.some((item) => item.localPath === file.localPath);
    if (exists) {
      ElMessage.warning("该代码包已经登记过");
      return;
    }
    formData.codeFiles.push(file);
    codeFileForm.localPath = "";
    codeFileForm.remark = "";
    ElMessage.success("代码包登记成功");
  } finally {
    codeFileLoading.value = false;
  }
}

function removeCodeFile(index) {
  formData.codeFiles.splice(index, 1);
}

function normalizeFiles(files) {
  if (!Array.isArray(files)) return [];
  return files
    .map((file) => ({
      name: file?.name || file?.url?.split("/").pop() || "未命名文档",
      url: file?.url || "",
      stage: file?.stage || "",
    }))
    .filter((file) => file.url);
}

function groupedDocuments(files) {
  const groups = [];
  normalizeFiles(files).forEach((file) => {
    const stage = file.stage || "";
    let group = groups.find((item) => item.stage === stage);
    if (!group) {
      group = { stage, files: [] };
      groups.push(group);
    }
    group.files.push(file);
  });
  return groups;
}

function normalizeCodeFiles(files) {
  if (!Array.isArray(files)) return [];
  return files
    .map((file) => ({
      name: file?.name || file?.localPath?.split(/[\\/]/).pop() || "未命名代码包",
      size: Number(file?.size || 0),
      type: file?.type || file?.name?.split(".").pop() || "unknown",
      kind: file?.kind || (file?.type === "folder" ? "folder" : "file"),
      fileCount: Number(file?.fileCount || 0),
      localPath: file?.localPath || file?.url || "",
      uploadTime: file?.uploadTime || "",
      projectId: file?.projectId || "",
      uploadBy: file?.uploadBy || "",
      remark: file?.remark || "",
    }))
    .filter((file) => file.localPath);
}

function normalizeImageUrls(imageUrls) {
  if (!Array.isArray(imageUrls)) return [];
  return imageUrls.filter((url) => typeof url === "string" && url.trim().length > 0);
}

function formatNames(names) {
  return Array.isArray(names) && names.length ? names.join("、") : "-";
}

function hasNames(names) {
  return Array.isArray(names) && names.length > 0;
}

function formatFileSize(size) {
  const bytes = Number(size || 0);
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function formatCodeFileKind(file) {
  return file?.kind === "folder" || file?.type === "folder" ? "源码目录" : `代码文件(${file.type})`;
}

function hasDeclarationInfo(data) {
  return Boolean(
    data.ipType ||
    data.declarationStatus ||
    data.declarationCompleted ||
    data.declarationUnitId ||
    data.declarationUnitName ||
    data.acceptanceNo ||
    data.certificateNo
  );
}

function getDeclarationStatusTag(data) {
  if (data.declarationCompleted || data.declarationStatus === "授权 / 登记") return "success";
  if (data.declarationStatus === "驳回" || data.declarationStatus === "失效") return "danger";
  if (data.declarationStatus === "提交受理" || data.declarationStatus === "审查中")
    return "warning";
  return "info";
}

function formatDescription(description) {
  if (!description) return "-";
  const text = String(description)
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text || "-";
}

function hasDescription(description) {
  return formatDescription(description) !== "-";
}

onMounted(() => {
  fetchProjectList();
});
</script>

<style scoped>
.document-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-section-title {
  padding-left: 10px;
  margin: 18px 0 12px;
  font-weight: 600;
  line-height: 1;
  color: var(--el-text-color-primary);
  border-left: 3px solid var(--el-color-primary);
}

.declaration-entry {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.declaration-entry__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.declaration-entry__empty {
  color: var(--el-text-color-secondary);
}

.document-register {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.document-register__row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto;
  gap: 8px;
  width: 100%;
}

.document-stage-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-top: 10px;
}

.document-stage-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.document-stage-item__main {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.document-stage-item__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-stage-group-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.document-stage-group__title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  color: var(--el-text-color-secondary);
}

.table-ellipsis {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
}

.document-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.document-item__main {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.document-item__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-item__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
  margin-left: 12px;
}

.code-file-register {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(160px, 220px) auto;
  gap: 8px;
  width: 100%;
}

.code-file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-top: 10px;
}

.code-file-list--drawer {
  margin-top: 0;
}

.code-file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.code-file-item__main {
  min-width: 0;
}

.code-file-item__name {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.code-file-item__meta,
.code-file-item__remark {
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.code-file-item__path {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
  word-break: break-all;
}

.project-image-list {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.project-image-thumb {
  width: 42px;
  height: 42px;
  border-radius: 4px;
}

.project-description {
  line-height: 1.7;
  color: var(--el-text-color-primary);
  overflow-wrap: anywhere;
}

.project-description :deep(img) {
  max-width: 100%;
  height: auto;
}

.project-description :deep(table) {
  width: 100%;
  border-collapse: collapse;
}
</style>
