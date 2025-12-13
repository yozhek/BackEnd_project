export function Editable({label,value,multiline,onChange}:{label:string, value:string, multiline?: boolean, onChange:(v:string)=>void}) {
  return (
    <div className="field-row">
      <span className="field-label">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  )
}
