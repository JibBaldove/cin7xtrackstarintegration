import { TextField, Checkbox, Select, Text, Button, Banner } from '@shopify/polaris';
import { SelectField } from './SelectField';

interface FormFieldProps {
  field: any;
  value: any;
  onChange: (value: any) => void;
  context: Record<string, any>;
}

export function FormField({ field, value, onChange, context }: FormFieldProps) {
  const { type, label, required, placeholder, description, disabled } = field;

  // Text-based fields
  if (type === 'text' || type === 'email' || type === 'password' || type === 'url') {
    return (
      <TextField
        label={label}
        type={type === 'password' ? 'password' : type === 'email' ? 'email' : 'text'}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        requiredIndicator={required}
        helpText={description}
        autoComplete="off"
      />
    );
  }

  // Number field
  if (type === 'number') {
    return (
      <TextField
        label={label}
        type="number"
        value={value?.toString() || ''}
        onChange={(val) => onChange(val ? parseFloat(val) : null)}
        placeholder={placeholder}
        disabled={disabled}
        requiredIndicator={required}
        helpText={description}
        autoComplete="off"
      />
    );
  }

  // Checkbox
  if (type === 'checkbox' || type === 'boolean') {
    return (
      <div>
        <Checkbox
          label={label}
          checked={value || false}
          onChange={onChange}
          disabled={disabled}
        />
        {description && (
          <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: '#6d7175' }}>
            {description}
          </div>
        )}
      </div>
    );
  }

  // Select and Multi-select fields (dynamic options)
  if (type === 'select' || type === 'multi-select') {
    return (
      <SelectField
        field={field}
        value={value}
        onChange={onChange}
        isMulti={type === 'multi-select'}
        context={context}
      />
    );
  }

  // Google Drive Picker fields
  if (type === 'google-files-picker-select' || type === 'google-files-picker-multi-select') {
    const isMulti = type === 'google-files-picker-multi-select';

    const handlePickFiles = async () => {
      if (field.optionsSource?.openGoogleFilesPicker) {
        await field.optionsSource.openGoogleFilesPicker({
          onComplete: async (files: any[]) => {
            if (isMulti) {
              const formattedFiles = files.map((file) => ({
                label: file.label || file.name || file.value,
                value: file.value || file.id,
              }));
              onChange(formattedFiles);
            } else {
              const formattedFile = {
                label: files[0]?.label || files[0]?.name || files[0]?.value,
                value: files[0]?.value || files[0]?.id,
              };
              onChange(formattedFile);
            }
          },
          onError: async (pickerError: any) => {
            console.error('Google Files Picker error:', pickerError);
          },
          fileTypes: field?.optionsSource?.fileTypes,
        });
      }
    };

    return (
      <div>
        <Text as="p" fontWeight="medium">
          {label}
          {required && <span style={{ color: '#bf0711' }}> *</span>}
        </Text>
        <div style={{ marginTop: '0.5rem' }}>
          <Button onClick={handlePickFiles}>Pick from Google Drive</Button>
        </div>
        {value && (
          <div style={{ marginTop: '0.5rem' }}>
            <Text as="p" variant="bodySm" tone="subdued">
              Selected: {isMulti
                ? (value as any[]).map((f) => f.label).join(', ')
                : (value as any).label}
            </Text>
          </div>
        )}
        {description && (
          <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: '#6d7175' }}>
            {description}
          </div>
        )}
      </div>
    );
  }

  // Textarea
  if (type === 'textarea') {
    return (
      <TextField
        label={label}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        requiredIndicator={required}
        helpText={description}
        multiline={4}
        autoComplete="off"
      />
    );
  }

  // Unsupported field type
  return (
    <Banner tone="warning">
      Unsupported field type: {type} for field "{label}"
    </Banner>
  );
}
