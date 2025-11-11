import React from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

const LoginForm = ({ onSubmit, loading, error, onSwitchToSignup }) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">Welcome back</h2>
        <p className="text-text-secondary mt-2">Sign in to your account</p>
      </div>

      {error && (
        <div className="p-3 bg-accent-error/10 border border-accent-error/20 rounded-lg">
          <p className="text-accent-error text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          {...register('password', { required: 'Password is required' })}
          error={errors.password?.message}
          placeholder="Enter your password"
        />

        <Button type="submit" loading={loading} fullRadius className="w-full">
          Sign In
        </Button>
      </form>

      <div className="text-center">
        <p className="text-text-secondary">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToSignup}
            className="text-accent-primary hover:text-accent-primary/80 font-medium"
          >
            Sign up
          </button>
        </p>
      </div>
    </motion.div>
  );
};

export default LoginForm;