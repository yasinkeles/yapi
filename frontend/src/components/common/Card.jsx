const Card = ({ title, children, className = '' }) => {
    return (
        <div className={`bg-dark-900 border border-dark-800 rounded-xl shadow-sm mb-6 ${className}`}>
            {title && (
                <div className="border-b border-dark-800 px-6 py-4">
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                </div>
            )}
            <div className="p-6">
                {children}
            </div>
        </div>
    );
};

export default Card;
