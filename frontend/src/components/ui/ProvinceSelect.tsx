import { islandGroups, provincesByGroup } from '@/lib/philippines';

// Province dropdown for the whole Philippines, grouped into Luzon / Visayas / Mindanao.
// Pass `allLabel` to offer an "any province" option (value "").
export default function ProvinceSelect({
  value, onChange, allLabel, className = 'input-field', required, ariaLabel = 'Province',
}: {
  value: string;
  onChange: (province: string) => void;
  allLabel?: string;
  className?: string;
  required?: boolean;
  ariaLabel?: string;
}) {
  return (
    <select className={className} value={value} required={required} aria-label={ariaLabel} onChange={(e) => onChange(e.target.value)}>
      {allLabel !== undefined ? <option value="">{allLabel}</option> : <option value="" disabled>Choose a province</option>}
      {islandGroups.map((group) => (
        <optgroup key={group} label={group}>
          {provincesByGroup(group).map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
