import WarehouseList from '../warehouses/WarehouseList';

/**
 * Phase 15: Unified Warehouse & Inventory Hub
 * Preserves the `/admin/inventory` route by rendering the 4-tab hub with default tab 'import' (Tạo phiếu nhập)
 */
export default function InventoryManager() {
  return <WarehouseList defaultTab="import" />;
}
