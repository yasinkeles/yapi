const ProductPriceBlock = ({ basePrice, campaignPrice, currency = 'USD' }) => {
  const hasCampaign = campaignPrice !== null && campaignPrice !== undefined && campaignPrice !== '';
  const displayCurrency = currency || 'USD';

  return (
    <div className="flex items-baseline gap-2">
      {hasCampaign && (
        <span className="text-lg font-semibold" style={{ color: '#233d7d' }}>
          {campaignPrice} {displayCurrency}
        </span>
      )}
      <span className={`text-sm ${hasCampaign ? 'line-through text-slate-400' : 'text-slate-900 font-semibold'}`}>
        {basePrice} {displayCurrency}
      </span>
    </div>
  );
};

export default ProductPriceBlock;
