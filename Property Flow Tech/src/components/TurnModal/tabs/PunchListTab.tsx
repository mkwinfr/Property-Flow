import React, { useState, useMemo } from 'react';
import type {
  Turn,
  PunchListItem,
  InventoryItem,
} from '@/types/turn-management';
import { PunchListItemStatus, WorkCategory } from '@/types/turn-management';
import './PunchListTab.css';

interface PunchListTabProps {
  turn: Turn;
}

const PunchListTab: React.FC<PunchListTabProps> = ({ turn }) => {
  const [items, setItems] = useState<PunchListItem[]>(turn.punchListItems || []);
  const [showInventoryPicker, setShowInventoryPicker] = useState<number | null>(null);
  const [inventoryItems] = useState<InventoryItem[]>([
    // Mock data for now - will be fetched from API later
    { id: 1, name: 'Paint - Interior', sku: 'PAINT-INT', category: 'PAINT', unitCost: 45, tags: ['paint', 'interior'], quantity: 10, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 2, name: 'Toilet - Standard', sku: 'TOILET-STD', category: 'APPLIANCES', unitCost: 120, tags: ['toilet', 'plumbing'], quantity: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WorkCategory | 'ALL'>('ALL');

  // Filter inventory based on search and category
  const filteredInventory = useMemo(() => {
    return inventoryItems.filter((item: InventoryItem) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'ALL' ||
        item.category === selectedCategory ||
        item.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch && matchesCategory;
    });
  }, [inventoryItems, searchQuery, selectedCategory]);

  // Handle item status toggle
  const handleToggleStatus = (itemId: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status:
                item.status === PunchListItemStatus.OPEN
                  ? PunchListItemStatus.COMPLETE
                  : PunchListItemStatus.OPEN,
            }
          : item
      )
    );
  };

  // Handle add inventory to punch item
  const handleAddInventory = (itemId: number, inventoryId: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              inventoryUsages: [
                ...(item.inventoryUsages || []),
                {
                  id: Date.now(),
                  punchListItemId: itemId,
                  inventoryItemId: inventoryId,
                  quantityUsed: 1,
                  unitCost:
                    inventoryItems.find((inv) => inv.id === inventoryId)?.unitCost || 0,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  inventoryItem: inventoryItems.find((inv) => inv.id === inventoryId),
                },
              ],
            }
          : item
      )
    );
  };

  // Handle remove inventory from punch item
  const handleRemoveInventory = (itemId: number, usageId: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              inventoryUsages: (item.inventoryUsages || []).filter(
                (usage) => usage.id !== usageId
              ),
            }
          : item
      )
    );
  };

  // Handle quantity change
  const handleQuantityChange = (itemId: number, usageId: number, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              inventoryUsages: (item.inventoryUsages || []).map((usage) =>
                usage.id === usageId ? { ...usage, quantityUsed: quantity } : usage
              ),
            }
          : item
      )
    );
  };

  // Calculate total materials cost for an item
  const calculateItemMaterialsCost = (item: PunchListItem): number => {
    return (
      item.inventoryUsages?.reduce((sum, usage) => {
        const unitCost = usage.costOverride ?? usage.unitCost;
        return sum + unitCost * usage.quantityUsed;
      }, 0) || 0
    );
  };

  // Group items by area
  const itemsByArea = useMemo(() => {
    const grouped: Record<string, PunchListItem[]> = {};
    items.forEach((item) => {
      const area = item.area || 'General';
      if (!grouped[area]) grouped[area] = [];
      grouped[area].push(item);
    });
    return grouped;
  }, [items]);

  // Calculate overall progress
  const completedCount = items.filter((i) => i.status === PunchListItemStatus.COMPLETE).length;
  const completionPercentage = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="punch-list-tab">
      {/* Progress Bar */}
      <div className="punch-list-progress">
        <div className="progress-info">
          <span className="progress-label">Completion</span>
          <span className="progress-percentage">{completionPercentage}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${completionPercentage}%` }} />
        </div>
        <span className="progress-count">
          {completedCount} of {items.length} items
        </span>
      </div>

      {/* Items by Area */}
      <div className="punch-list-items">
        {Object.entries(itemsByArea).map(([area, areaItems]) => (
          <div key={area} className="punch-list-area">
            <h4 className="area-title">{area}</h4>

            {areaItems.map((item) => (
              <div key={item.id} className={`punch-list-item ${item.status.toLowerCase()}`}>
                {/* Item Header */}
                <div className="item-header">
                  <button
                    className="item-checkbox"
                    onClick={() => handleToggleStatus(item.id)}
                    title={item.status === PunchListItemStatus.OPEN ? 'Mark complete' : 'Mark open'}
                  >
                    {item.status === PunchListItemStatus.COMPLETE ? '✓' : '○'}
                  </button>
                  <span className="item-label">{item.label}</span>
                  <span className="item-category">{item.category}</span>
                </div>

                {/* Item Materials */}
                {item.inventoryUsages && item.inventoryUsages.length > 0 && (
                  <div className="item-materials">
                    {item.inventoryUsages.map((usage) => (
                      <div key={usage.id} className="material-item">
                        <div className="material-info">
                          <span className="material-name">{usage.inventoryItem?.name}</span>
                          <span className="material-sku">SKU: {usage.inventoryItem?.sku}</span>
                        </div>
                        <div className="material-quantity">
                          <input
                            type="number"
                            min="1"
                            value={usage.quantityUsed}
                            onChange={(e) =>
                              handleQuantityChange(item.id, usage.id, parseInt(e.target.value))
                            }
                            className="quantity-input"
                          />
                          <span className="unit">×</span>
                        </div>
                        <div className="material-cost">
                          ${((usage.costOverride ?? usage.unitCost) * usage.quantityUsed).toFixed(2)}
                        </div>
                        <button
                          className="remove-material"
                          onClick={() => handleRemoveInventory(item.id, usage.id)}
                          title="Remove material"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <div className="material-total">
                      <span>Subtotal:</span>
                      <span className="total-cost">${calculateItemMaterialsCost(item).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Add Materials Button */}
                {item.status === PunchListItemStatus.OPEN && (
                  <button
                    className="add-materials-btn"
                    onClick={() => setShowInventoryPicker(item.id)}
                  >
                    + Add Materials
                  </button>
                )}

                {/* Inventory Picker */}
                {showInventoryPicker === item.id && (
                  <div className="inventory-picker">
                    <div className="picker-controls">
                      <input
                        type="text"
                        placeholder="Search parts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                      />
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value as any)}
                        className="category-select"
                      >
                        <option value="ALL">All Categories</option>
                        {Object.values(WorkCategory).map((cat) => (
                          <option key={cat} value={cat}>
                            {cat.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="picker-results">
                      {filteredInventory.map((inv: InventoryItem) => (
                        <button
                          key={inv.id}
                          className="inventory-item-btn"
                          onClick={() => {
                            handleAddInventory(item.id, inv.id);
                            setShowInventoryPicker(null);
                            setSearchQuery('');
                          }}
                        >
                          <div className="inv-name">{inv.name}</div>
                          <div className="inv-sku">{inv.sku}</div>
                          <div className="inv-cost">${inv.unitCost.toFixed(2)}</div>
                        </button>
                      ))}
                    </div>

                    <button
                      className="picker-close"
                      onClick={() => setShowInventoryPicker(null)}
                    >
                      Close
                    </button>
                  </div>
                )}

                {/* Item Notes */}
                {item.notes && (
                  <div className="item-notes">
                    <span className="notes-label">Notes:</span>
                    <span className="notes-text">{item.notes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="empty-state">
          <p>No punch list items yet</p>
        </div>
      )}
    </div>
  );
};

export default PunchListTab;
