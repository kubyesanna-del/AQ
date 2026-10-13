import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export const ACTIVE_STATUSES = [
  'pending',
  'accepted',
  'arriving',
  'arrived',
  'started',
  'in_progress',
  'on_trip',
  'ready_for_pickup',
  'driver_assigned',
  'at_store',
  'picked_up',
  'delivered',
];

export const INACTIVE_STATUSES = [
  'completed',
  'cancelled',
  'cancelled_pending_refund',
  'rejected',
  'declined',
  'missed',
  'no_driver_found',
];

type Order = Record<string, any>;

export function routeForOrder(order: Order): string {
  if (Boolean(order.storeId)) {
    if (
      order.status === 'at_store' ||
      order.status === 'picked_up' ||
      order.status === 'delivered' ||
      (order.status === 'driver_assigned' && order.driverStatus === 'assigned')
    ) {
      return '/live-tracking';
    }
    return '/order-tracking';
  }

  return order.status === 'pending' ? '/waiting-for-driver' : '/driver-coming';
}

export function buildTrackingState(order: Order, orderId: string) {
  return {
    orderId,
    orderType: order.orderType || order.serviceType,
    orderData: {
      ...order,
      pickup: order.pickup?.address || order.pickup,
      destination: order.dropoff?.address || order.destination,
      driverId: order.driver?.id || order.driverId,
      driverInfo: order.driver,
      encodedPolyline: order.encodedPolyline,
    },
  };
}

interface ActiveOrderContextValue {
  order: Order | null;
  orderId: string | null;
  stage: string | null;
  isLoading: boolean;
}

const ActiveOrderContext = createContext<ActiveOrderContextValue | undefined>(undefined);

export function ActiveOrderProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', uid),
      where('status', 'in', ACTIVE_STATUSES),
    );

    return onSnapshot(ordersQuery, (snapshot) => {
      const activeOrders = snapshot.docs
        .map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? 0;
          const bTime = b.createdAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        });
      const latestOrder = activeOrders[0] || null;
      setOrder(latestOrder);
      setOrderId(latestOrder?.id || null);
      setIsLoading(false);
    }, () => {
      setOrder(null);
      setOrderId(null);
      setIsLoading(false);
    });
  }, [uid]);

  return (
    <ActiveOrderContext.Provider
      value={{ order, orderId, stage: order ? routeForOrder(order) : null, isLoading }}
    >
      {children}
    </ActiveOrderContext.Provider>
  );
}

export function useActiveOrder(): ActiveOrderContextValue {
  const context = useContext(ActiveOrderContext);
  if (!context) {
    throw new Error('useActiveOrder must be used within an ActiveOrderProvider');
  }
  return context;
}
