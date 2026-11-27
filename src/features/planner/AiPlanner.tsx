import { useEffect, useState, type FormEvent } from 'react';
import { Bot, CheckCircle2, ChevronLeft, ChevronRight, Clock, Compass, Lightbulb, Map, MapPin, Send, Sparkles } from 'lucide-react';
import type { Listing } from '../../types';
import { handleImageError } from '../../types';
import { api } from '../../shared/api/api';
import AiChat from './AiChat';

/**
 * Restored from src/components/AiPlanner.tsx at 5372888^: header
 * "GBBookings AI Companion" with the "Active Gemini" badge (the demo's
 * "ACTIVE GEMINI 2.5" wording was never in history), the demo defaults
 * (Hunza Valley, Elite Luxury, PKR 150,000, 5 days, 2 travellers, the preset
 * interests), the "Generate My Dream Itinerary" button, the "Your Personal
 * Travel Blueprint" empty state, the Route Map / Day-by-Day tabs and the
 * sector route visualizer (SECTOR_ROUTES below, copied verbatim — static
 * presentation data, not live inventory).
 *
 * Adaptation (no API change): the old file called POST /api/ai-planner, which
 * no longer exists. Generation now goes through the current trip assistant —
 * AiChat → api.tripChat → POST /api/v1/ai/chat — with the same form values
 * composed into the prompt. The old markdown renderer for the /api/ai-planner
 * response is therefore not restored; the assistant's reply renders in AiChat.
 * Recommendations come from the live catalogue (api.getListingsPage) instead
 * of the deleted src/data INITIAL_LISTINGS.
 */

interface RouteStop {
  name: string;
  elevation: string;
  description: string;
  transitTime: string;
  tip: string;
}

interface SectorRoute {
  title: string;
  distance: string;
  bestTime: string;
  type: string;
  stops: RouteStop[];
}

