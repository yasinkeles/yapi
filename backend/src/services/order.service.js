const OrderModel = require('../models/Order');
const OrderItemModel = require('../models/OrderItem');
const CartModel = require('../models/Cart');
const CartItemModel = require('../models/CartItem');
const CustomerAddressModel = require('../models/CustomerAddress');
const ProductModel = require('../models/Product');

function generateOrderNumber() {
  return 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
}

class OrderService {
  async checkout(customerId, shippingAddressId, paymentMethod, customerNote) {
    // 1. Load cart and items
    const cart = await CartModel.findByCustomerId(customerId);
    if (!cart) throw new Error('Cart not found');
    const items = await CartItemModel.listByCartId(cart.id);
    if (!items.length) throw new Error('Cart is empty');
    // 2. Validate address
    const address = await CustomerAddressModel.findById(shippingAddressId, customerId);
    if (!address) throw new Error('Invalid address');
    // 3. Group items by seller
    const itemsBySeller = {};
    for (const item of items) {
      if (!itemsBySeller[item.seller_id]) itemsBySeller[item.seller_id] = [];
      itemsBySeller[item.seller_id].push(item);
    }
    const createdOrders = [];
    // 4. For each seller, create order and order items
    for (const sellerId of Object.keys(itemsBySeller)) {
      const sellerItems = itemsBySeller[sellerId];
      let subtotal = 0, discountTotal = 0, shippingTotal = 0, grandTotal = 0;
      const orderItems = [];
      for (const item of sellerItems) {
        const appliedPrice = item.campaign_price_snapshot || item.unit_price;
        const lineTotal = appliedPrice * item.quantity;
        subtotal += item.unit_price * item.quantity;
        discountTotal += ((item.unit_price - (item.campaign_price_snapshot || item.unit_price)) * item.quantity);
        grandTotal += lineTotal;
        orderItems.push({
          product_id: item.product_id,
          seller_id: item.seller_id,
          product_name_snapshot: item.product_name_snapshot,
          product_image_snapshot: item.product_image_snapshot,
          sku_snapshot: null,
          unit_price: item.unit_price,
          campaign_price_applied: item.campaign_price_snapshot,
          quantity: item.quantity,
          line_total: lineTotal
        });
      }
      shippingTotal = 0; // Placeholder, can be extended
      grandTotal += shippingTotal;
      const order = await OrderModel.create({
        order_number: generateOrderNumber(),
        customer_id: customerId,
        seller_id: sellerId,
        shipping_address_id: shippingAddressId,
        payment_method: paymentMethod,
        order_status: 'pending',
        subtotal,
        discount_total: discountTotal,
        shipping_total: shippingTotal,
        grand_total: grandTotal,
        customer_note: customerNote || null
      });
      for (const oi of orderItems) {
        oi.order_id = order.rows[0].id;
        await OrderItemModel.create(oi);
      }
      createdOrders.push(order.rows[0]);
    }
    // 5. Clear cart
    await CartItemModel.clear(cart.id);
    return createdOrders;
  }

  async listCustomerOrders(customerId) {
    return OrderModel.listByCustomerId(customerId);
  }

  async listSellerOrders(sellerId) {
    return OrderModel.listBySellerId(sellerId);
  }

  async getOrder(orderId, userId, role) {
    return OrderModel.findById(orderId, userId, role);
  }

  async updateOrderStatus(orderId, sellerId, status) {
    return OrderModel.updateStatus(orderId, sellerId, status);
  }
}

module.exports = new OrderService();
