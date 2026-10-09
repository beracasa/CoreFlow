import React, { useRef, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { formatDate, parseDateToISO } from '../../src/utils/dateUtils';

export interface DateInputProps {
  value?: string | null;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  min?: string;
  max?: string;
  'aria-label'?: string;
  title?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  name,
  id,
  placeholder = 'DD/MM/AAAA',
  disabled = false,
  required = false,
  className = '',
  min,
  max,
  'aria-label': ariaLabel,
  title,
}) => {
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Normalize incoming value to YYYY-MM-DD for the native date picker
  const getISOValue = (val?: string | null): string => {
    if (!val) return '';
    const trimmed = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.split('T')[0];
    }
    const parsed = parseDateToISO(trimmed);
    return parsed || '';
  };

  const isoValue = getISOValue(value);

  // Display value in DD/MM/AAAA format
  const [displayText, setDisplayText] = useState<string>(() => {
    return isoValue ? formatDate(isoValue, '') : '';
  });

  // Keep displayText in sync with incoming value
  useEffect(() => {
    const formatted = isoValue ? formatDate(isoValue, '') : '';
    setDisplayText(formatted);
  }, [isoValue]);

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newISO = e.target.value; // YYYY-MM-DD
    setDisplayText(newISO ? formatDate(newISO, '') : '');
    onChange?.({
      target: {
        value: newISO,
        name: name || '',
      },
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // Filter to only digits and slashes
    raw = raw.replace(/[^\d/]/g, '');

    // Auto-insert slashes as user types numbers (e.g. 08102026 -> 08/10/2026)
    if (!raw.includes('/')) {
      if (raw.length > 4) {
        raw = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4, 8)}`;
      } else if (raw.length > 2) {
        raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
      }
    }

    if (raw.length > 10) {
      raw = raw.slice(0, 10);
    }

    setDisplayText(raw);

    // If completely cleared
    if (raw.trim() === '') {
      onChange?.({
        target: {
          value: '',
          name: name || '',
        },
      });
      return;
    }

    // If user has entered full DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const parsedISO = parseDateToISO(raw);
      if (parsedISO) {
        const [y, m, d] = parsedISO.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        if (
          dateObj.getFullYear() === y &&
          dateObj.getMonth() === m - 1 &&
          dateObj.getDate() === d
        ) {
          onChange?.({
            target: {
              value: parsedISO,
              name: name || '',
            },
          });
        }
      }
    }
  };

  const handleBlur = () => {
    if (!displayText.trim()) {
      setDisplayText('');
      if (isoValue) {
        onChange?.({
          target: {
            value: '',
            name: name || '',
          },
        });
      }
      return;
    }

    // If valid DD/MM/AAAA, keep it
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(displayText)) {
      const parsedISO = parseDateToISO(displayText);
      if (parsedISO) {
        const [y, m, d] = parsedISO.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        if (
          dateObj.getFullYear() === y &&
          dateObj.getMonth() === m - 1 &&
          dateObj.getDate() === d
        ) {
          return;
        }
      }
    }

    // Invalid format, revert to last known good value
    setDisplayText(isoValue ? formatDate(isoValue, '') : '');
  };

  const openPicker = () => {
    if (disabled) return;
    try {
      if (hiddenInputRef.current && typeof hiddenInputRef.current.showPicker === 'function') {
        hiddenInputRef.current.showPicker();
      } else {
        hiddenInputRef.current?.focus();
        hiddenInputRef.current?.click();
      }
    } catch {
      hiddenInputRef.current?.focus();
    }
  };

  return (
    <div className={`relative inline-flex items-center w-full group ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      <input
        type="text"
        id={id}
        name={name}
        value={displayText}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel}
        title={title || 'Formato: DD/MM/AAAA'}
        maxLength={10}
        className={`${className} font-mono tracking-wide pr-9`}
      />

      {/* Hidden native date input for the calendar picker dialog */}
      <input
        ref={hiddenInputRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={isoValue}
        min={min}
        max={max}
        disabled={disabled}
        onChange={handlePickerChange}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 0,
          height: 0,
          pointerEvents: 'none',
          bottom: 0,
          right: 0,
        }}
      />

      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={openPicker}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-industrial-400 hover:text-white transition-colors focus:outline-none disabled:cursor-not-allowed"
        title="Abrir calendario"
      >
        <Calendar className="w-4 h-4" />
      </button>
    </div>
  );
};
