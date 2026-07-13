'use client';
import { MAKES, BODY_STYLES, CONDITIONS, TRANSMISSIONS, FUEL_TYPES, DRIVE_TYPES } from '@/lib/types';

export interface VehicleFieldsValues {
  year: string;
  make: string;
  model: string;
  mileage: string;
  condition: string;
  bodyStyle: string;
  fuelType: string;
  engine: string;
  transmission: string;
  driveType: string;
  color: string;
  price: string;
  description: string;
}

interface VehicleFieldsFormProps {
  values: VehicleFieldsValues;
  onChange: (key: keyof VehicleFieldsValues, value: string) => void;
  inputClassName: string;
  labelClassName?: string;
}

const formatNumeric = (raw: string) => {
  const digits = raw.replace(/[^0-9]/g, '');
  return digits ? Number(digits).toLocaleString() : '';
};

// Required per the site's vehicle-listing spec: Year, Make, Model, Condition,
// Body Style, Fuel Type, Transmission, Drive Type, Price, Description.
// Mileage/Engine/Color are optional everywhere.
export default function VehicleFieldsForm({ values, onChange, inputClassName, labelClassName }: VehicleFieldsFormProps) {
  const labelCls = labelClassName ?? 'block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5';
  const set = (k: keyof VehicleFieldsValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => onChange(k, e.target.value);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls}>Year *</label>
          <input type="number" name="year" required min="1900" max="2030" placeholder="1969"
            value={values.year} onChange={set('year')} className={inputClassName} />
        </div>
        <div>
          <label className={labelCls}>Make *</label>
          <select name="make" required value={values.make} onChange={set('make')} className={inputClassName}>
            <option value="">Select make...</option>
            {MAKES.filter(m => m !== 'All Makes').map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Model *</label>
          <input type="text" name="model" required placeholder="Camaro SS"
            value={values.model} onChange={set('model')} className={inputClassName} />
        </div>
        <div>
          <label className={labelCls}>Mileage</label>
          <input type="text" name="mileage" inputMode="numeric" placeholder="Leave blank if unknown"
            value={values.mileage} onChange={e => onChange('mileage', formatNumeric(e.target.value))}
            className={inputClassName} />
        </div>
        <div>
          <label className={labelCls}>Condition *</label>
          <select name="condition" required value={values.condition} onChange={set('condition')} className={inputClassName}>
            <option value="">Select condition...</option>
            {CONDITIONS.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Body Style *</label>
          <select name="bodyStyle" required value={values.bodyStyle} onChange={set('bodyStyle')} className={inputClassName}>
            <option value="">Select...</option>
            {BODY_STYLES.filter(b => b !== 'All Styles').map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Fuel Type *</label>
          <select name="fuelType" required value={values.fuelType} onChange={set('fuelType')} className={inputClassName}>
            <option value="">Select...</option>
            {FUEL_TYPES.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Engine</label>
          <input type="text" name="engine" placeholder="396 V8"
            value={values.engine} onChange={set('engine')} className={inputClassName} />
        </div>
        <div>
          <label className={labelCls}>Transmission *</label>
          <select name="transmission" required value={values.transmission} onChange={set('transmission')} className={inputClassName}>
            <option value="">Select...</option>
            {values.fuelType === 'Electric'
              ? <option>1-Speed</option>
              : TRANSMISSIONS.map(t => <option key={t}>{t}</option>)
            }
          </select>
        </div>
        <div>
          <label className={labelCls}>Drive Type *</label>
          <select name="driveType" required value={values.driveType} onChange={set('driveType')} className={inputClassName}>
            <option value="">Select...</option>
            {DRIVE_TYPES.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Color</label>
          <input type="text" name="color" placeholder="Rally Green"
            value={values.color} onChange={set('color')} className={inputClassName} />
        </div>
        <div>
          <label className={labelCls}>Price *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
            <input type="text" name="price" inputMode="numeric" required placeholder="89,500"
              value={values.price} onChange={e => onChange('price', formatNumeric(e.target.value))}
              className={inputClassName.replace('px-4', 'pl-7 pr-4').replace('px-3', 'pl-6 pr-3')} />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <label className={labelCls}>Description *</label>
        <textarea name="description" required rows={5} placeholder="Describe the car — history, restoration work, known issues, matching numbers, etc."
          value={values.description} onChange={set('description')}
          className={inputClassName + ' resize-none'} />
      </div>
    </>
  );
}
