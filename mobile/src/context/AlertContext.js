import React, { createContext, useContext, useState } from 'react';
import CustomAlertModal from '../components/Common/CustomAlertModal';

const AlertContext = createContext();

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'success',
    buttons: [],
    showBalance: false,
    balance: 0,
    icon: null,
  });

  const showAlert = (config) => {
    setAlert({
      visible: true,
      title: config.title || '',
      message: config.message || '',
      type: config.type || 'success',
      buttons: config.buttons || [{ text: 'OK', onPress: () => {} }],
      showBalance: config.showBalance || false,
      balance: config.balance || 0,
      icon: config.icon || null,
    });
  };

  const showSuccess = (title, message, options = {}) => {
    showAlert({
      title,
      message,
      type: 'success',
      ...options,
    });
  };

  const showError = (title, message, options = {}) => {
    showAlert({
      title,
      message,
      type: 'error',
      ...options,
    });
  };

  const showInfo = (title, message, options = {}) => {
    showAlert({
      title,
      message,
      type: 'info',
      ...options,
    });
  };

  const showWarning = (title, message, options = {}) => {
    showAlert({
      title,
      message,
      type: 'warning',
      ...options,
    });
  };

  const showPurchaseSuccess = (message, balance, onClose) => {
    showAlert({
      title: 'Thành công',
      message,
      type: 'success',
      showBalance: true,
      balance,
      buttons: [
        {
          text: 'OK',
          onPress: onClose || (() => {}),
        },
      ],
    });
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, visible: false }));
  };

  return (
    <AlertContext.Provider
      value={{
        showAlert,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        showPurchaseSuccess,
        hideAlert,
      }}
    >
      {children}
      <CustomAlertModal
        visible={alert.visible}
        onClose={hideAlert}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        buttons={alert.buttons}
        showBalance={alert.showBalance}
        balance={alert.balance}
        icon={alert.icon}
      />
    </AlertContext.Provider>
  );
};

