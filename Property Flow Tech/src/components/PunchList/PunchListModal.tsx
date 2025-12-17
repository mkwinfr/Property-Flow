import React, { useState, useMemo, useCallback } from 'react';
import { X } from 'lucide-react';
import { punchTemplate } from '@/data/punchTemplates';
import type { PunchItem, PunchItemStatus, PunchTemplateItem, FilterState } from '@/types/punch-list';
import '@/styles/punch-list-modal.css';

interface PunchListModalProps {
  isOpen: boolean;
  onClose: () => void;
  turnId?: number;
  apartmentNumber: string;
  floorPlan?: 'Floor Plan A' | 'Floor Plan B' | 'Floor Plan C';
}

interface RenderedTemplateItem extends PunchTemplateItem {
  status: PunchItemStatus;
  notes?: string;
  assignedTo?: string;
  hasInstance: boolean;
  instanceId?: string;
  priority: 'Low' | 'Medium' | 'High';
  completedAt?: string;
  isCustom?: boolean;
}

export const PunchListModal: React.FC<PunchListModalProps> = ({
  isOpen,
  onClose,
  turnId,
  apartmentNumber,
  floorPlan = 'Floor Plan A',
}) => {
  const [punchItems, setPunchItems] = useState<Map<string, PunchItem>>(new Map());
  const [filters, setFilters] = useState<FilterState>({});

  // Get template items
  const flatTemplate = useMemo(() => {
    const flat: PunchTemplateItem[] = [];
    punchTemplate.forEach((area) => {
      area.categories.forEach((category) => {
        category.items.forEach((item) => {
          flat.push({
            templateKey: item.templateKey,
            title: item.title,
            area: area.area,
            category: category.category,
          });
        });
      });
    });
    return flat;
  }, []);

  const areaOptions = useMemo(() => {
    const areas = new Set<string>(punchTemplate.map((area) => area.area));
    return Array.from(areas).sort();
  }, []);

  const templatedItems = useMemo<RenderedTemplateItem[]>(() => {
    return flatTemplate.map((template) => {
      const existing = punchItems.get(template.templateKey);
      const status = (existing?.status as PunchItemStatus) || 'Open';
      const notes = existing?.notes?.trim();
      const assignedTo = existing?.assignedTo?.trim();

      return {
        ...template,
        status,
        notes: notes || undefined,
        assignedTo: assignedTo || undefined,
        hasInstance: Boolean(existing),
        instanceId: existing?.id,
        priority: existing?.priority || 'Medium',
        completedAt: existing?.completedAt,
      };
    });
  }, [flatTemplate, punchItems]);

  const filteredItems = useMemo(() => {
    return templatedItems.filter((item) => {
      if (filters.area && item.area !== filters.area) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.priority && item.priority !== filters.priority) return false;
      if (
        filters.assignedTo &&
        !(item.assignedTo || '').toLowerCase().includes(filters.assignedTo.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [filters, templatedItems]);

  const groupedItems = useMemo(() => {
    const grouped: Record<string, Record<string, RenderedTemplateItem[]>> = {};

    filteredItems.forEach((item) => {
      if (!grouped[item.area]) {
        grouped[item.area] = {};
      }
      if (!grouped[item.area][item.category]) {
        grouped[item.area][item.category] = [];
      }
      grouped[item.area][item.category].push(item);
    });

    return grouped;
  }, [filteredItems]);

  const handleToggleStatus = useCallback((item: RenderedTemplateItem) => {
    const newStatus: PunchItemStatus = item.status === 'Open' ? 'Complete' : 'Open';
    const newItem: PunchItem = {
      id: item.instanceId || `new-${item.templateKey}`,
      punchListId: `turn-${turnId}`,
      templateKey: item.templateKey,
      title: item.title,
      area: item.area,
      category: item.category,
      status: newStatus,
      priority: item.priority,
      notes: item.notes,
      assignedTo: item.assignedTo,
      completedAt: newStatus === 'Complete' ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPunchItems((prev) => new Map(prev).set(item.templateKey, newItem));
  }, [turnId]);

  if (!isOpen) return null;

  const completedCount = templatedItems.filter((item) => item.status === 'Complete').length;
  const totalCount = templatedItems.length;
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="punch-list-modal-overlay" onClick={onClose}>
      <div className="punch-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="punch-list-modal-header">
          <div>
            <h2>Punch List - Apt {apartmentNumber}</h2>
            <p className="punch-list-modal-subtitle">{floorPlan}</p>
          </div>
          <button className="punch-list-modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="punch-list-modal-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${percentComplete}%` }}></div>
          </div>
          <p className="progress-text">
            {completedCount} of {totalCount} items complete ({percentComplete}%)
          </p>
        </div>

        <div className="punch-list-modal-filters">
          <select
            value={filters.area || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                area: e.target.value || undefined,
              }))
            }
            className="filter-select"
          >
            <option value="">All Rooms</option>
            {areaOptions.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          <select
            value={filters.status || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                status: (e.target.value as PunchItemStatus) || undefined,
              }))
            }
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="Complete">Complete</option>
          </select>

          {Object.keys(filters).length > 0 && (
            <button
              onClick={() => setFilters({})}
              className="filter-clear"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="punch-list-modal-content">
          {Object.entries(groupedItems).length === 0 ? (
            <div className="punch-list-empty">
              <p>No items to display</p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([area, categories]) => (
              <div key={area} className="punch-list-area">
                <h3 className="punch-list-area-title">{area}</h3>
                {Object.entries(categories).map(([category, items]) => (
                  <div key={`${area}-${category}`} className="punch-list-category">
                    <h4 className="punch-list-category-title">{category}</h4>
                    <div className="punch-list-items">
                      {items.map((item) => (
                        <div
                          key={item.templateKey}
                          className={`punch-list-item ${item.status === 'Complete' ? 'complete' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={item.status === 'Complete'}
                            onChange={() => handleToggleStatus(item)}
                            className="punch-item-checkbox"
                          />
                          <span className="punch-item-label">{item.title}</span>
                          {item.notes && <span className="punch-item-notes">📝</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="punch-list-modal-footer">
          <button onClick={onClose} className="btn-close">
            Close Punch List
          </button>
        </div>
      </div>
    </div>
  );
};
