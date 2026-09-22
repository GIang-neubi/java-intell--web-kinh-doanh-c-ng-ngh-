import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bot, ChevronDown, Loader2, MessageCircle, Send, Sparkles, User, X, 
  Camera, Aperture, Laptop, Search, Package, AlertCircle, ShoppingCart, 
  Eye, Copy, Check, Trash2, Star, ShoppingBag, ArrowRight,
  Headphones, ShieldCheck
} from 'lucide-react';
import { sendAiChat } from '../api/ai';
import { sendCustomerMessage, fetchCustomerMessages } from '../api/chat';
import { useCartStore, useAuthStore } from '../store';
import { useToast } from './Toast';
import { formatPrice } from '../utils/helpers';
import { resolveImageUrl } from '../utils/imageUrl';

const SUGGESTIONS = [
  { label: 'Tìm laptop gaming dưới 30 triệu', icon: Laptop },
  { label: 'Laptop nào phù hợp học IT?', icon: Laptop },
  { label: 'So sánh Sony A7 IV và Canon R6', icon: Camera },
  { label: 'Sản phẩm nào đang còn hàng?', icon: Search },
  { label: 'Đơn hàng gần nhất của tôi', icon: Package },
  { label: 'Giỏ hàng của tôi có gì?', icon: ShoppingBag },
];

const WELCOME_MESSAGE = 'Chào bạn! Mình là H&G Assistant — Trợ lý thông minh của H&G Technology & Camera.\n\nMình có thể giúp bạn tìm kiếm thiết bị công nghệ theo ngân sách, so sánh cấu hình, giải đáp chính sách và tra cứu đơn hàng thực tế.';

const ERROR_MESSAGES = {
  network: 'Không thể kết nối đến hệ thống trợ lý. Vui lòng kiểm tra kết nối mạng và thử lại nhé.',
  server: 'H&G Assistant hiện chưa thể xử lý yêu cầu lúc này. Bạn vẫn có thể mua sắm bình thường trên website nhé.',
};

/**
 * Parses markdown text into formatted elements (tables, bold, lists, paragraphs)
 */
