import React from 'react';

const BUTTON_VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  success: 'btn-success',
  warning: 'btn-warning',
  error: 'btn-error',
  ghost: 'btn-ghost',
  link: 'btn-link'
};

const BUTTON_SIZES = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg'
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  type = 'button',
  onClick,
  title,
  ...props
}) {
  const variantClass = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const sizeClass = BUTTON_SIZES[size] || BUTTON_SIZES.md;

  const handleClick = (e) => {
    if (loading || disabled) return;
    onClick?.(e);
  };

  return (
    <button
      type={type}
      className={`btn ${variantClass} ${sizeClass} ${fullWidth ? 'btn-full' : ''} ${loading ? 'btn-loading' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={handleClick}
      title={title}
      {...props}
    >
      {loading && <span className="btn-spinner">⏳</span>}
      {!loading && icon && iconPosition === 'left' && <span className="btn-icon-wrapper">{icon}</span>}
      {children && <span className="btn-text">{children}</span>}
      {!loading && icon && iconPosition === 'right' && <span className="btn-icon-wrapper">{icon}</span>}
    </button>
  );
}

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  className = '',
  title,
  ...props
}) {
  return (
    <Button
      variant={variant}
      size={size}
      className={`btn-icon-only ${className}`}
      title={title}
      {...props}
    >
      {icon}
    </Button>
  );
}

export function ButtonGroup({ children, className = '' }) {
  return (
    <div className={`btn-group ${className}`}>
      {children}
    </div>
  );
}

export default Button;
