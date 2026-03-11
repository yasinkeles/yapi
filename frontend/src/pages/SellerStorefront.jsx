import PageBuilder from './PageBuilder';

const SellerStorefront = () => (
  <div className="space-y-3">
    <h1 className="text-2xl font-semibold">Storefront Designer</h1>
    <p className="text-slate-600">Use the builder below to design your storefront page.</p>
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <PageBuilder />
    </div>
  </div>
);

export default SellerStorefront;
