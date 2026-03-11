const db = require('../config/database');

class SellerSettingsModel {
  mapRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      sellerId: row.seller_id,
      storeName: row.store_name,
      storeLogo: row.store_logo,
      storeDescription: row.store_description,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      shippingRegions: row.shipping_regions || [],
      shippingPrice: row.shipping_price,
      freeShippingThreshold: row.free_shipping_threshold,
      bankName: row.bank_name,
      bankIban: row.bank_iban,
      taxId: row.tax_id,
      invoiceAddress: row.invoice_address,
      notifyOrders: !!row.notify_orders,
      notifyLowStock: !!row.notify_low_stock,
      notifyEmail: !!row.notify_email,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async get(sellerId) {
    const row = await db.queryOne(
      'SELECT * FROM seller_settings WHERE seller_id = ?',
      [sellerId]
    );
    if (!row) return this.getDefaults(sellerId);
    return this.mapRow(row);
  }

  getDefaults(sellerId) {
    return {
      sellerId,
      storeName: null,
      storeLogo: null,
      storeDescription: null,
      contactEmail: null,
      contactPhone: null,
      shippingRegions: [],
      shippingPrice: 0,
      freeShippingThreshold: null,
      bankName: null,
      bankIban: null,
      taxId: null,
      invoiceAddress: null,
      notifyOrders: true,
      notifyLowStock: true,
      notifyEmail: true
    };
  }

  async save(payload, sellerId) {
    const existing = await db.queryOne(
      'SELECT id FROM seller_settings WHERE seller_id = ?',
      [sellerId]
    );

    if (existing) {
      const fields = [];
      const params = [];

      const map = {
        storeName: 'store_name',
        storeLogo: 'store_logo',
        storeDescription: 'store_description',
        contactEmail: 'contact_email',
        contactPhone: 'contact_phone',
        shippingRegions: 'shipping_regions',
        shippingPrice: 'shipping_price',
        freeShippingThreshold: 'free_shipping_threshold',
        bankName: 'bank_name',
        bankIban: 'bank_iban',
        taxId: 'tax_id',
        invoiceAddress: 'invoice_address',
        notifyOrders: 'notify_orders',
        notifyLowStock: 'notify_low_stock',
        notifyEmail: 'notify_email'
      };

      for (const [key, col] of Object.entries(map)) {
        if (payload[key] !== undefined) {
          fields.push(`${col} = ?`);
          if (key === 'shippingRegions') {
            params.push(JSON.stringify(payload[key]));
          } else if (['notifyOrders', 'notifyLowStock', 'notifyEmail'].includes(key)) {
            params.push(payload[key] ? 1 : 0);
          } else {
            params.push(payload[key]);
          }
        }
      }

      if (fields.length) {
        fields.push('updated_at = NOW()');
        params.push(sellerId);
        await db.execute(
          `UPDATE seller_settings SET ${fields.join(', ')} WHERE seller_id = ?`,
          params
        );
      }
    } else {
      await db.execute(
        `INSERT INTO seller_settings
          (seller_id, store_name, store_logo, store_description, contact_email, contact_phone,
           shipping_regions, shipping_price, free_shipping_threshold,
           bank_name, bank_iban, tax_id, invoice_address,
           notify_orders, notify_low_stock, notify_email)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sellerId,
          payload.storeName || null,
          payload.storeLogo || null,
          payload.storeDescription || null,
          payload.contactEmail || null,
          payload.contactPhone || null,
          JSON.stringify(payload.shippingRegions || []),
          payload.shippingPrice || 0,
          payload.freeShippingThreshold || null,
          payload.bankName || null,
          payload.bankIban || null,
          payload.taxId || null,
          payload.invoiceAddress || null,
          payload.notifyOrders !== false ? 1 : 0,
          payload.notifyLowStock !== false ? 1 : 0,
          payload.notifyEmail !== false ? 1 : 0
        ]
      );
    }

    return this.get(sellerId);
  }
}

module.exports = new SellerSettingsModel();
