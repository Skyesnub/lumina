import { el, clear } from '../utils/dom.js';
import { formatDate, isOverdue } from '../utils/format.js';
import { DIFFICULTY_LABELS } from '../xp-system/leveling.js';

const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>';
const EDIT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>';
const TRASH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>';

function taskItem(task, { onComplete, onEdit, onDelete }) {
  const isDone = task.status === 'completed';
  const overdue = isOverdue(task.due_date, task.status);

  const tags = [
    el('span', { class: 'tag tag-xp' }, `+${task.xp_reward} XP`),
    el('span', { class: 'tag' }, DIFFICULTY_LABELS[task.difficulty] || task.difficulty),
    el('span', { class: `tag tag-priority-${task.priority}` }, task.priority),
  ];
  if (task.due_date) {
    tags.push(el('span', { class: 'tag' + (overdue ? ' tag-overdue' : '') }, formatDate(task.due_date)));
  }

  const item = el('div', { class: 'task-item' + (isDone ? ' completed' : '') }, [
    el('button', {
      class: 'task-check',
      'aria-label': isDone ? 'Mark incomplete' : 'Mark complete',
      html: CHECK_ICON,
      onClick: () => onComplete(task.id, item),
    }),
    el('div', { class: 'task-body' }, [
      el('div', { class: 'task-name' }, task.name),
      task.description ? el('div', { class: 'task-desc' }, task.description) : null,
      el('div', { class: 'task-meta' }, tags),
    ]),
    el('div', { class: 'task-actions' }, [
      el('button', { class: 'btn-icon', 'aria-label': 'Edit task', html: EDIT_ICON, onClick: () => onEdit(task.id) }),
      el('button', { class: 'btn-icon', 'aria-label': 'Delete task', html: TRASH_ICON, onClick: () => onDelete(task.id) }),
    ]),
  ]);
  return item;
}

export function renderTaskList(container, tasks, handlers, emptyText = 'No tasks yet — add one to get started.') {
  clear(container);
  if (tasks.length === 0) {
    container.appendChild(el('div', { class: 'empty-state' }, [
      el('div', { class: 'empty-title' }, 'Nothing here'),
      el('div', { class: 'empty-sub' }, emptyText),
    ]));
    return;
  }
  for (const task of tasks) {
    container.appendChild(taskItem(task, handlers));
  }
}
