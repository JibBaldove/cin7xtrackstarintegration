import { useState, useEffect } from 'react';
import { useFieldOptions } from '@fastn-ai/react-core';
import { Autocomplete, Icon, Tag, Text, Spinner, Button } from '@shopify/polaris';
import { SearchIcon } from '@shopify/polaris-icons';

interface SelectFieldProps {
  field: any;
  value: any;
  onChange: (value: any) => void;
  isMulti: boolean;
  context: Record<string, any>;
}

export function SelectField({ field, value, onChange, isMulti, context }: SelectFieldProps) {
  const [inputValue, setInputValue] = useState('');
  const {
    options,
    loading,
    loadingMore,
    hasNext,
    loadMore,
    error,
    search,
    totalLoadedOptions,
  } = useFieldOptions(field, context);

  // Handle search input changes
  const handleInputChange = (value: string) => {
    setInputValue(value);
    search(value);
  };

  // Handle selection
  const handleSelect = (selected: string[]) => {
    if (isMulti) {
      const selectedOptions = selected.map((sel) => {
        const option = options.find((o) => o.value === sel);
        return option ? { label: option.label, value: option.value } : null;
      }).filter(Boolean);
      onChange(selectedOptions);
    } else {
      const selectedOption = options.find((o) => o.value === selected[0]);
      onChange(selectedOption ? { label: selectedOption.label, value: selectedOption.value } : null);
    }
    setInputValue('');
  };

  // Remove tag for multi-select
  const handleRemoveTag = (valueToRemove: string) => {
    if (isMulti && Array.isArray(value)) {
      const updated = value.filter((v: any) => v.value !== valueToRemove);
      onChange(updated);
    }
  };

  // Convert value to string array for Autocomplete
  const selectedValues = isMulti
    ? (value || []).map((v: any) => v.value)
    : value?.value
    ? [value.value]
    : [];

  const autocompleteOptions = options.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));

  const textField = (
    <Autocomplete.TextField
      onChange={handleInputChange}
      label={field.label}
      value={inputValue}
      placeholder={field.placeholder || `Search ${field.label}`}
      autoComplete="off"
      prefix={<Icon source={SearchIcon} />}
      requiredIndicator={field.required}
      helpText={field.description}
    />
  );

  return (
    <div>
      <Autocomplete
        options={autocompleteOptions}
        selected={selectedValues}
        onSelect={handleSelect}
        textField={textField}
        loading={loading}
        allowMultiple={isMulti}
      />

      {/* Show selected tags for multi-select */}
      {isMulti && value && Array.isArray(value) && value.length > 0 && (
        <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {value.map((v: any) => (
            <Tag key={v.value} onRemove={() => handleRemoveTag(v.value)}>
              {v.label}
            </Tag>
          ))}
        </div>
      )}

      {/* Show selected value for single select */}
      {!isMulti && value && (
        <div style={{ marginTop: '0.5rem' }}>
          <Tag onRemove={() => onChange(null)}>{value.label}</Tag>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ marginTop: '0.5rem', color: '#bf0711', fontSize: '0.875rem' }}>
          Error loading options: {error.message}
        </div>
      )}

      {/* Load more button */}
      {hasNext && !loadingMore && (
        <div style={{ marginTop: '0.5rem' }}>
          <Button onClick={loadMore} size="slim">
            Load More Options ({totalLoadedOptions} loaded)
          </Button>
        </div>
      )}

      {/* Loading more indicator */}
      {loadingMore && (
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Spinner size="small" />
          <Text as="span" variant="bodySm" tone="subdued">
            Loading more options...
          </Text>
        </div>
      )}
    </div>
  );
}
