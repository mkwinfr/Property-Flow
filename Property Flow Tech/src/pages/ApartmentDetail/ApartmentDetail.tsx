import React from "react";

const ApartmentDetailPage: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-100px)] pt-6 pb-28 px-4 md:px-8 bg-[#0f1720]">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-[#E5E9F0] tracking-tight">
              Apartment Detail
            </h1>
            <p className="text-xs md:text-sm text-[#E5E9F0]/60 mt-1">
              View and update unit info, status, and punch details.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-2xl text-xs font-medium bg-[#151d27] text-[#E5E9F0]/80 border border-white/5 shadow-inner">
              History
            </button>
            <button className="px-3 py-1.5 rounded-2xl text-xs font-semibold bg-[#E5E9F0] text-[#151d27] shadow-[0_10px_25px_rgba(0,0,0,0.6)]">
              New Work Order
            </button>
          </div>
        </header>

        {/* Top Info Card */}
        <section className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 p-4 rounded-3xl bg-[#151d27] border border-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[#E5E9F0]/40">
                  Unit
                </p>
                <p className="text-xl font-semibold text-[#E5E9F0]">
                  A1 · 2 Bed / 2 Bath
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-2xl text-[0.7rem] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/40 shadow-inner">
                Ready
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-[#E5E9F0]/70">
              <div>
                <p className="uppercase tracking-[0.16em] text-[0.65rem] text-[#E5E9F0]/40">
                  Target Move-In
                </p>
                <p className="mt-0.5 text-sm text-[#E5E9F0]">Dec 15, 2025</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.16em] text-[0.65rem] text-[#E5E9F0]/40">
                  Turn Status
                </p>
                <p className="mt-0.5 text-sm text-[#E5E9F0]">Complete</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.16em] text-[0.65rem] text-[#E5E9F0]/40">
                  Last Walk
                </p>
                <p className="mt-0.5 text-sm text-[#E5E9F0]">Dec 5, 2025 · 2:14 PM</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.16em] text-[0.65rem] text-[#E5E9F0]/40">
                  Supervisor
                </p>
                <p className="mt-0.5 text-sm text-[#E5E9F0]">M. Winters</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-[#151d27] border border-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.7)] space-y-3 text-xs text-[#E5E9F0]/75">
            <div className="flex items-center justify-between gap-2">
              <p className="uppercase tracking-[0.18em] text-[0.65rem] text-[#E5E9F0]/40">
                Quick Flags
              </p>
              <span className="text-[0.65rem] text-[#E5E9F0]/40">tap to toggle</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Paint", "Carpet", "Appliances", "Damage", "Vendor", "Hold"].map(
                (flag) => (
                  <button
                    key={flag}
                    className="px-3 py-1 rounded-2xl bg-[#0b1018] border border-white/5 text-[0.7rem] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.7)] transition-all"
                  >
                    {flag}
                  </button>
                )
              )}
            </div>
          </div>
        </section>

        {/* Punch & Notes */}
        <section className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <div className="p-4 rounded-3xl bg-[#151d27] border border-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[#E5E9F0]/40">
                  Punch Items
                </p>
                <span className="text-[0.7rem] text-[#E5E9F0]/50">
                  7 of 7 complete
                </span>
              </div>
              <div className="space-y-2">
                {[
                  "Replace fridge seal",
                  "Touch-up paint living room",
                  "Deep clean bathrooms",
                  "Replace 2 blinds",
                  "Test smoke detectors",
                  "Change HVAC filter",
                  "Patch small drywall nick",
                ].map((item) => (
                  <label
                    key={item}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-2xl hover:bg-white/5 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      defaultChecked
                      className="accent-emerald-400 w-3 h-3 rounded"
                    />
                    <span className="text-[#E5E9F0]/80">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-[#151d27] border border-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[#E5E9F0]/40 mb-2">
                Notes
              </p>
              <textarea
                className="w-full min-h-[90px] text-sm rounded-2xl bg-[#0b1018] border border-white/5 text-[#E5E9F0] px-3 py-2 resize-none shadow-inner outline-none focus:ring-2 focus:ring-[#E5E9F0]/15"
                placeholder="Add quick unit notes, vendor info, or walk findings..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-3xl bg-[#151d27] border border-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.7)] text-xs text-[#E5E9F0]/75">
              <p className="text-xs uppercase tracking-[0.18em] text-[#E5E9F0]/40 mb-2">
                Timeline
              </p>
              <ul className="space-y-2">
                <li>
                  <p className="text-[0.7rem] text-[#E5E9F0]/50">Dec 1 · 9:42 AM</p>
                  <p className="text-[0.8rem] text-[#E5E9F0]">Move-out complete</p>
                </li>
                <li>
                  <p className="text-[0.7rem] text-[#E5E9F0]/50">Dec 2 · 11:18 AM</p>
                  <p className="text-[0.8rem] text-[#E5E9F0]">
                    Initial walk and punch created
                  </p>
                </li>
                <li>
                  <p className="text-[0.7rem] text-[#E5E9F0]/50">Dec 4 · 3:06 PM</p>
                  <p className="text-[0.8rem] text-[#E5E9F0]">
                    Vendor carpet clean complete
                  </p>
                </li>
                <li>
                  <p className="text-[0.7rem] text-[#E5E9F0]/50">Dec 5 · 2:14 PM</p>
                  <p className="text-[0.8rem] text-[#E5E9F0]">
                    Final walk – unit marked ready
                  </p>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-3xl bg-[#151d27] border border-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.7)] text-xs text-[#E5E9F0]/75">
              <p className="text-xs uppercase tracking-[0.18em] text-[#E5E9F0]/40 mb-2">
                Quick Actions
              </p>
              <div className="flex flex-col gap-2">
                <button className="w-full px-3 py-2 rounded-2xl text-[0.8rem] font-medium bg-[#E5E9F0] text-[#151d27] shadow-[0_12px_32px_rgba(0,0,0,0.7)]">
                  Mark Turn Complete
                </button>
                <button className="w-full px-3 py-2 rounded-2xl text-[0.8rem] font-medium bg-[#0b1018] text-[#E5E9F0]/85 border border-white/5">
                  Put Unit On Hold
                </button>
                <button className="w-full px-3 py-2 rounded-2xl text-[0.8rem] font-medium bg-[#151d27] text-[#E5E9F0]/75 border border-dashed border-white/12">
                  Attach Photos
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ApartmentDetailPage;
