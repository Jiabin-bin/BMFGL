import { reactive, ref } from "vue";

export function usePageTable(options = {}) {
  const { initialParams = { pageNum: 1, pageSize: 10 }, request, onBeforeReset } = options;

  const loading = ref(false);
  const list = ref([]);
  const total = ref(0);
  const params = reactive({ ...initialParams });

  async function fetchData() {
    if (typeof request !== "function") return;

    loading.value = true;
    try {
      const res = await request(params);
      list.value = res?.list ?? res?.data?.list ?? res?.data ?? [];
      total.value = Number(res?.total ?? res?.data?.total ?? 0);
    } finally {
      loading.value = false;
    }
  }

  function handleQuery() {
    params.pageNum = 1;
    return fetchData();
  }

  function handleResetQuery() {
    if (typeof onBeforeReset === "function") {
      onBeforeReset();
    }

    Object.keys(params).forEach((key) => {
      delete params[key];
    });
    Object.assign(params, initialParams);
    return fetchData();
  }

  return {
    loading,
    list,
    total,
    params,
    fetchData,
    handleQuery,
    handleResetQuery,
  };
}
