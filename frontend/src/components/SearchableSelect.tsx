import { useState, useCallback, useMemo } from 'react';
import { Autocomplete, Icon } from '@shopify/polaris';
import { SearchIcon } from '@shopify/polaris-icons';

interface Option {
  id: string;
  name: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder, disabled }: Props) {
  const [inputValue, setInputValue] = useState('');

  // Convert options to Polaris Autocomplete format
  const autocompleteOptions = useMemo(() => {
    return options.map(option => ({
      value: option.id,
      label: option.name,
    }));
  }, [options]);

  // Filter options based on input value
  const filteredOptions = useMemo(() => {
    if (!inputValue) return autocompleteOptions;

    return autocompleteOptions.filter(option =>
      option.label.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [autocompleteOptions, inputValue]);

  // Get selected option
  const selectedOption = options.find(opt => opt.id === value);
  const textFieldValue = selectedOption ? selectedOption.name : '';

  const handleSelect = useCallback((selected: string[]) => {
    const selectedId = selected[0];
    onChange(selectedId);
    setInputValue('');
  }, [onChange]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  return (
    <Autocomplete
      options={filteredOptions}
      selected={value ? [value] : []}
      onSelect={handleSelect}
      textField={
        <Autocomplete.TextField
          onChange={handleInputChange}
          label=""
          value={inputValue}
          placeholder={placeholder || 'Select...'}
          autoComplete="off"
          disabled={disabled}
          prefix={<Icon source={SearchIcon} />}
        />
      }
      emptyState={
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          <p>No results found</p>
        </div>
      }
      listTitle={textFieldValue ? `Selected: ${textFieldValue}` : 'Options'}
    />
  );
}
