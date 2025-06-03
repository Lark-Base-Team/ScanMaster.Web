import './App.css';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { bitable, FieldType } from "@lark-base-open/js-sdk";
import { Button, Form, Toast, TabPane, Tabs, Modal, Spin, ConfigProvider } from '@douyinfe/semi-ui';
import { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import { Task } from './task/taskTypes';
import { listTasks, createTask, updateTask, deleteTask } from './task/taskApi';
import { getTableList, getFieldList, getFieldOptions, getCurrentBaseId, getCurrentUserId } from './utils/baseUtils';

type Theme = 'light' | 'dark';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState('new');
  const [theme, setTheme] = useState<Theme>('light');
  const { t } = useTranslation();

  useEffect(() => {
    const init = async () => {
      try {
        const baseId = await getCurrentBaseId(t);
        const taskList = await listTasks(t, baseId);
        setTasks(taskList);
      } catch (err) {
        Toast.error(t('msg.init_failed') + ': ' + (err instanceof Error ? err.message : String(err)));
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (tasks.length > 0 && activeTab === 'new') {
      setActiveTab(String(tasks[0].id));
    }
  }, [tasks.length]);

  useEffect(() => {
    const initTheme = async () => {
      const currentTheme = await bitable.bridge.getTheme();
      setTheme(currentTheme.toLowerCase() as Theme);
    };

    initTheme();

    bitable.bridge.onThemeChange((event) => {
      const newTheme = event.data.theme.toLowerCase() as Theme;
      setTheme(newTheme);
    });
  }, []);

  // create/save task
  const handleSaveTask = async (values: any) => {
    try {
      const taskConfig = {
        name: values.name,
        record_table: values.recordTable,
        operation_result_field: values.operationResultField,
        operator_field: values.operatorField,
        operation_field: values.operationField,
        timestamp_field: values.timestampField
      };

      if (activeTab === 'new') {
        const baseId = await getCurrentBaseId(t);
        const userId = await getCurrentUserId(t);

        const newTask = await createTask(t, {
          base_token: baseId,
          config: taskConfig,
          created_by: userId,
        });
        setTasks([...tasks, newTask]);
        setActiveTab(String(newTask.id));
        Toast.success(t('msg.create_success'));
      } else {
        const updatedTask = await updateTask(t, Number(activeTab), { config: taskConfig });
        setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        Toast.success(t('msg.update_success'));
      }
    } catch (err: unknown) {
      Toast.error(err instanceof Error ? err.message : t('msg.unknown_error'));
    }
  };

  // delete task
  const handleDeleteTask = async (taskId: number) => {
    try {
      await deleteTask(t, taskId);
      const newTasks = tasks.filter(t => t.id !== taskId);
      setTasks(newTasks);
      setActiveTab(newTasks.length > 0 ? String(newTasks[0].id) : 'new');
      Toast.success(t('msg.delete_success'));
    } catch (err: unknown) {
      Toast.error(err instanceof Error ? err.message : t('msg.delete_failed'));
    }
  };

  return (
    <ConfigProvider>
      <main className={`main theme-${theme}`} style={{
        backgroundColor: 'var(--semi-color-bg-0)',
        color: 'var(--semi-color-text-0)'
      }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {tasks.map(task => (
            <TabPane tab={task.config.name} itemKey={String(task.id)} key={task.id}>
              <TaskForm
                task={task}
                onSave={handleSaveTask}
                onDelete={() => handleDeleteTask(task.id)}
                theme={theme}
              />
            </TabPane>
          ))}
          <TabPane tab={t('new_task')} itemKey="new">
            <TaskForm
              onSave={handleSaveTask}
              theme={theme}
            />
          </TabPane>
        </Tabs>
      </main>
    </ConfigProvider>
  );
}

function TaskForm({ task, onSave, onDelete, theme }: {
  task?: Task;
  onSave: (values: any) => void;
  onDelete?: () => void;
  theme: Theme;
}) {
  const { t } = useTranslation();
  const localFormRef = useRef<FormApi>();

  const [tables, setTables] = useState<Array<{ id: string, name: string }>>([]);
  const [fields, setFields] = useState<Array<{ id: string, name: string, type?: FieldType }>>([]);
  const [operationOptions, setOperationOptions] = useState<Array<{ id: string, name: string, color?: number }>>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(task?.config.record_table || null);
  const [selectedOperationField, setSelectedOperationField] = useState<string | null>(task?.config.operation_field || null);

  const [qrCodeVisible, setQrCodeVisible] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrCodeLoading, setQrCodeLoading] = useState(false);

  const [personalBaseToken, setPersonalBaseToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [showMiniProgramModal, setShowMiniProgramModal] = useState(false);

  const [formValues, setFormValues] = useState<{
    name: string;
    recordTable: string;
    operationResultField: string;
    operatorField: string;
    operationField: string;
    timestampField: string;
  }>(task ? {
    name: task.config.name,
    recordTable: task.config.record_table,
    operationResultField: task.config.operation_result_field,
    operatorField: task.config.operator_field || '',
    operationField: task.config.operation_field,
    timestampField: task.config.timestamp_field
  } : {
    name: '',
    recordTable: '',
    operationResultField: '',
    operatorField: '',
    operationField: '',
    timestampField: ''
  });


  useEffect(() => {
    const loadTables = async () => {
      const tableList = await getTableList(t);
      setTables(tableList);
    };
    loadTables();

    const tableChangeHandler = () => {
      console.log('Tables changed, reloading table list');
      loadTables();
    };

    bitable.base.onTableAdd(tableChangeHandler);
    bitable.base.onTableDelete(tableChangeHandler);

    // return () => {
    //   bitable.base.off('tableAdd', tableChangeHandler);
    //   bitable.base.off('tableDelete', tableChangeHandler);
    //   bitable.base.off('tableRename', tableChangeHandler);
    // };
  }, []);

  useEffect(() => {
    if (task) {
      setSelectedTableId(task.config.record_table || null);
      setSelectedOperationField(task.config.operation_field || null);
    }
  }, [task]);

  useEffect(() => {
    const loadFieldsForTable = async () => {
      if (!selectedTableId) return;

      try {
        const tableFields = await getFieldList(t, selectedTableId);
        setFields(tableFields);

        if (selectedOperationField) {
          try {
            const options = await getFieldOptions(t, selectedTableId, selectedOperationField);
            setOperationOptions(options);
          } catch (err) {
            console.error(err);
          }
        }
      } catch (error) {
        console.error(t('msg.get_fields_failed'), error);
        setFields([]);
        setOperationOptions([]);
      }
    };

    loadFieldsForTable();

    let tableInstance: any = null;

    const setupFieldListeners = async () => {
      if (!selectedTableId) return;

      try {
        const table = await bitable.base.getTableById(selectedTableId);
        tableInstance = table;

        const fieldChangeHandler = () => {
          console.log('Fields changed for selected table, reloading fields');
          loadFieldsForTable();
        };

        table.onFieldAdd(fieldChangeHandler);
        table.onFieldDelete(fieldChangeHandler);
        table.onFieldModify(fieldChangeHandler);
      } catch (err) {
        console.error('Failed to get table:', err);
      }
    };

    setupFieldListeners();

    return () => {
      if (tableInstance) {
        tableInstance.off('fieldAdd');
        tableInstance.off('fieldDelete');
        tableInstance.off('fieldModify');
      }
    };
  }, [selectedTableId, selectedOperationField]);

  const generateQRCode = async () => {
    if (!task) return;

    setShowTokenInput(true);
  };

  const handleGenerateQRCode = async () => {
    if (!task) return;

    setQrCodeLoading(true);
    setShowTokenInput(false);

    try {
      const qrData = JSON.stringify({
        base_token: task.base_token,
        auth_token: task.auth_token,
        personal_base_token: personalBaseToken, // Only used for submitting data from scanning terminal
        task_id: task.id,
        task_name: task.config.name,
        operation_options: operationOptions
      });

      // generate QR code (the task config) for scanning terminal
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      setQrCodeUrl(qrCodeDataUrl);
      setQrCodeVisible(true);
    } catch (err) {
      Toast.error(t('msg.generate_qrcode_failed') + (err instanceof Error ? err.message : String(err)));
    } finally {
      setQrCodeLoading(false);
    }
  };

  return (
    <div className={`theme-${theme}`} style={{
      backgroundColor: 'var(--semi-color-bg-0)',
      color: 'var(--semi-color-text-0)'
    }}>
      <Form
        onSubmit={onSave}
        getFormApi={(api) => {
          localFormRef.current = api;
          if (task) {
            api.setValues(formValues);
          }
        }}
        initValues={formValues}
        onValueChange={(values) => {
          setFormValues(values);
        }}
      >
        <Form.Input
          field="name"
          label={t('task_name')}
          rules={[{ required: true }]}
          style={{ width: '100%' }}
          placeholder={t('task_name_placeholder')}
        />

        <Form.Select
          field="recordTable"
          label={t('record_table')}
          rules={[{ required: true }]}
          style={{ width: '100%' }}
          placeholder={t('record_table_placeholder')}
          onChange={async (value) => {
            if (value) {
              setSelectedTableId(value as string);
              const newFields = await getFieldList(t, value as string);
              setFields(newFields);
              setSelectedOperationField(null);
              setOperationOptions([]);

              localFormRef.current?.setValues({
                ...formValues,
                recordTable: value,
                operationResultField: '',
                operatorField: '',
                operationField: '',
                timestampField: ''
              });
            }
          }}
        >
          {tables.map(table => (
            <Form.Select.Option key={`${table.id}-${table.name}`} value={table.id}>
              {table.name}
            </Form.Select.Option>
          ))}
        </Form.Select>

        <Form.Select
          field="operationResultField"
          label={t('operation_result_field')}
          rules={[{ required: true }]}
          style={{ width: '100%' }}
          placeholder={t('operation_result_placeholder')}
        >
          {fields
            .filter(field => field.type === FieldType.Text || field.type === FieldType.Barcode)
            .map(field => (
              <Form.Select.Option key={`${field.id}-${field.name}`} value={field.name}>
                {field.name}
              </Form.Select.Option>
            ))
          }
          {fields.filter(field => field.type === FieldType.Text || field.type === FieldType.Barcode).length === 0 && (
            <Form.Select.Option disabled value="">
              {t('msg.no_text_barcode_fields')}
            </Form.Select.Option>
          )}
        </Form.Select>

        <Form.Select
          field="operatorField"
          label={t('operator_field')}
          // rules={[{ required: true }]}
          style={{ width: '100%' }}
          placeholder={t('operator_field_placeholder')}
        >
          {fields
            .filter(field => field.type === FieldType.User)
            .map(field => (
              <Form.Select.Option key={`${field.id}-${field.name}`} value={field.name}>
                {field.name}
              </Form.Select.Option>
            ))
          }
          {fields.filter(field => field.type === FieldType.User).length === 0 && (
            <Form.Select.Option disabled value="">
              {t('msg.no_user_fields')}
            </Form.Select.Option>
          )}
        </Form.Select>

        <Form.Select
          field="operationField"
          label={t('operation_type_field')}
          rules={[{ required: true }]}
          style={{ width: '100%' }}
          placeholder={t('operation_type_placeholder')}
          onChange={async (value) => {
            if (value && selectedTableId) {
              setSelectedOperationField(value as string);
              try {
                const options = await getFieldOptions(t, selectedTableId, value as string);
                setOperationOptions(options);
              } catch (err) {
                console.error(err);
              }
            }
          }}
        >
          {fields
            .filter(field => field.type === FieldType.SingleSelect || field.type === FieldType.MultiSelect)
            .map(field => (
              <Form.Select.Option key={`${field.id}-${field.name}`} value={field.name}>
                {field.name}
              </Form.Select.Option>
            ))
          }
          {fields.filter(field => field.type === FieldType.SingleSelect || field.type === FieldType.MultiSelect).length === 0 && (
            <Form.Select.Option disabled value="">
              {t('msg.no_select_fields')}
            </Form.Select.Option>
          )}
        </Form.Select>

        <Form.Select
          field="timestampField"
          label={t('operation_time_field')}
          rules={[{ required: true }]}
          style={{ width: '100%' }}
          placeholder={t('operation_time_placeholder')}
        >
          {fields
            .filter(field => field.type === FieldType.DateTime || field.type === FieldType.CreatedTime)
            .map(field => (
              <Form.Select.Option key={`${field.id}-${field.name}`} value={field.name}>
                {field.name}
              </Form.Select.Option>
            ))
          }
          {fields.filter(field => field.type === FieldType.DateTime || field.type === FieldType.CreatedTime).length === 0 && (
            <Form.Select.Option disabled value="">
              {t('msg.no_datetime_fields')}
            </Form.Select.Option>
          )}
        </Form.Select>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <Button htmlType="submit" theme="solid" type="primary" style={{ marginRight: 8 }}>
              {task ? t('update') : t('create')}
            </Button>

            {task && (
              <Button onClick={generateQRCode} style={{ marginRight: 8 }}>
                {t('generate_qrcode')}
              </Button>
            )}
          </div>

          {task && onDelete && (
            <Button type="danger" onClick={onDelete}>
              {t('delete')}
            </Button>
          )}
        </div>
      </Form>

      <Modal
        title={t('input_personal_token')}
        visible={showTokenInput}
        onOk={handleGenerateQRCode}
        onCancel={() => setShowTokenInput(false)}
        centered
        className={`theme-${theme}`}
        style={{
          width: '100%',
          maxWidth: '800px',
          backgroundColor: 'var(--semi-color-bg-0)',
          color: 'var(--semi-color-text-0)'
        }}
      >
        <div>
          <Form>
            <Form.Input
              label={
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {t('personal_token')}
                  <Button
                    theme="borderless"
                    type="tertiary"
                    onClick={() => setHelpModalVisible(true)}
                    style={{ padding: '0', color: '#2080F0', fontSize: '14px', marginLeft: '0px' }}
                    icon={<span>?</span>}
                  />
                </div>
              }
              field="personalToken"
              initValue={personalBaseToken}
              onChange={(value) => setPersonalBaseToken(value)}
              style={{ width: '100%' }}
              placeholder={t('input_personal_token_placeholder')}
            />
          </Form>
          <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
            {t('msg.personal_token_usage_hint')}
          </p>
        </div>
      </Modal>

      <Modal
        title={t('how_to_get_personal_token')}
        visible={helpModalVisible}
        onCancel={() => setHelpModalVisible(false)}
        footer={null}
        centered
        className={`theme-${theme}`}
        style={{
          width: '100%',
          maxWidth: '800px',
          backgroundColor: 'var(--semi-color-bg-0)',
          color: 'var(--semi-color-text-0)'
        }}
      >
        <div>
          <ol style={{ paddingLeft: 4, lineHeight: 2 }}>
            <li>{t('msg.personal_token_usage_1')}</li>
            <li>{t('msg.personal_token_usage_2')}</li>
            <li>{t('msg.personal_token_usage_3')}</li>
            <li>{t('msg.personal_token_usage_4')}</li>
            <li>{t('msg.personal_token_usage_5')}</li>
          </ol>
          <p style={{ fontSize: 12, color: '#666', marginTop: 8, marginBottom: 24 }}>
            {/* {t('msg.personal_token_usage_hint')} */}
          </p>
        </div>
      </Modal>

      <Modal
        title={`${task?.config.name} ${t('task_config_title')}`}
        visible={qrCodeVisible}
        onCancel={() => setQrCodeVisible(false)}
        footer={null}
        centered
        className={`theme-${theme}`}
        style={{
          width: 'auto',
          maxWidth: '400px',
          backgroundColor: 'var(--semi-color-bg-0)',
          color: 'var(--semi-color-text-0)'
        }}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          {qrCodeLoading ? (
            <Spin size="large" />
          ) : (
            <>
              <p style={{ marginBottom: 16 }}>
                {t('msg.qrcode_usage')}
                <Button
                  theme="borderless"
                  type="tertiary"
                  onClick={() => setShowMiniProgramModal(true)}
                  style={{
                    padding: '0',
                    color: '#2080F0',
                    fontSize: '14px',
                    marginLeft: '8px'
                  }}
                >
                  {t('get_miniprogram')}
                </Button>
              </p>
              <img
                src={qrCodeUrl}
                alt={t('qrcode_title')}
                style={{
                  width: '200px',
                  height: '200px',
                  border: '8px solid white'
                }} />
              <p style={{ fontSize: 12, color: '#666', marginTop: 16 }}>
                {t('msg.qrcode_usage_hint')}
              </p>
            </>
          )}
        </div>
      </Modal>

      <Modal
        title={t('miniprogram_title')}
        visible={showMiniProgramModal}
        onCancel={() => setShowMiniProgramModal(false)}
        footer={null}
        centered
        className={`theme-${theme}`}
        style={{
          width: 'auto',
          maxWidth: '400px',
          backgroundColor: 'var(--semi-color-bg-0)',
          color: 'var(--semi-color-text-0)'
        }}
      >
        <div style={{ textAlign: 'center', paddingBottom: '20px' }}>
          <img
            src="./images/miniprogram.jpg"
            alt={t('miniprogram_title')}
            style={{ width: 200 }}
          />
        </div>
      </Modal>
    </div>
  );
}