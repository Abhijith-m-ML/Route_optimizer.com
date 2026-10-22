import React, { useState, useRef } from 'react';
import { 
  Search, 
  Upload, 
  X, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  Sparkles, 
  MapPin, 
  CheckCircle, 
  Star, 
  ExternalLink, 
  Plus, 
  Check,
  Video
} from 'lucide-react';
import { 
  analyzeInstagramReel, 
  candidateToDestination, 
  type CandidatePlace, 
  type ReelAnalysisResult 
} from '../../services/ipfService';
import type { Destination } from '../../types';

interface IPFViewProps {
  onAddStopToTrip?: (destination: Destination) => void;
}

export const IPFView: React.FC<IPFViewProps> = ({ onAddStopToTrip }) => {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [showSupplementary, setShowSupplementary] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ReelAnalysisResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidatePlace | null>(null);
  const [addedPlaces, setAddedPlaces] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        setValidationError(null);
      }
    } catch {
      // Ignore clipboard restrictions
    }
  };

  const handleQuickSample = (sampleUrl: string, sampleCaption: string) => {
    setUrl(sampleUrl);
    setCaption(sampleCaption);
    setShowSupplementary(true);
    setValidationError(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).slice(0, 4 - images.length).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setValidationError('Please enter an Instagram Reel link.');
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);
    setSelectedCandidate(null);
    setValidationError(null);

    try {
      const res = await analyzeInstagramReel(
        url.trim(),
        caption.trim() || undefined,
        description.trim() || undefined,
        images.length > 0 ? images : undefined
      );
      setAnalysisResult(res);
      if (res.candidate_places.length > 0) {
        setSelectedCandidate(res.candidate_places[0]);
      }
    } catch (err: any) {
      setValidationError(err.message || 'Analysis failed. Please check the URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToItinerary = (candidate: CandidatePlace) => {
    if (!onAddStopToTrip) return;
    const dest = candidateToDestination(candidate);
    onAddStopToTrip(dest);
    setAddedPlaces((prev) => [...prev, candidate.name]);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Hero Header */}
      <div className="py-6 px-4 sm:px-6 text-center border-b border-slate-800/80 bg-slate-900/60 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-teal-500/10 blur-3xl pointer-events-none rounded-full" />
        
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>IPF • Instagram Place Finder</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Discover Places <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">Hidden in Reels</span>
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
          Turn your Instagram inspiration into real-world destinations.
        </p>

        {/* Quick sample chips */}
        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Quick Demo Samples:</span>
          <button
            type="button"
            onClick={() => handleQuickSample(
              'https://www.instagram.com/reel/C8qXyz901/',
              'Sunday morning iced latte at Subko Coffee Roasters! Best bakehouse in Bandra #mumbaicafe #subkocoffee'
            )}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-teal-300 border border-teal-500/30 transition text-[11px] font-semibold"
          >
            ☕ Subko Coffee Reel
          </button>
          <button
            type="button"
            onClick={() => handleQuickSample(
              'https://www.instagram.com/reel/C5pAbc102/',
              'Late night peaceful vibes at Marine Drive watching the waves #mumbai #marinedrive #queensnecklace'
            )}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition text-[11px] font-semibold"
          >
            🌊 Marine Drive Reel
          </button>
          <button
            type="button"
            onClick={() => handleQuickSample(
              'https://www.instagram.com/reel/C3mDef203/',
              'Gateway of India at sunrise! Iconic heritage monument in Colaba #gatewayofindia #colaba'
            )}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-blue-300 border border-blue-500/30 transition text-[11px] font-semibold"
          >
            🏛️ Gateway of India Reel
          </button>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <form onSubmit={handleAnalyze} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Instagram Reel URL
            </label>
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-400">
                <Video className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setValidationError(null);
                }}
                placeholder="https://www.instagram.com/reel/C8qXyz.../"
                className={`w-full bg-slate-950/80 text-sm text-slate-100 placeholder-slate-500 rounded-2xl pl-11 pr-24 py-3 border transition focus:outline-none focus:ring-2 ${
                  validationError 
                    ? 'border-rose-500/80 focus:ring-rose-500/40' 
                    : 'border-slate-700/80 focus:border-teal-500 focus:ring-teal-500/30'
                }`}
                disabled={isLoading}
              />
              <div className="absolute inset-y-0 right-1.5 flex items-center space-x-1">
                {url && (
                  <button
                    type="button"
                    onClick={() => setUrl('')}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePaste}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl border border-slate-700"
                >
                  Paste
                </button>
              </div>
            </div>

            {validationError && (
              <p className="mt-2 text-xs text-rose-400 flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{validationError}</span>
              </p>
            )}
          </div>

          {/* Supplementary Clues Toggle */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowSupplementary(!showSupplementary)}
              className="flex items-center justify-between w-full text-xs font-semibold text-slate-300 hover:text-teal-300 transition py-1"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-400" />
                <span>Supplementary Clues & Screenshots (Recommended for restricted/private Reels)</span>
                {images.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px]">
                    {images.length} image{images.length > 1 ? 's' : ''}
                  </span>
                )}
              </span>
              {showSupplementary ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showSupplementary && (
              <div className="mt-3.5 space-y-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-850">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Caption or Hashtags
                  </label>
                  <textarea
                    rows={2}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Paste caption e.g. Sunday coffee at Subko! #mumbaicafe #bandra"
                    className="w-full bg-slate-900 text-xs text-slate-100 placeholder-slate-500 rounded-xl p-3 border border-slate-800 focus:outline-none focus:border-teal-500"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Visible Landmark Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Vintage stone arch, sea waves, yellow coffee signage"
                    className="w-full bg-slate-900 text-xs text-slate-100 placeholder-slate-500 rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-teal-500"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Upload Screenshots from Reel (Up to 4)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {images.map((imgSrc, index) => (
                      <div key={index} className="relative group rounded-xl overflow-hidden aspect-video border border-slate-700 bg-slate-900">
                        <img src={imgSrc} alt="Screenshot" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                          className="absolute top-1.5 right-1.5 bg-rose-600/90 text-white p-1 rounded-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {images.length < 4 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700/80 hover:border-teal-500/80 rounded-xl aspect-video bg-slate-900/60 p-2 text-center group transition"
                      >
                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-teal-400" />
                        <span className="mt-1 text-[11px] text-slate-400 group-hover:text-slate-200">
                          Add Image
                        </span>
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="mt-5">
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 active:scale-[0.99] text-slate-950 py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base shadow-xl shadow-teal-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin" />
                  <span>Analyzing Reel & Places...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 text-slate-950" />
                  <span>Analyze Reel</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Results Section */}
        {analysisResult && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Status notification */}
            <div className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 shadow-lg ${
              analysisResult.success
                ? 'bg-slate-900/90 border-teal-500/30 text-slate-200'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            }`}>
              {analysisResult.success ? (
                <CheckCircle className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-sm text-white mb-0.5">
                  {analysisResult.success ? 'Location Identified' : 'Action Required'}
                </div>
                <div>{analysisResult.message}</div>
              </div>
            </div>

            {/* Candidate Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysisResult.candidate_places.map((candidate, idx) => {
                const verified = candidate.verified_place;
                const isSelected = selectedCandidate?.name === candidate.name;
                const isAlreadyAdded = addedPlaces.includes(candidate.name);

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedCandidate(candidate)}
                    className={`p-5 rounded-3xl border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-teal-400 ring-2 ring-teal-500/30 shadow-xl'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-white tracking-tight">
                            {candidate.name}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                          <span>{verified?.formatted_address || candidate.city_or_region}</span>
                        </p>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {candidate.confidence} Confidence
                      </span>
                    </div>

                    {/* Evidence & Reasoning */}
                    <div className="mt-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-850 text-xs text-slate-300">
                      <div className="flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-white">
                            {candidate.is_ai_hypothesis ? 'AI Hypothesis: ' : 'Extracted Evidence: '}
                          </span>
                          {candidate.evidence}
                        </div>
                      </div>
                      {candidate.ambiguity_note && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          {candidate.ambiguity_note}
                        </p>
                      )}
                    </div>

                    {/* Verified Details & Add to Trip */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      {verified?.rating ? (
                        <div className="flex items-center gap-1 text-xs text-amber-300 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{verified.rating}</span>
                          <span className="text-slate-500 font-normal">
                            ({verified.user_ratings_total?.toLocaleString()} reviews)
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">{candidate.category}</span>
                      )}

                      <div className="flex items-center gap-2">
                        {verified?.google_maps_url && (
                          <a
                            href={verified.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
                            title="Open Google Maps"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {onAddStopToTrip && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToItinerary(candidate);
                            }}
                            disabled={isAlreadyAdded}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                              isAlreadyAdded
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20 active:scale-95'
                            }`}
                          >
                            {isAlreadyAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add to Itinerary</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
