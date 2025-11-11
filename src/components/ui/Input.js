import React, { forwardRef } from 'react';

const Input = forwardRef(({ 
  label, 
  error, 
  type = 'text', 
  className = '', 
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  onRightIconClick,
  fullRadius = false,
  ...props 
}, ref) => {
  const hasLeftIcon = LeftIcon;
  const hasRightIcon = RightIcon;
  
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        {hasLeftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted">
            <LeftIcon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={`
            w-full py-3 bg-dark-input border border-dark-border
            text-text-primary placeholder-text-muted
            focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent
            transition-all duration-200
            ${fullRadius ? 'rounded-full' : 'rounded-xl'}
            ${hasLeftIcon ? 'pl-10' : 'pl-4'}
            ${hasRightIcon ? 'pr-10' : 'pr-4'}
            ${error ? 'border-accent-error focus:ring-accent-error' : ''}
            ${className}
          `}
          {...props}
        />
        {hasRightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
          >
            <RightIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-accent-error">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;