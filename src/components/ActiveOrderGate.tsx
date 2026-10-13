import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildTrackingState, useActiveOrder } from '../hooks/useActiveOrder';

export function ActiveOrderGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { order, orderId, stage, isLoading } = useActiveOrder();

  useEffect(() => {
    if (isLoading || !order || !orderId || !stage) return;

    const pathname = location.pathname;
    const allowed =
      pathname === stage ||
      pathname === '/what-went-wrong' ||
      ['/login', '/signup', '/register', '/forgot-password', '/reset-password'].includes(pathname) ||
      (pathname === '/your-route' &&
        location.state?.editMode === true &&
        location.state?.orderId === orderId);

    if (!allowed) {
      navigate(stage, {
        replace: true,
        state: buildTrackingState(order, orderId),
      });
    }
  }, [isLoading, order, orderId, stage, location.pathname, location.state, navigate]);

  return null;
}
