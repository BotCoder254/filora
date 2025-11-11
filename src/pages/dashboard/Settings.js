import React from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Bell, Palette, HardDrive } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const Settings = () => {
  const settingSections = [
    {
      title: 'Profile',
      icon: User,
      content: (
        <div className="space-y-4">
          <Input label="Name" defaultValue="John Doe" />
          <Input label="Email" defaultValue="john@example.com" type="email" />
          <Button variant="primary">Save Changes</Button>
        </div>
      )
    },
    {
      title: 'Security',
      icon: Shield,
      content: (
        <div className="space-y-4">
          <Input label="Current Password" type="password" />
          <Input label="New Password" type="password" />
          <Input label="Confirm New Password" type="password" />
          <Button variant="primary">Update Password</Button>
        </div>
      )
    },
    {
      title: 'Notifications',
      icon: Bell,
      content: (
        <div className="space-y-4">
          {[
            'Email notifications for file shares',
            'Upload completion notifications',
            'Storage limit warnings',
            'Security alerts'
          ].map((setting, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-text-primary">{setting}</span>
              <input
                type="checkbox"
                defaultChecked={index < 2}
                className="w-4 h-4 text-accent-primary bg-dark-input border-dark-border rounded focus:ring-accent-primary"
              />
            </div>
          ))}
        </div>
      )
    },
    {
      title: 'Storage',
      icon: HardDrive,
      content: (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-secondary">Used Storage</span>
              <span className="text-text-primary">2.4 GB of 10 GB</span>
            </div>
            <div className="w-full bg-dark-border rounded-full h-2">
              <div className="bg-accent-primary h-2 rounded-full" style={{ width: '24%' }} />
            </div>
          </div>
          <Button variant="secondary">Upgrade Plan</Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        {settingSections.map((section, index) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-dark-surface1 border border-dark-border rounded-xl p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <Icon className="w-6 h-6 text-accent-primary" />
                <h3 className="text-lg font-semibold text-text-primary">{section.title}</h3>
              </div>
              {section.content}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Settings;