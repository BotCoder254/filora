import React from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Check, X, Mail, Lock, User } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

const SignupForm = ({ onSubmit, loading, error, onSwitchToLogin }) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  
  const password = watch('password', '');
  
  const passwordStrength = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  };

  const strengthScore = Object.values(passwordStrength).filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">Create account</h2>
        <p className="text-text-secondary mt-2">Get started with Filora</p>
      </div>

      {error && (
        <div className="p-3 bg-accent-error/10 border border-accent-error/20 rounded-lg">
          <p className="text-accent-error text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Name (Optional)"
          leftIcon={User}
          fullRadius
          {...register('name')}
          placeholder="Enter your name"
        />

        <Input
          label="Email"
          type="email"
          leftIcon={Mail}
          fullRadius
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
          error={errors.email?.message}
          placeholder="Enter your email"
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          leftIcon={Lock}
          rightIcon={showPassword ? EyeOff : Eye}
          onRightIconClick={() => setShowPassword(!showPassword)}
          fullRadius
          {...register('password', { 
            required: 'Password is required',
            minLength: {
              value: 8,
              message: 'Password must be at least 8 characters'
            }
          })}
          error={errors.password?.message}
          placeholder="Create a password"
        />

        {password && (
          <div className="space-y-2">
            <div className="flex space-x-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded ${
                    i <= strengthScore ? 'bg-accent-success' : 'bg-dark-border'
                  }`}
                />
              ))}
            </div>
            <div className="space-y-1 text-xs">
              {Object.entries({
                'At least 8 characters': passwordStrength.length,
                'Uppercase letter': passwordStrength.uppercase,
                'Lowercase letter': passwordStrength.lowercase,
                'Number': passwordStrength.number,
              }).map(([requirement, met]) => (
                <div key={requirement} className="flex items-center space-x-2">
                  {met ? (
                    <Check className="w-3 h-3 text-accent-success" />
                  ) : (
                    <X className="w-3 h-3 text-text-muted" />
                  )}
                  <span className={met ? 'text-accent-success' : 'text-text-muted'}>
                    {requirement}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Input
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          leftIcon={Lock}
          rightIcon={showConfirmPassword ? EyeOff : Eye}
          onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
          fullRadius
          {...register('password_confirm', { 
            required: 'Please confirm your password',
            validate: value => value === password || 'Passwords do not match'
          })}
          error={errors.password_confirm?.message}
          placeholder="Confirm your password"
        />

        <Button type="submit" loading={loading} fullRadius className="w-full">
          Create Account
        </Button>
      </form>

      <div className="text-center">
        <p className="text-text-secondary">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-accent-primary hover:text-accent-primary/80 font-medium"
          >
            Sign in
          </button>
        </p>
      </div>
    </motion.div>
  );
};

export default SignupForm;