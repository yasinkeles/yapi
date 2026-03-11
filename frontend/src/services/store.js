/**
 * Storefront service
 */
import api from './api';

export const fetchCategories = () => api.get('/store/categories');
export const fetchProducts = ({ category, search, page, limit } = {}) => api.get('/store/products', {
	params: {
		...(category ? { category } : {}),
		...(search ? { search } : {}),
		...(page ? { page } : {}),
		...(limit ? { limit } : {})
	}
});

export const fetchProductDetail = (slug) => api.get(`/store/products/${slug}`);
