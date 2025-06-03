export interface TaskConfig {
  name: string;
  record_table: string;
  operation_result_field: string;
  operator_field: string;
  operation_field: string;
  timestamp_field: string;
}

export interface Task {
  id: number;
  base_token: string;
  config: TaskConfig;
  created_by: string;
  auth_token: string;
  created_at: string;
  updated_at: string;
}

export type CreateTaskRequest = Omit<Task, 'id' | 'auth_token' | 'created_at' | 'updated_at'>;
export type UpdateTaskRequest = Partial<CreateTaskRequest>;