import React, { useEffect, useRef } from 'react';
import Icon from './Icon';

// Onay penceresi. Varsayılan: silme onayı (çöp kutusu ikonu, kırmızı onay butonu).
// İsteğe bağlı üçüncü seçenek: secondaryText + onSecondary (ör. "Kaydetmeden çık").
export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    icon = 'trash',
    tone = 'danger',
    confirmVariant = 'danger',
    secondaryText,
    onSecondary,
}) {
    const cancelRef = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // Açılınca odağı güvenli butona taşı, Esc ile kapat
    useEffect(() => {
        if (!isOpen) return;
        const previouslyFocused = document.activeElement;
        cancelRef.current?.focus();
        const handleKey = (e) => {
            if (e.key === 'Escape') onCloseRef.current?.();
        };
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('keydown', handleKey);
            if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className="modal-card"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-modal-title"
                aria-describedby="confirm-modal-message"
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-icon" data-tone={tone}>
                    <Icon name={icon} size={20} />
                </div>
                <h3 className="modal-title" id="confirm-modal-title">{title}</h3>
                <p className="modal-message" id="confirm-modal-message">{message}</p>
                <div className="modal-actions">
                    <button
                        ref={cancelRef}
                        type="button"
                        className={`btn ${secondaryText ? 'btn-ghost' : 'btn-secondary'}`}
                        onClick={onClose}
                    >
                        {cancelText || 'İptal'}
                    </button>
                    {secondaryText && onSecondary && (
                        <button type="button" className="btn btn-danger" onClick={onSecondary}>
                            {secondaryText}
                        </button>
                    )}
                    <button type="button" className={`btn btn-${confirmVariant}`} onClick={onConfirm}>
                        {icon === 'trash' && <Icon name="trash" size={15} />}
                        {confirmText || 'Sil'}
                    </button>
                </div>
            </div>
        </div>
    );
}
