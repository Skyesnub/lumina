import { el } from '../utils/dom.js';
import { CATEGORIES } from '../task-system/tasks.js';
import { DIFFICULTY_XP, DIFFICULTY_LABELS } from '../xp-system/leveling.js';

function option(value, label, selected) {
  return el('option', { value, selected: selected || undefined }, label);
}

export function mountTaskForm(container, { onSubmit }) {
  const nameInput = el('input', { type: 'text', required: true, maxlength: 80, placeholder: 'e.g. Finish lab report' });
  const descInput = el('textarea', { placeholder: 'Optional details' });
  const categorySelect = el('select', {}, CATEGORIES.map(c => option(c, c)));
  const difficultySelect = el('select', {}, Object.keys(DIFFICULTY_XP).map(d => option(d, `${DIFFICULTY_LABELS[d]} · ${DIFFICULTY_XP[d]} XP`, d === 'medium')));
  const prioritySelect = el('select', {}, [option('low', 'Low'), option('medium', 'Medium', true), option('high', 'High')]);
  const dueInput = el('input', { type: 'date' });
  const estimateInput = el('input', { type: 'number', min: 0, placeholder: '30' });

  const heading = el('h2', {}, 'New Task');
  let editingId = null;

  const form = el('form', { class: 'field-row', style: 'display:flex; flex-direction:column; gap:16px;' }, [
    el('div', { class: 'field' }, [el('label', {}, 'Task name'), nameInput]),
    el('div', { class: 'field' }, [el('label', {}, 'Description'), descInput]),
    el('div', { class: 'field-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Category'), categorySelect]),
      el('div', { class: 'field' }, [el('label', {}, 'Difficulty'), difficultySelect]),
    ]),
    el('div', { class: 'field-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Priority'), prioritySelect]),
      el('div', { class: 'field' }, [el('label', {}, 'Due date'), dueInput]),
    ]),
    el('div', { class: 'field' }, [el('label', {}, 'Estimated minutes'), estimateInput]),
    el('div', { style: 'display:flex; gap:10px; margin-top:4px;' }, [
      el('button', { type: 'submit', class: 'btn btn-primary', style: 'flex:1' }, 'Save Task'),
      el('button', { type: 'button', class: 'btn btn-ghost', onClick: () => hide() }, 'Cancel'),
    ]),
  ]);

  const overlay = el('div', { class: 'modal-overlay' }, [
    el('div', { class: 'modal-card task-form-card' }, [heading, form]),
  ]);
  container.appendChild(overlay);

  function reset() {
    nameInput.value = '';
    descInput.value = '';
    categorySelect.value = CATEGORIES[0];
    difficultySelect.value = 'medium';
    prioritySelect.value = 'medium';
    dueInput.value = '';
    estimateInput.value = '';
    editingId = null;
  }

  function hide() { overlay.classList.remove('show'); }

  function showForCreate() {
    reset();
    heading.textContent = 'New Task';
    overlay.classList.add('show');
    setTimeout(() => nameInput.focus(), 50);
  }

  function showForEdit(task) {
    editingId = task.id;
    heading.textContent = 'Edit Task';
    nameInput.value = task.name;
    descInput.value = task.description || '';
    categorySelect.value = task.category;
    difficultySelect.value = task.difficulty;
    prioritySelect.value = task.priority;
    dueInput.value = task.due_date || '';
    estimateInput.value = task.estimated_minutes || '';
    overlay.classList.add('show');
    setTimeout(() => nameInput.focus(), 50);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!nameInput.value.trim()) return;
    onSubmit(editingId, {
      name: nameInput.value,
      description: descInput.value,
      category: categorySelect.value,
      difficulty: difficultySelect.value,
      priority: prioritySelect.value,
      due_date: dueInput.value || null,
      estimated_minutes: estimateInput.value || null,
    });
    hide();
  });

  overlay.addEventListener('click', e => { if (e.target === overlay) hide(); });

  return { showForCreate, showForEdit, hide };
}
