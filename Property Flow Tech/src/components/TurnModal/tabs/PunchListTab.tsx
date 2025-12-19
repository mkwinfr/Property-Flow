import React, { useState, useMemo } from 'react';
import type {
  Turn,
  PunchListItem,
  InventoryItem,
} from '@/types/turn-management';
import { PunchListItemStatus, WorkCategory } from '@/types/turn-management';
import { punchTemplate } from '@/data/punchTemplates';
import './PunchListTab.css';

interface PunchListTabProps {
  turn: Turn;
}

// Generate template-based punch list items for a unit based on bed/bath count
function generatePunchListFromTemplate(turn: Turn): PunchListItem[] {
  const beds = turn.apartment?.beds || turn.apartment?.floorPlan?.bedrooms || 1;
  const baths = turn.apartment?.baths || turn.apartment?.floorPlan?.bathrooms || 1;
  
  // Filter areas based on bed/bath count
  const filteredTemplate = punchTemplate.filter((area) => {
    // Skip spare bedroom/bathroom areas for 1 bed/1 bath units
    if (beds === 1 && baths === 1) {
      return !area.area.toLowerCase().includes('spare');
    }
    return true;
  });

  // Flatten template to items
  const items: PunchListItem[] = [];
  let itemId = 1;

  filteredTemplate.forEach((area) => {
    area.categories.forEach((category) => {
      category.items.forEach((templateItem) => {
        items.push({
          id: itemId++,
          turnId: turn.id,
          templateKey: templateItem.templateKey,
          label: templateItem.title,
          category: category.category,
          area: area.area,
          status: PunchListItemStatus.OPEN,
          inventoryUsages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
    });
  });

  return items;
}

const PunchListTab: React.FC<PunchListTabProps> = ({ turn }) => {
  // Use saved items if they exist, otherwise generate from template
  const initialItems = useMemo(() => {
    if (turn.punchListItems && turn.punchListItems.length > 0) {
      return turn.punchListItems;
    }
    return generatePunchListFromTemplate(turn);
  }, [turn]);

  const [items, setItems] = useState<PunchListItem[]>(initialItems);
  const [editingItem, setEditingItem] = useState<PunchListItem | null>(null);
  const [showInventoryPicker, setShowInventoryPicker] = useState<number | null>(null);
  const [inventoryItems] = useState<InventoryItem[]>([
    // Mock data for now - will be fetched from API later
    { id: 1, name: 'Paint - Interior', sku: 'PAINT-INT', category: 'PAINT', unitCost: 45, tags: ['paint', 'interior'], quantity: 10, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 2, name: 'Toilet - Standard', sku: 'TOILET-STD', category: 'APPLIANCES', unitCost: 120, tags: ['toilet', 'plumbing'], quantity: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WorkCategory | 'ALL'>('ALL');
  
  // Filter states
  const [filterRoom, setFilterRoom] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  
  // Collapsed rooms state
  const [collapsedRooms, setCollapsedRooms] = useState<Set<string>>(new Set());

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

  // Toggle room collapse
  const toggleRoomCollapse = (room: string) => {
    setCollapsedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(room)) {
        next.delete(room);
      } else {
        next.add(room);
      }
      return next;
    });
  };

  // Handle item edit
  const handleEditItem = (item: PunchListItem) => {
    setEditingItem({ ...item });
  };

  // Handle save edited item
  const handleSaveEdit = () => {
    if (!editingItem) return;
    setItems((prev) =>
      prev.map((item) => (item.id === editingItem.id ? editingItem : item))
    );
    setEditingItem(null);
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
    
    // Apply filters first
    const filteredItems = items.filter((item) => {
      if (filterRoom !== 'ALL' && item.area !== filterRoom) return false;
      if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
      if (filterCategory !== 'ALL' && item.category !== filterCategory) return false;
      return true;
    });
    
    filteredItems.forEach((item) => {
      const area = item.area || 'General';
      if (!grouped[area]) grouped[area] = [];
      grouped[area].push(item);
    });
    return grouped;
  }, [items, filterRoom, filterStatus, filterCategory]);

  // Get all unique rooms for filter
  const allRooms = useMemo(() => {
    const rooms = new Set<string>();
    items.forEach((item) => rooms.add(item.area || 'General'));
    return Array.from(rooms).sort();
  }, [items]);

  // Get all unique categories for filter
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    items.forEach((item) => categories.add(item.category));
    return Array.from(categories).sort();
  }, [items]);

  // Check if all items in a room are complete
  const isRoomComplete = (room: string): boolean => {
    const roomItems = items.filter((item) => (item.area || 'General') === room);
    return roomItems.length > 0 && roomItems.every((item) => item.status === PunchListItemStatus.COMPLETE);
  };

  // Calculate overall progress
  const completedCount = items.filter((i) => i.status === PunchListItemStatus.COMPLETE).length;
  const completionPercentage = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="punch-list-tab">
      {/* Filters Section */}
      <div className="punch-list-filters">
        <select
          value={filterRoom}
          onChange={(e) => setFilterRoom(e.target.value)}
          className="filter-select"
        >
          <option value="ALL">All Rooms</option>
          {allRooms.map((room) => (
            <option key={room} value={room}>
              {room}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="ALL">All Status</option>
          <option value={PunchListItemStatus.OPEN}>Unchecked</option>
          <option value={PunchListItemStatus.IN_PROGRESS}>Needs Review</option>
          <option value={PunchListItemStatus.COMPLETE}>Completed</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="filter-select"
        >
          <option value="ALL">All Categories</option>
          {allCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Items by Area */}
      <div className="punch-list-items">
        {Object.entries(itemsByArea).map(([area, areaItems]) => (
          <div key={area} className="punch-list-area">
            <button
              className="area-title-button"
              onClick={() => toggleRoomCollapse(area)}
            >
              <span className="area-collapse-icon">
                {collapsedRooms.has(area) ? '▶' : '▼'}
              </span>
              <h4 className="area-title">{area}</h4>
              {isRoomComplete(area) && <span className="room-complete-check">✓</span>}
            </button>

            {!collapsedRooms.has(area) && (
              <div className="area-items">
                {areaItems.map((item) => (
                  <div
                    key={item.id}
                    className={`punch-list-item ${item.status.toLowerCase()}`}
                    onClick={() => handleEditItem(item)}
                  >
                    {/* Item Header */}
                    <div className="item-header">
                      <span
                        className="item-checkbox"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.status === PunchListItemStatus.COMPLETE ? '✓' : '○'}
                      </span>
                      <span className="item-label">{item.label}</span>
                      <span className="item-category">{item.category}</span>
                    </div>

                    {/* Notes Preview */}
                    {item.notes && (
                      <div className="item-notes-preview">
                        <span className="notes-label">Notes:</span>
                        <span className="notes-text">{item.notes}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="empty-state">
          <p>No punch list items yet</p>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="edit-modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>{editingItem.label}</h3>
              <button className="modal-close" onClick={() => setEditingItem(null)}>
                ✕
              </button>
            </div>

            <div className="edit-modal-body">
              {/* Status Dropdown */}
              <div className="form-group">
                <label>Status</label>
                <select
                  value={editingItem.status}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, status: e.target.value as PunchListItemStatus })
                  }
                  className="form-input"
                >
                  <option value={PunchListItemStatus.OPEN}>Unchecked</option>
                  <option value={PunchListItemStatus.IN_PROGRESS}>Needs Review</option>
                  <option value={PunchListItemStatus.COMPLETE}>Completed</option>
                </select>
              </div>

              {/* Materials Checkbox */}
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={(editingItem.inventoryUsages?.length ?? 0) > 0 || showInventoryPicker === editingItem.id}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setShowInventoryPicker(editingItem.id);
                      } else {
                        setShowInventoryPicker(null);
                        setEditingItem({ ...editingItem, inventoryUsages: [] });
                      }
                    }}
                  />
                  Show Materials
                </label>
              </div>

              {/* Materials Section (conditional) */}
              {((editingItem.inventoryUsages?.length ?? 0) > 0 || showInventoryPicker === editingItem.id) && (
                <div className="materials-section">
                  {editingItem.inventoryUsages && editingItem.inventoryUsages.length > 0 && (
                    <div className="item-materials">
                      {editingItem.inventoryUsages.map((usage) => (
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
                              onChange={(e) => {
                                const updated = editingItem.inventoryUsages?.map((u) =>
                                  u.id === usage.id ? { ...u, quantityUsed: parseInt(e.target.value) } : u
                                );
                                setEditingItem({ ...editingItem, inventoryUsages: updated });
                              }}
                              className="quantity-input"
                            />
                            <span className="unit">×</span>
                          </div>
                          <div className="material-cost">
                            ${((usage.costOverride ?? usage.unitCost) * usage.quantityUsed).toFixed(2)}
                          </div>
                          <button
                            className="remove-material"
                            onClick={() => {
                              const updated = editingItem.inventoryUsages?.filter((u) => u.id !== usage.id);
                              setEditingItem({ ...editingItem, inventoryUsages: updated });
                            }}
                            title="Remove material"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {showInventoryPicker === editingItem.id && (
                    <div className="inventory-picker-inline">
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
                              const newUsage = {
                                id: Date.now(),
                                punchListItemId: editingItem.id,
                                inventoryItemId: inv.id,
                                quantityUsed: 1,
                                unitCost: inv.unitCost,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                inventoryItem: inv,
                              };
                              setEditingItem({
                                ...editingItem,
                                inventoryUsages: [...(editingItem.inventoryUsages || []), newUsage],
                              });
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
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  className="form-textarea"
                  placeholder="Add notes..."
                  rows={4}
                />
              </div>
            </div>

            <div className="edit-modal-footer">
              <button className="btn-cancel" onClick={() => setEditingItem(null)}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleSaveEdit}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PunchListTab;
