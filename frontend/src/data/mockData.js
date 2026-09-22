// Mock data for H&G Technology & Camera Store

export const mockCategories = [
  { id: 1, name: 'Máy ảnh', icon: '📷', count: 128 },
  { id: 2, name: 'Laptop', icon: '💻', count: 94 },
  { id: 3, name: 'Điện thoại', icon: '📱', count: 213 },
  { id: 4, name: 'Máy in', icon: '🖨️', count: 47 },
  { id: 5, name: 'Ống kính', icon: '🔭', count: 86 },
  { id: 6, name: 'Phụ kiện', icon: '🎒', count: 319 },
];

export const mockBrands = [
  { id: 1, name: 'Canon' },
  { id: 2, name: 'Sony' },
  { id: 3, name: 'Nikon' },
  { id: 4, name: 'Apple' },
  { id: 5, name: 'Samsung' },
  { id: 6, name: 'Dell' },
  { id: 7, name: 'Fujifilm' },
];

export const mockProducts = [
  {
    id: 1, name: 'Canon EOS R5 Mark II', brand: 'Canon', category: 'Máy ảnh',
    price: 89900000, oldPrice: 99000000,
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80',
    rating: 4.8, reviewCount: 124, stock: 15, status: true, isNew: false, isHot: true,
    description: 'Máy ảnh full-frame mirrorless 45MP, quay video 8K RAW, IBIS 8 stop.',
    discount: 10,
  },
  {
    id: 2, name: 'Sony A7 IV Full Frame', brand: 'Sony', category: 'Máy ảnh',
    price: 62000000, oldPrice: 68000000,
    image: 'https://images.unsplash.com/photo-1606986628253-b0a9bb95dc72?w=400&q=80',
    rating: 4.7, reviewCount: 89, stock: 8, status: true, isNew: false, isHot: false,
    description: 'Mirrorless 33MP, AF AI nâng cao, quay video 4K 60fps.',
    discount: 9,
  },
  {
    id: 3, name: 'MacBook Pro 16" M4 Pro', brand: 'Apple', category: 'Laptop',
    price: 69900000, oldPrice: 74900000,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80',
    rating: 4.9, reviewCount: 256, stock: 12, status: true, isNew: true, isHot: false,
    description: 'Chip M4 Pro, 24GB RAM, SSD 512GB, màn hình Liquid Retina XDR.',
    discount: 7,
  },
  {
    id: 4, name: 'iPhone 16 Pro Max 256GB', brand: 'Apple', category: 'Điện thoại',
    price: 34900000, oldPrice: 37990000,
    image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&q=80',
    rating: 4.8, reviewCount: 412, stock: 45, status: true, isNew: true, isHot: true,
    description: 'A18 Pro chip, Camera Control, màn hình Super Retina XDR 6.9".',
    discount: 8,
  },
  {
    id: 5, name: 'Nikon Z6 III', brand: 'Nikon', category: 'Máy ảnh',
    price: 57000000, oldPrice: 62000000,
    image: 'https://images.unsplash.com/photo-1513759565286-20e9c5fad06b?w=400&q=80',
    rating: 4.6, reviewCount: 67, stock: 6, status: true, isNew: true, isHot: false,
    description: 'Sensor BSI 24.5MP, quay video 6K, EVF 5.76M điểm ảnh.',
    discount: 8,
  },
  {
    id: 6, name: 'Samsung Galaxy S25 Ultra', brand: 'Samsung', category: 'Điện thoại',
    price: 31990000, oldPrice: 35000000,
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&q=80',
    rating: 4.7, reviewCount: 338, stock: 30, status: true, isNew: true, isHot: false,
    description: 'Snapdragon 8 Elite, Camera 200MP, S Pen tích hợp, AI siêu mạnh.',
    discount: 9,
  },
  {
    id: 7, name: 'Fujifilm X-T5', brand: 'Fujifilm', category: 'Máy ảnh',
    price: 39900000, oldPrice: 43000000,
    image: 'https://images.unsplash.com/photo-1522198648249-0657d7ff242a?w=400&q=80',
    rating: 4.8, reviewCount: 92, stock: 9, status: true, isNew: false, isHot: false,
    description: 'Sensor APS-C 40MP, thiết kế retro, Film Simulation 19 chế độ.',
    discount: 7,
  },
  {
    id: 8, name: 'Dell XPS 15 OLED', brand: 'Dell', category: 'Laptop',
    price: 45900000, oldPrice: 52000000,
    image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80',
    rating: 4.5, reviewCount: 143, stock: 20, status: true, isNew: false, isHot: false,
    description: 'Intel Core Ultra 9, RTX 4070, RAM 32GB, màn hình OLED 3.5K.',
    discount: 12,
  },
  {
    id: 9, name: 'Canon RF 50mm f/1.2L USM', brand: 'Canon', category: 'Ống kính',
    price: 72000000, oldPrice: 78000000,
    image: 'https://images.unsplash.com/photo-1502920514313-52581002a659?w=400&q=80',
    rating: 4.9, reviewCount: 54, stock: 4, status: true, isNew: false, isHot: false,
    description: 'Ống kính prime 50mm f/1.2, L-series, autofocus Nano USM siêu nhanh.',
    discount: 8,
  },
  {
    id: 10, name: 'Sony FE 24-70mm f/2.8 GM II', brand: 'Sony', category: 'Ống kính',
    price: 55000000, oldPrice: 60000000,
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80',
    rating: 4.8, reviewCount: 77, stock: 7, status: true, isNew: false, isHot: false,
    description: 'Ống kính zoom tiêu chuẩn f/2.8, G Master thế hệ 2, nhẹ hơn 20%.',
    discount: 8,
  },
];

export const mockFlashSaleProducts = mockProducts.slice(0, 5).map(p => ({ ...p, discount: p.discount + 5 }));
export const mockFeaturedProducts = mockProducts.slice(0, 8);
export const mockNewProducts = mockProducts.filter(p => p.isNew);

export const mockOrders = [
  { id: 1, orderCode: 'ORD-5F2A9C', createdAt: '2026-09-05T10:30:00', status: 'DELIVERED', totalAmount: 62000000, paymentMethod: 'COD', items: 2 },
  { id: 2, orderCode: 'ORD-7B3D1E', createdAt: '2026-09-07T14:20:00', status: 'SHIPPING', totalAmount: 34900000, paymentMethod: 'BANKING', items: 1 },
  { id: 3, orderCode: 'ORD-2C4F8A', createdAt: '2026-09-08T09:15:00', status: 'PENDING', totalAmount: 89900000, paymentMethod: 'COD', items: 1 },
];
