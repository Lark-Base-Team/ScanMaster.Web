import { Task, CreateTaskRequest, UpdateTaskRequest } from './taskTypes';

// const API_BASE = 'https://localhost/scanmaster/task';
const API_BASE = 'https://matrixwork.cn/scanmaster/task';

export async function createTask(t: (key: string) => string, task: CreateTaskRequest): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  });

  if (!response.ok) {
    throw new Error(t('msg.create_task_failed') + ': ' + response.status + ' ' + response.statusText);
  }

  return response.json();
}

export async function listTasks(t: (key: string) => string, baseToken: string): Promise<Task[]> {
  const response = await fetch(`${API_BASE}/tasks?base_token=${encodeURIComponent(baseToken)}`);

  if (!response.ok) {
    throw new Error(t('msg.list_task_failed') + ': ' + response.status + ' ' + response.statusText);
  }

  return response.json();
}

export async function updateTask(t: (key: string) => string, id: number, task: UpdateTaskRequest): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  });

  if (!response.ok) {
    throw new Error(t('msg.update_task_failed') + ': ' + response.status + ' ' + response.statusText);
  }

  return response.json();
}

export async function deleteTask(t: (key: string) => string, id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(t('msg.delete_task_failed') + ': ' + response.status + ' ' + response.statusText);
  }
}