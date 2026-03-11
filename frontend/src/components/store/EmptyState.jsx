const EmptyState = ({ icon = 'bi bi-inbox', title, message, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
      <i className={`${icon} text-2xl text-slate-400`}></i>
    </div>
    <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
    {message && <p className="text-sm text-slate-500 max-w-xs">{message}</p>}
    {action && (
      <div className="mt-4">{action}</div>
    )}
  </div>
);

export default EmptyState;
