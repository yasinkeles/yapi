import { Link } from 'react-router-dom';

const SectionHeader = ({ title, subtitle, href, linkLabel = 'View all' }) => (
  <div className="flex items-end justify-between mb-5">
    <div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {href && (
      <Link to={href} className="text-sm font-medium flex items-center gap-1" style={{ color: '#233d7d' }}>
        {linkLabel} <i className="bi bi-arrow-right"></i>
      </Link>
    )}
  </div>
);

export default SectionHeader;
