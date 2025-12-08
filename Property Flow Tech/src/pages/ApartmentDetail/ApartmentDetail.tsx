// frontend/src/pages/ApartmentDetail/ApartmentDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

type WorkOrderStatus = 'OPEN' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELED';
type OccupancyStatus = 'OCCUPIED' | 'NOTICE' | 'VACANT' | 'DOWN';

interface Property {
  id: number;
  name: string;
  code: string | null;
  address1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

interface WorkOrder {
  id: number;
  summary: string;
  status: WorkOrderStatus;
  type: string;
  priority: string;
  createdAt: string;
}

interface TurnTask {
  id: number;
  title: string;
  status: string;
}

interface Turn {
  id: number;
  status: string;
  type: string;
  moveOutDate: string | null;
  targetReadyDate: string | null;
  actualReadyDate: string | null;
  tasks: TurnTask[];
}

interface Vendor {
  id: number;
  name: string;
}

interface VendorJob {
  id: number;
  status: string;
  scopeOfWork: string;
  vendor: Vendor | null;
}

interface Note {
  id: number;
  body: string;
  createdAt: string;
  createdBy?: {
    id: number;
    name: string;
  } | null;
}

interface ActivityLog {
  id: number;
  type: string;
  message: string;
  createdAt: string;
  user?: {
    id: number;
    name: string;
  } | null;
}

interface ApartmentDetailData {
  id: number;
  unitNumber: string;
  building: string | null;
  beds: number | null;
  baths: number | null;
  status: OccupancyStatus;
  inlineNote: string | null;
  property: Property;
  workOrders: WorkOrder[];
  turns: Turn[];
  vendorJobs: VendorJob[];
  notes: Note[];
  activityLogs: ActivityLog[];
}

const statusColors: Record<OccupancyStatus, string> = {
  OCCUPIED: '#22c55e',
  NOTICE: '#eab308',
  VACANT: '#3b82f6',
  DOWN: '#ef4444',
};

const ApartmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ApartmentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workOrders' | 'turns' | 'vendor' | 'notes' | 'timeline'>('workOrders');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    fetch(`/api/apartments/${id}/detail`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as any).error || 'Failed to load apartment');
        }
        return res.json();
      })
      .then((json: ApartmentDetailData) => {
        setData(json);
      })
      .catch((err: any) => {
        console.error(err);
        setError(err.message || 'Unknown error');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-6 text-slate-200">Loading apartment…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-400">Error: {error}</div>;
  }

  if (!data) {
    return <div className="p-6 text-slate-200">Apartment not found.</div>;
  }

  const statusColor = statusColors[data.status];

  return (
    <div className="p-6 space-y-4 text-slate-100">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm uppercase tracking-wide text-slate-400">
            {data.property?.name}
          </div>
          <h1 className="text-2xl font-semibold">
            Unit {data.unitNumber}{' '}
            {data.building && <span className="text-slate-400">• Bldg {data.building}</span>}
          </h1>
          <div className="text-sm text-slate-400">
            {data.beds ?? '?'} bd • {data.baths ?? '?'} ba • Status:{' '}
            <span style={{ color: statusColor, fontWeight: 500 }}>{data.status}</span>
          </div>
          {data.inlineNote && (
            <div className="mt-1 text-xs text-slate-300 italic">
              {data.inlineNote}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button className="rounded-full px-4 py-2 bg-sky-600 hover:bg-sky-500 text-sm">
            New Work Order
          </button>
          <button className="rounded-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-sm">
            Start Turn
          </button>
        </div>
      </div>

      {/* Quick summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800/60 rounded-xl p-3">
          <div className="text-xs text-slate-400">Open Work Orders</div>
          <div className="text-xl font-semibold">
            {data.workOrders.filter((wo) => wo.status === 'OPEN' || wo.status === 'IN_PROGRESS').length}
          </div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3">
          <div className="text-xs text-slate-400">Turns</div>
          <div className="text-xl font-semibold">{data.turns.length}</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3">
          <div className="text-xs text-slate-400">Vendor Jobs</div>
          <div className="text-xl font-semibold">{data.vendorJobs.length}</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3">
          <div className="text-xs text-slate-400">Notes</div>
          <div className="text-xl font-semibold">{data.notes.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700 flex gap-4 text-sm">
        {(['workOrders', 'turns', 'vendor', 'notes', 'timeline'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setActiveTab(tabKey)}
            className={`pb-2 -mb-px ${
              activeTab === tabKey
                ? 'border-b-2 border-sky-500 text-sky-300'
                : 'border-b-2 border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tabKey === 'workOrders' && 'Work Orders'}
            {tabKey === 'turns' && 'Turns'}
            {tabKey === 'vendor' && 'Vendor Jobs'}
            {tabKey === 'notes' && 'Notes'}
            {tabKey === 'timeline' && 'Timeline'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-2">
        {activeTab === 'workOrders' && (
          <div className="space-y-2">
            {data.workOrders.length === 0 && (
              <div className="text-sm text-slate-400">No work orders for this unit yet.</div>
            )}
            {data.workOrders.map((wo) => (
              <div
                key={wo.id}
                className="bg-slate-800/60 rounded-xl p-3 flex justify-between items-center"
              >
                <div>
                  <div className="font-medium text-sm">{wo.summary}</div>
                  <div className="text-xs text-slate-400">
                    {wo.type} • {wo.priority} • {new Date(wo.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-200">
                  {wo.status}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'turns' && (
          <div className="space-y-2">
            {data.turns.length === 0 && (
              <div className="text-sm text-slate-400">No turns recorded for this unit yet.</div>
            )}
            {data.turns.map((turn) => (
              <div key={turn.id} className="bg-slate-800/60 rounded-xl p-3 space-y-1">
                <div className="flex justify-between items-center">
                  <div className="font-medium text-sm">
                    {turn.type} • {turn.status}
                  </div>
                  <div className="text-xs text-slate-400">
                    Target:{' '}
                    {turn.targetReadyDate
                      ? new Date(turn.targetReadyDate).toLocaleDateString()
                      : 'n/a'}
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  Tasks:{' '}
                  {turn.tasks.length === 0
                    ? 'No tasks'
                    : turn.tasks.map((t) => t.title).join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'vendor' && (
          <div className="space-y-2">
            {data.vendorJobs.length === 0 && (
              <div className="text-sm text-slate-400">No vendor jobs for this unit yet.</div>
            )}
            {data.vendorJobs.map((job) => (
              <div key={job.id} className="bg-slate-800/60 rounded-xl p-3">
                <div className="flex justify-between items-center">
                  <div className="font-medium text-sm">
                    {job.vendor?.name || 'Vendor'} • {job.status}
                  </div>
                </div>
                <div className="text-xs text-slate-400 mt-1">{job.scopeOfWork}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-2">
            {data.notes.length === 0 && (
              <div className="text-sm text-slate-400">No notes for this unit yet.</div>
            )}
            {data.notes.map((note) => (
              <div key={note.id} className="bg-slate-800/60 rounded-xl p-3">
                <div className="text-xs text-slate-400 mb-1">
                  {note.createdBy ? note.createdBy.name : 'Unknown'} •{' '}
                  {new Date(note.createdAt).toLocaleString()}
                </div>
                <div className="text-sm">{note.body}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-2">
            {data.activityLogs.length === 0 && (
              <div className="text-sm text-slate-400">No activity logged for this unit yet.</div>
            )}
            {data.activityLogs.map((log) => (
              <div key={log.id} className="bg-slate-800/60 rounded-xl p-3">
                <div className="text-xs text-slate-400 mb-1">
                  {new Date(log.createdAt).toLocaleString()} • {log.type}{' '}
                  {log.user ? `• ${log.user.name}` : ''}
                </div>
                <div className="text-sm">{log.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApartmentDetail;
