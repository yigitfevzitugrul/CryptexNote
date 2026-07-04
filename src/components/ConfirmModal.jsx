import React from 'react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText }) {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-icon">🗑️</div>
                <h3 className="modal-title">{title}</h3>
                <p className="modal-message">{message}</p>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={onClose}>
                        {cancelText || 'İptal'}
                    </button>
                    <button className="btn btn-danger" onClick={onConfirm}>
                        {confirmText || 'Sil'}
                    </button>
                </div>
            </div>
        </div>
    );
}