const SECTOR_ROUTES: Record<string, SectorRoute> = {
  'Hunza Valley': {
    title: 'Karakoram Highway Alpine Route',
    distance: '~110 km (Karimabad Base)',
    bestTime: 'May to October',
    type: 'Scenic Mountain Drive & Lakes',
    stops: [
      { name: 'Gilgit / Rakaposhi View', elevation: '2,012m', description: 'Spectacular viewpoint of 7,788m peak, traditional breakfast spot.', transitTime: '1.5 hrs drive to Karimabad', tip: 'Try the fresh local apricot juice at the roadside cafe.' },
      { name: 'Karimabad (Hunza Base)', elevation: '2,438m', description: 'Explore historical Baltit & Altit Forts, walking cobblestone streets.', transitTime: '45 mins drive to Attabad', tip: 'Order the famous Walnut Cake at Cafe de Hunza.' },
      { name: 'Attabad Turquoise Lake', elevation: '2,559m', description: 'Formed in 2010. Outstanding deep-blue waters, boating, and speed jets.', transitTime: '30 mins drive to Passu', tip: 'Take a boat ride; the reflection of Karakoram peaks is majestic.' },
      { name: 'Passu Cathedral Cones', elevation: '2,400m', description: 'Scenic needle peaks, Hussaini Suspension Bridge, and Borith Lake.', transitTime: '2 hrs drive to Khunjerab Pass', tip: 'Stop at Yak Grill for premium gourmet Yak burgers.' },
      { name: 'Khunjerab Border Pass', elevation: '4,693m', description: "World's highest paved national border crossing into China.", transitTime: 'Return to Karimabad Base', tip: 'Bring a warm jacket; temperatures can drop below freezing even in summer.' },
    ],
  },
  'Skardu Plains': {
    title: 'Indus Gorge & Deosai Plains Route',
    distance: '~150 km Loop',
    bestTime: 'June to September',
    type: 'High Altitude Desert & Lakes',
    stops: [
      { name: 'Kachura Valley & Shangrila', elevation: '2,500m', description: 'Famous heart-shaped Shangrila Resort lake and deep blue Upper Kachura Lake.', transitTime: '1 hr drive to Skardu City', tip: 'Take a local boat to explore the hidden corner of Upper Kachura.' },
      { name: 'Skardu Capital', elevation: '2,230m', description: 'Trek to historical Kharpocho Fort overlooking the Indus River.', transitTime: '45 mins drive to Shigar Valley', tip: 'Shop for authentic gems and organic Hunza cherries at the central bazaar.' },
      { name: 'Shigar Valley & Sand Dunes', elevation: '2,300m', description: 'Restored 400-year-old Shigar Fort, cold desert sand safari.', transitTime: '2.5 hrs drive to Deosai Plains', tip: 'Try tea at the fort orchards; the woodwork and architecture are stunning.' },
      { name: 'Deosai National Plains', elevation: '4,114m', description: 'Land of Giants, pristine grasslands, and high altitude Sheosar Lake.', transitTime: 'Return to Skardu Base', tip: 'Do not stay past sunset unless camping with professional guides.' },
    ],
  },
  'Swat Valley': {
    title: 'Swat Motorway & Kalam Alpine Route',
    distance: '~180 km',
    bestTime: 'Year-round (Winters for snow)',
    type: 'Lush Green Valleys & Rivers',
    stops: [
      { name: 'Mingora / Saidu Sharif', elevation: '984m', description: 'Central hub, ancient Buddhist heritage sites, White Palace of Marghazar.', transitTime: '2 hrs drive to Kalam', tip: 'Savor traditional trout fish at Riverside cafes.' },
      { name: 'Kalam Valley Center', elevation: '2,001m', description: 'Beautiful forest town alongside Swat River with cool breeze.', transitTime: '1.5 hrs to Ushu Forest', tip: 'Take a morning walk by the riverside to see the mist rise.' },
      { name: 'Ushu Pine Forest', elevation: '2,300m', description: 'Densely packed ancient pines, gorgeous green canopy, waterfalls.', transitTime: '2 hrs drive to Mahodand', tip: 'Stop at the forest-clearing stalls for fresh kettle-boiled Peshawari Kahwa.' },
      { name: 'Mahodand Glacier Lake', elevation: '2,865m', description: 'Surrounded by wild meadows, massive waterfalls, and grazing horses.', transitTime: 'Return to Kalam Base', tip: 'Go horse-riding or rent a small wooden boat across the lake.' },
    ],
  },
  'Islamabad Capital': {
    title: 'Margalla Foothills & Cultural Route',
    distance: '~45 km',
    bestTime: 'October to April',
    type: 'Urban Greenery & Ridge Views',
    stops: [
      { name: 'Faisal Mosque Landmark', elevation: '540m', description: 'Iconic Turkish-influenced architecture with the Margalla Hills backdrop.', transitTime: '20 mins drive to Saidpur', tip: 'Best visited at sunset to see the marble light up.' },
      { name: 'Saidpur Ancient Village', elevation: '600m', description: 'Historic village showcasing Hindu, Sikh, and Mughal heritage.', transitTime: '30 mins drive to Monal Ridge', tip: 'Enjoy clay-pot chicken handi at Des Pardes under historical arches.' },
      { name: 'Monal Ridge Viewpoint', elevation: '1,150m', description: 'Top-tier winding drive to panoramic views of the entire Islamabad capital.', transitTime: '40 mins drive to Rawal Lake', tip: 'Keep an eye out for wild monkeys on the tree canopies.' },
      { name: 'Rawal Lake & Wetlands', elevation: '510m', description: 'Serene lake park with migratory birds, boating, and blooming gardens.', transitTime: 'End of Urban Tour', tip: 'Rent a private paddleboat at sunset for perfect reflections.' },
    ],
  },
  'Lahore Walled City': {
    title: 'Mughal Empire Heritage Route',
    distance: '~15 km Loop',
    bestTime: 'November to March',
    type: 'Historical Cultural Tour',
    stops: [
      { name: 'Delhi Gate & Shahi Hammam', elevation: '217m', description: 'Historic entrance to Walled City, beautifully restored 17th-century bath house.', transitTime: '15 mins walk to Wazir Khan', tip: 'Hire a local certified Walled City guide at the gate.' },
      { name: 'Wazir Khan Mosque', elevation: '217m', description: 'Famous for its outstanding Persian mosaic tilework and frescoes.', transitTime: '20 mins rickshaw ride to Fort', tip: 'Climb the minaret with permission for a view over the narrow lanes.' },
      { name: 'Lahore Fort & Badshahi', elevation: '220m', description: 'UNESCO World Heritage Lahore Fort, Sheesh Mahal, and grand Badshahi Mosque.', transitTime: '10 mins walk to Food Street', tip: 'Take photos in the central red-stone courtyard at golden hour.' },
      { name: 'Fort Road Food Street', elevation: '225m', description: 'Gourmet dining on rooftops of converted historic havelis looking onto the mosque.', transitTime: 'End of Lahore Heritage Tour', tip: 'Book a table on the top deck of Haveli Restaurant for the best view.' },
    ],
  },
};

