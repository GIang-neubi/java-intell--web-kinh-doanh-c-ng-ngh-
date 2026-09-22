import { useEffect } from 'react';
import { useToast } from './Toast';

export default function Toast({ message, type = 'success', duration = 3000 }) {
  const { showToast } = useToast();

  useEffect(() => {
    showToast(message, type, duration);
  }, [message, type, duration, showToast]);

  return null;
}

export function SuccessToast({ message, duration }) {
  return <Toast message={message} type="success" duration={duration} />;
}

export function ErrorToast({ message, duration }) {
  return <Toast message={message} type="error" duration={duration} />;
}

export function InfoToast({ message, duration }) {
  return <Toast message={message} type="info" duration={duration} />;
}
