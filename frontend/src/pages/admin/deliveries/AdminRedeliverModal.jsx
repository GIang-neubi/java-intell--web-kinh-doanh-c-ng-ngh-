import { useState, useEffect } from 'react';
import {
  RotateCcw, PackageX, AlertTriangle, Calendar, User,
  CheckCircle2, Loader2, X, Clock, ArrowRight, ShieldAlert, Archive
} from 'lucide-react';
import { redeliverOrder, returnDeliveryToWarehouse, fetchShippers } from '../../../api/delivery';
import { getErrorMessage } from '../../../api/client';

export default function AdminRedeliverModal({ isOpen, onClose, delivery, onSuccess }) {
  const [activeMode, setActiveMode] = useState('REDELIVER'); // 'REDELIVER' or 'RETURN_WAREHOUSE'
  const [shippers, setShippers] = useState([]);
  const [selectedShipperId, setSelectedShipperId] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [note, setNote] = useState('');

  // Return to warehouse state
  const [returnReason, setReturnReason] = useState('Khách hàng từ chối nhận (Bom hàng)');
  const [restock, setRestock] = useState(true);
  const [returnNote, setReturnNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && delivery) {
      setError('');
      setNote('');
      setReturnNote('');
      setSelectedShipperId(delivery.shipperId ? String(delivery.shipperId) : '');
      setScheduleTime('');

      // Fetch active shippers for reassignment
      fetchShippers()
        .then((res) => setShippers(res || []))
        .catch(() => {});
    }
  }, [isOpen, delivery]);

  if (!isOpen || !delivery) return null;

  const currentAttempts = delivery.deliveryAttempts || 1;
  const nextAttempt = currentAttempts + 1;
  const isMaxAttempts = currentAttempts >= 3;

  const handleRedeliverSubmit = async (e) => {
    e.preventDefault();
    if (isMaxAttempts) {
      alert('Đơn hàng đã đạt tối đa 3 lần giao thất bại. Vui lòng chuyển hoàn về kho.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        shipperId: selectedShipperId ? Number(selectedShipperId) : undefined,
        nextDeliverySchedule: scheduleTime ? scheduleTime : undefined,
        note: note ? note.trim() : undefined,
      };
      await redeliverOrder(delivery.id, payload);
      if (onSuccess) onSuccess('Đã kích hoạt giao lại thành công!');
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Lỗi khi lên lịch giao lại'));
    } finally {
      setLoading(false);
    }
  };

  const handleReturnWarehouseSubmit = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Xác nhận hoàn hàng về kho H&G và hủy đơn hàng #${delivery.orderCode}?`)) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        reason: returnReason,
        restock: restock,
        note: returnNote ? returnNote.trim() : undefined,
      };
      await returnDeliveryToWarehouse(delivery.id, payload);
      if (onSuccess) onSuccess('Đã hoàn hàng về kho và cập nhật tồn kho!');
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Lỗi khi hoàn hàng về kho'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="hg-modal-overlay"
      onClick={onClose}
    >
      <div
        className="hg-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                Xử Lý Đơn Giao Thất Bại
              </h3>
              <div className="text-xs text-gray-400">
                Đơn #{delivery.orderCode} • Lần giao: <strong className="text-rose-500">{currentAttempts}/3</strong>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Failure reason callout */}
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs space-y-1">
          <div className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
            <ShieldAlert size={14} />
            <span>Lý do thất bại gần nhất:</span>
          </div>
          <p className="text-rose-700 dark:text-rose-200 font-medium">
            {delivery.failureReason || 'Không có thông tin lý do'}
          </p>
          {delivery.failureNote && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
              Ghi chú của shipper: &quot;{delivery.failureNote}&quot;
            </p>
          )}
        </div>

        {/* Mode selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveMode('REDELIVER')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeMode === 'REDELIVER'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <RotateCcw size={14} />
            <span>Hẹn giao lại (Lần {isMaxAttempts ? '3' : nextAttempt})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('RETURN_WAREHOUSE')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeMode === 'RETURN_WAREHOUSE'
                ? 'bg-white dark:bg-gray-800 text-rose-600 dark:text-rose-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <PackageX size={14} />
            <span>Hoàn hàng về kho</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-100 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* MODE 1: REDELIVER FORM */}
        {activeMode === 'REDELIVER' && (
          <form onSubmit={handleRedeliverSubmit} className="space-y-3.5 text-xs">
            {isMaxAttempts ? (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs">
                ⚠️ Đơn hàng này đã giao thất bại 3 lần. Hệ thống khuyến nghị chuyển sang chế độ <strong>Hoàn hàng về kho</strong> để bảo toàn quyền lợi và hoàn trả tồn kho sản phẩm.
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                    Phân công Shipper phụ trách:
                  </label>
                  <select
                    value={selectedShipperId}
                    onChange={(e) => setSelectedShipperId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium"
                  >
                    <option value="">Giữ nguyên shipper hiện tại</option>
                    {shippers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName || s.username} ({s.phone || 'SĐT chưa cập nhật'}) - Đang giao: {s.activeDeliveriesCount || 0} đơn
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                    Ngày & Giờ hẹn giao lại:
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium"
                  />
                  <span className="text-[11px] text-gray-400 mt-0.5 block">
                    Khung giờ khách đã xác nhận qua điện thoại CSKH
                  </span>
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                    Ghi chú điều phối:
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="VD: Khách hẹn giao sau 14h, gọi trước khi đến 15 phút..."
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                    <span>Xác nhận giao lại (Lần {nextAttempt})</span>
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        {/* MODE 2: RETURN TO WAREHOUSE FORM */}
        {activeMode === 'RETURN_WAREHOUSE' && (
          <form onSubmit={handleReturnWarehouseSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                Lý do hoàn hàng về kho:
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium"
              >
                <option value="Khách hàng từ chối nhận (Bom hàng)">Khách hàng từ chối nhận (Bom hàng)</option>
                <option value="Đã giao 3 lần không liên lạc được">Đã giao 3 lần không liên lạc được</option>
                <option value="Khách hàng hủy đơn do đặt nhầm">Khách hàng hủy đơn do đặt nhầm</option>
                <option value="Địa chỉ không có thật hoặc sai lệch nghiêm trọng">Địa chỉ không có thật hoặc sai lệch nghiêm trọng</option>
                <option value="Lý do khác">Lý do khác</option>
              </select>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 flex items-center gap-2.5">
              <input
                type="checkbox"
                id="restockCheck"
                checked={restock}
                onChange={(e) => setRestock(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="restockCheck" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                Tự động hoàn trả số lượng vào tồn kho sản phẩm (Restock)
              </label>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                Ghi chú hoàn kho:
              </label>
              <textarea
                rows={2}
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                placeholder="VD: Kiện hàng nguyên vẹn, nhập lại kho H&G ngày hôm nay..."
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold flex items-center gap-1.5 shadow-md shadow-rose-500/20"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                <span>Hoàn Hàng Về Kho & Hủy Đơn</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
