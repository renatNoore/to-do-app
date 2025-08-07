(function () {
  "use strict";

  /** State */
  const STORAGE_KEY = "todo-app:v1";
  /** @type {{ id: string; text: string; completed: boolean; createdAt: number }[]} */
  let todos = [];
  /** @type {"all" | "active" | "completed"} */
  let currentFilter = "all";

  /** DOM */
  const form = document.getElementById("todo-form");
  const input = document.getElementById("new-todo");
  const list = document.getElementById("todo-list");
  const filterButtons = /** @type {NodeListOf<HTMLButtonElement>} */ (
    document.querySelectorAll("[data-filter]")
  );
  const clearCompletedBtn = document.getElementById("clear-completed");
  const itemsLeftEl = document.getElementById("items-left");

  /** Utils */
  function generateId() {
    return (
      Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    );
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        todos = parsed.filter(Boolean);
      }
    } catch (_) {
      // ignore
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (_) {
      // ignore
    }
  }

  function setFilter(filter) {
    currentFilter = filter;
    filterButtons.forEach((btn) => {
      const isActive = btn.dataset.filter === filter;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });
    render();
  }

  function getFilteredTodos() {
    if (currentFilter === "active") return todos.filter((t) => !t.completed);
    if (currentFilter === "completed") return todos.filter((t) => t.completed);
    return todos.slice();
  }

  function addTodo(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    todos.unshift({ id: generateId(), text: trimmed, completed: false, createdAt: Date.now() });
    saveState();
    render();
  }

  function toggleTodo(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    todo.completed = !todo.completed;
    saveState();
    render();
  }

  function deleteTodo(id) {
    todos = todos.filter((t) => t.id !== id);
    saveState();
    render();
  }

  function startEdit(li, id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const label = li.querySelector(".todo__label");
    const editButton = li.querySelector(".todo__edit");

    if (!label) return;

    li.dataset.editing = "true";

    const inputEl = document.createElement("input");
    inputEl.type = "text";
    inputEl.className = "todo__input";
    inputEl.value = todo.text;
    inputEl.setAttribute("aria-label", "Edit to-do");

    label.replaceWith(inputEl);
    inputEl.focus();
    inputEl.setSelectionRange(todo.text.length, todo.text.length);

    function commit() {
      const newText = inputEl.value.trim();
      if (newText) {
        todo.text = newText;
      }
      cleanup();
      saveState();
      render();
    }

    function cancel() {
      cleanup();
      render();
    }

    function handleKey(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    }

    function cleanup() {
      inputEl.removeEventListener("keydown", handleKey);
      inputEl.removeEventListener("blur", commit);
      li.dataset.editing = "false";
    }

    inputEl.addEventListener("keydown", handleKey);
    inputEl.addEventListener("blur", commit);

    if (editButton) {
      editButton.disabled = true;
      setTimeout(() => (editButton.disabled = false), 0);
    }
  }

  function clearCompleted() {
    todos = todos.filter((t) => !t.completed);
    saveState();
    render();
  }

  function updateCounter() {
    const left = todos.filter((t) => !t.completed).length;
    itemsLeftEl.textContent = `${left} ${left === 1 ? "item" : "items"} left`;
  }

  function updateClearCompletedButton() {
    const anyCompleted = todos.some((t) => t.completed);
    clearCompletedBtn.disabled = !anyCompleted;
  }

  function createTodoItem(todo) {
    const li = document.createElement("li");

    const container = document.createElement("div");
    container.className = "todo";
    container.dataset.completed = String(todo.completed);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo__toggle";
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", "Mark to-do completed");

    const label = document.createElement("span");
    label.className = "todo__label";
    label.textContent = todo.text;

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "todo__edit";
    editBtn.textContent = "Edit";
    editBtn.setAttribute("aria-label", "Edit to-do");

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "todo__delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.setAttribute("aria-label", "Delete to-do");

    container.appendChild(checkbox);
    container.appendChild(label);
    container.appendChild(editBtn);
    container.appendChild(deleteBtn);

    li.dataset.id = todo.id;
    li.appendChild(container);

    return li;
  }

  function render() {
    const filtered = getFilteredTodos();
    list.innerHTML = "";
    const fragment = document.createDocumentFragment();
    filtered.forEach((todo) => {
      fragment.appendChild(createTodoItem(todo));
    });
    list.appendChild(fragment);
    updateCounter();
    updateClearCompletedButton();
  }

  /** Events */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = input.value;
    addTodo(value);
    form.reset();
    input.focus();
  });

  // Delegated events for list actions
  list.addEventListener("click", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const li = target.closest("li");
    if (!li) return;
    const id = li.dataset.id;
    if (!id) return;

    if (target.classList.contains("todo__delete")) {
      deleteTodo(id);
      return;
    }

    if (target.classList.contains("todo__edit")) {
      startEdit(li, id);
      return;
    }
  });

  list.addEventListener("change", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.classList.contains("todo__toggle")) return;

    const li = target.closest("li");
    if (!li) return;
    const id = li.dataset.id;
    if (!id) return;

    toggleTodo(id);
  });

  // Double click to edit
  list.addEventListener("dblclick", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const li = target.closest("li");
    if (!li) return;
    const id = li.dataset.id;
    if (!id) return;

    if (target.classList.contains("todo__label")) {
      startEdit(li, id);
    }
  });

  // Filters
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter));
  });

  // Clear completed
  clearCompletedBtn.addEventListener("click", clearCompleted);

  // Init
  loadState();
  render();
})();