function FormattedMessage({ content }) {
  const elements = useMemo(() => {
    if (!content) return null;

    const lines = content.split('\n');
    const nodes = [];
    let tableRows = [];
    let inTable = false;

    const flushTable = () => {
      if (tableRows.length === 0) return;
      
      const headerRow = tableRows[0];
      const dataRows = tableRows.slice(1).filter(r => !r.every(c => c.match(/^[:\s-]+$/)));

      nodes.push(
        <div key={`tbl-${nodes.length}`} className="hg-chat-table-wrapper">
          <table className="hg-chat-table">
            <thead>
              <tr>
                {headerRow.map((th, i) => (
                  <th key={i}>{formatInline(th)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((tr, ri) => (
                <tr key={ri}>
                  {tr.map((td, ci) => (
                    <td key={ci}>{formatInline(td)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for table line
      if (line.startsWith('|') && line.endsWith('|')) {
        inTable = true;
        const cols = line.slice(1, -1).split('|').map(c => c.trim());
        tableRows.push(cols);
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Empty line
      if (!line) {
        nodes.push(<div key={`sp-${i}`} className="hg-chat-line-break" />);
        continue;
      }

      // Bullet points
      if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
        const bulletText = line.substring(2);
        nodes.push(
          <div key={`b-${i}`} className="hg-chat-bullet">
            <span className="hg-chat-bullet-dot">•</span>
            <span>{formatInline(bulletText)}</span>
          </div>
        );
        continue;
      }

      // Numbered lists
      const numMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        nodes.push(
          <div key={`num-${i}`} className="hg-chat-bullet numbered">
            <span className="hg-chat-bullet-num">{numMatch[1]}.</span>
            <span>{formatInline(numMatch[2])}</span>
          </div>
        );
        continue;
      }

      // Regular paragraph
      nodes.push(
        <p key={`p-${i}`} className="hg-chat-text-line">
          {formatInline(line)}
        </p>
      );
    }

    if (inTable) {
      flushTable();
    }

    return nodes;
  }, [content]);

  return <div className="hg-chat-formatted-content">{elements}</div>;
}

/**
 * Format inline bold `**text**`, `*text*`, and `` `code` ``
 */
function formatInline(text) {
  if (!text) return '';
  // Split by bold **...**
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return <code key={idx} className="hg-chat-inline-code">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => [
    { role: 'assistant', content: WELCOME_MESSAGE, timestamp: Date.now(), products: [] }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // ── State for Admin Live Chat ──
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'admin'
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminInput, setAdminInput] = useState('');
  const [isAdminSending, setIsAdminSending] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const windowRef = useRef(null);
  const adminMessagesEndRef = useRef(null);
  const adminInputRef = useRef(null);

  const addItem = useCartStore((s) => s.addItem);
  const { user: currentUser } = useAuthStore();
  const { showToast } = useToast();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  const scrollAdminToBottom = useCallback(() => {
    adminMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  useEffect(() => {
    if (activeTab === 'ai') {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen, activeTab, scrollToBottom]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      if (activeTab === 'ai') {
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        setTimeout(() => adminInputRef.current?.focus(), 100);
      }
    }
  }, [isOpen, isMinimized, activeTab]);

  // Sinh hoặc lấy conversationId của khách
  const getConversationId = useCallback(() => {
    if (currentUser?.id) {
      return `user_${currentUser.id}`;
    }
    let guestId = localStorage.getItem('hg_guest_chat_id');
    if (!guestId) {
      guestId = `guest_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('hg_guest_chat_id', guestId);
    }
    return guestId;
  }, [currentUser]);

  // Tải tin nhắn từ admin
  const loadAdminChat = useCallback(async (silent = false) => {
    const convId = getConversationId();
    if (!silent) setIsAdminLoading(true);
    try {
      const msgs = await fetchCustomerMessages(convId);
      setAdminMessages(msgs);
    } catch (err) {
      console.error('Lỗi tải tin nhắn admin:', err);
    } finally {
      if (!silent) setIsAdminLoading(false);
    }
  }, [getConversationId]);

  // Polling khi tab 'admin' đang mở
  useEffect(() => {
    if (isOpen && !isMinimized && activeTab === 'admin') {
      loadAdminChat();
      const interval = setInterval(() => {
        loadAdminChat(true);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [isOpen, isMinimized, activeTab, loadAdminChat]);

  useEffect(() => {
    if (activeTab === 'admin') {
      scrollAdminToBottom();
    }
  }, [adminMessages.length, activeTab, scrollAdminToBottom]);

  const handleAddToCart = useCallback((product, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const sellPrice = product.salePrice != null ? product.salePrice : product.price;
    addItem({ ...product, price: sellPrice }, 1);
    showToast(`Đã thêm "${product.name}" vào giỏ hàng`, 'success');
  }, [addItem, showToast]);

  const handleSend = useCallback(async (text = input) => {
    const message = text.trim();
    if (!message || isLoading) return;
    
    setShowSuggestions(false);
    setError(null);
    
    const userMessage = { role: 'user', content: message, timestamp: Date.now() };
    setMessages(current => [...current, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const history = messages
        .filter((_, idx) => idx > 0)
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await sendAiChat(message, history);

      if (res && res.success && res.message) {
        setMessages(current => [
          ...current,
          {
            role: 'assistant',
            content: res.message,
            timestamp: Date.now(),
            products: res.products || [],
            provider: res.provider
          }
        ]);
      } else {
        setMessages(current => [
          ...current,
          { role: 'assistant', content: ERROR_MESSAGES.server, timestamp: Date.now(), products: [] }
        ]);
      }
    } catch (err) {
      console.error('Chatbot error:', err);
      setMessages(current => [
        ...current,
        { role: 'assistant', content: ERROR_MESSAGES.network, timestamp: Date.now(), products: [] }
      ]);
    } finally { 
      setIsLoading(false); 
    }
  }, [input, isLoading, messages]);

  // Khách gửi tin nhắn cho Admin
  const handleSendToAdmin = async (e) => {
    if (e) e.preventDefault();
    const content = adminInput.trim();
    if (!content || isAdminSending) return;

    const convId = getConversationId();
    const customerName = currentUser?.fullName || currentUser?.username || 'Khách hàng';
    const customerEmail = currentUser?.email || null;

    setIsAdminSending(true);
    const tempMsg = {
      id: 'temp_' + Date.now(),
      conversationId: convId,
      senderRole: 'CUSTOMER',
      senderName: customerName,
      content,
      createdAt: new Date().toISOString()
    };
    setAdminMessages(prev => [...prev, tempMsg]);
    setAdminInput('');

    try {
      const savedMsg = await sendCustomerMessage({
        conversationId: convId,
        content,
        customerName,
        customerEmail
      });
      setAdminMessages(prev =>
        prev.map(m => m.id === tempMsg.id ? savedMsg : m)
      );
      setTimeout(() => scrollAdminToBottom(), 50);
    } catch (err) {
      console.error('Lỗi gửi tin nhắn cho admin:', err);
      showToast('Không thể gửi tin nhắn. Vui lòng thử lại!', 'error');
    } finally {
      setIsAdminSending(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSend(suggestion.label);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClearConversation = () => {
    setMessages([{ role: 'assistant', content: WELCOME_MESSAGE, timestamp: Date.now(), products: [] }]);
    setShowSuggestions(true);
    setError(null);
  };

  const handleCopyMessage = (content, index) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const hasSuggestions = messages.length === 1 && !isLoading && showSuggestions;

  return (
    <section className="hg-chatbot" aria-label="Trợ lý mua sắm H&G">
      {/* ── Chat Window ── */}
      <div 
        ref={windowRef}
        className={`hg-chatbot-window ${isOpen ? 'open' : ''} ${isMinimized ? 'minimized' : ''}`}
        role="dialog" 
        aria-modal="false" 
        aria-label="H&G Assistant"
      >
        {/* Header */}
        <header className={`hg-chatbot-header ${activeTab === 'admin' ? 'admin-active' : ''}`}>
          <div className="hg-chatbot-identity">
            <div className={`hg-chatbot-avatar ${activeTab === 'admin' ? 'admin-avatar' : ''}`}>
              {activeTab === 'ai' ? <Sparkles size={18} /> : <Headphones size={18} />}
            </div>
            <div className="hg-chatbot-info">
              <strong>{activeTab === 'ai' ? 'H&G AI Assistant' : 'Hỗ trợ viên H&G'}</strong>
              <span>
                <span className="hg-status-dot" />
                {activeTab === 'ai' ? 'Trợ lý bán hàng & CSKH' : 'Tư vấn viên trực tuyến'}
              </span>
            </div>
          </div>
          <div className="hg-chatbot-actions">
            {activeTab === 'ai' && messages.length > 1 && (
              <button 
                type="button"
                className="hg-chatbot-btn"
                onClick={handleClearConversation}
                title="Xóa đoạn chat AI"
                aria-label="Xóa đoạn chat AI"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button 
              type="button"
              className="hg-chatbot-btn"
              onClick={() => setIsMinimized(!isMinimized)}
              aria-label={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
              disabled={!isOpen}
              title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
            >
              <ChevronDown size={18} className={isMinimized ? 'rotated' : ''} />
            </button>
            <button 
              type="button"
              className="hg-chatbot-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng trợ lý"
              title="Đóng trợ lý"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* ── Mode Switcher Tab Bar ── */}
        <div className="hg-chatbot-mode-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ai'}
            className={`hg-chatbot-mode-tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <Sparkles size={13} />
            <span>Trợ lý AI</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'admin'}
            className={`hg-chatbot-mode-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <Headphones size={13} />
            <span>Chat với Admin</span>
            <span className="hg-tab-live-pulse" />
          </button>
        </div>

        {/* ── Content: AI Assistant Tab ── */}
        {activeTab === 'ai' ? (
          <>
            <div className="hg-chatbot-messages" aria-live="polite" aria-label="Cuộc hội thoại AI">
              {messages.map((message, index) => (
                <div 
                  key={`${message.role}-${index}`}
                  className={`hg-chat-message-row ${message.role === 'user' ? 'user' : 'assistant'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="hg-chat-avatar">
                      <Bot size={15} />
                    </div>
                  )}

                  <div className="hg-chat-bubble-wrapper">
                    <div className={`hg-chat-bubble ${message.role === 'user' ? 'user' : 'assistant'}`}>
                      <FormattedMessage content={message.content} />
                      
                      {message.role === 'assistant' && index > 0 && (
                        <div className="hg-chat-bubble-footer">
                          <button 
                            type="button" 
                            className="hg-chat-copy-btn" 
                            onClick={() => handleCopyMessage(message.content, index)}
                            title="Sao chép câu trả lời"
                          >
                            {copiedIndex === index ? (
                              <>
                                <Check size={12} className="text-success" />
                                <span>Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Sao chép</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Product Recommendation Cards */}
                    {message.products && message.products.length > 0 && (
                      <div className="hg-chat-products-container">
                        <div className="hg-chat-products-header">
                          <span>Sản phẩm gợi ý ({message.products.length})</span>
                        </div>
                        <div className="hg-chat-products-list">
                          {message.products.map((prod) => {
                            const effectivePrice = prod.salePrice != null ? prod.salePrice : prod.price;
                            const hasDiscount = prod.salePrice != null && prod.price > prod.salePrice;
                            const inStock = prod.stock > 0;
                            const imgUrl = resolveImageUrl(prod.image);

                            return (
                              <div key={prod.id} className="hg-chat-product-card">
                                <div className="hg-chat-product-img-wrap">
                                  <img 
                                    src={imgUrl} 
                                    alt={prod.name} 
                                    className="hg-chat-product-img"
                                    loading="lazy"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                  {hasDiscount && (
                                    <span className="hg-chat-product-discount">
                                      -{prod.discountPercent || Math.round(((prod.price - prod.salePrice) / prod.price) * 100)}%
                                    </span>
                                  )}
                                </div>
                                <div className="hg-chat-product-info">
                                  {prod.brand && <div className="hg-chat-product-brand">{prod.brand}</div>}
                                  <Link 
                                    to={`/products/${prod.id}`} 
                                    className="hg-chat-product-name"
                                    onClick={() => setIsOpen(false)}
                                    title={prod.name}
                                  >
                                    {prod.name}
                                  </Link>
                                  
                                  <div className="hg-chat-product-rating">
                                    <Star size={11} fill="#f59e0b" color="#f59e0b" />
                                    <span>{prod.rating ? prod.rating.toFixed(1) : '5.0'}</span>
                                    <span className="text-muted">({prod.reviewCount || 0})</span>
                                  </div>

                                  <div className="hg-chat-product-pricing">
                                    <span className="hg-chat-product-price-new">
                                      {formatPrice(effectivePrice)}
                                    </span>
                                    {hasDiscount && (
                                      <span className="hg-chat-product-price-old">
                                        {formatPrice(prod.price)}
                                      </span>
                                    )}
                                  </div>

                                  <div className="hg-chat-product-stock">
                                    {inStock ? (
                                      <span className="hg-chat-badge in-stock">Còn {prod.stock}</span>
                                    ) : (
                                      <span className="hg-chat-badge out-of-stock">Tạm hết hàng</span>
                                    )}
                                  </div>

                                  <div className="hg-chat-product-actions">
                                    <Link 
                                      to={`/products/${prod.id}`} 
                                      className="hg-chat-btn-view"
                                      onClick={() => setIsOpen(false)}
                                    >
                                      <Eye size={12} />
                                      <span>Xem chi tiết</span>
                                    </Link>
                                    <button 
                                      type="button"
                                      className="hg-chat-btn-add"
                                      disabled={!inStock}
                                      onClick={(e) => handleAddToCart(prod, e)}
                                      title="Thêm vào giỏ hàng"
                                    >
                                      <ShoppingCart size={13} />
                                      <span>Thêm</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <time className="hg-chat-time" dateTime={new Date(message.timestamp).toISOString()}>
                      {formatTime(message.timestamp)}
                    </time>
                  </div>

                  {message.role === 'user' && (
                    <div className="hg-chat-avatar user">
                      <User size={15} />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="hg-chat-message-row assistant loading">
                  <div className="hg-chat-avatar">
                    <Bot size={15} />
                  </div>
                  <div className="hg-chat-bubble-wrapper">
                    <div className="hg-typing-indicator">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="hg-chat-error" role="alert">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                  <button type="button" className="hg-chat-error-retry" onClick={() => { setError(null); handleSend(input); }}>
                    Thử lại
                  </button>
                </div>
              )}

              {hasSuggestions && (
                <div className="hg-chat-suggestions" role="list" aria-label="Gợi ý câu hỏi nhanh">
                  <div className="hg-chat-suggestions-title">Gợi ý câu hỏi:</div>
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion.label}
                      type="button"
                      className="hg-chat-suggestion"
                      onClick={() => handleSuggestionClick(suggestion)}
                      role="listitem"
                    >
                      <suggestion.icon size={15} />
                      <span>{suggestion.label}</span>
                      <ArrowRight size={13} className="hg-suggestion-arrow" />
                    </button>
                  ))}
                  <button
                    type="button"
                    className="hg-chat-switch-banner"
                    onClick={() => setActiveTab('admin')}
                  >
                    <Headphones size={15} />
                    <span>Cần tư vấn trực tiếp từ nhân viên? <strong>Chat với Admin →</strong></span>
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area AI */}
            <form className="hg-chatbot-input-area" onSubmit={(event) => { event.preventDefault(); handleSend(); }}>
              <div className="hg-chat-input-wrapper">
                <input
                  ref={inputRef}
                  className="hg-chat-input"
                  type="text"
                  maxLength={500}
                  placeholder="Hỏi giá, laptop, máy ảnh hoặc đơn hàng..."
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  disabled={isLoading || !isOpen || isMinimized}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                />
                <button 
                  type="submit" 
                  className="hg-chat-send-btn" 
                  disabled={isLoading || !input.trim() || !isOpen || isMinimized}
                  aria-label="Gửi tin nhắn"
                >
                  {isLoading ? (
                    <Loader2 size={17} className="hg-spin" />
                  ) : (
                    <Send size={17} />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* ── Content: Admin Live Chat Tab ── */
          <>
            <div className="hg-chatbot-messages hg-admin-chat-mode" aria-live="polite" aria-label="Cuộc hội thoại với Admin">
              <div className="hg-chat-admin-intro">
                <div className="hg-chat-admin-intro-icon">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <strong>Kênh hỗ trợ trực tiếp H&G</strong>
                  <p>Gửi câu hỏi hoặc yêu cầu tư vấn, nhân viên hỗ trợ của chúng tôi sẽ phản hồi bạn ngay tại đây.</p>
                </div>
              </div>

              {isAdminLoading && adminMessages.length === 0 ? (
                <div className="hg-chat-loading-state">
                  <Loader2 size={20} className="hg-spin" />
                  <span>Đang kết nối tới bộ phận hỗ trợ...</span>
                </div>
              ) : adminMessages.length === 0 ? (
                <div className="hg-chat-admin-welcome">
                  <Headphones size={36} className="hg-admin-welcome-icon" />
                  <h4>Xin chào {currentUser?.fullName || currentUser?.username || 'quý khách'}!</h4>
                  <p>Shop có thể hỗ trợ gì cho bạn về sản phẩm, chính sách bảo hành hay đơn hàng hôm nay ạ?</p>
                </div>
              ) : (
                adminMessages.map((msg, idx) => {
                  const isAdmin = msg.senderRole === 'ADMIN';
                  return (
                    <div
                      key={msg.id || idx}
                      className={`hg-chat-message-row ${isAdmin ? 'assistant admin-staff' : 'user'}`}
                    >
                      {isAdmin && (
                        <div className="hg-chat-avatar admin-avatar">
                          <ShieldCheck size={14} />
                        </div>
                      )}
                      <div className="hg-chat-bubble-wrapper">
                        {isAdmin && (
                          <span className="hg-chat-role-label">Hỗ trợ viên H&G</span>
                        )}
                        <div className={`hg-chat-bubble ${isAdmin ? 'assistant admin-bubble' : 'user'}`}>
                          <p className="hg-chat-text-line">{msg.content}</p>
                        </div>
                        <time className="hg-chat-time">
                          {formatTime(msg.createdAt || Date.now())}
                        </time>
                      </div>
                      {!isAdmin && (
                        <div className="hg-chat-avatar user">
                          <User size={14} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {isAdminSending && (
                <div className="hg-chat-message-row user loading">
                  <div className="hg-chat-bubble-wrapper">
                    <div className="hg-typing-indicator user-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={adminMessagesEndRef} />
            </div>

            {/* Input Area Admin */}
            <form className="hg-chatbot-input-area" onSubmit={handleSendToAdmin}>
              <div className="hg-chat-input-wrapper">
                <input
                  ref={adminInputRef}
                  className="hg-chat-input"
                  type="text"
                  maxLength={1000}
                  placeholder="Nhập tin nhắn gửi Admin / CSKH..."
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value)}
                  disabled={isAdminSending || !isOpen || isMinimized}
                  autoComplete="off"
                />
                <button 
                  type="submit" 
                  className="hg-chat-send-btn admin-send" 
                  disabled={isAdminSending || !adminInput.trim() || !isOpen || isMinimized}
                  aria-label="Gửi tin nhắn cho admin"
                >
                  {isAdminSending ? (
                    <Loader2 size={17} className="hg-spin" />
                  ) : (
                    <Send size={17} />
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* ── Floating Launcher ── */}
      <button
        className={`hg-chatbot-launcher ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Đóng trợ lý H&G' : 'Mở trợ lý H&G Assistant'}
        aria-expanded={isOpen}
      >
        <span className="hg-launcher-icon">
          {isOpen ? <X size={22} /> : <MessageCircle size={24} />}
        </span>
        <span className="hg-launcher-pulse" aria-hidden="true" />
        <span className="hg-launcher-badge" aria-hidden="true">H&G AI</span>
      </button>
    </section>
  );
}