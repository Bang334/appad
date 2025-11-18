import { useState } from 'react';

export const useSuccessModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({
    title: '',
    message: '',
    icon: 'checkmark-circle',
  });

  const showSuccess = (title, message, icon = 'checkmark-circle') => {
    setModalData({ title, message, icon });
    setShowModal(true);
  };

  const showError = (title, message) => {
    setModalData({ title, message, icon: 'alert-circle' });
    setShowModal(true);
  };

  const hideModal = () => {
    setShowModal(false);
  };

  return {
    showModal,
    modalData,
    showSuccess,
    showError,
    hideModal,
  };
};
