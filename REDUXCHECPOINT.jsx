import React, { useMemo, useState } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import { configureStore, createSlice, nanoid } from "@reduxjs/toolkit";

/**********************
 * Redux: tasks slice *
 **********************/
const persisted = (() => {
  try {
    const raw = localStorage.getItem("redux_todo_state");
    return raw ? JSON.parse(raw) : undefined;
  } catch (_) {
    return undefined;
  }
})();

const tasksSlice = createSlice({
  name: "tasks",
  initialState: {
    items: (persisted && persisted.tasks?.items) || [],
    filter: (persisted && persisted.tasks?.filter) || "all", // 'all' | 'done' | 'not'
  },
  reducers: {
    addTask: {
      reducer(state, action) {
        state.items.unshift(action.payload);
      },
      prepare(description) {
        return {
          payload: {
            id: nanoid(),
            description: description.trim(),
            isDone: false,
          },
        };
      },
    },
    toggleDone(state, action) {
      const t = state.items.find((x) => x.id === action.payload);
      if (t) t.isDone = !t.isDone;
    },
    editTask(state, action) {
      const { id, description } = action.payload;
      const t = state.items.find((x) => x.id === id);
      if (t && description.trim()) t.description = description.trim();
    },
    setFilter(state, action) {
      state.filter = action.payload; // 'all' | 'done' | 'not'
    },
    clearAll(state) {
      state.items = [];
    },
  },
});

const { addTask, toggleDone, editTask, setFilter, clearAll } = tasksSlice.actions;

const store = configureStore({
  reducer: { tasks: tasksSlice.reducer },
  preloadedState: persisted,
});

// Persist Redux to localStorage (simple demo persistence)
store.subscribe(() => {
  try {
    const state = store.getState();
    localStorage.setItem("redux_todo_state", JSON.stringify(state));
  } catch (_) {}
});

/************************
 * UI Helper Components *
 ************************/
function Card({ children, className = "" }) {
  return (
    <div className={`bg-white shadow-sm rounded-2xl border border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

/*****************
 * AddTask (req.) *
 *****************/
function AddTask() {
  const dispatch = useDispatch();
  const [text, setText] = useState("");

  function onSubmit(e) {
    e.preventDefault();
    if (text.trim().length === 0) return;
    dispatch(addTask(text));
    setText("");
  }

  return (
    <Card className="p-4">
      <form onSubmit={onSubmit} className="flex gap-2 items-center">
        <input
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
          placeholder="Add a new task…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-black text-white font-medium hover:opacity-90"
          aria-label="Add task"
        >
          Add
        </button>
      </form>
    </Card>
  );
}

/****************
 * Task (req.)  *
 ****************/
function Task({ task }) {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(task.description);

  const save = () => {
    if (draft.trim()) {
      dispatch(editTask({ id: task.id, description: draft }));
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 border-b last:border-b-0">
      <input
        aria-label={`Mark ${task.description} as ${task.isDone ? "not done" : "done"}`}
        type="checkbox"
        checked={task.isDone}
        onChange={() => dispatch(toggleDone(task.id))}
        className="h-5 w-5"
      />

      {isEditing ? (
        <input
          className="flex-1 px-2 py-1 rounded-lg border border-gray-200"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          autoFocus
        />
      ) : (
        <span
          className={`flex-1 ${task.isDone ? "line-through text-gray-400" : "text-gray-900"}`}
        >
          {task.description}
        </span>
      )}

      {isEditing ? (
        <div className="flex gap-2">
          <button onClick={save} className="px-3 py-1 rounded-lg bg-black text-white text-sm">
            Save
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setDraft(task.description);
            }}
            className="px-3 py-1 rounded-lg border text-sm"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="px-3 py-1 rounded-lg border text-sm"
        >
          Edit
        </button>
      )}
    </div>
  );
}

/*******************
 * ListTask (req.)  *
 *******************/
function ListTask() {
  const { items, filter } = useSelector((s) => s.tasks);

  const filtered = useMemo(() => {
    if (filter === "done") return items.filter((t) => t.isDone);
    if (filter === "not") return items.filter((t) => !t.isDone);
    return items;
  }, [items, filter]);

  if (items.length === 0) {
    return (
      <Card className="p-6 text-center text-gray-500">No tasks yet — add your first one!</Card>
    );
  }

  if (filtered.length === 0) {
    return (
      <Card className="p-6 text-center text-gray-500">No tasks match this filter.</Card>
    );
  }

  return (
    <Card>
      {filtered.map((t) => (
        <Task key={t.id} task={t} />
      ))}
    </Card>
  );
}

/***************
 * Filter Bar  *
 ***************/
function FilterBar() {
  const dispatch = useDispatch();
  const filter = useSelector((s) => s.tasks.filter);

  const btn = (value, label) => (
    <button
      onClick={() => dispatch(setFilter(value))}
      className={`px-3 py-1 rounded-xl border text-sm ${
        filter === value ? "bg-black text-white" : "bg-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-2">
      {btn("all", "All")}
      {btn("done", "Done")}
      {btn("not", "Not Done")}
    </div>
  );
}

/********
 * App  *
 ********/
function AppInner() {
  const dispatch = useDispatch();
  const count = useSelector((s) => s.tasks.items.length);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto p-6 space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Redux To‑Do</h1>
          <FilterBar />
        </header>

        <AddTask />
        <ListTask />

        <footer className="text-xs text-gray-400 text-center">
          {count} task{count !== 1 ? "s" : ""} total · Built with Redux Toolkit
          <button
            onClick={() => dispatch(clearAll())}
            className="ml-2 underline hover:no-underline"
            title="Clear all tasks"
          >
            Clear
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppInner />
    </Provider>
  );
}
