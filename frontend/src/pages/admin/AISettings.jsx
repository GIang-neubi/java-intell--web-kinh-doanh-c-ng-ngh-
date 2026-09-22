import { useState, useEffect } from 'react';
import { 
  Sparkles, Bot, Settings, RefreshCw, 
  Send, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { getAiConfig, updateAiConfig, sendAiChat } from '../../api/ai';
import { useToast } from '../../components/Toast';

export default function AISettings() {
  const [config, setConfig] = useState({
    enabled: true,
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    temperature: 0.4,
    maxTokens: 800,
    hasApiKey: false,
    maskedApiKey: '',
    systemPromptCustom: '',
    statusMessage: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  const { showToast } = useToast();

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await getAiConfig();
      if (res && res.success && res.data) {
        setConfig(res.data);
      }
    } catch (err) {
      showToast('Không thể tải cấu hình AI: ' + (err.message || 'Lỗi mạng'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await updateAiConfig(config);
      if (res && res.success) {
        setConfig(res.data);
        showToast('Đã lưu cấu hình Trợ lý AI thành công!', 'success');
      }
    } catch (err) {
      showToast('Lỗi khi lưu cấu hình: ' + (err.message || 'Lỗi server'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestChat = async () => {
    if (!testInput.trim() || testLoading) return;
    try {
      setTestLoading(true);
      setTestOutput('Đang gửi truy vấn thử nghiệm đến AI Service...');
      const res = await sendAiChat(testInput, []);
      if (res && res.success) {
        let text = res.message;
        if (res.products && res.products.length > 0) {
          text += `\n\n[Hệ thống gắn kèm ${res.products.length} thẻ sản phẩm: ${res.products.map(p => p.name).join(', ')}]`;
        }
        setTestOutput(text);
      } else {
        setTestOutput(res?.message || 'Có lỗi xảy ra khi gọi AI.');
      }
    } catch (err) {
      setTestOutput('Lỗi: ' + (err.message || 'Không thể kết nối đến AI Service'));
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="hg-admin-loading-container" style={{ padding: '40px', textAlign: 'center' }}>
        <RefreshCw size={24} className="hg-spin" style={{ color: 'var(--primary)', marginBottom: '12px' }} />
        <p>Đang tải cấu hình AI...</p>
      </div>
    );
  }

  return (
    <div className="hg-admin-ai-page" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="hg-admin-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={22} style={{ color: '#0a3d8f' }} />
            Cấu hình Trợ lý AI (Sales & Customer Support)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Quản lý model, tham số nhiệt độ (temperature) và các chỉ dẫn tư vấn bán hàng thời gian thực.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px' }}>
        {/* Form Cấu hình */}
        <div className="hg-admin-card" style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <strong style={{ fontSize: '15px', display: 'block' }}>Kích hoạt Trợ lý AI</strong>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cho phép khách hàng trò chuyện với AI trên website</span>
              </div>
              <label className="hg-switch" style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                <input 
                  type="checkbox" 
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: config.enabled ? '#0a3d8f' : '#cbd5e1',
                  transition: '0.3s', borderRadius: '26px'
                }}>
                  <span style={{
                    position: 'absolute', content: '""', height: '20px', width: '20px',
                    left: config.enabled ? '24px' : '4px', bottom: '3px',
                    backgroundColor: '#fff', transition: '0.3s', borderRadius: '50%'
                  }} />
                </span>
              </label>
            </div>

            {/* Provider & Key Status */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Trạng thái Provider & API Key
              </label>
              <div style={{ 
                padding: '12px 14px', 
                borderRadius: '8px', 
                background: config.hasApiKey ? '#f0fdf4' : '#fffbeb', 
                border: `1px solid ${config.hasApiKey ? '#bbf7d0' : '#fef08a'}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                {config.hasApiKey ? (
                  <ShieldCheck size={18} style={{ color: '#16a34a', marginTop: '2px', flexShrink: 0 }} />
                ) : (
                  <AlertTriangle size={18} style={{ color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
                )}
                <div style={{ fontSize: '12px' }}>
                  <div style={{ fontWeight: 600, color: config.hasApiKey ? '#15803d' : '#b45309' }}>
                    {config.hasApiKey ? 'Google Gemini API đã kết nối' : 'Chế độ Local Fallback Engine'}
                  </div>
                  <div style={{ color: '#475569', marginTop: '2px' }}>
                    {config.hasApiKey 
                      ? `Khóa API: ${config.maskedApiKey}` 
                      : 'Hệ thống tự động sử dụng DB Grounded Engine. Để dùng Google Gemini, đặt biến môi trường GEMINI_API_KEY.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Model Selection */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Mô hình AI (Model)
              </label>
              <select 
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', background: '#fff' }}
              >
                <option value="gemini-1.5-flash">gemini-1.5-flash (Khuyên dùng: Tốc độ cao, tối ưu chi phí)</option>
                <option value="gemini-2.5-flash">gemini-2.5-flash (Thế hệ mới nhất, suy luận nhanh)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (Suy luận sâu, hỗ trợ văn cảnh phức tạp)</option>
              </select>
            </div>

            {/* Temperature Slider */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Độ sáng tạo (Temperature): {config.temperature}</label>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {config.temperature <= 0.3 ? 'Chính xác / Thực tế' : config.temperature <= 0.6 ? 'Cân bằng (Khuyên dùng)' : 'Sáng tạo'}
                </span>
              </div>
              <input 
                type="range" 
                min="0.0" 
                max="1.0" 
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#0a3d8f' }}
              />
            </div>

            {/* Custom System Instruction */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Chỉ dẫn bổ sung cho Trợ lý (Tùy chọn)
              </label>
              <textarea 
                rows={3}
                placeholder="Ví dụ: Đang có sự kiện giảm giá 5% cho máy ảnh Sony. Ưu tiên nhắc khách hàng kiểm tra khuyến mãi khi hỏi về Sony..."
                value={config.systemPromptCustom || ''}
                onChange={(e) => setConfig({ ...config, systemPromptCustom: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', resize: 'vertical' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                Chỉ dẫn này sẽ được tự động tích hợp an toàn vào System Instruction cùng dữ liệu sản phẩm thật từ DB.
              </span>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0a3d8f, #1a5abf)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {saving ? <RefreshCw size={16} className="hg-spin" /> : <Settings size={16} />}
              <span>{saving ? 'Đang lưu...' : 'Lưu cấu hình AI'}</span>
            </button>
          </form>
        </div>

        {/* Khung Thử nghiệm Test Console */}
        <div className="hg-admin-card" style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
            <strong style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} style={{ color: '#0a3d8f' }} />
              Test Console — Thử nghiệm Trợ lý AI
            </strong>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Kiểm tra phản hồi thực tế từ Backend AI Service với dữ liệu kho hiện tại.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <input 
              type="text"
              placeholder="Nhập câu hỏi test (VD: Laptop gaming dưới 30 triệu)..."
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTestChat()}
              style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px' }}
            />
            <button 
              type="button" 
              onClick={handleTestChat}
              disabled={testLoading || !testInput.trim()}
              style={{
                padding: '0 16px',
                borderRadius: '8px',
                background: '#0a3d8f',
                color: '#fff',
                border: 'none',
                cursor: testLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              {testLoading ? <RefreshCw size={14} className="hg-spin" /> : <Send size={14} />}
              <span>Test</span>
            </button>
          </div>

          {/* Prompt Gợi ý thử nghiệm */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {['Laptop gaming dưới 30 triệu', 'So sánh 2 sản phẩm máy ảnh', 'Chính sách thanh toán SePay'].map((q) => (
              <button 
                key={q} 
                type="button" 
                onClick={() => { setTestInput(q); }}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '14px',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  color: '#334155'
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Output Box */}
          <div style={{
            flex: 1,
            minHeight: '220px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '14px',
            fontSize: '13px',
            lineHeight: 1.6,
            color: '#1e293b',
            whiteSpace: 'pre-wrap',
            overflowY: 'auto'
          }}>
            {testOutput || (
              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                Kết quả phản hồi từ AI sẽ hiển thị tại đây...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