const LOADER_MESSAGES = [
  'Establishing connection with GBBookings AI Node...',
  'Analyzing real-time road accessibility in Gilgit-Baltistan...',
  'Evaluating premium hotel vacancies in Karimabad...',
  'Mapping fuel costs and mountain Prado routing schedules...',
  'Translating regional Balti & Hunza hospitality customs...',
  'Finalizing pristine, luxury itinerary format...',
];

const DESTINATIONS = [
  ['Hunza Valley', 'Hunza Valley (Lakes & Peaks)'],
  ['Skardu Plains', 'Skardu & Deosai plains'],
  ['Swat Valley', 'Swat & Kalam Alpine'],
  ['Islamabad Capital', 'Islamabad & Margalla Hills'],
  ['Lahore Walled City', 'Lahore Cultural Heritage'],
] as const;

export default function AiPlanner({ onSelectListing }: { onSelectListing: (listing: Listing) => void }) {
  const [destination, setDestination] = useState('Hunza Valley');
  const [budgetTier, setBudgetTier] = useState('Elite Luxury');
  const [budgetAmount, setBudgetAmount] = useState('150000');
  const [duration, setDuration] = useState('5');
  const [travelers, setTravelers] = useState('2');
  const [interests, setInterests] = useState('Hiking, Lake views, Historical forts, Local Balti cuisine');

  const [generating, setGenerating] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADER_MESSAGES[0]);
  const [request, setRequest] = useState<{ text: string; sequence: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'route' | 'details'>('route');
  const [selectedStopIdx, setSelectedStopIdx] = useState(0);
  const [recommendations, setRecommendations] = useState<Listing[]>([]);

  useEffect(() => {
    if (!generating) return undefined;
    let index = 0;
    setLoadingMsg(LOADER_MESSAGES[0]);
    const interval = setInterval(() => {
      index = (index + 1) % LOADER_MESSAGES.length;
      setLoadingMsg(LOADER_MESSAGES[index]);
    }, 1500);
    return () => clearInterval(interval);
  }, [generating]);

  // Live catalogue recommendations for the chosen destination (replaces the
  // deleted INITIAL_LISTINGS the old file filtered).
  useEffect(() => {
    if (!request) return undefined;
    let active = true;
    const term = destination.split(' ')[0];
    api.getListingsPage({ type: 'all', search: term })
      .then((result) => { if (active) setRecommendations(result.data.slice(0, 2)); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [request, destination]);

  const generate = (event: FormEvent) => {
    event.preventDefault();
    if (generating) return;
    setGenerating(true);
    setActiveTab('route');
    setSelectedStopIdx(0);
    const text = `Plan a ${duration}-day trip to ${destination} for ${travelers} travelers. Travel style: ${budgetTier}.${budgetAmount ? ` Total budget: PKR ${budgetAmount}.` : ''}${interests.trim() ? ` Interests: ${interests.trim()}.` : ''} Give me a practical day-by-day itinerary and suggest suitable listings from the current catalogue. Use only actual catalogue prices and availability; tell me when something needs confirming.`;
    setRequest((previous) => ({ text, sequence: (previous?.sequence ?? 0) + 1 }));
  };

  const currentRoute = SECTOR_ROUTES[destination] ?? SECTOR_ROUTES['Hunza Valley'];
  const field = 'w-full min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-[#006F3C] focus:bg-white';

  return (
    <div id="ai-planner-view" className="space-y-8 pb-16">
      {/* Intro Header — restored from history, badge reads "Active Gemini". */}
      <div className="flex items-center space-x-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
          <Bot className="w-6 h-6 text-indigo-600" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#0F172A] uppercase tracking-tight flex flex-wrap items-center gap-2">
            <span>GBBookings AI Companion</span>
            <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Active Gemini</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Let our localized travel intelligence build a luxury travel map of Pakistan in seconds.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="ai-planner-main-grid">
        {/* Left Form Panel */}
        <aside className="lg:col-span-4" id="ai-planner-form-sidebar">
          <form onSubmit={generate} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs" id="form-itinerary-inputs">
            <h3 className="text-xs font-bold uppercase text-[#0F172A] border-b border-slate-100 pb-2.5 flex items-center gap-1.5 tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Specify Trip Vectors
            </h3>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="ai-dest">Target Sector</label>
              <select
                id="ai-dest"
                value={destination}
                onChange={(e) => { setDestination(e.target.value); setSelectedStopIdx(0); }}
                className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0F172A] focus:bg-white cursor-pointer"
              >
                {DESTINATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Budget Mode</label>
              <div className="grid grid-cols-3 gap-1.5" id="ai-budget-tiers">
                {['Economy', 'Business', 'Elite Luxury'].map((b) => (
                  <button
                    type="button"
                    key={b}
                    id={`btn-ai-budget-${b}`}
                    onClick={() => {
                      setBudgetTier(b);
                      setBudgetAmount(b === 'Economy' ? '45000' : b === 'Business' ? '90000' : '180000');
                    }}
                    className={`min-h-[42px] py-2 px-1 rounded-xl text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer truncate ${
                      budgetTier === b
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-600 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="ai-budget-amount">Total Budget (PKR)</label>
              <input
                type="number"
                id="ai-budget-amount"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                className={`${field} font-mono`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="ai-duration">Duration (Days)</label>
                <select
                  id="ai-duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0F172A] focus:bg-white cursor-pointer"
                >
                  {[3, 4, 5, 6, 7, 10].map((d) => <option key={d} value={d}>{d} Days</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="ai-travelers">Travelers</label>
                <select
                  id="ai-travelers"
                  value={travelers}
                  onChange={(e) => setTravelers(e.target.value)}
                  className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0F172A] focus:bg-white cursor-pointer"
                >
                  {[1, 2, 4, 6, 8, 12].map((t) => <option key={t} value={t}>{t} {t === 1 ? 'Person' : 'People'}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="ai-interests">Personalized Interests</label>
              <textarea
                id="ai-interests"
                rows={3}
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g. Stargazing in dunes, historic forts walk, balti apricot soup, shopping authentic gems..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0F172A] focus:bg-white resize-none"
              />
            </div>

            <button
              type="submit"
              id="btn-ai-generate-blueprint"
              disabled={generating}
              className="w-full min-h-[46px] bg-[#0F172A] hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl shadow-xs transition-all text-xs sm:text-sm flex items-center justify-center space-x-2 cursor-pointer uppercase tracking-wider disabled:opacity-60"
            >
              <Send className="w-4 h-4 stroke-[2.25]" />
              <span>{generating ? 'Synthesizing...' : 'Generate My Dream Itinerary'}</span>
            </button>
          </form>
        </aside>

        {/* Right Output Panel */}
        <main className="lg:col-span-8 flex flex-col justify-between" id="ai-planner-output-panel">
          <div className="bg-white rounded-xl border border-slate-200 p-6 flex-1 shadow-xs overflow-y-auto max-h-[580px]" id="itinerary-output-box">
            {!request ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-24 space-y-4" id="itinerary-empty-state">
                <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 shadow-xs">
                  <Bot className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <h4 className="font-bold text-[#0F172A] uppercase tracking-tight">Your Personal Travel Blueprint</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed font-medium">
                    Specify your destination and budget on the left, then click Generate to create an elite, day-by-day travel plan.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-fadeIn" id="itinerary-formatted-result">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-[#006F3C] bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-lg max-w-max uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-[#006F3C]" />
                    <span>Itinerary & Map Ready</span>
                  </div>
                  <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/40" id="itinerary-tab-selectors">
                    <button
                      type="button"
                      id="tab-btn-route"
                      onClick={() => setActiveTab('route')}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'route' ? 'bg-white text-[#006F3C] shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <Map className="w-3.5 h-3.5" />
                      <span>Route Map</span>
                    </button>
                    <button
                      type="button"
                      id="tab-btn-details"
                      onClick={() => setActiveTab('details')}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'details' ? 'bg-white text-[#006F3C] shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Day-by-Day</span>
                    </button>
                  </div>
                </div>

                {generating && (
                  <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 p-4 rounded-xl animate-pulse" id="itinerary-loading-spinner">
                    <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin shrink-0" />
                    <div>
                      <h5 className="font-extrabold text-[11px] text-[#0F172A] uppercase tracking-wider">AI Blueprint Synthesizer</h5>
                      <p className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider mt-0.5">{loadingMsg}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'route' ? (
                  <div className="space-y-6 animate-fadeIn" id="itinerary-route-visualizer">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-left">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Route Corridor</span>
                        <h5 className="text-xs font-extrabold text-slate-800 line-clamp-1">{currentRoute.title}</h5>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Est. Distance</span>
                        <h5 className="text-xs font-extrabold text-[#006F3C]">{currentRoute.distance}</h5>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Prime Months</span>
                        <h5 className="text-xs font-extrabold text-slate-800">{currentRoute.bestTime}</h5>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Adventure Type</span>
                        <h5 className="text-xs font-extrabold text-slate-800 line-clamp-1">{currentRoute.type}</h5>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 text-left">
                        <Compass className="w-3.5 h-3.5 text-[#006F3C]" />
                        <span>Interactive Pathway & Stops (Click step to preview)</span>
                      </h4>

                      <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2 px-4 py-6 bg-emerald-50/15 border border-emerald-100/30 rounded-2xl overflow-hidden">
                        {currentRoute.stops.map((stop, sIdx) => {
                          const isSelected = selectedStopIdx === sIdx;
                          return (
                            <div key={sIdx} className="flex flex-col md:flex-row items-center gap-4 md:gap-2 w-full md:w-auto">
                              {sIdx > 0 && (
                                <>
                                  <div className="hidden md:block flex-1 h-0.5 border-t-2 border-dashed border-emerald-300 relative mx-1 min-w-6">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-1 text-[11px] font-bold text-emerald-600">➔</div>
                                  </div>
                                  <div className="md:hidden w-0.5 h-5 border-l-2 border-dashed border-emerald-300 relative my-0.5">
                                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 text-xs font-black">▼</span>
                                  </div>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedStopIdx(sIdx)}
                                className={`z-10 relative flex flex-col items-center p-3 rounded-xl transition-all cursor-pointer text-center max-w-[150px] w-full border ${
                                  isSelected
                                    ? 'bg-[#006F3C] border-[#005C32] text-white shadow-md shadow-emerald-800/10 scale-105'
                                    : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-600 hover:border-slate-300'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? 'bg-white text-[#006F3C]' : 'bg-slate-100 text-slate-500'}`}>
                                  {sIdx + 1}
                                </div>
                                <span className="text-[11px] font-extrabold mt-2 tracking-tight line-clamp-1 w-full">{stop.name.split('/')[0].split('(')[0].trim()}</span>
                                <span className={`text-[9px] font-mono mt-0.5 px-1.5 py-0.5 rounded font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-400'}`}>{stop.elevation}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {currentRoute.stops[selectedStopIdx] && (
                        <div className="bg-slate-50/50 border border-slate-200/80 p-5 rounded-2xl space-y-4 animate-fadeIn text-left">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-200/60 pb-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[9px] uppercase px-2 py-0.5 rounded">
                                  Checkpoint {selectedStopIdx + 1} of {currentRoute.stops.length}
                                </span>
                                <span className="bg-slate-100 text-slate-600 font-mono text-[9px] px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                                  Altitude: {currentRoute.stops[selectedStopIdx].elevation}
                                </span>
                              </div>
                              <h4 className="text-base font-extrabold text-slate-800">
                                {currentRoute.stops[selectedStopIdx].name}
                              </h4>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-mono self-start">
                              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>{currentRoute.stops[selectedStopIdx].transitTime}</span>
                            </div>
                          </div>
                          <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-semibold">
                            {currentRoute.stops[selectedStopIdx].description}
                          </p>
                          <div className="bg-[#006F3C]/5 border border-[#006F3C]/10 p-3.5 rounded-xl flex items-start gap-2.5 text-left">
                            <Lightbulb className="w-4 h-4 text-[#006F3C] shrink-0 mt-0.5 animate-pulse" />
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#006F3C]">Local Operations Tip</span>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                {currentRoute.stops[selectedStopIdx].tip}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1 gap-2">
                            <button
                              type="button"
                              disabled={selectedStopIdx === 0}
                              onClick={() => setSelectedStopIdx((prev) => Math.max(0, prev - 1))}
                              className="bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 min-h-[44px]"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              <span>Previous</span>
                            </button>
                            <button
                              type="button"
                              disabled={selectedStopIdx === currentRoute.stops.length - 1}
                              onClick={() => setSelectedStopIdx((prev) => Math.min(currentRoute.stops.length - 1, prev + 1))}
                              className="bg-[#006F3C] hover:bg-[#005C32] disabled:opacity-40 disabled:hover:bg-[#006F3C] text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-[#006F3C] transition-all cursor-pointer flex items-center gap-1.5 shadow-xs min-h-[44px]"
                            >
                              <span>Next Stop</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="min-h-[420px]">
                    <AiChat
                      key={request.sequence}
                      embedded
                      initialPrompt={request.text}
                      onThinkingChange={setGenerating}
                      onClose={() => { setRequest(null); setGenerating(false); }}
                      onSelectListing={onSelectListing}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {request && recommendations.length > 0 && (
            <div className="mt-6 space-y-3 animate-fadeIn" id="itinerary-listings-recommendations">
              <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider text-left">
                Book recommended spaces in {destination.split(' ')[0]}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="recommendations-row">
                {recommendations.map((listing) => (
                  <div key={listing.id} className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between gap-4 shadow-xs" id={`recom-card-${listing.id}`}>
                    <div className="flex items-center space-x-3 text-left">
                      <img src={listing.image} alt="" className="w-14 h-11 object-cover rounded-lg shrink-0 border border-slate-100" referrerPolicy="no-referrer" onError={handleImageError} />
                      <div>
                        <h5 className="text-xs font-bold text-slate-800 line-clamp-1 leading-snug">{listing.title}</h5>
                        <p className="text-[10px] text-indigo-600 font-bold mt-0.5">PKR {listing.price.toLocaleString()}</p>
                      </div>
                    </div>
                    <button
                      id={`btn-book-recom-${listing.id}`}
                      onClick={() => onSelectListing(listing)}
                      className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer uppercase tracking-wider shadow-xs"
                    >
                      Book Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
