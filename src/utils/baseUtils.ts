import { bitable, FieldType, ISingleSelectFieldMeta, IMultiSelectFieldMeta } from "@lark-base-open/js-sdk";

export async function getTableList(t: (key: string) => string): Promise<Array<{ id: string, name: string }>> {
    try {
        const tables = await bitable.base.getTableMetaList();
        return tables.map(table => ({
            id: table.id,
            name: table.name
        }));
    } catch (error) {
        console.error(t('msg.get_table_failed'), error);
        return [];
    }
}

export async function getFieldList(t: (key: string) => string, tableId: string): Promise<Array<{ id: string, name: string, type: FieldType }>> {
    try {
        const table = await bitable.base.getTableById(tableId);
        const fields = await table.getFieldMetaList();
        return fields.map(field => ({
            id: field.id,
            name: field.name,
            type: field.type
        }));
    } catch (error) {
        console.error(t('msg.get_fields_failed'), error);
        return [];
    }
}

export const getFieldOptions = async (t: (key: string) => string, tableId: string, fieldName: string): Promise<Array<{ id: string, name: string, color?: number }>> => {
    try {
        const table = await bitable.base.getTableById(tableId);
        const fieldId = await table.getFieldIdByName(fieldName);
        const fieldMeta = await table.getFieldMetaById(fieldId);

        if (fieldMeta.type === FieldType.SingleSelect || fieldMeta.type === FieldType.MultiSelect) {
            const typedFieldMeta = fieldMeta as ISingleSelectFieldMeta | IMultiSelectFieldMeta;
            return await typedFieldMeta.property.options;
        }

        console.error(t('msg.field_type_not_select'));
        return [];
    } catch (err) {
        console.error(t('msg.get_field_options_failed'), err);
        return [];
    }
};

export const getTableNameById = async (t: (key: string) => string, tableId: string): Promise<string> => {
    try {
        const tables = await getTableList(t);
        const table = tables.find(t => t.id === tableId);
        return table?.name || tableId;
    } catch (error) {
        console.error(t('msg.get_table_name_failed'), error);
        return tableId;
    }
};

export async function getCurrentBaseId(t: (key: string) => string): Promise<string> {
    try {
        const selection = await bitable.base.getSelection();
        return selection.baseId || '';
    } catch (error) {
        console.error(t('msg.get_base_failed'), error);
        return '';
    }
}

export async function getCurrentUserId(t: (key: string) => string): Promise<string> {
    try {
        const userid = await bitable.bridge.getUserId();
        return userid || 'unknown_user';
    } catch (error) {
        console.error(t('msg.get_base_failed'), error);
        return '';
    }
}