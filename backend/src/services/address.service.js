const CustomerAddressModel = require('../models/CustomerAddress');

class AddressService {
  async listAddresses(customerId) {
    return CustomerAddressModel.listByCustomerId(customerId);
  }

  async getAddress(addressId, customerId) {
    return CustomerAddressModel.findById(addressId, customerId);
  }

  async createAddress(customerId, address) {
    address.customer_id = customerId;
    return CustomerAddressModel.create(address);
  }

  async updateAddress(addressId, customerId, updates) {
    return CustomerAddressModel.update(addressId, customerId, updates);
  }

  async removeAddress(addressId, customerId) {
    return CustomerAddressModel.remove(addressId, customerId);
  }

  async setDefaultAddress(addressId, customerId) {
    return CustomerAddressModel.setDefault(addressId, customerId);
  }
}

module.exports = new AddressService();
