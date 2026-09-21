'use client';

import { useId } from 'react';
import { AdsIcon } from '@/components/layout/AdsIcon';

export function CollectionFilterChoices({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return <div className="collection-filter-choice">
    <label className="collection-filter-select">{label}<select value={value} onChange={event => onChange(event.target.value)}>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select></label>
    <fieldset className="collection-filter-options">
      <legend>{label}</legend>
      <div>{options.map(option => <label key={option.value} className="collection-filter-option">
        <input className="sr-only" type="radio" name={id} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
        <span className="collection-filter-option-label">{option.label}</span>
        <span className="collection-filter-check" aria-hidden="true">{value === option.value && <AdsIcon name="check" />}</span>
      </label>)}</div>
    </fieldset>
  </div>;
}
