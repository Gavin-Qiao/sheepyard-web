import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Check, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = 'danger',
    isLoading = false
}) => {
    // Prevent scrolling when modal is open
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const getIcon = () => {
        switch (variant) {
            case 'danger': return <Trash2 className="text-red-500" size={24} />;
            case 'warning': return <AlertTriangle className="text-amber-500" size={24} />;
            case 'info': return <Check className="text-jade-500" size={24} />;
        }
    };

    const getConfirmButtonClass = () => {
         switch (variant) {
            case 'danger': return "bg-red-500 hover:bg-red-600 text-white";
            case 'warning': return "bg-amber-500 hover:bg-amber-600 text-white";
            case 'info': return "bg-jade-600 hover:bg-jade-700 text-white";
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={!isLoading ? onClose : undefined}
                        className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        {/* Modal Content */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white/90 backdrop-blur-md border border-jade-100 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-jade-50">
                                <div className="flex items-center space-x-3">
                                    <div className={cn("p-2 rounded-full",
                                        variant === 'danger' ? "bg-red-50" :
                                        variant === 'warning' ? "bg-amber-50" : "bg-jade-50"
                                    )}>
                                        {getIcon()}
                                    </div>
                                    <h3 className="text-xl font-serif font-bold text-ink">{title}</h3>
                                </div>
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="text-jade-400 hover:text-jade-600 transition-colors p-1 rounded-full hover:bg-jade-50"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6">
                                <p className="text-jade-800/80 leading-relaxed font-sans text-sm">
                                    {message}
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="p-6 pt-0 flex justify-end space-x-3">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-jade-600 hover:bg-jade-50 transition-colors"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={isLoading}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md flex items-center space-x-2",
                                        getConfirmButtonClass(),
                                        isLoading && "opacity-70 cursor-wait"
                                    )}
                                >
                                    {isLoading && <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>}
                                    <span>{confirmText}</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
