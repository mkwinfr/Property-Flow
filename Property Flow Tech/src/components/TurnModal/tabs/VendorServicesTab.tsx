import React, { useState } from 'react';
import type { Turn } from '@/types/turn-management';

interface VendorServicesTabProps {
  turn: Turn;
}

const VendorServicesTab: React.FC<VendorServicesTabProps> = () => {
  const [vendorServices] = useState<any[]>([]);

  return (
    <div className="vendor-tab">
      <div className="vendor-services">
        <h3>Vendor Services</h3>
        
        <div className="service-types">
          <button className="service-type-btn">
            <span>🏗️</span> Flooring
          </button>
          <button className="service-type-btn">
            <span>🧹</span> Cleaning
          </button>
          <button className="service-type-btn">
            <span>🔧</span> Other Service
          </button>
        </div>

        {vendorServices.length === 0 ? (
          <div className="empty-state">
            <p>No vendor services added yet</p>
            <p className="hint">Click above to add services</p>
          </div>
        ) : (
          <div className="services-list">
            {vendorServices.map((service, idx) => (
              <div key={idx} className="service-item">
                <span>{service.type}</span>
                <span>${service.cost}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorServicesTab;
