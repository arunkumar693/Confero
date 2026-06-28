import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({
  children,
  onClick,
  variant = 'primary', // 'primary' | 'outline' | 'ghost'
  type = 'button',
  fullWidth = false,
  loading = false,
  disabled = false,
  className = '',
  icon: Icon = null,
}) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5',
    outline:
      'border border-white/10 hover:border-purple-500/50 hover:bg-white/5 text-white',
    ghost:
      'text-white/70 hover:text-white hover:bg-white/10',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          {Icon && <Icon className="w-5 h-5" />}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
