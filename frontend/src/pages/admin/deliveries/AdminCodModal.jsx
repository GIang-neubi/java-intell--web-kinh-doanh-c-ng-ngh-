import { useEffect, useState } from 'react';
import {
  DollarSign, CheckCircle2, AlertCircle, X, Loader2,
  RefreshCw, Check, ArrowRight, UserCheck, ShieldCheck
} from 'lucide-react';
import { fetchCodReconciliation, settleShipperCod } from '../../../api/delivery';
import { getErrorMessage } from '../../../api/client';
import { formatPrice } from '../../../utils/helpers';

export default function AdminCodModal({ isOpen, onClose, onSettled }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settlingId, setSettlingId] = useState(null);
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchCodReconciliation();
      setData(res);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được báo cáo đối soát COD'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      load();
    }
  }, [isOpen]);

  const handleSettleShipper = async (shipper) => {
    if (!window.confirm(`Xác nhận đối soát & thu toàn bộ ${formatPrice(shipper.pendingCodAmount || 0)} tiền mặt COD từ shipper ${shipper.shipperName}?`)) {
      return;
    }

    setSettlingId(shipper.shipperId);
    try {
      await settleShipperCod(shipper.shipperId, `Admin đối soát thu ${formatPrice(shipper.pendingCodAmount || 0)} từ ${shipper.shipperName}`);
      setToast(`Đã đối soát thành công cho ${shipper.shipperName}!`);
      setTimeout(() => setToast(''), 3500);
      load();
      if (onSettled) onSettled();
    } catch (err) {
      alert(getErrorMessage(err, 'Lỗi khi đối soát nộp tiền'));
    } finally {
      setSettlingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="hg-modal-overlay"
      onClick={onClose}
    >
      <div
        className="hg-modal-dialog lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <DollarSign size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-white">
                Đối Soát Tiền Mặt Thu Hộ (COD Reconciliation)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Quản lý số tiền mặt tài xế đang giữ và quyết toán nộp về quỹ cửa hàng H&G
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Làm mới"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
          {toast && (
            <div className="p-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-md flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{toast}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-150 dark:border-gray-800">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Tổng đơn COD
              </span>
              <div className="text-xl font-black text-gray-900 dark:text-white mt-1">
                {data?.totalDeliveredCodOrders ?? '—'}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                Đã thu từ khách
              </span>
              <div className="text-xl font-black text-blue-700 dark:text-blue-300 mt-1">
                {formatPrice(data?.totalCodCollected ?? 0)}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                Đã nộp vào quỹ
              </span>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                {formatPrice(data?.totalCodSettled ?? 0)}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border-2 border-amber-300/80 dark:border-amber-700 shadow-sm">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                Shipper đang giữ
              </span>
              <div className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">
                {formatPrice(data?.totalCodPending ?? 0)}
              </div>
            </div>
          </div>

          {/* Shippers Reconciliation Table */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Bảng Đối Soát Theo Từng Shipper</span>
              <span className="text-gray-400 font-normal normal-case">
                {data?.shipperSummaries?.length || 0} nhân sự
              </span>
            </h4>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400 text-xs">
                <Loader2 size={24} className="animate-spin text-amber-500 mb-2" />
                <span>Đang tính toán dữ liệu đối soát...</span>
              </div>
            ) : (!data?.shipperSummaries || data.shipperSummaries.length === 0) ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Chưa có dữ liệu giao COD của Shipper nào.
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60 text-xs">
                {data.shipperSummaries.map((s) => {
                  const hasPending = (s.pendingCodAmount || 0) > 0;
                  const isSettling = settlingId === s.shipperId;

                  return (
                    <div
                      key={s.shipperId}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-750 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center shadow-sm">
                          {s.shipperName ? s.shipperName.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-gray-900 dark:text-white">
                            {s.shipperName}
                          </div>
                          <div className="text-gray-400 text-[11px]">
                            SĐT: {s.shipperPhone || '—'} • {s.totalCodOrders} đơn COD ({s.pendingCodOrders} đơn chưa nộp)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-gray-400 text-[10px] block uppercase font-semibold">
                            Tiền mặt đang giữ
                          </span>
                          <span
                            className={`font-black text-sm sm:text-base ${
                              hasPending ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {formatPrice(s.pendingCodAmount || 0)}
                          </span>
                        </div>

                        {hasPending ? (
                          <button
                            type="button"
                            disabled={isSettling}
                            onClick={() => handleSettleShipper(s)}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
                          >
                            {isSettling ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={14} />}
                            <span>Thu tiền quỹ</span>
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs font-semibold flex items-center gap-1">
                            <Check size={13} className="text-emerald-500" />
                            <span>Đã hoàn tất</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-700/80 bg-gray-50/60 dark:bg-gray-900/40 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Dữ liệu đối soát tự động cập nhật theo trạng thái giao hàng thực tế.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs hover:bg-gray-100"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
