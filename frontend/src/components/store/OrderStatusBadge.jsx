const STATUS_CONFIG = {
  pending:   { label: 'Pending',   bg: 'bg-amber-100',   text: 'text-amber-800',   icon: 'bi bi-clock' },
  confirmed: { label: 'Confirmed', bg: 'bg-blue-100',    text: 'text-blue-800',    icon: 'bi bi-check-circle' },
  preparing: { label: 'Preparing', bg: 'bg-purple-100',  text: 'text-purple-800',  icon: 'bi bi-box-seam' },
  shipped:   { label: 'Shipped',   bg: 'bg-orange-100',  text: 'text-orange-800',  icon: 'bi bi-truck' },
  delivered: { label: 'Delivered', bg: 'bg-blue-100', text: 'text-[#233d7d]', icon: 'bi bi-bag-check' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100',     text: 'text-red-800',     icon: 'bi bi-x-circle' },
};

const OrderStatusBadge = ({ status, showIcon = true }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-700', icon: 'bi bi-question-circle' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {showIcon && <i className={cfg.icon}></i>}
      {cfg.label}
    </span>
  );
};

export default OrderStatusBadge;
