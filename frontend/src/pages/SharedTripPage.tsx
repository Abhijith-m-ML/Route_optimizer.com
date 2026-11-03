import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchSharedTrip } from '../services/tripService';
import type { SharedTripData } from '../types';
import { Loader2, Copy, Check } from 'lucide-react';

export const SharedTripPage: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharedData, setSharedData] = useState<SharedTripData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Also support fallback encoded in query param ?trip=
    const searchParams = new URLSearchParams(window.location.search);
    const tripParam = searchParams.get('trip');

    if (!shareId && !tripParam) {
      setError('No share code provided in the link.');
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadTrip = async () => {
      if (shareId && shareId !== 'preview' && shareId !== 'local') {
        const data = await fetchSharedTrip(shareId);
        if (!isMounted) return;
        if (data && Array.isArray(data.stops) && data.stops.length > 0) {
          setSharedData(data);
          setLoading(false);
          return;
        }
      }

      // Check fallback trip param
      if (tripParam) {
        try {
          const binaryStr = atob(tripParam.replace(/-/g, '+').replace(/_/g, '/'));
          const decodedJson = decodeURIComponent(
            binaryStr
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const parsed = JSON.parse(decodedJson);
          if (parsed && Array.isArray(parsed.stops) && parsed.stops.length > 0) {
            setSharedData({
              shareId: shareId || 'local',
              title: parsed.title || 'Shared Trip',
              travelMode: parsed.travelMode || 'DRIVING',
              stops: parsed.stops,
              totalDestinations: parsed.stops.length,
            });
            setLoading(false);
            return;
          }
        } catch {}
      }

      if (isMounted) {
        setError('This shared trip link is invalid, expired, or has been removed.');
        setLoading(false);
      }
    };

    loadTrip();

    return () => {
      isMounted = false;
    };
  }, [shareId]);

  const handleViewSharedTrip = () => {
    if (!sharedData) return;
    // Store in localStorage so DashboardPage automatically activates and reveals the trip
    localStorage.setItem('vazhikatti_pending_shared_trip', JSON.stringify(sharedData));
    navigate('/dashboard');
  };

  const handleCopyLink = () => {
    const currentUrl = window.location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 shadow-xl">
          <Loader2 className="w-6 h-6 text-[#05df72] animate-spin" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">vazhikatti</span>
        <p className="text-xs text-zinc-500 mt-2 font-medium">Loading invitation...</p>
      </div>
    );
  }

  if (error || !sharedData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-[620px] bg-black border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative flex flex-col my-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <span className="text-xl sm:text-2xl font-bold text-white tracking-tight select-none">
              vazhikatti
            </span>
            <span className="inline-flex items-center px-3.5 py-1 sm:px-4 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-wider uppercase text-rose-400 bg-rose-950/60 border border-rose-500/30">
              NOT FOUND
            </span>
          </div>

          {/* Error Card */}
          <div className="bg-[#0c1f38] rounded-2xl p-6 sm:p-8 md:p-10 text-left border border-white/5 shadow-inner">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#7a95b3] mb-2 sm:mb-2.5">
              UNABLE TO LOAD INVITATION
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide mb-3">
              TRIP NOT FOUND
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-7 sm:mb-9">
              {error || 'This shared trip link is invalid, expired, or has been removed.'}
            </p>

            <Link
              to="/dashboard"
              className="w-full bg-white hover:bg-slate-100 active:bg-slate-200 text-[#0c1f38] font-extrabold text-sm sm:text-base py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center tracking-wider uppercase text-center"
            >
              EXPLORE VAZHIKATTI →
            </Link>

            <p className="text-xs sm:text-sm text-[#7a95b3] text-center mt-4 sm:mt-5 font-medium">
              Shared securely through Vazhikatti
            </p>
          </div>

          {/* Bottom Footer Outside the Blue Card */}
          <p className="text-xs sm:text-sm text-zinc-500 text-center mt-5 sm:mt-6 font-normal">
            No external photos · No image API · Responsive design
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6 font-sans selection:bg-indigo-600 selection:text-white">
      {/* Centered Container with thin dark-grey border and rounded corners */}
      <div className="w-full max-w-[620px] bg-black border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative flex flex-col my-auto transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <span className="text-xl sm:text-2xl font-bold text-white tracking-tight select-none">
            vazhikatti
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              title="Copy Short Link"
              aria-label="Copy short link"
              className="text-zinc-400 hover:text-white transition p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-1 text-[11px]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <span className="inline-flex items-center px-3.5 py-1 sm:px-4 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-wider uppercase text-[#05df72] bg-[#032110] border border-[#0a3d20]">
              TRIP INVITATION
            </span>
          </div>
        </div>

        {/* Main Invitation Card with dark navy-blue background */}
        <div className="bg-[#0c1f38] rounded-2xl p-6 sm:p-8 md:p-10 text-left border border-white/5 shadow-inner">
          {/* Small Heading */}
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#7a95b3] mb-2 sm:mb-2.5">
            YOU'VE BEEN INVITED TO EXPLORE
          </p>

          {/* Main Heading */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-wide mb-7 sm:mb-9 leading-tight">
            A SURPRISE TRIP
          </h1>

          {/* Main Button */}
          <button
            type="button"
            onClick={handleViewSharedTrip}
            className="w-full bg-white hover:bg-slate-100 active:bg-slate-200 text-[#0c1f38] font-extrabold text-sm sm:text-base py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center tracking-wider uppercase cursor-pointer"
          >
            VIEW SHARED TRIP →
          </button>

          {/* Footer Inside the Invitation Card */}
          <p className="text-xs sm:text-sm text-[#7a95b3] text-center mt-4 sm:mt-5 font-medium">
            Shared securely through Vazhikatti
          </p>
        </div>

        {/* Bottom Footer Outside the Blue Card */}
        <p className="text-xs sm:text-sm text-zinc-500 text-center mt-5 sm:mt-6 font-normal">
          No external photos · No image API · Responsive design
        </p>

      </div>
    </div>
  );
};
