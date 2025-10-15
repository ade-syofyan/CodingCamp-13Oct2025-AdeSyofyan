(() => {
  "use strict";

  const STORAGE_KEY = "todo-app-state-v1";

  const statusFilter = document.getElementById("statusFilter");
  const searchInput = document.getElementById("search");
  const dateFromInput = document.getElementById("dateFrom");
  const dateToInput = document.getElementById("dateTo");
  const clearFiltersButton = document.getElementById("clearFilters");
  const todoList = document.getElementById("todo-list");
  const emptyState = document.getElementById("empty-state");
  const counter = document.getElementById("counter");
  const addTaskButton = document.getElementById("add-task-btn");

  // Unified Task Modal Elements
  const taskModal = document.getElementById("task-modal");
  const taskForm = document.getElementById("task-form");
  const taskModalTitle = document.getElementById("task-modal-title");
  const taskModalSaveButton = document.getElementById("task-modal-save");
  const taskIdInput = document.getElementById("task-id");
  const taskTitleInput = document.getElementById("task-title");
  const taskDueDateInput = document.getElementById("task-dueDate");
  const taskFormMessage = document.getElementById("task-form-message");

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  let todos = loadTodos();
  let filterState = {
    status: statusFilter.value,
    query: "",
    dateFrom: "",
    dateTo: "",
  };

  render();

  statusFilter.addEventListener("change", (event) => {
    setFilter({ status: event.target.value });
  });
  searchInput.addEventListener("input", (event) => {
    setFilter({ query: event.target.value.trim() });
  });
  dateFromInput.addEventListener("change", (event) => {
    setFilter({ dateFrom: event.target.value });
  });
  dateToInput.addEventListener("change", (event) => {
    setFilter({ dateTo: event.target.value });
  });
  clearFiltersButton.addEventListener("click", () => {
    statusFilter.value = "all";
    searchInput.value = "";
    dateFromInput.value = "";
    dateToInput.value = "";
    setFilter({ status: "all", query: "", dateFrom: "", dateTo: "" });
  });
  addTaskButton.addEventListener("click", handleAdd);
  taskModal.addEventListener("click", (event) => {
    if (event.target.closest('[data-action="close-modal"]')) {
      closeTaskModal();
    }
  });
  taskForm.addEventListener("submit", handleTaskFormSubmit);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !taskModal.hidden) {
      closeTaskModal();
    }
  });

  function validateForm(title, dueDate) {
    if (!title) {
      return "Judul tidak boleh kosong.";
    }

    if (!dueDate) {
      return "Silakan pilih tanggal jatuh tempo.";
    }

    if (!parseISODate(dueDate)) {
      return "Format tanggal tidak dikenali.";
    }

    return "";
  }

  function addTodo(title, dueDate) {
    const newTodo = {
      id: generateId(),
      title,
      dueDate,
      completed: false,
      completedAt: null,
      createdAt: Date.now(),
    };

    todos = [newTodo, ...todos];
    persistTodos();
    render();
  }

  function toggleComplete(id) {
    const index = todos.findIndex((todo) => todo.id === id);
    if (index === -1) {
      return;
    }

    const wasCompleted = todos[index].completed;
    todos[index] = {
      ...todos[index],
      completed: !wasCompleted,
      completedAt: !wasCompleted ? Date.now() : null,
    };

    persistTodos();
    render();

    const feedbackMessage = !wasCompleted
      ? `Tugas "${todos[index].title}" ditandai selesai.`
      : `Tugas "${todos[index].title}" ditandai aktif.`;
    Toast.fire({ icon: "success", title: feedbackMessage });
  }

  function handleAdd() {
    openTaskModal({ mode: "add" });
  }

  function handleEdit(id) {
    const todo = todos.find((item) => item.id === id);
    if (!todo) return;
    openTaskModal({ mode: "edit", todo });
  }

  function handleTaskFormSubmit(event) {
    event.preventDefault();
    const id = taskIdInput.value;
    const title = taskTitleInput.value.trim();
    const dueDate = taskDueDateInput.value;

    const errorMessage = validateForm(title, dueDate);
    taskFormMessage.textContent = errorMessage;
    taskFormMessage.className = `form__message ${
      errorMessage ? "form__message--error" : ""
    }`;

    if (errorMessage) return;

    if (id) {
      // Edit mode
      const index = todos.findIndex((item) => item.id === id);
      if (index > -1) {
        todos[index] = { ...todos[index], title, dueDate };
        Toast.fire({ icon: "success", title: "Tugas berhasil diperbarui." });
      }
    } else {
      // Add mode
      addTodo(title, dueDate);
      Toast.fire({ icon: "success", title: "Tugas berhasil ditambahkan." });
    }

    persistTodos();
    render();
    closeTaskModal();
  }

  function openTaskModal({ mode, todo = {} }) {
    taskForm.reset();
    taskIdInput.value = mode === "edit" ? todo.id : "";
    taskTitleInput.value = mode === "edit" ? todo.title : "";
    taskDueDateInput.value = mode === "edit" ? todo.dueDate : "";
    taskModalTitle.textContent =
      mode === "edit" ? "Edit Tugas" : "Tambah Tugas";
    taskModalSaveButton.innerHTML =
      mode === "edit"
        ? `<i data-lucide="save"></i> Simpan Perubahan`
        : `<i data-lucide="plus"></i> Tambah Tugas`;

    taskModal.hidden = false;
    lucide.createIcons();
  }

  function closeTaskModal() {
    taskModal.hidden = true;
    taskForm.reset();
    taskFormMessage.textContent = "";
  }

  async function deleteTodo(id) {
    const todo = todos.find((item) => item.id === id);
    if (!todo) {
      return;
    }

    const result = await Swal.fire({
      title: "Anda yakin?",
      text: `Tugas "${todo.title}" akan dihapus secara permanen.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      todos = todos.filter((item) => item.id !== id);
      persistTodos();
      render();
      Toast.fire({ icon: "success", title: "Tugas telah dihapus." });
    }
  }

  function setFilter(partial) {
    filterState = { ...filterState, ...partial };
    render();
  }

  function getFilteredTodos() {
    const query = filterState.query.toLowerCase();
    return todos
      .filter((todo) => {
        if (filterState.status === "active" && todo.completed) {
          return false;
        }
        if (filterState.status === "done" && !todo.completed) {
          return false;
        }
        if (query && !todo.title.toLowerCase().includes(query)) {
          return false;
        }
        if (filterState.dateFrom && todo.dueDate < filterState.dateFrom) {
          return false;
        }
        if (filterState.dateTo && todo.dueDate > filterState.dateTo) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dueCompare = a.dueDate.localeCompare(b.dueDate);
        if (dueCompare !== 0) {
          return dueCompare;
        }
        return b.createdAt - a.createdAt;
      });
  }

  function render() {
    const filteredTodos = getFilteredTodos();
    todoList.innerHTML = "";
    updateCounter();

    if (filteredTodos.length === 0) {
      emptyState.hidden = false;
      emptyState.textContent = todos.length
        ? "Tidak ada tugas yang sesuai filter."
        : "Belum ada tugas. Mulai dengan menambahkan di form di atas.";
      return;
    }

    emptyState.hidden = true;

    const fragment = document.createDocumentFragment();
    filteredTodos.forEach((todo) => {
      fragment.appendChild(createTodoElement(todo));
    });
    todoList.appendChild(fragment);
    lucide.createIcons();
  }

  function createTodoElement(todo) {
    const item = document.createElement("li");
    item.className = `todo-item${todo.completed ? " done" : ""}`;
    item.dataset.id = todo.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo-checkbox";
    checkbox.checked = todo.completed;
    checkbox.setAttribute(
      "aria-label",
      todo.completed
        ? `Tandai belum selesai: ${todo.title}`
        : `Tandai selesai: ${todo.title}`
    );
    checkbox.addEventListener("change", () => toggleComplete(todo.id));

    const content = document.createElement("div");
    content.className = "todo-content";

    const title = document.createElement("p");
    title.className = "todo-title";
    title.textContent = todo.title;

    const meta = document.createElement("div");
    meta.className = "todo-meta";

    const due = document.createElement("span");
    due.className = "meta-item";
    due.innerHTML = `<i data-lucide="calendar"></i> ${formatDate(
      todo.dueDate
    )}`;
    meta.appendChild(due);

    const badgeInfo = getDueBadge(todo);
    if (badgeInfo) {
      const badge = document.createElement("span");
      badge.className = `badge ${badgeInfo.className}`;
      badge.textContent = badgeInfo.label;
      meta.appendChild(badge);
    }

    const status = document.createElement("span");
    status.className = `status status--${todo.completed ? "done" : "active"}`;
    status.textContent = todo.completed ? "Selesai" : "Aktif";
    meta.appendChild(status);

    if (todo.completed && todo.completedAt) {
      const completed = document.createElement("span");
      completed.className = "meta-item";
      completed.innerHTML = `<i data-lucide="check-circle-2"></i> Selesai ${formatDateTime(
        todo.completedAt
      )}`;
      meta.appendChild(completed);
    }

    const created = document.createElement("span");
    created.className = "meta-item";
    created.innerHTML = `<i data-lucide="clock"></i> Dibuat ${formatDateTime(
      todo.createdAt
    )}`;
    meta.appendChild(created);

    const actions = document.createElement("div");
    actions.className = "todo-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button button--ghost button--icon-only";
    editButton.innerHTML = `<i data-lucide="pencil"></i>`;
    editButton.setAttribute("aria-label", `Edit tugas: ${todo.title}`);
    editButton.addEventListener("click", () => handleEdit(todo.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button button--danger button--icon-only";
    deleteButton.innerHTML = `<i data-lucide="trash-2"></i>`;
    deleteButton.setAttribute("aria-label", `Hapus tugas: ${todo.title}`);
    deleteButton.addEventListener("click", () => deleteTodo(todo.id));

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    content.appendChild(title);
    content.appendChild(meta);

    item.appendChild(checkbox);
    item.appendChild(content);
    item.appendChild(actions);

    return item;
  }

  function updateCounter() {
    const total = todos.length;
    const completedCount = todos.filter((todo) => todo.completed).length;
    counter.textContent = `${total} tugas (${completedCount} selesai)`;
  }

  function loadTodos() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(isTodoShape).map((todo) => ({
        id: String(todo.id),
        title: String(todo.title),
        dueDate: String(todo.dueDate),
        completed: Boolean(todo.completed),
        completedAt: todo.completedAt ? Number(todo.completedAt) : null,
        createdAt: Number(todo.createdAt) || Date.now(),
      }));
    } catch (error) {
      console.warn("Gagal memuat data To-Do:", error);
      return [];
    }
  }

  function persistTodos() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (error) {
      console.warn("Gagal menyimpan data To-Do:", error);
    }
  }

  function isTodoShape(value) {
    return Boolean(
      value &&
        typeof value.id !== "undefined" &&
        typeof value.title === "string" &&
        typeof value.dueDate === "string"
    );
  }

  function generateId() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
    return `todo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function formatDate(isoDate) {
    const date = parseISODate(isoDate);
    if (!date) {
      return isoDate;
    }
    return date.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }
    return date.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getDueBadge(todo) {
    const dueDate = parseISODate(todo.dueDate);
    if (!dueDate) {
      return null;
    }

    const today = startOfToday();
    const due = startOfDay(dueDate);

    if (due.getTime() < today.getTime()) {
      return { label: "Lewat tempo", className: "badge--overdue" };
    }

    if (due.getTime() === today.getTime()) {
      return { label: "Hari ini", className: "badge--today" };
    }

    const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (diffDays <= 3) {
      return { label: `Dalam ${diffDays} hari`, className: "badge--soon" };
    }

    return null;
  }

  function startOfToday() {
    return startOfDay(new Date());
  }

  function startOfDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function parseISODate(value) {
    if (!value || typeof value !== "string") {
      return null;
    }
    const parts = value.split("-");
    if (parts.length !== 3) {
      return null;
    }
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    const date = new Date(year, month, day);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  }
})();
