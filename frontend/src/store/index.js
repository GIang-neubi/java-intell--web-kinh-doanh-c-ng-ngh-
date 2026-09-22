import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(persist(
  (set) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    login: (user, token) => set({ user, token, isAuthenticated: true }),
    logout: () => set({ user: null, token: null, isAuthenticated: false }),
    updateUser: (user) => set({ user }),
  }),
  { name: 'hg-auth' }
));

export const useCartStore = create(persist(
  (set, get) => ({
    items: [],
    addItem: (product, quantity = 1) => {
      const pId = Number(product.id);
      const addQty = Math.max(1, Number(quantity) || 1);
      const items = get().items || [];
      const existing = items.find(i => Number(i.id) === pId);
      
      const sellPrice = Number(product.price != null ? product.price : product.salePrice) || 0;
      const safeStock = product.stock != null ? Number(product.stock) : 999;
      const safeStatus = product.status !== false;

      if (existing) {
        set({
          items: items.map(i =>
            Number(i.id) === pId
              ? {
                  ...i,
                  quantity: i.quantity + addQty,
                  price: sellPrice > 0 ? sellPrice : i.price,
                  stock: safeStock,
                  status: safeStatus,
                }
              : i
          ),
        });
      } else {
        set({
          items: [
            ...items,
            {
              ...product,
              id: pId,
              price: sellPrice,
              stock: safeStock,
              status: safeStatus,
              quantity: addQty,
            },
          ],
        });
      }
    },
    updateQty: (id, quantity) => {
      const pId = Number(id);
      const qty = Number(quantity);
      if (qty <= 0) {
        set({ items: (get().items || []).filter(i => Number(i.id) !== pId) });
      } else {
        set({
          items: (get().items || []).map(i =>
            Number(i.id) === pId ? { ...i, quantity: qty } : i
          ),
        });
      }
    },
    removeItem: (id) => {
      const pId = Number(id);
      set({ items: (get().items || []).filter(i => Number(i.id) !== pId) });
    },
    clearCart: () => set({ items: [] }),
    getTotalItems: () => (get().items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0),
    getTotalPrice: () => (get().items || []).reduce((s, i) => s + ((Number(i.price) || 0) * (Number(i.quantity) || 0)), 0),
    get totalItems() {
      return (get().items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    },
    get totalPrice() {
      return (get().items || []).reduce((s, i) => s + ((Number(i.price) || 0) * (Number(i.quantity) || 0)), 0);
    },
  }),
  {
    name: 'hg-cart',
    partialize: (state) => ({ items: state.items }),
  }
));

export const useWishlistStore = create((set, get) => ({
  ids: [],
  setIds: (ids) => set({ ids }),
  toggle: (id) => {
    const ids = get().ids;
    set({ ids: ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id] });
  },
  has: (id) => get().ids.includes(id),
}));
