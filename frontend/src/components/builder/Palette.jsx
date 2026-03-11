const blocks = [
  { type: 'header', label: 'Hero Header' },
  { type: 'text', label: 'Text' },
  { type: 'image', label: 'Image' },
  { type: 'card', label: 'Card' },
  { type: 'grid', label: 'Grid' },
  { type: 'section', label: 'Section' },
  { type: 'button', label: 'Button' },
  { type: 'productSlider', label: 'Product Slider' }
];

const Palette = ({ onAdd }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Palette</h3>
      <div className="grid grid-cols-2 gap-2">
        {blocks.map((b) => (
          <button
            key={b.type}
            className="border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs rounded p-2 text-left text-slate-900"
            onClick={() => onAdd(b.type)}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Palette;
